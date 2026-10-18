// Entrada principal, ligera a propósito: idioma, cabecera, menú, formulario y medición.
// Las animaciones (GSAP + Lenis, ~70 KB) se cargan aparte con import() cuando el navegador queda
// libre tras el primer pintado (motion.js); la entrada de la portada es CSS puro.
import './style.css';
import { translations } from './i18n.js';
import { servicesMarkup } from './svc-markup.js';
import { track } from './analytics.js';

const CONTACT_ENDPOINT = 'https://un4bc6qysdii4bvnm43nctzeti0eqhev.lambda-url.eu-west-1.on.aws/';
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEV = import.meta.env.DEV;
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
let motion = null; // API de motion.js cuando ya está cargado

/* -------------------------------------------------------------------- idioma
 * En producción el HTML llega traducido (scripts/prerender.mjs genera / y /en/) y cambiar de idioma
 * es navegar a la otra página. En dev la plantilla viene vacía: se rellena aquí (?lang=en). */
let currentLang = document.documentElement.lang === 'en' ? 'en' : 'es';

function applyLang(lang) {
  const t = translations[lang];
  document.documentElement.lang = lang;
  $$('[data-i18n]').forEach((el) => { const v = t[el.dataset.i18n]; if (v != null) el.textContent = v; });
  $$('[data-i18n-html]').forEach((el) => { const v = t[el.dataset.i18nHtml]; if (v != null) el.innerHTML = v; });
  $$('[data-i18n-attr]').forEach((el) => {
    const [attr, key] = el.dataset.i18nAttr.split(':');
    if (t[key] != null) el.setAttribute(attr, t[key]);
  });
  $$('.lang a').forEach((a) => a.toggleAttribute('aria-current', a.dataset.lang === lang));
  $('.lang').dataset.active = lang;
}

if (DEV) {
  const grid = $('.services__grid');
  if (grid && !grid.querySelector('.svc')) grid.innerHTML = servicesMarkup();
  currentLang = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'es';
  applyLang(currentLang);
} else if (new URLSearchParams(location.search).get('lang') === 'en' && currentLang === 'es') {
  location.replace('/en/' + location.hash); // enlaces antiguos con ?lang=en
}
try { localStorage.setItem('yb-lang', currentLang); } catch {}
$$('.js-year').forEach((el) => { el.textContent = new Date().getFullYear(); });

$$('.lang a').forEach((a) => {
  a.addEventListener('click', (e) => {
    const lang = a.dataset.lang;
    e.preventDefault();
    if (lang === currentLang) return;
    track('lang_switch', { to: lang });
    document.body.classList.add('is-leaving');
    setTimeout(() => {
      if (!DEV) { location.href = a.getAttribute('href') + location.hash; return; }
      currentLang = lang;
      motion?.beforeLangChange();
      applyLang(lang);
      motion?.afterLangChange();
      document.body.classList.remove('is-leaving');
    }, 250);
  });
});

/* ------------------------------------------------------- enlaces internos */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  const target = id.length > 1 && $(id);
  if (!target) return;
  e.preventDefault();
  closeMenu();
  const offset = id === '#inicio' ? 0 : -60;
  if (motion) motion.lenis.scrollTo(target, { offset, duration: 1.4 });
  else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + offset, behavior: REDUCED ? 'auto' : 'smooth' });
  if (id === '#main') target.focus({ preventScroll: true });
});

/* ------------------------------------------------------------------ cabecera */
const header = $('.header');
let lastY = window.scrollY;
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  header.classList.toggle('is-scrolled', y > 40);
  header.classList.toggle('is-hidden', y > lastY && y > 400 && !$('.mobile-menu').classList.contains('is-open'));
  lastY = y;
}, { passive: true });

// Enlace del menú activo según la sección visible
const navObserver = new IntersectionObserver((entries) => {
  entries.forEach((en) => $$(`.nav a[href="#${en.target.id}"]`).forEach((a) => a.classList.toggle('is-active', en.isIntersecting)));
}, { rootMargin: '-50% 0px -50% 0px' });
['servicios', 'proceso', 'sobre-mi', 'contacto'].forEach((id) => { const s = document.getElementById(id); if (s) navObserver.observe(s); });

/* ------------------------------------------------------------- menú móvil */
const burger = $('.burger');
const menu = $('.mobile-menu');
function closeMenu() {
  menu.classList.remove('is-open');
  burger.setAttribute('aria-expanded', 'false');
  motion?.lenis.start();
}
burger.addEventListener('click', () => {
  const open = !menu.classList.contains('is-open');
  menu.classList.toggle('is-open', open);
  burger.setAttribute('aria-expanded', String(open));
  if (open) motion?.lenis.stop(); else motion?.lenis.start();
});

/* ------------------------------------------------------- medición de clics */
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-track]');
  if (a) track('cta_click', { cta: a.dataset.track, lang: currentLang });
});

/* ----------------------------------------------------------- formulario */
const form = $('.form');
const statusEl = $('.form__status');
const loadedAt = Date.now();
function setStatus(kind, key) {
  statusEl.className = `form__status${kind ? ' is-' + kind : ''}`;
  statusEl.textContent = key ? translations[currentLang][key] : '';
}
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const t = translations[currentLang];
  $$('.field__tip', form).forEach((n) => n.remove());
  $$('.field', form).forEach((f) => f.classList.remove('is-invalid'));
  const val = (n) => form.elements[n].value.trim();
  const bad = [];
  ['name', 'email', 'subject'].forEach((n) => { if (!val(n)) bad.push([n, 'contact.required']); });
  if (val('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email'))) bad.push(['email', 'contact.badEmail']);
  if (bad.length) {
    bad.forEach(([n, key]) => {
      const field = form.elements[n].closest('.field');
      field.classList.add('is-invalid');
      field.insertAdjacentHTML('beforeend', `<span class="field__tip">${t[key]}</span>`);
    });
    form.classList.remove('is-shaking');
    void form.offsetWidth; // reinicia la animación
    form.classList.add('is-shaking');
    setStatus('invalid', 'contact.invalid');
    return;
  }
  const btn = $('button[type="submit"]', form);
  btn.disabled = true;
  setStatus('', 'contact.sending');
  try {
    const payload = { name: val('name'), email: val('email'), subject: val('subject'), message: val('message'), website: form.elements.website.value, loadedAt };
    if (DEV) {
      // En local no se envía correo real a Yani: se simula la respuesta
      console.info('[dev] formulario simulado', payload);
      await new Promise((r) => setTimeout(r, 900));
    } else {
      const res = await fetch(CONTACT_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    }
    form.reset();
    setStatus('sent', 'contact.sent');
    track('contact_form', { result: 'sent', lang: currentLang });
  } catch {
    setStatus('failed', 'contact.failed');
    track('contact_form', { result: 'failed', lang: currentLang });
  } finally {
    btn.disabled = false;
  }
});

/* ------------------------------------------- animaciones, tras el primer pintado */
if (!REDUCED) {
  const loadMotion = () => import('./motion.js').then(async (m) => {
    await document.fonts.ready; // las líneas de los títulos dependen de las fuentes
    motion = await m.initMotion();
  });
  const idle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 300));
  if (document.readyState === 'complete') idle(loadMotion);
  else window.addEventListener('load', () => idle(loadMotion), { once: true });
}
