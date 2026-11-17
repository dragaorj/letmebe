/* Qualidade do 3D conforme o aparelho.
   TIER 2 = computador com placa de vídeo (qualidade máxima)
   TIER 1 = celular, tablet ou computador modesto (sem vidro com refração, sombra simples, resolução menor)
   TIER 0 = sem placa de vídeo / renderização por software (o mínimo para rodar liso)
   Além disso, a resolução se ajusta sozinha enquanto o site roda: se cair abaixo de ~42 fps, ela desce. */

function gpuName() {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return 'none';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || '');
  } catch (e) { return ''; }
}

export const GPU = gpuName();
const SOFT = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic|none/i.test(GPU);
const MOBILE = matchMedia('(pointer: coarse)').matches || innerWidth <= 760;
const WEAK = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
// placa integrada antiga de notebook (Intel HD/UHD sem Iris/Arc): trata como aparelho modesto
const IGPU = /intel/i.test(GPU) && !/iris|arc/i.test(GPU);

export const TIER = SOFT ? 0 : (MOBILE || WEAK || IGPU) ? 1 : 2;

// resolução inicial (pixel ratio) por nível
export const basePR = () => Math.min(devicePixelRatio || 1, TIER === 2 ? 2 : TIER === 1 ? 1.5 : 1);
const minPR = () => (TIER === 0 ? 0.6 : 0.75);

// opções do WebGLRenderer por nível
export const rendererOpts = (canvas) => ({
  canvas, alpha: true,
  antialias: true,   // bordas sempre suaves (o visual não muda entre aparelhos)
  powerPreference: 'high-performance',
  stencil: false
});

// escala dinâmica: mede o tempo dos quadros e desce (ou volta a subir) a resolução
export function autoScale(renderer) {
  let pr = basePR(), last = 0, acc = 0, n = 0, cool = 1.5;
  renderer.setPixelRatio(pr);
  return {
    tick() {
      const now = performance.now(), dt = last ? (now - last) / 1000 : 0; last = now;
      if (!dt || dt > 0.25) return;            // aba voltou / pausa: ignora
      if (cool > 0) { cool -= dt; return; }
      acc += dt; n++;
      if (n < 45) return;
      const avg = acc / n; acc = 0; n = 0;
      if (avg > 1 / 42 && pr > minPR()) { pr = Math.max(minPR(), +(pr - 0.25).toFixed(2)); renderer.setPixelRatio(pr); cool = 1.2; }
      else if (avg < 1 / 58 && pr < basePR()) { pr = Math.min(basePR(), +(pr + 0.25).toFixed(2)); renderer.setPixelRatio(pr); cool = 4; }
    },
    reset() { last = 0; acc = 0; n = 0; cool = 0.6; }
  };
}
