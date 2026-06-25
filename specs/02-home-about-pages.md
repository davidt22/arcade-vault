# spec-02: Home + About pages

- **Estado:** Aprobado
- **Fecha:** 2026-06-23
- **Depende de:** spec-01 (estilos globals.css, Nav, lib/data.ts, rutas /game/[id])
- **Objetivo:** Portar home.jsx y about.jsx del template vanilla a Next.js como
  páginas `/` y `/about`, redirigiendo la actual `/` (biblioteca) a `/games`.

---

## Scope

### Incluido
- `app/page.tsx` reemplazado por el home landing page (hero, features, games preview,
  stats, actividad en vivo, pricing/FAQ, final CTA)
- `app/about/page.tsx` — nueva ruta con la pantalla About + formulario de contacto
- `app/games/page.tsx` — la biblioteca actual (`app/page.tsx`) se mueve aquí
- `hooks/useReveal.ts` — hook con IntersectionObserver extraído para reutilización
- CSS de home y about ya está en `globals.css` (viene del template); no hay CSS nuevo
- Navegación: CTAs del home apuntan a `/games`, `/auth`, `/hall-of-fame`
- Formulario de contacto: validación y estado "enviado" solo en cliente (sin POST real)

### No incluido
- Implementación real del envío del formulario de contacto (backend/email)
- Animación de contador en las stats (12+, MILES, GLOBAL son texto estático)
- `/auth` y `/hall-of-fame` (specs futuros)
- Actualización del Nav para añadir el enlace "ABOUT" (se hace cuando se implemente Nav)

---

## Plan de implementación

1. Mover `app/page.tsx` → `app/games/page.tsx` (la biblioteca existente)
2. Crear `hooks/useReveal.ts` con el IntersectionObserver del template
3. Crear `app/page.tsx` con el componente Home portado desde home.jsx:
   - FloatingSilhouettes, FeatureIcon, MiniCard como sub-componentes internos
   - `useRouter` para navegación en lugar de `navigate()`
   - Datos de actividad como constantes inline
4. Crear `app/about/page.tsx` con el componente About portado desde about.jsx:
   - HighlightIcon como sub-componente interno
   - Formulario de contacto con estado local (useState)
5. Verificar que los estilos `.home-*` y `.about-*` ya estén en `globals.css`
   (vienen del PR anterior); añadir los que falten
6. Verificar que el Nav apunte a `/games` para el enlace "JUEGOS" si ya existe

---

## Criterios de aceptación

- [ ] `/` carga el home landing page (hero visible, silhouettes animadas)
- [ ] `/games` carga la biblioteca de juegos (misma funcionalidad que antes en `/`)
- [ ] `/about` carga la pantalla About con el formulario de contacto
- [ ] Sección "JUEGOS DISPONIBLES AHORA" muestra exactamente 6 juegos de `GAMES`
- [ ] Botón "EXPLORAR JUEGOS" navega a `/games`
- [ ] Botón "CREAR CUENTA" navega a `/auth`
- [ ] Botón "VER SALÓN →" navega a `/hall-of-fame`
- [ ] Las secciones con `.reveal` aparecen con fade-in al hacer scroll
- [ ] Formulario de contacto en `/about` muestra el terminal de éxito al enviar
- [ ] Formulario de contacto valida que los tres campos no estén vacíos (shake si vacío)
- [ ] No hay errores de TypeScript ni de consola del navegador
- [ ] La página es responsiva en mobile (≤ 600px)

---

## Decisiones tomadas y descartadas

- **`/` como landing, biblioteca en `/games`** — alternativa era mantener `/` como
  biblioteca; descartada porque un producto con home landing es más estándar y el
  template lo contempla explícitamente.

- **Home + About en un solo spec** — alternativa era spec separado para About;
  descartada porque comparten template folder, estilos y el alcance total es pequeño.

- **Datos de actividad inline** — alternativa era añadirlos a `lib/data.ts`;
  descartada porque son datos decorativos de UI, no datos de dominio.

- **`useReveal` en `hooks/`** — alternativa era duplicarlo en cada página;
  descartada para no repetir código idéntico en dos archivos.

- **Formulario sin POST real** — decisión del usuario; queda registrada para un spec
  futuro de integración con backend/email.

---

## Riesgos identificados

- **CSS de home/about en globals.css**: si el PR anterior no incluyó todas las clases
  del template (`.home-*`, `.about-*`, `.mini-*`, `.feature-*`, etc.), habrá estilos
  rotos. Mitigación: paso 5 del plan verifica y añade lo que falte.

- **Ruta `/games` rompe links existentes**: si el Nav u otras páginas enlazan a `/`
  esperando la biblioteca, quedarán rotos. Mitigación: revisar el Nav en el paso 6.
