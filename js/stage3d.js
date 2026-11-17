/* Palco 3D fixo — Máscara de Abacate Let Me Be
   O pote atravessa a página: abre, solta abacates em espiral, mostra o creme.
   Interação: o pote inclina para o cursor; arraste gira; clique/arraste no creme deforma. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { TIER, rendererOpts, autoScale } from './perf.js';

const DRACO = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/';
const ease = (t) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

export function createStage(canvas, { onProgress, onLoad } = {}) {
  const renderer = new THREE.WebGLRenderer(rendererOpts(canvas));
  const quality = autoScale(renderer);   // resolução se ajusta sozinha para manter a fluidez
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  // sombra suave igual em todos; em aparelhos modestos o mapa é menor com o desfoque proporcional (mesmo resultado)
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 80);

  // Estúdio fotográfico virtual: cúpula em degradê + softboxes (faixas de reflexo no vidro)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new THREE.Scene();
  {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(20, 48, 24), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = mix(vec3(0.10,0.13,0.12), vec3(0.62,0.68,0.64), smoothstep(-0.4, 0.8, h)); gl_FragColor = vec4(c,1.0); }'
    }));
    studio.add(dome);
    const box = (w, h, x, y, z, k, col = 0xffffff) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0.6, 0); studio.add(m);
    };
    box(2.2, 9, -7, 2, 4, 6);          // strip lateral esquerdo (reflexo vertical longo)
    box(1.4, 9, 7.5, 2, 2, 4.5);       // strip direito
    box(10, 4, 0, 10, 0, 3.5);         // teto
    box(3, 7, 3, 2, -8, 3, 0xd9fff3);  // contraluz menta
    box(6, 1.2, 0, -1.5, 9, 1.4);      // rebatedor baixo frontal
  }
  scene.environment = pmrem.fromScene(studio, 0.03).texture;
  scene.environmentIntensity = 0.85;

  const key = new THREE.DirectionalLight(0xfffaf0, 2.5);
  key.position.set(-3.5, 7, 4.5); key.castShadow = true;
  if (TIER === 2) { key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 22; key.shadow.blurSamples = 32; }
  else { key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 11; key.shadow.blurSamples = 16; }
  key.shadow.bias = -0.0005;
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 24 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd8fff4, 2.4); rim.position.set(4, 3.5, -4); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffefd6, 0.6); fill.position.set(4, 1, 5); scene.add(fill);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xc9d3bd, 0.4); scene.add(hemi);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.16, color: 0x0b3d33, depthWrite: false }));
  ground.renderOrder = -1;
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  /* Estado animado pelo scroll (main.js) */
  const state = {
    x: 0, y: -2.8, z: 0, scale: 0.9, rotY: -0.35, face: 0,  // face: 0 = de lado, 1 = creme de frente para a câmera
    spin: 1, open: 0, lidAway: 0, cream: 0, burst: 0, orbit: 1, gather: 0, sink: 0, float: 0, shadow: 0.16, visible: 1, offsetX: 0.95
  };

  const jarRoot = new THREE.Group(); scene.add(jarRoot);
  const jarTilt = new THREE.Group(); jarRoot.add(jarTilt);
  const avoGroup = new THREE.Group(); scene.add(avoGroup);
  let lid, lidBase = 0, cream, jarModel;
  const pieces = [];

  /* ---------- Materiais ---------- */
  // Jateado fosco: granulado fino gerado por código (relevo + variação de aspereza)
  function frostMaps(size = 512) {
    const n = new Float32Array(size * size);
    for (let i = 0; i < n.length; i++) n[i] = Math.random();
    const blur = (src, r) => {               // suaviza para grão orgânico
      const out = new Float32Array(src.length);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        let s = 0, c = 0;
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { s += src[((y + dy + size) % size) * size + ((x + dx + size) % size)]; c++; }
        out[y * size + x] = s / c;
      }
      return out;
    };
    const h1 = blur(n, 1), h2 = blur(n, 3);
    const nrm = new Uint8Array(size * size * 4), rgh = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = y * size + x, H = (xx, yy) => { const j = ((yy + size) % size) * size + ((xx + size) % size); return h1[j] * 0.7 + h2[j] * 0.3; };
      const dx = (H(x + 1, y) - H(x - 1, y)) * 6, dy = (H(x, y + 1) - H(x, y - 1)) * 6;
      const l = Math.hypot(dx, dy, 1);
      nrm.set([(-dx / l * 0.5 + 0.5) * 255, (-dy / l * 0.5 + 0.5) * 255, (1 / l * 0.5 + 0.5) * 255, 255], i * 4);
      const r = 0.82 + (h2[i] - 0.5) * 0.5;   // canal G = aspereza
      rgh.set([255, Math.max(0, Math.min(255, r * 255)), 0, 255], i * 4);
    }
    const mk = (d) => { const t = new THREE.DataTexture(d, size, size, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.4, 8); t.anisotropy = 8; t.needsUpdate = true; return t; };
    return { normal: mk(nrm), rough: mk(rgh) };
  }
  const frost = frostMaps();

  // Vidro fosco em degradê: verde Let Me Be profundo no alto → menta translúcido embaixo
  const glass = new THREE.MeshPhysicalMaterial({
    // vidro com refração igual em todos os aparelhos (o visual do pote não muda)
    color: 0xffffff, transmission: 1, roughness: 0.5, thickness: 1.2, ior: 1.47,
    attenuationColor: new THREE.Color(0x0f6f60), attenuationDistance: 1.1,
    clearcoat: 0.45, clearcoatRoughness: 0.38, specularIntensity: 0.8,
    normalMap: frost.normal, normalScale: new THREE.Vector2(0.12, 0.12), roughnessMap: frost.rough
  });
  glass.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvY = position.y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vY;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float gY = smoothstep(-0.05, 1.3, vY); gY = gY * gY * (3.0 - 2.0 * gY);
        vec3 cLow = vec3(0.40, 0.62, 0.56), cMid = vec3(0.07, 0.22, 0.18), cTop = vec3(0.006, 0.05, 0.04);
        diffuseColor.rgb = gY < 0.5 ? mix(cLow, cMid, gY * 2.0) : mix(cMid, cTop, (gY - 0.5) * 2.0);`)
      .replace('#include <transmission_fragment>', THREE.ShaderChunk.transmission_fragment.replace(
        'material.transmission = transmission;',
        'float gT = smoothstep(-0.05, 1.3, vY); material.transmission = transmission * mix(1.0, 0.1, gT * gT * (3.0 - 2.0 * gT));'));
  };
  // tampa em alumínio anodizado verde Let Me Be (metálico, verniz brilhante, leve escovado)
  const lidMat = new THREE.MeshPhysicalMaterial({ color: 0x0e6e5d, metalness: 1, roughness: 0.36, clearcoat: 0.4, clearcoatRoughness: 0.2, envMapIntensity: 0.95, normalMap: frost.normal, normalScale: new THREE.Vector2(0.05, 0.05) });
  const linerMat = new THREE.MeshPhysicalMaterial({ color: 0xf4f2ec, roughness: 0.3, clearcoat: 0.5 });
  const creamBodyMat = new THREE.MeshPhysicalMaterial({ color: 0xf2efe6, roughness: 0.4 });
  const creamMat = new THREE.MeshPhysicalMaterial({ color: 0xf7f3e8, roughness: 0.24, clearcoat: 0.8, clearcoatRoughness: 0.18, sheen: 0.5, sheenColor: new THREE.Color(0xfff4e0) });
  // até 6 "toques" simultâneos no creme (cada um: posição + força + idade)
  const TOUCH = 6;
  const creamU = {
    uTime: { value: 0 }, uSlosh: { value: new THREE.Vector2() },
    uT: { value: Array.from({ length: TOUCH }, () => new THREE.Vector4(0, 0, 0, 99)) }  // x, z, força, idade
  };
  creamMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, creamU);
    const head = `uniform float uTime; uniform vec2 uSlosh; uniform vec4 uT[${TOUCH}];
      float creamH(vec2 p){
        float h = 0.0;
        for(int i=0;i<${TOUCH};i++){
          vec4 t = uT[i]; float d = distance(p, t.xy); float age = t.w;
          float dent = -t.z * exp(-d*d*90.0) * exp(-age*1.2);                 // afunda onde toca
          float ring = t.z * 0.6 * sin(d*26.0 - age*9.0) * exp(-d*3.0) * exp(-age*2.2); // ondas
          h += dent + ring;
        }
        h += (uSlosh.x*p.x + uSlosh.y*p.y) * 0.22;
        return h;
      }`;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + head)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        { float e = 0.01; float m = smoothstep(-0.02, 0.06, position.y);
          float hx = creamH(position.xz + vec2(e,0.0)) - creamH(position.xz - vec2(e,0.0));
          float hz = creamH(position.xz + vec2(0.0,e)) - creamH(position.xz - vec2(0.0,e));
          objectNormal = normalize(objectNormal + vec3(-hx, 0.0, -hz) * m * 35.0); }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed.y += creamH(position.xz) * smoothstep(-0.02, 0.06, position.y);`);
  };

  /* ---------- Carregamento ---------- */
  const draco = new DRACOLoader().setDecoderPath(DRACO);
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const prog = [0, 0];
  const load = (url, i) => new Promise((res, rej) => loader.load(url, res, (e) => {
    if (e.total) { prog[i] = e.loaded / e.total; onProgress && onProgress((prog[0] + prog[1]) / 2); }
  }, rej));
  const aniso = renderer.capabilities.getMaxAnisotropy();

  Promise.all([load('assets/3d/jar.glb', 0), load('assets/3d/avocado.glb', 1)]).then(([jarG, avoG]) => {
    jarModel = jarG.scene;
    jarModel.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      const n = o.material.name;
      if (n === 'Pote_Vidro') o.material = glass;
      else if (n === 'Pote_Tampa') o.material = lidMat;
      else if (n === 'Pote_Copo') o.material = linerMat;
      else if (n === 'Pote_Creme') {
        if (o.name === 'Cream') { o.material = creamMat; cream = o; o.geometry.computeVertexNormals(); }
        else o.material = creamBodyMat;   // volume visto através do vidro
      }
      else if (n.startsWith('Pote_Logo')) {
        const m = o.material; m.transparent = true; m.polygonOffset = true; m.polygonOffsetFactor = -2;
        m.roughness = 0.35; if (m.map) m.map.anisotropy = aniso; o.castShadow = false; o.renderOrder = 3;
      }
    });
    lid = jarModel.getObjectByName('Lid'); lidBase = lid.position.y;
    jarModel.position.y = 0; jarTilt.add(jarModel);

    // materiais do abacate: verniz úmido na polpa, casca com relevo, caroço brilhante
    const up = (m, o) => {
      const p = new THREE.MeshPhysicalMaterial({ map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, metalnessMap: m.metalnessMap, metalness: 0, ...o });
      ['map', 'normalMap', 'roughnessMap'].forEach((k) => { if (p[k]) p[k].anisotropy = aniso; });
      return p;
    };
    const mats = {};
    avoG.scene.traverse((o) => {
      if (!o.isMesh) return;
      const n = o.material.name;
      if (!mats[n]) {
        if (n === 'Avo_Skin') mats[n] = up(o.material, { roughness: 0.55, clearcoat: 0.45, clearcoatRoughness: 0.35, normalScale: new THREE.Vector2(1.3, 1.3) });
        else if (n === 'Avo_Flesh') mats[n] = up(o.material, { roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.12, sheen: 0.4, sheenColor: new THREE.Color(0xf6ffd0), normalScale: new THREE.Vector2(0.6, 0.6) });
        else mats[n] = up(o.material, { roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.15 });
      }
      o.material = mats[n]; o.castShadow = false;
    });
    const tpl = ['AvoHalfPit', 'AvoHalfHollow', 'AvoSlice', 'AvoWhole'].map((n) => avoG.scene.getObjectByName(n));
    // 8 peças, organizadas: saem da boca do pote e formam um anel que gira devagar
    const N = 8;
    const kinds = [0, 2, 3, 1, 2, 0, 3, 2];
    for (let i = 0; i < N; i++) {
      const obj = tpl[kinds[i]].clone(true);
      obj.traverse((o) => { o.userData.piece = i; });
      pieces.push({
        obj, ring: (i / N) * Math.PI * 2 + 0.3, s: kinds[i] === 2 ? 0.78 : kinds[i] === 3 ? 0.62 : 0.68,
        delay: i * 0.075, hov: 0, hitT: 0,
        off: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Vector3(), rvel: new THREE.Vector3(),
        q0: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28)),
        out: new THREE.Vector2(Math.cos(i * 2.4), Math.sin(i * 2.4)).multiplyScalar(0.35)
      });
      obj.visible = false; avoGroup.add(obj);
    }
    // compila os shaders antes de liberar a página (sem travar a tela onde o navegador permite)
    const hidden = []; scene.traverse((o) => { if (o.isMesh && !o.visible) { hidden.push(o); o.visible = true; } });
    pieces.forEach((p) => { if (!p.obj.visible) { hidden.push(p.obj); p.obj.visible = true; } });
    const done = () => { hidden.forEach((o) => (o.visible = false)); onLoad && onLoad(); };
    (renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve()).then(done, done);
  });

  /* ---------- Interação (eventos na janela; o canvas não bloqueia a página) ---------- */
  const ndc = new THREE.Vector2(9, 9), ndcS = new THREE.Vector2();
  let hasPointer = false, dragging = false, kneading = false, lastX = 0, lastY = 0, spinV = 0, userRot = 0, userRotX = 0;
  let touchIdx = 0, lastKnead = 0, hovered = -1, idleRot = 0, holdTimer = 0;
  let lastPX = null, lastPY = null;
  let phase0 = 0, phaseB = 0;
  let lastSY = window.scrollY, scrollVel = 0, orbitPhase = 0, selfSpin = 0, crownRef = 0;
  const qS = new THREE.Quaternion(), Y_AXIS = new THREE.Vector3(0, 1, 0);
  const ray = new THREE.Raycaster();
  const toNDC = (e) => ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / (canvas.clientHeight || innerHeight)) * 2 + 1);
  function hit(objs) { ray.setFromCamera(ndc, camera); return ray.intersectObjects(objs, true)[0]; }
  function press(point, force) {
    const l = cream.worldToLocal(point.clone());
    creamU.uT.value[touchIdx].set(l.x, l.z, force, 0); touchIdx = (touchIdx + 1) % TOUCH;
  }
  addEventListener('touchmove', (e) => { if (kneading) e.preventDefault(); }, { passive: false });   // trava a rolagem enquanto mexe no creme
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') {
      if (holdTimer && !kneading) { clearTimeout(holdTimer); holdTimer = 0; }   // moveu antes de segurar: é rolagem
      if (kneading && cream) { toNDC(e); const h = hit([cream]); if (h && performance.now() - lastKnead > 40) { press(h.point, 0.035); lastKnead = performance.now(); } }
      return;
    }
    toNDC(e); hasPointer = true;
    if (dragging) { spinV = (e.clientX - lastX) * 0.012; userRot += spinV; userRotX = Math.max(-1.3, Math.min(1.3, userRotX + (e.clientY - lastY) * 0.01)); lastX = e.clientX; lastY = e.clientY; return; }
    if (kneading && cream && performance.now() - lastKnead > 45) {
      const h = hit([cream]); if (h) { press(h.point, 0.035); lastKnead = performance.now(); }
    }
    // abacates: o mouse "bate" neles (impulso físico) e uma mola os devolve à órbita
    const ah = state.burst > 0.6 ? hit(avoGroup.children) : null;
    hovered = ah ? ah.object.userData.piece : -1;
    const pdx = e.clientX - (lastPX ?? e.clientX), pdy = e.clientY - (lastPY ?? e.clientY); lastPX = e.clientX; lastPY = e.clientY;
    if (ah) {
      const pc = pieces[hovered], now = performance.now();
      if (now - pc.hitT > 120) {
        pc.hitT = now;
        const sp = THREE.MathUtils.clamp(Math.hypot(pdx, pdy), 4, 60);
        const k = 0.05 * sp / Math.max(1, Math.hypot(pdx, pdy));
        pc.vel.x += pdx * k * 0.9; pc.vel.y -= pdy * k * 0.9; pc.vel.z -= 0.25 + sp * 0.012;
        pc.rvel.x += -pdy * k * 2.4; pc.rvel.y += pdx * k * 2.4; pc.rvel.z += (Math.random() - 0.5) * sp * 0.08;
      }
    }
    document.documentElement.classList.toggle('over-avo', hovered >= 0);
    const over = state.visible > 0.5 && jarModel && hit([jarModel]);
    document.documentElement.classList.toggle('over-jar', !!over);
    document.documentElement.classList.toggle('over-cream', !!(over && cream && state.open > 0.6 && hit([cream])));
  }, { passive: true });
  addEventListener('pointerdown', (e) => {
    if (!jarModel || state.visible < 0.5) return;
    toNDC(e);
    if (cream && state.open > 0.6) {
      const h = hit([cream]);
      if (h) {
        if (e.pointerType === 'touch') {   // celular: segure o dedo ~0,25 s para começar a mexer
          holdTimer = setTimeout(() => { kneading = true; holdTimer = 0; press(h.point, 0.05); if (navigator.vibrate) navigator.vibrate(12); }, 250);
          return;
        }
        kneading = true; press(h.point, 0.05); e.preventDefault(); return;
      }
    }
    if (e.pointerType !== 'touch' && hit([jarModel])) { dragging = true; lastX = e.clientX; lastY = e.clientY; e.preventDefault(); document.documentElement.classList.add('grabbing'); }
  });
  const release = () => { dragging = false; kneading = false; clearTimeout(holdTimer); holdTimer = 0; document.documentElement.classList.toggle('grabbing', false); };
  addEventListener('pointerup', release); addEventListener('pointercancel', release);
  document.addEventListener('mouseleave', () => { hasPointer = false; ndc.set(9, 9); });

  /* ---------- Resize ---------- */
  let mobile = false;
  function resize() {
    const w = innerWidth, h = canvas.clientHeight || innerHeight;   // altura visível de verdade (sem a barra do navegador do celular)
    renderer.setSize(w, h, false); camera.aspect = w / h; mobile = w / h < 0.85;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  /* ---------- Loop ---------- */
  let running = true; const clock = new THREE.Clock();
  const tilt = new THREE.Vector2(), tiltPrev = new THREE.Vector2(), v3 = new THREE.Vector3(), zero = new THREE.Vector2();
  function frame() {
    if (!running) return;
    quality.tick();
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (!dragging) {
      userRot += spinV; spinV *= 0.94;
      // na cena do creme o pote volta sozinho para a posição normal ao soltar; nas outras, volta devagar
      const back = ease(state.face) > 0.5 ? 0.9 : 0.995;
      userRot *= back; userRotX *= back > 0.95 ? 0.92 : back;
      if (back < 0.95) spinV *= 0.8;
    }
    // giro lento na horizontal enquanto não há scroll; ao rolar, volta suave para a frente
    if (state.spin > 0.01) idleRot += dt * 0.13 * state.spin;   // bem devagar: a logo fica em tela por mais tempo
    else { const tgt = Math.round(idleRot / (Math.PI * 2)) * Math.PI * 2; idleRot += (tgt - idleRot) * 0.06; }
    ndcS.lerp(hasPointer ? ndc : zero, 0.035);

    // câmera: aproxima e sobe conforme "face" (mergulho no creme)
    const f = ease(state.face);
    const camZ = (mobile ? 12.2 : 10.4) - f * (mobile ? 3.4 : 3.85);   // no celular o creme aproxima menos (o título continua visível)
    camera.position.set(0, 1.7 + f * 1.4, camZ);
    camera.lookAt(0, 1.0 + f * 0.3, 0);

    const ox = mobile ? 0 : state.x;
    jarRoot.position.set(ox, state.y + Math.sin(t * 1.2) * 0.035 * state.float, state.z);
    ground.position.set(ox, state.y + 0.002, state.z);   // o chão acompanha a base do pote: sombra de contato real
    jarRoot.scale.setScalar(state.scale * (mobile ? 0.8 + 0.08 * (1 - state.open) : 1));   // no celular o pote do hero aparece maior
    jarRoot.visible = state.visible > 0.01;
    tilt.set(-ndcS.y * 0.09, ndcS.x * 0.07);
    jarRoot.rotation.set(0, state.rotY + userRot + idleRot + ndcS.x * 0.18, 0);
    jarTilt.position.y = 0.7; jarModel && (jarModel.position.y = -0.7);   // inclina em torno do centro do pote
    jarTilt.rotation.set(tilt.x + f * 0.95 + userRotX, 0, tilt.y);
    ground.material.opacity = state.shadow * (1 - f);

    // creme: balanço + envelhecimento dos toques
    const dv = tilt.clone().sub(tiltPrev); tiltPrev.copy(tilt);
    creamU.uSlosh.value.lerp(new THREE.Vector2(dv.y * 45, -dv.x * 45), 0.2).multiplyScalar(0.9);
    creamU.uT.value.forEach((v) => { v.w += dt; });
    creamU.uTime.value = t;

    if (lid) {
      const o = state.open, lift = sstep(0.15, 1, o);
      lid.rotation.set(lift * 0.55, -sstep(0, 0.55, o) * Math.PI * 1.5, lift * -0.25);
      const aw = ease(state.lidAway);
      lid.position.set(lift * 0.6 + aw * 1.2, lidBase + sstep(0.05, 0.4, o) * 0.14 + lift * 1.7 + aw * (mobile ? 7 : 3.2) + Math.sin(t * 1.4) * 0.03 * lift, -lift * 0.4 - aw * 2);
      lid.visible = f < 0.6 && aw < 0.97;
    }
    if (cream) cream.scale.set(1, 0.55 + 0.45 * ease(state.cream), 1);

    // abacates: saem da boca do pote → anel inclinado que gira → coroa frontal (ingredientes)
    const b = state.burst, g = ease(state.gather), sc = state.scale * (mobile ? 0.95 : 1);
    const mouth = new THREE.Vector3(ox, state.y + 1.32 * sc, 0);
    const R = (mobile ? 1.65 : 2.35) * state.orbit, Rg = mobile ? 1.62 : 2.7, RY = mobile ? 1.12 : 0.82;   // celular: coroa mais alta, abacates mais longe do pote
    const P0 = new THREE.Vector3(), P1 = new THREE.Vector3(), P2 = new THREE.Vector3(), qT = new THREE.Quaternion(), qF = new THREE.Quaternion();
    // os abacates respondem à rolagem: rolar rápido = giram rápido; parado = giro lento
    const sy = window.scrollY, dy = sy - lastSY; lastSY = sy;
    scrollVel += (THREE.MathUtils.clamp(dy, -160, 160) - scrollVel) * 0.12;
    orbitPhase += dt * 0.12 + scrollVel * 0.0016;
    selfSpin += dt * 0.35 + scrollVel * 0.006;
    if (state.gather < 0.001) phase0 = orbitPhase;
    const rotAll = orbitPhase - phase0;   // giro comum do círculo depois que a transição começa
    if (b < 0.001) phaseB = orbitPhase;
    const rotB = orbitPhase - phaseB;   // giro comum da órbita depois que os abacates começam a sair
    pieces.forEach((p, i) => {
      // saída do pote em "trem": cada um pula para a direita do pote e entra na órbita já girando no sentido horário;
      // quem vai mais longe sai primeiro, então ninguém cruza o outro
      const TAUB = Math.PI * 2, EM = 0.25, ARR = 0.8, LEAD = ARR - EM;
      const dA = (((p.ring + phaseB) % TAUB) + TAUB) % TAUB;              // quanto anda na órbita até o seu lugar
      const joinB = (1 - dA / TAUB) * LEAD;                                // momento em que sai do pote
      const raw = clamp01((b - joinB) / EM);                               // progresso da saída (pote -> direita)
      p.obj.visible = raw > 0.001 && state.visible > 0.01;
      if (!p.obj.visible) return;
      const e = ease(raw);
      const thB = rotB + Math.min(dA, Math.max(0, b - joinB - EM) * (TAUB / LEAD));   // ângulo atual na órbita
      const a = raw < 1 ? rotB : thB;
      const ringAt = (ang) => new THREE.Vector3(ox + Math.cos(ang) * R * 1.15, mouth.y + 0.35 - Math.sin(ang) * 0.38 + Math.sin(t * 0.8 + i) * 0.06, Math.sin(ang) * R * 0.75);
      // alvo no anel (frente mais baixa, fundo mais alto) e na coroa frontal
      const ring = ringAt(a);
      const ca = p.ring - (orbitPhase - crownRef) * 0.6;   // a coroa também gira com a rolagem
      const crown = new THREE.Vector3(ox + Math.cos(ca) * Rg * 1.1, 0.95 + (mobile ? state.y - 0.25 : 0) + Math.sin(ca) * Rg * RY, -0.7);
      // corrente no sentido horário: todos entram pelo topo do círculo, um de cada vez, e andam juntos
      // (mesma velocidade, mesmo espaçamento) até o seu lugar; o primeiro "puxa" o próximo
      const TAU2 = Math.PI * 2, cy = 0.95 + (mobile ? state.y - 0.25 : 0);
      // entrada pela direita do pote (3 h): dali o caminho horário só desce; o primeiro é o que está mais perto da direita
      const entry = -rotAll;
      const a0 = p.ring + phase0;
      const dArc = (((a0 % TAU2) + TAU2) % TAU2);                    // lugar final = espelho do ângulo na órbita (gira no sentido horário)
      const PG = state.gather, END = 0.86, APP = 0.14, V = TAU2 / (END - APP);
      const join = APP + (TAU2 - dArc) / TAU2 * (END - APP);        // quem anda mais entra primeiro (nunca antes da transição começar)
      const approach = ease(clamp01((PG - (join - APP)) / APP));   // sai da órbita e vai até a entrada
      let gi;
      if (PG < join) {
        P2.set(ox + Math.cos(entry) * Rg * 1.1, cy + Math.sin(entry) * Rg * RY, crown.z);
        P2.lerpVectors(ring, P2, approach); P2.z += Math.sin(Math.PI * approach) * 0.5;
        gi = approach;
      } else {
        const th = entry - Math.min(dArc, (PG - join) * V);
        P2.set(ox + Math.cos(th) * Rg * 1.1, cy + Math.sin(th) * Rg * RY, crown.z);
        gi = 1;
      }
      const sw = 0;
      // saída para o creme: o círculo continua no sentido horário; cada abacate, ao passar pelo topo, mergulha no pote
      let sinkK = 0;
      if (state.sink > 0.0005) {
        const thc = -rotAll - dArc;                                            // ângulo atual na coroa
        const dTop = (((thc - Math.PI / 2) % TAU2) + TAU2) % TAU2;            // quanto falta (no sentido horário) até o topo
        const sArc = state.sink * (TAU2 + 0.8);
        if (sArc < dTop) {
          const t2 = thc - sArc;
          P2.set(ox + Math.cos(t2) * Rg * 1.1, cy + Math.sin(t2) * Rg * RY, crown.z);
        } else {
          sinkK = clamp01((sArc - dTop) / 0.8);
          const e2 = sinkK * sinkK;
          P2.set(ox + (0 - 0) , cy + Rg * RY, crown.z);
          P2.lerp(new THREE.Vector3(ox, mouth.y, 0), e2);
        }
      }
      // curva: sai da boca, sobe, e cai no lugar
      P0.copy(mouth).add(new THREE.Vector3(0.15, 0, 0.1));
      P1.copy(mouth).add(new THREE.Vector3(R * 0.55, 1.5, 0.35));          // sobe e já puxa para a direita
      const u = 1 - e;
      v3.set(0, 0, 0).addScaledVector(P0, u * u).addScaledVector(P1, 2 * u * e).addScaledVector(P2, e * e);
      // hover: cresce, avança e mostra a polpa
      // mola amortecida: bate, balança e volta devagar para a órbita
      p.vel.addScaledVector(p.off, -7 * dt).multiplyScalar(Math.exp(-2.1 * dt)); p.off.addScaledVector(p.vel, dt);
      p.rvel.addScaledVector(p.rot, -5 * dt).multiplyScalar(Math.exp(-1.6 * dt)); p.rot.addScaledVector(p.rvel, dt);
      v3.add(p.off);
      if (!p.sm) p.sm = v3.clone(); else p.sm.lerp(v3, raw < 1 ? 1 : 0.32);
      p.obj.position.copy(p.sm);
      const pop = raw < 1 ? 1 + Math.sin(raw * Math.PI) * 0.18 : 1;   // pequeno "pulo" ao nascer
      p.obj.scale.setScalar(p.s * sstep(0, 0.2, raw) * pop * (mobile ? 0.75 : 1) * (1 - f * 0.5) * state.visible * (1 - sinkK));
      qT.setFromEuler(new THREE.Euler(-0.25 + Math.sin(t * 0.6 + i) * 0.12, -Math.cos(a) * 0.7 * (1 - gi), (i % 2 ? 0.35 : -0.35) * (1 - gi) + gi * (p.ring - Math.PI / 2) * 0.35 + sw * 0.6 * (i % 2 ? 1 : -1)));
      qT.multiply(qS.setFromAxisAngle(Y_AXIS, (selfSpin + i * 0.8 + gi * Math.PI * 2) * (i % 2 ? 1 : -1)));
      p.obj.quaternion.slerpQuaternions(p.q0, qT, e);
      qF.setFromEuler(new THREE.Euler(-0.1, 0, Math.sin(t * 2 + i) * 0.05));
      p.obj.quaternion.multiply(qF.setFromEuler(new THREE.Euler(p.rot.x, p.rot.y, p.rot.z)));
    });

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // posição do creme na tela (para o texto circular acompanhar o creme perfeitamente)
  const _c = new THREE.Vector3(), _e1 = new THREE.Vector3(), _e2 = new THREE.Vector3();
  const toPx = (v) => { v.project(camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * (canvas.clientHeight || innerHeight) }; };
  function creamScreen() {
    if (!cream) return null;
    cream.updateWorldMatrix(true, false);
    // elipse ajustada pelas 4 bordas projetadas (a perspectiva desloca o centro aparente)
    const P = (x, z) => { const v = toPx(cream.localToWorld(_c.set(x, 0.04, z))); return { x: v.x, y: v.y }; };
    const l = P(-0.83, 0), r = P(0.83, 0), f = P(0, -0.83), n = P(0, 0.83);
    const x = (l.x + r.x) / 2, y = (f.y + n.y) / 2;
    return { x, y, rx: Math.hypot(r.x - l.x, r.y - l.y) / 2, ry: Math.hypot(n.x - f.x, n.y - f.y) / 2 };
  }

  // centro do pote na tela (para os anéis dos ingredientes ficarem centralizados nele)
  const _j = new THREE.Vector3();
  function jarScreen() {
    jarRoot.updateWorldMatrix(true, false);
    return toPx(jarRoot.localToWorld(_j.set(0, 0.68, 0)));
  }

  return {
    state, creamScreen, jarScreen,
    pause() { running = false; },
    resume() { if (!running) { running = true; clock.getDelta(); quality.reset(); requestAnimationFrame(frame); } },
    resetSpin() { idleRot = 0; userRot = 0; spinV = 0; },
    get mobile() { return mobile; },
    get kneading() { return kneading; },
    get interacting() { return kneading || dragging || Math.abs(userRot) > 0.04 || Math.abs(userRotX) > 0.04; }
  };
}
