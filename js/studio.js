/* Ambiente de estúdio compartilhado: cúpula em degradê + softboxes (reflexos de foto de produto) */
import * as THREE from 'three';

export function studioEnvironment(renderer, { dark = [0.10, 0.13, 0.12], light = [0.62, 0.68, 0.64] } = {}) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new THREE.Scene();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(20, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { cA: { value: new THREE.Vector3(...dark) }, cB: { value: new THREE.Vector3(...light) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 cA; uniform vec3 cB; varying vec3 vP; void main(){ float h = normalize(vP).y; gl_FragColor = vec4(mix(cA, cB, smoothstep(-0.4, 0.8, h)), 1.0); }'
  }));
  studio.add(dome);
  const box = (w, h, x, y, z, k, col = 0xffffff) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0.6, 0); studio.add(m);
  };
  box(2.2, 9, -7, 2, 4, 6);
  box(1.4, 9, 7.5, 2, 2, 4.5);
  box(10, 4, 0, 10, 0, 3.5);
  box(3, 7, 3, 2, -8, 3, 0xd9fff3);
  box(6, 1.2, 0, -1.5, 9, 1.4);
  const tex = pmrem.fromScene(studio, 0.03).texture;
  pmrem.dispose();
  return tex;
}
