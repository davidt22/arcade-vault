'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useCanvasScale } from '@/hooks/useCanvasScale';
import { TouchControls } from '@/components/TouchControls';

function useIsPortrait() {
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const check = () => setPortrait(window.innerWidth < window.innerHeight);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return portrait;
}

const CANVAS_W = 640;
const CANVAS_H = 560;

const FroggerGame = dynamic(() => import('@/components/games/FroggerGame'), { ssr: false });

export default function FroggerPlayPage() {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('av_player_name') ?? '') : ''
  );
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gameKey, setGameKey] = useState(0);

  const finalScoreRef = useRef(0);
  const finalLevelRef = useRef(1);

  const scale = useCanvasScale(CANVAS_W, CANVAS_H);
  const portrait = useIsPortrait();

  const handleScoreChange = useCallback((s: number) => setScore(s), []);
  const handleLivesChange = useCallback((l: number) => setLives(l), []);
  const handleLevelChange = useCallback((lv: number) => {
    setLevel(lv);
    finalLevelRef.current = lv;
  }, []);
  const handleGameOver = useCallback((finalScore: number) => {
    finalScoreRef.current = finalScore;
    setOver(true);
  }, []);

  async function saveScore() {
    if (saved || saving) return;
    setSaving(true);
    const trimmed = name.trim() || 'INVITADO';
    localStorage.setItem('av_player_name', trimmed);

    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.from('scores').insert({
      game_id: 'frogger',
      score: finalScoreRef.current,
      level: finalLevelRef.current,
      user_id: null,
    });

    setSaved(true);
    setSaving(false);
  }

  function restart() {
    setScore(0);
    setLives(3);
    setLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setSaving(false);
    setGameKey((k) => k + 1);
  }

  if (portrait) return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    }}>
      <span style={{ fontSize: 48 }}>↻</span>
      <p style={{ fontFamily: 'var(--pixel)', fontSize: 11, letterSpacing: '0.14em', color: 'var(--cyan)', textAlign: 'center' }}>
        GIRA EL DISPOSITIVO
      </p>
    </div>
  );

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
      {/* HUD React de la plataforma */}
      <div
        style={{
          width: CANVAS_W * scale,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 0',
          marginBottom: 4,
        }}
      >
        <div style={{ display: 'flex', gap: 24 }}>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v" style={{ color: '#33cc33' }}>{score.toLocaleString('es-ES')}</div>
          </div>
          <div className="hud-stat">
            <div className="l">Vidas</div>
            <div className="v" style={{ color: '#33cc33' }}>
              {lives > 0 ? '♥ '.repeat(lives).trim() : '—'}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Nivel</div>
            <div className="v" style={{ color: '#33cc33' }}>{String(level).padStart(2, '0')}</div>
          </div>
        </div>
        <button
          className="btn yellow"
          style={{ fontSize: 10, padding: '4px 12px' }}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? 'REANUDAR' : 'PAUSA'}
        </button>
      </div>

      {/* Canvas */}
      <div style={{ position: 'relative', width: CANVAS_W * scale, height: CANVAS_H * scale }}>
        <div
          style={{
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
            width: CANVAS_W,
            height: CANVAS_H,
          }}
        >
          <FroggerGame
            key={gameKey}
            paused={paused}
            onScoreChange={handleScoreChange}
            onLivesChange={handleLivesChange}
            onLevelChange={handleLevelChange}
            onGameOver={handleGameOver}
          />
        </div>
      </div>

      <TouchControls keyMap={{ '◀': 'ArrowLeft', '▲': 'ArrowUp', '▼': 'ArrowDown', '▶': 'ArrowRight' }} />

      {/* Modal game over */}
      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{finalScoreRef.current.toLocaleString('es-ES')}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="TUS INICIALES"
                  maxLength={10}
                />
                <button
                  className="btn yellow"
                  onClick={saveScore}
                  disabled={saving}
                >
                  {saving ? 'GUARDANDO…' : 'GUARDAR PUNTUACIÓN'}
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
                onClick={() => (window.location.href = '/games')}
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
