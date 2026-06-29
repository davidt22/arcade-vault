---
name: game-jam
description: >
  Dado un tema, lanza 3 agentes en paralelo que proponen 3 juegos distintos
  inspirados en ese tema. Cada agente trabaja desde un ángulo diferente
  (ARCADE, PUZZLE, SHOOTER/VERSUS) y genera un spec completo en
  specs/game-jam/<game-id>/spec.md para revisión posterior.
  Úsalo cuando el usuario quiera ideas creativas de juegos basadas en un tema,
  concepto o emoción. Se invoca con /game-jam <tema>.
argument-hint: '<tema-del-jam>'
---

# Skill: game-jam

Dado un tema, lanza 3 agentes en paralelo que inventan 3 juegos distintos
desde ángulos diferentes y generan un spec completo para cada uno en
`specs/game-jam/<game-id>/spec.md`. Al terminar presenta un resumen con las
3 propuestas y la invocación exacta de `/add-game` para implementar cualquiera.

---

## Fase 0 — Contexto automático

Si `$ARGUMENTS` está vacío, pregunta el tema al usuario y detente. No lances
agentes sin un tema.

Ejecuta estos comandos para conocer el estado actual del catálogo:

```
!cat lib/data.ts
!cat references/implemented-games.md
!cat references/game-suggestions-todo.md
!ls specs/game-jam/
```

Con el output construye mentalmente dos listas que embedirás en cada prompt
de agente en la Fase 1:

- **JUEGOS_EXISTENTES**: todos los valores de `id:` del array `GAMES` en
  `lib/data.ts` (e.g. `tetris, arkanoid, asteroids, bloque-buster, ...`)
- **SUGERENCIAS_PREVIAS**: todos los `game-id` de la tabla en
  `references/game-suggestions-todo.md` (e.g. `ciclos-luz, sokoban, ...`)

---

## Fase 1 — Lanzar 3 agentes en paralelo

Construye los tres prompts usando la plantilla de abajo (una variante por
ángulo) y lanza los **tres agentes en el mismo mensaje** usando el tool Agent.
No esperes a que uno termine antes de lanzar el siguiente — los tres deben
arrancar a la vez.

Los tres juegos propuestos deben ser distintos entre sí.

---

### Prompt Agente A — ARCADE

Sustituye `{TEMA}`, `{JUEGOS_EXISTENTES}` y `{SUGERENCIAS_PREVIAS}` con los
valores reales obtenidos en Fase 0. Añade también la fecha actual en
`{FECHA_HOY}`.

```
Eres un diseñador de videojuegos retro. Tu tarea es proponer UN juego original
para la plataforma Arcade Vault y crear su spec completo.

## Tu ángulo asignado
ÁNGULO: ARCADE
CATEGORÍA A USAR: ARCADE
Enfoque: acción, reflejos, timing preciso, esquiva, power-ups, supervivencia
a presión. El jugador actúa de forma continua y el juego recompensa la
coordinación motriz.

## Tema del game jam
"{TEMA}"

## Restricciones obligatorias
No puedes proponer ningún juego de estas listas.

Juegos ya en el catálogo (lib/data.ts):
{JUEGOS_EXISTENTES}

Juegos ya sugeridos (references/game-suggestions-todo.md):
{SUGERENCIAS_PREVIAS}

También están descartadas variaciones evidentes de esos juegos (si "snake"
está en la lista, "neon-snake" también está descartado).

## Lo que debes hacer

1. Inventa UN juego original que:
   - Encaje con el tema "{TEMA}" desde el ángulo ARCADE
   - Sea implementable con canvas HTML5 + JavaScript puro (sin librerías)
   - Use controles de teclado o ratón (sin gamepad)
   - No sea copia directa de ningún juego de las listas anteriores
   - Tenga un game-id en kebab-case único (e.g. "luz-fugaz", "tormenta-px")

2. Crea el directorio y archivo `specs/game-jam/{game-id}/spec.md` con el
   formato exacto descrito abajo.

3. No crees ningún otro archivo. No implementes el juego.

## Formato exacto del spec

Crea el archivo con este contenido (sustituye todos los {placeholders}):

---
# Game Jam Spec: {TÍTULO EN MAYÚSCULAS}

- **Estado:** Propuesto
- **Tema:** {TEMA}
- **Categoría:** ARCADE
- **Ángulo:** ARCADE
- **game-id:** {game-id}
- **Fecha:** {FECHA_HOY}

---

## Concepto del juego

### Descripción
{2-3 párrafos: qué hace el jugador, cómo se ve en pantalla, qué sensación
produce jugar — velocidad, tensión, satisfacción, etc.}

### Por qué encaja con el tema "{TEMA}"
{1 párrafo explicando la conexión — no solo formal sino emocional o mecánica}

### Frase de concepto (≤ 60 caracteres)
{una sola frase que aparecería como `short` en lib/data.ts}

---

## Mecánicas core

- {mecánica 1 — el verbo principal del jugador, e.g. "esquiva obstáculos..."}
- {mecánica 2}
- {mecánica 3}
- {mecánica 4 si aplica}

---

## Scope

### Incluido
- Canvas {W}×{H}px con game loop requestAnimationFrame
- CustomEvents: {game-id}:score, {game-id}:state (y :lives, :level si aplica)
- Overlay React con HUD (puntuación, vidas y nivel según corresponda)
- Entrada en `lib/data.ts` con categoría ARCADE

### No incluido
- Controles táctiles para móvil
- Sonido
- Leaderboard específico
- {otros elementos deliberadamente excluidos}

---

## Modelo de datos

### Entrada en lib/data.ts
```ts
{
  id: '{game-id}',
  title: '{TÍTULO}',
  short: '{frase de concepto ≤60 chars}',
  long: '{descripción larga, 1-2 frases}',
  cat: 'ARCADE',
  cover: 'cover-{game-id}',
  color: '{cyan|magenta|yellow|green}',
  best: 0,
  plays: '0',
}
```

### Canvas
- **width:** {px}
- **height:** {px}
- **has-lives:** {true|false}
- **has-levels:** {true|false}

### CustomEvents que emitirá game.js
| Evento | detail | Cuándo |
|---|---|---|
| `{game-id}:score` | `{ score: number }` | Cada cambio de puntuación |
| `{game-id}:lives` | `{ lives: number }` | Cada cambio de vidas (si has-lives) |
| `{game-id}:level` | `{ level: number }` | Al subir de nivel (si has-levels) |
| `{game-id}:state` | `{ state: 'playing'\|'gameover', score: number }` | Al iniciar y terminar |

---

## Plan de implementación

Sigue el patrón establecido en spec-04 (Asteroids):

1. Añadir entrada en `lib/data.ts` al array GAMES
2. Crear `public/games/{game-id}/game.js` como IIFE único con:
   - Loop rAF con variable de control `running` y `rafId`
   - CustomEvents en los puntos de cambio de estado
   - `window.destroy{PascalId}()` al final del IIFE
3. Componente `{PascalId}Game` en `app/game/[id]/play/page.tsx` con overlay HUD
4. `if (id === '{game-id}') return <{PascalId}Game />;` en la función Page
5. Verificar en navegador: catálogo, canvas, HUD, game over, score en Supabase

---

## Criterios de aceptación

- [ ] {TÍTULO} aparece en el catálogo `/games` con categoría ARCADE
- [ ] `/game/{game-id}/play` carga el canvas {W}×{H} con el juego funcional
- [ ] El overlay HUD muestra puntuación{, vidas, nivel} en tiempo real
- [ ] Al llegar a game over el overlay muestra "GAME OVER"
- [ ] Con sesión activa, el score final se inserta en la tabla `scores` de Supabase
- [ ] Sin sesión, se muestra "Inicia sesión para guardar tu puntaje"
- [ ] Al navegar fuera, `destroy{PascalId}()` detiene el loop
- [ ] Sin errores TypeScript ni en consola del navegador

---

## Decisiones de diseño

- {decisión 1 — e.g. resolución de canvas elegida por las proporciones del juego}
- {decisión 2 — mecánica principal vs. alternativa descartada}
- {decisión 3 — has-lives=false porque...}

---

## Riesgos técnicos

- {riesgo 1 — e.g. colisión poligonal compleja → mitigación: usar hitbox circular}
- {riesgo 2}
```

