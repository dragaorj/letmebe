/* Let Me Be — orquestração (GSAP + Lenis + 3D) */
import { createStage } from './stage3d.js';
import { createScene as createBottle } from './scene.js';

const { gsap, ScrollTrigger, SplitText, Lenis } = window;
gsap.registerPlugin(ScrollTrigger, SplitText);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    .fromTo([tk, '.hero__meta', '.hero__side'], { y: 18, autoAlpha: 0, filter: 'blur(6px)' }, { y: 0, autoAlpha: 1, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out', stagger: 0.07 });
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
    const sa = SplitText.create(a, { type: 'chars', charsClass: 'c' }), sb = SplitText.create(b, { type: 'chars', charsClass: 'c' }); splitsNow = [sa, sb];
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

// ---------- Menu mobile ----------
const burger = $('.burger'), mnav = $('.mnav');
function setMenu(open) {
  document.documentElement.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', open); mnav.setAttribute('aria-hidden', !open);
  burger.setAttribute('aria-label', DICT[document.documentElement.lang === 'en' ? 'en' : 'pt'][open ? 'nav.close' : 'nav.open']);
  if (open) { lenis && lenis.stop(); header.classList.remove('is-hidden');
    gsap.fromTo('.mnav__list a', { y: 50, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.06, duration: 1, ease: 'expo.out', delay: 0.2 });
    gsap.fromTo('.mnav__foot > *', { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.08, duration: 0.9, ease: 'expo.out', delay: 0.5 });
  } else lenis && lenis.start();
}
burger.addEventListener('click', () => setMenu(!document.documentElement.classList.contains('menu-open')));
addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
$$('.mnav a[href^="#"]').forEach((l) => l.addEventListener('click', () => setMenu(false), true));
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href'); const t = id.length > 1 && $(id); if (!t) return;
  e.preventDefault(); lenis ? lenis.scrollTo(t, { duration: 1.6 }) : t.scrollIntoView({ behavior: 'smooth' });
}));

