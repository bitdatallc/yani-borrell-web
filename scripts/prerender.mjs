// Tras `vite build`: genera el HTML final de cada página en español e inglés con todo el texto
// (sin depender de JavaScript), metadatos SEO, Open Graph, hreflang y datos estructurados (JSON-LD).
// También escribe sitemap.xml y robots.txt.
//   dist/index.html                       -> /                       (es)
//   dist/en/index.html                    -> /en/                    (en)
//   dist/terms-and-conditions/index.html  -> /terms-and-conditions/  (es)
//   dist/en/terms-and-conditions/...      -> /en/terms-and-conditions/ (en)
//   dist/privacy-policy/index.html        -> /privacy-policy/        (es)
//   dist/en/privacy-policy/index.html     -> /en/privacy-policy/     (en)
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import { translations } from '../src/i18n.js';
import { TERMS, termsListMarkup } from '../src/terms-content.js';
import { PRIVACY, privacyListMarkup } from '../src/privacy-content.js';
import { servicesMarkup, BOOKING_URL, SVC_IDS } from '../src/svc-markup.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://yani-borrell.com';
const OG_IMAGE = `${SITE}/img/og-image.jpg`;
const YEAR = String(new Date().getFullYear());
const TODAY = new Date().toISOString().slice(0, 10);
const SOCIAL = [
  'https://www.instagram.com/yani_borrell',
  'https://www.facebook.com/share/1JAjX3DapF/',
  'https://www.tiktok.com/@yani_borrell',
];

const LEGAL = { terms: TERMS, privacy: PRIVACY };
const LIST = { terms: termsListMarkup, privacy: privacyListMarkup };

const PAGES = [
  { kind: 'home', template: 'index.html', paths: { es: '/', en: '/en/' } },
  { kind: 'terms', template: 'terms-and-conditions/index.html', paths: { es: '/terms-and-conditions/', en: '/en/terms-and-conditions/' } },
  { kind: 'privacy', template: 'privacy-policy/index.html', paths: { es: '/privacy-policy/', en: '/en/privacy-policy/' } },
];

// La carpeta vive en OneDrive, que bloquea un momento los ficheros recién escritos (EBUSY): reintentar
async function writeFile(file, data) {
  for (let i = 0; ; i++) {
    try { return await fs.writeFile(file, data); } catch (e) {
      if (!['EBUSY', 'EPERM'].includes(e.code) || i >= 20) throw e;
      await new Promise((r) => setTimeout(r, 250));
    }
  }
}

// CSS dentro del HTML: el fichero aparte bloqueaba el primer pintado (~6 KB comprimido, se paga
// una vez por página y evita una petición en el camino crítico)
const cssCache = new Map();
async function inlineCss(document) {
  for (const link of [...document.querySelectorAll('link[rel="stylesheet"][href^="/assets/"]')]) {
    const href = link.getAttribute('href');
    if (!cssCache.has(href)) cssCache.set(href, await fs.readFile(path.join(DIST, href), 'utf8'));
    const style = document.createElement('style');
    style.textContent = cssCache.get(href);
    link.replaceWith(style);
  }
}

function fillI18n(document, t) {
  document.querySelectorAll('[data-i18n]').forEach((el) => { const v = t[el.getAttribute('data-i18n')]; if (v != null) el.textContent = v; });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => { const v = t[el.getAttribute('data-i18n-html')]; if (v != null) el.innerHTML = v; });
  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    const [attr, key] = el.getAttribute('data-i18n-attr').split(':');
    if (t[key] != null) el.setAttribute(attr, t[key]);
  });
}

function jsonLd(lang, page) {
  const t = translations[lang];
  const url = SITE + page.paths[lang];
  const business = {
    '@type': 'ProfessionalService',
    '@id': `${SITE}/#business`,
    name: 'YB Consultancy · Yani Borrell',
    alternateName: 'Yani Borrell',
    description: t['meta.description'],
    url: SITE + PAGES[0].paths[lang],
    logo: `${SITE}/img/logo-512.png`,
    image: OG_IMAGE,
    email: 'info@yani-borrell.com',
    telephone: '+34686520445',
    areaServed: { '@type': 'Country', name: lang === 'es' ? 'España' : 'Spain' },
    availableLanguage: ['es', 'en'],
    sameAs: SOCIAL,
    founder: { '@type': 'Person', name: 'Yani Borrell', jobTitle: t['hero.eyebrow'] },
    contactPoint: [
      { '@type': 'ContactPoint', telephone: '+34686520445', contactType: 'customer service', areaServed: 'ES', availableLanguage: ['es', 'en'] },
      { '@type': 'ContactPoint', telephone: '+17862378842', contactType: 'customer service', areaServed: 'US', availableLanguage: ['es', 'en'] },
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: t['services.kicker'],
      itemListElement: SVC_IDS.map((id) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: t[`svc.${id}.title`] } })),
    },
    potentialAction: {
      '@type': 'ReserveAction',
      name: t['nav.book'],
      target: { '@type': 'EntryPoint', urlTemplate: BOOKING_URL, actionPlatform: ['https://schema.org/DesktopWebPlatform', 'https://schema.org/MobileWebPlatform'] },
    },
  };
  const website = {
    '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: 'Yani Borrell',
    inLanguage: ['es', 'en'], publisher: { '@id': `${SITE}/#business` },
  };
  const webpage = {
    '@type': 'WebPage', '@id': `${url}#webpage`, url, inLanguage: lang,
    name: LEGAL[page.kind]?.[lang].metaTitle ?? t['meta.title'],
    isPartOf: { '@id': `${SITE}/#website` }, about: { '@id': `${SITE}/#business` },
  };
  return { '@context': 'https://schema.org', '@graph': page.kind === 'home' ? [business, website, webpage] : [webpage] };
}

