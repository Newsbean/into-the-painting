import * as THREE from 'three';
import { blit, FS_VERT } from './gl.js';
import { G } from './paint.js';

// scene -> [bloom chain] -> painterly composite (oil filter, ink line,
// soft focus, crackle, canvas grain, grade) -> screen or target.

const BRIGHT = /* glsl */ `
uniform sampler2D tMap; uniform float uThreshold; uniform vec2 uTexel;
varying vec2 vUv;
void main(){
  vec3 c = vec3(0.0);
  c += texture2D(tMap, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2( 1.0, -1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(-1.0,  1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2( 1.0,  1.0)).rgb;
  c *= 0.25;
  c = min(c, vec3(8.0));
  float l = max(c.r, max(c.g, c.b));
  float k = max(l - uThreshold, 0.0) / max(l, 1e-4);
  gl_FragColor = vec4(c * k, 1.0);
}`;

const DOWN = /* glsl */ `
uniform sampler2D tMap; uniform vec2 uTexel; varying vec2 vUv;
void main(){
  vec3 c = texture2D(tMap, vUv).rgb * 4.0;
  c += texture2D(tMap, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2( 1.0, -1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(-1.0,  1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2( 1.0,  1.0)).rgb;
  gl_FragColor = vec4(c / 8.0, 1.0);
}`;

const UP = /* glsl */ `
uniform sampler2D tMap; uniform sampler2D tAdd; uniform vec2 uTexel; varying vec2 vUv;
void main(){
  vec3 c = vec3(0.0);
  c += texture2D(tMap, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2( 1.0, -1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(-1.0,  1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2( 1.0,  1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2( 0.0,  1.4)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2( 0.0, -1.4)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2( 1.4,  0.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(-1.4,  0.0)).rgb;
  gl_FragColor = vec4(c / 8.0 + texture2D(tAdd, vUv).rgb, 1.0);
}`;

