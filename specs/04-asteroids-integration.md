# spec-04: Integración del juego Asteroids

- **Estado:** Implementado
- **Fecha:** 2026-06-25
- **Depende de:** spec-01 (estructura base, lib/data.ts, rutas), spec-03 (cliente Supabase)
- **Objetivo:** Integrar el juego Asteroids en `/game/asteroids/play` con overlay
  React que muestra vidas, nivel y puntaje en tiempo real, y guarda el score
  en Supabase al terminar la partida.

---

## Scope

### Incluido
- `lib/data.ts` — añadir Asteroids al array `GAMES` (id: `asteroids`, categoría: `SHOOTER`)
- Migración Supabase: tabla `scores(id, user_id, game_id, score, level, created_at)`
- `public/games/asteroids/game.js` — copia de `references/started-games/02-asteroids/game.js`
  con modificaciones mínimas:
  - `window.dispatchEvent(CustomEvent)` en cada cambio de score, vidas y estado del juego
  - `window.destroyAsteroids()` global para cancelar el rAF y limpiar al desmontar
- `app/game/[id]/play/page.tsx` — Client Component con:
  - `<canvas id="canvas" width="800" height="600">` centrado en fondo negro
  - Carga dinámica del script vía `useEffect`
  - Overlay React flotante encima del canvas: score, vidas, nivel en tiempo real
  - Al game over: POST a `/api/scores` para guardar en Supabase
  - Si no hay sesión: mensaje "Inicia sesión para guardar tu puntaje"
- `app/api/scores/route.ts` — Route Handler POST que inserta en tabla `scores`
- Nav visible arriba (layout de plataforma), canvas centrado debajo

### No incluido
- Leaderboard / Hall of Fame (spec futuro)
- Controles táctiles para móvil
- Sonido
- Otros juegos (solo Asteroids en este spec)
- Auth real (spec futuro) — la sesión se lee pero no se implementa aquí

---

## Modelo de datos

### Tabla Supabase: `scores`
```sql
create table scores (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  game_id     text not null,
  score       integer not null,
  level       integer not null default 1,
  created_at  timestamptz not null default now()
);

-- Solo el propio usuario puede leer/insertar sus scores
alter table scores enable row level security;
create policy "own scores" on scores
  for all using (auth.uid() = user_id);
```

### Entrada en `lib/data.ts` — array `GAMES`
El tipo `Game` existente se amplía si falta algún campo; si ya tiene todos los
campos necesarios se usa tal cual. Campo mínimo nuevo:
```ts
{
  id: 'asteroids',
  name: 'Asteroids',
  category: 'SHOOTER',
  // resto de campos según el tipo Game existente
}
```

### Eventos CustomEvent que emite `game.js`
| Evento | `detail` | Cuándo |
|---|---|---|
| `asteroids:score` | `{ score: number }` | Cada vez que sube el puntaje |
| `asteroids:lives` | `{ lives: number }` | Cada vez que cambian las vidas |
| `asteroids:level` | `{ level: number }` | Al subir de nivel |
| `asteroids:state` | `{ state: 'playing' \| 'dead' \| 'gameover', score: number }` | Al cambiar el estado del juego |

---

## Plan de implementación

1. **Leer el tipo `Game` en `lib/data.ts`** y añadir la entrada de Asteroids
   al array `GAMES` con todos los campos requeridos por el tipo.

2. **Crear migración Supabase** `supabase/migrations/<timestamp>_create_scores.sql`
   con la tabla `scores` y la RLS policy definidas en el modelo de datos.

3. **Aplicar la migración** con `mcp__supabase__apply_migration`.

4. **Copiar `game.js`** de `references/started-games/02-asteroids/game.js`
   a `public/games/asteroids/game.js` y añadir las modificaciones mínimas:
   - `window.dispatchEvent` en `initGame()`, `nextLevel()`, `killShip()` y en
     el momento en que `score` cambia dentro de `update()`
   - Función `window.destroyAsteroids` que ponga un flag `running = false`
     y cancele el `requestAnimationFrame` pendiente

5. **Crear `app/api/scores/route.ts`** — Route Handler POST:
   - Lee la sesión con el cliente Supabase server
   - Si no hay sesión devuelve 401
   - Inserta `{ user_id, game_id, score, level }` en tabla `scores`
   - Devuelve 201 con el registro insertado

