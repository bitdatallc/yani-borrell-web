// Página de Términos y condiciones. En producción llega ya renderizada (scripts/prerender.mjs genera
// /terms-and-conditions/ y /en/terms-and-conditions/); en dev se rellena aquí (?lang=en para inglés).
import './style.css';
import { translations } from './i18n.js';
import { TERMS, termsListMarkup } from './terms-content.js';
import { track } from './analytics.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function render(lang) {
  const t = TERMS[lang];
  const common = translations[lang];
  document.documentElement.lang = lang;
  document.title = t.metaTitle;
  $$('[data-i18n]').forEach((el) => { const v = common[el.dataset.i18n]; if (v != null) el.textContent = v; });
  $('.terms__title').textContent = t.title;
  $('.terms__intro').textContent = t.intro;
  $('.terms__list').innerHTML = termsListMarkup(lang);
  $('.terms__outro').textContent = t.outro;
  $('.terms__back span').textContent = t.back;
  $$('.lang a').forEach((a) => a.toggleAttribute('aria-current', a.dataset.lang === lang));
  $('.lang').dataset.active = lang;
}

if (import.meta.env.DEV) {
  render(new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'es');
  $$('.lang a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); render(a.dataset.lang); }));
}
$$('.js-year').forEach((el) => { el.textContent = new Date().getFullYear(); });
window.addEventListener('scroll', () => $('.header').classList.toggle('is-scrolled', window.scrollY > 40), { passive: true });
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-track]');
  if (a) track('cta_click', { cta: a.dataset.track, lang: document.documentElement.lang, page: 'terms' });
});
