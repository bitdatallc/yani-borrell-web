# yani-borrell.com (estático)

Copia estática exacta del WordPress/Elementor que corría en Lightsail, servida desde AWS Amplify Hosting.

- `site/` — el sitio desplegable (HTML/CSS/JS/imágenes, rutas relativas a la raíz).
- `tools/mirror.mjs` — vuelve a clonar desde el WordPress original (solo mientras siga vivo).
- `tools/postprocess.mjs` — ajustes sobre `site/`: enlace de citas de SGC, formulario de contacto sin PHP, nombres de fichero ASCII, mailto corregido. Idempotente.
- `tools/config.json` — enlace de reserva de SGC y email de contacto.
- `tools/serve.mjs` — servidor local: `node tools/serve.mjs` → http://localhost:8765
- `deploy.ps1` — sube `site/` a Amplify (`pwsh ./deploy.ps1`).
- `contact-form/` — backend del formulario de contacto: CloudFormation con Lambda (Function URL) + SES en la cuenta de bitdatallc, mismo patrón que `rubrica/lambda-contact-form`. `pwsh ./contact-form/deploy.ps1 -Profile <admin-bitdatallc>` lo despliega y conecta la URL al sitio.

## Formulario de contacto
Envía desde `notificaciones@bitdatallc.com` (SES, ya en producción) a `info@yani-borrell.com` (buzón Zoho), con Reply-To del visitante. Anti-spam: honeypot + rechazo de envíos a <3s de cargar la página, como Rubrica. Concurrencia de la Lambda limitada a 5. El CORS se configura en la Function URL (no en el código: duplicarlo rompe el navegador).

## Cambiar el enlace de citas
Editar `sgcBookingUrl` en `tools/config.json`, `node tools/postprocess.mjs`, `pwsh ./deploy.ps1`.

## Cambios respecto al original
- Botones "Agendar cita": de `citas.yani-borrell.com` (Zoho Bookings) a la reserva pública de SGC.
- Formulario de contacto: Contact Form 7 necesita PHP; ahora envía a la Lambda de `contact-form/`. Mismo aspecto, mismos mensajes y estados (enviado / error / campos inválidos).
- Botón de email: el `mailto` original estaba roto (`info@yaniborrel.comsubject=Hola`); ahora `info@yani-borrell.com?subject=Hola`.
- Quitados endpoints de WordPress (xmlrpc, feeds, wp-json).

Verificado: las 11 páginas, en escritorio (1440px) y móvil (390px), son idénticas píxel a píxel al original.
