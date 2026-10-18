import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import Lenis from 'lenis';
import { translations } from './i18n.js';

gsap.registerPlugin(ScrollTrigger, SplitText, MotionPathPlugin);

const BOOKING_URL = 'https://sgc.bitdatallc.com/reservar/6aaa8ca371b598e5ea90eb47';
const CONTACT_ENDPOINT = 'https://un4bc6qysdii4bvnm43nctzeti0eqhev.lambda-url.eu-west-1.on.aws/';
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

if (REDUCED) document.documentElement.classList.add('reduced');

/* ---------------------------------------------------------------- servicios */
const SVC_IDS = ['asesoria', 'residencias', 'nacionalidad', 'homologacion', 'traducciones', 'documentos'];
$$('.svc').forEach((card, i) => {
  const id = card.dataset.svc;
  card.innerHTML = `
    <div class="svc__media">
      <span class="svc__num">${String(i + 1).padStart(2, '0')}</span>
      <img src="/img/svc-${id}.webp" alt="" loading="lazy" />
    </div>
    <div class="svc__body">
      <h3 data-i18n="svc.${id}.title"></h3>
      <ul><li data-i18n="svc.${id}.1"></li><li data-i18n="svc.${id}.2"></li><li data-i18n="svc.${id}.3"></li></ul>
      <a class="svc__link js-book" href="#" target="_blank" rel="noopener">
        <span data-i18n="services.book"></span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </a>
    </div>`;
});
console.assert(SVC_IDS.length === $$('.svc').length);

$$('.js-book').forEach((a) => { a.href = BOOKING_URL; });
$$('.js-year').forEach((el) => { el.textContent = new Date().getFullYear(); });

/* -------------------------------------------------------------------- i18n */
const splits = new Map(); // elemento -> { split, revealed }
const wordBlocks = [];

function pickInitialLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'es' || q === 'en') return q;
  try { const s = localStorage.getItem('yb-lang'); if (s === 'es' || s === 'en') return s; } catch {}
  return (navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en';
}

function applyLang(lang) {
  const t = translations[lang];
  document.documentElement.lang = lang;
  $$('[data-i18n]').forEach((el) => { const v = t[el.dataset.i18n]; if (v != null) el.textContent = v; });
  $$('[data-i18n-html]').forEach((el) => { const v = t[el.dataset.i18nHtml]; if (v != null) el.innerHTML = v; });
  $$('[data-i18n-attr]').forEach((el) => {
    const [attr, key] = el.dataset.i18nAttr.split(':');
    if (t[key] != null) el.setAttribute(attr, t[key]);
  });
  $$('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  $('.lang').dataset.active = lang;
  try { localStorage.setItem('yb-lang', lang); } catch {}
}

/* ------------------------------------------------------- split de títulos */
function splitHeading(el) {
  const state = splits.get(el) || { revealed: REDUCED };
  state.split?.revert();
  state.split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
  if (!state.revealed) gsap.set(state.split.lines, { yPercent: 115 });
  splits.set(el, state);
  return state;
}

function revealHeading(el, delay = 0) {
  const state = splits.get(el);
  if (!state || state.revealed) return;
  state.revealed = true;
  gsap.to(state.split.lines, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1, delay });
}

function splitWords(el) {
  el.innerHTML = el.textContent.split(/(\s+)/).map((w) => (/^\s+$/.test(w) ? w : `<span class="w">${w}</span>`)).join('');
}

// Al cambiar de idioma: revertir los splits (si no, revert() restauraría el texto viejo),
// traducir y volver a partir.
function revertSplits() {
  splits.forEach((st) => { st.split?.revert(); st.split = null; });
}
function resplitAll() {
  $$('.js-split').forEach(splitHeading);
  wordBlocks.forEach(({ el }) => splitWords(el));
}

/* ------------------------------------------------------------- scroll suave */
let lenis = null;
if (!REDUCED) {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = $(id);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(target, { offset: id === '#inicio' ? 0 : -60, duration: 1.4 });
    else target.scrollIntoView();
  });
});

