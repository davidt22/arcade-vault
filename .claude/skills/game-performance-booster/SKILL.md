---
name: game-performance-booster
description: >
  Audita y optimiza el rendimiento del canvas de un juego de Arcade Vault.
  Detecta antipatrones en el game loop (concatenaciones de color, fondo
  estático por frame, stroke/fill sin batch, ctx.font en loop) y aplica
  las optimizaciones documentadas en spec-08-frogger-performance.
  Uso: /game-performance-booster <game-id>
argument-hint: '<game-id>'
---

# Skill: game-performance-booster

Audita y optimiza el rendimiento del game loop de un juego de Arcade Vault
recibido por ID. Referencia canónica: `specs/08-frogger-performance.md` y la
implementación resultante en `components/games/FroggerGame.tsx`.

---

## Fase 0 — Identificar el juego y su patrón

1. Leer `$ARGUMENTS` para obtener el `game-id`.
2. Leer `app/game/[id]/play/page.tsx` para determinar cómo se carga el juego.
3. Determinar el patrón:

   | Patrón | Señal | Archivo a auditar |
   |---|---|---|
   | **B — React TSX** | Importa `<GameId>Game` de `components/games/` | `components/games/<GameId>Game.tsx` |
   | **A — game.js externo** | Inyecta `<script src="/games/<id>/game.js">` | `public/games/<game-id>/game.js` |

4. Leer el archivo identificado **completo** antes de continuar.

---

## Fase 1 — Auditoría de antipatrones

Genera un checklist evaluando cada ítem como ✅ (sin problema) o ❌ (problema encontrado).
Para los ❌, indica la línea aproximada y un ejemplo del código problemático.

### Patrón B — React TSX canvas

Buscar dentro de la función `draw()` (o equivalente) dentro del `useEffect` principal:

| # | Antipatrón | Cómo detectarlo |
|---|---|---|
| 1 | **Concatenaciones de color** | `palette.primary + 'aa'`, `p.bg + '66'`, template literals con colores dentro de `draw()` |
| 2 | **Fondo estático por frame** | N llamadas a `fillRect` / `fillStyle` para zonas que no cambian entre frames |
| 3 | **`ctx.font` en el loop** | `ctx.font = ...` dentro de `draw()` en lugar de asignarlo una vez al montar |
| 4 | **`stroke()` sin batch** | `beginPath() … stroke()` llamado individualmente por entidad cuando varios comparten el mismo `strokeStyle` |
| 5 | **`fill()` sin batch** | `beginPath() … fill()` llamado individualmente por entidad cuando varios comparten el mismo `fillStyle` |
| 6 | **Alocaciones en draw** | Arrays u objetos creados con `[]` / `{}` / `new` dentro de `draw()` cada frame |

### Patrón A — game.js externo

Buscar dentro del loop de render (función pasada a `requestAnimationFrame`):

| # | Antipatrón | Cómo detectarlo |
|---|---|---|
| 1 | **`fillStyle`/`strokeStyle` por entidad** | `ctx.fillStyle = '#...'` seteado una vez por objeto en un loop cuando varios comparten color |
| 2 | **`ctx.font` en loop** | `ctx.font = ...` dentro de funciones de dibujo llamadas cada frame |
| 3 | **Fondo estático por frame** | Board, cuadrícula o tiles estáticos repintados desde cero cada frame sin offscreen canvas |
| 4 | **`stroke()`/`fill()` sin batch** | Igual que patrón B |

Si todos los checks son ✅, indicar al usuario que el juego ya está optimizado y detener.

---

## Fase 2 — Optimización

Aplicar solo las correcciones para los ítems con ❌. No modificar lo que ya está correcto.

### Optimización A — `colorCache` (antipatrón 1)

**Solo Patrón B.** Crear `buildColorCache` fuera del componente y un cache con invalidación
por valor de paleta dentro del `useEffect`:

```ts
// Fuera del componente:
interface ColorCache {
  bgDim: string;        // p.bg + '66'
  primaryFaint: string; // p.primary + '18'
  // ... una key por cada variante usada en draw()
}
function buildColorCache(p: GamePalette): ColorCache {
  return {
    bgDim:        p.bg + '66',
    primaryFaint: p.primary + '18',
    // ...
  };
}

// Dentro del useEffect, antes del loop:
let colorCache = buildColorCache(paletteRef.current);
let cachedPaletteKey = paletteRef.current.bg + paletteRef.current.primary + paletteRef.current.accent;
function updateColorCacheIfNeeded() {
  const p = paletteRef.current;
  const key = p.bg + p.primary + p.accent;
  if (key !== cachedPaletteKey) {
    colorCache = buildColorCache(p);
    cachedPaletteKey = key;
    bgDirty = true; // forzar repintado del fondo
  }
}
```

En `draw()`, llamar `updateColorCacheIfNeeded()` al inicio y sustituir cada
concatenación inline por su referencia `colorCache.<key>`.

