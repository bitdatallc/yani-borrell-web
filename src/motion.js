// Animaciones (GSAP + Lenis). main.js lo carga con import() dinámico cuando el navegador queda libre,
// después del primer pintado: así los ~70 KB de GSAP/SplitText/Lenis no retrasan el LCP en móviles.
// La entrada de la portada no depende de esto: es CSS puro (ver "Intro de la portada" en style.css).
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText, MotionPathPlugin);

const FINE_POINTER = window.matchMedia('(pointer: fine)').matches;
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const splits = new Map(); // título -> { split, revealed }
const wordBlocks = [];

function splitHeading(el) {
  const state = splits.get(el) || { revealed: false };
  state.split?.revert();
  state.split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
  if (!state.revealed) gsap.set(state.split.lines, { yPercent: 115 });
  splits.set(el, state);
}

function revealHeading(el) {
  const state = splits.get(el);
  if (!state || state.revealed) return;
  state.revealed = true;
  gsap.to(state.split.lines, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1 });
}

function splitWords(el) {
  el.innerHTML = el.textContent.split(/(\s+)/).map((w) => (/^\s+$/.test(w) ? w : `<span class="w">${w}</span>`)).join('');
}

// Lo que queda por debajo de la pantalla se oculta para animarlo al llegar; lo ya visible no se
// toca (evita que un bloque visible parpadee al cargar este módulo).
const belowFold = (el) => el.getBoundingClientRect().top > window.innerHeight * 0.9;

// Cede el hilo principal entre bloques: la inicialización queda en tareas cortas (<50 ms) en vez de
// una tarea larga que bloquee la interacción en móviles lentos.
const yieldToMain = () => new Promise((r) => setTimeout(r, 0));

