# 06 — Arkanoid Integration

- **Estado:** Implementado
- **Fecha:** 2026-06-29
- **Dependencias:** 03-supabase-setup, 04-asteroids-integration
- **Objetivo:** Integrar el juego Arkanoid con overlay React y guardado de scores en Supabase.

## Alcance

Integrar el juego Arkanoid (referencias en `references/started-games/04-arkanoid/`) en Arcade Vault siguiendo el patrón de spec-04 (Asteroids): entrada en `lib/data.ts`, bundling de assets en `public/games/arkanoid/`, componente React `ArkanoidGame` en `play/page.tsx`, y dispatching de CustomEvents desde el game loop.

## Modelo de datos

Reutiliza la tabla `scores` existente: `id, user_id, game_id, score, level, created_at`.

No se requieren columnas adicionales.

## Plan de implementación

1. Añadir entrada `arkanoid` en `lib/data.ts` (antes de `asteroids`)
2. Copiar assets a `public/games/arkanoid/assets/` (spritesheet PNG, sonidos MP3)
3. Crear `public/games/arkanoid/game.js` como bundle IIFE de `spritesheet.js` + `levels.js` + `game.js` modificado con:
   - Rutas absolutas para assets (`/games/arkanoid/assets/...`)
   - Variables `running` y `rafId` para control del loop
   - CustomEvents: `arkanoid:score`, `arkanoid:lives`, `arkanoid:level`, `arkanoid:state`
   - `window.destroyArkanoid()` para limpiar al desmontar
4. Añadir componente `ArkanoidGame` en `app/game/[id]/play/page.tsx`
5. Añadir `if (id === 'arkanoid') return <ArkanoidGame />;` en la función `Page`

## Criterios de aceptación

- [x] Arkanoid visible en catálogo con categoría ARCADE
- [x] Canvas 800×600 con `id="game"` se renderiza correctamente
- [x] Spritesheet carga sin errores (ruta absoluta)
- [x] HUD overlay muestra Puntuación, Vidas, Nivel
- [x] Score se actualiza en overlay al romper bloques
- [x] Vidas se actualizan al perder la bola
- [x] Nivel avanza al limpiar todos los bloques
- [x] Game over despacha evento y muestra GAME OVER en overlay
- [x] Victoria (5 niveles) despacha evento gameover y guarda score
- [x] Loop se detiene al navegar fuera (`destroyArkanoid`)
- [x] Sin errores de scope global (IIFE aísla variables)

## Decisiones

- **Bundle IIFE**: Se bundlan `spritesheet.js` + `levels.js` + `game.js` en un único archivo para evitar problemas de orden de carga y variables globales entre juegos.
- **Canvas id="game"**: El game.js original usa `document.getElementById('game')`, se mantiene ese id en el componente React (diferente de Asteroids que usa `id="canvas"`).
- **Estado `win` → `gameover`**: El evento `arkanoid:state` despacha `gameover` tanto para perder vidas como para completar los 5 niveles, ya que ambos son estados terminales que deben guardar el score.

## Qué NO incluye este spec

- Validación server-side del score
- Soporte para reinicio de partida desde el overlay React
- Leaderboard específico de Arkanoid
