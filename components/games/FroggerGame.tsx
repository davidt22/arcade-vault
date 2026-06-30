'use client';

import { useEffect, useRef } from 'react';

// ─── Constantes de cuadrícula ─────────────────────────────────────────────────
const COLS = 16;
const ROWS = 14;
const CELL = 40;
const CANVAS_W = COLS * CELL; // 640
const CANVAS_H = ROWS * CELL; // 560

// Zonas (índice de fila, 0 = arriba)
const ROW_GOALS    = 0;
const ROW_RIVER_TOP = 1;
const ROW_RIVER_BOT = 6;
const ROW_SAFE_MID  = 7;
const ROW_ROAD_TOP  = 8;
const ROW_ROAD_BOT  = 12;
const ROW_START     = 13;

// ─── Tipos locales ────────────────────────────────────────────────────────────
type Direction = 'up' | 'down' | 'left' | 'right';

interface Entity {
  col: number;
  width: number;
  type: 'car' | 'truck' | 'log' | 'turtle';
  submerged?: boolean;
  submergeTimer?: number;
  submergePhase?: 'visible' | 'under';
}

interface Lane {
  row: number;
  speed: number;
  dir: 1 | -1;
  entities: Entity[];
}

interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number;
  targetCol: number;
  targetRow: number;
  fromCol: number;
  fromRow: number;
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface FroggerGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildLanes(level: number): Lane[] {
  const speedMultiplier = Math.pow(1.15, level - 1);
  const lanes: Lane[] = [];

  // Carriles de carretera (filas 8–12, de abajo a arriba)
  const roadConfigs: Array<{ row: number; speed: number; dir: 1 | -1; type: 'car' | 'truck'; widths: number[] }> = [
    { row: 12, speed: 1.8, dir:  1, type: 'car',   widths: [1, 1, 2, 1] },
    { row: 11, speed: 2.2, dir: -1, type: 'truck',  widths: [2, 1, 2]    },
    { row: 10, speed: 3.0, dir:  1, type: 'car',   widths: [1, 2, 1, 1] },
    { row:  9, speed: 2.5, dir: -1, type: 'car',   widths: [1, 1, 3, 1] },
    { row:  8, speed: 3.5, dir:  1, type: 'truck',  widths: [3, 2]       },
  ];

  for (const cfg of roadConfigs) {
    const entities: Entity[] = [];
    let col = 0;
    for (const w of cfg.widths) {
      entities.push({ col, width: w, type: cfg.type });
      col += w + Math.max(2, 3 - level * 0.1 | 0);
    }
    lanes.push({ row: cfg.row, speed: cfg.speed * speedMultiplier, dir: cfg.dir, entities });
  }

  // Carriles de río (filas 1–6, de abajo a arriba)
  const riverConfigs: Array<{ row: number; speed: number; dir: 1 | -1; type: 'log' | 'turtle'; widths: number[] }> = [
    { row: 6, speed: 1.2, dir:  1, type: 'log',    widths: [3, 4, 2]    },
    { row: 5, speed: 2.0, dir: -1, type: 'turtle', widths: [2, 3, 2]    },
    { row: 4, speed: 1.5, dir:  1, type: 'log',    widths: [4, 2, 3]    },
    { row: 3, speed: 2.5, dir: -1, type: 'turtle', widths: [3, 2]       },
    { row: 2, speed: 1.0, dir:  1, type: 'log',    widths: [2, 4, 2, 3] },
    { row: 1, speed: 3.0, dir: -1, type: 'turtle', widths: [2, 3]       },
  ];

  for (const cfg of riverConfigs) {
    const entities: Entity[] = [];
    let col = 0;
    for (const w of cfg.widths) {
      const ent: Entity = { col, width: w, type: cfg.type };
      if (cfg.type === 'turtle') {
        ent.submerged = false;
        ent.submergeTimer = Math.random() * 3000;
        ent.submergePhase = 'visible';
      }
      entities.push(ent);
      col += w + 2;
    }
    lanes.push({ row: cfg.row, speed: cfg.speed * speedMultiplier, dir: cfg.dir, entities });
  }

  return lanes;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function FroggerGame({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
}: FroggerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    paused,
    lives: 3,
    score: 0,
    level: 1,
    roundTimer: 15000,
    goals: new Array<boolean>(5).fill(false),
    lanes: buildLanes(1),
    frog: {
      col: 8, row: ROW_START,
      animating: false, animT: 0,
      targetCol: 8, targetRow: ROW_START,
      fromCol: 8, fromRow: ROW_START,
    } as Frog,
    pendingDir: null as Direction | null,
    rafId: 0,
    lastTs: 0,
    prevScore: 0,
    prevLives: 3,
    prevLevel: 1,
    highestRow: ROW_START,
  });

  useEffect(() => {
    stateRef.current.paused = paused;
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const s = stateRef.current;

    // ── Input ──────────────────────────────────────────────────────────────
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'ArrowUp')    s.pendingDir = 'up';
      if (e.key === 'ArrowDown')  s.pendingDir = 'down';
      if (e.key === 'ArrowLeft')  s.pendingDir = 'left';
      if (e.key === 'ArrowRight') s.pendingDir = 'right';
    };
    document.addEventListener('keydown', onKey);

    // ── Helpers de juego ───────────────────────────────────────────────────
    function killFrog() {
      s.lives--;
      onLivesChange(s.lives);
      if (s.lives <= 0) {
        onLivesChange(0);
        onGameOver(s.score);
        cancelAnimationFrame(s.rafId);
        return;
      }
      s.frog = { col: 8, row: ROW_START, animating: false, animT: 0, targetCol: 8, targetRow: ROW_START, fromCol: 8, fromRow: ROW_START };
      s.roundTimer = Math.max(5000, 15000 - (s.level - 1) * 1000);
      s.highestRow = ROW_START;
    }

    function completeRound() {
      s.score += 200;
      s.goals = new Array<boolean>(5).fill(false);
      s.level++;
      onLevelChange(s.level);
      s.lanes = buildLanes(s.level);
      s.frog = { col: 8, row: ROW_START, animating: false, animT: 0, targetCol: 8, targetRow: ROW_START, fromCol: 8, fromRow: ROW_START };
      s.roundTimer = Math.max(5000, 15000 - (s.level - 1) * 1000);
      s.highestRow = ROW_START;
    }

    function checkRoadCollision(): boolean {
      const f = s.frog;
      for (const lane of s.lanes) {
        if (lane.row !== f.row) continue;
        const lt = lane.entities[0]?.type;
        if (lt !== 'car' && lt !== 'truck') continue;
        for (const ent of lane.entities) {
          if (f.col >= ent.col && f.col < ent.col + ent.width) return true;
        }
      }
      return false;
    }

    function getSupport(): Entity | null {
      const f = s.frog;
      for (const lane of s.lanes) {
        if (lane.row !== f.row) continue;
        const lt = lane.entities[0]?.type;
        if (lt !== 'log' && lt !== 'turtle') continue;
        for (const ent of lane.entities) {
          if (f.col >= ent.col && f.col < ent.col + ent.width) {
            if (ent.type === 'turtle' && ent.submerged) return null;
            return ent;
          }
        }
        return null;
      }
      return null;
    }

    function checkGoal() {
      const f = s.frog;
      // 5 bocas: columnas 1–2, 4–5, 7–8, 10–11, 13–14
      const goalCols = [1, 4, 7, 10, 13];
      const goalIdx = goalCols.findIndex((gc) => f.col === gc || f.col === gc + 1);
      if (goalIdx === -1) { killFrog(); return; }
      if (s.goals[goalIdx]) { killFrog(); return; }
      s.goals[goalIdx] = true;
      const timeBonus = Math.floor(s.roundTimer / 1000) * 10;
      s.score += 50 + timeBonus;
      s.frog = { col: 8, row: ROW_START, animating: false, animT: 0, targetCol: 8, targetRow: ROW_START, fromCol: 8, fromRow: ROW_START };
      s.roundTimer = Math.max(5000, 15000 - (s.level - 1) * 1000);
      s.highestRow = ROW_START;
      if (s.goals.every(Boolean)) completeRound();
    }

    function resolveCell() {
      const f = s.frog;
      if (f.row === ROW_GOALS) { checkGoal(); return; }
      if (f.row >= ROW_ROAD_TOP && f.row <= ROW_ROAD_BOT) {
        if (checkRoadCollision()) { killFrog(); return; }
      }
      if (f.row >= ROW_RIVER_TOP && f.row <= ROW_RIVER_BOT) {
        if (!getSupport()) { killFrog(); return; }
      }
    }

    // ── Update ─────────────────────────────────────────────────────────────
    function update(dt: number) {
      if (s.paused) return;
      const f = s.frog;

      // Avanzar entidades
      for (const lane of s.lanes) {
        for (const ent of lane.entities) {
          ent.col += lane.speed * lane.dir * dt / 16;
          if (lane.dir === 1 && ent.col > COLS) ent.col = -ent.width;
          if (lane.dir === -1 && ent.col < -ent.width) ent.col = COLS;

          // Ciclo de inmersión de tortugas
          if (ent.type === 'turtle') {
            ent.submergeTimer = (ent.submergeTimer ?? 0) - dt;
            if ((ent.submergeTimer ?? 0) <= 0) {
              if (ent.submergePhase === 'visible') {
                ent.submergePhase = 'under';
                ent.submerged = true;
                ent.submergeTimer = 1500;
              } else {
                ent.submergePhase = 'visible';
                ent.submerged = false;
                ent.submergeTimer = 3000;
              }
            }
          }
        }
      }

      // Temporizador de ronda
      s.roundTimer -= dt;
      if (s.roundTimer <= 0) { killFrog(); return; }

      // Movimiento de la rana
      if (!f.animating) {
        // Arrastre del río
        if (f.row >= ROW_RIVER_TOP && f.row <= ROW_RIVER_BOT) {
          const sup = getSupport();
          if (!sup) { killFrog(); return; }
          const lane = s.lanes.find((l) => l.row === f.row)!;
          f.col += lane.speed * lane.dir * dt / 16 / CELL;
          if (f.col < 0 || f.col >= COLS) { killFrog(); return; }
        }

        if (s.pendingDir) {
          const dir = s.pendingDir;
          s.pendingDir = null;
          let nc = f.col, nr = f.row;
          if (dir === 'up')    nr--;
          if (dir === 'down')  nr++;
          if (dir === 'left')  nc--;
          if (dir === 'right') nc++;
          if (nc < 0 || nc >= COLS) return;
          if (nr < 0)  nr = 0;
          if (nr > ROW_START) nr = ROW_START;
          f.fromCol = f.col; f.fromRow = f.row;
          f.targetCol = nc;  f.targetRow = nr;
          f.animating = true; f.animT = 0;

          // Puntos por avanzar hacia arriba por primera vez
          if (nr < s.highestRow) {
            s.score += 10;
            s.highestRow = nr;
          }
        }
      } else {
        f.animT += dt;
        if (f.animT >= 120) {
          f.col = f.targetCol;
          f.row = f.targetRow;
          f.animating = false;
          resolveCell();
        }
      }

      // Notificar callbacks si cambiaron valores
      if (s.score !== s.prevScore) { onScoreChange(s.score); s.prevScore = s.score; }
      if (s.lives !== s.prevLives) { onLivesChange(s.lives); s.prevLives = s.lives; }
      if (s.level !== s.prevLevel) { onLevelChange(s.level); s.prevLevel = s.level; }
    }

    // ── Draw ───────────────────────────────────────────────────────────────
    function draw() {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      const f = s.frog;

      // Fondo por zonas
      for (let r = 0; r < ROWS; r++) {
        if (r === ROW_GOALS) {
          ctx.fillStyle = '#1a3a1a';
        } else if (r >= ROW_RIVER_TOP && r <= ROW_RIVER_BOT) {
          ctx.fillStyle = '#001f3f';
        } else if (r === ROW_SAFE_MID || r === ROW_START) {
          ctx.fillStyle = '#0d2b0d';
        } else {
          ctx.fillStyle = '#111';
        }
        ctx.fillRect(0, r * CELL, CANVAS_W, CELL);
      }

      // Bocas destino
      const goalCols = [1, 4, 7, 10, 13];
      for (let i = 0; i < 5; i++) {
        const x = goalCols[i] * CELL;
        ctx.fillStyle = s.goals[i] ? '#2d7a2d' : '#0a200a';
        ctx.fillRect(x, 0, CELL * 2, CELL);
        ctx.strokeStyle = '#c8a000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, 1, CELL * 2 - 2, CELL - 2);
        if (s.goals[i]) {
          // Silueta de rana en la boca ocupada
          ctx.fillStyle = '#33cc33';
          ctx.beginPath();
          ctx.ellipse(x + CELL, CELL / 2, 10, 8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Entidades
      for (const lane of s.lanes) {
        const y = lane.row * CELL;
        for (const ent of lane.entities) {
          const x = ent.col * CELL;
          const w = ent.width * CELL;
          if (ent.type === 'car') {
            const colors = ['#e63946', '#f4d03f', '#2980b9'];
            ctx.fillStyle = colors[lane.row % colors.length];
            ctx.fillRect(x + 2, y + 8, w - 4, CELL - 16);
            // Ruedas
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.arc(x + 8, y + CELL - 8, 5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + w - 8, y + CELL - 8, 5, 0, Math.PI * 2); ctx.fill();
          } else if (ent.type === 'truck') {
            ctx.fillStyle = '#7f8c8d';
            ctx.fillRect(x + 2, y + 6, w - 4, CELL - 12);
            ctx.fillStyle = '#566573';
            ctx.fillRect(x + 2, y + 6, CELL - 4, CELL - 12);
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.arc(x + 8, y + CELL - 8, 5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + w - 8, y + CELL - 8, 5, 0, Math.PI * 2); ctx.fill();
          } else if (ent.type === 'log') {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x + 1, y + 6, w - 2, CELL - 12);
            ctx.strokeStyle = '#6B3410';
            ctx.lineWidth = 1;
            for (let lx = x + 8; lx < x + w; lx += 12) {
              ctx.beginPath(); ctx.moveTo(lx, y + 6); ctx.lineTo(lx, y + CELL - 6); ctx.stroke();
            }
          } else if (ent.type === 'turtle') {
            if (ent.submerged) {
              ctx.globalAlpha = 0.3;
            }
            for (let ti = 0; ti < ent.width; ti++) {
              const tx = x + ti * CELL;
              ctx.fillStyle = '#27ae60';
              ctx.beginPath();
              ctx.ellipse(tx + CELL / 2, y + CELL / 2, 16, 14, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#1e8449';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(tx + CELL / 2 - 8, y + CELL / 2);
              ctx.lineTo(tx + CELL / 2 + 8, y + CELL / 2);
              ctx.moveTo(tx + CELL / 2, y + CELL / 2 - 8);
              ctx.lineTo(tx + CELL / 2, y + CELL / 2 + 8);
              ctx.stroke();
            }
            ctx.globalAlpha = 1;
          }
        }
      }

      // Rana
      const prog = f.animating ? f.animT / 120 : 1;
      const fx = (f.animating ? f.fromCol + (f.targetCol - f.fromCol) * prog : f.col) * CELL + CELL / 2;
      const fy = (f.animating ? f.fromRow + (f.targetRow - f.fromRow) * prog : f.row) * CELL + CELL / 2;
      const jumpArc = f.animating ? Math.sin(prog * Math.PI) * 6 : 0;

      ctx.fillStyle = '#33cc33';
      ctx.beginPath();
      ctx.ellipse(fx, fy - jumpArc, 14, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      // Ojos
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(fx - 5, fy - jumpArc - 5, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(fx + 5, fy - jumpArc - 5, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(fx - 5, fy - jumpArc - 5, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(fx + 5, fy - jumpArc - 5, 2, 0, Math.PI * 2); ctx.fill();
      // Patas durante salto
      if (f.animating) {
        ctx.strokeStyle = '#33cc33';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(fx - 14, fy - jumpArc); ctx.lineTo(fx - 20, fy - jumpArc + 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(fx + 14, fy - jumpArc); ctx.lineTo(fx + 20, fy - jumpArc + 6); ctx.stroke();
      }

      // HUD interno del canvas
      const timerRatio = s.roundTimer / Math.max(5000, 15000 - (s.level - 1) * 1000);
      const barColor = timerRatio > 0.5 ? '#33cc33' : timerRatio > 0.25 ? '#f1c40f' : '#e74c3c';
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, CANVAS_W, 6);
      ctx.fillStyle = barColor;
      ctx.fillRect(0, 0, CANVAS_W * timerRatio, 6);

      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE ${s.score}`, 6, CELL - 8);
      ctx.textAlign = 'center';
      ctx.fillText(`LV ${String(s.level).padStart(2, '0')}`, CANVAS_W / 2, CELL - 8);
      ctx.textAlign = 'right';
      for (let i = 0; i < s.lives; i++) {
        ctx.fillStyle = '#33cc33';
        ctx.beginPath();
        ctx.arc(CANVAS_W - 12 - i * 22, CELL - 12, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Loop ───────────────────────────────────────────────────────────────
    function loop(ts: number) {
      const dt = s.lastTs ? Math.min(ts - s.lastTs, 50) : 16;
      s.lastTs = ts;
      update(dt);
      draw();
      s.rafId = requestAnimationFrame(loop);
    }

    s.rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(s.rafId);
      document.removeEventListener('keydown', onKey);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ display: 'block' }}
    />
  );
}
