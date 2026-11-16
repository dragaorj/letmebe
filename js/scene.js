/* Cena 3D — frasco Passo Único Let Me Be
   O estado (state) é animado pelo GSAP/ScrollTrigger em main.js */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { studioEnvironment } from './studio.js';

export function createScene(canvas, { onProgress, onLoad } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0.15, 10.2);

  // Iluminação de estúdio: ambiente para reflexos + key/rim suaves
  scene.environment = studioEnvironment(renderer, { dark: [0.2, 0.24, 0.22], light: [0.75, 0.8, 0.76] });
  scene.environmentIntensity = 0.75;
  const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(-5, 4, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfeee5, 2.6); rim.position.set(5, 3, -4); scene.add(rim);
  const warm = new THREE.DirectionalLight(0xffe9c8, 0.5); warm.position.set(4, -2, 5); scene.add(warm);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9c2b4, 0.35));

  // Estado animável
  const state = {
    x: 0, y: -3.2, z: 0, rotY: -0.35, rotX: 0.04, rotZ: 0, scale: 1,
    capLift: 0, capSpin: 0, capTilt: 0, burst: 0, shadow: 1, idle: 1
  };

  const root = new THREE.Group(); scene.add(root);
  const tilt = new THREE.Group(); root.add(tilt);
  let model, cap, capBaseY = 0;

  // Sombra de contato (textura radial)
  const shCanvas = document.createElement('canvas'); shCanvas.width = shCanvas.height = 256;
  const g = shCanvas.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,70,60,0.42)'); grd.addColorStop(0.45, 'rgba(0,70,60,0.16)'); grd.addColorStop(1, 'rgba(0,70,60,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shCanvas), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.scale.set(1, 0.55, 1); root.add(shadow);

  // ---------- Partículas "brilho" (estrela de 4 pontas da marca) ----------
  const N = 36;
  const pGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), alpha = new Float32Array(N);
  const seeds = [];
  const palette = [new THREE.Color('#BFA777'), new THREE.Color('#E9D9B0'), new THREE.Color('#ffffff')];
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, spread = 0.15 + Math.random() * 0.8;
    seeds.push({
      dx: Math.cos(a) * spread, dz: Math.sin(a) * spread * 0.6,
      up: 0.4 + Math.random() * 1.4, delay: Math.random() * 0.45, wob: Math.random() * 6.28,
      s: 4 + Math.random() * 9
    });
    const c = palette[i % palette.length]; col.set([c.r, c.g, c.b], i * 3);
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  pGeo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  pGeo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uPR: { value: renderer.getPixelRatio() }, uTime: { value: 0 } },
    vertexShader: `
      attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
      varying vec3 vColor; varying float vAlpha; varying float vRot;
      uniform float uPR; uniform float uTime;
      void main(){
        vColor=aColor; vAlpha=aAlpha; vRot=uTime*0.6+aSize;
        vec4 mv=modelViewMatrix*vec4(position,1.0);
        gl_PointSize=aSize*uPR*(10.0/-mv.z);
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader: `
      varying vec3 vColor; varying float vAlpha; varying float vRot;
      void main(){
        vec2 p=gl_PointCoord-0.5;
        float c=cos(vRot), s=sin(vRot); p=mat2(c,-s,s,c)*p;
        float r=length(p);
        // estrela de 4 pontas com cintura côncava (como o brilho do logo)
        float star=1.0-smoothstep(0.0,0.5,pow(abs(p.x),0.55)+pow(abs(p.y),0.55)-0.12);
        float glow=exp(-r*9.0)*0.6;
        float a=clamp(star+glow,0.0,1.0)*vAlpha;
        if(a<0.01) discard;
        gl_FragColor=vec4(vColor,a);
      }`
  });
  const points = new THREE.Points(pGeo, pMat); points.frustumCulled = false; tilt.add(points);

  // ---------- Carrega o frasco ----------
  const draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  loader.load('assets/3d/bottle.glb', (gltf) => {
    model = gltf.scene;
    model.traverse((o) => {
      if (!o.isMesh) return;
      const m = o.material;
      for (const k of ['map', 'normalMap', 'metalnessMap', 'roughnessMap']) if (m[k]) m[k].anisotropy = maxAniso;
      m.envMapIntensity = 1;
      if (o.name.startsWith('Label')) { m.transparent = true; m.polygonOffset = true; m.polygonOffsetFactor = -2; o.renderOrder = 2; }
      if (o.name.startsWith('LogoEmboss')) { m.polygonOffset = true; m.polygonOffsetFactor = -1; if (m.normalScale) m.normalScale.set(1.4, 1.4); }
    });
    cap = model.getObjectByName('Cap');
    capBaseY = cap.position.y;

    model.position.y = -1.26;          // centraliza (frasco ~2,52 de altura)
    tilt.add(model);
    shadow.position.y = -1.27;
    points.position.y = -1.26;
    onLoad && onLoad();
  }, (e) => { if (e.total) onProgress && onProgress(e.loaded / e.total); });

  // ---------- Mouse (parallax suave) ----------
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.tx = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
  }, { passive: true });
  canvas.addEventListener('pointerleave', () => { mouse.tx = 0; mouse.ty = 0; });
  // arrastar: gira o frasco em qualquer direção; ao soltar, ele volta sozinho para a posição normal
  const grab = { on: false, lx: 0, ly: 0, x: 0, y: 0 };
  canvas.addEventListener('pointerdown', (e) => { grab.on = true; grab.lx = e.clientX; grab.ly = e.clientY; canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-grab'); });
  canvas.addEventListener('pointermove', (e) => {
    if (!grab.on) return;
    grab.y += (e.clientX - grab.lx) * 0.011; grab.x = Math.max(-1.1, Math.min(1.1, grab.x + (e.clientY - grab.ly) * 0.008));
    grab.lx = e.clientX; grab.ly = e.clientY;
  });
  const letGo = () => { grab.on = false; canvas.classList.remove('is-grab'); };
  canvas.addEventListener('pointerup', letGo); canvas.addEventListener('pointercancel', letGo);

  // ---------- Resize (pelo tamanho do próprio canvas) ----------
  let mobile = false;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 0.9 ? 6.3 : 7.4;   // celular: frasco grande na tela
    camera.updateProjectionMatrix();
    pMat.uniforms.uPR.value = renderer.getPixelRatio();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  // ---------- Loop ----------
  let running = true; const clock = new THREE.Clock();
  const CAP_TOP = 2.05; // altura do gargalo (espaço do modelo)
  function updateParticles(t) {
    const b = state.burst;
    for (let i = 0; i < N; i++) {
      const s = seeds[i];
      const k = THREE.MathUtils.clamp((b - s.delay) / (1 - s.delay), 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      pos[i * 3] = s.dx * e + Math.sin(t * 0.8 + s.wob) * 0.05 * k;
      pos[i * 3 + 1] = CAP_TOP + 0.15 + s.up * e + Math.sin(t + s.wob) * 0.04 * k;
      pos[i * 3 + 2] = s.dz * e + 0.2 * k;
      alpha[i] = Math.sin(Math.PI * Math.min(k * 1.15, 1)) * (k > 0 ? 1 : 0);
      size[i] = s.s * (0.4 + 0.6 * Math.sin(Math.PI * Math.min(k, 1)));
    }
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.aAlpha.needsUpdate = true; pGeo.attributes.aSize.needsUpdate = true;
  }
  function frame() {
    if (!running) return;
    const t = clock.getElapsedTime();
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    const sc = state.scale;
    root.position.set(state.x, state.y + Math.sin(t * 1.1) * 0.04 * state.idle, state.z);
    root.scale.setScalar(sc);
    if (!grab.on) { grab.x *= 0.9; grab.y *= 0.9; }
    tilt.rotation.set(state.rotX + mouse.y * 0.04 + grab.x, state.rotY + mouse.x * 0.1 + grab.y, state.rotZ - mouse.x * 0.05);
    shadow.material.opacity = state.shadow;

    pMat.uniforms.uTime.value = t;
    updateParticles(t);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  new IntersectionObserver(([en]) => { if (en.isIntersecting) { if (!running) { running = true; requestAnimationFrame(frame); } } else running = false; }).observe(canvas);

  return {
    state,
    pause() { running = false; },
    resume() { if (!running) { running = true; requestAnimationFrame(frame); } },
    get isMobile() { return mobile; }
  };
}
