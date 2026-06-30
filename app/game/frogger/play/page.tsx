'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useCanvasScale } from '@/hooks/useCanvasScale';
import { TouchControls } from '@/components/TouchControls';
import { GAMES, type Skin } from '@/lib/data';

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

const VALID_SKINS = ['classic', 'neon', 'retro'] as const;
type SkinId = typeof VALID_SKINS[number];

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
  const [skinId, setSkinId] = useState<SkinId>('classic');

  const finalScoreRef = useRef(0);
  const finalLevelRef = useRef(1);

  const scale = useCanvasScale(CANVAS_W, CANVAS_H);
  const portrait = useIsPortrait();

  const skins: Skin[] = GAMES.find((g) => g.id === 'frogger')?.skins ?? [];
  const skin = skins.find((s) => s.id === skinId) ?? skins[0];
  const p = skin?.palette;

  useEffect(() => {
    const saved = localStorage.getItem('frogger-skin') as SkinId | null;
    if (saved && VALID_SKINS.includes(saved)) setSkinId(saved);
  }, []);

  const handleSkinChange = (id: SkinId) => {
    setSkinId(id);
    localStorage.setItem('frogger-skin', id);
  };

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
      background: p?.bg ?? '#000',
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
        background: p?.bg ?? '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 32,
        transition: 'background 0.4s ease',
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
            <div className="v" style={{ color: p?.primary, textShadow: `0 0 8px ${p?.primary}99` }}>
              {score.toLocaleString('es-ES')}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Vidas</div>
            <div className="v" style={{ color: p?.primary, textShadow: `0 0 8px ${p?.primary}99` }}>
              {lives > 0 ? '♥ '.repeat(lives).trim() : '—'}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Nivel</div>
            <div className="v" style={{ color: p?.primary, textShadow: `0 0 8px ${p?.primary}66` }}>
              {String(level).padStart(2, '0')}
            </div>
          </div>
        </div>
        <button
          className="btn yellow"
          style={{ fontSize: 10, padding: '4px 12px' }}
          onClick={() => setPaused((prev) => !prev)}
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
            palette={p ? { bg: p.bg, primary: p.primary, accent: p.accent, text: p.text } : undefined}
            onScoreChange={handleScoreChange}
            onLivesChange={handleLivesChange}
            onLevelChange={handleLevelChange}
            onGameOver={handleGameOver}
          />
        </div>
      </div>

      <TouchControls keyMap={{ '◀': 'ArrowLeft', '▲': 'ArrowUp', '▼': 'ArrowDown', '▶': 'ArrowRight' }} />

      {/* Selector de skin */}
      {skins.length > 0 && (
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: 9,
            letterSpacing: '0.2em',
            color: '#444',
            textTransform: 'uppercase',
            marginRight: 6,
          }}>
            SKIN
          </span>
          {skins.map((s) => {
            const active = s.id === skinId;
            return (
              <button
                key={s.id}
                onClick={() => handleSkinChange(s.id as SkinId)}
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
                <span style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: s.palette.primary,
                    boxShadow: active ? `0 0 6px ${s.palette.primary}` : 'none',
                    flexShrink: 0,
                  }} />
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: s.palette.accent,
                    boxShadow: active ? `0 0 6px ${s.palette.accent}` : 'none',
                    flexShrink: 0,
                  }} />
                </span>
                <span style={{
                  fontFamily: 'var(--pixel)',
                  fontSize: 8,
                  letterSpacing: '0.15em',
                  color: active ? s.palette.primary : '#444',
                  transition: 'color 0.2s ease',
                }}>
                  {s.label.toUpperCase()}
                </span>
              </button>
            );
          })}
        </div>
      )}

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
