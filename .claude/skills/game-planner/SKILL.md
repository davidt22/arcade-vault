---
name: game-planner
description: >
  Analiza Arcade Vault y decide qué juego integrar a continuación.
  Evalúa fit de categoría, dificultad técnica y diversidad del catálogo.
  Mantiene memoria de sugerencias previas en references/game-suggestions-todo.md
  para evitar repeticiones. Uso: /game-planner [<idea-o-nombre-de-juego>]
argument-hint: '[<nombre-o-idea-de-juego>]'
---

# Skill: game-planner

Analiza el catálogo actual de Arcade Vault y decide qué juego integrar a
continuación. Si el usuario pasa un argumento, evalúa esa idea específica.
Sin argumento, propone el juego que mejor complementa la plataforma.

---

## Fase 0 — Contexto automático

Antes de cualquier respuesta, ejecuta estos comandos para conocer el estado actual:

```
!cat lib/data.ts
!cat references/implemented-games.md
!cat references/game-suggestions-todo.md
```

Con esa información construye mentalmente:
- Distribución de categorías: cuántos juegos hay en ARCADE / PUZZLE / SHOOTER / VERSUS
- Qué juegos ya tienen canvas real vs cuáles son solo mock
- Qué juegos se han sugerido antes y en qué estado están

---

## Fase 1 — Análisis de la plataforma

Identifica los huecos del catálogo:

1. **Huecos de categoría** — ¿hay alguna categoría sub-representada?
2. **Huecos de mecánicas** — ¿falta un tipo de gameplay clásico (plataformer, match-3, top-down shooter, etc.)?
3. **Huecos de dificultad técnica** — el catálogo debería tener juegos de complejidad variada para poder ir progresando
4. **Variedad visual** — ¿hay demasiados juegos con estética similar?

---

## Fase 2 — Propuesta o evaluación

### Si no se pasó argumento (`$ARGUMENTS` está vacío):

Propone **un único juego** que mejor llene los huecos identificados. El formato de la propuesta es:

```
## Propuesta: <NOMBRE DEL JUEGO>

**Categoría:** <ARCADE|PUZZLE|SHOOTER|VERSUS>
**Dificultad técnica:** <Baja|Media|Alta>

**Mecánicas core:**
- <mecánica 1>
- <mecánica 2>
- <mecánica 3 si aplica>

**Por qué encaja en Arcade Vault:**
<2-3 oraciones explicando qué hueco llena, qué lo diferencia de los juegos ya existentes>

**Referencia técnica:**
<si existe, menciona una implementación open-source o recurso técnico de referencia>
```

### Si se pasó un argumento (idea a evaluar):

Evalúa `$ARGUMENTS` contra estos criterios y da un veredicto claro (encaja / no encaja / encaja con condiciones):

| Criterio | Evaluación |
|---|---|
| Fit de categoría | ¿A qué categoría pertenece? ¿Es la más adecuada? |
| Unicidad | ¿Es demasiado similar a un juego ya en el catálogo? |
| Dificultad técnica | ¿Es asumible en el stack actual (canvas + IIFE)? |
| Atractivo retro | ¿Encaja con la estética y el público de Arcade Vault? |
| Viabilidad de controles | ¿Funciona con teclado/mouse sin gamepad? |

Termina con una recomendación accionable: si encaja, describe el `game-id` sugerido y la categoría; si no, explica por qué y propón una alternativa.

---

## Fase 3 — Actualizar historial

Al terminar, actualiza `references/game-suggestions-todo.md` añadiendo una fila a la tabla con la sugerencia de esta sesión.

Si el archivo está vacío o no tiene tabla, créala desde cero:

```markdown
# Game Suggestions TODO

| Fecha | Juego | game-id | Categoría | Estado | Razón |
|---|---|---|---|---|---|
```

Luego añade la fila correspondiente:
- **Fecha**: fecha actual (formato YYYY-MM-DD)
- **Juego**: nombre display del juego
- **game-id**: slug kebab-case sugerido
- **Categoría**: ARCADE | PUZZLE | SHOOTER | VERSUS
- **Estado**: `sugerido` (inicial) — el usuario lo cambiará a `en-progreso`, `implementado` o `descartado`
- **Razón**: una frase con el hueco que llena

---

## Notas importantes

- **No sugieras juegos que ya están en `lib/data.ts`**, ni siquiera como mocks.
- **No repitas sugerencias** que ya aparezcan en `game-suggestions-todo.md` con estado `sugerido` o `en-progreso`.
- Sí puedes re-evaluar juegos con estado `descartado` si el usuario lo pide explícitamente.
- El skill solo planifica — **no ejecuta `/add-game`** ni modifica ningún otro archivo del proyecto.
- Usa siempre `/add-game` para la implementación una vez aprobada la propuesta.
