import * as THREE from 'three';
import { World, beam } from '../engine/world.js';
import { Sky } from '../engine/sky.js';
import { paintMaterial, glowPoints, GroundMaps, G } from '../engine/paint.js';
import { Builder, mix, xf } from '../engine/build.js';
import { rng, clamp, damp } from '../engine/gl.js';

// The Gallery Between: a half-dark copy of the museum that lives inside the
// paintings. Every frame is a door. It warms up as the paintings come home.

const SKY = /* glsl */ `
uniform float uDawn;
uniform float uFlash;
vec3 skyColor(vec3 d){
  float h = clamp(d.y, 0.0, 1.0);
  vec3 night = mix(vec3(0.05, 0.07, 0.16), vec3(0.01, 0.015, 0.05), h);
  vec3 dawn = mix(vec3(1.0, 0.72, 0.45), vec3(0.42, 0.56, 0.86), smoothstep(0.0, 0.7, h));
  vec3 c = mix(night, dawn, uDawn);
  float cl = texture(uNoise3, d * 0.12 + vec3(uTime * 0.004, 0.0, 0.0)).r * 0.6 + texture(uNoise3, d * 0.4 + vec3(uTime * 0.008, 0.0, 0.0)).g * 0.4;
  c = mix(c, mix(vec3(0.10, 0.11, 0.2), vec3(1.0, 0.85, 0.75), uDawn), smoothstep(0.45, 0.7, cl) * 0.6);
  float st = texture(uNoise3, d * 6.0).b;
  c += vec3(0.9, 0.95, 1.0) * smoothstep(0.93, 0.99, st) * (1.0 - uDawn) * (1.0 - smoothstep(0.45, 0.6, cl));
  c += vec3(0.7, 0.8, 1.0) * uFlash * (0.4 + 0.6 * smoothstep(0.4, 0.7, cl));
  return c;
}
`;

const _tmp = new THREE.Color();
const SLOTS = [-62, -31, 0, 31, 62]; // degrees around the curved wall
const RAD = 23;
const SIG = { starry: '#5b8cff', wave: '#3fa0c8', pearl: '#f2c94c', scream: '#ff7a3c', mona: '#9fb86a' };

