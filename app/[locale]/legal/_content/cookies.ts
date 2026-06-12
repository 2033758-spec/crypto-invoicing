// Cookies Notice — bundled as a module string (see terms_of_service.ts for why).
// Source of truth: /06_legal/draft/cookies_v1.md — keep in sync until the W11
// lawyer redline. Bilingual EN + ES-AR (single doc, isCookies flag in loader).

const cookies = `# Cookies Notice

**Effective:** 2026-05-26

---

## What cookies are

Cookies are small text files that websites place on your device to remember preferences, keep you signed in, and understand how the site is used.

## Cookies we use

### Strictly necessary (cannot be disabled)

| Cookie | Purpose | Duration |
|---|---|---|
| \`sb-access-token\` | Supabase Auth session | Session |
| \`sb-refresh-token\` | Supabase Auth refresh | 7 days |
| \`NEXT_LOCALE\` | Remember your language preference (EN / ES-AR / PT-BR) | 1 year |
| \`__Host-csrf\` | CSRF protection on form submissions | Session |

### Functional (optional, opt-out)

| Cookie | Purpose | Duration |
|---|---|---|
| \`ph_*\` (PostHog) | Anonymized product analytics — page views, feature usage | 1 year |
| \`_ym_*\` (Yandex Metrika) | Anonymized analytics + session replay (Webvisor); set only after you accept | up to 1 year |

We do not use advertising cookies. We do not share cookie data with third-party advertisers.

## How to control cookies

- Most browsers let you block or delete cookies (Settings → Privacy)
- You can opt out of PostHog analytics in app Settings → Privacy → Analytics → Off
- Disabling strictly-necessary cookies will break sign-in and basic site function

## Changes

We will update this notice if we add new cookies or change our use of existing ones.

## Contact

Questions: hola@cryptoinvoicing.co

---

# Aviso de Cookies (ES-AR)

**Vigente:** 2026-05-26

## Qué son las cookies

Pequeños archivos de texto que los sitios web colocan en tu dispositivo para recordar preferencias, mantenerte conectado y entender el uso del sitio.

## Cookies que usamos

### Estrictamente necesarias (no se pueden desactivar)

| Cookie | Propósito | Duración |
|---|---|---|
| \`sb-access-token\` | Sesión de autenticación Supabase | Sesión |
| \`sb-refresh-token\` | Refresh de sesión | 7 días |
| \`NEXT_LOCALE\` | Recordar idioma (EN / ES-AR / PT-BR) | 1 año |
| \`__Host-csrf\` | Protección CSRF en formularios | Sesión |

### Funcionales (opcionales)

| Cookie | Propósito | Duración |
|---|---|---|
| \`ph_*\` (PostHog) | Analítica anónima de producto | 1 año |
| \`_ym_*\` (Yandex Metrika) | Analítica anónima + grabación de sesión (Webvisor); se activan solo si aceptás | hasta 1 año |

No usamos cookies publicitarias. No compartimos cookies con terceros publicitarios.

## Cómo controlar

- En la configuración de tu navegador podés bloquear o eliminar cookies
- Podés desactivar PostHog en Configuración → Privacidad → Analítica → Desactivada
- Desactivar las cookies estrictamente necesarias rompe el login y funciones básicas

Consultas: hola@cryptoinvoicing.co
`;

export default cookies;
