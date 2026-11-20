import * as THREE from 'three';
import { G, glowSprite, glowPoints, paintMaterial } from './paint.js';
import { Builder, tint, xf } from './build.js';
import { clamp, damp, lerp, smooth } from './gl.js';

// ---------------------------------------------------------------- shared look for ghostly things
const GHOST_VERT = /* glsl */ `
varying vec3 vN; varying vec3 vW;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz; vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const GHOST_FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uTime; uniform float uAmt; uniform sampler2D uNoise;
varying vec3 vN; varying vec3 vW;
void main(){
  vec3 V = normalize(cameraPosition - vW);
  float f = pow(1.0 - abs(dot(normalize(vN), V)), 1.6);
  float n = texture2D(uNoise, vec2(vW.x * 0.006 + vW.z * 0.006, vW.y * 0.005 - uTime * 0.0016)).r;
  float a = (0.22 + f * 1.1) * (0.65 + 0.6 * n) * uAmt;
  gl_FragColor = vec4(uColor * a, 1.0);
}`;
export function ghostMaterial(hex, amt = 1) {
  return new THREE.ShaderMaterial({
    vertexShader: GHOST_VERT,
    fragmentShader: GHOST_FRAG,
    uniforms: { uColor: { value: new THREE.Color(hex) }, uTime: G.uTime, uAmt: { value: amt }, uNoise: G.uNoise },
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}

const BEAM_FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uTime; uniform float uAmt; uniform sampler2D uNoise;
varying vec2 vUv;
void main(){
  float n = texture2D(uNoise, vec2(vUv.x * 0.05, vUv.y * 0.03 - uTime * 0.004)).r;
  float a = pow(1.0 - vUv.y, 1.7) * (0.45 + 0.75 * n) * uAmt;
  gl_FragColor = vec4(uColor * a, 1.0);
}`;
function beam(hex, height = 60, radius = 0.7) {
  const g = new THREE.CylinderGeometry(radius * 0.25, radius, height, 16, 1, true);
  g.translate(0, height / 2, 0);
  const m = new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: BEAM_FRAG,
    uniforms: { uColor: { value: new THREE.Color(hex) }, uTime: G.uTime, uAmt: { value: 0.5 }, uNoise: G.uNoise },
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.renderOrder = 9;
  return mesh;
}

// ---------------------------------------------------------------- a drop of lost pigment
class Wisp {
  constructor(def) {
    this.def = def;
    this.pos = new THREE.Vector3(...def.pos);
    this.color = new THREE.Color(def.color);
    this.found = false;
    this.group = new THREE.Group();
    this.group.position.copy(this.pos);
    this.core = glowSprite(def.color, 2.6, 1);
    this.halo = glowSprite(def.color, 7.5, 0.4);
    this.white = glowSprite(0xffffff, 0.9, 1);
    this.beam = beam(def.color, def.beam ?? 70, 0.55);
    this.beam.position.y = -1;
    this.group.add(this.halo, this.core, this.white, this.beam);
    const motes = [];
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * 6.283,
        r = 0.6 + Math.random() * 1.8;
      motes.push({ p: [Math.cos(a) * r, (Math.random() - 0.5) * 2.4, Math.sin(a) * r], c: def.color, size: 0.35 + Math.random() * 0.4, drift: 0.7, needsRestore: false });
    }
    this.motes = glowPoints(motes, 1.3);
    this.group.add(this.motes);
    this.t = Math.random() * 10;
    this.fade = 1;
  }
  update(dt) {
    this.t += dt;
    if (this.found) {
      this.fade = Math.max(0, this.fade - dt * 1.4);
      this.group.scale.setScalar(1 + (1 - this.fade) * 3);
      if (this.fade <= 0) this.group.visible = false;
    }
    const p = 1 + Math.sin(this.t * 2.2) * 0.14;
    this.group.position.y = this.pos.y + Math.sin(this.t * 1.1) * 0.25;
    this.core.scale.setScalar(2.6 * p);
    this.halo.scale.setScalar(7.5 * (2 - p));
    this.core.material.opacity = this.fade;
    this.halo.material.opacity = 0.4 * this.fade;
    this.white.material.opacity = this.fade;
    this.beam.material.uniforms.uAmt.value = 0.3 * this.fade;
    this.motes.material.uniforms.uBoost.value = 1.3 * this.fade;
  }
}

// ---------------------------------------------------------------- a doorway back to the gallery
export function framePortal(hex = 0xf2cf6a) {
  const g = new THREE.Group();
  const B = new Builder();
  const W = 3.2,
    H = 4.4,
    T = 0.34;
  const gold = (x, y, z) => new THREE.Color(0xd9a93a).lerp(new THREE.Color(0xfff0b0), clamp(Math.sin(y * 9 + x * 7) * 0.5 + 0.5) * 0.5);
  B.box(T, H + T * 2, T * 1.2, gold, -W / 2 - T / 2, 0, 0);
  B.box(T, H + T * 2, T * 1.2, gold, W / 2 + T / 2, 0, 0);
  B.box(W + T * 2, T, T * 1.2, gold, 0, H + T, 0);
  B.box(W + T * 2, T, T * 1.2, gold, 0, 0, 0);
  for (const sx of [-1, 1]) for (const sy of [0, 1]) B.ball(0.3, 0xfff0b0, sx * (W / 2 + T / 2), sy * (H + T) + T / 2, 0, 1, 1, 0.8, 1);
  const frame = B.mesh(paintMaterial({ stroke: null, contrast: 0, hueVar: 0, rim: 0.5, emissive: 1.6 }));
  frame.material.uniforms.uStroke.value = G._white;
  // the frame itself is always painted
  frame.material.uniforms.uRestore = { value: 1 };
  g.add(frame);
  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.ShaderMaterial({
      uniforms: { uTime: G.uTime, uColor: { value: new THREE.Color(hex) }, uNoise: G.uNoise, uAmt: { value: 1 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv; uniform float uTime; uniform vec3 uColor; uniform sampler2D uNoise; uniform float uAmt;
        void main(){
          vec2 p = vUv - 0.5;
          float a = atan(p.y, p.x), r = length(p);
          float sw = texture2D(uNoise, vec2(a * 0.012 + r * 0.05 - uTime * 0.002, r * 0.03 - uTime * 0.004)).r;
          float sw2 = texture2D(uNoise, vec2(vUv.x * 0.02 + uTime * 0.001, vUv.y * 0.02 - uTime * 0.002)).g;
          vec3 c = mix(uColor * 0.55, vec3(1.0, 0.97, 0.85), smoothstep(0.35, 0.8, sw * 0.6 + sw2 * 0.4 + (0.5 - r) * 0.6));
          gl_FragColor = vec4(c * (1.1 + 0.9 * sw) * uAmt, 1.0);
        }`,
      side: THREE.DoubleSide,
    })
  );
  door.position.y = H / 2 + T;
  g.add(door);
  const glow = glowSprite(hex, 13, 0.55);
  glow.position.y = H / 2;
  g.add(glow);
  g.userData.door = door;
  return g;
}