function plaque(title, sub) {
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 200;
  const g = c.getContext('2d');
  g.fillStyle = '#e9dcb8';
  g.fillRect(0, 0, 768, 200);
  g.strokeStyle = '#8a6a2a';
  g.lineWidth = 6;
  g.strokeRect(8, 8, 752, 184);
  g.fillStyle = '#2a2218';
  g.textAlign = 'center';
  g.font = 'italic 600 68px "Cormorant Garamond", Georgia, serif';
  g.fillText(title, 384, 92);
  g.font = '34px "Cormorant Garamond", Georgia, serif';
  g.fillText(sub, 384, 150);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

export class GalleryWorld extends World {
  constructor(ctx) {
    super(ctx);
    this.id = 'gallery';
    this.title = 'The Gallery Between';
    this.music = 'gallery';
    this.extent = 40;
    this.boundary = 60;
    this.ceiling = 4.5;
    this.wispDefs = [];
    this.restore = 1;
    this.skyRestore = 1;
    this.skyTarget = 1;
    this.env = {
      sunDir: new THREE.Vector3(0.2, 0.9, 0.5),
      sunColor: 0x4a4f70,
      skyColor: 0x6a6f95,
      groundColor: 0x3a3848,
      fogColor: 0x141826,
      fog: [0.006, 0, 0.0, 0.5],
      paper: 0xd9d2c0,
      ink: 0x2c2e3a,
      rim: 0xffe08a,
      lamp: 1.5,
    };
    this.style = { kuwahara: 1.3, bloom: 0.7, threshold: 0.95, grain: 0.07, saturation: 1.1, contrast: 1.06, vignette: 0.9, sketchLine: 0.5, outline: 0.15, ink: 0x15151f };
    this.spawn = { pos: [0, 5], yaw: Math.PI };
    this.pictures = [];
    this.busy = false;
    this.build();
  }

  heightAt() {
    return 0;
  }

  build() {
    const { strokes, noise3 } = this.ctx;
    const S = this.scene;
    const R = rng(77);
    const maps = (this.maps = new GroundMaps(this.extent, () => 0));

    this.sky = new Sky({ body: SKY, noise3, uniforms: { uDawn: { value: 0 }, uFlash: { value: 0 } } });
    S.add(this.sky.mesh);

    const B = new Builder();
    // chequered floor
    for (let i = -17; i <= 17; i++)
      for (let j = -17; j <= 17; j++) {
        const x = i * 2,
          z = j * 2;
        if (Math.hypot(x, z) > 33) continue;
        const dark = (i + j) & 1;
        B.box(2, 0.3, 2, dark ? mix(0x2b2a33, 0x3a3440, R()) : mix(0xbcae94, 0xd6c8a8, R()), x, -0.3, z);
      }
    // curved wall behind the paintings, straight wings to the sides
    const wallCol = (x, y) => (y < -3.6 ? new THREE.Color(0x2a1c16) : mix(0x1d3f44, 0x24505a, clamp((y + 5) / 10)));
    const HWALL = 11;
    for (let a = -100; a <= 100; a += 4) {
      const r = (a * Math.PI) / 180;
      const x = Math.sin(r) * (RAD + 0.9),
        z = -Math.cos(r) * (RAD + 0.9) + 6;
      B.box(1.75, HWALL, 0.6, wallCol, x, 0, z, -r);
      this.colliders.push({ x, z, hw: 0.95, hd: 0.5, ry: -r, top: 99 });
    }
    for (const sx of [-1, 1]) {
      B.box(0.6, HWALL, 30, wallCol, sx * 24.2, 0, 22);
      this.colliders.push({ x: sx * 24.2, z: 22, hw: 0.5, hd: 15, ry: 0, top: 99 });
    }
    B.box(49, HWALL, 0.6, wallCol, 0, 0, 37);
    this.colliders.push({ x: 0, z: 37, hw: 25, hd: 0.5, ry: 0, top: 99 });
    // ceiling ring with a round skylight
    for (let a = 0; a < 360; a += 6) {
      const r = (a * Math.PI) / 180;
      for (const rr of [14, 20, 26, 32]) B.box(rr * 0.66, 0.4, 6.4, 0x15161d, Math.sin(r) * rr, HWALL, Math.cos(r) * rr + 6, r + Math.PI / 2);
    }
    // columns between the pictures
    for (const a of [-78, -46.5, -15.5, 15.5, 46.5, 78]) {
      const r = (a * Math.PI) / 180;
      const x = Math.sin(r) * (RAD - 0.2),
        z = -Math.cos(r) * (RAD - 0.2) + 6;
      B.cyl(0.42, 0.5, HWALL, mix(0xc9bfa6, 0xe6dcc2, R()), x, 0, z, 12);
      B.box(1.3, 0.5, 1.3, 0xb8ab8e, x, 0, z, -r);
      this.colliders.push({ x, z, r: 0.6, top: 99 });
    }
    // benches
    for (const [x, z] of [[-5, 9], [5, 9]]) {
      B.box(3.4, 0.2, 1.1, 0x6a3a22, x, 0.45, z);
      B.box(0.2, 0.45, 1.0, 0x2a2018, x - 1.4, 0, z);
      B.box(0.2, 0.45, 1.0, 0x2a2018, x + 1.4, 0, z);
      this.colliders.push({ x, z, hw: 1.8, hd: 0.65, ry: 0, top: 0.7 });
    }
    // rope posts in front of each picture
    S.add(B.mesh(paintMaterial({ stroke: strokes.soft, scale: 0.22, contrast: 0.35, hueVar: 0.25, warp: 0.1, rim: 0.12, band: 0.3, big: 0.5 })));

    // picture frames (filled in by hang())
    this.frameB = new Builder();
    this.slots = SLOTS.map((deg) => {
      const r = (deg * Math.PI) / 180;
      return { x: Math.sin(r) * RAD, z: -Math.cos(r) * RAD + 6, ry: -r, nx: -Math.sin(r), nz: Math.cos(r) };
    });

    // the way home: a tall doorway opposite the paintings
    const door = new Builder();
    const gold = (x, y) => mix(0x8a6a2a, 0xe9c96a, clamp(Math.sin(y * 5 + x * 3) * 0.5 + 0.5));
    door.box(0.6, 8, 0.8, gold, -2.6, 0, 36.2);
    door.box(0.6, 8, 0.8, gold, 2.6, 0, 36.2);
    door.box(5.8, 0.7, 0.8, gold, 0, 8, 36.2);
    S.add(door.mesh(paintMaterial({ stroke: strokes.soft, scale: 0.5, contrast: 0.3, rim: 0.3 })));
    this.homeMat = new THREE.ShaderMaterial({
      uniforms: { uTime: G.uTime, uOpen: { value: 0 }, uNoise: G.uNoise },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv; uniform float uTime; uniform float uOpen; uniform sampler2D uNoise;
        void main(){
          float n = texture2D(uNoise, vec2(vUv.x * 0.03, vUv.y * 0.02 - uTime * 0.003)).r;
          vec3 shut = vec3(0.05, 0.055, 0.08) * (0.7 + 0.6 * n);
          vec3 open = mix(vec3(1.0, 0.72, 0.42), vec3(1.0, 0.96, 0.82), vUv.y) * (1.3 + 0.7 * n);
          gl_FragColor = vec4(mix(shut, open, uOpen), 1.0);
        }`,
    });
    const home = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 8), this.homeMat);
    home.position.set(0, 4, 36.0);
    home.rotation.y = Math.PI;
    S.add(home);
    this.homePos = new THREE.Vector3(0, 0, 35);
    this.homeBeam = beam(0xffe2a0, 10, 2.2);
    this.homeBeam.position.set(0, 0, 34.5);
    this.homeBeam.visible = false;
    S.add(this.homeBeam);

    // dust in the lamplight
    for (let i = 0; i < 90; i++) {
      const a = R() * 6.283,
        d = R() * 24;
      this.glows.push({ p: [Math.sin(a) * d, 0.6 + R() * 6, Math.cos(a) * d + 6], c: 0xffe6b0, size: 0.14 + R() * 0.14, drift: 1.2, needsRestore: false });
    }
  }

  // called once the five paintings have been rendered
  hang(worlds) {
    const S = this.scene;
    const { strokes } = this.ctx;
    const FB = this.frameB;
    worlds.forEach((w, i) => {
      const s = this.slots[i];
      const pw = Math.min(6.4, 5.2 * w.aspect),
        ph = pw / w.aspect;
      const cy = 1.5 + ph / 2 + (5.2 - ph) * 0.3;
      const M = xf(s.x, 0, s.z, s.ry);
      const gold = (x, y) => mix(0x9a7426, 0xf2d37a, clamp(Math.sin((x + y) * 6) * 0.5 + 0.5));
      const T = 0.42;
      FB.box(pw + T * 2, T, 0.5, gold, 0, cy + ph / 2, 0.25, 0, undefined, M);
      FB.box(pw + T * 2, T, 0.5, gold, 0, cy - ph / 2 - T, 0.25, 0, undefined, M);
      FB.box(T, ph, 0.5, gold, -pw / 2 - T / 2, cy - ph / 2, 0.25, 0, undefined, M);
      FB.box(T, ph, 0.5, gold, pw / 2 + T / 2, cy - ph / 2, 0.25, 0, undefined, M);
      const mat = new THREE.ShaderMaterial({
        uniforms: { tGrey: { value: w.thumbGrey.texture }, tColor: { value: w.thumbColor.texture }, uDone: { value: 0 }, uPulse: { value: 0 }, uTime: G.uTime, uNoise: G.uNoise },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          varying vec2 vUv; uniform sampler2D tGrey, tColor, uNoise; uniform float uDone, uPulse, uTime;
          void main(){
            vec3 g = texture2D(tGrey, vUv).rgb, c = texture2D(tColor, vUv).rgb;
            float n = texture2D(uNoise, vUv * 0.012).r * 0.7 + texture2D(uNoise, vUv * 0.05).g * 0.3;
            float m = 1.0 - smoothstep(uDone * 1.15 - 0.1, uDone * 1.15, n);
            vec3 col = mix(g * 0.82, c * 1.05, m);
            col *= 1.0 + uPulse * (0.12 + 0.12 * sin(uTime * 2.0));
            gl_FragColor = vec4(col, 1.0);
          }`,
      });
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat);
      pic.position.set(s.x + s.nx * 0.3, cy, s.z + s.nz * 0.3);
      pic.rotation.y = s.ry;
      S.add(pic);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.6), new THREE.MeshBasicMaterial({ map: plaque(w.title, w.sub), color: 0xb8b0a0 }));
      pl.position.set(s.x + s.nx * 0.34, 0.95, s.z + s.nz * 0.34);
      pl.rotation.y = s.ry;
      S.add(pl);
      // a warm pool of light under every frame
      const fx = s.x + s.nx * 4,
        fz = s.z + s.nz * 4;
      this.maps.lamp(fx, fz, 9, 0xffd9a0, 0.75);
      this.maps.lamp(s.x + s.nx * 1.2, s.z + s.nz * 1.2, 5, 0xffe2b0, 0.7);
      const sb = beam(0xffe2b0, 9.5, 2.6);
      sb.position.set(s.x + s.nx * 1.6, 0.4, s.z + s.nz * 1.6);
      sb.material.uniforms.uAmt.value = 0.1;
      S.add(sb);
      this.pictures.push({ world: w, mat, slot: s, stand: new THREE.Vector3(s.x + s.nx * 2.6, 0, s.z + s.nz * 2.6), mark: new THREE.Vector3(s.x + s.nx * 0.6, cy, s.z + s.nz * 0.6), beam: sb });
    });
    const fm = FB.mesh(paintMaterial({ stroke: strokes.soft, scale: 0.6, contrast: 0.3, hueVar: 0.2, rim: 0.4, band: 0.3 }));
    fm.material.uniforms.uRestore = { value: 1 };
    S.add(fm);
    this.maps.lamp(0, 30, 12, 0xffd9a0, 0.4);
    S.add(glowPoints(this.glows, 1));
    this.maps.finish();
  }

  arrive(game, fromId) {
    const done = game.doneCount();
    const n = game.order.length;
    this.restore = 1;
    this.dawnTarget = done / n;
    const pic = this.pictures.find((p) => p.world.id === fromId);
    if (pic) {
      const s = pic.slot;
      game.player.place(new THREE.Vector3(s.x + s.nx * 5.5, 0, s.z + s.nz * 5.5), Math.atan2(s.nx, s.nz));
    } else game.player.place(new THREE.Vector3(0, 0, 14), Math.PI);
    game.player.setPigment(0xfff2c0);
    this.busy = false;
    this.cool = 1.5;
    const next = this.pictures.find((p) => !p.world.done);
    this.pictures.forEach((p) => (p.mat.uniforms.uPulse.value = p === next ? 1 : 0));
    this.homeBeam.visible = done === n;
  }

  welcome(game, fromId, first) {
    const done = game.doneCount(),
      n = game.order.length;
    const who = 'The Curator';
    if (first) {
      this.flash = 1;
      game.ui.say(who, 'Mira. Can you hear me? The storm has broken the paths between the frames.');
      game.ui.say(who, 'Every painting holds the moment it was made. Step inside, and bring its colour home.');
      game.ui.say(who, 'Begin with the night sky. Walk up to its frame.');
    } else if (done === n) {
      game.ui.say(who, 'All five are whole, and the sun is nearly up.');
      game.ui.say(who, 'The way home is open behind you. Thank you, Mira.');
    } else if (fromId && game.worlds[fromId].done) {
      game.ui.say(who, `${game.worlds[fromId].title} breathes again. ${n - done} ${n - done === 1 ? 'painting remains' : 'paintings remain'} before sunrise.`);
    }
    game.ui.objective(done === n ? 'Sunrise · walk through the door of light' : `${done} of ${n} paintings restored · walk into a frame`);
  }

  story(dt, game) {
    const p = game.player.pos;
    this.cool = Math.max(0, (this.cool ?? 0) - dt);
    const markers = [];
    let near = null;
    for (const pic of this.pictures) {
      const d = Math.hypot(pic.stand.x - p.x, pic.stand.z - p.z);
      if (!pic.world.done) markers.push({ pos: pic.mark, color: SIG[pic.world.id] ?? '#ffe08a', dist: d });
      if (d < 7 && (!near || d < near.d)) near = { pic, d };
      if (d < 2.3 && !this.busy && this.cool <= 0) {
        this.busy = true;
        game.ui.setMarkers([], game.camera, 1, 1);
        game.enterWorld(pic.world.id);
        return;
      }
    }
    const all = game.doneCount() === game.order.length;
    if (all) {
      const d = Math.hypot(this.homePos.x - p.x, this.homePos.z - p.z);
      markers.push({ pos: new THREE.Vector3(0, 4, 35.5), color: '#ffe2a0', dist: d });
      if (d < 2.6 && !this.busy) {
        this.busy = true;
        game.ending();
        return;
      }
    }
    game.ui.prompt(near ? (near.pic.world.done ? `${near.pic.world.title} · step in again` : `Step into ${near.pic.world.title}`) : '');
    game.ui.setMarkers(markers, game.camera, window.innerWidth, window.innerHeight);
  }

  tick(dt, time, player, game) {
    const u = this.sky.uniforms;
    u.uDawn.value = damp(u.uDawn.value, this.dawnTarget ?? 0, 0.6, dt);
    this.flash = Math.max(0, (this.flash ?? 0) - dt * 0.8);
    // the storm is still muttering outside while paintings are missing
    if ((this.dawnTarget ?? 0) < 1 && Math.random() < dt * 0.07) this.flash = 0.6 + Math.random() * 0.4;
    u.uFlash.value = this.flash * (0.5 + 0.5 * Math.sin(time * 40));
    for (const pic of this.pictures) {
      const m = pic.mat.uniforms;
      m.uDone.value = damp(m.uDone.value, pic.world.done ? 1 : 0, 0.7, dt);
    }
    this.homeMat.uniforms.uOpen.value = damp(this.homeMat.uniforms.uOpen.value, game && game.doneCount() === game.order.length ? 1 : 0, 1, dt);
    // night-blue room that warms towards sunrise as paintings come home
    if (game && game.world === this) {
      const k = u.uDawn.value;
      G.uSkyColor.value.set(0x5a5f86).lerp(_tmp.set(0xc4b49a), k);
      G.uSunColor.value.set(0x3c4266).lerp(_tmp.set(0xf0b880), k);
      G.uGroundColor.value.set(0x302e40).lerp(_tmp.set(0x74604e), k);
      G.uFogColor.value.set(0x141826).lerp(_tmp.set(0x6a5a50), k);
    }
  }
}
