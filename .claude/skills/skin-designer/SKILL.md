---
name: skin-designer
description: >
  Revisa que cada juego en Arcade Vault tenga al menos 3 skins definidas:
  classic (default), neon y retro. Para los juegos que no las tengan, las
  crea en lib/data.ts con las paletas de color estándar.
  Uso: /skin-designer [<game-id>]
argument-hint: '[<game-id>]'
---

# Skill: skin-designer

Audita que cada juego del catálogo tenga las 3 skins requeridas (`classic`,
`neon`, `retro`). Si faltan, las añade directamente en `lib/data.ts`.

---

## Fase 0 — Contexto automático

Antes de cualquier acción, ejecuta:

```
!cat lib/data.ts
```

Construye mentalmente:
- Lista de todos los `id` del array `GAMES`
- Para cada juego: su `color` actual y si ya tiene campo `skins`
- Si el tipo `Skin` ya existe en `lib/data.ts`

Si `$ARGUMENTS` contiene un `game-id`, trabaja **solo** sobre ese juego.
Si `$ARGUMENTS` está vacío, audita **todos** los juegos.

---

## Fase 1 — Auditoría de skins

Para cada juego a auditar, determina qué skins tiene y cuáles faltan.

Una skin está presente si el juego tiene un campo `skins` con un elemento
cuyo `id` coincide con `'classic'`, `'neon'` o `'retro'`.

Clasifica cada juego en una de estas categorías:
- **Completo**: tiene las 3 skins → no requiere acción
- **Parcial**: tiene algunas skins pero no todas → añadir las que faltan
- **Sin skins**: no tiene campo `skins` → añadir las 3

Si todos los juegos están completos, informa al usuario y detente.

---

## Fase 2 — Añadir skins faltantes

### Paso 1 — Definir tipo `Skin` (si no existe)

Si `lib/data.ts` no contiene la definición del tipo `Skin`, añádela justo
**antes** del tipo `Game`:

```ts
export type Skin = {
  id: 'classic' | 'neon' | 'retro';
  label: string;
  palette: {
    bg: string;
    primary: string;
    accent: string;
    text: string;
  };
};
```

### Paso 2 — Añadir campo `skins` al tipo `Game` (si no existe)

Si el tipo `Game` no tiene el campo `skins`, añádelo como campo opcional:

```ts
skins?: Skin[];
```

### Paso 3 — Paletas estándar

Usa estas paletas para cada skin:

**classic** — basada en el campo `color` del juego:

| color del juego | primary   | accent    |
|-----------------|-----------|-----------|
| `cyan`          | `#00FFFF` | `#00FFFF` |
| `magenta`       | `#FF00FF` | `#FF00FF` |
| `yellow`        | `#FFD600` | `#FFD600` |
| `green`         | `#00FF41` | `#00FF41` |

```ts
{ id: 'classic', label: 'Clásico', palette: { bg: '#000000', primary: '<del color>', accent: '<del color>', text: '#FFFFFF' } }
```

**neon** — igual para todos los juegos:

```ts
{ id: 'neon', label: 'Neón', palette: { bg: '#050510', primary: '#00FFFF', accent: '#FF00FF', text: '#00FFFF' } }
```

**retro** — igual para todos los juegos:

```ts
{ id: 'retro', label: 'Retro', palette: { bg: '#0A0A04', primary: '#33FF00', accent: '#FF8800', text: '#33FF00' } }
```

### Paso 4 — Insertar skins en cada juego

Para cada Game que necesite skins, añade (o actualiza) el campo `skins`
con las skins que falten. Mantén el orden `['classic', 'neon', 'retro']`.

Ejemplo del resultado esperado para un juego con `color: 'cyan'`:

```ts
{
  id: 'asteroids',
  title: 'ASTEROIDS',
  // ... resto de campos existentes sin modificar ...
  skins: [
    { id: 'classic', label: 'Clásico', palette: { bg: '#000000', primary: '#00FFFF', accent: '#00FFFF', text: '#FFFFFF' } },
    { id: 'neon',    label: 'Neón',    palette: { bg: '#050510', primary: '#00FFFF', accent: '#FF00FF', text: '#00FFFF' } },
    { id: 'retro',   label: 'Retro',   palette: { bg: '#0A0A04', primary: '#33FF00', accent: '#FF8800', text: '#33FF00' } },
  ],
},
```

**Regla**: no modifiques ningún otro campo del Game. Solo añade `skins`.

---

## Fase 3 — Reporte final

Al terminar, presenta una tabla con el resultado:

```
## Skin Designer — Resumen

| Juego            | classic | neon | retro | Acción         |
|------------------|---------|------|-------|----------------|
| ASTEROIDS        | ✅      | ✅   | ✅    | Ya completo    |
| TETRIS           | ➕      | ➕   | ➕    | 3 skins añadas |
| ARKANOID         | ✅      | ➕   | ➕    | 2 skins añadas |
| ...              | ...     | ...  | ...   | ...            |

Total: X juegos auditados · Y skins añadidas · Z ya completos
```

---

## Notas importantes

- **No modifiques** los campos existentes de ningún Game (id, title, short,
  long, cat, cover, color, best, plays). Solo añade `skins`.
- Si un juego ya tiene `skins` con algunas de las 3, **preserva las existentes**
  y añade solo las que falten; no sobrescribas las que ya están.
- Si el usuario pasa un `game-id` que no existe en `GAMES`, avisa y detente.
- El skill solo modifica `lib/data.ts`. No toca `game.js`, componentes React
  ni CSS — la integración visual de las skins es tarea de otro skill o PR.
