# spec-08: Performance del canvas de Frogger

- **Estado:** Implementado
- **Fecha:** 2026-06-30
- **Depende de:** spec que integró Frogger (git: rama spec-01-frogger-core)
- **Objetivo:** Eliminar el stuttering visible en Frogger desde el primer
  segundo de juego en Chrome desktop, optimizando la función draw() de
  FroggerGame.tsx sin cambiar la API de props ni tocar otros juegos.

---

## Scope

### Incluido
- Optimización de `draw()` en `components/games/FroggerGame.tsx`
- Pre-cómputo de strings de color derivados de la paleta
- Offscreen canvas para el fondo estático (14 filas de zona)
- Batching de líneas de grano de troncos en una sola llamada `stroke()`
- Batching de arcos de ruedas (coches y camiones) en una sola llamada `fill()`
- Cache de `ctx.font` fuera del loop de dibujo

### No incluido
- Asteroids, Tetris, Arkanoid — sin síntomas confirmados
- Modificaciones a la API de props de `FroggerGame`
- Web Workers ni OffscreenCanvas en worker thread
- Sprites/ImageBitmap — el render procedural se mantiene para que las skins
  sigan funcionando
- Cambios en `app/game/frogger/play/page.tsx` salvo que la investigación
  revele un problema ahí
- Validación de performance con métricas numéricas (FPS, CPU%) —
  el criterio es ausencia de stuttering perceptible a simple vista

---

## Modelo de datos

No se introducen estructuras de datos públicas nuevas. Dos añadidos internos
al closure del `useEffect` principal de `FroggerGame.tsx`:

- **`colorCache`** — objeto plano con todas las variantes de color
  pre-concatenadas, e.g. `{ bgDim: p.bg + '66', primaryFaint: p.primary + '18', ... }`.
  Se regenera únicamente cuando cambia `paletteRef.current`.

- **`bgCanvas`** — `HTMLCanvasElement` offscreen (creado con
  `document.createElement('canvas')`, tamaño `CANVAS_W × CANVAS_H`).
  Se pinta una vez al montar y cada vez que cambia la paleta. En `draw()`
  se usa con un único `ctx.drawImage(bgCanvas, 0, 0)`.

Ambos viven solo dentro del closure del efecto; no se exponen como props
ni estado React.

---

## Plan de implementación

Todos los cambios son en `components/games/FroggerGame.tsx` dentro del
`useEffect(() => { ... }, [])` principal, salvo el paso 1.

1. **Crear `buildColorCache(p: FroggerPalette)`** — función pura fuera del
   componente que devuelve un objeto con todas las cadenas de color usadas
   en `draw()`:
   `bgDim`, `bgGoal`, `primaryFaint`, `primaryHalf`, `primarySolid`,
   `accentDark`, `accentMid`, `accentFaint`, `accentBorder`, `logTint`.
   Sustituir todas las concatenaciones inline en `draw()` por referencias
   a `colorCache.<key>`.

2. **Inicializar `bgCanvas` al montar** — crear el canvas offscreen,
   extraer la lógica de las 14 filas de fondo a `renderBackground(bgCtx, cache)`
   y llamarla una vez. Regenerar cuando cambie la paleta
   (al inicio de `draw()`, comparar si `paletteRef.current` cambió y
   marcar un flag `bgDirty`).

3. **Reemplazar el loop de fondo en `draw()`** — sustituir los 14 `fillRect`
   de zona por `ctx.drawImage(bgCanvas, 0, 0)`. Renderizar el fondo al bgCanvas
   solo si `bgDirty === true`.

4. **Batch de líneas de grano de troncos** — en el bloque `ent.type === 'log'`,
   sustituir el loop con `beginPath/moveTo/lineTo/stroke()` por una sola ruta:
   `ctx.beginPath(); for lx { moveTo; lineTo; } ctx.stroke();`

5. **Batch de arcos de ruedas** — en los bloques `'car'` y `'truck'`,
   sustituir los dos `beginPath/arc/fill()` separados por:
   `ctx.beginPath(); ctx.arc(...); ctx.arc(...); ctx.fill();`

6. **Mover `ctx.font` fuera de `draw()`** — asignarlo una sola vez tras
   obtener `ctx`, antes del primer `requestAnimationFrame`.

7. **Verificar en navegador** — abrir `/game/frogger/play`, jugar 30 s,
   confirmar ausencia de stuttering. Opcionalmente abrir DevTools →
   Performance para verificar que los frames no superan 16 ms.

---

## Criterios de aceptación

- [ ] Sin stuttering perceptible a simple vista en Chrome desktop desde el
      primer segundo de juego
- [ ] `draw()` no contiene ninguna concatenación de strings (`+` con colores)
- [ ] El fondo se renderiza con un único `ctx.drawImage(bgCanvas, 0, 0)`,
      no con 14 `fillRect()`
- [ ] Cada log se dibuja con un único `ctx.stroke()`, sin importar su anchura
- [ ] Cada vehículo (car/truck) dibuja sus ruedas con un único `ctx.fill()`
- [ ] `ctx.font` se asigna una sola vez al montar, no en cada frame
- [ ] Cambiar de skin sigue funcionando (colores actualizados en el siguiente frame)
- [ ] No hay errores de TypeScript ni en consola del navegador
- [ ] La API de props de `FroggerGame` no ha cambiado

---

## Decisiones tomadas

- **No Web Workers** — la lógica de update+draw es lo suficientemente ligera
  para el hilo principal; mover el loop a un worker añadiría complejidad de
  mensajería sin beneficio proporcional al problema observado.

- **No sprites/ImageBitmap** — el render procedural se mantiene para que
  el sistema de skins (colorCache) siga funcionando sin assets extra.

- **HTMLCanvasElement offscreen en vez de OffscreenCanvas API** —
  `document.createElement('canvas')` tiene soporte universal; la API
  `OffscreenCanvas` no está disponible en todos los contextos de Next.js
  (SSR/hydration) y requeriría guardias adicionales.

- **Criterio subjetivo (sin stuttering visible) en lugar de FPS numérico** —
  el usuario confirmó que el umbral mínimo es perceptivo, no métrico. Añadir
  un test de FPS automatizado está fuera de scope.

- **Scope cerrado a Frogger** — los otros juegos (Asteroids, Tetris, Arkanoid)
  usan game.js externos y no tienen síntomas confirmados; se auditarán en un
  spec separado si aparecen problemas.

---

## Riesgos identificados

- **`bgDirty` siempre activo si la detección de cambio de paleta es por
  referencia** — el componente padre reconstruye el objeto `palette` en cada
  render (`{ bg: p.bg, ... }`), lo que haría que `bgDirty` fuera `true` en
  cada frame, anulando el offscreen canvas. Mitigación: detectar el cambio
  comparando los valores de las keys, no la referencia del objeto. O bien
  mover el flag a un efecto separado que se dispare solo cuando cambia la skin
  (lo cual ya ocurre con `useEffect([palette])`).
