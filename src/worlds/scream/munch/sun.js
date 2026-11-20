import * as THREE from 'three';
import { G } from '../../../engine/paint.js';

// --- the column of light that the Sun lays across the water
export function addSunPillar(world, kit) {
  const { S } = kit;
  const pg = new THREE.PlaneGeometry(1, 1, 1, 48);
  pg.rotateX(-Math.PI / 2);
  world.pillar = new THREE.Mesh(
    pg,
    new THREE.ShaderMaterial({
      uniforms: { uTime: G.uTime, uNoise: G.uNoise, uAmt: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uAmt; uniform sampler2D uNoise;
        void main(){
          float n = texture2D(uNoise, vec2(vUv.x * 0.02 + uTime * 0.002, vUv.y * 0.35 - uTime * 0.004)).r;
          float w = 0.22 + 0.28 * vUv.y;
          float a = (1.0 - smoothstep(w * 0.4, w, abs(vUv.x - 0.5 + (n - 0.5) * 0.12))) * (0.45 + 0.75 * n);
          a *= smoothstep(0.0, 0.06, vUv.y) * (1.0 - smoothstep(0.85, 1.0, vUv.y));
          gl_FragColor = vec4(vec3(1.0, 0.78, 0.34) * a * uAmt, 1.0);
        }`,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    })
  );
  const dir = new THREE.Vector3(0.876, 0, -0.466).normalize();
  const len = 760;
  world.pillar.scale.set(60, 1, len);
  world.pillar.rotation.y = Math.atan2(dir.x, dir.z);
  world.pillar.position.set(-20 + dir.x * len * 0.5, 0.45, -78 + dir.z * len * 0.5);
  world.pillar.renderOrder = 7;
  S.add(world.pillar);
}
