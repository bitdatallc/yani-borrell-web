// Ajustes sobre ./site tras el clonado (idempotente, se puede re-ejecutar).
// Uso: node tools/postprocess.mjs
//  1. Renombra ficheros con acentos Unicode descompuestos (NFD) a ASCII y actualiza referencias.
//  2. Sustituye el enlace de citas antiguo por el de SGC (tools/config.json).
//  3. Formulario de contacto (Contact Form 7 necesita PHP): lo envía a la Lambda de
//     contact-form/ (SES), sin tocar su aspecto.
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

// 3. Script del formulario de contacto: POST a la Lambda (contact-form/), mismo patrón que el
// landing de Rubrica. Reproduce los estados visuales y mensajes de Contact Form 7 (sus clases
// init/submitting/sent/failed/invalid ya tienen estilo en su CSS, que se conserva).
const FORM_SCRIPT = `<script id="static-contact-form">
(function () {
  var ENDPOINT = ${JSON.stringify(cfg.contactFormUrl)};
  var loadedAt = Date.now(); // la Lambda descarta envíos a <3s de cargar (anti-bot)
  var MSG = {
    sent: 'Thank you for your message. It has been sent.',
    failed: 'There was an error trying to send your message. Please try again later.',
    invalid: 'One or more fields have an error. Please check and try again.',
    required: 'Please fill out this field.',
    email: 'Please enter an email address.'
  };
  var REQUIRED = ['your-name', 'your-email', 'your-subject'];

  document.querySelectorAll('form.wpcf7-form').forEach(function (f) {
    // Honeypot: campo invisible que un humano nunca rellena
    var hp = document.createElement('input');
    hp.type = 'text'; hp.name = 'website'; hp.tabIndex = -1; hp.autocomplete = 'off';
    hp.setAttribute('aria-hidden', 'true');
    hp.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0';
    f.appendChild(hp);
  });

  function setState(f, state, text) {
    f.classList.remove('init', 'submitting', 'sent', 'failed', 'invalid');
    f.classList.add(state);
    f.setAttribute('data-status', state);
    var out = f.querySelector('.wpcf7-response-output');
    if (out) { out.textContent = text || ''; out.setAttribute('aria-hidden', text ? 'false' : 'true'); }
  }

  function clearTips(f) {
    f.querySelectorAll('.wpcf7-not-valid-tip').forEach(function (t) { t.remove(); });
    f.querySelectorAll('.wpcf7-not-valid').forEach(function (el) {
      el.classList.remove('wpcf7-not-valid'); el.setAttribute('aria-invalid', 'false');
    });
  }

  function markInvalid(el, text) {
    el.classList.add('wpcf7-not-valid'); el.setAttribute('aria-invalid', 'true');
    var tip = document.createElement('span');
    tip.className = 'wpcf7-not-valid-tip'; tip.setAttribute('aria-hidden', 'true'); tip.textContent = text;
    el.parentNode.appendChild(tip);
  }

  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f.classList || !f.classList.contains('wpcf7-form')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (f.classList.contains('submitting')) return;

    var field = function (n) { return f.querySelector('[name="' + n + '"]'); };
    var val = function (n) { var el = field(n); return el ? el.value.trim() : ''; };

    clearTips(f);
    var ok = true;
    REQUIRED.forEach(function (n) { if (!val(n)) { markInvalid(field(n), MSG.required); ok = false; } });
    if (val('your-email') && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(val('your-email'))) {
      markInvalid(field('your-email'), MSG.email); ok = false;
    }
    if (!ok) { setState(f, 'invalid', MSG.invalid); return; }

    var btn = f.querySelector('.wpcf7-submit');
    if (btn) btn.disabled = true;
    setState(f, 'submitting', '');

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: val('your-name'), email: val('your-email'), subject: val('your-subject'),
        message: val('your-message'), website: val('website'), loadedAt: loadedAt
      })
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      f.reset();
      setState(f, 'sent', MSG.sent);
    }).catch(function () {
      setState(f, 'failed', MSG.failed);
    }).then(function () {
      if (btn) btn.disabled = false;
    });
  }, true);
})();
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
    // Se reinyecta siempre (la URL del endpoint puede cambiar en config)
    text = text.replace(/<script id="static-contact-form">[\s\S]*?<\/script>\n?/, '');
    if (text.includes('wpcf7-form')) {
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
