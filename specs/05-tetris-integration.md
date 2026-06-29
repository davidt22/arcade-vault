# spec-05: Integración del juego Tetris

- **Estado:** Implementado
- **Fecha:** 2026-06-29
- **Depende de:** spec-01 (estructura base, lib/data.ts, rutas), spec-03 (cliente Supabase)
- **Objetivo:** Integrar el juego Tetris en `/game/tetris/play` con overlay
  React que muestra puntuación y nivel en tiempo real, y guarda el score
  en Supabase al terminar la partida.

---

## Scope

### Incluido
- `lib/data.ts` — añadir Tetris al array `GAMES` (id: `tetris`, categoría: `PUZZLE`)
- `public/games/tetris/game.js` — copia de `references/started-games/03-tetris/game.js`
  con modificaciones mínimas:
  - `window.dispatchEvent(CustomEvent)` en `updateHUD()`, `endGame()` e `init()`
  - `window.destroyTetris()` global para cancelar el rAF y limpiar al desmontar
  - Bloque `themeToggle` envuelto en `if (themeToggle)` para evitar crash
- `app/game/[id]/play/page.tsx` — componente `TetrisGame` con:
  - `<canvas id="board" width="300" height="600">` + `<canvas id="next-canvas" width="120" height="120">`
  - Elementos DOM ocultos que game.js necesita: `#score`, `#lines`, `#level`, `#overlay`, `#restart-btn`
  - Carga dinámica del script vía `useEffect`
  - Layout lateral: tablero izquierda, sidebar derecha con preview y HUD React
  - Al game over: POST a `/api/scores` para guardar en Supabase
  - Si no hay sesión: mensaje "Inicia sesión para guardar tu puntaje"

### No incluido
- Vidas (Tetris no tiene vidas)
- Botón de reinicio React (el juego termina y el usuario navega fuera)
- Contador de líneas en el HUD React (solo puntuación y nivel)
- Leaderboard / Hall of Fame (spec futuro)
- Controles táctiles para móvil
- Sonido
- Auth real (spec futuro)

---

## Modelo de datos

### Entrada en `lib/data.ts` — array `GAMES`
```ts
{
  id: 'tetris',
  title: 'TETRIS',
  short: 'Rota y encaja las 7 piezas antes de que el techo te aplaste.',
  long: 'Siete tetrominós descienden desde la oscuridad. Rótalos, encástralos y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas. Piezas especiales complican el tablero.',
  cat: 'PUZZLE',
  cover: 'cover-tetris',
  color: 'cyan',
  best: 0,
  plays: '0',
}
```

### Eventos CustomEvent que emite `game.js`
| Evento | `detail` | Cuándo |
|---|---|---|
| `tetris:score` | `{ score: number }` | En cada cambio de puntuación (`updateHUD`) |
| `tetris:level` | `{ level: number }` | En cada cambio de nivel (`updateHUD`) |
| `tetris:state` | `{ state: 'playing' \| 'gameover', score: number }` | Al iniciar (`init`) y al terminar (`endGame`) |

No hay evento `tetris:lives` — Tetris no tiene vidas.

---

## Plan de implementación

1. **Añadir entrada en `lib/data.ts`** al array `GAMES` (antes de `asteroids`).

2. **Crear `public/games/tetris/`** y copiar `game.js` desde
   `references/started-games/03-tetris/game.js`.

3. **Modificar `public/games/tetris/game.js`** con las modificaciones mínimas:
   - `dispatchEvent('tetris:score')` y `dispatchEvent('tetris:level')` en `updateHUD()`
   - `dispatchEvent('tetris:state', { state: 'gameover' })` en `endGame()`
   - `dispatchEvent('tetris:state', { state: 'playing' })` en `init()`
   - Bloque `themeToggle` protegido con `if (themeToggle)`
   - `window.destroyTetris` al final del archivo

4. **Añadir componente `TetrisGame`** en `app/game/[id]/play/page.tsx`
   y añadir `if (id === 'tetris') return <TetrisGame />;` en `Page`.

5. **Verificar tabla `scores`** en Supabase — ya existe desde spec-04.

6. **Crear este spec** en `specs/05-tetris-integration.md`.

7. **Verificar en navegador**: navegar a `/game/tetris/play`, jugar hasta
   game over, confirmar que el score aparece en Supabase y el overlay
   se actualizó correctamente.

---

## Criterios de aceptación

- [ ] Tetris aparece en el catálogo `/games` con categoría PUZZLE
- [ ] `/game/tetris/play` carga los canvas 300×600 y 120×120 con el juego funcional
- [ ] El overlay React muestra puntuación y nivel actualizados en tiempo real
- [ ] Al limpiar líneas, la puntuación y el nivel se actualizan inmediatamente
- [ ] Al llegar a game over el overlay muestra "GAME OVER"
- [ ] Con sesión activa, el score final se inserta en la tabla `scores` de Supabase
- [ ] Sin sesión, se muestra el mensaje "Inicia sesión para guardar tu puntaje"
- [ ] Al navegar fuera de `/game/tetris/play` el loop del juego se detiene
- [ ] No hay errores de TypeScript ni mensajes de error en consola del navegador

---

## Decisiones tomadas

- **Sin evento `tetris:lives`** — Tetris no tiene vidas; el componente React
  omite el estado de vidas y el div correspondiente en el HUD.

- **Elementos DOM ocultos** — game.js referencia `#score`, `#lines`, `#level`,
  `#overlay`, `#restart-btn` directamente. En lugar de refactorizar game.js
  para eliminar estas referencias, se renderizan con `display:none` para
  que game.js no crashee. El HUD React los sustituye visualmente.

- **Layout lateral** — A diferencia de Asteroids (canvas centrado + overlay
  flotante), Tetris usa un layout en fila: tablero 300×600 a la izquierda
  y sidebar con preview de pieza + HUD a la derecha. Esto se adapta mejor
  a las dimensiones verticales del tablero de Tetris.

- **`themeToggle` opcional** — El game.js original incluía un toggle de
  tema claro/oscuro. En la plataforma no tiene sentido (tema fijo retro).
  Se protege con `if (themeToggle)` para no crashear sin el elemento.

- **Sin botón restart en React** — Consistente con el patrón de Asteroids.
  El usuario navega fuera y vuelve para jugar de nuevo.

- **`updateHUD()` como punto único de dispatch** — score y level se emiten
  desde `updateHUD()`, que ya es el punto centralizado de actualización
  del HUD en el game.js original. Mínima modificación.

---

## Riesgos identificados

- **`--grid-line` CSS variable ausente**: `drawGrid()` usa
  `getComputedStyle(document.body).getPropertyValue('--grid-line')`.
  Si la variable no está definida en `globals.css`, las líneas de cuadrícula
  no se renderizan. Las piezas siguen siendo visibles y el juego funciona.
  Mitigación aceptada: añadir `--grid-line` a `globals.css` si se quiere
  la cuadrícula visible.

- **Score sin validación server-side**: heredado de spec-04. Deuda técnica
  documentada para el spec de leaderboard futuro.
