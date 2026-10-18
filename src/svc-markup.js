// Marcado de las 6 tarjetas de servicio. Lo usan scripts/prerender.mjs (HTML final) y main.js (solo en dev).
// Textos: claves svc.<id>.title / .1 / .2 / .3 de i18n.js. Imágenes: public/img/svc-<id>-{400,768}.webp
export const BOOKING_URL = 'https://sgc.bitdatallc.com/reservar/6aaa8ca371b598e5ea90eb47';
export const SVC_IDS = ['asesoria', 'residencias', 'nacionalidad', 'homologacion', 'traducciones', 'documentos'];

export function servicesMarkup() {
  return SVC_IDS.map((id, i) => `
          <article class="svc">
            <div class="svc__media">
              <span class="svc__num">${String(i + 1).padStart(2, '0')}</span>
              <img src="/img/svc-${id}-768.webp" srcset="/img/svc-${id}-400.webp 400w, /img/svc-${id}-768.webp 768w" sizes="(max-width: 600px) 92vw, (max-width: 1080px) 46vw, 360px" width="768" height="512" loading="lazy" decoding="async" alt="" />
            </div>
            <div class="svc__body">
              <h3 data-i18n="svc.${id}.title"></h3>
              <ul><li data-i18n="svc.${id}.1"></li><li data-i18n="svc.${id}.2"></li><li data-i18n="svc.${id}.3"></li></ul>
              <a class="svc__link" href="${BOOKING_URL}" target="_blank" rel="noopener" data-track="book">
                <span data-i18n="services.book"></span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </a>
            </div>
          </article>`).join('');
}
