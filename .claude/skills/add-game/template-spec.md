# spec-0N: Integración del juego ${TITLE}

- **Estado:** Pendiente
- **Fecha:** ${FECHA}
- **Depende de:** spec-01 (estructura base, lib/data.ts, rutas), spec-03 (cliente Supabase)
- **Objetivo:** Integrar el juego ${TITLE} en `/game/${id}/play` con overlay
  React que muestra ${HUD_FIELDS} en tiempo real, y guarda el score
  en Supabase al terminar la partida.

---

## Scope

### Incluido
- `lib/data.ts` — añadir ${TITLE} al array `GAMES` (id: `${id}`, categoría: `${CATEGORY}`)
- `public/games/${id}/game.js` — copia de `references/started-games/XX-${id}/game.js`
  con modificaciones mínimas:
  - `window.dispatchEvent(CustomEvent)` en cada cambio de score, vidas y estado del juego
  - `window.destroy${PascalId}()` global para cancelar el rAF y limpiar al desmontar
- `app/game/[id]/play/page.tsx` — componente `${PascalId}Game` con:
  - `<canvas id="canvas" width="${CANVAS_W}" height="${CANVAS_H}">` centrado en fondo negro
  - Carga dinámica del script vía `useEffect`
  - Overlay React flotante encima del canvas: ${HUD_FIELDS} en tiempo real
  - Al game over: POST a `/api/scores` para guardar en Supabase
  - Si no hay sesión: mensaje "Inicia sesión para guardar tu puntaje"

### No incluido
- Leaderboard / Hall of Fame (spec futuro)
- Controles táctiles para móvil
- Sonido
- Auth real (spec futuro) — la sesión se lee pero no se implementa aquí

---

## Modelo de datos

### Entrada en `lib/data.ts` — array `GAMES`
```ts
{
  id: '${id}',
  title: '${TITLE}',
  short: '${SHORT_DESC}',
  long: '${LONG_DESC}',
  cat: '${CATEGORY}',
  cover: 'cover-${id}',
  color: '${COLOR}',
  best: 0,
  plays: '0',
}
```

### Eventos CustomEvent que emite `game.js`
| Evento | `detail` | Cuándo |
|---|---|---|
| `${id}:score` | `{ score: number }` | Cada vez que sube el puntaje |
| `${id}:lives` | `{ lives: number }` | Cada vez que cambian las vidas |
| `${id}:level` | `{ level: number }` | Al subir de nivel |
| `${id}:state` | `{ state: 'playing' \| 'dead' \| 'gameover', score: number }` | Al cambiar el estado |

---

## Plan de implementación

1. **Añadir entrada en `lib/data.ts`** al array `GAMES`.

2. **Crear `public/games/${id}/`** y copiar `game.js` desde
   `references/started-games/XX-${id}/game.js`. Copiar archivos extra si los hay.

3. **Modificar `public/games/${id}/game.js`** con las modificaciones mínimas:
   - `window.dispatchEvent` en los puntos de cambio de score, vidas, nivel y estado
   - `window.destroy${PascalId}` al final del archivo

4. **Añadir componente `${PascalId}Game`** en `app/game/[id]/play/page.tsx`
   siguiendo el patrón de `AsteroidsGame`. Añadir case `if (id === '${id}')`.

5. **Verificar tabla `scores`** en Supabase (ya existe desde spec-04).
   No se requiere nueva migración.

6. **Crear este spec** en `specs/0N-${id}-integration.md`.

7. **Verificar en navegador**: navegar a `/game/${id}/play`, jugar hasta
   game over, confirmar que el score aparece en Supabase y el overlay
   se actualizó correctamente.

---

## Criterios de aceptación

- [ ] ${TITLE} aparece en el catálogo `/games` con categoría ${CATEGORY}
- [ ] `/game/${id}/play` carga el canvas ${CANVAS_W}×${CANVAS_H} con el juego funcional
- [ ] El overlay React muestra score${HUD_CHECKLIST} actualizados en tiempo real
- [ ] Al llegar a game over el overlay lo refleja
- [ ] Con sesión activa, el score final se inserta en la tabla `scores` de Supabase
- [ ] Sin sesión, se muestra el mensaje "Inicia sesión para guardar tu puntaje"
- [ ] Al navegar fuera de `/game/${id}/play` el loop del juego se detiene
- [ ] No hay errores de TypeScript ni mensajes de error en consola del navegador

---

## Decisiones tomadas

- **Script tag dinámico** — evita refactorizar game.js por completo.
  La comunicación game→React se resuelve con CustomEvents.

- **Modificaciones mínimas a game.js** — solo se añaden `dispatchEvent`
  y `window.destroy${PascalId}`; toda la lógica del juego queda intacta.

- **Overlay React** — permite usar estilos de la plataforma (`.hud-stat`,
  `--neon-cyan`) sin tocar el renderizado del canvas.

- **`/api/scores` Route Handler** — el insert a Supabase ocurre en el
  servidor con la sesión real, no desde el cliente.

- **Tabla `scores` reutilizada** — no se necesita nueva migración;
  `game_id` diferencia los scores por juego.