/* ---------------- Header ---------------- */
const header = $('.header'); let lastY = 0, langBusy = false;
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => {
  if (langBusy) return;   // troca de idioma não mexe no menu
  const y = s.scroll();
  header.classList.toggle('is-compact', y > 80);
  root.classList.toggle('past-hero', y > 80);   // no primeiro scroll os textos e o CTA do hero saem (o CTA vai para o menu)
  const hc = header.querySelector('.header__cta'); if (hc) hc.tabIndex = y > 80 ? 0 : -1;   // ao rolar, o menu vira uma pílula flutuante
  if (y > 500 && y > lastY + 6) header.classList.add('is-hidden');
  else if (y < lastY - 6 || y < 500) header.classList.remove('is-hidden');
  lastY = y;
} });

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
function tryStart() {
  if (started || !ready.model || !ready.draw || !ready.fonts) return;
  started = true;
  stage.resetSpin && stage.resetSpin();   // o pote sempre aparece de frente, com a logo Let Me Be visível
  buildText();
  gsap.timeline({ delay: 0.15 })
    .to(bar, { scaleX: 1, duration: 0.3 })
    .to('.loader', { autoAlpha: 0, duration: 0.9, ease: 'power2.inOut' })
    .add(() => { document.body.classList.remove('is-loading'); $('.loader').remove(); lenis && lenis.start(); canvas.classList.add('is-ready'); ScrollTrigger.refresh(); }, '-=0.4')
    .from('.header > *', { y: -24, autoAlpha: 0, stagger: 0.08, duration: 0.9, ease: 'expo.out' }, '-=0.3')
    .from('.hero__w.is-on', { yPercent: 45, opacity: 0, filter: 'blur(10px)', duration: 1.6, ease: 'expo.out', clearProps: 'transform,opacity,filter' }, '<')
    .fromTo('.hero__foot > *', { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', stagger: 0.08, clearProps: 'transform,opacity,visibility' }, '<0.3')
    .to(S, { y: innerWidth <= 760 ? -0.55 : -0.3, duration: 1.8, ease: 'expo.out', onComplete() { this.kill(); } }, '<');   // no celular o pote sobe um pouco
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
    const s = SplitText.create(el, { type: 'words', wordsClass: 'w' }); splits.push(s);
    const big = el.classList.contains('manifesto__line');
    if (big) {
      // oclusão: as palavras sobem de trás da máscara de cada linha, vindo do lado da frase
      splits.pop().revert();
      el.innerHTML = el.innerHTML.replace(/ ([^ ]+)\s*$/, ' $1');   // nunca deixa a última palavra sozinha na linha
      const m = SplitText.create(el, { type: 'lines,words', linesClass: 'ml', wordsClass: 'w' }); splits.push(m);
      const fromR = el.classList.contains('manifesto__line--r');
      textST.push(gsap.fromTo(m.words, { yPercent: 115, rotate: fromR ? -4 : 4, xPercent: fromR ? 12 : -12 }, { yPercent: 0, rotate: 0, xPercent: 0, stagger: 0.06, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%', end: 'center 62%', scrub: 0.8 } }).scrollTrigger);
      textST.push(gsap.fromTo(el, { opacity: 1 }, { opacity: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'center 38%', end: 'bottom 5%', scrub: true } }).scrollTrigger);
      return;
    }
    const tw = gsap.fromTo(s.words, { opacity: 0.18 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 75%', end: 'bottom 40%', scrub: true } });
    textST.push(tw.scrollTrigger);
  });
}

/* ---------------- Coreografia ---------------- */
function buildScroll() {
  const vh = () => innerHeight;
  const TAU = Math.PI * 2;
  // linha do tempo do pote, medida em "telas" ao longo de .story
  const tl = gsap.timeline({ defaults: { ease: 'none' },
    scrollTrigger: { trigger: '.story', start: 'top top', end: 'bottom bottom', scrub: 1.1,
      onLeave: () => stage.pause(), onEnterBack: () => stage.resume() } });
  // 1 · Hero: desenrosca a tampa, creme cresce, abacates explodem (pico)
  const MOB = innerWidth <= 760, HERO_Y = MOB ? -0.55 : -0.3, SH = 2.6;   // SH: duração extra do manifesto
  // trava a posição do hero dentro da própria linha do tempo (ao voltar ao topo o pote volta ao lugar certo)
  tl.fromTo(S, { y: HERO_Y, x: 0 }, { y: HERO_Y, x: 0, duration: 1, immediateRender: false }, 0)
    .to(S, { spin: 0, duration: 0.15 }, 0)
    .to(S, { open: 1, duration: 0.75, ease: 'power1.inOut' }, 0)
    .to(S, { cream: 1, duration: 0.5 }, 0.4)
    .to(S, { burst: 1, duration: 0.6, ease: 'none' }, 0.55)
    .to(S, { rotY: 0.1, scale: 0.95, duration: 1 }, 0)
    .to('.hero__title', { yPercent: -30, scale: 0.92, autoAlpha: 0, duration: 0.6 }, 0.5)
    .to('.hero__foot', { autoAlpha: 0, y: 30, duration: 0.35 }, 0.7)
  // 2 · Manifesto: pote ao centro, órbita larga, um giro completo
    .fromTo(S, { y: HERO_Y }, { immediateRender: false, x: 0, y: MOB ? -1.25 : 0, scale: 0.88, orbit: 1.25, duration: 0.8, ease: 'power2.inOut' }, 1.0)   // celular: pote na metade de baixo, texto em cima
    .to(S, { rotY: 0.1 + TAU, duration: 1.4 + SH, ease: 'power1.inOut' }, 1.0)
    .to(S, { lidAway: 1, duration: 0.6, ease: 'power2.in' }, 1.0)
    .to(root, { '--sky': '#ECECEA', duration: 0.6 }, 1.0)
  // 3 · Ingredientes: céu verde profundo, abacates formam o arco
    .to(root, { '--sky': '#D1D5BB', '--glow': 0.6, duration: 0.5 }, 3.1 + SH)
    .to(S, { gather: 1, scale: innerWidth <= 760 ? 1 : 0.86, y: innerWidth <= 760 ? 0.35 : 0.25, shadow: 0, orbit: 1, duration: 1.5, ease: 'power1.inOut' }, 2.7 + SH)
    .to(S, { rotY: 0.1 + TAU + 0.5, duration: 2.2 }, 3.1 + SH)
  // 4 · Textura: abacates recolhem, pote vira o creme para a câmera
    .to(S, { gather: 0, burst: 0, duration: MOB ? 1.7 : 0.7, ease: MOB ? 'power1.inOut' : 'power2.in' }, (MOB ? 3.9 : 5.5) + SH)   // celular: os abacates voltam para o pote enquanto os cartões passam
    .to(root, { '--sky': '#DCDAD6', '--glow': 0.45, duration: 0.5 }, 5.5 + SH)
    .to(S, { face: 1, x: 0, y: 0, scale: 1.0, rotY: TAU, shadow: 0.1, duration: 0.9, ease: 'power2.inOut' }, 5.6 + SH)
    .to(S, { face: 1, duration: 0.7 }, 6.5 + SH);
  // header claro sobre o fundo escuro
  // menu claro sempre que o que está atrás dele for escuro (Passo Único e rodapé)
  { const darks = [$('.pro'), $('.close__card')]; gsap.ticker.add(() => { const y = 40; header.classList.toggle('on-dark', darks.some((el) => { const r = el.getBoundingClientRect(); return r.top <= y && r.bottom >= y; })); }); }

  // chips de ingredientes
  gsap.from('.orbit__ring circle', { scale: 0.6, autoAlpha: 0, transformOrigin: '50% 50%', stagger: 0.12, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.ingredients', start: 'top 30%' } });
  gsap.from('.orbit__item .chip', { autoAlpha: 0, stagger: 0.12, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.ingredients', start: 'top 20%' } });
  // o texto circular acompanha o creme (centro, raio e perspectiva)
  const ringEl = $('.texture__ring'), texTitle = $('.texture__title'), ingTitle = $('.ingredients__title'), orbitBox = $('.orbit');
  const clamp = (v) => Math.max(0, Math.min(1, v));
  let hintA = 1, lastKneadT = -1e9;
  gsap.ticker.add(() => {
    // visibilidade amarrada ao 3D: nada aparece fora de hora
    const k = clamp((S.face - 0.82) / 0.18);
    // a dica (texto + seta) some enquanto mexe no creme e volta 2 s depois de soltar
    const now = performance.now(); const busy = stage.interacting; if (busy) lastKneadT = now;
    hintA += ((now - lastKneadT > 1200 ? 1 : 0) - hintA) * (busy ? 0.25 : 0.06);   // some ao interagir; volta depois que o pote se acomoda
    ringEl.style.opacity = k * hintA; texTitle.style.opacity = k;
    const g = clamp(S.gather * 1.5);
    ingTitle.style.opacity = g; orbitBox.style.opacity = g;
    if (S.face < 0.05) return;
    const c = stage.creamScreen(); if (!c) return;
    const w = c.rx * 1.8;   // texto rente à borda interna do creme
    ringEl.style.left = c.x + 'px'; ringEl.style.top = c.y + 'px'; ringEl.style.width = w + 'px';
    ringEl.style.transform = `translate(-50%,-50%) scaleY(${Math.min(1, c.ry / c.rx).toFixed(3)})`;
  });
  // anéis e ingredientes centralizados exatamente no pote
  const orbitEl = $('.orbit');
  gsap.ticker.add(() => {
    if (!orbitEl || innerWidth <= 900 || S.gather < 0.02) return;
    const j = stage.jarScreen();
    orbitEl.style.left = j.x + 'px'; orbitEl.style.top = j.y + 'px';
  });
  // círculo de ingredientes gira com o scroll
  // ingredientes orbitam o pote sem parar; pausam no hover ou com um item aberto
  const orbitList = $('.orbit__list'); let orbitRot = 0, orbitHold = false;
  orbitList.addEventListener('pointerenter', () => (orbitHold = true));
  orbitList.addEventListener('pointerleave', () => (orbitHold = false));
  gsap.ticker.add((t, dt) => {
    if (innerWidth <= 900) return;
    const isOpen = orbitList.querySelector('.chip[aria-expanded="true"]');
    if (!orbitHold && !isOpen && !reduce) orbitRot = (orbitRot + dt * 0.006) % 360;
    orbitList.style.setProperty('--rot', orbitRot.toFixed(2) + 'deg');
  });

  // cards de linhas
  gsap.from('.prow', { y: 60, autoAlpha: 0, stagger: 0.08, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.plist', start: 'top 85%' } });
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
  gsap.from('.essence__cols p', { y: 30, autoAlpha: 0, stagger: 0.1, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.essence__cols', start: 'top 85%' } });

  // profissional: frasco Passo Único em 3D
  const bottle = createBottle($('.pro__canvas'));
  const B = bottle.state;
  Object.assign(B, { x: 0, y: -1.1, rotY: 0, scale: 1.05, shadow: 0.7 });   // sempre de frente
  // o frasco sobe e gira no arco frontal; o título gigante desliza em sentidos opostos
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.pro', start: 'top bottom', end: 'bottom top', scrub: 1.2, invalidateOnRefresh: true } })
    .to(B, { y: -0.12, duration: 0.5, ease: 'power2.out' }, 0)
    .to({}, { duration: 0.01 }, 0)
    .to({}, { duration: 0.01 }, 0);
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.pro', start: 'top bottom', end: 'bottom top', scrub: 1.5 } })
    .to({}, { duration: 1 }, 0);
  // contorno "Passo / Único": entra com o scroll (cada palavra de um lado) e sai com ele
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.pro', start: 'top bottom', end: 'top top', scrub: 0.8 } })
    .fromTo('.pro__marquee p:first-child span', { xPercent: -110 }, { xPercent: 0, ease: 'power2.out' }, 0)
    .fromTo('.pro__marquee p:last-child span', { xPercent: 110 }, { xPercent: 0, ease: 'power2.out' }, 0);
  if (innerWidth <= 760) gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.pro', start: 'top top', end: '+=100%', scrub: 0.8 } })
    .to('.pro__marquee p:first-child span', { xPercent: 110, ease: 'power2.in' }, 0)
    .to('.pro__marquee p:last-child span', { xPercent: -110, ease: 'power2.in' }, 0);
  // desktop: a seção prende e o frasco dá zoom até a tela ficar branca, revelando a próxima parte
  ScrollTrigger.matchMedia({ '(min-width: 761px)': () => {
    const z = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.pro', start: 'bottom bottom', end: '+=80%', pin: true, pinSpacing: true, scrub: 0.6, invalidateOnRefresh: true } })
      .to('.pro__content', { autoAlpha: 0, duration: 0.25 }, 0)
      .to('.pro__marquee p:first-child span', { xPercent: 110, duration: 0.45, ease: 'power2.in' }, 0)
      .to('.pro__marquee p:last-child span', { xPercent: -110, duration: 0.45, ease: 'power2.in' }, 0)
      .to(B, { scale: 9, y: -4.6, rotY: 0, duration: 1, ease: 'power2.in' }, 0)
      .to('.pro__flash', { opacity: 1, duration: 0.22, ease: 'power1.in' }, 0.62)
      // a próxima parte nasce de dentro do branco, já no lugar
      .fromTo('.rail__pin', { autoAlpha: 0, scale: 0.84 }, { autoAlpha: 1, scale: 1, duration: 0.2, ease: 'power3.out' }, 0.8);
    return () => z.scrollTrigger && z.scrollTrigger.kill();
  } });
  gsap.from('.pro__copy > *, .pro__specs div', { y: 30, autoAlpha: 0, stagger: 0.08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.pro__content', start: 'top 90%' } });

  // trilho horizontal
  const mm = gsap.matchMedia();
  mm.add('(min-width: 761px)', () => {
    const track = $('.rail__track'); const dist = () => track.scrollWidth - innerWidth + 40;
    gsap.fromTo('.rail__ghost span', { xPercent: 0 }, { xPercent: -40, ease: 'none', scrollTrigger: { trigger: '.rail', start: 'top bottom', end: () => '+=' + (dist() + innerHeight * 2), scrub: 1.2, invalidateOnRefresh: true } });
    // carrossel em arco: cada cartão gira em perspectiva conforme a posição na tela; a velocidade abre o espaçamento
    { const cards = $$('.card'); let vs = 0, hov = null, act = null;
      cards.forEach((c) => { c.addEventListener('pointerenter', () => (hov = c)); c.addEventListener('pointerleave', () => { if (hov === c) hov = null; }); });
      gsap.ticker.add(() => {
        // a foto sob o mouse (ou a do meio da tela) se expande
        let best = hov, bd = 1e9;
        if (!best) cards.forEach((c) => { const r = c.getBoundingClientRect(), dd = Math.abs(r.left + r.width / 2 - innerWidth / 2); if (dd < bd) { bd = dd; best = c; } });
        if (best && best !== act) {
          const ra = act && act.getBoundingClientRect(), da = ra ? Math.abs(ra.left + ra.width / 2 - innerWidth / 2) : 1e9;
          if (hov || !act || bd < da - innerWidth * 0.08) { act && act.classList.remove('is-open'); best.classList.add('is-open'); act = best; }
        }
        const v = lenis ? lenis.velocity : 0; vs += (Math.max(-40, Math.min(40, v)) - vs) * 0.08;
        const cx = innerWidth / 2;
        cards.forEach((c) => {
          const r = c.getBoundingClientRect(); if (r.right < -200 || r.left > innerWidth + 200) return;
          const d = Math.max(-1.6, Math.min(1.6, (r.left + r.width / 2 - cx) / cx));
          c.style.transform = `perspective(1400px) translateX(${(d * Math.abs(vs) * 0.6).toFixed(1)}px) translateY(${(d * d * 34).toFixed(1)}px) rotateY(${(-d * 16).toFixed(2)}deg) rotateZ(${(d * 2.2).toFixed(2)}deg) scale(${(1 - Math.abs(d) * 0.06).toFixed(3)})`;
        });
      }); }
    gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.rail', start: 'top top', end: () => '+=' + dist(), pin: '.rail__pin', scrub: 1, invalidateOnRefresh: true } });
    $$('.card__img img').forEach((img) => gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: '.rail', start: 'top top', end: () => '+=' + dist(), scrub: true } }));
  });

  // assinatura: a foto abre de uma janela até a tela cheia, a frase gigante cruza e a logo surge no fim
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.wordmark', start: 'top top', end: '+=160%', pin: true, scrub: 0.8, invalidateOnRefresh: true } })
    .fromTo('.wordmark__frame', { clipPath: 'inset(18% 28% 18% 28% round 36px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 0.45, ease: 'power2.inOut' }, 0)
    .fromTo('.wordmark__frame img', { scale: 1.35, yPercent: -6 }, { scale: 1, yPercent: 0, duration: 1 }, 0)
    .fromTo('.wordmark__big span:first-child', { xPercent: -120 }, { xPercent: 0, duration: 0.45, ease: 'power3.out' }, 0.12)
    .fromTo('.wordmark__big span:last-child', { xPercent: 120 }, { xPercent: 0, duration: 0.45, ease: 'power3.out' }, 0.16)
    .to('.wordmark__big', { autoAlpha: 0, scale: 1.08, filter: 'blur(10px)', duration: 0.2 }, 0.68)
    .fromTo('.wordmark__logo', { clipPath: 'inset(100% 0% 0% 0%)', yPercent: 30 }, { clipPath: 'inset(0% 0% 0% 0%)', yPercent: 0, duration: 0.25, ease: 'power3.out' }, 0.74)
    .fromTo('.wordmark__line', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.2 }, 0.8);
  // leve parallax do mouse na foto
  { const wi = $('.wordmark__frame img'); addEventListener('pointermove', (e) => { gsap.to(wi, { x: (e.clientX / innerWidth - 0.5) * -24, y: (e.clientY / innerHeight - 0.5) * -16, duration: 1.2, ease: 'power3.out', overwrite: 'auto' }); }, { passive: true }); }

  // fechamento
  // dúvidas: abre e fecha com animação de altura (uma por vez)
  $$('.faq details').forEach((d) => {
    const a = d.querySelector('.faq__a'), sm = d.querySelector('summary');
    sm.addEventListener('click', (e) => {
      e.preventDefault();
      if (d.open) { gsap.to(a, { height: 0, duration: 0.5, ease: 'power3.inOut', onComplete: () => { d.open = false; gsap.set(a, { clearProps: 'height' }); } }); return; }
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
  if (innerWidth <= 760) gsap.fromTo('.rail__pin', { autoAlpha: 0, y: 80, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, ease: 'power2.out', scrollTrigger: { trigger: '.rail', start: 'top 95%', end: 'top 40%', scrub: 1 } });
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
  applyLang(b.dataset.lang); buildText();
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
// cartões de ingredientes no celular: o scroll vertical desliza os cartões para o lado
ScrollTrigger.matchMedia({ '(max-width: 900px)': () => {
  const list = $('.orbit__list'), dots = $$('.orbit__hint i');
  const dist = () => Math.max(0, list.scrollWidth - innerWidth);
  const st = ScrollTrigger.create({ trigger: '.ingredients', start: 'top -25%', end: 'bottom 110%', scrub: 0.6, invalidateOnRefresh: true,
    onUpdate: (self) => {
      list.style.setProperty('--mx', (-dist() * self.progress).toFixed(1) + 'px');
      const i = Math.round(self.progress * (dots.length - 1)); dots.forEach((d, k) => d.classList.toggle('on', k === i));
    } });
  return () => { st.kill(); list.style.removeProperty('--mx'); };
} });
$$('.chip').forEach((c) => c.addEventListener('click', () => {
  const open = c.getAttribute('aria-expanded') !== 'true';
  $$('.chip').forEach((o) => o.setAttribute('aria-expanded', 'false'));
  c.setAttribute('aria-expanded', String(open));
  document.querySelector('.ingredients').classList.toggle('has-open', open);   // cartão aberto fica na frente do pote
}));

/* ---------------- Voltar ao topo (com anel de progresso) ---------------- */
const toTop = $('.to-top'), ring = $('.to-top__ring');
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => {
  toTop.classList.toggle('is-visible', s.scroll() > innerHeight * 0.8);
  ring.style.strokeDashoffset = String(132 * (1 - s.progress));
} });
toTop.addEventListener('click', () => { lenis ? lenis.scrollTo(0, { duration: 2.2 }) : window.scrollTo({ top: 0, behavior: 'smooth' }); });