/* ------------------------------------------------------------------ header */
const header = $('.header');
let lastY = 0;
function onScroll(y) {
  header.classList.toggle('is-scrolled', y > 40);
  const goingDown = y > lastY;
  header.classList.toggle('is-hidden', goingDown && y > 400 && !$('.mobile-menu').classList.contains('is-open'));
  lastY = y;
}
if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });

// Enlace activo según la sección visible
['#servicios', '#proceso', '#sobre-mi', '#contacto'].forEach((id) => {
  ScrollTrigger.create({
    trigger: id, start: 'top 50%', end: 'bottom 50%',
    onToggle: ({ isActive }) => $$(`.nav a[href="${id}"]`).forEach((a) => a.classList.toggle('is-active', isActive)),
  });
});

/* ------------------------------------------------------------- menú móvil */
const burger = $('.burger');
const menu = $('.mobile-menu');
function closeMenu() {
  menu.classList.remove('is-open');
  burger.setAttribute('aria-expanded', 'false');
  lenis?.start();
}
burger.addEventListener('click', () => {
  const open = !menu.classList.contains('is-open');
  menu.classList.toggle('is-open', open);
  burger.setAttribute('aria-expanded', String(open));
  if (open) {
    lenis?.stop();
    gsap.fromTo($$('a', menu), { y: 30, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.07, duration: 0.7, ease: 'expo.out', delay: 0.2 });
  } else lenis?.start();
});

/* ---------------------------------------------------------- cambio idioma */
let currentLang = pickInitialLang();
applyLang(currentLang);

$$('.lang button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const lang = btn.dataset.lang;
    if (lang === currentLang) return;
    currentLang = lang;
    const targets = $$('main, .nav, .footer, .mobile-menu a, .header__actions .btn');
    gsap.to(targets, {
      opacity: 0, y: 6, duration: 0.25, ease: 'power2.in',
      onComplete: () => {
        revertSplits();
        applyLang(lang);
        if (!REDUCED) resplitAll();
        ScrollTrigger.refresh();
        gsap.to(targets, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', clearProps: 'transform' });
      },
    });
  });
});