> **Para Patrón A (game.js)**: extraer los colores a constantes o un objeto fuera del
> loop de render. Si el juego no tiene skins, las constantes pueden ser simples `const`.

### Optimización B — Offscreen canvas para fondo estático (antipatrón 2)

Extraer la lógica del fondo a `renderBackground(bgCtx, cache, p)` y llamarla solo
cuando `bgDirty === true`:

```ts
const bgCanvas = document.createElement('canvas');
bgCanvas.width = CANVAS_W;
bgCanvas.height = CANVAS_H;
const bgCtx = bgCanvas.getContext('2d')!;
let bgDirty = true;

function renderBackground(cache: ColorCache, p: GamePalette) {
  // toda la lógica de fondo aquí, usando bgCtx en lugar de ctx
}

// En draw():
if (bgDirty) { renderBackground(colorCache, paletteRef.current); bgDirty = false; }
ctx.drawImage(bgCanvas, 0, 0);
```

> **Importante**: comparar la paleta por valores (no por referencia) para activar
> `bgDirty`. El padre puede reconstruir el objeto paleta en cada render de React.
> No usar `OffscreenCanvas` API — usar `document.createElement('canvas')` por
> compatibilidad universal (sin problemas de SSR en Next.js).

### Optimización C — `ctx.font` fuera del loop (antipatrón 3)

Localizar `ctx.font = ...` dentro de `draw()` y moverlo a justo después de
obtener el contexto, antes del primer `requestAnimationFrame`:

```ts
const ctx = canvas.getContext('2d')!;
ctx.font = 'bold 14px monospace'; // ← una sola vez al montar
```

### Optimización D — Batch de paths (antipatrones 4 y 5)

Cuando varios elementos comparten `strokeStyle` o `fillStyle`, agrupar todos
sus paths en un solo `beginPath()` y cerrar con un único `stroke()` o `fill()`:

```ts
// Antes (un call por entidad):
for (const ent of entities) {
  ctx.beginPath();
  ctx.arc(ent.x, ent.y, r, 0, Math.PI * 2);
  ctx.fill();
}

// Después (un solo fill para todos):
ctx.beginPath();
for (const ent of entities) {
  ctx.arc(ent.x, ent.y, r, 0, Math.PI * 2);
}
ctx.fill();
```

Aplicar el mismo patrón para líneas (`moveTo` / `lineTo` + `stroke()` único).

---

## Fase 3 — Verificación en navegador

Iniciar el servidor si no está corriendo:

```bash
npm run dev
```

Para el juego auditado:

1. Navegar a `http://localhost:3000/game/<game-id>/play`
2. Jugar o dejar correr el juego durante **30 segundos**
3. Verificar ausencia de stuttering perceptible a simple vista
4. Verificar consola sin errores JS ni advertencias de TypeScript
5. Si el juego tiene skins, cambiar de skin y confirmar que los colores se actualizan
   correctamente (el `colorCache` se invalida en el siguiente frame)

Opcionalmente, abrir DevTools → Performance → Record durante 10 s y verificar que
los frames no superan 16 ms de forma consistente.

Guardar screenshot en `.playwright-screenshots/perf-booster-<game-id>.png`.

---

## Fase 4 — Informe final

```
## game-performance-booster — Informe <game-id>

Patrón: [A — game.js externo | B — React TSX canvas]
Archivo auditado: <ruta>

| Antipatrón                        | Antes         | Resultado       |
|-----------------------------------|---------------|-----------------|
| Concatenaciones de color en draw()| ❌ N encontradas | ✅ colorCache  |
| Fondo estático por frame          | ❌ X fillRect  | ✅ offscreen canvas |
| ctx.font en loop                  | ❌ en draw()   | ✅ movido al montar |
| stroke() sin batch                | ❌ M calls     | ✅ batched      |
| fill() sin batch                  | ❌ K calls     | ✅ batched      |

Archivos modificados: <lista>
Resultado: sin stuttering perceptible / skins siguen funcionando
```

Si no hubo cambios (todo era ✅), indicarlo explícitamente.

---

## Notas importantes

- **No cambiar la API de props** del componente — solo optimizar internamente.
- **Skins deben seguir funcionando** — el `colorCache` se invalida comparando los
  valores de las keys de la paleta, nunca por referencia de objeto.
- **No usar `OffscreenCanvas` API** — `document.createElement('canvas')` tiene
  soporte universal; la API `OffscreenCanvas` puede fallar en contextos SSR de Next.js.
- **Scope cerrado al juego indicado** — si se detectan problemas en otro juego
  durante la lectura de contexto, reportarlos sin tocarlos.
- **Juegos sin paleta dinámica (Patrón A)** — el `colorCache` puede ser un objeto
  de constantes simple, sin lógica de invalidación.
- **No tocar la lógica de `update()`** — solo optimizar el render; la lógica del
  juego debe permanecer intacta.