const FINAL = /* glsl */ `
precision highp float;
uniform sampler2D tScene;
uniform sampler2D tDepth;
uniform sampler2D tBloom;
uniform sampler2D tSoft;
uniform sampler2D uNoise;
uniform vec2 uTexel;
uniform vec2 uRes;
uniform float uNear, uFar, uTime;
uniform float uKuwahara;      // radius in px (0..4)
uniform float uOutline;
uniform float uSketchLine;
uniform vec3 uInkColor;
uniform float uBloom;
uniform float uSoft;
uniform float uGrain;
uniform float uCrackle;
uniform float uPaperTex;      // woodblock paper fibre
uniform float uSaturation;
uniform float uContrast;
uniform vec3 uTint;
uniform vec3 uLift;
uniform float uVignette;
uniform float uWarpAmt;       // screen wobble (Scream)
uniform float uFlash;
varying vec2 vUv;

float lin(float z){
  float n = z * 2.0 - 1.0;
  return 2.0 * uNear * uFar / (uFar + uNear - n * (uFar - uNear));
}
float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

uniform int uKR;
vec3 kuwahara(vec2 uv, float rad){
  vec3 m0 = vec3(0.0), m1 = vec3(0.0), m2 = vec3(0.0), m3 = vec3(0.0);
  vec3 s0 = vec3(0.0), s1 = vec3(0.0), s2 = vec3(0.0), s3 = vec3(0.0);
  float fr = float(uKR);
  for (int j = 0; j <= 3; j++){
    if (j > uKR) break;
    for (int i = 0; i <= 3; i++){
      if (i > uKR) break;
      vec2 o = vec2(float(i), float(j)) * rad / fr;
      vec3 c;
      c = texture2D(tScene, uv - o * uTexel).rgb;                     m0 += c; s0 += c * c;
      c = texture2D(tScene, uv + vec2( o.x, -o.y) * uTexel).rgb;      m1 += c; s1 += c * c;
      c = texture2D(tScene, uv + vec2(-o.x,  o.y) * uTexel).rgb;      m2 += c; s2 += c * c;
      c = texture2D(tScene, uv + o * uTexel).rgb;                     m3 += c; s3 += c * c;
    }
  }
  float n = (fr + 1.0) * (fr + 1.0);
  m0 /= n; m1 /= n; m2 /= n; m3 /= n;
  float v0 = luma(abs(s0 / n - m0 * m0));
  float v1 = luma(abs(s1 / n - m1 * m1));
  float v2 = luma(abs(s2 / n - m2 * m2));
  float v3 = luma(abs(s3 / n - m3 * m3));
  vec3 col = m0; float mn = v0;
  if (v1 < mn){ mn = v1; col = m1; }
  if (v2 < mn){ mn = v2; col = m2; }
  if (v3 < mn){ mn = v3; col = m3; }
  return col;
}

vec2 hash22(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float crackle(vec2 p){
  vec2 ip = floor(p), fp = fract(p);
  float d1 = 8.0, d2 = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 g = vec2(float(i), float(j));
    vec2 o = hash22(ip + g);
    float d = length(g + o - fp);
    if (d < d1){ d2 = d1; d1 = d; } else if (d < d2){ d2 = d; }
  }
  return smoothstep(0.0, 0.055, d2 - d1);
}

void main(){
  vec2 uv = vUv;
  if (uWarpAmt > 0.0){
    uv.x += sin(uv.y * 22.0 + uTime * 0.9) * uWarpAmt * 0.004;
    uv.y += sin(uv.x * 17.0 - uTime * 0.7) * uWarpAmt * 0.004;
  }
  vec3 col = uKuwahara > 0.05 ? kuwahara(uv, uKuwahara) : texture2D(tScene, uv).rgb;

  // soft focus (sfumato)
  vec3 soft = texture2D(tSoft, uv).rgb;
  col = mix(col, soft, uSoft);

  // ink line from depth + tone breaks
  if (uOutline + uSketchLine > 0.0){
    float d0 = lin(texture2D(tDepth, uv).r);
    float dn = 0.0, ln = 0.0;
    float l0 = luma(col);
    for (int i = 0; i < 4; i++){
      vec2 o = (i == 0) ? vec2(1.0, 0.0) : (i == 1) ? vec2(-1.0, 0.0) : (i == 2) ? vec2(0.0, 1.0) : vec2(0.0, -1.0);
      o *= uTexel * 1.4;
      dn += abs(lin(texture2D(tDepth, uv + o).r) - d0);
      ln += abs(luma(texture2D(tScene, uv + o).rgb) - l0);
    }
    float e = smoothstep(0.012, 0.05, dn / max(d0, 0.5)) + smoothstep(0.16, 0.42, ln) * 0.85;
    e *= 1.0 - smoothstep(uFar * 0.5, uFar * 0.9, d0) * 0.6;
    float chroma = max(col.r, max(col.g, col.b)) - min(col.r, min(col.g, col.b));
    float str = uOutline + uSketchLine * (1.0 - smoothstep(0.03, 0.14, chroma));
    col = mix(col, uInkColor, clamp(e, 0.0, 1.0) * min(str, 1.0));
  }

  col += texture2D(tBloom, uv).rgb * uBloom;

  // grade
  float l = luma(col);
  col = mix(vec3(l), col, uSaturation);
  col = (col - 0.5) * uContrast + 0.5;
  col = col * uTint + uLift;
  col = max(col, 0.0);

  // surface: canvas weave, paper fibre, craquelure
  vec2 px = vUv * uRes;
  float weave = sin(px.x * 2.1) * sin(px.y * 2.1);
  float tooth = texture2D(uNoise, px / 256.0).r - 0.5;
  col *= 1.0 + (weave * 0.5 + tooth) * uGrain;
  if (uPaperTex > 0.0){
    float fib = texture2D(uNoise, vec2(px.x / 900.0, px.y / 90.0)).g - 0.5;
    float fib2 = texture2D(uNoise, px / 420.0).b - 0.5;
    col *= 1.0 + (fib * 0.6 + fib2 * 0.5 + tooth * 0.5) * uPaperTex;
  }
  if (uCrackle > 0.0){
    float cr = crackle(px / 34.0) * (0.6 + 0.4 * crackle(px / 13.0 + 7.0));
    col *= mix(1.0 - uCrackle, 1.0, cr);
  }

  // vignette + soft shoulder
  vec2 q = vUv - 0.5;
  col *= 1.0 - dot(q, q) * uVignette;
  col = mix(col, 0.82 + 0.18 * tanh((col - 0.82) / 0.18), step(0.82, col));
  col = mix(col, vec3(1.0), uFlash);
  col += (hash22(px + uTime).x - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;

export const STYLE_DEFAULTS = {
  kuwahara: 2.2,
  outline: 0,
  sketchLine: 0.55,
  ink: 0x1b1a22,
  bloom: 0.8,
  threshold: 0.85,
  soft: 0,
  grain: 0.07,
  crackle: 0,
  paper: 0,
  saturation: 1.08,
  contrast: 1.04,
  tint: [1, 1, 1],
  lift: [0, 0, 0],
  vignette: 0.55,
  warp: 0,
};

export class Pipeline {
  constructor(renderer, w, h) {
    this.renderer = renderer;
    this.mips = [];
    const mk = (frag, uniforms) =>
      new THREE.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    this.mBright = mk(BRIGHT, { tMap: { value: null }, uThreshold: { value: 0.85 }, uTexel: { value: new THREE.Vector2() } });
    this.mDown = mk(DOWN, { tMap: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.mUp = mk(UP, { tMap: { value: null }, tAdd: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.mFinal = mk(FINAL, {
      tScene: { value: null },
      tDepth: { value: null },
      tBloom: { value: null },
      tSoft: { value: null },
      uNoise: G.uNoise,
      uTexel: { value: new THREE.Vector2() },
      uRes: { value: new THREE.Vector2() },
      uNear: { value: 0.3 },
      uFar: { value: 2000 },
      uTime: G.uTime,
      uKuwahara: { value: 2 },
      uKR: { value: 2 },
      uOutline: { value: 0 },
      uSketchLine: { value: 0 },
      uInkColor: { value: new THREE.Color(0x1b1a22) },
      uBloom: { value: 0.8 },
      uSoft: { value: 0 },
      uGrain: { value: 0.07 },
      uCrackle: { value: 0 },
      uPaperTex: { value: 0 },
      uSaturation: { value: 1 },
      uContrast: { value: 1 },
      uTint: { value: new THREE.Vector3(1, 1, 1) },
      uLift: { value: new THREE.Vector3(0, 0, 0) },
      uVignette: { value: 0.5 },
      uWarpAmt: { value: 0 },
      uFlash: { value: 0 },
    });
    this.flash = 0;
    this.stats = { calls: 0, triangles: 0 }; // what the scene took to draw, last frame
    this.setSize(w, h);
  }

  setSize(w, h) {
    w = Math.max(8, Math.floor(w));
    h = Math.max(8, Math.floor(h));
    if (this.w === w && this.h === h) return;
    this.w = w;
    this.h = h;
    this.dispose();
    const depth = new THREE.DepthTexture(w, h);
    depth.type = THREE.UnsignedIntType;
    this.scene = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthTexture: depth,
      depthBuffer: true,
    });
    const opt = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
    this.mips = [];
    this.ups = [];
    let mw = w,
      mh = h;
    for (let i = 0; i < 6; i++) {
      mw = Math.max(2, mw >> 1);
      mh = Math.max(2, mh >> 1);
      this.mips.push(new THREE.WebGLRenderTarget(mw, mh, opt));
      this.ups.push(new THREE.WebGLRenderTarget(mw, mh, opt));
    }
  }

  dispose() {
    this.scene?.dispose();
    this.scene?.depthTexture?.dispose();
    this.mips?.forEach((m) => m.dispose());
    this.ups?.forEach((m) => m.dispose());
    this.softA?.dispose();
    this.softB?.dispose();
    this.softA = this.softB = null;
  }

  applyStyle(style) {
    const s = { ...STYLE_DEFAULTS, ...style };
    const u = this.mFinal.uniforms;
    this.kuwahara = s.kuwahara;
    u.uOutline.value = s.outline;
    u.uSketchLine.value = s.sketchLine;
    u.uInkColor.value.set(s.ink);
    u.uBloom.value = s.bloom;
    u.uSoft.value = s.soft;
    u.uGrain.value = s.grain;
    u.uCrackle.value = s.crackle;
    u.uPaperTex.value = s.paper;
    u.uSaturation.value = s.saturation;
    u.uContrast.value = s.contrast;
    u.uTint.value.fromArray(s.tint);
    u.uLift.value.fromArray(s.lift);
    u.uVignette.value = s.vignette;
    u.uWarpAmt.value = s.warp;
    this.mBright.uniforms.uThreshold.value = s.threshold;
  }

  render(scene, camera, target = null) {
    const r = this.renderer;
    r.setRenderTarget(this.scene);
    r.clear();
    r.render(scene, camera);
    this.stats.calls = r.info.render.calls;
    this.stats.triangles = r.info.render.triangles;

    // bloom
    const mips = this.mips,
      ups = this.ups;
    this.mBright.uniforms.tMap.value = this.scene.texture;
    this.mBright.uniforms.uTexel.value.set(0.5 / this.w, 0.5 / this.h);
    blit(r, this.mBright, mips[0]);
    for (let i = 1; i < mips.length; i++) {
      this.mDown.uniforms.tMap.value = mips[i - 1].texture;
      this.mDown.uniforms.uTexel.value.set(1 / mips[i - 1].width, 1 / mips[i - 1].height);
      blit(r, this.mDown, mips[i]);
    }
    let prev = mips[mips.length - 1];
    for (let i = mips.length - 2; i >= 0; i--) {
      this.mUp.uniforms.tMap.value = prev.texture;
      this.mUp.uniforms.tAdd.value = mips[i].texture;
      this.mUp.uniforms.uTexel.value.set(1 / prev.width, 1 / prev.height);
      blit(r, this.mUp, ups[i]);
      prev = ups[i];
    }

    // soft-focus source: scene at 1/4 res through the same chain (cheap box)
    if (this.mFinal.uniforms.uSoft.value > 0) {
      if (!this.softA) {
        const opt = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
        this.softA = new THREE.WebGLRenderTarget(this.w >> 1, this.h >> 1, opt);
        this.softB = new THREE.WebGLRenderTarget(this.w >> 2, this.h >> 2, opt);
      }
      this.mDown.uniforms.tMap.value = this.scene.texture;
      this.mDown.uniforms.uTexel.value.set(1 / this.w, 1 / this.h);
      blit(r, this.mDown, this.softA);
      this.mDown.uniforms.tMap.value = this.softA.texture;
      this.mDown.uniforms.uTexel.value.set(2 / this.w, 2 / this.h);
      blit(r, this.mDown, this.softB);
      this.mFinal.uniforms.tSoft.value = this.softB.texture;
    } else {
      this.mFinal.uniforms.tSoft.value = this.scene.texture;
    }

    const u = this.mFinal.uniforms;
    u.tScene.value = this.scene.texture;
    u.tDepth.value = this.scene.depthTexture;
    u.tBloom.value = ups[0].texture;
    u.uTexel.value.set(1 / this.w, 1 / this.h);
    u.uRes.value.set(this.w, this.h);
    u.uNear.value = camera.near;
    u.uFar.value = camera.far;
    u.uFlash.value = this.flash;
    u.uKuwahara.value = (this.kuwahara ?? 2) * (this.h / 1080);
    u.uKR.value = Math.max(1, Math.min(3, Math.ceil(u.uKuwahara.value)));
    blit(r, this.mFinal, target);
    r.setRenderTarget(null);
  }
}
