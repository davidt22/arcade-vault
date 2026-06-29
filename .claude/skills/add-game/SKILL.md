---
name: add-game
description: >
  Integra un juego nuevo en Arcade Vault siguiendo el patrón establecido
  en spec-04 (Asteroids): añade entrada en lib/data.ts, adapta game.js con
  CustomEvents y destroyGame(), crea el componente React en play/page.tsx,
  y verifica en navegador. Fuente: references/started-games/ o archivo nuevo.
  Uso: /add-game <game-id> "<Título>" <ARCADE|PUZZLE|SHOOTER|VERSUS>
argument-hint: '<game-id> "<Título del Juego>" <ARCADE|PUZZLE|SHOOTER|VERSUS>'
---

# Skill: add-game

Integra un juego nuevo en Arcade Vault. Sigue exactamente el patrón de
`specs/04-asteroids-integration.md`.

---

## Fase 0 — Contexto automático

Al invocar el skill, ejecuta estos comandos para conocer el estado actual
del proyecto antes de cualquier pregunta o acción:

```
!cat lib/data.ts
!ls references/started-games/
!ls public/games/
!ls -1 specs/
```

---

## Fase 1 — Recopilar datos

Si los argumentos no cubren todos estos datos, pregunta al usuario antes
de escribir cualquier archivo:

| Campo | Descripción | Default |
|---|---|---|
| `game-id` | Slug kebab-case único (e.g. `tetris`, `arkanoid`) | — obligatorio |
| `title` | Nombre de display en MAYÚSCULAS (e.g. `TETRIS`) | — obligatorio |
| `category` | `ARCADE` \| `PUZZLE` \| `SHOOTER` \| `VERSUS` | — obligatorio |
| `source` | Ruta relativa en `references/started-games/` o `new` si no existe | — obligatorio |
| `canvas-w` | Ancho del canvas en px | `800` |
| `canvas-h` | Alto del canvas en px | `600` |
| `has-lives` | ¿El juego tiene vidas? | `true` (3 vidas iniciales) |
| `has-levels` | ¿El juego tiene niveles? | `true` |
| `short` | Descripción corta (≤ 60 chars) | — pregunta si no se proporcionó |
| `long` | Descripción larga (1-2 frases) | — pregunta si no se proporcionó |
| `color` | Color de acento del juego | `cyan` \| `magenta` \| `yellow` \| `green` |

---

## Fase 2 — Leer game.js fuente

Si la fuente viene de `references/started-games/`, lee el archivo
`references/started-games/XX-${id}/game.js` completo para identificar:

1. **Variable del loop rAF**: busca `requestAnimationFrame(` — la variable
   que guarda el ID (puede llamarse `rafId`, `animFrame`, `raf`, etc.)
2. **Variable de control del loop**: busca un flag booleano (`running`,
   `active`, `gameRunning`, etc.) que detiene el loop
3. **Dónde cambia `score`**: busca `score +=` o `score =` dentro del loop
4. **Dónde decrementan las vidas**: busca `lives--`, `lives -=`, o una
   función tipo `killPlayer()`, `loseLife()`, `shipDestroyed()`
5. **Dónde sube el nivel**: busca `level++`, `level +=`, o `nextLevel()`
6. **Dónde ocurre el game over**: busca `lives === 0`, `lives <= 0`,
   `gameOver()`, o similar
7. **Dónde se inicia/reinicia el juego**: busca `initGame()`, `resetGame()`,
   o la función que se llama al inicio y al reiniciar

Si el juego no tiene los conceptos `has-lives` o `has-levels`, omite los
`dispatchEvent` correspondientes y ajusta el componente React.

Si hay archivos extra en el directorio (p.ej. `assets/`, `levels.js`,
`style.css`): anótalos, se copiarán en el Paso 2.

---

## Fase 3 — Implementación

Ejecuta los pasos en orden. No saltes ninguno.

### Paso 1 — Entrada en `lib/data.ts`

Añade la entrada al array `GAMES` **antes** de la entrada de `asteroids`
(o al final si no hay asteroids). Respeta el tipo `Game`:

```ts
{
  id: '${id}',
  title: '${TITLE}',
  short: '${short}',
  long: '${long}',
  cat: '${CATEGORY}',
  cover: 'cover-${id}',
  color: '${color}',
  best: 0,
  plays: '0',
},
```