// ---------------------------------------------------------------- base world
export class World {
  constructor(ctx) {
    this.ctx = ctx; // { renderer, strokes, noise3 }
    this.scene = new THREE.Scene();
    this.colliders = [];
    this.rooms = [];
    this.glows = [];
    this.maps = null;
    this.extent = 220;
    this.boundary = 200;
    this.ceiling = 110;
    this.waterY = null;
    // restore state lives with the world so the gallery can show progress
    this.waves = Array.from({ length: 8 }, () => ({ pos: new THREE.Vector3(0, -9999, 0), r: 0, max: 0, fresh: 0 }));
    this.restore = 0;
    this.skyRestore = 0;
    this.skyTarget = 0;
    this.final = 0;
    this.stage = 'wisps'; // wisps -> memento -> echo -> finale -> free
    this.wisps = [];
    this.found = 0;
    this.done = false;
    this.env = {};
    this.style = {};
    this.tickers = [];
  }

  // ---- to be provided by each world
  heightAt() {
    return 0;
  }
  groundAt(x, z, y) {
    let g = this.heightAt(x, z);
    if (this.waterY !== null && g < this.waterY) g = this.waterY;
    for (const p of this.platforms ?? []) {
      if (x > p.minx && x < p.maxx && z > p.minz && z < p.maxz && y > p.y - 1.2) g = Math.max(g, p.y);
    }
    return g;
  }
  roomAt(x, z, y) {
    for (const r of this.rooms) if (x > r.minx && x < r.maxx && z > r.minz && z < r.maxz && y < r.ceil) return r;
    return null;
  }

