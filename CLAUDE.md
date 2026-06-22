# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

No hay suite de tests configurada.

## Skills
Usa siempre /frontend-design para diseñar el interfaz del usuario.

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
- Juegos: array `GAMES` estático (8 juegos: ARCADE, PUZZLE, SHOOTER, VERSUS)
- Auth: localStorage (`av_user`) — en Next.js migrar a cookies o un proveedor real
- Scores: localStorage (`av_scores`) + `seededScores()` para datos de demostración
- No hay base de datos ni API externa configurada actualmente

### CSS del template
`resources/templates/styles.css` define el design system retro con variables CSS (`--ink`, `--neon-cyan`, `--neon-magenta`, etc.) y clases `av-*`. Estas deben integrarse en `globals.css` o como módulos CSS al portar las pantallas.
