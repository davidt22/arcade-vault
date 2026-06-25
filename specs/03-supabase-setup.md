# spec-03: Integración base de Supabase

- **Estado:** Implementado
- **Fecha:** 2026-06-25
- **Depende de:** spec-01 (estructura del proyecto, globals.css, rutas)
- **Objetivo:** Instalar y configurar el cliente Supabase (`@supabase/ssr` + `@supabase/supabase-js`)
  con clientes para browser y server, dejando la capa de integración lista para specs futuros
  de auth, base de datos, real-time y edge functions.

---

## Scope

### Incluido
- Instalación de `@supabase/ssr` y `@supabase/supabase-js`
- `lib/supabase/client.ts` — cliente browser (para Client Components)
- `lib/supabase/server.ts` — cliente server (para Server Components y Route Handlers)
- Validación de variables de entorno en tiempo de arranque (error explícito si faltan)
- `lib/supabase/index.ts` — re-export limpio de ambos clientes

### No incluido
- Middleware de Next.js para refresco de sesión (spec de auth)
- Reemplazar localStorage auth (`av_user`) por auth real (spec de auth)
- Migrar scores de localStorage a Postgres (spec de base de datos)
- Helpers de real-time (spec de la feature que los necesite)
- Edge functions (spec de la feature que las necesite)
- Tablas, migraciones o schema en Supabase (specs futuros)
- Ninguna pantalla existente se modifica

---

## Plan de implementación

1. Instalar dependencias:
   `npm install @supabase/supabase-js @supabase/ssr`

2. Crear `lib/supabase/client.ts` — cliente browser con `createBrowserClient`:
   - Usa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Exporta función `createClient()` para Client Components

3. Crear `lib/supabase/server.ts` — cliente server con `createServerClient`:
   - Lee cookies con `next/headers` (`cookies()`)
   - Exporta función async `createClient()` para Server Components y Route Handlers

4. Crear `lib/supabase/index.ts` — re-exporta ambos clientes para imports limpios

5. Añadir validación de env vars: si `NEXT_PUBLIC_SUPABASE_URL` o
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` están ausentes, lanzar error descriptivo
   en tiempo de módulo (no en runtime silencioso)

6. Verificar que el proyecto arranca sin errores (`npm run dev`) y que el cliente
   browser puede inicializarse en consola sin excepciones

---

## Criterios de aceptación

- [ ] `@supabase/supabase-js` y `@supabase/ssr` aparecen en `package.json`
- [ ] `lib/supabase/client.ts` exporta `createClient()` usable en Client Components
- [ ] `lib/supabase/server.ts` exporta `createClient()` async usable en Server Components
- [ ] `lib/supabase/index.ts` re-exporta ambos clientes
- [ ] Si `NEXT_PUBLIC_SUPABASE_URL` está ausente, el servidor lanza error explícito al arrancar
- [ ] Si `NEXT_PUBLIC_SUPABASE_ANON_KEY` está ausente, el servidor lanza error explícito al arrancar
- [ ] `npm run dev` arranca sin errores de TypeScript ni de consola
- [ ] Ninguna pantalla existente muestra regresiones visuales o funcionales

---

## Decisiones tomadas y descartadas

- **`@supabase/ssr` en lugar de solo `@supabase/supabase-js`** — necesario para
  clientes server-side en Next.js App Router; la alternativa de usar solo el paquete
  base es incompatible con Server Components y cookies SSR.

- **Clientes separados (browser/server) en `lib/supabase/`** — alternativa era un
  único cliente universal; descartada porque Supabase SSR requiere explícitamente
  clientes distintos según el entorno de ejecución.

- **Re-export en `index.ts`** — alternativa era importar directamente de `client.ts`
  o `server.ts`; descartada para mantener imports limpios en specs futuros
  (`import { createClient } from '@/lib/supabase'`).

- **Middleware de sesión fuera de scope** — decisión del usuario; se implementará
  en el spec de auth junto con el reemplazo del localStorage auth.

- **Sin tablas ni schema en este spec** — la integración base no asume ningún
  modelo de datos; cada spec de feature definirá sus propias migraciones.
