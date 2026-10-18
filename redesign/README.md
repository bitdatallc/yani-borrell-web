# Propuesta de rediseño — yani-borrell.com

Propuesta nueva sobre la identidad actual (dorado/bronce, marfil, marino; Playfair Display + Poppins + script), bilingüe ES/EN. **No está publicada**: la web en producción sigue siendo la copia estática de `../site/`.

## Desarrollo
```
npm install
npm run dev      # http://localhost:5180  (?lang=en para inglés)
npm run build    # genera dist/
```

## Stack
- Vite 6, JavaScript sin framework.
- GSAP 3 (ScrollTrigger, SplitText, MotionPath) para las animaciones y Lenis para el scroll suave.
- Textos en `src/i18n.js`; el idioma se elige con el selector, `?lang=` o el idioma del navegador, y se recuerda en localStorage.
- Respeta `prefers-reduced-motion` (sin animaciones ni pantalla de carga).

## Formulario
Usa la misma Lambda + SES que la web actual (`../contact-form/`). En `npm run dev` el envío se **simula** para no mandar correos reales a Yani; en el build envía de verdad. Para publicar este diseño en otro dominio hay que añadir ese origen al CORS (`pwsh ../contact-form/deploy.ps1 -Profile default -ExtraOrigin https://...`).

## Textos
Salen del sitio actual, salvo las listas de **Residencias y visados**, **Traducciones y apostillas** y **Preparación de documentos**, que son propuesta: en el sitio actual esas páginas no tienen texto (o tienen "lorem ipsum"). Conviene que Yani las revise.