export async function initMotion() {
  /* Scroll suave */
  const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  /* Portada: bucles decorativos, que se pausan cuando la portada no se ve */
  const loops = [
    gsap.to('.orbit-plane', { duration: 22, repeat: -1, ease: 'none', motionPath: { path: '#orbitPath', align: '#orbitPath', alignOrigin: [0.5, 0.5], autoRotate: true } }),
    gsap.to('.orbit-dash', { strokeDashoffset: -220, duration: 8, repeat: -1, ease: 'none' }),
    gsap.to('.chip--1', { y: '-=10', duration: 2.6, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
    gsap.to('.chip--2', { y: '+=12', duration: 3.1, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
    gsap.to('.chip--3', { y: '-=8', duration: 2.8, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
    gsap.to('.hero__glow--a', { x: 80, y: 40, duration: 9, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
    gsap.to('.hero__glow--b', { x: -70, y: -30, duration: 11, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
  ];
  ScrollTrigger.create({
    trigger: '.hero', start: 'top top', end: 'bottom top',
    onLeave: () => loops.forEach((t) => t.pause()),
    onEnterBack: () => loops.forEach((t) => t.resume()),
  });

  const hero = $('.hero');
  if (FINE_POINTER) {
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

  await yieldToMain();
  /* Títulos por líneas y bloques que aparecen */
  $$('.js-split').forEach((el) => {
    if (!belowFold(el)) return;
    splitHeading(el);
    ScrollTrigger.create({ trigger: el, start: 'top 86%', once: true, onEnter: () => revealHeading(el) });
  });
  $$('.reveal').filter(belowFold).forEach((el) => {
    gsap.from(el, { y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });

  await yieldToMain();
  /* Marquesina: infinita, acelera con el scroll y se pausa fuera de pantalla */
  const marquee = gsap.to('.marquee__track', { xPercent: -25, duration: 28, ease: 'none', repeat: -1 });
  ScrollTrigger.create({ trigger: '.marquee', start: 'top bottom', end: 'bottom top', onToggle: ({ isActive }) => (isActive ? marquee.play() : marquee.pause()) });
  lenis.on('scroll', ({ velocity }) => {
    if (marquee.paused()) return;
    gsap.to(marquee, { timeScale: 1 + Math.min(Math.abs(velocity) / 6, 4), duration: 0.3, overwrite: true });
    gsap.to(marquee, { timeScale: 1, duration: 1.2, delay: 0.3, ease: 'power2.out' });
  });

  await yieldToMain();
  /* Pilares */
  if (belowFold($('.pillars__grid'))) {
    gsap.from('.pillar', { y: 70, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: '.pillars__grid', start: 'top 82%', once: true } });
    $$('.pillar__icon').forEach((svg) => {
      const parts = $$('path, circle, rect', svg);
      parts.forEach((p) => { const len = p.getTotalLength(); gsap.set(p, { strokeDasharray: len, strokeDashoffset: len }); });
      gsap.to(parts, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', stagger: 0.08, scrollTrigger: { trigger: svg, start: 'top 85%', once: true } });
    });
  }

  await yieldToMain();
  /* Servicios */
  const cards = $$('.svc').filter(belowFold);
  gsap.set(cards, { y: 80, opacity: 0 });
  ScrollTrigger.batch(cards, {
    start: 'top 88%', once: true,
    onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.12 }),
  });
  if (FINE_POINTER) {
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

  await yieldToMain();
  /* Proceso: línea que avanza (fijado en escritorio, vertical en móvil) */
  const steps = $$('.step');
  const activate = (progress) => steps.forEach((s, i) => s.classList.toggle('is-active', progress >= i / steps.length + 0.02));
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    gsap.fromTo('.process__fill', { scaleX: 0 }, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: '.process', start: 'top top', end: '+=140%', pin: '.process__pin', scrub: 0.6, onUpdate: (st) => activate(st.progress) },
    });
  });
  mm.add('(max-width: 900px)', () => {
    gsap.fromTo('.process__fill', { scaleY: 0 }, {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: '.process__track', start: 'top 70%', end: 'bottom 60%', scrub: 0.6, onUpdate: (st) => activate(st.progress) },
    });
  });

  await yieldToMain();
  /* Sobre mí */
  gsap.fromTo('.about__img', { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true } });
  if (belowFold($('.about__frame'))) {
    gsap.fromTo('.about__frame', { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '.about__frame', start: 'top 80%', once: true } });
  }
  gsap.to('.about__seal', { rotation: 200, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true } });
  const jp = $('.journey__path');
  const jlen = jp.getTotalLength();
  gsap.set(jp, { strokeDasharray: jlen, strokeDashoffset: jlen });
  gsap.timeline({ scrollTrigger: { trigger: '.journey', start: 'top 80%', end: 'bottom 45%', scrub: 0.8 } })
    .to(jp, { strokeDashoffset: 0, ease: 'none' }, 0)
    .to('.journey__plane', { ease: 'none', motionPath: { path: '#journeyPath', align: '#journeyPath', alignOrigin: [0.5, 0.5], autoRotate: true } }, 0);
  gsap.from('.journey__stops li', { scale: 0, opacity: 0, duration: 0.8, ease: 'back.out(2)', stagger: 0.18, scrollTrigger: { trigger: '.journey', start: 'top 80%', once: true } });

  await yieldToMain();
  /* Fe: valores + versículo palabra a palabra */
  gsap.from('.faith li', { x: -40, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.faith ul', start: 'top 80%', once: true } });
  $$('.js-words').forEach((el) => {
    splitWords(el);
    wordBlocks.push(el);
    ScrollTrigger.create({
      trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true,
      onUpdate: (st) => {
        const words = $$('.w', el);
        const lit = Math.round(st.progress * words.length);
        words.forEach((w, i) => { w.style.opacity = i < lit ? 1 : 0.14; });
      },
    });
  });

  await yieldToMain();
  /* Botones magnéticos */
  if (FINE_POINTER) {
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

  /* Las líneas dependen del ancho: re-partir si cambia */
  let lastW = window.innerWidth;
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      splits.forEach((_, el) => splitHeading(el));
      ScrollTrigger.refresh();
    }, 250);
  });

  ScrollTrigger.refresh();

  return {
    lenis,
    // Cambio de idioma en el sitio (solo dev): revertir antes de traducir y volver a partir después
    beforeLangChange() { splits.forEach((st) => { st.split?.revert(); st.split = null; }); },
    afterLangChange() {
      splits.forEach((st, el) => { st.revealed = true; splitHeading(el); });
      wordBlocks.forEach(splitWords);
      ScrollTrigger.refresh();
    },
  };
}