  // ---- collision
  collide(p, rad) {
    for (const c of this.colliders) {
      if (p.y > c.top - 0.2 || (c.bottom !== undefined && p.y + 1.6 < c.bottom)) continue;
      if (c.r !== undefined) {
        const dx = p.x - c.x,
          dz = p.z - c.z;
        const d = Math.hypot(dx, dz),
          m = c.r + rad;
        if (d < m && d > 1e-4) {
          p.x = c.x + (dx / d) * m;
          p.z = c.z + (dz / d) * m;
        }
        continue;
      }
      const cs = Math.cos(c.ry ?? 0),
        sn = Math.sin(c.ry ?? 0);
      const dx = p.x - c.x,
        dz = p.z - c.z;
      let lx = dx * cs - dz * sn,
        lz = dx * sn + dz * cs;
      const hw = c.hw + rad,
        hd = c.hd + rad;
      if (Math.abs(lx) < hw && Math.abs(lz) < hd) {
        const px = hw - Math.abs(lx),
          pz = hd - Math.abs(lz);
        if (px < pz) lx = Math.sign(lx || 1) * hw;
        else lz = Math.sign(lz || 1) * hd;
        p.x = c.x + lx * cs + lz * sn;
        p.z = c.z - lx * sn + lz * cs;
      }
    }
    const d = Math.hypot(p.x - (this.center?.x ?? 0), p.z - (this.center?.z ?? 0));
    if (d > this.boundary) {
      const k = this.boundary / d;
      p.x = (this.center?.x ?? 0) + (p.x - (this.center?.x ?? 0)) * k;
      p.z = (this.center?.z ?? 0) + (p.z - (this.center?.z ?? 0)) * k;
    }
  }
  blocked(x, y, z) {
    for (const c of this.colliders) {
      if (y > c.top || (c.bottom !== undefined && y < c.bottom)) continue;
      if (c.r !== undefined) {
        if (Math.hypot(x - c.x, z - c.z) < c.r) return true;
        continue;
      }
      const cs = Math.cos(c.ry ?? 0),
        sn = Math.sin(c.ry ?? 0);
      const dx = x - c.x,
        dz = z - c.z;
      if (Math.abs(dx * cs - dz * sn) < c.hw && Math.abs(dx * sn + dz * cs) < c.hd) return true;
    }
    return false;
  }

