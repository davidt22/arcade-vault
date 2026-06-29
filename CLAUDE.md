# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

No hay suite de tests configurada.

## Skills
Usa siempre /frontend-design para diseñar el interfaz del usuario.

Usar el skill `/game-planner` para decidir qué juego integrar a continuación. Mantiene el historial de sugerencias en `references/game-suggestions-todo.md`.

## Arquitectura

**Arcade Vault** es una plataforma retro de juegos arcade online con clasificaciones competitivas.

### Stack
- **Next.js 16** con App Router (`app/`)
- **React 19** — `app/layout.tsx` es el root layout con fuentes Geist
- **Tailwind CSS v4** — importado con `@import "tailwindcss"` en `globals.css` (no las directivas `@tailwind base/components/utilities` de v3)
- **TypeScript** estricto

### Estructura de pantallas

El diseño de referencia está en `resources/templates/` como SPA vanilla (React + Babel sin bundler). Estas plantillas definen la UX y los datos mock que deben portarse a Next.js:

| Plantilla | Pantalla Next.js a crear |
|---|---|
| `biblioteca.jsx` | `/` — catálogo de juegos con filtros por categoría |
| `detalle.jsx` | `/game/[id]` — ficha del juego |
| `reproductor.jsx` | `/game/[id]/play` — iframe/canvas del juego |
| `auth.jsx` | `/auth` — login y registro |
| `salon.jsx` | `/hall-of-fame` — tabla de puntuaciones |
| `nav.jsx` | `components/Nav` — navbar compartida |
| `data.jsx` | `lib/data.ts` — datos mock (GAMES, CATS, seededScores) |

### Enrutamiento del template
Las plantillas usan hash-routing (`location.hash`) con un objeto `{ name, id? }`. En Next.js esto se reemplaza con el App Router de Next.js 16.

### Datos y estado
- Juegos: array `GAMES` estático en `lib/data.ts` (11 juegos: ARCADE, PUZZLE, SHOOTER, VERSUS)
- Auth: Supabase Auth (sesión server-side via `lib/supabase/server.ts`)
- Scores: tabla `scores` en Supabase (`id, user_id, game_id, score, level, created_at`) + `seededScores()` en `lib/data.ts` para datos mock en Hall of Fame
- API interna: `POST /api/scores` — guarda score si hay sesión activa, 401 si no

### Supabase
- `lib/supabase/client.ts` — cliente browser (`createBrowserClient`)
- `lib/supabase/server.ts` — cliente server-side (`createServerClient`)
- `lib/supabase/index.ts` — re-exporta ambos

### Patrón de integración de juegos
Establecido en spec-04 (Asteroids). Cada juego sigue este patrón:

1. **Assets**: `public/games/<id>/game.js` — bundle IIFE único (evita problemas de orden y scope global)
2. **CustomEvents** que el game.js despacha al `window`:
   - `<id>:score` → `{ score: number }`
   - `<id>:lives` → `{ lives: number }`
   - `<id>:level` → `{ level: number }`
   - `<id>:state` → `{ state: 'playing'|'dead'|'gameover', score: number }`
3. **Cleanup**: `window.destroy<GameId>()` — detiene el loop al desmontar el componente
4. **Componente React**: `<GameId>Game` en `app/game/[id]/play/page.tsx` con overlay HUD
5. **Dispatch en page**: `if (id === '<id>') return <<GameId>Game />;`

Ver lista completa de juegos cuando lo necesites y su estado de implementación en `references/implemented-games.md`.

Usar `/game-planner` para decidir qué juego integrar y `/add-game` para implementarlo.

### CSS del template
`resources/templates/styles.css` define el design system retro con variables CSS (`--ink`, `--neon-cyan`, `--neon-magenta`, etc.) y clases `av-*`. Estas deben integrarse en `globals.css` o como módulos CSS al portar las pantallas.