6. **Crear `app/game/[id]/play/page.tsx`** — Client Component:
   - `useEffect` que inyecta `<script src="/games/asteroids/game.js">` solo
     si no existe ya en el DOM; cleanup llama `window.destroyAsteroids()`
   - `useState` para `{ score, lives, level, state }` inicializados con los
     valores de `initGame` (score=0, lives=3, level=1, state='playing')
   - `useEffect` que registra listeners para los cuatro CustomEvents y
     los elimina en el cleanup
   - Al recibir `asteroids:state` con `state === 'gameover'`: POST a
     `/api/scores`; si la respuesta es 401 muestra el mensaje de sesión
   - Render: fondo negro, canvas centrado, overlay flotante con score/vidas/nivel,
     mensaje de sesión condicional debajo del canvas

7. **Verificar en navegador**: navegar a `/game/asteroids/play`, jugar hasta
   game over, confirmar que el score aparece en Supabase y que el overlay
   se actualizó correctamente durante la partida.

---

## Criterios de aceptación

- [ ] Asteroids aparece en el catálogo `/games` con categoría SHOOTER
- [ ] `/game/asteroids/play` carga el canvas 800×600 con el juego funcional
- [ ] El overlay React muestra score, vidas y nivel actualizados en tiempo real
- [ ] Al subir de nivel el overlay refleja el nuevo nivel inmediatamente
- [ ] Al perder una vida el overlay actualiza las vidas restantes
- [ ] Al llegar a game over el overlay lo refleja (p.ej. estado visual distinto)
- [ ] Con sesión activa, el score final se inserta en la tabla `scores` de Supabase
- [ ] Sin sesión, se muestra el mensaje "Inicia sesión para guardar tu puntaje"
- [ ] Al navegar fuera de `/game/asteroids/play` el loop del juego se detiene
      (sin `requestAnimationFrame` activo, sin listeners huérfanos)
- [ ] La tabla `scores` existe en Supabase con columnas: id, user_id, game_id,
      score, level, created_at, y RLS activo
- [ ] No hay errores de TypeScript ni mensajes de error en consola del navegador

---

## Decisiones tomadas y descartadas

- **Script tag dinámico en lugar de módulo ES** — evita refactorizar game.js
  por completo. La comunicación game→React se resuelve con CustomEvents, que
  desacoplan el juego de React sin necesidad de exports.

- **Modificaciones mínimas a game.js** — solo se añaden `dispatchEvent` y
  `window.destroyAsteroids`; toda la lógica del juego queda intacta. Alternativa
  descartada: portar el juego a TypeScript — coste alto, beneficio bajo en esta fase.

- **Overlay React en lugar de HUD en canvas** — permite usar estilos de la
  plataforma (fuentes, colores `--neon-cyan`) sin tocar el renderizado del canvas.
  Alternativa descartada: HUD solo en canvas — no se integra con el design system.

- **`/api/scores` Route Handler** — el insert a Supabase ocurre en el servidor
  con la sesión real, no desde el cliente. Alternativa descartada: insert desde
  el cliente — expone la anon key y permite manipular `user_id`.

- **RLS en tabla `scores`** — cada usuario solo puede leer e insertar sus propios
  registros. Alternativa descartada: sin RLS — cualquier usuario podría insertar
  scores con el `user_id` de otro.

- **Tabla `scores` incluye `level`** — dato analítico sin coste adicional;
  útil para el leaderboard futuro.

- **Nav visible en `/game/[id]/play`** — consistente con el layout de la
  plataforma. Alternativa descartada: pantalla completa sin Nav — rompe la
  coherencia de la UX.

---

## Riesgos identificados

- **Doble inyección del script**: si React monta el componente dos veces (StrictMode
  en desarrollo), el script se cargaría dos veces y habría dos loops activos.
  Mitigación: el `useEffect` verifica `document.querySelector('script[src*="asteroids"]')`
  antes de inyectar.

- **`id="canvas"` global**: game.js busca el canvas por id; si en algún momento
  hay otro `<canvas id="canvas">` en el DOM, el juego se adjuntará al elemento
  incorrecto. Mitigación: la página `/game/[id]/play` no renderiza ningún otro canvas.

- **Globals persistentes entre montajes**: `ship`, `bullets`, `score`, etc. son
  variables globales del script; si el componente se desmonta y remonta sin recargar
  la página, el estado anterior persiste. Mitigación: `window.destroyAsteroids()`
  limpia el estado y el script solo se carga una vez por sesión de navegación.

- **Score sin validación server-side**: el cliente envía `{ score, level }` al
  Route Handler; un usuario malintencionado podría enviar un score arbitrario.
  Mitigación aceptada para esta fase: el spec de leaderboard futuro puede añadir
  validación (rango razonable, rate limiting). Queda registrado como deuda técnica.