Crea el archivo `specs/game-jam/{game-id}/spec.md` con ese contenido.
No hagas nada más.
```

---

### Prompt Agente B — PUZZLE

Igual que el Prompt A excepto en las partes marcadas con ★:

- ★ **ÁNGULO**: PUZZLE
- ★ **CATEGORÍA A USAR**: PUZZLE
- ★ **Enfoque**: lógica, deducción, razonamiento espacial, estados del mundo con
  reglas de transformación claras. El jugador piensa antes de actuar; la
  satisfacción viene de resolver, no de la velocidad.
- ★ En los criterios de aceptación y modelo de datos usa `cat: 'PUZZLE'`

El resto del prompt y del formato del spec es idéntico al Agente A.

---

### Prompt Agente C — SHOOTER / VERSUS

Igual que el Prompt A excepto en las partes marcadas con ★:

- ★ **ÁNGULO**: SHOOTER o VERSUS (el agente elige según la propuesta)
- ★ **CATEGORÍA A USAR**: SHOOTER o VERSUS (la que mejor encaje)
- ★ **Enfoque**: proyectiles, oleadas de enemigos, combate directo o
  confrontación entre jugadores. Presión extrema, escalada de dificultad,
  recompensa por precisión.
- ★ En los criterios de aceptación y modelo de datos usa la categoría elegida

El resto del prompt y del formato del spec es idéntico al Agente A.

---

## Fase 2 — Presentar resumen al usuario

Cuando los 3 agentes hayan terminado, lee los specs que crearon:

```
specs/game-jam/*/spec.md
```

Si algún agente no creó su archivo, indícalo brevemente ("Agente B no
completó su spec") y presenta los que sí existen.

Verifica que ningún `game-id` generado coincida con `JUEGOS_EXISTENTES` ni
`SUGERENCIAS_PREVIAS`. Si hay colisión, nótalo para que el usuario lo tenga
en cuenta.

Presenta el resumen con este formato:

```
## Game Jam: "{TEMA}" — 3 propuestas

### Opción A — ARCADE: {TÍTULO A}
**game-id:** `{id-a}` | **Concepto:** {frase de concepto del spec}
**Spec:** `specs/game-jam/{id-a}/spec.md`

### Opción B — PUZZLE: {TÍTULO B}
**game-id:** `{id-b}` | **Concepto:** {frase de concepto del spec}
**Spec:** `specs/game-jam/{id-b}/spec.md`

### Opción C — SHOOTER/VERSUS: {TÍTULO C}
**game-id:** `{id-c}` | **Concepto:** {frase de concepto del spec}
**Spec:** `specs/game-jam/{id-c}/spec.md`

---

Para implementar cualquiera de las propuestas:
/add-game {id-a} "{TÍTULO A}" ARCADE
/add-game {id-b} "{TÍTULO B}" PUZZLE
/add-game {id-c} "{TÍTULO C}" {SHOOTER|VERSUS}
```

No re-expliques las mecánicas en el resumen — el detalle está en los specs.
