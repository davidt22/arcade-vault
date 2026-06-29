'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { GAMES, type Skin } from '@/lib/data';

const SKIN_CANVAS_FILTER: Record<string, string> = {
  classic: 'none',
  neon: 'saturate(2) brightness(1.15) contrast(1.1)',
  retro: 'hue-rotate(290deg) brightness(0.85) saturate(0.85)',
};

// ─────────────────────────────────────────────────────────────────────────────
// Asteroids — selector de skin + canvas + overlay React
// ─────────────────────────────────────────────────────────────────────────────
function AsteroidsGame() {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'dead' | 'gameover'>('playing');
  const [sessionMsg, setSessionMsg] = useState<string | null>(null);
  const [skinId, setSkinId] = useState<'classic' | 'neon' | 'retro'>('classic');

  const levelRef = useRef(1);
  const scoreSavedRef = useRef(false);

  const skins: Skin[] = GAMES.find((g) => g.id === 'asteroids')?.skins ?? [];
  const skin = skins.find((s) => s.id === skinId) ?? skins[0];

  useEffect(() => {
    const saved = localStorage.getItem('asteroids-skin') as 'classic' | 'neon' | 'retro' | null;
    if (saved && ['classic', 'neon', 'retro'].includes(saved)) setSkinId(saved);
  }, []);

  const handleSkinChange = (id: 'classic' | 'neon' | 'retro') => {
    setSkinId(id);
    localStorage.setItem('asteroids-skin', id);
  };

  useEffect(() => {
    if (!document.querySelector('script[src*="asteroids/game.js"]')) {
      const script = document.createElement('script');
      script.src = '/games/asteroids/game.js';
      document.body.appendChild(script);
    }

    const onScore = (e: Event) =>
      setScore((e as CustomEvent<{ score: number }>).detail.score);

    const onLives = (e: Event) =>
      setLives((e as CustomEvent<{ lives: number }>).detail.lives);

    const onLevel = (e: Event) => {
      const lv = (e as CustomEvent<{ level: number }>).detail.level;
      setLevel(lv);
      levelRef.current = lv;
    };

    const onState = (e: Event) => {
      const { state, score: finalScore } = (
        e as CustomEvent<{ state: 'playing' | 'dead' | 'gameover'; score: number }>
      ).detail;

      setGameState(state);

      if (state === 'playing') {
        scoreSavedRef.current = false;
        setSessionMsg(null);
      }

      if (state === 'gameover' && !scoreSavedRef.current) {
        scoreSavedRef.current = true;
        fetch('/api/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game_id: 'asteroids',
            score: finalScore,
            level: levelRef.current,
          }),
        }).then((res) => {
          if (res.status === 401) setSessionMsg('Inicia sesión para guardar tu puntaje');
        });
      }
    };

    window.addEventListener('asteroids:score', onScore);
    window.addEventListener('asteroids:lives', onLives);
    window.addEventListener('asteroids:level', onLevel);
    window.addEventListener('asteroids:state', onState);

    return () => {
      window.removeEventListener('asteroids:score', onScore);
      window.removeEventListener('asteroids:lives', onLives);
      window.removeEventListener('asteroids:level', onLevel);
      window.removeEventListener('asteroids:state', onState);
      (window as Window & { destroyAsteroids?: () => void }).destroyAsteroids?.();
    };
  }, []);

  const p = skin?.palette;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: p?.bg ?? '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 32,
        transition: 'background 0.4s ease',
      }}
    >
      <div style={{ position: 'relative', width: 800, maxWidth: '100%' }}>
        <canvas
          id="canvas"
          width={800}
          height={600}
          style={{
            display: 'block',
            width: '100%',
            filter: SKIN_CANVAS_FILTER[skinId] ?? 'none',
            transition: 'filter 0.35s ease',
          }}
        />

        {/* Overlay HUD — flotante sobre el canvas */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 10,
            padding: '10px 16px',
            pointerEvents: 'none',
          }}
        >
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div
              className="v"
              style={{ color: p?.primary, textShadow: `0 0 8px ${p?.primary}99` }}
            >
              {score.toLocaleString('es-ES')}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Vidas</div>
            <div
              className="v"
              style={{ color: p?.accent, textShadow: `0 0 8px ${p?.accent}99` }}
            >
              {lives > 0 ? '♥ '.repeat(lives).trim() : '—'}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Nivel</div>
            <div
              className="v"
              style={{ color: p?.primary, textShadow: `0 0 8px ${p?.primary}66` }}
            >
              {String(level).padStart(2, '0')}
            </div>
          </div>
          {gameState === 'gameover' && (
            <div
              className="pixel"
              style={{
                fontSize: 11,
                letterSpacing: '0.14em',
                marginTop: 6,
                color: p?.accent,
                textShadow: `0 0 8px ${p?.accent}cc`,
              }}
            >
              GAME OVER
            </div>
          )}
        </div>
      </div>

      {/* Selector de skin */}
      {skins.length > 0 && (
        <div
          style={{
            marginTop: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 9,
              letterSpacing: '0.2em',
              color: '#444',
              textTransform: 'uppercase',
              marginRight: 6,
            }}
          >
            SKIN
          </span>
          {skins.map((s) => {
            const active = s.id === skinId;
            return (
              <button
                key={s.id}
                onClick={() => handleSkinChange(s.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '5px 13px 5px 9px',
                  background: active ? `${s.palette.primary}14` : 'transparent',
                  border: `1px solid ${active ? s.palette.primary : '#2a2a3a'}`,
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: active ? `0 0 10px ${s.palette.primary}44` : 'none',
                }}
              >
                {/* Dos puntos de color: primary + accent */}
                <span style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: s.palette.primary,
                      boxShadow: active ? `0 0 6px ${s.palette.primary}` : 'none',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: s.palette.accent,
                      boxShadow: active ? `0 0 6px ${s.palette.accent}` : 'none',
                      flexShrink: 0,
                    }}
                  />
                </span>
                <span
                  style={{
                    fontFamily: 'var(--pixel)',
                    fontSize: 8,
                    letterSpacing: '0.15em',
                    color: active ? s.palette.primary : '#444',
                    transition: 'color 0.2s ease',
                  }}
                >
                  {s.label.toUpperCase()}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {sessionMsg && (
        <p
          style={{
            marginTop: 16,
            fontFamily: 'var(--mono)',
            fontSize: 13,
            color: p?.primary ?? 'var(--ink-dim)',
            letterSpacing: '0.08em',
            opacity: 0.7,
          }}
        >
          {sessionMsg}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Arkanoid — canvas real + overlay React
// ─────────────────────────────────────────────────────────────────────────────
function ArkanoidGame() {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'dead' | 'gameover'>('playing');
  const [sessionMsg, setSessionMsg] = useState<string | null>(null);

  const levelRef = useRef(1);
  const scoreSavedRef = useRef(false);

  useEffect(() => {
    if (!document.querySelector('script[src*="arkanoid/game.js"]')) {
      const script = document.createElement('script');
      script.src = '/games/arkanoid/game.js';
      document.body.appendChild(script);
    }

    const onScore = (e: Event) =>
      setScore((e as CustomEvent<{ score: number }>).detail.score);

    const onLives = (e: Event) =>
      setLives((e as CustomEvent<{ lives: number }>).detail.lives);

    const onLevel = (e: Event) => {
      const lv = (e as CustomEvent<{ level: number }>).detail.level;
      setLevel(lv);
      levelRef.current = lv;
    };

    const onState = (e: Event) => {
      const { state, score: finalScore } = (
        e as CustomEvent<{ state: 'playing' | 'dead' | 'gameover'; score: number }>
      ).detail;

      setGameState(state);

      if (state === 'playing') {
        scoreSavedRef.current = false;
        setSessionMsg(null);
      }

      if (state === 'gameover' && !scoreSavedRef.current) {
        scoreSavedRef.current = true;
        fetch('/api/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game_id: 'arkanoid',
            score: finalScore,
            level: levelRef.current,
          }),
        }).then((res) => {
          if (res.status === 401) setSessionMsg('Inicia sesión para guardar tu puntaje');
        });
      }
    };

    window.addEventListener('arkanoid:score', onScore);
    window.addEventListener('arkanoid:lives', onLives);
    window.addEventListener('arkanoid:level', onLevel);
    window.addEventListener('arkanoid:state', onState);

    return () => {
      window.removeEventListener('arkanoid:score', onScore);
      window.removeEventListener('arkanoid:lives', onLives);
      window.removeEventListener('arkanoid:level', onLevel);
      window.removeEventListener('arkanoid:state', onState);
      (window as Window & { destroyArkanoid?: () => void }).destroyArkanoid?.();
    };
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 32,
      }}
    >
      <div style={{ position: 'relative', width: 800, maxWidth: '100%' }}>
        <canvas
          id="game"
          width={800}
          height={600}
          style={{ display: 'block', width: '100%' }}
        />

        {/* Overlay React — flotante sobre el canvas */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 10,
            padding: '10px 16px',
            pointerEvents: 'none',
          }}
        >
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString('es-ES')}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">
              {lives > 0 ? '♥ '.repeat(lives).trim() : '—'}
            </div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, '0')}</div>
          </div>
          {gameState === 'gameover' && (
            <div
              className="pixel neon-magenta"
              style={{ fontSize: 11, letterSpacing: '0.14em', marginTop: 6 }}
            >
              GAME OVER
            </div>
          )}
        </div>
      </div>

      {sessionMsg && (
        <p
          className="pixel neon-cyan"
          style={{ fontSize: 9, marginTop: 16, letterSpacing: '0.1em' }}
        >
          {sessionMsg}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tetris — canvas real + overlay React
// ─────────────────────────────────────────────────────────────────────────────
function TetrisGame() {
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'gameover'>('playing');
  const [sessionMsg, setSessionMsg] = useState<string | null>(null);

  const levelRef = useRef(1);
  const scoreSavedRef = useRef(false);

  useEffect(() => {
    if (!document.querySelector('script[src*="tetris/game.js"]')) {
      const script = document.createElement('script');
      script.src = '/games/tetris/game.js';
      document.body.appendChild(script);
    }

    const onScore = (e: Event) =>
      setScore((e as CustomEvent<{ score: number }>).detail.score);

    const onLevel = (e: Event) => {
      const lv = (e as CustomEvent<{ level: number }>).detail.level;
      setLevel(lv);
      levelRef.current = lv;
    };

    const onState = (e: Event) => {
      const { state, score: finalScore } = (
        e as CustomEvent<{ state: 'playing' | 'gameover'; score: number }>
      ).detail;

      setGameState(state);

      if (state === 'playing') {
        scoreSavedRef.current = false;
        setSessionMsg(null);
      }

      if (state === 'gameover' && !scoreSavedRef.current) {
        scoreSavedRef.current = true;
        fetch('/api/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game_id: 'tetris',
            score: finalScore,
            level: levelRef.current,
          }),
        }).then((res) => {
          if (res.status === 401) setSessionMsg('Inicia sesión para guardar tu puntaje');
        });
      }
    };

    window.addEventListener('tetris:score', onScore);
    window.addEventListener('tetris:level', onLevel);
    window.addEventListener('tetris:state', onState);

    return () => {
      window.removeEventListener('tetris:score', onScore);
      window.removeEventListener('tetris:level', onLevel);
      window.removeEventListener('tetris:state', onState);
      (window as Window & { destroyTetris?: () => void }).destroyTetris?.();
    };
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 32,
      }}
    >
      {/* Elementos DOM ocultos que game.js necesita para no crashear */}
      <span id="score" style={{ display: 'none' }} />
      <span id="lines" style={{ display: 'none' }} />
      <span id="level" style={{ display: 'none' }} />
      <div id="overlay" style={{ display: 'none' }}>
        <span id="overlay-title" />
        <span id="overlay-score" />
        <button id="restart-btn" type="button" />
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Canvas principal del tablero 300×600 */}
        <canvas
          id="board"
          width={300}
          height={600}
          style={{ display: 'block', border: '1px solid rgba(77,208,225,0.25)' }}
        />

        {/* Sidebar: preview pieza siguiente + HUD React */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 8 }}>
          <div>
            <div
              className="pixel"
              style={{ fontSize: 8, color: 'var(--ink-dim)', letterSpacing: '0.2em', marginBottom: 8 }}
            >
              SIGUIENTE
            </div>
            <canvas
              id="next-canvas"
              width={120}
              height={120}
              style={{ display: 'block', border: '1px solid rgba(77,208,225,0.15)', background: '#000' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="hud-stat">
              <div className="l">Puntuación</div>
              <div className="v">{score.toLocaleString('es-ES')}</div>
            </div>
            <div className="hud-stat level">
              <div className="l">Nivel</div>
              <div className="v">{String(level).padStart(2, '0')}</div>
            </div>
            {gameState === 'gameover' && (
              <div
                className="pixel neon-magenta"
                style={{ fontSize: 11, letterSpacing: '0.14em', marginTop: 6 }}
              >
                GAME OVER
              </div>
            )}
          </div>
        </div>
      </div>

      {sessionMsg && (
        <p
          style={{
            marginTop: 20,
            fontFamily: 'var(--mono)',
            fontSize: 13,
            color: 'var(--ink-dim)',
            letterSpacing: '0.08em',
          }}
        >
          {sessionMsg}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock player — juegos sin implementación real aún
// ─────────────────────────────────────────────────────────────────────────────
function MockPlayer({ game }: { game: (typeof GAMES)[number] }) {
  const router = useRouter();
  const [score, setScore] = useState(0);
  const [lives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState('INVITADO');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (over || paused) return;
    const t = setInterval(
      () => setScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [over, paused]);

  useEffect(() => {
    if (score > 0 && score % 2500 < 100) setLevel((l) => l + 1);
  }, [score]);

  const endGame = () => setOver(true);
  const restart = () => {
    setScore(0);
    setLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: 'var(--ink)' }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString('es-ES')}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{'♥ '.repeat(lives).trim() || '—'}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, '0')}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? 'REANUDAR' : 'PAUSA'}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <button className="btn ghost" onClick={() => router.push(`/game/${game.id}`)}>
            SALIR
          </button>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          <div className="game-arena">
            <div className="grid-floor" />
            <div className="enemy e1" />
            <div className="enemy e2" />
            <div className="enemy e3" />
            <div className="player-ship" />
          </div>
          {paused && (
            <div
              className="crt-content"
              style={{ background: 'rgba(0,0,0,0.6)', zIndex: 5 }}
            >
              <div>
                <div
                  className="pixel neon-yellow"
                  style={{ fontSize: 22 }}
                >
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-dim)',
                    marginTop: 10,
                    letterSpacing: '0.16em',
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>
            {game.title} · CRT-83 · 60 HZ
          </span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString('es-ES')}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button className="btn yellow" onClick={() => setSaved(true)}>
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button
                className="btn magenta"
                onClick={() => router.push('/')}
              >
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function GamePlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const game = GAMES.find((g) => g.id === id);

  if (!game) {
    router.push('/');
    return null;
  }

  if (id === 'arkanoid') return <ArkanoidGame />;
  if (id === 'asteroids') return <AsteroidsGame />;
  if (id === 'tetris') return <TetrisGame />;
  return <MockPlayer game={game} />;
}