function seoHead(document, lang, page, title, description) {
  const head = document.head;
  // Quita el comentario marcador
  [...head.childNodes].filter((n) => n.nodeType === 8).forEach((n) => n.remove());
  const add = (tag, attrs) => {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    head.appendChild(el);
  };
  const url = SITE + page.paths[lang];
  add('link', { rel: 'canonical', href: url });
  add('link', { rel: 'alternate', hreflang: 'es', href: SITE + page.paths.es });
  add('link', { rel: 'alternate', hreflang: 'en', href: SITE + page.paths.en });
  add('link', { rel: 'alternate', hreflang: 'x-default', href: SITE + page.paths.es });
  add('meta', { property: 'og:type', content: 'website' });
  add('meta', { property: 'og:site_name', content: 'Yani Borrell · YB Consultancy' });
  add('meta', { property: 'og:locale', content: lang === 'es' ? 'es_ES' : 'en_US' });
  add('meta', { property: 'og:locale:alternate', content: lang === 'es' ? 'en_US' : 'es_ES' });
  add('meta', { property: 'og:title', content: title });
  add('meta', { property: 'og:description', content: description });
  add('meta', { property: 'og:url', content: url });
  add('meta', { property: 'og:image', content: OG_IMAGE });
  add('meta', { property: 'og:image:width', content: '1200' });
  add('meta', { property: 'og:image:height', content: '630' });
  add('meta', { property: 'og:image:alt', content: translations[lang]['img.hero'] });
  add('meta', { name: 'twitter:card', content: 'summary_large_image' });
  add('meta', { name: 'twitter:title', content: title });
  add('meta', { name: 'twitter:description', content: description });
  add('meta', { name: 'twitter:image', content: OG_IMAGE });
  const ld = document.createElement('script');
  ld.setAttribute('type', 'application/ld+json');
  ld.textContent = JSON.stringify(jsonLd(lang, page));
  head.appendChild(ld);
}

async function renderPage(page, lang) {
  const html = await fs.readFile(path.join(DIST, page.template), 'utf8');
  const { document } = parseHTML(html);
  const t = translations[lang];
  document.documentElement.setAttribute('lang', lang);

  let title;
  let description;
  if (page.kind === 'home') {
    const grid = document.querySelector('.services__grid');
    grid.innerHTML = servicesMarkup();
    fillI18n(document, t);
    title = t['meta.title'];
    description = t['meta.description'];
  } else {
    fillI18n(document, t);
    const tt = LEGAL[page.kind][lang];
    document.querySelector('.terms__title').textContent = tt.title;
    document.querySelector('.terms__intro').textContent = tt.intro;
    document.querySelector('.terms__list').innerHTML = LIST[page.kind](lang);
    document.querySelector('.terms__outro').textContent = tt.outro;
    document.querySelector('.terms__back span').textContent = tt.back;
    title = tt.metaTitle;
    description = tt.metaDescription;
  }
  document.title = title;
  document.querySelector('meta[name="description"]').setAttribute('content', description);

  // Selector de idioma: enlaces reales entre las dos versiones de esta página
  document.querySelectorAll('.lang a').forEach((a) => {
    a.setAttribute('href', page.paths[a.getAttribute('data-lang')]);
    if (a.getAttribute('data-lang') === lang) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
  });
  document.querySelector('.lang')?.setAttribute('data-active', lang);
  if (lang === 'en') {
    document.querySelectorAll('.js-home').forEach((a) => a.setAttribute('href', '/en/'));
    document.querySelectorAll('.js-terms').forEach((a) => a.setAttribute('href', '/en/terms-and-conditions/'));
    document.querySelectorAll('.js-privacy').forEach((a) => a.setAttribute('href', '/en/privacy-policy/'));
    document.querySelectorAll('.lang, .nav').forEach((n) => n.setAttribute('aria-label', n.classList.contains('lang') ? 'Language / Idioma' : 'Main'));
  }
  document.querySelectorAll('.js-year').forEach((el) => { el.textContent = YEAR; });

  seoHead(document, lang, page, title, description);
  await inlineCss(document);

  const outFile = path.join(DIST, page.paths[lang], 'index.html');
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, '<!doctype html>\n' + document.documentElement.outerHTML);
  return page.paths[lang];
}

const written = [];
for (const page of PAGES) {
  // Se renderiza primero el inglés: el español sobrescribe la plantilla original
  written.push(await renderPage(page, 'en'));
  written.push(await renderPage(page, 'es'));
}

// Página 404 (no se traduce: es bilingüe); solo se le mete el CSS
{
  const file = path.join(DIST, '404.html');
  const { document } = parseHTML(await fs.readFile(file, 'utf8'));
  await inlineCss(document);
  await writeFile(file, '<!doctype html>\n' + document.documentElement.outerHTML);
}

const urls = PAGES.map((p) => `  <url>
    <loc>${SITE}${p.paths.es}</loc>
    <lastmod>${TODAY}</lastmod>
    <xhtml:link rel="alternate" hreflang="es" href="${SITE}${p.paths.es}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}${p.paths.en}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${p.paths.es}"/>
  </url>
  <url>
    <loc>${SITE}${p.paths.en}</loc>
    <lastmod>${TODAY}</lastmod>
    <xhtml:link rel="alternate" hreflang="es" href="${SITE}${p.paths.es}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}${p.paths.en}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${p.paths.es}"/>
  </url>`).join('\n');
await writeFile(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`);
await writeFile(path.join(DIST, 'robots.txt'), `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`);

console.log('prerender:', written.join('  '), '+ sitemap.xml + robots.txt');