  // ---- story pieces
  setupStory({ wisps, memento, echo, exit }) {
    this.wispDefs = wisps;
    for (const def of wisps) {
      const w = new Wisp(def);
      this.wisps.push(w);
      this.scene.add(w.group);
    }
    // memento: a small glowing keepsake that appears once the colours are back
    this.memento = memento;
    const mg = new THREE.Group();
    mg.position.set(...memento.pos);
    if (memento.model) mg.add(memento.model);
    mg.add(glowSprite(memento.color ?? 0xfff0c0, 5, 0.7));
    const mb = beam(memento.color ?? 0xfff0c0, 90, 1.3);
    mg.add(mb);
    mg.visible = false;
    mg.userData.beam = mb;
    this.mementoGroup = mg;
    this.scene.add(mg);
    // echo of the artist
    this.echo = echo;
    const eg = new THREE.Group();
    eg.position.set(...echo.pos);
    eg.rotation.y = echo.ry ?? 0;
    if (echo.model) eg.add(echo.model);
    const eb = beam(echo.color ?? 0xffe2a8, 80, 1.1);
    eb.visible = false;
    eg.add(eb);
    eg.userData.beam = eb;
    this.echoGroup = eg;
    this.scene.add(eg);
    // way out
    this.exit = exit;
    const pg = framePortal(exit.color ?? 0xf2cf6a);
    pg.position.set(...exit.pos);
    pg.rotation.y = exit.ry ?? 0;
    pg.visible = false;
    pg.scale.setScalar(0.001);
    this.portal = pg;
    this.scene.add(pg);
    this.echoTalked = 0;
  }

  // start a colour wave
  bloom(pos, max = 70) {
    let slot = this.waves.find((w) => w.max === 0);
    if (!slot) slot = this.waves[0];
    slot.pos.copy(pos);
    slot.r = 0.5;
    slot.max = max;
    slot.fresh = 1;
  }

  // push this world's look into the shared uniforms
  activate(pipeline) {
    const e = this.env;
    G.uSunDir.value.copy(e.sunDir).normalize();
    G.uSunColor.value.set(e.sunColor);
    G.uSkyColor.value.set(e.skyColor);
    G.uGroundColor.value.set(e.groundColor);
    G.uFogColor.value.set(e.fogColor);
    G.uFog.value.set(e.fog[0], e.fog[1], e.fog[2], e.fog[3]);
    G.uPaper.value.set(e.paper ?? 0xede6d4);
    G.uInk.value.set(e.ink ?? 0x3a3a40);
    G.uRimColor.value.set(e.rim ?? 0xffe08a);
    G.uLamp.value = e.lamp ?? 1;
    G.uWobble.value = e.wobble ?? 0;
    G.uSway.value = e.sway ?? 0.25;
    this.maps?.apply();
    this.syncUniforms();
    pipeline?.applyStyle(this.style);
  }
  syncUniforms() {
    for (let i = 0; i < 8; i++) {
      const w = this.waves[i];
      G.uWaves.value[i].set(w.pos.x, w.pos.y, w.pos.z, w.r);
      G.uWaveFresh.value[i] = w.fresh;
    }
    G.uRestore.value = this.restore;
    G.uSkyRestore.value = this.skyRestore;
    if (this.sky) this.sky.uniforms.uFinal.value = this.final;
  }

  // jump straight to a state (thumbnails, debugging)
  setRestored(v) {
    this.restore = v;
    this.skyRestore = v;
    this.skyTarget = v;
    this.final = v;
    this.onRestore?.(v);
  }

  update(dt, time, player, game) {
    for (const w of this.waves) {
      if (w.max > 0 && w.r < w.max) w.r = Math.min(w.max, w.r + dt * (9 + w.r * 0.22));
      w.fresh = Math.max(0, w.fresh - dt * 0.16);
    }
    this.skyRestore = damp(this.skyRestore, this.skyTarget, 0.9, dt);
    if (this.stage === 'finale' || this.stage === 'free') {
      this.restore = Math.min(1, this.restore + dt * 0.3);
      this.final = Math.min(1, this.final + dt * 0.35);
    }
    for (const w of this.wisps) w.update(dt);
    if (this.mementoGroup?.visible) {
      const m = this.mementoGroup;
      m.rotation.y += dt * 0.9;
      m.position.y = this.memento.pos[1] + Math.sin(time * 1.4) * 0.25;
    }
    if (this.portal?.visible) {
      const s = this.portal.scale.x;
      this.portal.scale.setScalar(damp(s, 1, 2.2, dt));
    }
    for (const t of this.tickers) t(dt, time, player);
    this.tick?.(dt, time, player, game);
    this.syncUniforms();
  }
}

export { Wisp, beam };
