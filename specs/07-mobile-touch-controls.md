# spec-07: Soporte táctil para juegos en móvil

- **Estado:** Implementado
- **Fecha:** 2026-06-29
- **Depende de:** 04-asteroids-integration, 05-tetris-integration, 06-arkanoid-integration
- **Objetivo:** Añadir controles virtuales táctiles y escalado CSS a todos los
  juegos actuales y futuros de Arcade Vault para que sean jugables en móvil.

---

## Scope

### Incluido
- Escalado CSS (`transform: scale`) del canvas en todos los juegos para adaptarse
  a pantallas móviles sin modificar `game.js`
- Botones virtuales táctiles en el overlay React de cada juego, que simulan
  `KeyboardEvent` para que `game.js` los procese sin cambios
- Orientación landscape forzada para Asteroids y Arkanoid: mensaje
  "Gira el dispositivo" visible en portrait, juego oculto
- Tetris funciona en portrait y landscape sin restricción de orientación
- Patrón documentado que los futuros `/add-game` deben seguir

### No incluido
- Gestos swipe o pinch-to-zoom
- Vibración háptica
- Modificaciones a ningún `game.js` existente
- Soporte para gamepads físicos bluetooth
- Controles táctiles para juegos aún no integrados (se aplican al integrarlos)

---

## Plan de implementación

### Utilidad compartida: hook `useTouchControls`

1. Crear `hooks/useTouchControls.ts` con una función que recibe un mapa
   `{ [label: string]: string }` de botón → `KeyboardEvent.key` y devuelve
   handlers `onTouchStart`/`onTouchEnd` que despachan `KeyboardEvent` al `window`.

### Utilidad compartida: hook `useCanvasScale`

2. Crear `hooks/useCanvasScale.ts` que recibe `{ nativeW, nativeH }` y devuelve
   un `scale` calculado como `Math.min(vw / nativeW, vh / nativeH)` actualizado
   en `resize`. Lo consumen todos los componentes de juego.

### Componente compartido: `<TouchControls>`

3. Crear `components/TouchControls.tsx` — renderiza los botones virtuales
   recibidos como props. Estilo: botones semitransparentes retro (variables
   CSS del design system `--neon-cyan`, `--ink`), visibles solo en pantallas
   táctiles (`@media (pointer: coarse)`).

### Asteroids

4. En `AsteroidsGame` añadir detección de orientación: si
   `window.innerWidth < window.innerHeight` mostrar overlay "Gira el
   dispositivo ↻" y ocultar el canvas. Actualizar en `resize`.

5. En `AsteroidsGame`: aplicar `transform: scale(${scale})` al canvas wrapper.
   Añadir `<TouchControls>` con mapa:
   `{ '◀': 'ArrowLeft', '▶': 'ArrowRight', '▲': 'ArrowUp', '🔥': ' ' }`.

### Arkanoid

6. En `ArkanoidGame`: añadir detección de orientación (igual que paso 4).
   Aplicar `transform: scale(${scale})`. Añadir `<TouchControls>` con mapa
   `{ '◀': 'ArrowLeft', '▶': 'ArrowRight' }`.

### Tetris

7. En `TetrisGame`: aplicar `transform: scale(${scale})`. Añadir
   `<TouchControls>` con mapa:
   `{ '◀': 'ArrowLeft', '▶': 'ArrowRight', '↻': 'ArrowUp', '▼': 'ArrowDown', '⬇': ' ' }`
   (⬇ = hard drop con Spacebar).

### Documentación del patrón

8. Actualizar `CLAUDE.md` sección "Patrón de integración de juegos" con los
   pasos de controles táctiles que todo nuevo juego debe seguir.

---

## Criterios de aceptación

- [ ] En móvil (390px ancho), ningún juego requiere scroll horizontal
- [ ] Los botones táctiles solo son visibles en dispositivos con `pointer: coarse`
- [ ] Asteroids: rotar, empujar y disparar funcionan con botones virtuales
- [ ] Arkanoid: la paleta se mueve con botones izquierda/derecha táctiles
- [ ] Tetris: mover, rotar, bajar suave y hard drop funcionan con botones táctiles
- [ ] Asteroids y Arkanoid muestran "Gira el dispositivo" en portrait y ocultan el canvas
- [ ] Tetris funciona en portrait y landscape sin mensaje de orientación
- [ ] Ningún `game.js` existente fue modificado
- [ ] No hay errores de TypeScript ni en consola del navegador en móvil
- [ ] Un juego nuevo integrado con `/add-game` solo necesita declarar su mapa
  de botones para tener controles táctiles

---

## Decisiones tomadas

- **Simulación de KeyboardEvent en React, no en game.js** — mantiene game.js
  sin modificar y centraliza la lógica táctil en la capa React donde ya
  gestionamos el HUD.

- **`transform: scale` en lugar de canvas dinámico** — evita que game.js
  recalcule coordenadas internas. Riesgo de blur en retinas aceptado a cambio
  de cero cambios en lógica de juego.

- **`pointer: coarse` para mostrar/ocultar botones** — los usuarios de
  escritorio no ven los botones táctiles aunque reduzcan la ventana. Más
  semántico que detectar `window.ontouchstart`.

- **Orientación forzada solo para landscape-first (Asteroids, Arkanoid)** —
  Tetris tiene canvas vertical (300×600) y es jugable en portrait sin escalar.
  Los juegos horizontales son inutilizables en portrait aunque escalen.

- **Sin hyperspace en Asteroids táctil** — cuatro botones (◀ ▶ ▲ 🔥) ya
  ocupan espacio. Hyperspace es raro incluso en teclado; se omite para
  no saturar la UI móvil.

- **Patrón documentado en CLAUDE.md** — los futuros `/add-game` deben declarar
  su mapa de botones para que el patrón se aplique automáticamente.

---

## Riesgos identificados

- **KeyboardEvent sintético bloqueado**: algunos juegos podrían verificar
  `event.isTrusted`. Si ocurre, la mitigación es exponer una función
  `window.injectInput(key)` en game.js — requeriría modificarlo mínimamente.
  Probabilidad baja; los game.js actuales no hacen esa comprobación.

- **Doble disparo touch+mouse**: los navegadores móviles emiten eventos mouse
  sintéticos tras un touch. Si game.js escucha también ratón, puede recibir
  el input dos veces. Mitigación: `event.preventDefault()` en los handlers
  `onTouchStart`/`onTouchEnd` de `<TouchControls>`.

- **`innerWidth/Height` desactualizado en iOS al girar**: el evento `resize`
  puede dispararse antes de que el viewport se actualice. Mitigación: leer
  dimensiones desde `window.visualViewport` cuando esté disponible.

- **Viewport meta ausente o incorrecto**: si `<meta name="viewport">` no tiene
  `width=device-width, initial-scale=1`, el cálculo de `scale` será erróneo.
  Verificar en `app/layout.tsx` antes de implementar.