/* ------------------------------------------------------------- animaciones */
function initAnimations() {
  // Títulos partidos en líneas: suben al entrar en pantalla
  $$('.js-split').forEach((el) => {
    splitHeading(el);
    if (el.classList.contains('hero__title')) return; // el hero lo anima la intro
    ScrollTrigger.create({ trigger: el, start: 'top 86%', once: true, onEnter: () => revealHeading(el) });
  });

  // Bloques genéricos
  gsap.utils.toArray('.reveal').forEach((el) => {
    gsap.from(el, { y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });

  // HERO: parallax con el ratón + salida con scroll
  const hero = $('.hero');
  if (window.matchMedia('(pointer: fine)').matches) {
    const layers = [
      [$('.hero__arch'), 14], [$('.hero__orbit'), -10],
      [$('.chip--1'), 26], [$('.chip--2'), -22], [$('.chip--3'), 18],
    ].map(([el, depth]) => ({ x: gsap.quickTo(el, 'x', { duration: 1, ease: 'power3' }), y: gsap.quickTo(el, 'y', { duration: 1, ease: 'power3' }), depth }));
    hero.addEventListener('mousemove', (e) => {
      const r = hero.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      layers.forEach((l) => { l.x(nx * l.depth); l.y(ny * l.depth); });
    });
  }
  gsap.to('.hero__img', { scale: 1.12, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__copy', { yPercent: -18, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });

  // Órbita: avión recorriendo el círculo + trazo punteado que fluye
  gsap.to('.orbit-plane', {
    duration: 22, repeat: -1, ease: 'none',
    motionPath: { path: '#orbitPath', align: '#orbitPath', alignOrigin: [0.5, 0.5], autoRotate: true },
  });
  gsap.to('.orbit-dash', { strokeDashoffset: -220, duration: 8, repeat: -1, ease: 'none' });
  gsap.to('.chip--1', { y: '-=10', duration: 2.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to('.chip--2', { y: '+=12', duration: 3.1, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to('.chip--3', { y: '-=8', duration: 2.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to('.hero__glow--a', { x: 80, y: 40, duration: 9, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to('.hero__glow--b', { x: -70, y: -30, duration: 11, yoyo: true, repeat: -1, ease: 'sine.inOut' });

  // Marquesina infinita; acelera con la velocidad del scroll
  const marquee = gsap.to('.marquee__track', { xPercent: -25, duration: 28, ease: 'none', repeat: -1 });
  if (lenis) {
    lenis.on('scroll', ({ velocity }) => {
      gsap.to(marquee, { timeScale: 1 + Math.min(Math.abs(velocity) / 6, 4), duration: 0.3, overwrite: true });
      gsap.to(marquee, { timeScale: 1, duration: 1.2, delay: 0.3, ease: 'power2.out' });
    });
  }

  // Pilares: tarjetas en cascada + iconos que se dibujan
  gsap.from('.pillar', { y: 70, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: '.pillars__grid', start: 'top 82%', once: true } });
  $$('.pillar__icon').forEach((svg) => {
    const parts = $$('path, circle, rect', svg);
    parts.forEach((p) => { const len = p.getTotalLength(); gsap.set(p, { strokeDasharray: len, strokeDashoffset: len }); });
    gsap.to(parts, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', stagger: 0.08, scrollTrigger: { trigger: svg, start: 'top 85%', once: true } });
  });

  // Servicios: entrada en lotes + inclinación 3D al pasar el ratón
  gsap.set('.svc', { y: 80, opacity: 0 });
  ScrollTrigger.batch('.svc', {
    start: 'top 88%', once: true,
    onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.12 }),
  });
  if (window.matchMedia('(pointer: fine)').matches) {
    $$('.svc').forEach((card) => {
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' });
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' });
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 8);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 8);
      });
      card.addEventListener('mouseleave', () => { rx(0); ry(0); });
    });
  }

  // Proceso: en escritorio se fija y la línea avanza con el scroll; en móvil, línea vertical
  const steps = $$('.step');
  const activate = (progress) => steps.forEach((s, i) => s.classList.toggle('is-active', progress >= i / steps.length + 0.02));
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    gsap.to('.process__fill', {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: '.process', start: 'top top', end: '+=140%', pin: '.process__pin', scrub: 0.6, onUpdate: (st) => activate(st.progress) },
    });
  });
  mm.add('(max-width: 900px)', () => {
    gsap.to('.process__fill', {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: '.process__track', start: 'top 70%', end: 'bottom 60%', scrub: 0.6, onUpdate: (st) => activate(st.progress) },
    });
  });

  // Sobre mí: parallax de la foto, sello girando y ruta de países
  gsap.fromTo('.about__img', { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.about__frame', { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '.about__frame', start: 'top 80%', once: true } });
  gsap.to('.about__seal', { rotation: 200, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true } });

  const jp = $('.journey__path');
  const jlen = jp.getTotalLength();
  gsap.set(jp, { strokeDasharray: jlen, strokeDashoffset: jlen });
  const jt = gsap.timeline({ scrollTrigger: { trigger: '.journey', start: 'top 80%', end: 'bottom 45%', scrub: 0.8 } });
  jt.to(jp, { strokeDashoffset: 0, ease: 'none' }, 0)
    .to('.journey__plane', { ease: 'none', motionPath: { path: '#journeyPath', align: '#journeyPath', alignOrigin: [0.5, 0.5], autoRotate: true } }, 0);
  gsap.from('.journey__stops li', { scale: 0, opacity: 0, duration: 0.8, ease: 'back.out(2)', stagger: 0.18, scrollTrigger: { trigger: '.journey', start: 'top 80%', once: true } });

  // Fe: valores en cascada + versículo palabra a palabra con el scroll
  gsap.from('.faith li', { x: -40, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.faith ul', start: 'top 80%', once: true } });
  $$('.js-words').forEach((el) => {
    splitWords(el);
    wordBlocks.push({ el });
    ScrollTrigger.create({
      trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true,
      onUpdate: (st) => {
        const words = $$('.w', el);
        const lit = Math.round(st.progress * words.length);
        words.forEach((w, i) => { w.style.opacity = i < lit ? 1 : 0.14; });
      },
    });
  });

  // CTA: botones magnéticos
  if (window.matchMedia('(pointer: fine)').matches) {
    $$('.magnetic').forEach((btn) => {
      const x = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3' });
      const y = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3' });
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * 0.25);
        y((e.clientY - r.top - r.height / 2) * 0.35);
      });
      btn.addEventListener('mouseleave', () => { x(0); y(0); });
    });
  }

  // Re-partir líneas si cambia el ancho (las líneas dependen del layout)
  let lastW = window.innerWidth;
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      $$('.js-split').forEach(splitHeading);
      ScrollTrigger.refresh();
    }, 250);
  });
}

