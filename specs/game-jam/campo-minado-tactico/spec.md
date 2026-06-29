# Game Jam Spec: CAMPO MINADO TÁCTICO

- **Estado:** Propuesto
- **Tema:** tanques: Guerra entre tanques militares
- **Categoría:** PUZZLE
- **Ángulo:** PUZZLE
- **game-id:** campo-minado-tactico
- **Fecha:** 2026-06-29

---

## Concepto del juego

### Descripción
El jugador contempla un mapa de guerra desde lo alto: una cuadrícula donde un tanque aliado debe llegar a una base enemiga. El tablero está sembrado de minas ocultas, muros destruibles y tanques enemigos estáticos que disparan en línea recta a intervalos predecibles. Antes de mover el tanque, el jugador estudia los patrones de disparo, deduce qué celdas son seguras en cada momento, y traza una ruta celda a celda que atraviese el campo sin ser alcanzado ni explotar.

Cada nivel presenta una configuración diferente: el jugador no tiene prisa (el tiempo no corre), pero cada movimiento es irrevocable. Las minas se revelan solo al pisar una celda adyacente, y los disparos enemigos avanzan por el tablero en tiempo real una vez que el jugador confirma su movimiento. La satisfacción nace de leer el mapa, anticipar la sincronía de los disparos y ejecutar la ruta perfecta como si se resolviera un ajedrez de guerra.

La estética es verde fosfórico sobre negro, como un radar militar. El tablero emite un pulso suave cada vez que un tanque enemigo dispara, recordando al jugador los ciclos que debe sincronizar. Resolver un nivel sin errores otorga bonus de puntuación; llegar a la base con un trayecto mínimo de movimientos multiplica ese bonus.

### Por qué encaja con el tema "tanques: Guerra entre tanques militares"
Los tanques enemigos no son decoración: son el corazón del puzzle. Sus cadencias de disparo definen qué celdas son mortales en cada turno, convirtiendo el campo de batalla en un problema de sincronización y deducción. El jugador no pilota un tanque; *piensa como un comandante* que debe enviar su vehículo al frente conociendo exactamente cuándo y dónde llegará el próximo disparo — la tensión táctica de la guerra de tanques trasladada al lenguaje del puzzle.

### Frase de concepto (≤ 60 caracteres)
Traza la ruta segura entre los cañones enemigos.

---

## Mecánicas core

- **Movimiento por turnos**: el jugador selecciona la celda de destino adyacente (WASD o flechas); el tanque aliado se mueve y los disparos enemigos avanzan un paso simultáneamente.
- **Ciclos de disparo**: cada tanque enemigo tiene una cadencia (cada N turnos dispara un proyectil en su dirección fija); el jugador puede ver el contador de ciclo sobre cada enemigo.
- **Revelación de minas**: al entrar en una celda adyacente a una mina, ésta se marca como peligrosa; pisar la celda de la mina destruye el tanque (pierde una vida y reinicia el nivel).
- **Ruta óptima y bonus**: el nivel registra el número mínimo de movimientos posibles; terminar en ese mínimo multiplica x2 la puntuación del nivel.

---

## Scope

### Incluido
- Canvas 640×640px con game loop requestAnimationFrame
- CustomEvents: campo-minado-tactico:score, campo-minado-tactico:state, campo-minado-tactico:lives, campo-minado-tactico:level
- Overlay React con HUD (puntuación, vidas, nivel)
- Entrada en `lib/data.ts` con categoría PUZZLE
- Al menos 10 niveles con dificultad creciente (más minas, más tanques enemigos, cadencias más cortas)

### No incluido
- Controles táctiles para móvil
- Sonido
- Leaderboard específico
- Editor de niveles
- Multijugador

---

## Modelo de datos

