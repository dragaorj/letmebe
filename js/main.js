/* Let Me Be — orquestração (GSAP + Lenis + 3D) */
import { createStage } from './stage3d.js';
import { createScene as createBottle } from './scene.js';

const { gsap, ScrollTrigger, SplitText, Lenis } = window;
gsap.registerPlugin(ScrollTrigger, SplitText);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-motion');
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const root = document.documentElement;

/* ---------------- Idioma ---------------- */
const DICT = window.LMB_I18N;
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
let lang = store.get('lmb-lang') || ((navigator.language || 'pt').startsWith('pt') ? 'pt' : 'en');
function applyLang(l) {
  lang = l; store.set('lmb-lang', l);
  root.lang = l === 'pt' ? 'pt-BR' : 'en';
  $$('[data-i18n]').forEach((el) => { const v = DICT[l][el.dataset.i18n]; if (v != null) el.innerHTML = v; });
  $$('[data-i18n-alt]').forEach((el) => { const v = DICT[l][el.dataset.i18nAlt]; if (v != null) el.alt = v; });
  $$('[data-i18n-aria]').forEach((el) => { const v = DICT[l][el.dataset.i18nAria]; if (v != null) el.setAttribute('aria-label', v); });
  window.__heroSet && window.__heroSet();
  const rt = $('.texture__ringText'); if (rt) rt.textContent = DICT[l][matchMedia('(hover: none)').matches ? 'tex.ringTouch' : 'tex.ring'];
  $$('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
}
applyLang(lang);

/* ---------------- Scroll suave ---------------- */
// celular: a barra do navegador aparece/some ao rolar; isso não pode recalcular as cenas presas (era o "pulo" no meio da rolagem)
ScrollTrigger.config({ ignoreMobileResize: true });
let lenis = null;
if (!reduce && Lenis) {
  lenis = new Lenis({ lerp: 0.085, smoothWheel: true, syncTouch: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
  window.__lenis = lenis;
}
// ---------- Hero: três palavras que se revezam atrás do pote ----------
{ const ws = $$('.hero__w'); let cur = 0;
  // cada palavra tem seu próprio conjunto de textos ao redor do pote
  const SETS = {
    pt: [
      { k: 'Seu cabelo,<br>do seu <em>jeito.</em>', n: '250', l: 'g · Máscara capilar<br>nutritiva', c: 'Nutre fundo.<br>Deixa o fio <em>livre.</em>', t: 'Máscara capilar com óleo de abacate: nutrição intensa, maciez e brilho para todos os tipos de cabelo.' },
      { k: 'Cuidado que<br>vai <em>fundo.</em>', n: '3', l: 'ativos · Óleo de abacate,<br>vitamina E e ômega 9', c: 'Fibra nutrida,<br>fio <em>forte.</em>', t: 'Os ácidos graxos do abacate envolvem a fibra e ajudam a manter a hidratação do cabelo.' },
      { k: 'Luz em cada<br><em>movimento.</em>', n: '10', l: 'min · Seu momento<br>de cuidado', c: 'Cutícula alinhada,<br>brilho <em>espelhado.</em>', t: 'Com a cutícula alinhada, o fio reflete mais luz e ganha maciez e movimento.' }
    ],
    en: [
      { k: 'Your hair,<br>your <em>way.</em>', n: '250', l: 'g · Nourishing<br>hair mask', c: 'Deep nourishment.<br>Hair that feels <em>free.</em>', t: 'Hair mask with avocado oil: rich nourishment, softness and shine for every hair type.' },
      { k: 'Care that<br>goes <em>deep.</em>', n: '3', l: 'actives · Avocado oil,<br>vitamin E and omega 9', c: 'Nourished fiber,<br>stronger <em>strands.</em>', t: 'Avocado fatty acids coat the fiber and help hold your hair hydration.' },
      { k: 'Light in every<br><em>move.</em>', n: '10', l: 'min · Your moment<br>of care', c: 'Aligned cuticle,<br>mirror <em>shine.</em>', t: 'With an aligned cuticle, hair reflects more light and gains softness and movement.' }
    ]
  };
  const tk = $('.hero__kicker'), tn = $('.hero__meta b'), tl = $('.hero__meta span'), tc = $('.hero__claim'), tt = $('.hero__text');
  const fillSet = (i) => { const L = document.documentElement.lang === 'en' ? 'en' : 'pt', s = SETS[L][i]; tk.innerHTML = s.k; tn.textContent = s.n; tl.innerHTML = s.l; tc.innerHTML = s.c; tt.textContent = s.t; };
  const swapTexts = (i) => (textTL = gsap.timeline())
    .to([tk, '.hero__meta', '.hero__side'], { y: -14, autoAlpha: 0, filter: 'blur(6px)', duration: 0.45, ease: 'power2.in', stagger: 0.05 })
    .add(() => fillSet(i))
    .fromTo([tk, '.hero__meta', '.hero__side'], { y: 18, autoAlpha: 0, filter: 'blur(6px)' }, { y: 0, autoAlpha: 1, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out', stagger: 0.07 })
    .add(() => countNum(), '<');   // o número conta do zero até o valor
  // contador do número do topo (250 g · 3 ativos · 10 min)
  const countNum = () => {
    const end = parseInt(tn.textContent, 10) || 0, o = { v: 0 };
    tn.textContent = '0';
    return gsap.to(o, { v: end, duration: end > 50 ? 1.4 : 0.9, ease: 'power3.out', onUpdate: () => { tn.textContent = Math.round(o.v); } });
  };
  let wordTL = null, textTL = null, splitsNow = [];
  // troca de idioma: para o que estiver animando e reescreve tudo no idioma novo, na hora
  window.__heroSet = () => {
    wordTL && wordTL.kill(); textTL && textTL.kill(); wordTL = textTL = null;
    splitsNow.forEach((sp) => sp.revert()); splitsNow = [];
    const L = document.documentElement.lang === 'en' ? 'en' : 'pt';
    ws.forEach((w, i) => { w.textContent = DICT[L][w.dataset.i18n]; w.removeAttribute('style'); w.classList.toggle('is-on', i === cur); });
    gsap.set([tk, '.hero__meta', '.hero__side'], { clearProps: 'all' });
    fillSet(cur);
  };
  const swap = () => {
    if (scrollY > innerHeight * 0.6 || document.hidden) return;   // só anima com o hero em tela
    const a = ws[cur], b = ws[(cur + 1) % ws.length]; cur = (cur + 1) % ws.length; swapTexts(cur);
    const L = document.documentElement.lang === 'en' ? 'en' : 'pt'; [a, b].forEach((w) => (w.textContent = DICT[L][w.dataset.i18n]));   // sempre no idioma atual
    const sa = SplitText.create(a, { type: 'chars', charsClass: 'c', aria: 'none' }), sb = SplitText.create(b, { type: 'chars', charsClass: 'c', aria: 'none' }); splitsNow = [sa, sb];
    b.classList.add('is-on');
    wordTL = gsap.timeline({ onComplete: () => { sa.revert(); sb.revert(); splitsNow = []; a.classList.remove('is-on'); wordTL = null; } })
      .to(sa.chars, { yPercent: -70, rotateX: 70, autoAlpha: 0, filter: 'blur(8px)', stagger: 0.035, duration: 0.7, ease: 'power3.in' }, 0)
      .fromTo(sb.chars, { yPercent: 80, rotateX: -70, autoAlpha: 0, filter: 'blur(8px)' }, { yPercent: 0, rotateX: 0, autoAlpha: 1, filter: 'blur(0px)', stagger: 0.04, duration: 1.1, ease: 'expo.out' }, 0.38);
  };
  setInterval(swap, 3200); }

// ---------- Menu: pílula que desliza até o link sob o mouse ----------
{ const nav = $('.header__nav'); if (nav) { const pill = document.createElement('i'); pill.className = 'nav-pill'; nav.prepend(pill);
  $$('.header__nav a').forEach((l) => l.addEventListener('pointerenter', () => { pill.style.left = l.offsetLeft + 'px'; pill.style.width = l.offsetWidth + 'px'; nav.classList.add('has-pill'); }));
  nav.addEventListener('pointerleave', () => nav.classList.remove('has-pill')); } }

// menuzinho: destaque que desliza até a opção sob o mouse
{ const list = $('.mnav__list'); if (list) { const pill = document.createElement('i'); pill.className = 'mnav-pill'; list.prepend(pill);
  $$('.mnav__list a').forEach((l) => l.addEventListener('pointerenter', () => { pill.style.top = l.offsetTop + 'px'; pill.style.height = l.offsetHeight + 'px'; list.classList.add('has-pill'); }));
  list.addEventListener('pointerleave', () => list.classList.remove('has-pill')); } }

// largura da pílula compacta medida pelo conteúdo (permite animar a largura em vez de trocar o layout)
function measureHeader() {
  const h = header, lang = h.querySelector('.lang'), cta = h.querySelector('.header__cta'), bg = h.querySelector('.burger');
  const ctaW = cta ? cta.scrollWidth + 18 : 0, pad = 26 + 9 + 10, gaps = 40 + 16 * 2;
  const w = pad + 118 + gaps + (lang ? lang.offsetWidth : 0) + ctaW + (bg ? 42 : 0);   // no menu compacto o ícone de acessibilidade fica dentro do hambúrguer
  h.style.setProperty('--hw-compact', Math.min(innerWidth - 32, Math.round(w)) + 'px');
}
addEventListener('resize', measureHeader); document.fonts && document.fonts.ready.then(measureHeader); setTimeout(measureHeader, 300);

// ---------- Menu mobile ----------
const burger = $('.burger'), mnav = $('.mnav');
let menuY = 0;
function setMenu(open) {
  document.documentElement.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', open); mnav.setAttribute('aria-hidden', !open);
  burger.setAttribute('aria-label', DICT[document.documentElement.lang === 'en' ? 'en' : 'pt'][open ? 'nav.close' : 'nav.open']);
  if (open) { header.classList.remove('is-hidden'); menuY = lenis ? lenis.scroll : scrollY;
    // posiciona o cartão logo abaixo do botão de menu, alinhado pela direita
    const br = burger.getBoundingClientRect(), hr = header.getBoundingClientRect(), w = mnav.offsetWidth || 260;
    mnav.style.setProperty('left', Math.max(16, Math.min(innerWidth - w - 16, br.right - w)) + 'px', 'important'); mnav.style.setProperty('top', (hr.bottom + 10) + 'px', 'important');
    gsap.fromTo('.mnav__list a, .mnav__foot > *', { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.04, duration: 0.6, ease: 'expo.out', delay: 0.05 });
  }
}
burger.addEventListener('click', () => setMenu(!document.documentElement.classList.contains('menu-open')));
addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
document.addEventListener('pointerdown', (e) => { if (root.classList.contains('menu-open') && !e.target.closest('.mnav, .burger')) setMenu(false); });
$$('.mnav a[href^="#"]').forEach((l) => l.addEventListener('click', () => setMenu(false), true));
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href'); const t = id.length > 1 && $(id); if (!t) return;
  e.preventDefault();
  let y = null;
  if (id === '#ingredientes') {   // ingredientes: o ponto em que os abacates já estão no círculo
    const st = ScrollTrigger.getAll().find((x) => x.trigger && x.trigger.classList && x.trigger.classList.contains('story'));
    if (st && st.animation) y = st.start + (st.end - st.start) * (innerWidth <= 760 ? 7.05 : 7.35) / st.animation.duration();
  }
  if (y === null) y = t.getBoundingClientRect().top + (lenis ? lenis.scroll : scrollY);
  if (window.__jumpTo) window.__jumpTo(y); else if (lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
}));

/* ---------------- Header ---------------- */
const header = $('.header'); let lastY = 0, langBusy = false;
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => {
  if (langBusy) return;   // troca de idioma não mexe no menu
  const y = s.scroll();
  if (root.classList.contains('menu-open') && Math.abs(y - menuY) > 40) setMenu(false);   // rolou: o menu fecha
  header.classList.toggle('is-compact', y > 80);
  root.classList.toggle('past-hero', y > 80);   // no primeiro scroll os textos e o CTA do hero saem (o CTA vai para o menu)
  const hc = header.querySelector('.header__cta'); if (hc) hc.tabIndex = y > 80 ? 0 : -1;   // ao rolar, o menu vira uma pílula flutuante
  if (y > 500 && y > lastY + 6 && !root.classList.contains('menu-open')) header.classList.add('is-hidden');
  else if (y < lastY - 6 || y < 500) header.classList.remove('is-hidden');
  lastY = y;
} });
// página aberta/recarregada já rolada: o menu já nasce compacto (sem esperar um scroll acontecer)
{ const applyCompact = () => { const y = window.scrollY; header.classList.toggle('is-compact', y > 80); root.classList.toggle('past-hero', y > 80);
    const hc = header.querySelector('.header__cta'); if (hc) hc.tabIndex = y > 80 ? 0 : -1; };
  applyCompact(); addEventListener('load', applyCompact); addEventListener('pageshow', applyCompact);
  ScrollTrigger.addEventListener('refresh', applyCompact); requestAnimationFrame(applyCompact); setTimeout(applyCompact, 400); }

/* ---------------- Palco 3D ---------------- */
const canvas = $('.stage');
const bar = $('.loader__bar span');
const ready = { model: false, draw: false, fonts: false };
const stage = createStage(canvas, {
  onProgress: (p) => gsap.to(bar, { scaleX: p * 0.9, duration: 0.4, overwrite: true }),
  onLoad: () => { ready.model = true; tryStart(); }
});
const S = stage.state; window.__S = S;

/* ---------------- Loader: logo desenhado em vetor ---------------- */
const lp = $$('.loader__logo path');
lp.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
gsap.timeline({ onComplete: () => { ready.draw = true; tryStart(); } })
  .to(lp, { strokeDashoffset: 0, duration: reduce ? 0.01 : 1.5, ease: 'power2.inOut', stagger: 0.08 })
  .to(lp, { fill: '#008575', duration: 0.5 }, '-=0.4');
document.fonts.ready.then(() => { ready.fonts = true; tryStart(); });
setTimeout(() => { Object.keys(ready).forEach((k) => (ready[k] = true)); tryStart(); }, 10000);

let started = false;
let storyTL = null;   // linha do tempo do pote (usada para reaplicar a cena)
function tryStart() {
  if (started || !ready.model || !ready.draw || !ready.fonts) return;
  started = true;
  stage.resetSpin && stage.resetSpin();   // o pote sempre aparece de frente, com a logo Let Me Be visível
  buildText();
  gsap.timeline({ delay: 0.15 })
    .to(bar, { scaleX: 1, duration: 0.3 })
    .to('.loader', { autoAlpha: 0, duration: 0.9, ease: 'power2.inOut' })
    .add(() => { document.body.classList.remove('is-loading'); $('.loader').remove(); lenis && lenis.start(); canvas.classList.add('is-ready'); ScrollTrigger.refresh(); }, '-=0.4')
    .fromTo('.header > *', { y: -24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.08, duration: 0.9, ease: 'expo.out', clearProps: 'transform,opacity,visibility' }, '-=0.3')
    .from('.hero__w.is-on', { yPercent: 45, opacity: 0, filter: 'blur(10px)', duration: 1.6, ease: 'expo.out', clearProps: 'transform,opacity,filter' }, '<')
    .fromTo('.hero__foot > *', { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', stagger: 0.08, clearProps: 'transform,opacity,visibility' }, '<0.3')
    .to(S, { y: innerWidth <= 760 ? (innerHeight < 720 ? 0.3 : 0.22) : -0.3, duration: 1.8, ease: 'expo.out', onComplete() { this.kill(); },
      onUpdate() { if (scrollY > 40 && storyTL) { this.kill(); const tm = storyTL.time(); storyTL.time(0); storyTL.time(tm); } } }, '<')   // se a página já começou rolada, a cena manda na altura do pote   // no celular o pote sobe um pouco
    // as folhas são as últimas a aparecer: entram deslizando pelos cantos (sem fade)
    .set('.hero__leaves', { autoAlpha: 1 }, '>-0.6')
    .fromTo('.leafg--tr', { x: () => innerWidth * 0.32, y: () => -innerHeight * 0.42 }, { x: 0, y: 0, duration: 1.8, ease: 'expo.out' }, '<')
    .fromTo('.leafg--l', { x: () => -innerWidth * 0.32, y: () => innerHeight * 0.42 }, { x: 0, y: 0, duration: 1.8, ease: 'expo.out' }, '<0.12');
  buildScroll();
}

/* ---------------- Texto ---------------- */
let splits = [], textST = [];
function buildText() {
  textST.forEach((t) => t.kill()); textST = []; splits.forEach((s) => s.revert()); splits = [];
  $$('.split').forEach((el) => {
    const s = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'line' }); splits.push(s); el._lines = s.lines;
    if (el.dataset.shown) return;
    gsap.set(s.lines, { yPercent: 110 });
    if (el.closest('.hero')) return;            // o hero entra pela intro
    textST.push(ScrollTrigger.create({ trigger: el, start: 'top 82%', once: true, onEnter: () => {
      el.dataset.shown = 1; gsap.to(s.lines, { yPercent: 0, duration: 1.25, ease: 'expo.out', stagger: 0.1 });
    } }));
  });
  if (started) $$('.hero .split').forEach((el) => { el.dataset.shown = 1; gsap.set(el._lines, { yPercent: 0 }); });
  $$('.reveal-words').forEach((el) => {
    const s = SplitText.create(el, { type: 'words', wordsClass: 'w', aria: el.tagName === 'P' ? 'none' : 'auto' }); splits.push(s);
    const big = el.classList.contains('manifesto__line');
    if (big) {
      // oclusão: as palavras sobem de trás da máscara de cada linha, vindo do lado da frase
      splits.pop().revert();
      // quebras de linha próprias para cada tela: .d só no computador, .m só no celular
      el.querySelectorAll(innerWidth <= 760 ? 'br.d' : 'br.m').forEach((b) => b.remove());
      el.innerHTML = el.innerHTML.replace(/ ([^ ]+)\s*$/, ' $1');   // nunca deixa a última palavra sozinha na linha
      const m = SplitText.create(el, { type: 'lines,words', linesClass: 'ml', wordsClass: 'w', aria: el.tagName === 'P' ? 'none' : 'auto' }); splits.push(m);
      const fromR = el.classList.contains('manifesto__line--r');
      // surgimento: as palavras sobem de trás da máscara, girando de leve; a parte verde acende por último
      const ems = el.querySelectorAll('em');
      const tlm = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 82%', toggleActions: 'play none none reverse' } })
        .fromTo(m.words, { yPercent: 120, rotate: fromR ? -6 : 6, xPercent: fromR ? 8 : -8, opacity: 0 },
          { yPercent: 0, rotate: 0, xPercent: 0, opacity: 1, duration: 1.35, ease: 'expo.out', stagger: 0.07 })
        .fromTo(ems, { color: '#404040' }, { color: '#008575', duration: 1, ease: 'power2.out', clearProps: 'color' }, '-=0.8');
      textST.push(tlm.scrollTrigger);
      textST.push(gsap.fromTo(el, { opacity: 1 }, { opacity: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'center 38%', end: 'bottom 5%', scrub: true } }).scrollTrigger);
      return;
    }
    const tw = gsap.fromTo(s.words, { '--wo': 0.18 }, { '--wo': 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 75%', end: 'bottom 40%', scrub: true } });
    textST.push(tw.scrollTrigger);
  });
}

/* ---------------- Coreografia ---------------- */
function buildScroll() {
  const vh = () => innerHeight;
  const TAU = Math.PI * 2;
  // linha do tempo do pote, medida em "telas" ao longo de .story
  let storyLeft = false;
  const tl = storyTL = gsap.timeline({ defaults: { ease: 'none' },
    scrollTrigger: { trigger: '.story', start: 'top top', end: 'bottom bottom', scrub: 1.1,
      onLeave: () => { storyLeft = true; const tw = tl.scrollTrigger.getTween(); if (tw && tw.isActive()) tw.eventCallback('onComplete', () => { if (storyLeft) stage.pause(); }); else stage.pause(); },   // só pausa o 3D depois que a cena terminou de chegar ao fim (tampa fechada)
      onEnterBack: () => { storyLeft = false; stage.resume(); } } });
  // folhas do hero: saem pelas bordas ao rolar e voltam ao subir
  gsap.timeline({ defaults: { ease: 'power2.in' }, scrollTrigger: { trigger: '.hero', start: 'top top', end: () => '+=' + innerHeight * 0.9, scrub: 0.8 } })
    .to('.leafg--tr', { xPercent: 150, yPercent: -150, rotate: 18 }, 0)   // saem deslizando pelo canto (sem fade) e voltam ao subir
    .to('.leafg--l', { xPercent: -150, yPercent: 150, rotate: -18 }, 0);
  // 1 · Hero: desenrosca a tampa, creme cresce, abacates explodem (pico)
  const PORTRAIT_FACE_Y = 0.62, LAND_FACE_Y = 0.05;   // computador: o pote encosta de leve nas letras do título   // telas em pé (monitor vertical): o creme sobe para perto do título
  const MOB = innerWidth <= 760, HERO_Y = MOB ? (innerHeight < 720 ? 0.3 : 0.22) : -0.3, SH = 2.6;   // SH: duração extra do manifesto
  const ING_Y = innerWidth <= 760 ? 0.42 : 0.25;   // altura do pote nos ingredientes
  const FACE_Y = MOB ? (innerHeight < 720 ? -0.15 : 0.07) : (innerWidth / innerHeight < 0.85 ? PORTRAIT_FACE_Y : LAND_FACE_Y);   // altura do pote na cena da textura
  // pote fechado no fim da textura: centralizado no eixo da câmera (que mira a altura 1.3), um pouco acima do centro.
  // O cálculo vale para qualquer tamanho de tela; em telas baixas o pote fica menor para caber o botão embaixo.
  const CLOSE_S = innerWidth / innerHeight < 0.85 ? 0.88 : (innerHeight < 820 ? 0.8 : 0.9), CLOSE_EFF = CLOSE_S * (innerWidth / innerHeight < 0.85 ? 0.8 : 1);
  const CLOSE_Y = 1.3 + 0.1 - 0.7 * CLOSE_EFF;
  // trava a posição do hero dentro da própria linha do tempo (ao voltar ao topo o pote volta ao lugar certo)
  tl.fromTo(S, { y: HERO_Y, x: 0 }, { y: HERO_Y, x: 0, duration: 1, immediateRender: false }, 0)
    .to(S, { spin: 0, duration: 0.15 }, 0)
    .to(S, { open: 1, duration: 0.75, ease: 'power1.inOut' }, 0)
    .to(S, { cream: 1, duration: 0.5 }, 0.4)
    .to(S, { burst: 1, duration: 0.6, ease: 'none' }, 0.55)
    .to(S, { rotY: 0.08 + 0.45, scale: 0.95, duration: 1 }, 0)   // começa com a logo de frente e gira para a direita com o scroll
    .to('.hero__title', { yPercent: -30, scale: 0.92, autoAlpha: 0, duration: 0.6 }, 0.5)
    .to('.hero__foot', { autoAlpha: 0, y: 30, duration: 0.35 }, 0.7)
  // 2 · Manifesto: pote ao centro, órbita larga, um giro completo
    .fromTo(S, { y: HERO_Y }, { immediateRender: false, x: 0, y: MOB ? -1.25 : 0, scale: 0.88, orbit: 1.25, duration: 0.8, ease: 'power2.inOut' }, 1.0)   // celular: pote na metade de baixo, texto em cima
    .to(S, { rotY: 0.08 + TAU, duration: 1.4 + SH, ease: 'power1.inOut' }, 1.0)   // volta completa para a direita: chega aos ingredientes com a logo de frente
    .to(S, { lidAway: 1, duration: 0.75, ease: 'power1.in' }, 0.55)   // emenda com o desenroscar: a tampa sobe e some sem parar
    .to(root, { '--sky': '#ECECEA', duration: 0.6 }, 1.0)
  // 3 · Ingredientes: céu verde profundo, abacates formam o arco
    .to(root, { '--sky': '#D1D5BB', '--glow': 0.6, duration: 0.5 }, 3.1 + SH)
    .fromTo(S, { y: MOB ? -1.25 : 0 }, { immediateRender: false, gather: 1, scale: innerWidth <= 760 ? 1 : 0.86, y: ING_Y, shadow: 0, orbit: 1, duration: 1.5, ease: 'power1.inOut' }, 2.7 + SH)
    .to(S, { rotY: 0.08 + TAU, duration: 2.2 }, 3.1 + SH)
  // 4 · Textura: abacates recolhem, pote vira o creme para a câmera
    .to(S, { sink: 1, duration: MOB ? 1.2 : 1.1, ease: 'power1.inOut' }, (MOB ? 4.75 : 5.3) + SH)   // os abacates seguem no sentido horário e mergulham no pote, um a um   // celular: os abacates voltam para o pote enquanto os cartões passam
    .to(root, { '--sky': '#DCDAD6', '--glow': 0.45, duration: 0.5 }, 5.5 + SH)
    .fromTo(S, { y: ING_Y }, { immediateRender: false, face: 1, x: 0, y: FACE_Y, scale: 1.0, rotY: TAU, shadow: 0.1, duration: 0.9, ease: 'power2.inOut' }, 5.6 + SH)   // celular: pote um pouco mais alto, perto do título
    .to(S, { face: 1, duration: 0.7 }, 6.5 + SH)
    .fromTo(S, { lidBack: 0 }, { lidBack: 1, duration: 0.45, ease: 'power1.inOut', immediateRender: false }, 7.15 + SH)
    .fromTo(S, { x: 0, y: FACE_Y, scale: 1.0 }, { x: 0, scale: CLOSE_S, y: CLOSE_Y, duration: 0.4, ease: 'power2.inOut', immediateRender: false }, 7.15 + SH)   // o pote sobe um pouco e fica no centro da tela enquanto a tampa fecha   // a tampa volta e fecha o pote antes da próxima seção
    .to(S, { lidBack: 1, duration: 0.45 }, 7.7 + SH);   // pausa com o pote fechado e o botão "Obter agora" antes da próxima seção
  // header claro sobre o fundo escuro
  // menu claro sempre que o que está atrás dele for escuro (Passo Único e rodapé)
  { const darks = [$('.pro'), $('.close__card')], railPin = $('.rail__pin');
    gsap.ticker.add(() => { const y = 40; header.classList.toggle('on-dark', darks.some((el) => {
      if (el.classList.contains('pro') && railPin && +getComputedStyle(railPin).opacity > 0.5 && railPin.getBoundingClientRect().top <= y) return false;   // a seção clara dos cabelos já cobre o Passo Único
      const r = el.getBoundingClientRect(); return r.top <= y && r.bottom >= y; })); }); }

  // chips de ingredientes
  gsap.from('.orbit__ring circle', { scale: 0.6, autoAlpha: 0, transformOrigin: '50% 50%', stagger: 0.12, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.ingredients', start: 'top 30%' } });
  // (os itens aparecem junto com o círculo, pela opacidade do conjunto; sem animação própria que podia deixá-los invisíveis)
  // o texto circular acompanha o creme (centro, raio e perspectiva)
  const texCta = $('.tex-cta'), ease01 = (v) => { v = Math.max(0, Math.min(1, (v - 0.5) / 0.5)); return v * v * (3 - 2 * v); };
  const ringEl = $('.texture__ring'), texTitle = $('.texture__title'), ingTitle = $('.ingredients__title'), orbitBox = $('.orbit');
  // título da textura: as palavras sobem de trás de uma máscara (e descem ao sair da cena)
  let texShown = false, texSplit = null;
  const texReveal = (show) => {
    texShown = show;
    if (!texSplit || !texTitle.contains(texSplit.words[0])) {
      texSplit && texSplit.revert();
      texSplit = SplitText.create(texTitle, { type: 'lines,words', mask: 'lines', wordsClass: 'tw' });
      gsap.set(texSplit.words, { yPercent: 115, rotate: 5 });
    }
    if (show) texTitle.style.opacity = 1;
    gsap.to(texSplit.words, show
      ? { yPercent: 0, rotate: 0, duration: 1.3, ease: 'expo.out', stagger: 0.07, overwrite: true }
      : { yPercent: 115, rotate: 5, duration: 0.5, ease: 'power2.in', stagger: 0.02, overwrite: true,
          onComplete: () => { if (!texShown) texTitle.style.opacity = 0; } });   // fora da cena o título some de vez (nada aparece vindo de baixo)
  };
  texTitle.style.opacity = 0;
  const clamp = (v) => Math.max(0, Math.min(1, v));
  let hintA = 1, lastKneadT = -1e9, texTop = null;
  gsap.ticker.add(() => {
    // visibilidade amarrada ao 3D: nada aparece fora de hora
    const k = clamp((S.face - 0.82) / 0.18);
    // a dica (texto + seta) some enquanto mexe no creme e volta 2 s depois de soltar
    const now = performance.now(); const busy = stage.interacting; if (busy) lastKneadT = now;
    hintA += ((now - lastKneadT > 1200 ? 1 : 0) - hintA) * (busy ? 0.25 : 0.06);   // some ao interagir; volta depois que o pote se acomoda
    ringEl.style.opacity = k * hintA * clamp(1 - S.lidBack * 4);
    // botão "Obter agora": sempre logo abaixo do pote, nunca por cima dele (sem espaço, ele some)
    { let on = S.lidBack > 0.97 && S.face > 0.9;
      const r = S.face > 0.9 && S.lidBack > 0.5 ? stage.jarRect() : null, bh = texCta.offsetHeight || 60, gap = 26;
      // pote + botão centralizados juntos no espaço livre (abaixo do menu), em qualquer tela
      let want = 0;
      if (r) {
        const hb = (header.getBoundingClientRect().bottom || 70) + 10, free = innerHeight - hb;
        const groupH = (r.bottom - r.top) + gap + bh, dst = hb + Math.max(0, (free - groupH) / 2);
        want = (S.yAdj + (r.top - dst) / Math.max(1, r.pxPerUnit)) * ease01(S.lidBack);
      } else if (innerWidth <= 760 && S.face > 0.6 && S.lidBack < 0.5) {
        // celular, cena da textura: o pote nunca encosta no título (em qualquer altura de tela e idioma);
        // se a borda do pote subir sobre as letras, ele desce o necessário
        const jr = stage.jarRect(1.34), tb = texTitle.getBoundingClientRect().bottom;
        if (jr && texTitle.offsetHeight) {
          const need = (jr.top - (tb + 12)) / Math.max(1, jr.pxPerUnit);   // < 0: precisa descer
          want = Math.min(0, S.yAdj + need) * Math.min(1, (S.face - 0.6) / 0.4);
        }
      }
      S.yAdj += (want - S.yAdj) * 0.12;
      if (on) {
        const top = r.bottom + gap;
        on = top + bh <= innerHeight - 12;
        if (on) texCta.style.top = top.toFixed(1) + 'px';
      }
      if (on !== texCta.classList.contains('is-on')) { texCta.classList.toggle('is-on', on); texCta.setAttribute('aria-hidden', String(!on)); texCta.tabIndex = on ? 0 : -1; } }
    const texWant = k > 0.5 && S.lidBack < 0.04;   // quando a tampa começa a voltar, o título sai (animação reversa)
    if (texWant !== texShown) texReveal(texWant);
    if (innerWidth <= 760) {   // celular: o título fica parado junto com o pote (não sobe sozinho quando a cena termina)
      const sr = texTitle.parentElement.getBoundingClientRect(), off = Math.max(0, -sr.top);
      texTitle.style.translate = off ? '0 ' + off.toFixed(1) + 'px' : '';
      texTitle.style.filter = off ? 'opacity(' + clamp(sr.bottom / (innerHeight * 0.45)).toFixed(3) + ')' : '';
    }
    const g = clamp(S.gather * 1.5) * (1 - clamp(S.sink * 2.2));   // some quando os abacates começam a mergulhar no pote
    ingTitle.style.opacity = g; ingTitle.style.visibility = g < 0.002 ? 'hidden' : 'visible';
    orbitBox.style.opacity = g; orbitBox.style.visibility = g < 0.002 ? 'hidden' : 'visible';
    if (S.face < 0.05) return;
    const c = stage.creamScreen(); if (!c) return;
    const w = c.rx * 1.8;   // texto rente à borda interna do creme
    ringEl.style.left = c.x + 'px'; ringEl.style.top = c.y + 'px'; ringEl.style.width = w + 'px';
    ringEl.style.transform = `translate(-50%,-50%) scaleY(${Math.min(1, c.ry / c.rx).toFixed(3)})`;
    // computador: o título se posiciona pela borda do pote, que só encosta na base das letras (nenhuma palavra fica coberta)
    if (innerWidth > 760 && S.face > 0.85) {
      const fs = parseFloat(getComputedStyle(texTitle).fontSize) || 100, th = texTitle.offsetHeight;
      const rimTop = c.y - c.ry * 1.18;                      // topo da borda do pote na tela
      const sr = texTitle.parentElement.getBoundingClientRect();
      const minTop = (header.getBoundingClientRect().bottom || 80) + 12;
      const want = Math.max(minTop, rimTop + fs * 0.16 - th) - sr.top;
      texTop = texTop === null ? want : texTop + (want - texTop) * 0.2;
      texTitle.style.setProperty('top', texTop.toFixed(1) + 'px', 'important');
    }
  });
  // anéis e ingredientes centralizados exatamente no pote
  const orbitEl = $('.orbit');
  gsap.ticker.add(() => {
    if (!orbitEl || S.gather < 0.02) return;
    const j = stage.jarScreen();
    orbitEl.style.left = j.x + 'px'; orbitEl.style.top = j.y + 'px';
    if (innerWidth <= 900) {
      // celular: o círculo vai do alto da tela (logo abaixo do menu) até perto do rodapé da tela, cortado nas laterais
      const H = stage.screenH ? stage.screenH() : innerHeight;
      const D = innerWidth <= 760 ? innerWidth * 0.94 : Math.max(innerWidth * 1.1, 2 * Math.min(j.y - 165, H - j.y - 44));   // celular: o círculo cabe inteiro na tela
      orbitEl.style.width = D.toFixed(0) + 'px';
      // título menor, logo acima do pote
      ingTitle.style.setProperty('top', Math.max(84, j.y - innerWidth * 0.29 - ingTitle.offsetHeight).toFixed(0) + 'px', 'important');
    } else {
      // computador: círculo maior em telas baixas (notebook), sem achatar
      const vert = Math.min(j.y - 178, innerHeight - j.y - 46);
      const rr = Math.max(170, Math.min(innerWidth * 0.31, Math.max(vert, innerHeight * 0.47), 430));
      const rx = rr, ry = rr;
      orbitEl.style.width = (2 * rx).toFixed(0) + 'px'; orbitEl.style.height = (2 * ry).toFixed(0) + 'px'; orbitEl.style.aspectRatio = '1';
      // título dentro do oval, entre o topo do caminho e o pote
      ingTitle.style.setProperty('top', Math.max(90, j.y - ry * 0.62 - ingTitle.offsetHeight / 2).toFixed(0) + 'px', 'important');
    }
  });
  // círculo de ingredientes gira com o scroll
  // ingredientes orbitam o pote sem parar; pausam no hover ou com um item aberto
  const orbitList = $('.orbit__list'); let orbitRot = 0, orbitHold = false;
  const orbitChips = $$('.orbit .chip'), orbitItems = $$('.orbit .orbit__item'); let autoK = -1, autoT = 0, lastAuto = -1;
  window.__orbitAutoReset = (k) => { autoK = -1; lastAuto = k === undefined ? -1 : k; };
  orbitChips.forEach((c) => { const h = document.createElement('em'); h.className = 'chip__hint'; h.setAttribute('aria-hidden', 'true'); h.dataset.i18n = 'ing.hint'; h.textContent = (DICT[document.documentElement.lang === 'en' ? 'en' : 'pt'] || {})['ing.hint'] || 'Clique para saber mais'; c.insertBefore(h, c.querySelector('.chip__plus')); });
  // só para de girar com o mouse em cima de um ingrediente (não no meio do círculo)
  orbitChips.forEach((c) => { c.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') orbitHold = true; }); c.addEventListener('pointerleave', () => (orbitHold = false)); });
  gsap.ticker.add((t, dt) => {
    if (S.gather < 0.02 || S.sink > 0.99) return;   // só gira enquanto os ingredientes estão na tela
    let isOpen = orbitList.querySelector('.chip[aria-expanded="true"]');
    root.classList.toggle('ing-focus', !!isOpen && S.gather > 0.5 && S.sink < 0.2);   // cartão aberto: o resto fica embaçado
    // celular: o ingrediente que chega embaixo, no meio, abre sozinho, fica um tempinho e fecha; o círculo segue girando
    if (innerWidth <= 900) {
      [-135, -45, 135, 45].forEach((base, k) => {
        const ang = ((base + orbitRot) % 360 + 360) % 360;
        orbitChips[k].classList.toggle('is-hint', !isOpen && Math.abs(ang - 90) < 14);   // alinhado embaixo, no meio
      });
    }
    if (!orbitHold && !isOpen && !reduce) orbitRot = (orbitRot + dt * (innerWidth <= 900 ? 0.011 : 0.006)) % 360;   // no celular gira um pouco mais rápido: um ingrediente passa por baixo a cada ~8 s
    orbitList.style.setProperty('--rot', orbitRot.toFixed(2) + 'deg');
    // computador: cada ingrediente anda sobre o oval (posição calculada; o grupo não gira mais como um disco)
    if (innerWidth > 900) [-135, -45, 135, 45].forEach((base, k) => {
      const a = (base + orbitRot) * Math.PI / 180, it = orbitItems[k];
      it.style.left = (50 + Math.cos(a) * 50).toFixed(3) + '%'; it.style.top = (50 + Math.sin(a) * 50).toFixed(3) + '%';
      const ib = it.getBoundingClientRect(), hb = header.getBoundingClientRect().bottom;
      it.style.opacity = Math.max(0, Math.min(1, (ib.top - hb - 6) / 50)).toFixed(3);   // perto do menu, o ingrediente some suave
    });
  });
  // celular: um ingrediente por vez, em destaque abaixo do pote. O círculo segue girando; o ingrediente que passa
  // embaixo vira o destaque. Bolinhas e arrastar para o lado trocam de ingrediente.
  { const feat = $('.ing-feat'), fb = feat.querySelector('.ing-feat__body'), fn = feat.querySelector('.ing-feat__n'), ft = feat.querySelector('.ing-feat__t'),
      fs = feat.querySelector('.ing-feat__s'), fm = feat.querySelector('.ing-feat__m'), dots = [...feat.querySelectorAll('.ing-feat__dots button')];
    const BASES = [-135, -45, 135, 45];
    let cur = -1, busy = null;
    const fill = (k) => {
      const c = orbitChips[k]; fn.textContent = '0' + (k + 1) + ' / 04';
      ft.textContent = c.querySelector('b').textContent; fs.textContent = c.querySelector('span').textContent; fm.textContent = c.querySelector('.chip__more').textContent;
      dots.forEach((d, i) => { d.classList.toggle('is-on', i === k); d.setAttribute('aria-selected', String(i === k)); d.setAttribute('aria-label', orbitChips[i].querySelector('b').textContent); });
    };
    const show = (k) => {
      if (k === cur) return; const first = cur < 0; cur = k;
      if (first) { fill(k); return; }
      gsap.to(fb, { autoAlpha: 0, y: -8, duration: 0.25, ease: 'power2.in', overwrite: true, onComplete: () => { fill(k); gsap.fromTo(fb, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.55, ease: 'expo.out' }); } });
    };
    // gira o círculo até o ingrediente k ficar embaixo, no meio (sempre para a frente, sem voltar)
    const goTo = (k) => {
      let tgt = 90 - BASES[k]; while (tgt <= orbitRot + 0.5) tgt += 360; if (tgt - orbitRot > 360) tgt -= 360;
      const o = { r: orbitRot }; busy && busy.kill(); orbitHold = true;
      busy = gsap.to(o, { r: tgt, duration: 0.9, ease: 'power3.inOut', onUpdate: () => { orbitRot = o.r % 360; }, onComplete: () => { orbitHold = false; busy = null; } });
      show(k);
    };
    dots.forEach((d, i) => d.addEventListener('click', () => goTo(i)));
    let tx = 0, ty = 0, tOn = false;
    addEventListener('touchstart', (e) => { if (innerWidth > 760 || +feat.style.opacity < 0.5) return; tOn = true; tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
    addEventListener('touchend', (e) => {
      if (!tOn) return; tOn = false; const t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4 && cur >= 0) goTo((cur + (dx < 0 ? 1 : 3)) % 4);
    }, { passive: true });
    gsap.ticker.add(() => {
      const mob = innerWidth <= 760;
      const g = mob ? Math.max(0, Math.min(1, S.gather * 1.5)) * (1 - Math.max(0, Math.min(1, S.sink * 2.2))) : 0;
      feat.style.opacity = g.toFixed(3); feat.style.visibility = g < 0.002 ? 'hidden' : 'visible'; feat.style.pointerEvents = g > 0.5 ? 'auto' : 'none';
      if (!mob || g < 0.002) return;
      // destaque = ingrediente mais perto de embaixo (90°)
      let best = 0, bd = 1e9;
      BASES.forEach((b, k) => { const a = ((b + orbitRot) % 360 + 360) % 360, d = Math.abs(a - 90); if (d < bd) { bd = d; best = k; } });
      if (!busy) show(best);
    });
  }
  // janela do ingrediente: independente do "+", flutua do lado de dentro do círculo (em direção ao pote)
  // e sempre dentro da tela, abaixo do menu
  { const pop = $('.ing-pop'), pt = pop.querySelector('.ing-pop__t'), ps = pop.querySelector('.ing-pop__s'), pm = pop.querySelector('.ing-pop__m');
    let shown = null;
    const closeOpen = () => {
      const o = orbitList.querySelector('.chip[aria-expanded="true"]'); if (!o) return;
      const k = [...orbitChips].indexOf(o);
      o.setAttribute('aria-expanded', 'false'); document.querySelector('.ingredients').classList.remove('has-open');
      window.__orbitManual = false; window.__orbitAutoReset && window.__orbitAutoReset(k);
    };
    pop.querySelector('.ing-pop__x').addEventListener('click', closeOpen);
    gsap.ticker.add(() => {
      const o = S.gather > 0.5 && S.sink < 0.2 ? orbitList.querySelector('.chip[aria-expanded="true"]') : null;
      if (o !== shown) {
        shown = o;
        if (o) {
          pt.textContent = o.querySelector('b').textContent; ps.textContent = o.querySelector('span').textContent;
          pm.textContent = o.querySelector('.chip__more').textContent;
        }
        pop.classList.toggle('is-open', !!o); pop.setAttribute('aria-hidden', String(!o));
      }
      if (!o) return;
      const plus = o.querySelector('.chip__plus').getBoundingClientRect(), j0 = stage.jarScreen();
      const px = plus.left + plus.width / 2, py = plus.top + plus.height / 2;
      let dx = j0.x - px, dy = j0.y - py; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
      const w = pop.offsetWidth, hh = pop.offsetHeight, gap = 26;
      // centro da janela: a partir do "+", na direção do pote, afastado o suficiente para não cobrir o "+"
      const reach = Math.abs(dx) * w / 2 + Math.abs(dy) * hh / 2 + gap;
      let cx = px + dx * reach, cy = py + dy * reach;
      const top = (header.getBoundingClientRect().bottom || 80) + 14, m = 16;
      cx = Math.min(innerWidth - m - w / 2, Math.max(m + w / 2, cx));
      cy = Math.min(innerHeight - m - hh / 2, Math.max(top + hh / 2, cy));
      pop.style.transform = `translate(${(cx - w / 2).toFixed(1)}px, ${(cy - hh / 2).toFixed(1)}px)`;
    });
    window.__ingPopClose = closeOpen;
  }
  // celular: ao abrir um ingrediente, o círculo gira até ele ficar embaixo, no centro (o cartão não fica cortado na lateral)
  window.__orbitFocus = (k) => {
    const base = [-135, -45, 135, 45][k]; if (base === undefined) return;
    const d = ((((90 - base) - orbitRot) % 360) + 540) % 360 - 180, o = { v: orbitRot };
    gsap.to(o, { v: orbitRot + d, duration: 0.9, ease: 'power3.inOut', onUpdate: () => { orbitRot = ((o.v % 360) + 360) % 360; orbitList.style.setProperty('--rot', orbitRot.toFixed(2) + 'deg'); } });
  };

  // cards de linhas
  gsap.from('.prow', { y: 60, autoAlpha: 0, stagger: 0.08, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.plist', start: 'top 85%' } });
  // linhas: um único destaque verde que desliza de uma linha para a outra (sem dois blocos pela metade)
  { const list = $('.plist'), hl = document.createElement('li'); hl.className = 'plist__hl'; hl.setAttribute('aria-hidden', 'true'); list.prepend(hl);
    let on = false;
    $$('.plist .prow').forEach((row) => row.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      const li = row.parentElement, y = li.offsetTop, h = li.offsetHeight;
      if (!on) { gsap.set(hl, { y, height: h, scaleY: 0.6 }); gsap.to(hl, { autoAlpha: 1, scaleY: 1, duration: 0.45, ease: 'expo.out', overwrite: true }); }
      else gsap.to(hl, { y, height: h, autoAlpha: 1, scaleY: 1, duration: 0.5, ease: 'expo.out', overwrite: true });
      on = true;
    }));
    list.addEventListener('pointerleave', () => { on = false; gsap.to(hl, { autoAlpha: 0, scaleY: 0.85, duration: 0.35, ease: 'power2.out', overwrite: true }); });
  }
  // foto que segue o mouse sobre a lista de linhas (gira levemente conforme a velocidade)
  { const fl = $('.plist__float'), fi = fl && fl.querySelector('img'); let fx = innerWidth / 2, fy = innerHeight / 2, tx = fx, ty = fy, on = false;
    // decide a cada quadro o que está sob o cursor (o scroll tira a linha de baixo do mouse sem disparar 'leave')
    let cur = null, hasP = false;
    addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; hasP = e.pointerType === 'mouse'; }, { passive: true });
    document.addEventListener('mouseleave', () => (hasP = false));
    gsap.ticker.add(() => { if (!fl) return;
      const el = hasP ? document.elementFromPoint(tx, ty) : null, row = el && el.closest ? el.closest('.prow') : null;
      if (row !== cur) {
        cur = row;
        if (row) { if (fi.getAttribute('src') !== row.dataset.img) fi.src = row.dataset.img; gsap.to(fl, { opacity: 1, scale: 1, duration: 0.5, ease: 'expo.out', overwrite: true }); }
        else gsap.to(fl, { opacity: 0, scale: 0.6, duration: 0.35, ease: 'power2.in', overwrite: true });
      }
      const dx = tx - fx; fx += dx * 0.14; fy += (ty - fy) * 0.14;
      fl.style.left = fx + 'px'; fl.style.top = fy + 'px'; fl.style.rotate = Math.max(-14, Math.min(14, dx * 0.08)) + 'deg'; }); }
  // essência: a linha da rota se desenha com o scroll e acende cada parada
  { const ol = $('.ess-route ol'), items = $$('.ess-route li');
    const fitLine = () => { if (!ol || !items.length) return; const last = items[items.length - 1]; ol.style.setProperty('--line-end', (ol.offsetHeight - last.offsetTop - 13) + 'px'); };
    fitLine(); addEventListener('resize', fitLine); document.fonts && document.fonts.ready.then(fitLine);
    if (ol) ScrollTrigger.create({ trigger: ol, start: 'top 80%', end: 'bottom 55%', scrub: 0.6, onUpdate: (st) => {
      ol.style.setProperty('--draw', st.progress.toFixed(3));
      items.forEach((li, i) => li.classList.toggle('on', st.progress >= i / Math.max(1, items.length - 1) - 0.02));
    } });
    gsap.from('.ess-route li', { x: 30, autoAlpha: 0, stagger: 0.14, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.ess-route', start: 'top 85%' } }); }
  // essência: as camadas andam em velocidades diferentes
  gsap.fromTo('.essence__media .frame:nth-child(2)', { yPercent: 22 }, { yPercent: -14, ease: 'none', scrollTrigger: { trigger: '.essence__media', start: 'top bottom', end: 'bottom top', scrub: true } });
  // essência: parallax nas fotos
  $$('.essence .frame img').forEach((img, i) => gsap.fromTo(img, { yPercent: -8, scale: 1.18 }, { yPercent: 8, scale: 1.08, ease: 'none', scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } }));

  // essência: imagens com parallax interno e entrada por recorte
  $$('.frame img').forEach((img) => gsap.fromTo(img, { yPercent: -10 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
  gsap.from('.essence__media .frame', { clipPath: 'inset(30% 0% 0% 0% round 28px)', y: 60, stagger: 0.12, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.essence__media', start: 'top 85%' } });
  // história: o ano aparece contando (2000 → 2015) e os parágrafos sobem em seguida
  { const yb = $('.ess-year b');
    gsap.timeline({ scrollTrigger: { trigger: '.essence__story', start: 'top 85%' } })
      .from('.ess-year > *', { y: 24, autoAlpha: 0, stagger: 0.08, duration: 1, ease: 'expo.out' })
      .fromTo({ v: 2000 }, { v: 2000 }, { v: 2015, duration: 1.4, ease: 'power3.out', onUpdate() { yb.textContent = Math.round(this.targets()[0].v); } }, 0.1)
      .from('.essence__cols p', { y: 30, autoAlpha: 0, stagger: 0.12, duration: 1.1, ease: 'expo.out' }, 0.25); }

  // o pote 3D (fixo no fundo) some quando a seção seguinte já cobre a tela inteira; volta ao subir.
  // Evita que ele apareça por trás de áreas transparentes mais abaixo (ex.: transição do Passo Único para os cabelos)
  ScrollTrigger.create({ trigger: '.lines', start: 'top top', onEnter: () => (canvas.style.visibility = 'hidden'), onLeaveBack: () => (canvas.style.visibility = '') });
  // fotos dos cabelos carregam antes de a seção chegar (sem atraso para a primeira foto aparecer)
  ScrollTrigger.create({ trigger: '.pro', start: 'top 300%', once: true, onEnter: () => $$('.rail img').forEach((im) => { im.loading = 'eager'; if (im.decode) im.decode().catch(() => {}); }) });
  // profissional: frasco Passo Único em 3D
  const bottle = createBottle($('.pro__canvas'));
  const B = bottle.state;
  // celular: o frasco ocupa exatamente o espaço livre entre o menu e o texto (nunca fica por cima do texto)
  const fitB = () => {
    if (innerWidth > 760) return { y: -0.12, s: 1.05 };
    const cv = $('.pro__canvas').getBoundingClientRect(), cp = $('.pro__copy').getBoundingClientRect(), h = cv.height || innerHeight;
    const H = 2 * Math.tan(14 * Math.PI / 180) * 9.2, w2y = (p) => 0.15 + (0.5 - p / h) * H;   // pixel do canvas -> altura no mundo 3D
    const yT = w2y(84), yB = w2y(cp.top - cv.top - 28);
    return { y: (yT + yB) / 2, s: Math.min(1.05, Math.max(0.5, (yT - yB) / 2.62)) };
  };
  Object.assign(B, { x: 0, y: -1.1, rotY: 0, scale: 1.05, shadow: 0.7 });   // sempre de frente
  // o frasco sobe e gira no arco frontal; o título gigante desliza em sentidos opostos
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.pro', start: 'top bottom', end: 'top top', scrub: 1.2, invalidateOnRefresh: true } })   // chega ao lugar final quando a seção encosta no topo
    .to(B, { y: () => fitB().y, scale: () => fitB().s, duration: 0.5, ease: 'power2.out' }, 0)
    .to({}, { duration: 0.01 }, 0)
    .to({}, { duration: 0.01 }, 0);
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.pro', start: 'top bottom', end: 'bottom top', scrub: 1.5 } })
    .to({}, { duration: 1 }, 0);
  // contorno "Passo / Único": entra com o scroll (cada palavra de um lado) e sai com ele
  // (o movimento das palavras é um só, contínuo, criado junto com o zoom abaixo)
  if (false) gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.pro', start: 'top top', end: '+=100%', scrub: 0.8 } })
    .to('.pro__marquee p:first-child span', { xPercent: 110, ease: 'power2.in' }, 0)
    .to('.pro__marquee p:last-child span', { xPercent: -110, ease: 'power2.in' }, 0);
  // desktop: a seção prende e o frasco dá zoom até a tela ficar branca, revelando a próxima parte
  ScrollTrigger.matchMedia({ '(min-width: 0px)': () => {   // zoom no frasco também no celular
    const z = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.pro', start: 'bottom bottom', end: '+=80%', pin: true, pinSpacing: true, scrub: 0.6, invalidateOnRefresh: true } })
      .to('.pro__content', { autoAlpha: 0, duration: 0.25 }, 0)
      .fromTo(B, { zoom: 1, zoomY: 0 }, { zoom: () => 9 / fitB().s, zoomY: () => -4.6 - fitB().y, duration: 1, ease: 'power2.in', immediateRender: false }, 0)
      .to('.pro__flash', { opacity: 1, duration: 0.22, ease: 'power1.in' }, 0.62)
      // a próxima parte nasce de dentro do branco, já no lugar
      .fromTo('.rail__pin', { autoAlpha: 0, scale: 0.84 }, { autoAlpha: 1, scale: 1, duration: 0.2, ease: 'power3.out' }, 0.8);
    // "Passo" atravessa para a direita e "Único" para a esquerda num movimento só, do momento em que a seção
    // aparece até o fim do zoom: nunca para e nunca volta ao início
    const m = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.pro', start: 'top bottom', end: () => z.scrollTrigger.end, scrub: 0.8, invalidateOnRefresh: true } })
      .fromTo('.pro__marquee p:first-child span', { xPercent: -95 }, { xPercent: 95 }, 0)
      .fromTo('.pro__marquee p:last-child span', { xPercent: 95 }, { xPercent: -95 }, 0);
    // o frasco gira sem parar desde que a seção aparece, atravessa o zoom girando e termina exatamente de frente
    // (Let Me Be à mostra) no instante em que entra na próxima seção
    const rz = gsap.fromTo(B, { rotY: -Math.PI * 6 + 0.09 }, { rotY: 0.09, ease: 'power1.out', immediateRender: false,
      scrollTrigger: { trigger: '.pro', start: 'top bottom', end: () => z.scrollTrigger.start + (z.scrollTrigger.end - z.scrollTrigger.start) * 0.6, scrub: 0.5, invalidateOnRefresh: true } });   // acaba de girar no meio do zoom: o resto da aproximação já é com a logo perfeitamente de frente
    return () => { z.scrollTrigger && z.scrollTrigger.kill(); m.scrollTrigger && m.scrollTrigger.kill(); rz.scrollTrigger && rz.scrollTrigger.kill(); };
  } });
  gsap.from('.pro__copy > *, .pro__specs div', { y: 30, autoAlpha: 0, stagger: 0.08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.pro__content', start: 'top 90%' } });

  const WM_LEN = 1.6, WM_HOLD = 0.35;   // rolagem (em telas) da abertura da loura e da pausa com ela no centro antes de abrir
  let railDist = () => 0, trackST = null;
  // trilho horizontal
  const mm = gsap.matchMedia();
  mm.add('(min-width: 0px)', () => {   // mesmo carrossel no celular
    const track = $('.rail__track');
    // distância até o último cartão (aberto) ficar no centro da tela
    const dist = () => {
      const cs = [...track.children], n = cs.length, c0 = cs[0];
      const prev = cs.map((c) => c.style.transition); cs.forEach((c) => (c.style.transition = 'none'));
      const was = cs.map((c) => c.classList.contains('is-open'));
      cs.forEach((c) => c.classList.remove('is-open')); const wc = c0.offsetWidth;
      c0.classList.add('is-open'); const wo = c0.offsetWidth; c0.classList.remove('is-open');
      cs.forEach((c, k) => { c.classList.toggle('is-open', was[k]); c.style.transition = prev[k]; });
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      track.style.setProperty('padding-left', Math.max(16, innerWidth / 2 - wo / 2).toFixed(1) + 'px', 'important');   // o primeiro cartão (Cachos) começa no centro, sem nada à esquerda
      return Math.max(0, c0.offsetLeft + (n - 1) * (wc + gap) + wo / 2 - innerWidth / 2);
    };
    gsap.fromTo('.rail__ghost span', { xPercent: 0 }, { xPercent: -40, ease: 'none', scrollTrigger: { trigger: '.rail', start: 'top bottom', end: () => '+=' + (dist() + innerHeight * 2), scrub: 1.2, invalidateOnRefresh: true } });
    // carrossel em arco: cada cartão gira em perspectiva conforme a posição na tela; a velocidade abre o espaçamento
    { const cards = $$('.card'); let vs = 0, hov = null, act = null;
      // hover com uma pequena espera: o destaque só troca quando o mouse para sobre o cartão (sem trocas secas no caminho)
      let hovT = 0; cards.forEach((c) => { c.addEventListener('pointerenter', () => { clearTimeout(hovT); hovT = setTimeout(() => (hov = c), 130); }); c.addEventListener('pointerleave', () => { clearTimeout(hovT); if (hov === c) hovT = setTimeout(() => { if (hov === c) hov = null; }, 160); }); });
      const railSec = $('.rail');
      gsap.ticker.add(() => {
        { const rr = railSec.getBoundingClientRect(); if (rr.bottom < -50 || rr.top > innerHeight + 50) return; }   // fora da tela: não calcula nada
        // a foto sob o mouse (ou a do meio da tela) se expande
        let best = hov, bd = 1e9;
        const atEnd = trackST && trackST.progress > 0.96;   // fim do trilho: a loura é sempre a do destaque
        if (atEnd) best = cards[cards.length - 1];
        else if (!best) cards.forEach((c) => { const r = c.getBoundingClientRect(), dd = Math.abs(r.left + r.width / 2 - innerWidth / 2); if (dd < bd) { bd = dd; best = c; } });
        if (best && best !== act) {
          const ra = act && act.getBoundingClientRect(), da = ra ? Math.abs(ra.left + ra.width / 2 - innerWidth / 2) : 1e9;
          if (atEnd || hov || !act || bd < da - innerWidth * 0.08) { act && act.classList.remove('is-open'); best.classList.add('is-open'); act = best; }
        }
        const v = lenis ? lenis.velocity : 0; vs += (Math.max(-40, Math.min(40, v)) - vs) * 0.08;
        const cx = innerWidth / 2;
        cards.forEach((c) => {
          const r = c.getBoundingClientRect(); if (r.right < -200 || r.left > innerWidth + 200) return;
          const d = Math.max(-1.6, Math.min(1.6, (r.left + r.width / 2 - cx) / cx));
          c.style.transform = `perspective(1400px) translateX(${(d * Math.abs(vs) * 0.6).toFixed(1)}px) translateY(${(d * d * 34).toFixed(1)}px) rotateY(${(-d * 16).toFixed(2)}deg) rotateZ(${(d * 2.2).toFixed(2)}deg) scale(${(1 - Math.abs(d) * 0.06).toFixed(3)})`;
        });
      }); }
    // o trilho fica preso enquanto os cartões passam E enquanto o último (a loura) abre até a tela cheia
    ScrollTrigger.create({ trigger: '.rail', start: 'top top', end: () => '+=' + (dist() + innerHeight * (WM_LEN + WM_HOLD)), pin: '.rail__pin', anticipatePin: 1, invalidateOnRefresh: true });
    trackST = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.rail', start: 'top top', end: () => '+=' + dist(), scrub: 1, invalidateOnRefresh: true } }).scrollTrigger;
    railDist = dist;
    $$('.card:not(.card--wm) .card__img img').forEach((img) => gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: '.rail', start: 'top top', end: () => '+=' + dist(), scrub: true } }));
  });

  // assinatura: o cartão da loura (último do trilho) abre até a tela cheia; a frase gigante cruza e a logo surge no fim
  { const frame = $('.wordmark__frame'), hole = $('.card--wm .card__img'), wm = { p: 0 };
    gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.rail', start: () => 'top top-=' + Math.round(railDist() + innerHeight * WM_HOLD), end: () => '+=' + Math.round(innerHeight * WM_LEN), scrub: 0.8, invalidateOnRefresh: true } })
      .to(wm, { p: 1, duration: 0.45, ease: 'power2.inOut' }, 0)
      .fromTo('.wordmark__big span:first-child', { xPercent: -120 }, { xPercent: 0, duration: 0.45, ease: 'power3.out' }, 0.12)
      .fromTo('.wordmark__big span:last-child', { xPercent: 120 }, { xPercent: 0, duration: 0.45, ease: 'power3.out' }, 0.16)
      .to('.wordmark__big', { autoAlpha: 0, scale: 1.08, filter: 'blur(10px)', duration: 0.2 }, 0.68)
      .fromTo('.wordmark__logo', { clipPath: 'inset(100% 0% 0% 0%)', yPercent: 30 }, { clipPath: 'inset(0% 0% 0% 0%)', yPercent: 0, duration: 0.25, ease: 'power3.out' }, 0.74)
      .fromTo('.wordmark__line', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.2 }, 0.8);
    // a janela da foto acompanha o cartão enquanto ele passa e, depois, cresce até a tela inteira
    // enquanto passa, ela é um cartão igual aos outros; parado nela, o próprio cartão cresce até a tela inteira
    const cardEl = hole.closest('.card');
    gsap.ticker.add(() => {
      const e = wm.p;
      if (e < 0.001) { frame.style.visibility = 'hidden'; cardEl.style.visibility = ''; return; }
      const pr = frame.parentElement.getBoundingClientRect(), r = hole.getBoundingClientRect(), k = 1 - e;
      frame.style.visibility = 'visible'; cardEl.style.visibility = 'hidden';
      frame.style.setProperty('left', ((r.left - pr.left) * k).toFixed(1) + 'px', 'important');
      frame.style.setProperty('top', ((r.top - pr.top) * k).toFixed(1) + 'px', 'important');
      frame.style.setProperty('width', (r.width * k + pr.width * e).toFixed(1) + 'px', 'important');
      frame.style.setProperty('height', (r.height * k + pr.height * e).toFixed(1) + 'px', 'important');
      frame.style.setProperty('border-radius', ((parseFloat(getComputedStyle(hole).borderTopLeftRadius) || 22) * (1 - e * e * e)).toFixed(1) + 'px', 'important');   // borda arredondada como os cartões até quase ocupar a tela
      frame.style.pointerEvents = e > 0.98 ? 'auto' : 'none';
    }); }

  // fechamento
  // dúvidas: abre e fecha com animação de altura (uma por vez)
  $$('.faq details').forEach((d) => {
    const a = d.querySelector('.faq__a'), sm = d.querySelector('summary');
    sm.addEventListener('click', (e) => {
      e.preventDefault();
      if (d.open) {   // fechar: o bloco volta à cor normal e o "+" gira de volta na hora; só a resposta recolhe
        d.classList.add('is-closing');
        gsap.to(a, { height: 0, duration: 0.35, ease: 'power2.inOut', onComplete: () => { d.open = false; d.classList.remove('is-closing'); gsap.set(a, { clearProps: 'height' }); } }); return; }
      $$('.faq details[open]').forEach((o) => o !== d && o.querySelector('summary').click());
      d.open = true; gsap.fromTo(a, { height: 0 }, { height: 'auto', duration: 0.7, ease: 'expo.out' });
      gsap.fromTo(a.querySelector('p'), { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 0.85, duration: 0.6, delay: 0.1, ease: 'expo.out' });
    });
  });
  // surgimento padrão (GSAP) para tudo que ainda não tinha entrada própria
  const rv = ['.label', '.lines__foot > *', '.faq__head > *:not(.split)', '.faq details', '.essence__grid .label'];
  ScrollTrigger.batch($$(rv.join(',')), { start: 'top 90%', once: true,
    onEnter: (els) => gsap.fromTo(els, { y: 46, autoAlpha: 0, filter: 'blur(6px)' }, { y: 0, autoAlpha: 1, filter: 'blur(0px)', duration: 1.2, ease: 'expo.out', stagger: 0.08, overwrite: true }) });
  // depois do branco do zoom, as fotos surgem (antes disso a parte nem aparece)
  if (false) gsap.fromTo('.rail__pin', { autoAlpha: 0, y: 80, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, ease: 'power2.out', scrollTrigger: { trigger: '.rail', start: 'top 95%', end: 'top 40%', scrub: 1 } });
  gsap.utils.toArray('.card').forEach((c) => gsap.from(c.querySelector('.card__img'), { clipPath: 'inset(100% 0% 0% 0% round 22px)', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.rail', start: 'top 70%' } }));
  gsap.fromTo('.close__wordmark path', { strokeDasharray: 4000, strokeDashoffset: 4000 }, { strokeDashoffset: 0, ease: 'none', stagger: 0.04, scrollTrigger: { trigger: '.close__wordmark', start: 'top bottom', end: 'bottom bottom', scrub: 1 } });
  // rodapé: entrada em sequência (botão, títulos das colunas, links um a um, assinatura)
  gsap.timeline({ scrollTrigger: { trigger: '.close__card', start: 'top 70%', once: true } })
    .from('.close__btns .btn', { y: 30, autoAlpha: 0, scale: 0.94, duration: 1, ease: 'expo.out', stagger: 0.1 }, 0.2)
    .from('.close__grid h3', { x: -18, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.1 }, 0.35)
    .from('.close__grid a, .close__grid span', { y: 18, autoAlpha: 0, filter: 'blur(4px)', duration: 0.9, ease: 'expo.out', stagger: 0.035 }, 0.45)
    .from('.close__legal > *', { y: 14, autoAlpha: 0, duration: 0.8, ease: 'expo.out', stagger: 0.08 }, 0.9);
  gsap.from('.close__logo', { yPercent: 25, autoAlpha: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.close', start: 'top 75%' } });
}

/* ---------------- Idioma: troca sem perder a posição ---------------- */
$$('.lang button').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.lang === lang || langBusy) return;
  // troca só os textos: o menu, a posição e o 3D ficam exatamente como estão
  langBusy = true;
  const y = lenis ? lenis.scroll : window.scrollY;
  const keep = header.className;
  applyLang(b.dataset.lang); buildText(); measureHeader();
  $$('.split').forEach((el) => { if (el.dataset.shown || el.closest('.hero')) gsap.set(el._lines, { yPercent: 0 }); });
  ScrollTrigger.refresh();
  lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y);
  header.className = keep;
  requestAnimationFrame(() => requestAnimationFrame(() => { header.className = keep; lastY = y; langBusy = false; }));
}));

/* ---------------- Vidro interativo: reflexo, inclinação, onda e chips ---------------- */
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
$$('.glass').forEach((g) => {
  const rx = gsap.quickTo(g, 'rotationX', { duration: 0.6, ease: 'power3' });
  const ry = gsap.quickTo(g, 'rotationY', { duration: 0.6, ease: 'power3' });
  gsap.set(g, { transformPerspective: 900 });
  g.addEventListener('pointermove', (e) => {
    const r = g.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    g.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); g.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    if (fine && !reduce) { rx((0.5 - y) * 6); ry((x - 0.5) * 8); }
  });
  g.addEventListener('pointerleave', () => { rx(0); ry(0); });
  g.addEventListener('pointerdown', (e) => {
    if (reduce) return;
    const r = g.getBoundingClientRect(), d = Math.hypot(r.width, r.height) * 2;
    const wave = document.createElement('span'); wave.className = 'ripple';
    Object.assign(wave.style, { left: e.clientX - r.left + 'px', top: e.clientY - r.top + 'px', width: d + 'px', height: d + 'px' });
    g.appendChild(wave);
    gsap.fromTo(wave, { scale: 0, opacity: 1 }, { scale: 1, opacity: 0, duration: 0.9, ease: 'power2.out', onComplete: () => wave.parentNode && wave.parentNode.removeChild(wave) });
    gsap.fromTo(g, { scale: 0.98 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
  });
});
// cartões de ingredientes no celular: passam fechados com a rolagem; tocar abre (como o clique no computador)
let mobCards = null;
if (false) ScrollTrigger.matchMedia({ '(max-width: 900px)': () => {   // (antigo carrossel de cartões do celular, substituído pelo círculo)
  const list = $('.orbit__list'), dots = $$('.orbit__hint i'), chips = $$('.orbit .chip'), n = chips.length;
  let cur = -1, idx = -1, opened = -1;
  const place = () => {
    const g = 10, pad = 16, w0 = innerWidth * 0.5, w1 = innerWidth * 0.8;
    const center = pad + cur * (w0 + g) + (opened === cur ? w1 : w0) / 2;
    list.style.setProperty('--mx', Math.min(0, innerWidth / 2 - center).toFixed(1) + 'px');
    dots.forEach((d, k) => d.classList.toggle('on', k === cur));
  };
  const open = (k) => { opened = k; chips.forEach((c, i) => c.setAttribute('aria-expanded', String(i === k))); };
  const st = ScrollTrigger.create({ trigger: '.ingredients', start: 'top -25%', end: 'bottom 110%', invalidateOnRefresh: true,
    onUpdate: (self) => { const i = Math.min(n - 1, Math.floor(self.progress * n)); if (i !== idx) { idx = i; cur = i; open(-1); place(); } } });
  idx = 0; cur = 0; place();
  mobCards = { tap: (k) => { if (opened === k) open(-1); else { open(k); cur = k; } place(); } };
  addEventListener('resize', place);
  return () => { st.kill(); mobCards = null; removeEventListener('resize', place); list.style.removeProperty('--mx'); open(-1); };
} });
$$('.chip').forEach((c) => c.addEventListener('click', () => {
  if (mobCards) { mobCards.tap([...document.querySelectorAll('.orbit .chip')].indexOf(c)); return; }
  const open = c.getAttribute('aria-expanded') !== 'true';
  // celular: tocar assume o controle (o automático pausa enquanto há um aberto por toque)
  if (innerWidth <= 900) { window.__orbitManual = open; window.__orbitAutoReset && window.__orbitAutoReset([...document.querySelectorAll('.orbit .chip')].indexOf(c)); }
  $$('.chip').forEach((o) => o.setAttribute('aria-expanded', 'false'));
  c.setAttribute('aria-expanded', String(open));
  document.querySelector('.ingredients').classList.toggle('has-open', open);   // cartão aberto fica na frente do pote
  if (open && innerWidth <= 900 && window.__orbitFocus) window.__orbitFocus([...document.querySelectorAll('.orbit .chip')].indexOf(c));
}));

/* ---------------- Folhas do hero reagem ao mouse ----------------
   a folha não sai do lugar: só balança um pouco em volta do cabinho (preso na borda), como uma folha pendurada */
{ const leaves = $$('.hero__leaves .leaf').map((el) => ({ el, a: 0, va: 0, base: null, dir: el.closest('.leafg--l') ? 1 : -1 }));
  let mx = -1e4, my = -1e4, pmx = 0, pmy = 0, isMouse = false;
  addEventListener('pointermove', (e) => { isMouse = e.pointerType === 'mouse'; mx = e.clientX; my = e.clientY; }, { passive: true });
  document.addEventListener('mouseleave', () => { mx = my = -1e4; });
  gsap.ticker.add(() => {
    if (!leaves.length || reduce) return;
    const mvx = mx - pmx, mvy = my - pmy; pmx = mx; pmy = my;
    const moving = isMouse && Math.abs(mvx) + Math.abs(mvy) > 0.5 && Math.abs(mvx) + Math.abs(mvy) < 300;
    leaves.forEach((L) => {
      if (L.base === null) { const r = parseFloat(getComputedStyle(L.el).rotate); L.base = isNaN(r) ? 0 : r; }
      if (moving) {
        const r = L.el.getBoundingClientRect();
        if (r.bottom > 0 && mx > r.left && mx < r.right && my > r.top && my < r.bottom) {
          // mouse descendo empurra a ponta para baixo; subindo, para cima; de lado, um empurrãozinho conforme a altura do cursor
          const side = my < r.top + r.height / 2 ? 1 : -1;
          L.va += L.dir * Math.max(-0.35, Math.min(0.35, mvy * 0.012 + side * Math.abs(mvx) * 0.006));
        }
      }
      // mola bem suave (balança devagar e para)
      L.va += -L.a * 0.018; L.va *= 0.95; L.a += L.va;
      L.a = Math.max(-4.5, Math.min(4.5, L.a));
      if (Math.abs(L.a) + Math.abs(L.va) > 0.004) L.el.style.setProperty('rotate', (L.base + L.a).toFixed(3) + 'deg', 'important');
      else if (L.el.style.rotate) L.el.style.removeProperty('rotate');
    });
  });
}

/* ---------------- Acessibilidade: ícone ao lado do idioma abre o painel ---------------- */
{ const btn = $('.a11y-btn'), panel = $('.a11y-panel');
  const show = (o) => { btn.setAttribute('aria-expanded', String(o)); panel.classList.toggle('is-open', o); };
  btn.addEventListener('click', (e) => { e.stopPropagation(); show(btn.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('pointerdown', (e) => { if (!(e.target.closest && e.target.closest('.a11y'))) show(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') show(false); });
  addEventListener('scroll', () => { if (header.classList.contains('is-compact')) show(false); }, { passive: true });
}
/* ---------------- Acessibilidade (menu) ---------------- */
{ const KEY = 'lmb-a11y'; let st = {}; try { st = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  const btns = $$('.a11y-opt');
  const sync = () => btns.forEach((b) => b.setAttribute('aria-pressed', String(!!st[b.dataset.a11y])));
  sync();
  btns.forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.a11y; st[k] = !st[k];
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
    if (k === 'motion') { location.reload(); return; }   // menos movimento: recarrega já sem as animações contínuas
    document.documentElement.classList.toggle('a11y-' + k, !!st[k]); sync();
    ScrollTrigger.refresh();
  }));
}

// cartão de ingrediente aberto: tocar ou clicar fora fecha (e o resto volta ao normal)
document.addEventListener('pointerdown', (e) => {
  const open = document.querySelector('.orbit .chip[aria-expanded="true"]');
  if (!open || (e.target.closest && e.target.closest('.orbit .chip, .ing-pop'))) return;
  const k = [...document.querySelectorAll('.orbit .chip')].indexOf(open);
  open.setAttribute('aria-expanded', 'false');
  document.querySelector('.ingredients').classList.remove('has-open');
  window.__orbitManual = false; window.__orbitAutoReset && window.__orbitAutoReset(k);
});
addEventListener('keydown', (e) => { if (e.key === 'Escape') { const o = document.querySelector('.orbit .chip[aria-expanded="true"]'); if (o) { o.setAttribute('aria-expanded', 'false'); window.__orbitManual = false; } } });

/* ---------------- Voltar ao topo (com anel de progresso) ---------------- */
const toTop = $('.to-top'), ring = $('.to-top__ring');
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => {
  toTop.classList.toggle('is-visible', s.scroll() > innerHeight * 0.8);
  ring.style.strokeDashoffset = String(132 * (1 - s.progress));
} });
// voltar ao topo: uma cortina cobre a tela, a página pula para o início e a cortina sai
// (rolar suave por todas as cenas presas fazia o pote e os abacates "atropelarem" as animações)
let topBusy = false;
const curtain = document.createElement('div'); curtain.className = 'top-curtain'; document.body.appendChild(curtain);
// pulo com cortina: usado pelo "voltar ao topo" e pelos links do menu (a cena já aparece montada no destino)
window.__jumpTo = (y) => {
  if (topBusy) return; topBusy = true;
  gsap.timeline({ onComplete: () => { topBusy = false; } })
    .to(curtain, { autoAlpha: 1, duration: 0.35, ease: 'power2.in' })
    .add(() => {
      if (lenis) { lenis.stop(); lenis.scrollTo(y, { immediate: true, force: true }); lenis.start(); } else window.scrollTo(0, y);
      ScrollTrigger.update();
    })
    .to(curtain, { autoAlpha: 0, duration: 0.7, ease: 'power2.out', delay: 0.35 });   // tempo para o 3D assentar antes de mostrar
};
toTop.addEventListener('click', () => window.__jumpTo(0));
