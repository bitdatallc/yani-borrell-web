// Clona yani-borrell.com (WordPress + Elementor) a HTML estático en ./site
// Uso: node tools/mirror.mjs
// Descarga cada página, todos los assets de wp-content / wp-includes referenciados
// desde HTML y CSS (url(), srcset, JSON escapado), y reescribe las URLs absolutas
// a rutas relativas a la raíz para que el sitio funcione en cualquier dominio.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://yani-borrell.com';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'site');

// Páginas publicadas (sample-page se omite: es la de ejemplo de WP y nada la enlaza)
const PAGES = [
  '', 'about-me', 'services', 'contact', 'terms-and-conditions',
  'asesoria-migratoria', 'traducciones-y-apostillas', 'preparacion-de-documentos',
  'homologacion-de-estudios', 'elementor-page-313', 'elementor-page-294',
];

const seen = new Set();
const queue = [];
const failed = [];

const ASSET_RE = /(?:https?:)?(?:\\?\/){2}(?:www\.)?yani-borrell\.com((?:\\?\/)(?:wp-content|wp-includes)(?:\\?\/)[^"'()\s<>\\]*(?:\\\/[^"'()\s<>\\]*)*)/g;

function normalizeAssetPath(p) {
  let clean = p.replace(/\\\//g, '/').replace(/&#0?38;|&amp;/g, '&');
  clean = clean.split('#')[0].split('?')[0];
  try { clean = decodeURI(clean); } catch {}
  return clean;
}

function enqueue(assetPath) {
  if (!assetPath || seen.has(assetPath)) return;
  if (!/^\/(wp-content|wp-includes)\//.test(assetPath)) return;
  // Solo ficheros: las rutas base de directorio (config de Elementor/WP) no se descargan
  if (!/\/[^/]+\.[a-z0-9]{1,5}$/i.test(assetPath)) return;
  seen.add(assetPath);
  queue.push(assetPath);
}

function collectFromText(text) {
  for (const m of text.matchAll(ASSET_RE)) enqueue(normalizeAssetPath(m[1]));
  // Rutas relativas a la raíz ya presentes (p.ej. "/wp-content/...")
  for (const m of text.matchAll(/["'(\s,](\/(?:wp-content|wp-includes)\/[^"'()\s<>]+)/g)) {
    enqueue(normalizeAssetPath(m[1]));
  }
}

function collectFromCss(css, cssPath) {
  const dir = path.posix.dirname(cssPath);
  for (const m of css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) {
    const ref = m[2].trim();
    if (/^(data:|https?:|\/\/|#)/.test(ref) && !ref.includes('yani-borrell.com')) continue;
    if (ref.includes('yani-borrell.com')) { collectFromText(ref); continue; }
    const resolved = ref.startsWith('/') ? ref : path.posix.normalize(path.posix.join(dir, ref));
    enqueue(normalizeAssetPath(resolved));
  }
  for (const m of css.matchAll(/@import\s+(?:url\()?['"]([^'"]+)['"]/g)) {
    const ref = m[1];
    if (/^https?:/.test(ref) && !ref.includes('yani-borrell.com')) continue;
    const resolved = ref.startsWith('/') ? ref : path.posix.normalize(path.posix.join(dir, ref));
    enqueue(normalizeAssetPath(resolved.replace(/^https?:\/\/(www\.)?yani-borrell\.com/, '')));
  }
}

async function fetchBuf(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (static-mirror)' } });
      if (!res.ok) return { status: res.status };
      return { status: res.status, buf: Buffer.from(await res.arrayBuffer()) };
    } catch (e) {
      if (attempt === 3) return { status: 0, error: e.message };
    }
  }
}

function rewriteHtml(html) {
  return html
    // Quita metadatos/endpoints de WordPress que no existen en estático
    .replace(/<link[^>]+rel=["'](?:https:\/\/api\.w\.org\/|EditURI|alternate|shortlink|pingback|profile)["'][^>]*>\s*/gi, (tag) =>
      /hreflang/i.test(tag) ? tag : '')
    .replace(/<link[^>]+(?:xmlrpc\.php|wp-json|\/feed\/)[^>]*>\s*/gi, '')
    .replace(/<meta name=["']generator["'][^>]*>\s*/gi, '')
    // URLs absolutas -> relativas a la raíz (normal y escapada en JSON)
    .replace(/https?:\/\/(?:www\.)?yani-borrell\.com(?=\/|["'])/g, '')
    .replace(/https?:\\\/\\\/(?:www\.)?yani-borrell\.com/g, '')
    // href="" que quedaron del enlace a la home
    .replace(/href=(["'])\1/g, 'href="/"');
}

async function savePage(slug) {
  const url = `${ORIGIN}/${slug ? slug + '/' : ''}`;
  const { status, buf } = await fetchBuf(url);
  if (!buf) { failed.push(`${url} (${status})`); return; }
  const html = buf.toString('utf8');
  collectFromText(html);
  const file = path.join(OUT, slug, 'index.html');
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, rewriteHtml(html));
  console.log('page', slug || '/');
}

async function saveAsset(assetPath) {
  const url = ORIGIN + encodeURI(assetPath);
  const { status, buf } = await fetchBuf(url);
  if (!buf) { failed.push(`${assetPath} (${status})`); return; }
  const file = path.join(OUT, ...assetPath.split('/').filter(Boolean));
  await fs.mkdir(path.dirname(file), { recursive: true });
  if (/\.css$/i.test(assetPath)) {
    const css = buf.toString('utf8');
    collectFromCss(css, assetPath);
    await fs.writeFile(file, css.replace(/https?:\/\/(?:www\.)?yani-borrell\.com\//g, '/'));
  } else if (/\.js$/i.test(assetPath)) {
    const js = buf.toString('utf8');
    collectFromText(js);
    await fs.writeFile(file, buf);
  } else {
    await fs.writeFile(file, buf);
  }
}

async function main() {
  // Extra assets descubiertos en navegador real (chunks lazy de Elementor, etc.)
  try {
    const extra = JSON.parse(await fs.readFile(path.join(ROOT, 'tools', 'extra-assets.json'), 'utf8'));
    extra.forEach((p) => enqueue(normalizeAssetPath(p)));
  } catch {}

  for (const slug of PAGES) await savePage(slug);

  const CONCURRENCY = 8;
  let done = 0;
  async function worker() {
    while (queue.length) {
      const p = queue.shift();
      await saveAsset(p);
      if (++done % 50 === 0) console.log(`assets ${done}/${seen.size}`);
    }
  }
  // El trabajo puede crecer mientras se procesa (CSS/JS descubren más), por eso se repite
  while (queue.length) await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\n${PAGES.length} páginas, ${seen.size} assets, ${failed.length} fallos`);
  if (failed.length) console.log('Fallos:\n  ' + failed.join('\n  '));
}

main();