### Entrada en lib/data.ts
```ts
{
  id: 'campo-minado-tactico',
  title: 'CAMPO MINADO TÁCTICO',
  short: 'Traza la ruta segura entre los cañones enemigos.',
  long: 'Puzzle de guerra por turnos: mueve tu tanque celda a celda evitando minas y proyectiles enemigos sincronizados.',
  cat: 'PUZZLE',
  cover: 'cover-campo-minado-tactico',
  color: 'green',
  best: 0,
  plays: '0',
}
```

### Canvas
- **width:** 640
- **height:** 640
- **has-lives:** true
- **has-levels:** true

### CustomEvents que emitirá game.js
| Evento | detail | Cuándo |
|---|---|---|
| `campo-minado-tactico:score` | `{ score: number }` | Cada cambio de puntuación |
| `campo-minado-tactico:lives` | `{ lives: number }` | Cada cambio de vidas |
| `campo-minado-tactico:level` | `{ level: number }` | Al subir de nivel |
| `campo-minado-tactico:state` | `{ state: 'playing'\|'gameover', score: number }` | Al iniciar y terminar |

---

## Plan de implementación

Sigue el patrón establecido en spec-04 (Asteroids):

1. Añadir entrada en `lib/data.ts` al array GAMES
2. Crear `public/games/campo-minado-tactico/game.js` como IIFE único con:
   - Loop rAF con variable de control `running` y `rafId`
   - Lógica de turnos: el rAF gestiona animaciones de movimiento; la lógica de turno se aplica solo al confirmar movimiento
   - Representación del tablero como array 2D de celdas (`type: 'empty'|'wall'|'mine'|'enemy'|'base'|'player'`)
   - Cada tanque enemigo con propiedades `{ dir, cadence, countdown, x, y }`; proyectiles como array de objetos `{ x, y, dir }`
   - CustomEvents en los puntos de cambio de estado
   - `window.destroyCampoMinadoTactico()` al final del IIFE
3. Componente `CampoMinadoTacticoGame` en `app/game/[id]/play/page.tsx` con overlay HUD
4. `if (id === 'campo-minado-tactico') return <CampoMinadoTacticoGame />;` en la función Page
5. Verificar en navegador: catálogo, canvas, HUD, game over, score en Supabase

---

## Criterios de aceptación

- [ ] CAMPO MINADO TÁCTICO aparece en el catálogo `/games` con categoría PUZZLE
- [ ] `/game/campo-minado-tactico/play` carga el canvas 640×640 con el juego funcional
- [ ] El overlay HUD muestra puntuación, vidas y nivel en tiempo real
- [ ] Al agotar las vidas el overlay muestra "GAME OVER"
- [ ] Con sesión activa, el score final se inserta en la tabla `scores` de Supabase
- [ ] Sin sesión, se muestra "Inicia sesión para guardar tu puntaje"
- [ ] Al navegar fuera, `destroyCampoMinadoTactico()` detiene el loop
- [ ] Sin errores TypeScript ni en consola del navegador

---

## Decisiones de diseño

- Turno explícito (no tiempo real) para que el jugador pueda razonar sin presión; los contadores de ciclo visibles son la clave pedagógica del puzzle.
- Verde fosfórico (#00ff88) sobre negro para evocar pantallas de radar militar sin alejarse del design system retro de Arcade Vault.
- Las minas no se revelan todas desde el inicio: solo las adyacentes al jugador. Esto añade una capa de exploración que complementa la deducción de disparos y evita que el puzzle sea trivialmente legible de un vistazo.

---

## Riesgos técnicos

- **Sincronía turno-animación**: el rAF debe separar la lógica de turno (discreta) de la animación (continua) para que los movimientos se vean fluidos sin romper la naturaleza por-turnos. Mitigación: usar un flag `animating` que bloquea input mientras se ejecuta la transición visual; la lógica de turno solo corre al finalizar la animación.
- **Diseño de niveles equilibrados**: niveles mal balanceados pueden resultar imposibles o triviales. Mitigación: definir los 10 niveles iniciales a mano con paths de solución verificados antes de implementar; documentar la solución mínima de cada nivel en un comentario dentro de game.js.