### Paso 2 — Copiar archivos del juego

Crea el directorio `public/games/${id}/` y copia el game.js fuente:

```bash
mkdir -p public/games/${id}
cp references/started-games/XX-${id}/game.js public/games/${id}/game.js
```

Si existen archivos extra en el directorio de referencia
(`assets/`, `levels.js`, `style.css`, etc.), cópialos también manteniendo
la misma estructura relativa dentro de `public/games/${id}/`.

Si la fuente es `new` (sin referencia), crea `public/games/${id}/game.js`
con la estructura mínima que incluya las llamadas CustomEvent desde el
inicio (no hace falta copiar nada).

### Paso 3 — Modificar `public/games/${id}/game.js`

Añade las siguientes líneas en los puntos identificados en Fase 2.
Las modificaciones deben ser **mínimas**: solo añadir las llamadas
`dispatchEvent` y la función `destroyGameId`. No refactorizar el juego.

```js
// ── Tras cada cambio de score ──────────────────────────────────────────
window.dispatchEvent(new CustomEvent('${id}:score', { detail: { score } }));

// ── Tras perder una vida (si has-lives = true) ─────────────────────────
window.dispatchEvent(new CustomEvent('${id}:lives', { detail: { lives } }));

// ── Al subir de nivel (si has-levels = true) ───────────────────────────
window.dispatchEvent(new CustomEvent('${id}:level', { detail: { level } }));

// ── Al iniciar o reiniciar la partida ──────────────────────────────────
window.dispatchEvent(new CustomEvent('${id}:state', {
  detail: { state: 'playing', score: 0 }
}));

// ── Al llegar a game over ──────────────────────────────────────────────
window.dispatchEvent(new CustomEvent('${id}:state', {
  detail: { state: 'gameover', score }
}));

// ── Al final del archivo, fuera de cualquier función ──────────────────
window.destroy${PascalId} = function () {
  running = false;   // reemplaza 'running' con el nombre real de la variable de control
  if (typeof rafId !== 'undefined') cancelAnimationFrame(rafId);
  // reemplaza 'rafId' con el nombre real de la variable rAF
};
```

**Regla**: usa los nombres de variables exactos que encontraste en Fase 2
(no uses `running` o `rafId` literalmente si el juego usa otros nombres).

**IIFE obligatorio**: envuelve **todo** el contenido del game.js en un IIFE
para aislar las variables del scope global. Sin esto, navegar entre dos
juegos en la misma sesión provoca `Identifier 'canvas' has already been
declared` porque los scripts comparten el scope global. La asignación
`window.destroy${PascalId}` sigue siendo global porque se asigna en `window`:

```js
(function () {
'use strict';

// ... todo el contenido del game.js, incluyendo las modificaciones ...

window.destroy${PascalId} = function () { ... };

})();
```

### Paso 4 — Componente React en `app/game/[id]/play/page.tsx`

Añade el componente `${PascalId}Game` siguiendo exactamente el patrón
de `AsteroidsGame` ya existente en el archivo. Pega el componente
**justo antes** de la función `MockPlayer`.

Template del componente:

```tsx
// ─────────────────────────────────────────────────────────────────────────────
// ${TITLE} — canvas real + overlay React
// ─────────────────────────────────────────────────────────────────────────────
function ${PascalId}Game() {
  const [score, setScore] = useState(0);
  // Omitir lives/level si has-lives=false o has-levels=false
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'dead' | 'gameover'>('playing');
  const [sessionMsg, setSessionMsg] = useState<string | null>(null);

  const levelRef = useRef(1);
  const scoreSavedRef = useRef(false);

  useEffect(() => {
    if (!document.querySelector('script[src*="${id}/game.js"]')) {
      const script = document.createElement('script');
      script.src = '/games/${id}/game.js';
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
            game_id: '${id}',
            score: finalScore,
            level: levelRef.current,
          }),
        }).then((res) => {
          if (res.status === 401) setSessionMsg('Inicia sesión para guardar tu puntaje');
        });
      }
    };

    window.addEventListener('${id}:score', onScore);
    window.addEventListener('${id}:lives', onLives);   // omitir si has-lives=false
    window.addEventListener('${id}:level', onLevel);   // omitir si has-levels=false
    window.addEventListener('${id}:state', onState);

    return () => {
      window.removeEventListener('${id}:score', onScore);
      window.removeEventListener('${id}:lives', onLives);
      window.removeEventListener('${id}:level', onLevel);
      window.removeEventListener('${id}:state', onState);
      (window as Window & { destroy${PascalId}?: () => void }).destroy${PascalId}?.();
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
      <div style={{ position: 'relative', width: ${canvasW}, maxWidth: '100%' }}>
        <canvas
          id="canvas"
          width={${canvasW}}
          height={${canvasH}}
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
          {/* Omitir si has-lives=false */}
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">
              {lives > 0 ? '♥ '.repeat(lives).trim() : '—'}
            </div>
          </div>
          {/* Omitir si has-levels=false */}
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
```

