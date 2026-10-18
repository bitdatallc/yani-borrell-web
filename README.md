# yani-borrell.com

Web de Yani Borrell (YB Consultancy), asesora de extranjería. Bilingüe ES/EN, estática, servida desde AWS Amplify (cuenta bitdatallc, app `d30vhebtdba9ns`, eu-west-1).

Sustituye al WordPress/Elementor que corría en Lightsail. La copia estática exacta de ese WordPress se usó como paso intermedio y se eliminó al publicar este diseño; sigue en el historial de git (commits anteriores a "Nuevo diseño en producción").

## Desarrollo
```
npm install
npm run dev      # http://localhost:5180  (?lang=en para inglés)
npm run build    # vite build + scripts/prerender.mjs -> dist/
npm run images   # regenera public/img a partir de assets-src/img (solo si cambia un original)
```

- Vite 6, JavaScript sin framework.
- `index.html`, `terms-and-conditions/index.html` son **plantillas**: en el build, `scripts/prerender.mjs` genera `/` y `/terms-and-conditions/` (es) y `/en/`, `/en/terms-and-conditions/` (en) con todo el texto en el HTML, `canonical`/`hreflang`, Open Graph, JSON-LD (`ProfessionalService`), y además `sitemap.xml` y `robots.txt`. El CSS va dentro del HTML. En dev las plantillas se rellenan en el navegador.
- Textos: `src/i18n.js` (portada), `src/terms-content.js` (términos), tarjetas de servicios en `src/svc-markup.js`.
- `src/main.js` es ligero (idioma, cabecera, menú, formulario, medición). Las animaciones (GSAP: ScrollTrigger, SplitText, MotionPath + Lenis) están en `src/motion.js` y se cargan con `import()` cuando el navegador queda libre tras el primer pintado; la entrada de la portada es CSS puro. Respeta `prefers-reduced-motion`.
- Fuentes alojadas en `public/fonts` (Playfair Display, Poppins, Pinyon Script; subconjunto latino, OFL).
- Imágenes: originales en `assets-src/img`, versiones WebP por tamaño en `public/img` (`scripts/images.mjs`). `public/img/og-image.jpg` (1200×630) se captura de `scripts/og.html` con un navegador a 1200×630 servido por `npm run dev`.
- Página 404 propia (`404.html`, bilingüe).

## Despliegue
```
pwsh ./deploy.ps1                    # producción: yani-borrell.com
pwsh ./deploy.ps1 -Branch prueba     # rama de prueba: https://prueba.d30vhebtdba9ns.amplifyapp.com
```
El script hace el build y configura en la app de Amplify:
- Redirecciones 301 de las URLs del WordPress antiguo a las secciones nuevas y 404 propia.
- Cabeceras: caché de 1 año para `/assets/*` y `/fonts/*`, 30 días para `/img/*`; HSTS, `nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` y CSP. **Si se añade un servicio externo (script, fuente, API), ampliar la CSP en `deploy.ps1`.**

## Formulario de contacto
`contact-form/`: CloudFormation con Lambda (Function URL) + SES en la cuenta de bitdatallc, mismo patrón que `rubrica/lambda-contact-form`. Envía desde `notificaciones@bitdatallc.com` a `info@yani-borrell.com` (Zoho) con Reply-To del visitante. Anti-spam: honeypot + rechazo de envíos a <3 s de cargar.
- `pwsh ./contact-form/deploy.ps1 -Profile default [-ExtraOrigin https://...]` despliega/actualiza (el CORS va en la Function URL, no en el código).
- En `npm run dev` el envío se simula; en el build envía de verdad.

## Analítica (sin cookies)
`analytics/`: CloudFormation con Amazon CloudWatch RUM + identidad Cognito de invitado. `allowCookies: false`, no requiere banner. Registra páginas vistas, rendimiento real, errores JS y eventos `yb.cta_click` (`book`, `whatsapp-es`, `whatsapp-us`, `phone`, `email`), `yb.contact_form`, `yb.lang_switch`, `yb.not_found`. Solo acepta datos de `yani-borrell.com` y `www`.
- Ver datos: consola de AWS → CloudWatch → Application Signals → RUM → `yani-borrell-web` (eu-west-1).
- `pwsh ./analytics/deploy.ps1` despliega y escribe los ids en `src/analytics.js`.

## Citas
Los botones "Agendar cita" llevan a la reserva pública de SGC: `https://sgc.bitdatallc.com/reservar/6aaa8ca371b598e5ea90eb47` (`BOOKING_URL` en `src/svc-markup.js`; también escrito en las plantillas HTML).

## DNS
Zona Route 53 `Z077391127VV4H3ONMHKV`. Apex (alias A) y `www` (CNAME) → CloudFront de Amplify. El correo (Zoho), `citas.` y `meeting.` no dependen de esta web. `dns-backup/` guarda la zona anterior a la migración y el lote para volver a Lightsail.

## Pendiente manual
Dar de alta el sitio en Google Search Console y Bing Webmaster Tools (requiere la cuenta de Google/Microsoft del propietario) y enviar `https://yani-borrell.com/sitemap.xml`.
