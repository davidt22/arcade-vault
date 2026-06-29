# Game Jam Spec: FRENTE DE FUEGO

- **Estado:** Propuesto
- **Tema:** tanques: Guerra entre tanques militares
- **Categoría:** SHOOTER
- **Ángulo:** SHOOTER
- **game-id:** frente-de-fuego
- **Fecha:** 2026-06-29

---

## Concepto del juego

### Descripción
El jugador controla un tanque fijo en la parte inferior del mapa que puede rotar su cañón 180° apuntando hacia arriba. Oleadas de tanques enemigos avanzan desde la parte superior del canvas siguiendo rutas de zigzag que se vuelven más caóticas con cada ola. El jugador dispara proyectiles con trayectoria recta y debe calcular el ángulo correcto para interceptar tanques en movimiento — cada impacto genera una explosión de píxeles retro y suma puntos según la distancia del disparo.

La pantalla es un campo de batalla top-down minimalista con colinas pixeladas que actúan como cobertura parcial: los proyectiles rebotan en esas estructuras una vez antes de disiparse, añadiendo la posibilidad de disparos indirectos. La sensación es de tensión creciente conforme las oleadas se aceleran y los tanques enemigos diversifican su velocidad y patrón de movimiento, exigiendo al jugador priorizar objetivos y gestionar el tiempo de recarga.

La satisfacción central es el disparo bien calculado: ver un proyectil volar en arco y destruir un tanque que esquivaba genera una recompensa inmediata y adictiva. El game over llega cuando un tanque enemigo alcanza la base del jugador.

### Por qué encaja con el tema "tanques: Guerra entre tanques militares"
El juego captura la tensión asimétrica de un frente de combate real: un defensor solitario contra una avalancha de blindados enemigos que avanzan implacablemente. La mecánica de apuntar el cañón, calcular el ángulo y anticipar el movimiento enemigo traduce emocionalmente la presión táctica de una guerra de tanques — no es acción caótica sino decisiones rápidas bajo presión extrema, que es la esencia del combate de artillería blindada.

### Frase de concepto (≤ 60 caracteres)
Defiende tu base del avance blindado enemigo

---

## Mecánicas core

- Rotar el cañón del tanque jugador con A/D o flechas izquierda/derecha
- Disparar proyectil con barra espaciadora (tiempo de recarga de 0.8s)
- Los proyectiles rebotan una vez en las colinas-cobertura antes de disiparse
- Los tanques enemigos avanzan en oleadas con rutas de zigzag parametrizadas que escalan velocidad y densidad por nivel

---

## Scope

### Incluido
- Canvas 800×600px con game loop requestAnimationFrame
- CustomEvents: frente-de-fuego:score, frente-de-fuego:lives, frente-de-fuego:level, frente-de-fuego:state
- Overlay React con HUD (puntuación, vidas y nivel)
- Entrada en `lib/data.ts` con categoría SHOOTER

### No incluido
- Controles táctiles para móvil
- Sonido
- Leaderboard específico
- Multijugador local o en red
- Power-ups o upgrades del tanque jugador

---

## Modelo de datos

### Entrada en lib/data.ts
```ts
{
  id: 'frente-de-fuego',
  title: 'FRENTE DE FUEGO',
  short: 'Defiende tu base del avance blindado enemigo',
  long: 'Rota tu cañón y elimina oleadas de tanques antes de que alcancen tu base. Cada disparo cuenta.',
  cat: 'SHOOTER',
  cover: 'cover-frente-de-fuego',
  color: 'yellow',
  best: 0,
  plays: '0',
}
```

### Canvas
- **width:** 800
- **height:** 600
- **has-lives:** true
- **has-levels:** true

### CustomEvents que emitirá game.js
| Evento | detail | Cuándo |
|---|---|---|
| `frente-de-fuego:score` | `{ score: number }` | Cada cambio de puntuación |
| `frente-de-fuego:lives` | `{ lives: number }` | Cada cambio de vidas |
| `frente-de-fuego:level` | `{ level: number }` | Al subir de nivel (nueva oleada) |
| `frente-de-fuego:state` | `{ state: 'playing'\|'gameover', score: number }` | Al iniciar y terminar |

---

## Plan de implementación

Sigue el patrón establecido en spec-04 (Asteroids):

1. Añadir entrada en `lib/data.ts` al array GAMES
2. Crear `public/games/frente-de-fuego/game.js` como IIFE único con:
   - Loop rAF con variable de control `running` y `rafId`
   - CustomEvents en los puntos de cambio de estado
   - `window.destroyFrenteDefuego()` al final del IIFE
3. Componente `FrenteDefuegoGame` en `app/game/[id]/play/page.tsx` con overlay HUD
4. `if (id === 'frente-de-fuego') return <FrenteDefuegoGame />;` en la función Page
5. Verificar en navegador: catálogo, canvas, HUD, game over, score en Supabase

---

## Criterios de aceptación

- [ ] FRENTE DE FUEGO aparece en el catálogo `/games` con categoría SHOOTER
- [ ] `/game/frente-de-fuego/play` carga el canvas 800×600 con el juego funcional
- [ ] El overlay HUD muestra puntuación, vidas y nivel en tiempo real
- [ ] Al llegar a game over el overlay muestra "GAME OVER"
- [ ] Con sesión activa, el score final se inserta en la tabla `scores` de Supabase
- [ ] Sin sesión, se muestra "Inicia sesión para guardar tu puntaje"
- [ ] Al navegar fuera, `destroyFrenteDefuego()` detiene el loop
- [ ] Sin errores TypeScript ni en consola del navegador

---

## Decisiones de diseño

- El jugador está fijo en la base (no se mueve) para concentrar toda la habilidad en el apuntado y la priorización de objetivos, aumentando la tensión sin complejidad de movimiento
- El rebote único de proyectiles en las colinas añade profundidad táctica sin complicar la física — un rebote es predecible y satisfactorio, dos serían caóticos
- Color `yellow` para diferenciarse visualmente de los otros juegos del catálogo y evocar el color de los tanques militares del desierto

---

## Riesgos técnicos

- **Detección de colisión proyectil-tanque con rebote:** calcular la reflexión del vector en la superficie de la colina puede tener bugs sutiles de ángulo — mitigación: usar colinas con bordes horizontales o a 45° fijos para simplificar la matemática del rebote
- **Escalado de dificultad sin romper la jugabilidad:** si los tanques enemigos son demasiado rápidos en niveles altos el juego se vuelve injugable — mitigación: cap de velocidad máxima + aumentar densidad de oleada antes que velocidad individual