Después de añadir el componente, añade el case en la función `Page`:

```tsx
// Justo después del case de asteroids (o antes de MockPlayer):
if (id === '${id}') return <${PascalId}Game />;
```

### Paso 5 — Verificar tabla `scores` en Supabase

La tabla `scores` ya existe desde spec-04 con columnas:
`id, user_id, game_id, score, level, created_at`.

No se requiere migración nueva salvo que el juego necesite columnas
adicionales (e.g. `time_ms` para juegos de tiempo). Si es así, crea
`supabase/migrations/<timestamp>_add_${id}_columns.sql` y aplica con
`mcp__supabase__apply_migration`.

Verifica con:
```
mcp__supabase__list_tables → confirmar que 'scores' existe
```

### Paso 6 — Crear spec

Crea `specs/0N-${id}-integration.md` usando `template-spec.md` como
estructura. Asigna N = número siguiente al spec más reciente en `specs/`.

---

## Fase 4 — Verificación en navegador

Usa Playwright para verificar:

1. Navegar a `http://localhost:3000/games` → confirmar que el juego
   aparece con su categoría correcta.

2. Navegar a `http://localhost:3000/game/${id}/play` → verificar:
   - Canvas visible y con dimensiones correctas
   - El juego arranca automáticamente (o muestra instrucciones)
   - El overlay HUD es visible (Puntuación, Vidas, Nivel)

3. Si hay consola accesible, verificar que no hay errores JS.

4. Navegar fuera de la página (p.ej. a `/games`) → confirmar que
   no persisten errores en consola (loop detenido correctamente).

Si el servidor de desarrollo no está corriendo, arráncalo antes:
```bash
npm run dev
```

---

## Notas importantes

### Convención de nombres

El `PascalId` es el game-id en PascalCase:
- `tetris` → `Tetris`
- `arkanoid` → `Arkanoid`
- `space-invaders` → `SpaceInvaders`

### Sin has-lives

Si el juego no tiene vidas (p.ej. Tetris tipo endless):
- Omite `dispatchEvent('${id}:lives', ...)` en game.js
- Omite `useState(lives)`, el listener `onLives`, y el div de Vidas en el overlay
- En `onState`, el gameover puede ocurrir por tiempo o altura máxima

### Sin has-levels

Si el juego no tiene niveles:
- Omite `dispatchEvent('${id}:level', ...)` en game.js
- Omite `useState(level)`, `levelRef`, el listener `onLevel`, y el div de Nivel en el overlay
- En el POST a `/api/scores`, envía `level: 1` como constante

### Juego sin referencia (`source: new`)

Si no hay game.js de referencia, el usuario debe proporcionar el archivo.
Pídele que lo deposite en `public/games/${id}/game.js` antes de continuar
con el Paso 3, o crea un stub mínimo que dispara los CustomEvents en
intervalos de demostración (útil para probar el overlay antes de tener el
juego real).

### Múltiples archivos en references/

Si el directorio de referencia incluye archivos que el game.js carga
dinámicamente (e.g. `levels.js`), cópialos todos a `public/games/${id}/`
con la misma estructura. Si hay assets de imagen en `assets/`, cópialos
también.

### Tabla `scores` — deuda técnica conocida

El score se envía desde el cliente sin validación server-side. Un score
arbitrario puede insertarse. La validación (rango, rate limiting) queda
para el spec de leaderboard futuro.
