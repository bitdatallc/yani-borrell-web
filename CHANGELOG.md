# yani-borrell.com — Changelog

Registro de cambios de la web de Yani Borrell (YB Consultancy). Reconstruido a partir del historial de git; las entradas nuevas se añaden arriba.

**Cómo retomar**: leer este archivo y el `README.md` (desarrollo, despliegue, formulario, analítica, DNS y pendientes).

---

## Resumen del proyecto

| Tema | Decisión |
|---|---|
| Sitio | Web estática bilingüe ES/EN, sustituye al WordPress/Elementor que corría en Lightsail |
| Stack | Vite 6, JavaScript sin framework, GSAP + Lenis para animación (carga diferida) |
| Hosting | AWS Amplify, app `d2yiu4tmvihnwp` conectada a GitHub (`bitdatallc/yani-borrell-web`, rama `main`), eu-west-1, cuenta bitdatallc |
| Formulario | Lambda (Function URL) + SES, patrón `rubrica/lambda-contact-form` |
| Citas | Reserva pública de SGC (`BOOKING_URL` en `src/svc-markup.js`) |
| DNS | Route 53, zona `Z077391127VV4H3ONMHKV`; correo (Zoho) independiente de la web |

---

## 2026-10-19

### Política de privacidad y uso de datos (sin commit aún)
- Nueva página `/privacy-policy/` y `/en/privacy-policy/` (`privacy-policy/index.html`, `src/privacy-content.js`), con enlace en los pies de página y en el sitemap.
- Incluye cláusula de mensajería instantánea (WhatsApp y similares): inicio, comunicaciones de servicio, baja, proveedor de la app, documentos sensibles y terceros.
- `terms.js`, `prerender.mjs` y `terms-content.js` pasan a servir ambas páginas legales.
- Nueva app de Amplify `d2yiu4tmvihnwp` conectada a GitHub (`amplify.yml`); se le copiaron las 27 redirecciones y las cabeceras de seguridad/caché, y se le transfirió `yani-borrell.com` y `www`. Desde ahora: commit → push a `main` → Amplify construye y publica.
- La app anterior `d30vhebtdba9ns` queda sin dominio como respaldo (tiene una rama `staging` fallida sin uso).

## 2026-10-18

Todo el trabajo inicial se hizo en un solo día. De más reciente a más antiguo:

### Optimización (`fbabb5a`)
- HTML prerenderizado en ES y EN (`/` y `/en/`, más Términos), con `canonical`/`hreflang`, Open Graph, JSON-LD, `sitemap.xml` y `robots.txt`.
- Imágenes WebP por tamaño y fuentes alojadas en el propio sitio.
- Cabeceras de caché y seguridad (HSTS, CSP, etc.) configuradas desde `deploy.ps1`.
- Analítica RUM (`analytics/`) y página 404 propia bilingüe.

### Nuevo diseño en producción (`057cf4d`)
- El rediseño pasa a producción y se elimina la copia estática del WordPress. Sigue disponible en el historial de git, en los commits anteriores a este.

### Propuesta de rediseño (`5f960ff`, `545836f`, `76546da`)
- Rediseño bilingüe con Vite + GSAP + Lenis en `redesign/`.
- Nuevos teléfonos de contacto: +34 686 520 445, con WhatsApp para ES y EE. UU.
- Script de despliegue a rama de prueba, imágenes sin uso eliminadas y Términos con URL absoluta.

### Migración a Amplify y DNS (`56e9ac9` → `1da374f`)
- `56e9ac9`, `a6f1ee7`: copia estática de yani-borrell.com (WordPress) para Amplify; se evita convertir finales de línea en `site/`.
- `af6e4e6`: formulario de contacto vía Lambda + SES en vez de `mailto`.
- `22fb6b7`: enlace de citas SGC y endpoint del formulario conectados; desplegado en Amplify.
- `5c02e39`: permiso SES sobre el configuration set; backup del DNS y lotes de cutover/rollback en `dns-backup/`.
- `1da374f`: cutover DNS aplicado (fix `EvaluateTargetHealth` en `www`).

---

## Pendiente

- Dar de alta el sitio en Google Search Console y Bing Webmaster Tools (requiere la cuenta del propietario) y enviar `https://yani-borrell.com/sitemap.xml`.
