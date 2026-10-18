# yani-borrell.com

Web de Yani Borrell (YB Consultancy), asesora de extranjería. Bilingüe ES/EN, estática, servida desde AWS Amplify (cuenta bitdatallc, app `d30vhebtdba9ns`, eu-west-1).

Sustituye al WordPress/Elementor que corría en Lightsail. La copia estática exacta de ese WordPress se usó como paso intermedio y se eliminó al publicar este diseño; sigue en el historial de git (commits anteriores a "Nuevo diseño en producción").

## Desarrollo
```
npm install
npm run dev      # http://localhost:5180  (?lang=en para inglés)
npm run build    # genera dist/
```

- Vite 6, JavaScript sin framework.
- GSAP 3 (ScrollTrigger, SplitText, MotionPath) para las animaciones y Lenis para el scroll suave.
- Textos en `src/i18n.js` (portada) y `src/terms.js` (términos). El idioma se elige con el selector, `?lang=` o el idioma del navegador, y se recuerda en localStorage.
- Respeta `prefers-reduced-motion`.

## Despliegue
```
pwsh ./deploy.ps1                    # producción: yani-borrell.com
pwsh ./deploy.ps1 -Branch propuesta  # rama de prueba: https://propuesta.d30vhebtdba9ns.amplifyapp.com
```
El script hace el build, aplica las reglas de redirección de las URLs del WordPress antiguo (`/about-me/`, `/services/`, `/contact/`, páginas de servicios…) a las secciones nuevas y sube `dist/`.

## Formulario de contacto
`contact-form/`: CloudFormation con Lambda (Function URL) + SES en la cuenta de bitdatallc, mismo patrón que `rubrica/lambda-contact-form`. Envía desde `notificaciones@bitdatallc.com` a `info@yani-borrell.com` (Zoho) con Reply-To del visitante. Anti-spam: honeypot + rechazo de envíos a <3 s de cargar.
- `pwsh ./contact-form/deploy.ps1 -Profile default [-ExtraOrigin https://...]` despliega/actualiza (el CORS va en la Function URL, no en el código).
- En `npm run dev` el envío se simula; en el build envía de verdad.

## Citas
Los botones "Agendar cita" llevan a la reserva pública de SGC: `https://sgc.bitdatallc.com/reservar/6aaa8ca371b598e5ea90eb47` (constante `BOOKING_URL` en `src/main.js` y `src/terms.js`).

## DNS
Zona Route 53 `Z077391127VV4H3ONMHKV`. Apex (alias A) y `www` (CNAME) → CloudFront de Amplify. El correo (Zoho), `citas.` y `meeting.` no dependen de esta web. `dns-backup/` guarda la zona anterior a la migración y el lote para volver a Lightsail.
