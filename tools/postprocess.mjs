// Ajustes sobre ./site tras el clonado (idempotente, se puede re-ejecutar).
// Uso: node tools/postprocess.mjs
//  1. Renombra ficheros con acentos Unicode descompuestos (NFD) a ASCII y actualiza referencias.
//  2. Sustituye el enlace de citas antiguo por el de SGC (tools/config.json).
//  3. Formulario de contacto (Contact Form 7 necesita PHP): lo intercepta y abre el
//     correo del visitante con el mensaje rellenado, sin tocar su aspecto.
//  4. Corrige el mailto roto ("...comsubject=Hola" sin "?").
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site');
const cfg = JSON.parse(await fs.readFile(path.join(ROOT, 'tools', 'config.json'), 'utf8'));

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p)); else out.push(p);
  }
  return out;
}

const toAscii = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

// 1. Ficheros con caracteres no ASCII
const renames = [];
for (const file of await walk(SITE)) {
  const base = path.basename(file);
  if (/^[\x20-\x7e]+$/.test(base)) continue;
  const ascii = toAscii(base);
  await fs.rename(file, path.join(path.dirname(file), ascii));
  renames.push([base, ascii]);
}

function replaceNames(text) {
  for (const [orig, ascii] of renames) {
    const nfd = orig.normalize('NFD');
    const variants = new Set([
      orig, nfd, orig.normalize('NFC'),
      encodeURI(nfd), encodeURI(orig.normalize('NFC')),
      nfd.replace(/[̀-ͯ]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')),
    ]);
    for (const v of variants) text = text.split(v).join(ascii);
  }
  return text;
}

// 3. Script del formulario de contacto
const FORM_SCRIPT = `<script id="static-contact-form">
document.addEventListener('submit', function (e) {
  var f = e.target;
  if (!f.classList || !f.classList.contains('wpcf7-form')) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  var v = function (n) { var el = f.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
  var out = f.querySelector('.wpcf7-response-output');
  if (!v('your-name') || !v('your-email') || !v('your-subject')) {
    if (out) { out.textContent = 'Please fill out all required fields.'; out.removeAttribute('aria-hidden'); out.style.display = 'block'; }
    return;
  }
  var body = 'Nombre: ' + v('your-name') + '\\nEmail: ' + v('your-email') + '\\n\\n' + v('your-message');
  window.location.href = 'mailto:${cfg.contactEmail}?subject=' + encodeURIComponent(v('your-subject')) + '&body=' + encodeURIComponent(body);
  if (out) { out.textContent = 'Se abrirá tu aplicación de correo para enviar el mensaje.'; out.removeAttribute('aria-hidden'); out.style.display = 'block'; }
}, true);
</script>
`;

let htmlCount = 0, bookingCount = 0;
for (const file of await walk(SITE)) {
  if (!/\.(html|css|js|json)$/i.test(file)) continue;
  let text = await fs.readFile(file, 'utf8');
  const before = text;
  if (renames.length) text = replaceNames(text);

  if (file.endsWith('.html')) {
    // 2. Enlace de citas (también variantes sin "#/" o con "&#038;")
    const n = text.split(cfg.oldBookingUrl).length - 1;
    bookingCount += n;
    text = text.split(cfg.oldBookingUrl).join(cfg.sgcBookingUrl);
    // Re-ejecución: actualiza un enlace SGC anterior si cambió en config
    text = text.replace(/https:\/\/[a-z0-9.-]+\/reservar\/[A-Za-z0-9_]+/g, cfg.sgcBookingUrl);

    // 3. Formulario: fuera el JS de CF7 (llama a /wp-json, que ya no existe); su CSS se queda
    text = text.replace(/<script[^>]*contact-form-7\/includes\/(?:swv\/)?js\/index\.js[^>]*><\/script>\s*/g, '');
    text = text.replace(/<script[^>]*id=["']contact-form-7-js-(?:before|translations|extra)["'][^>]*>[\s\S]*?<\/script>\s*/g, '');
    if (text.includes('wpcf7-form') && !text.includes('id="static-contact-form"')) {
      text = text.replace('</body>', FORM_SCRIPT + '</body>');
    }
    // 4. mailto roto
    if (cfg.fixMailtoLink) {
      text = text.replace(/mailto:[^"?]+?\.com(subject=)/g, `mailto:${cfg.contactEmail}?$1`);
    }
    htmlCount++;
  }
  if (text !== before) await fs.writeFile(file, text);
}

console.log(`renombrados: ${renames.length}, html: ${htmlCount}, enlaces de cita sustituidos: ${bookingCount}`);
if (cfg.sgcBookingUrl.includes('PENDIENTE')) console.log('AVISO: sgcBookingUrl aún es un marcador en tools/config.json');
