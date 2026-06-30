---
name: mobile-porter
description: >
  Audita y repara la experiencia móvil de todos los juegos implementados
  en Arcade Vault. Verifica que cada componente de juego use useCanvasScale,
  TouchControls y (si es landscape) useIsPortrait. Comprueba en navegador
  a 390px de ancho. Uso: /mobile-porter [<game-id>]
argument-hint: '[<game-id>]'
---

# Skill: mobile-porter

Audita la experiencia móvil de los juegos de Arcade Vault y repara los
problemas que encuentre. Si se pasa un `game-id`, audita solo ese juego;
sin argumento, audita todos los juegos implementados con canvas real.

---

## Fase 0 — Contexto automático

Antes de cualquier acción, lee el estado actual del proyecto:

```
!cat app/game/[id]/play/page.tsx
!cat hooks/useCanvasScale.ts
!cat hooks/useTouchControls.ts
!cat components/TouchControls.tsx
```

Con esa información identifica:
- Qué componentes de juego existen (`AsteroidsGame`, `TetrisGame`, `ArkanoidGame`, etc.)
- Si `useCanvasScale`, `useTouchControls` y `TouchControls` están importados
- Qué juegos usan MockPlayer (no requieren audit móvil)

---

## Fase 1 — Checklist por juego

Para cada componente de juego con canvas real, verifica:

| Check | Descripción | Crítico |
|---|---|---|
| `useCanvasScale` | Hook llamado con las dimensiones nativas del canvas | Sí |
| Wrapper dimensional | El div contenedor del canvas tiene `width: nativeW * scale, height: nativeH * scale` | Sí |
| `transform: scale(scale)` | Aplicado al canvas o al contenedor interno con `transformOrigin: 'top left'` | Sí |
| `<TouchControls keyMap={…}>` | Renderizado debajo del canvas con el mapa correcto de botones | Sí |
| `useIsPortrait` + overlay | Solo para juegos **landscape** (canvas más ancho que alto): mostrar mensaje "GIRA EL DISPOSITIVO" en portrait | Sí (landscape) |
| Sin scroll horizontal | A 390px de ancho, ningún elemento desborda el viewport | Sí |
| `pointer: coarse` | Los botones táctiles son invisibles en desktop y visibles en móvil | Sí |

### Mapas de botones estándar por tipo de juego

- **Asteroids** (landscape): `{ '◀': 'ArrowLeft', '▶': 'ArrowRight', '▲': 'ArrowUp', '🔥': ' ' }`
- **Arkanoid** (landscape): `{ '◀': 'ArrowLeft', '▶': 'ArrowRight' }`
- **Tetris** (portrait): `{ '◀': 'ArrowLeft', '▶': 'ArrowRight', '↻': 'ArrowUp', '▼': 'ArrowDown', '⬇': ' ' }`
- **Nuevo juego landscape**: adapta el mapa a las teclas que usa el juego
- **Nuevo juego portrait**: ídem, sin restricción de orientación

### Dimensiones nativas conocidas

| Juego | nativeW | nativeH | Orientación |
|---|---|---|---|
| Asteroids | 800 | 600 | landscape |
| Arkanoid | 800 | 600 | landscape |
| Tetris | 474 | 600 | portrait |

Para juegos nuevos, busca el atributo `width`/`height` del `<canvas>` en el componente.

---

## Fase 2 — Reparación

Para cada falla encontrada, aplica la corrección mínima necesaria.

### Caso: falta `useCanvasScale`

Importar al inicio del archivo si no está:
```tsx
import { useCanvasScale } from '@/hooks/useCanvasScale';
```

Añadir en el componente:
```tsx
const scale = useCanvasScale(nativeW, nativeH);
```

Actualizar el wrapper del canvas:
```tsx
<div style={{ position: 'relative', width: nativeW * scale, height: nativeH * scale }}>
  <canvas
    id="canvas"
    width={nativeW}
    height={nativeH}
    style={{ display: 'block', transformOrigin: 'top left', transform: `scale(${scale})` }}
  />
```