/* ------------------------------------------------------------ intro / loader */
function intro() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.to('.loader__ring circle', { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut' })
    .to('.loader__mark img', { opacity: 1, scale: 1, duration: 1 }, 0.2)
    .to('.loader', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '+=0.15')
    .add(() => document.body.classList.remove('is-loading'), '<0.4')
    .fromTo('.header', { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, clearProps: 'transform,opacity' }, '<0.5')
    .from('.hero__eyebrow', { y: 20, opacity: 0, duration: 1 }, '<')
    .add(() => revealHeading($('.hero__title')), '<0.1')
    .from('.hero__script', { opacity: 0, x: -20, duration: 1.4 }, '<0.5')
    .from('.hero__lead, .hero__ctas', { y: 24, opacity: 0, duration: 1.1, stagger: 0.1 }, '<0.1')
    .fromTo('.hero__arch', { clipPath: 'inset(100% 0 0 0 round 999px 999px 24px 24px)' }, { clipPath: 'inset(0% 0 0 0 round 999px 999px 24px 24px)', duration: 1.6, ease: 'expo.inOut' }, 1.6)
    .from('.hero__img', { scale: 1.25, duration: 2.2 }, '<')
    .from('.orbit-ring', { opacity: 0, scale: 0.85, svgOrigin: '300 300', duration: 2 }, '<0.2')
    .from('.chip', { scale: 0.6, opacity: 0, duration: 0.9, stagger: 0.15, ease: 'back.out(1.8)' }, '<0.6')
    .from('.hero__scroll', { opacity: 0, duration: 1 }, '<0.4');
}

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
    gsap.fromTo(form, { x: -8 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, .3)' });
    setStatus('invalid', 'contact.invalid');
    return;
  }
  const btn = $('button[type="submit"]', form);
  btn.disabled = true;
  setStatus('', 'contact.sending');
  try {
    const payload = { name: val('name'), email: val('email'), subject: val('subject'), message: val('message'), website: form.elements.website.value, loadedAt };
    if (import.meta.env.DEV) {
      // En local no se envía correo real a Yani: se simula la respuesta
      console.info('[dev] formulario simulado', payload);
      await new Promise((r) => setTimeout(r, 900));
    } else {
      const res = await fetch(CONTACT_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    }
    form.reset();
    setStatus('sent', 'contact.sent');
  } catch {
    setStatus('failed', 'contact.failed');
  } finally {
    btn.disabled = false;
  }
});

/* ------------------------------------------------------------------ arranque */
document.fonts.ready.then(() => {
  if (REDUCED) {
    $$('.js-words').forEach((el) => { wordBlocks.push({ el }); });
    return;
  }
  document.body.classList.add('is-loading');
  initAnimations();
  intro();
  ScrollTrigger.refresh();
});
