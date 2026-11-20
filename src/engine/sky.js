import * as THREE from 'three';
import { G } from './paint.js';
import { blit, FS_VERT } from './gl.js';

// A sky is a GLSL function  vec3 skyColor(vec3 d)  painted directly on a
// dome every frame, so strokes stay crisp at any field of view. A tiny
// equirect copy is baked a few times a second for water + fog to borrow.

const HEAD = /* glsl */ `
precision highp float;
precision highp sampler3D;
uniform sampler3D uNoise3;
uniform sampler2D uNoise;
uniform float uTime;
uniform float uSkyRestore;
uniform float uFinal;
uniform vec3 uPaper;
uniform vec3 uInk;
float sat(float x){ return clamp(x, 0.0, 1.0); }
float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 dirOf(float az, float el){ return vec3(sin(az) * cos(el), sin(el), -cos(az) * cos(el)); }
// blotchy "being painted in" mask shared by all skies
float paintedIn(vec3 d, float stroke){
  float low = texture(uNoise3, d * 0.045 + 0.3).r * 0.62 + texture(uNoise3, d * 0.22).g * 0.24 + stroke * 0.14;
  float th = uSkyRestore * 1.12;
  return 1.0 - smoothstep(th - 0.09, th, low);
}
`;

export class Sky {
  constructor({ body, uniforms = {}, noise3 }) {
    this.uniforms = {
      uNoise3: { value: noise3 },
      uNoise: G.uNoise,
      uTime: G.uTime,
      uSkyRestore: G.uSkyRestore,
      uFinal: { value: 0 },
      uPaper: G.uPaper,
      uInk: G.uInk,
      ...uniforms,
    };
    const domeMat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main(){
          vDir = position;
          vec4 p = projectionMatrix * viewMatrix * vec4(position * 500.0 + cameraPosition, 1.0);
          gl_Position = p.xyww;
        }`,
      fragmentShader: /* glsl */ `
        ${HEAD}
        ${body}
        varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir);
          gl_FragColor = vec4(skyColor(d), 1.0);
        }`,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), domeMat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;

    this.bakeMat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: FS_VERT,
      fragmentShader: /* glsl */ `
        ${HEAD}
        ${body}
        varying vec2 vUv;
        void main(){
          float az = (vUv.x - 0.5) * 6.2831853;
          float el = (vUv.y - 0.5) * 3.14159265;
          gl_FragColor = vec4(skyColor(dirOf(az, el)), 1.0);
        }`,
      depthWrite: false,
      depthTest: false,
    });
    this.env = new THREE.WebGLRenderTarget(256, 128, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    });
    this.env.texture.wrapS = THREE.RepeatWrapping;
    this._t = 99;
  }
  bake(renderer, dt = 1) {
    this._t += dt;
    if (this._t < 0.4) return;
    this._t = 0;
    blit(renderer, this.bakeMat, this.env);
    renderer.setRenderTarget(null);
  }
}