### Caso: falta `<TouchControls>`

Importar el componente si no está:
```tsx
import { TouchControls } from '@/components/TouchControls';
```

Añadir justo después del div contenedor del canvas:
```tsx
<TouchControls keyMap={{ '◀': 'ArrowLeft', '▶': 'ArrowRight' /* adaptar */ }} />
```

### Caso: falta overlay portrait (juego landscape)

Añadir hook `useIsPortrait` si no existe en el archivo (no duplicar si ya está):
```tsx
function useIsPortrait() {
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const check = () => setPortrait(window.innerWidth < window.innerHeight);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return portrait;
}
```

En el componente, añadir al inicio:
```tsx
const portrait = useIsPortrait();
```

Y antes del return principal:
```tsx
if (portrait) return (
  <div style={{
    minHeight: '100vh',
    background: '#000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  }}>
    <span style={{ fontSize: 48 }}>↻</span>
    <p style={{ fontFamily: 'var(--pixel)', fontSize: 11, letterSpacing: '0.14em', color: 'var(--cyan)', textAlign: 'center' }}>
      GIRA EL DISPOSITIVO
    </p>
  </div>
);
```

---

## Fase 3 — Verificación en navegador

Usa Playwright para confirmar la experiencia móvil. Arranca el servidor si no está corriendo:

```bash
npm run dev
```

Para cada juego auditado:

1. **Viewport móvil portrait (390×844)**  
   Navegar a `http://localhost:3000/game/<id>/play`
   - Juego landscape: debe mostrar "GIRA EL DISPOSITIVO", sin canvas visible
   - Juego portrait: debe mostrar el canvas escalado correctamente

2. **Viewport móvil landscape (844×390)**  
   - Juego landscape: canvas visible y escalado, sin scroll horizontal, botones táctiles visibles
   - Juego portrait: canvas visible y escalado, sin scroll horizontal, botones táctiles visibles

3. **Viewport desktop (1280×800)**  
   - Botones táctiles no visibles (se ocultan con `pointer: coarse`)
   - Canvas a tamaño completo (scale ≈ 1)

4. **Consola sin errores**  
   Verificar que no hay errores JS ni advertencias de TypeScript en ninguna de las vistas.

Hacer screenshot de cada estado relevante y guardarlo en `.playwright-screenshots/mobile-porter-<game-id>-<estado>.png`.

---

## Fase 4 — Informe final

Al terminar, genera un informe conciso:

```
## mobile-porter — Informe de auditoría

| Juego | useCanvasScale | TouchControls | Portrait overlay | Sin scroll | Estado |
|---|---|---|---|---|---|
| asteroids | ✅ | ✅ | ✅ | ✅ | OK |
| arkanoid  | ✅ | ✅ | ✅ | ✅ | OK |
| tetris    | ✅ | ✅ | N/A | ✅ | OK |
| <nuevo>   | ❌ | ❌ | ❌ | ❌ | REPARADO |
```

Listar los cambios realizados con referencias a líneas modificadas.

---

## Notas importantes

- **No modificar `game.js`** — todas las correcciones van en `play/page.tsx` o en los hooks/componentes compartidos.
- **No duplicar hooks** — `useIsPortrait` ya existe en el archivo; reutilizarlo si está presente.
- **Juegos MockPlayer** — no requieren audit; los MockPlayers no tienen canvas nativo.
- **Nuevo juego** — si no está en la lista conocida de dimensiones, inspeccionar el canvas en el componente React para obtener `width`/`height`.
- **visualViewport** — `useCanvasScale` ya usa `window.visualViewport` cuando está disponible; no necesita modificarse.
- **Orientación de juegos nuevos** — si `nativeW > nativeH`, es landscape → requiere `useIsPortrait`; si `nativeH >= nativeW`, es portrait → sin restricción.
