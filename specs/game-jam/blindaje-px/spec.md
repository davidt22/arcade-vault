# Game Jam Spec: BLINDAJE-PX

- **Estado:** Propuesto
- **Tema:** tanques: Guerra entre tanques militares
- **Categoría:** ARCADE
- **Ángulo:** ARCADE
- **game-id:** blindaje-px
- **Fecha:** 2026-06-29

---

## Concepto del juego

### Descripción
El jugador controla un tanque que avanza automáticamente por un campo de batalla de desplazamiento lateral. El suelo es irregular y los obstáculos (muros de trinchera, montículos de tierra, nidos de ametralladoras) aparecen a ritmo creciente. Con la barra espaciadora o clic el jugador dispara proyectiles hacia la derecha; con las flechas arriba/abajo apunta el cañón en un arco de ±45°. La misión es destruir todo lo que se interpone antes de que choque con el casco del tanque.

En pantalla se ve el tanque en el tercio izquierdo sobre un paisaje desértico pixelado que se desplaza. Las explosiones, el humo y los fragmentos de metal vuelan en tiempo real usando sistemas de partículas ligeras. La cadena de destrucción encadenada (varios objetivos con un solo proyectil) activa un multiplicador de puntos con un flash de color magenta que inunda la pantalla medio segundo.

La sensación es de presión constante: el terreno nunca para, los enemigos se aceleran con cada nivel y el jugador siente que controla una máquina de guerra pesada pero letal. El ritmo muscular de "apuntar → disparar → esquivar" crea un loop de satisfacción inmediata.

### Por qué encaja con el tema "tanques: Guerra entre tanques militares"
El juego pone al jugador dentro de la cabina de un tanque en combate real: no hay menú de estrategia, no hay mapa, solo la cadena de mando más simple posible — sobrevivir y matar primero. La presión de la guerra se traduce mecánicamente en velocidad creciente e imprevisibilidad del terreno, haciendo que cada segundo de supervivencia se sienta como una victoria táctica conseguida con reflejos, no con planificación.

### Frase de concepto (≤ 60 caracteres)
Tanque en línea de fuego — dispara o muere

---

## Mecánicas core

- **Apuntar y disparar:** el jugador ajusta el ángulo del cañón (flechas ↑↓) y dispara (Espacio) proyectiles con trayectoria balística simple
- **Supervivencia por esquiva:** los obstáculos y proyectiles enemigos llegan desde la derecha; el tanque puede moverse ligeramente arriba/abajo para evitarlos
- **Multiplicador de cadena:** destruir varios objetivos con proyectiles consecutivos sin recibir daño multiplica la puntuación (x2, x3, x4…)
- **Power-ups de campo:** cajas de munición (proyectiles extra), escudos temporales y turbo de velocidad aparecen entre los enemigos como recompensa por explorar la línea de fuego

---

## Scope

### Incluido
- Canvas 800×450px con game loop requestAnimationFrame
- CustomEvents: blindaje-px:score, blindaje-px:lives, blindaje-px:level, blindaje-px:state
- Overlay React con HUD (puntuación, vidas, nivel y multiplicador activo)
- Entrada en `lib/data.ts` con categoría ARCADE
- Sistema de partículas para explosiones (máx. 30 partículas simultáneas)
- Escalado de dificultad por nivel (velocidad de scroll, frecuencia de enemigos)

### No incluido
- Controles táctiles para móvil
- Sonido
- Leaderboard específico
- Modo cooperativo o multijugador
- Diferentes tipos de tanque seleccionables

---

## Modelo de datos

### Entrada en lib/data.ts
```ts
{
  id: 'blindaje-px',
  title: 'BLINDAJE-PX',
  short: 'Tanque en línea de fuego — dispara o muere',
  long: 'Avanza por el campo de batalla destruyendo todo lo que se interpone antes de que alcance tu casco.',
  cat: 'ARCADE',
  cover: 'cover-blindaje-px',
  color: 'yellow',
  best: 0,
  plays: '0',
}
```

### Canvas
- **width:** 800
- **height:** 450
- **has-lives:** true
- **has-levels:** true

### CustomEvents que emitirá game.js
| Evento | detail | Cuándo |
|---|---|---|
| `blindaje-px:score` | `{ score: number }` | Cada cambio de puntuación |
| `blindaje-px:lives` | `{ lives: number }` | Cada cambio de vidas |
| `blindaje-px:level` | `{ level: number }` | Al subir de nivel |
| `blindaje-px:state` | `{ state: 'playing'\|'gameover', score: number }` | Al iniciar y terminar |

---

## Plan de implementación

Sigue el patrón establecido en spec-04 (Asteroids):

1. Añadir entrada en `lib/data.ts` al array GAMES
2. Crear `public/games/blindaje-px/game.js` como IIFE único con:
   - Loop rAF con variable de control `running` y `rafId`
   - CustomEvents en los puntos de cambio de estado
   - `window.destroyBlindajePx()` al final del IIFE
3. Componente `BlindajePxGame` en `app/game/[id]/play/page.tsx` con overlay HUD
4. `if (id === 'blindaje-px') return <BlindajePxGame />;` en la función Page
5. Verificar en navegador: catálogo, canvas, HUD, game over, score en Supabase

---

## Criterios de aceptación

- [ ] BLINDAJE-PX aparece en el catálogo `/games` con categoría ARCADE
- [ ] `/game/blindaje-px/play` carga el canvas 800×450 con el juego funcional
- [ ] El overlay HUD muestra puntuación, vidas y nivel en tiempo real
- [ ] Al llegar a game over el overlay muestra "GAME OVER"
- [ ] Con sesión activa, el score final se inserta en la tabla `scores` de Supabase
- [ ] Sin sesión, se muestra "Inicia sesión para guardar tu puntaje"
- [ ] Al navegar fuera, `destroyBlindajePx()` detiene el loop
- [ ] Sin errores TypeScript ni en consola del navegador

---

## Decisiones de diseño

- Color `yellow` para evocar el color arena del desierto y los tonos militares sin saturar la paleta del catálogo (cyan y magenta ya tienen varios juegos)
- El scroll lateral automático elimina la necesidad de gestionar movimiento del tanque en X, reduciendo la complejidad y centrando la atención en apuntar y disparar
- El multiplicador de cadena se resetea al recibir daño (no al fallar un disparo) para premiar la agresividad y no penalizar la exploración de ángulos

---

## Riesgos técnicos

- **Colisión projectil-obstáculo a alta velocidad:** a niveles altos los proyectiles pueden atravesar objetos delgados (tunneling). Mitigación: usar detección de colisión continua con interpolación del paso anterior de posición.
- **Sistema de partículas y framerate:** explosiones encadenadas podrían saturar el canvas. Mitigación: pool de partículas reutilizables con límite fijo de 30 instancias simultáneas; las nuevas explosiones reciclan las partículas más antiguas.
