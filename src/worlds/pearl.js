import * as THREE from 'three';
import { World, ghostMaterial, beam } from '../engine/world.js';
import { Sky } from '../engine/sky.js';
import { paintMaterial, waterMaterial, glowPoints, GroundMaps, G } from '../engine/paint.js';
import { Builder, terrain, ribbon, patch, mountainRing, blobTree, house, figure, tint, mix, jitter, xf } from '../engine/build.js';
import { rng, fbm, vnoise, smooth, clamp, lerp, damp } from '../engine/gl.js';
import { loadFigure } from '../engine/models.js';

// Delft, late afternoon. Thin glazes, soft edges, light that comes from one side.
const SKY = /* glsl */ `
uniform vec3 uSun;
vec3 skyColor(vec3 dIn){
  vec3 d = normalize(vec3(dIn.x, abs(dIn.y) + 0.002, dIn.z));
  float h = d.y;
  vec3 zen = vec3(0.36, 0.52, 0.74), hor = vec3(0.98, 0.84, 0.62);
  vec3 col = mix(hor, zen, pow(smoothstep(0.0, 0.75, h), 0.7));
  float sd = max(dot(d, uSun), 0.0);
  col += vec3(1.0, 0.72, 0.38) * pow(sd, 6.0) * 0.5;
  // heaped Dutch cloud: bright where it faces the sun, slate underneath
  vec3 q = d / (d.y + 0.32);
  vec3 w = vec3(q.x * 0.5 + uTime * 0.004, q.z * 0.5, 0.0);
  float c1 = texture(uNoise3, w * 0.22).r;
  float c2 = texture(uNoise3, w * 0.55 + 0.3).g;
  float c3 = texture(uNoise3, w * 1.4 + 0.6).b;
  float cl = c1 * 0.55 + c2 * 0.3 + c3 * 0.15;
  float cover = smoothstep(0.47, 0.62, cl) * smoothstep(0.02, 0.16, h);
  float lit = clamp(0.55 + (c2 - 0.5) * 1.6 + sd * 0.5, 0.0, 1.0);
  vec3 cloud = mix(vec3(0.50, 0.50, 0.58), vec3(1.0, 0.93, 0.80), lit);
  cloud = mix(cloud, vec3(1.0, 0.80, 0.56), pow(sd, 3.0) * 0.5);
  col = mix(col, cloud, cover * 0.94);
  vec3 sk = uPaper * (0.99 - cover * 0.10 * (0.5 + c3) - (1.0 - smoothstep(0.0, 0.2, h)) * 0.05);
  float m = paintedIn(d, c3);
  return mix(sk, col, m);
}
`;

const BRICK = [0x9c4b33, 0x8a3f2a, 0xb26240, 0x7c4230, 0xa8553a, 0xc07850, 0x8f5a44];
const ROOF = [0xb4532f, 0x9c4428, 0x3f4650, 0xa85a34, 0x4a4a52];

// her face is painted, the way a face is: soft sockets, a wet highlight in
// each eye, the lower lip catching the light
function faceTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.translate(256, 256);
  g.scale(1.24, 1.24);
  g.translate(-256, -256);
  const soft = (x, y, rx, ry, col, a) => {
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    grd.addColorStop(0, `rgba(${col},${a})`);
    grd.addColorStop(1, `rgba(${col},0)`);
    g.save();
    g.translate(x, y);
    g.scale(rx, ry);
    g.fillStyle = grd;
    g.beginPath();
    g.arc(0, 0, 1, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  // shadowed side of the face (light comes from her right, our left)
  soft(390, 280, 150, 230, '120,78,48', 0.34);
  soft(256, 150, 190, 60, '120,80,50', 0.16);
  // blush and the warmth around the mouth
  soft(140, 300, 62, 46, '226,120,104', 0.3);
  soft(366, 300, 56, 44, '214,110,96', 0.22);
  // eye sockets
  for (const ex of [158, 348]) soft(ex, 214, 56, 30, '112,70,46', 0.3);
  for (const [ex, sh] of [[158, 0], [348, 6]]) {
    g.save();
    g.translate(ex, 216);
    // white of the eye
    g.beginPath();
    g.moveTo(-34, 2);
    g.quadraticCurveTo(-4, -22, 34, -1);
    g.quadraticCurveTo(2, 17, -34, 2);
    g.closePath();
    g.fillStyle = '#efe6d6';
    g.fill();
    g.save();
    g.clip();
    // she is looking straight at you
    g.fillStyle = '#4a3220';
    g.beginPath();
    g.arc(-6 + sh, -1, 15, 0, 7);
    g.fill();
    g.fillStyle = '#17100c';
    g.beginPath();
    g.arc(-6 + sh, -1, 7.5, 0, 7);
    g.fill();
    g.restore();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(-12 + sh, -7, 4.2, 0, 7);
    g.fill();
    // upper lid
    g.strokeStyle = 'rgba(70,42,26,0.9)';
    g.lineWidth = 4.5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-36, 3);
    g.quadraticCurveTo(-4, -25, 36, -2);
    g.stroke();
    g.strokeStyle = 'rgba(120,80,56,0.45)';
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(-30, 6);
    g.quadraticCurveTo(2, 18, 32, 2);
    g.stroke();
    // brow, barely there
    g.strokeStyle = 'rgba(128,92,62,0.42)';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(-40, -36);
    g.quadraticCurveTo(-2, -52, 42, -38);
    g.stroke();
    g.restore();
  }
  // nose: only the shadow it throws
  g.strokeStyle = 'rgba(128,84,56,0.4)';
  g.lineWidth = 7;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(276, 226);
  g.quadraticCurveTo(286, 270, 280, 296);
  g.stroke();
  soft(262, 304, 30, 13, '120,76,50', 0.4);
  soft(240, 284, 16, 18, '255,240,220', 0.3);
  // lips, just parted
  g.fillStyle = '#b4493c';
  g.beginPath();
  g.moveTo(206, 356);
  g.quadraticCurveTo(232, 340, 252, 348);
  g.quadraticCurveTo(272, 340, 300, 356);
  g.quadraticCurveTo(254, 364, 206, 356);
  g.fill();
  g.fillStyle = '#cf6a58';
  g.beginPath();
  g.moveTo(210, 360);
  g.quadraticCurveTo(254, 366, 298, 360);
  g.quadraticCurveTo(256, 396, 210, 360);
  g.fill();
  g.strokeStyle = 'rgba(70,24,22,0.85)';
  g.lineWidth = 3.5;
  g.beginPath();
  g.moveTo(208, 357);
  g.quadraticCurveTo(254, 364, 299, 357);
  g.stroke();
  soft(236, 374, 16, 7, '255,236,226', 0.75);
  soft(254, 410, 40, 14, '120,78,52', 0.3);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

function buildGirl(strokes) {
  const mat = paintMaterial({ stroke: strokes.soft, scale: 3.2, contrast: 0.2, hueVar: 0.14, objSpace: 1, rim: 0.05, band: 0.3, warp: 0, big: 0, impasto: 0.02 });
  const skinMat = paintMaterial({ stroke: strokes.soft, scale: 2.2, contrast: 0.05, hueVar: 0.03, objSpace: 1, rim: 0.03, band: 0.42, warp: 0, big: 0, impasto: 0 });
  const part = (geo, col, m, mt = mat) => {
    const g = tint(geo, col);
    if (m) g.applyMatrix4(m);
    const mesh = new THREE.Mesh(g, mt);
    mesh.frustumCulled = false;
    return mesh;
  };
  const g = new THREE.Group();
  const skin = 0xf4d6b6;
  // long skirt, jacket, collar
  g.add(part(new THREE.CylinderGeometry(0.17, 0.42, 1.05, 14), 0x5a4426, xf(0, 0.52, 0)));
  g.add(part(new THREE.SphereGeometry(0.2, 18, 14), (x, y, z) => mix(0x7a5a26, 0xb8923c, clamp(y * 3 + 0.5)), xf(0, 1.19, 0, 0, 1.2, 1.0, 0.86)));
  g.add(part(new THREE.CylinderGeometry(0.19, 0.2, 0.3, 14), 0x8a6a2c, xf(0, 1.0, 0, 0, 1.18, 1, 0.9)));
  g.add(part(new THREE.CylinderGeometry(0.07, 0.135, 0.07, 16), 0xf4efe2, xf(0, 1.385, 0.0)));
  g.add(part(new THREE.CylinderGeometry(0.048, 0.056, 0.14, 14), skin, xf(0, 1.45, 0), skinMat));

  const head = new THREE.Group();
  head.position.set(0, 1.585, 0);
  g.add(head);
  const HS = [0.93, 1.15, 1.0];
  head.add(part(new THREE.SphereGeometry(0.108, 32, 24), skin, xf(0, 0, 0, 0, ...HS), skinMat));
  // the painted face sits a hair above the skin
  const fgeo = new THREE.SphereGeometry(0.1092, 32, 24, Math.PI / 2 - 0.9, 1.8, Math.PI / 2 - 0.8, 1.6);
  fgeo.applyMatrix4(xf(0, 0, 0, 0, 1, 1, 1, 0.4));
  fgeo.applyMatrix4(xf(0, 0, 0, 0, ...HS));
  const faceMesh = new THREE.Mesh(fgeo, new THREE.MeshBasicMaterial({ map: faceTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  faceMesh.renderOrder = 3;
  head.add(faceMesh);
  // turban: ultramarine wrap, ochre cloth falling behind
  head.add(part(new THREE.SphereGeometry(0.122, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), (x, y, z) => mix(0x2d4f9c, 0x8fb0e2, clamp(z * 5 + 0.45)), xf(0, 0.03, -0.012, 0, 1.0, 1.08, 1.06, -0.38)));
  head.add(part(new THREE.SphereGeometry(0.075, 16, 12), 0xd6ae48, xf(0, 0.13, -0.05, 0, 1.25, 0.6, 1.1)));
  head.add(part(new THREE.CylinderGeometry(0.03, 0.062, 0.36, 10), (x, y, z) => mix(0xa8842e, 0xe6c860, clamp(y * 2.5 + 0.5)), xf(0.012, -0.075, -0.125, 0, 1.3, 1, 0.55, 0.16)));
  // the pearl: one soft grey bead, one hard white highlight, the collar reflected below
  head.add(part(new THREE.SphereGeometry(0.022, 16, 12), 0xb9bbb6, xf(0.094, -0.09, -0.004)));
  const dot = (r, hex, x, y, z) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), new THREE.MeshBasicMaterial({ color: hex }));
    m.position.set(x, y, z);
    head.add(m);
    return m;
  };
  const face = [faceMesh, dot(0.007, 0xffffff, 0.094 - 0.009, -0.082, 0.014), dot(0.0055, 0xe8e6da, 0.094, -0.106, 0.01)];
  return { group: g, head, mat, face };
}

export class PearlWorld extends World {
  constructor(ctx) {
    super(ctx);
    this.id = 'pearl';
    this.index = 2;
    this.kicker = 'III · Delft, Dutch Republic, about 1665';
    this.title = 'Girl with a Pearl Earring';
    this.sub = 'Johannes Vermeer';
    this.aspect = 39 / 44.5;
    this.extent = 200;
    this.boundary = 180;
    this.ceiling = 60;
    this.waterY = -1.15;
    const sun = new THREE.Vector3(-0.72, 0.36, 0.3).normalize();
    this.sun = sun;
    this.env = {
      sunDir: sun,
      sunColor: 0xd9a868,
      skyColor: 0x8f96a8,
      groundColor: 0x5c4e42,
      fogColor: 0xe9cfa6,
      fog: [0.0042, 0, 0.02, 0.8],
      paper: 0xf1e8d4,
      ink: 0x45403a,
      rim: 0xffe9a0,
      lamp: 1.2,
      sway: 0.18,
    };
    this.style = { kuwahara: 2.1, bloom: 0.42, threshold: 1.02, soft: 0.1, grain: 0.07, crackle: 0.07, saturation: 1.08, contrast: 1.08, vignette: 0.75, tint: [1.03, 1.0, 0.93], outline: 0.1, ink: 0x2a2018 };
    this.spawn = { pos: [34, -25.9], yaw: Math.PI };
    this.view = { pos: [34.3, 1.4, -31.9], target: [33.98, 1.33, -33.4], fov: 27 };
    this.music = 'pearl';
    this.turn = 1;
    this.pullBack = 3.2;
    this.pullUp = 0.5;
    this.build();
  }

  baseH(x, z) {
    const canal = smooth(6.2, 7.2, Math.abs(z)) * (1 - smooth(140, 150, Math.abs(x)) * 0);
    const town = 1 - smooth(110, 150, Math.hypot(x, z * 1.1));
    return canal * 0 - (1 - canal) * 2.6 + (1 - town) * (fbm(x * 0.01, z * 0.01, 2) - 0.5) * 2 * canal;
  }
  heightAt(x, z) {
    // two humpback bridges
    for (const bx of [0, -64]) if (Math.abs(x - bx) < 3.3 && Math.abs(z) < 10.5) return 2.1 * Math.cos((z / 10.5) * Math.PI * 0.5);
    return this.baseH(x, z);
  }

  build() {
    const { strokes, noise3 } = this.ctx;
    const R = rng(1665);
    const S = this.scene;
    const H = (x, z) => this.heightAt(x, z);
    const maps = (this.maps = new GroundMaps(this.extent, H));
    this.sky = new Sky({ body: SKY, noise3, uniforms: { uSun: { value: this.sun } } });
    S.add(this.sky.mesh);

    const soft = (o = {}) => paintMaterial({ stroke: strokes.soft, scale: 0.2, contrast: 0.18, hueVar: 0.16, warp: 0.15, impasto: 0.04, rim: 0.08, band: 0.24, big: 0.35, ...o });

    // ---------------- ground: cobbled town, green polder beyond
    const groundCol = (x, z, y) => {
      const town = 1 - smooth(105, 140, Math.hypot(x, z * 1.1));
      const cob = mix(0xa89878, 0xc9b592, vnoise(x * 0.3, z * 0.3));
      const pol = mix(0x7f9a4a, 0xb0b458, vnoise(x * 0.02, z * 0.04));
      const c = pol.lerp(cob, town);
      if (y < -0.4) c.lerp(new THREE.Color(0x5a4a3a), 0.7);
      return c;
    };
    S.add(new THREE.Mesh(terrain((x, z) => this.baseH(x, z), 420, 230, groundCol, 0.72, 2.2), soft({ stroke: strokes.dab, scale: 0.3, contrast: 0.26, hueVar: 0.2 })));

    // canal
    const wg = new THREE.PlaneGeometry(900, 15, 60, 2);
    wg.rotateX(-Math.PI / 2);
    const canal = new THREE.Mesh(wg, waterMaterial({ stroke: strokes.oil, deep: 0x2f4238, shallow: 0x5a7a62, reflect: 0xf2c98a, glint: 0xfff0c0, scale: 0.09, glintAmt: 1.6, flow: 0.006 }));
    canal.position.y = this.waterY;
    S.add(canal);

    const B = new Builder();
    const proxy = { heightAt: H, colliders: this.colliders, maps, glows: this.glows };
    // quay walls + mooring posts
    for (const sz of [-1, 1]) {
      for (let x = -150; x < 150; x += 6) B.box(6, 2.9, 0.7, mix(0x8a5a44, 0x6f4a3a, R()), x + 3, -2.7, sz * 6.9);
      for (let x = -140; x < 140; x += 14) B.cyl(0.14, 0.16, 1.0, 0x3a2c22, x, 0, sz * 6.2, 6);
    }
    // bridges
    for (const bx of [0, -64]) {
      for (let z = -10; z <= 10; z += 1) {
        const y = 2.1 * Math.cos((z / 10.5) * Math.PI * 0.5);
        B.box(6.6, 0.5, 1.05, mix(0xb09a7a, 0x9a8468, R()), bx, y - 0.5, z);
        for (const sx of [-1, 1]) B.box(0.35, 0.95, 1.05, 0x9a5a40, bx + sx * 3.15, y - 0.1, z);
      }
      for (const sx of [-1, 1]) this.colliders.push({ x: bx + sx * 3.45, z: 0, hw: 0.25, hd: 10.5, ry: 0, top: 3.2 });
    }
    // canal houses: tall, narrow, stepped gables to the water
    const placed = [];
    const rowOf = (z0, face, x0, x1, skip) => {
      let x = x0;
      while (x < x1) {
        const w = 5.2 + R() * 2.6;
        const cx = x + w / 2;
        x += w + 0.25;
        if (skip(cx)) continue;
        const d = 9 + R() * 3,
          h = 7.6 + R() * 5.2;
        house(B, proxy, {
          R, x: cx, z: z0 + (face > 0 ? -d / 2 : d / 2), ry: face > 0 ? 0 : Math.PI, w, d, h,
          roofType: R() < 0.7 ? 'step' : 'gable', roofH: w * 0.62, over: 0.15, ridgeAlongX: false,
          wall: jitter(BRICK[(R() * BRICK.length) | 0], R, 0.07), roof: ROOF[(R() * ROOF.length) | 0], trim: 0xe9e0cc,
          shutters: R() < 0.6 ? [0x7c2a22, 0x2f5a3a, 0x24405a][(R() * 3) | 0] : null, winH: 1.75, winW: 0.95, lit: 0.3, chimneyChance: 0.5, doorCol: 0x2a3a2c,
        });
        placed.push([cx, z0 + (face > 0 ? -d / 2 : d / 2), 6]);
      }
    };
    rowOf(-15.5, 1, -138, 132, (x) => x > 25 && x < 44); // north bank faces +z (the canal); gap for Vermeer's house
    rowOf(15.5, -1, -138, 132, (x) => (x > -62 && x < -28) || Math.abs(x) < 9 || Math.abs(x + 64) < 4.5); // south bank, gap for the market street
    rowOf(-44, 1, -110, 110, (x) => x > 14 && x < 54);
    rowOf(70, -1, -20, 110, () => false);

    // ---------------- market square
    const MX = -45,
      MZ = 44;
    const GB = new Builder();
    GB.parts.push(patch(MX, MZ, 23, H, (x, y, z) => mix(0xb8a480, 0xd6c098, vnoise(x * 0.4, z * 0.4)), { lift: 0.07, wobble: 0.05, sx: 1, sz: 0.9 }));
    GB.parts.push(ribbon([[-45, 16], [-45, 30]], 9, H, 0xbfa986, { lift: 0.06 }));
    S.add(GB.mesh(soft({ stroke: strokes.dab, scale: 0.3, contrast: 0.5 })));
    const AWN = [0xb2452f, 0xe6d9b0, 0x2f5f8a, 0xd9a83a, 0x4a7a4a, 0xe6d9b0];
    const GOODS = [[0xe8c84a, 0xf0d870], [0xd9443a, 0xf0b0c0, 0xf2d04a], [0xb9c4cc, 0x8fa0aa], [0x9a5a2a, 0xc98a4a], [0x2f5fd0, 0xd9a83a, 0xb0362e, 0x3a8a5a, 0xf2f0e0]];
    this.stalls = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      const x = MX + Math.cos(a) * 13,
        z = MZ + Math.sin(a) * 11;
      const ry = -a + Math.PI / 2;
      const M = xf(x, 0, z, ry);
      B.box(3.6, 0.9, 1.5, 0x7a5a3a, 0, 0, 0, 0, undefined, M);
      for (const [px, pz] of [[-1.7, -0.7], [1.7, -0.7], [-1.7, 0.7], [1.7, 0.7]]) B.cyl(0.06, 0.06, 2.9, 0x4a3626, px, 0, pz, 5, undefined, M);
      B.gable(2.2, 4.2, 0.7, AWN[i], 0, 2.9, 0, Math.PI / 2, { sway: 0.03 }, M);
      const goods = GOODS[i % GOODS.length];
      for (let k = 0; k < 9; k++) B.ball(0.2 + R() * 0.08, goods[(R() * goods.length) | 0], -1.4 + (k % 5) * 0.7, 1.08, k < 5 ? -0.3 : 0.35, 1, 0.9, 1, 1, undefined, M);
      this.colliders.push({ x, z, hw: 1.9, hd: 0.9, ry, top: 2.6 });
      maps.blob(x, z, 3.5, 0.35);
      this.stalls.push([x, z]);
    }
    // town pump in the middle
    B.cyl(0.35, 0.45, 2.2, 0x8a8a84, MX, 0, MZ, 8);
    B.cyl(1.5, 1.6, 0.5, 0x9a9488, MX, 0, MZ, 12);
    this.colliders.push({ x: MX, z: MZ, r: 1.7, top: 2 });

    // ---------------- Nieuwe Kerk
    {
      const cx = -45,
        cz = 92;
      B.box(8, 22, 8, (x, y) => mix(0x8a4a34, 0xa86244, clamp(y / 22 + 0.5)), cx, 0, cz);
      B.box(6.4, 12, 6.4, 0xd9d0b8, cx, 22, cz);
      B.cyl(2.6, 3.1, 8, 0xd9d0b8, cx, 34, cz, 8);
      B.cyl(0.05, 2.7, 13, 0x4a5058, cx, 42, cz, 8);
      B.box(18, 12, 9, 0x9a5a40, cx + 13, 0, cz);
      B.gable(9.6, 18.6, 6, 0x4a4a52, cx + 13, 12, cz, Math.PI / 2);
      this.colliders.push({ x: cx, z: cz, hw: 4.2, hd: 4.2, ry: 0, top: 54 }, { x: cx + 13, z: cz, hw: 9.2, hd: 4.7, ry: 0, top: 18 });
      for (const [ox, oz] of [[0, 4.05], [0, -4.05]]) B.box(1.4, 3.4, 0.14, 0x232a3a, cx + ox, 12, cz + oz);
      maps.blob(cx + 6, cz, 16, 0.4);
    }

    // ---------------- a trader moored at the east end of the canal
    {
      const sx = 104;
      B.box(22, 3.2, 5.6, (x, y) => mix(0x5a3a26, 0x8a5a36, clamp(y / 3.2 + 0.5)), sx, -1.4, 0);
      B.box(6, 2.2, 5.2, 0x6a4530, sx + 9, 1.8, 0);
      B.box(4, 1.2, 5.0, 0x6a4530, sx - 10, 1.8, 0);
      for (const [mx, mh] of [[sx - 3, 19], [sx + 5, 16]]) {
        B.cyl(0.16, 0.26, mh, 0x4a3626, mx, 1.8, 0, 6);
        B.box(0.2, 0.2, 9, 0x4a3626, mx, mh * 0.72 + 1.8, 0);
        B.box(0.5, mh * 0.34, 8.4, 0xe9e0c8, mx + 0.3, mh * 0.72 + 1.8 - mh * 0.34, 0, 0, { sway: 0.05 });
        B.cyl(0.7, 0.55, 0.5, 0x4a3626, mx, mh * 0.86 + 1.8, 0, 8);
      }
      B.box(0.06, 1.6, 2.6, 0xd9443a, sx - 3, 21.2, 1.3, 0, { sway: 0.2 });
      this.platforms = [{ minx: sx - 11, maxx: sx + 6, minz: -2.8, maxz: 2.8, y: 1.8 }];
      this.colliders.push({ x: sx + 9, z: 0, hw: 3, hd: 2.6, ry: 0, top: 4 });
      this.crowNest = [sx - 3, 19.4, 0];
    }
    // canal boats
    for (const [x, z, ry] of [[-22, -3.4, 0.05], [38, 3.2, -0.04], [-92, 2.6, 0.03]]) {
      B.box(6.4, 0.8, 1.9, 0x5a4030, x, this.waterY - 0.15, z, ry);
      B.box(6.8, 0.14, 2.1, 0x8a6a48, x, this.waterY + 0.6, z, ry);
      B.box(2.2, 0.5, 1.4, [0xb2452f, 0xd9c890, 0x4a6a8a][(R() * 3) | 0], x, this.waterY + 0.7, z, ry);
    }

    // ---------------- windmill on the edge of town
    {
      const wx = 104,
        wz = 62;
      B.cyl(2.6, 4.6, 13, (x, y) => mix(0x6a4a34, 0x9a7a54, clamp(y / 13 + 0.5)), wx, 0, wz, 8);
      B.cyl(0.4, 2.9, 3, 0x4a3a30, wx, 13, wz, 8);
      this.colliders.push({ x: wx, z: wz, r: 4.4, top: 16 });
      const sails = new Builder();
      for (let i = 0; i < 4; i++) {
        const M = xf(0, 0, 0, 0, 1, 1, 1, 0, (i * Math.PI) / 2);
        sails.box(0.3, 10.5, 0.3, 0x4a3626, 0, 0.5, 0, 0, undefined, M);
        sails.box(2.2, 8.2, 0.08, 0xe9dfc4, 1.2, 2.3, 0, 0, undefined, M);
      }
      this.sails = sails.mesh(soft({ objSpace: 1, scale: 0.5 }));
      this.sails.position.set(wx - 3.1, 13.6, wz);
      this.sails.rotation.y = Math.PI / 2;
      S.add(this.sails);
      maps.blob(wx, wz, 9, 0.4);
    }

    // ---------------- Vermeer's house: the studio you can walk into
    const X0 = 28,
      X1 = 40,
      Z0 = -36,
      Z1 = -24.5,
      CE = 4.7;
    {
      const brick = 0x9c5238,
        plaster = 0xd9cdb0,
        dark = 0x1a1612;
      const wallCol = (x, y) => mix(plaster, 0xb8a888, clamp(0.5 - y * 0.12));
      // floor: black and white marble
      for (let i = 0; i < 12; i++)
        for (let j = 0; j < 12; j++) B.box(1, 0.12, 0.96, (i + j) & 1 ? 0x1c1a1c : 0xe6ddc8, X0 + 0.5 + i, 0.0, Z0 + 0.48 + j * 0.958);
      // back wall is the dark ground the girl stands against
      B.box(12.6, 9.4, 0.5, (x, y, z) => (z > 0 ? new THREE.Color(0x0c0a08) : new THREE.Color(brick)), 34, 0, Z0 - 0.25);
      this.colliders.push({ x: 34, z: Z0 - 0.25, hw: 6.3, hd: 0.4, ry: 0, top: 12 });
      // east wall
      B.box(0.5, 9.4, 12, (x) => (x < 0 ? wallCol(0, 0) : new THREE.Color(brick)), X1 + 0.25, 0, -30.25);
      this.colliders.push({ x: X1 + 0.25, z: -30.25, hw: 0.4, hd: 6, ry: 0, top: 12 });
      // west wall with three tall leaded windows
      for (const [z, len, y0, hh] of [[-35.35, 1.3, 0, 9.4], [-32.3, 1.0, 0, 9.4], [-29.2, 1.0, 0, 9.4], [-25.6, 2.2, 0, 9.4]]) B.box(0.5, hh, len, (x) => (x > 0 ? wallCol(0, 0) : new THREE.Color(brick)), X0 - 0.25, y0, z);
      for (const z of [-33.75, -30.75, -27.7]) {
        B.box(0.5, 1.0, 2.2, brick, X0 - 0.25, 0, z);
        B.box(0.5, 5.0, 2.2, brick, X0 - 0.25, 4.4, z);
        B.box(0.1, 3.4, 2.0, 0xffe3a0, X0 - 0.3, 1.0, z, 0, { emissive: 0.55 });
        for (let k = 0; k < 4; k++) B.box(0.14, 0.05, 2.0, 0x4a4032, X0 - 0.25, 1.0 + k * 0.85, z);
        for (let k = -1; k <= 1; k++) B.box(0.14, 3.4, 0.05, 0x4a4032, X0 - 0.25, 1.0, z + k * 0.55);
        maps.lamp(X0 + 2.6, z + 0.6, 4.2, 0xffd590, 0.5);
      }
      this.colliders.push({ x: X0 - 0.25, z: -30.25, hw: 0.4, hd: 6, ry: 0, top: 12 });
      // front wall with a wide doorway onto the quay
      B.box(4.6, 9.4, 0.5, (x, y, z) => (z < 0 ? wallCol(0, 0) : new THREE.Color(brick)), 30.3, 0, Z1 + 0.25);
      B.box(4.6, 9.4, 0.5, (x, y, z) => (z < 0 ? wallCol(0, 0) : new THREE.Color(brick)), 37.7, 0, Z1 + 0.25);
      B.box(2.8, 6.4, 0.5, brick, 34, 3.0, Z1 + 0.25);
      this.colliders.push({ x: 30.3, z: Z1 + 0.25, hw: 2.3, hd: 0.4, ry: 0, top: 12 }, { x: 37.7, z: Z1 + 0.25, hw: 2.3, hd: 0.4, ry: 0, top: 12 });
      // beamed ceiling (seen only from inside), stepped-gable roof above
      B.box(12, 0.3, 11.5, 0x3a2c20, 34, CE, -30.25);
      for (let x = X0 + 1; x < X1; x += 1.6) B.box(0.3, 0.35, 11.5, 0x2a1e16, x, CE - 0.35, -30.25);
      B.gable(13.4, 12.6, 5.4, 0xa84e2c, 34, 9.4, -30.25, 0);
      for (const sgn of [-1, 1]) for (let s = 0; s < 4; s++) B.box(12.6 * (1 - s / 4) + 0.3, 1.6, 0.4, brick, 34, 9.4 + s * 1.35, -30.25 + sgn * 6.3);
      this.rooms.push({ minx: X0 + 0.3, maxx: X1 - 0.3, minz: Z0 + 0.3, maxz: Z1 - 0.2, ceil: CE - 0.5 });
      // the hall: an archway through to the studio, a chest, pictures, a coat on its peg
      for (const sx of [-1, 1]) {
        B.box(2.6, CE, 0.4, wallCol(0, 0), 34 + sx * 4.7, 0, -28.9);
        this.colliders.push({ x: 34 + sx * 4.7, z: -28.9, hw: 1.35, hd: 0.3, ry: 0, top: CE });
        B.box(0.34, CE, 0.5, 0x4a3626, 34 + sx * 3.4, 0, -28.9);
      }
      B.box(7.2, 0.9, 0.5, 0x4a3626, 34, CE - 0.9, -28.9);
      B.box(1.8, 0.8, 0.7, 0x5a3c24, 29.3, 0, -26.3);
      B.box(1.9, 0.08, 0.8, 0x3a2618, 29.3, 0.8, -26.3);
      this.colliders.push({ x: 29.3, z: -26.3, hw: 0.95, hd: 0.4, ry: 0, top: 1 });
      for (const [pz, pc] of [[-25.6, 0x3a5a7a], [-27.4, 0x8a6a3a]]) {
        B.box(0.08, 1.1, 1.3, 0xb8963a, X1 - 0.05, 1.7, pz);
        B.box(0.06, 0.9, 1.1, pc, X1 - 0.1, 1.8, pz);
      }
      B.box(0.5, 1.2, 0.16, 0x3a3440, 37.6, 1.3, Z1 - 0.1);
      B.cyl(0.2, 0.26, 0.5, 0x2f5a8a, 38.9, 0, -25.4, 10);
      B.ball(0.3, 0xd9443a, 38.9, 0.75, -25.4, 1, 0.8, 1, 1);
      B.ball(0.22, 0xf2c530, 39.05, 0.9, -25.25, 1, 0.8, 1, 1);
      maps.lamp(34, -26.4, 5, 0xffd9a0, 0.35);
      this.colliders.push({ x: 34, z: -30.25, hw: 6.6, hd: 6.4, ry: 0, top: 16, bottom: CE + 0.4 });
      // furniture: table with a blue cloth and a white jug, a chair, the easel
      B.box(2.2, 0.95, 1.2, (x, y) => mix(0x1f3f8a, 0x4a72c0, clamp(y + 0.5)), 30.2, 0, -33.6);
      B.cyl(0.13, 0.18, 0.42, 0xf2ede0, 29.9, 0.95, -33.5, 10);
      B.ball(0.14, 0xd9a83a, 30.6, 1.08, -33.8, 1, 0.9, 1, 1);
      B.box(0.6, 0.55, 0.6, 0x3a5a8a, 31.6, 0, -31.6);
      B.box(0.6, 1.3, 0.08, 0x4a3626, 31.6, 0, -31.3);
      for (const [ox, rz] of [[-0.4, 0.13], [0.4, -0.13]]) B.cyl(0.035, 0.035, 2.2, 0x6a4a2a, 37.0 + ox, 0, -31.4, 5, undefined, undefined, 0, rz);
      B.cyl(0.035, 0.035, 2.2, 0x6a4a2a, 37.3, 0, -30.9, 5, undefined, undefined, 0.28, 0);
      B.box(0.06, 1.15, 0.95, 0x16130f, 36.96, 0.9, -31.4, -0.3);
      B.box(0.05, 1.05, 0.85, 0xd9cdb0, 36.9, 0.95, -31.4, -0.3);
      // a map on the east wall, as he liked
      B.box(0.06, 1.7, 2.6, (x, y, z) => mix(0xc9b68a, 0xa8925e, vnoise(z * 3, y * 3)), X1 - 0.05, 1.8, -31.5);
      this.colliders.push({ x: 30.2, z: -33.6, hw: 1.15, hd: 0.65, ry: 0, top: 1.4 });
      maps.blob(34, -30.25, 10, 0.5);
    }
    this.studio = { X0, X1, Z0, Z1 };

    S.add(B.mesh(soft({ stroke: strokes.soft, scale: 0.3, contrast: 0.2, hueVar: 0.16, emissive: 2.3 })));

    // light through the studio windows
    this.shafts = [];
    for (const z of [-33.75, -30.75, -27.7]) {
      const g = new THREE.BufferGeometry();
      const y0 = 1.0,
        y1 = 4.4,
        reach = 7.5;
      const v = [X0, y1, z - 1, X0, y1, z + 1, X0 + reach, 0.02, z + 2.2, X0, y1, z - 1, X0 + reach, 0.02, z + 2.2, X0 + reach * 0.62, 0.02, z - 0.2, X0, y0, z - 1, X0, y0, z + 1, X0 + reach * 0.45, 0.02, z + 1.5];
      g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      const m = new THREE.Mesh(
        g,
        new THREE.ShaderMaterial({
          uniforms: { uAmt: { value: 0.2 }, uTime: G.uTime, uNoise: G.uNoise },
          vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
          fragmentShader: `varying vec3 vP; uniform float uAmt; uniform float uTime; uniform sampler2D uNoise;
            void main(){ float n = texture2D(uNoise, vec2(vP.z * 0.01 + uTime * 0.002, vP.y * 0.004)).r; gl_FragColor = vec4(vec3(1.0, 0.82, 0.5) * uAmt * (0.6 + 0.8 * n), 1.0); }`,
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      m.renderOrder = 8;
      S.add(m);
      this.shafts.push(m);
    }

    // ---------------- the girl
    const girl = buildGirl(strokes);
    girl.group.position.set(33.98, 0.06, -33.4);
    girl.group.rotation.y = -Math.PI / 2 - 0.25;
    S.add(girl.group);
    this.girl = girl;
    this.ready = loadFigure('girl', strokes, { height: 1.62 }).then((m) => {
      if (!m) return;
      m.position.set(33.98, 0.06, -33.4);
      S.add(m);
      girl.group.visible = false;
      this.girlModel = m;
    });
    this.colliders.push({ x: 33.98, z: -33.4, r: 0.45, top: 2 });

    // ---------------- trees and townsfolk
    const T = new Builder();
    for (let x = -132; x <= 132; x += 15) {
      for (const sz of [-1, 1]) {
        if ((Math.abs(x) < 8 || Math.abs(x + 64) < 8) || (sz < 0 && x > 22 && x < 46) || (sz > 0 && x > -60 && x < -30)) continue;
        const tx = x + (R() - 0.5) * 3,
          tz = sz * 10.2;
        blobTree(T, tx, 0, tz, 6.5 + R() * 2, 2.5 + R() * 0.8, R, { lo: 0x40602a, hi: 0xb8b848, trunk: 0x4a3626, blobs: 4, trunkH: 0.5 });
        this.colliders.push({ x: tx, z: tz, r: 0.4, top: 3 });
        maps.blob(tx, tz, 4, 0.35);
      }
    }
    for (let i = 0; i < 60; i++) {
      const a = R() * 6.283,
        d = 150 + R() * 200;
      const x = Math.cos(a) * d,
        z = Math.sin(a) * d * 1.0;
      blobTree(T, x, this.baseH(x, z), z, 9, 4 + R() * 3, R, { lo: 0x4a6a30, hi: 0xa8b04a, trunk: 0x4a3626, blobs: 3 });
    }
    S.add(T.mesh(soft({ stroke: strokes.dab, scale: 0.3, contrast: 0.5, hueVar: 0.45, rim: 0.25 })));

    const P = new Builder();
    const folk = [[-40, 40, 1], [-49, 48, -2], [-36, 50, 2.5], [-52, 38, 0.3], [-4, 13, 1.6], [20, 12, -1.5], [46, -14, 0.5], [-70, -12, 0], [70, 12, 3]];
    for (const [x, z, ry] of folk) figure(P, x, H(x, z), z, ry, { coat: [0x2a2a30, 0x4a3a2a, 0x2f4a5a, 0x7a2f2a][(R() * 4) | 0], dress: R() < 0.5, hat: R() < 0.6 ? 'top' : undefined, hatCol: 0x1a1a1e });
    S.add(P.mesh(soft({ scale: 0.8, rim: 0.2 })));

    // distant polder: church spires and more mills on the horizon
    const far = mountainRing({ radius: 400, base: -3, profile: (a) => 9 + fbm(a * 9, 0.5, 3) * 16 + (Math.sin(a * 23) > 0.94 ? 26 : 0), colorFn: (x, y) => mix(0x6f8a5a, 0x8fa0a0, clamp(y / 30)), seg: 300, depth: 40 });
    const fm = new THREE.Mesh(far, soft({ scale: 0.02, side: THREE.DoubleSide, rim: 0 }));
    fm.frustumCulled = false;
    S.add(fm);

    // motes in the studio light, gnats over the canal
    for (let i = 0; i < 70; i++) this.glows.push({ p: [X0 + 0.6 + R() * 7, 0.4 + R() * 3.6, Z0 + 1 + R() * 10], c: 0xffe6b0, size: 0.07 + R() * 0.07, drift: 0.5 });
    for (let i = 0; i < 60; i++) this.glows.push({ p: [(R() - 0.5) * 240, 0.3 + R() * 2.5, (R() - 0.5) * 12], c: 0xfff0c0, size: 0.12 + R() * 0.1, drift: 1.4 });
    S.add(glowPoints(this.glows, 0.9));
    maps.finish();

    // ---------------- story
    const ver = new Builder();
    figure(ver, 0, 0, 0, 0, { coat: 0xffffff, legs: 0xffffff, skin: 0xffffff, hat: 'top', hatCol: 0xffffff, arms: 0.25 });
    const stone = new Builder();
    stone.add(new THREE.IcosahedronGeometry(0.45, 0), (x, y, z) => mix(0x1f3fb0, 0x3f6fe0, vnoise(x * 6, y * 6 + z * 6)), xf(0, 0, 0, 0.4, 1.2, 0.8, 1), { emissive: 0.35 });
    stone.ball(0.08, 0xe6c860, 0.2, 0.12, 0.25, 1, 1, 1, 0, { emissive: 0.6 });
    const sm = stone.mesh(paintMaterial({ stroke: strokes.dab, scale: 3, contrast: 0.3, objSpace: 1, rim: 0.5, emissive: 1.8 }));
    sm.material.uniforms.uRestore = { value: 1 };
    sm.scale.setScalar(1.5);

    this.setupStory({
      wisps: [
        { pos: [31.6, 1.6, -31.2], color: 0xffd98a, name: 'Window gold', fact: 'She is not a portrait of anyone we know. She is a tronie: a study of a face in costume, which is why she wears a turban.' },
        { pos: [0, 4.2, 0], color: 0xf2c94c, name: 'Lead-tin yellow', fact: 'Vermeer worked in Delft, in the Dutch Republic, and finished only a few pictures a year.' },
        { pos: [MX + 4, 1.7, MZ - 3], color: 0xd9643a, name: 'Brick red', fact: 'The blue he wanted, ultramarine, was ground from lapis lazuli and cost more than gold.' },
        { pos: [-22, 0.9, -3.4], color: 0x5fb08a, name: 'Canal green', fact: 'He supported a large household, and money was always a worry.' },
        { pos: [98, 15, 62], color: 0xe9dfc4, name: 'Sailcloth white', fact: 'The lapis came from mines in what is now north-east Afghanistan, carried west along the trade roads.', high: true },
      ],
      memento: {
        pos: this.crowNest,
        color: 0x5f8fff,
        model: sm,
        name: 'the piece of lapis lazuli',
        text: 'A blue stone from the far side of the world. Ground to powder, it becomes ultramarine.',
      },
      echo: {
        pos: [37.6, 0.06, -32.4],
        ry: -2.2,
        color: 0xffe2a0,
        model: ver.mesh(ghostMaterial(0xffdf9a, 1.0)),
        name: 'Vermeer',
        greet: ['Softly, please. The light is only right for an hour.', 'I keep putting off her scarf. The blue it needs costs more than this house earns in a season.'],
        thanks: ['Lapis. Real lapis. Then I can finish her today.', 'Open the shutter a little more. There.'],
      },
      exit: { pos: [34, 0, -19.5], ry: 0 },
    });
    this.finalFact = 'The blue of her scarf is ultramarine. The painting hangs in the Mauritshuis in The Hague.';
    this.finalLine = 'The last stroke: the blue of the scarf, and she turns.';
    this.hints = {
      start: 'The hall of Vermeer’s house. She is standing in the window light, through the archway. Go closer.',
      high: 'One colour is caught on the windmill at the edge of town. Hold Space to ride the wind.',
      memento: 'A trading ship has tied up at the east end of the canal. The stone is up in its rigging.',
      echo: 'Bring the lapis to Vermeer, in the studio with the tall windows.',
    };
  }

  onEnter() {
    if (!this.done) this.turn = 0;
  }
  onFinale() {
    this.turnTarget = 1;
  }

  tick(dt, time) {
    this.sails.rotation.x = time * 0.35;
    if (this.stage === 'finale' || this.done) this.turn = damp(this.turn, 1, 0.55, dt);
    // she looks away until the painting is finished, then over her shoulder at you
    const t = this.turn * this.turn * (3 - 2 * this.turn);
    // the generated figure is one piece: she turns on her heel instead of at the neck
    if (this.girlModel) this.girlModel.rotation.y = lerp(2.5, this.modelYaw ?? 0.15, t);
    this.girl.head.rotation.y = lerp(-0.35, 1.82, t);
    this.girl.head.rotation.x = lerp(0.12, -0.04, t);
    this.girl.head.rotation.z = lerp(0, -0.07, t);
    const lit = clamp(this.restore + this.final);
    for (const s of this.shafts) s.material.uniforms.uAmt.value = (0.03 + 0.09 * this.final) * (0.4 + 0.6 * lit) * G.uRestore.value + 0.03 * this.maxWave();
    for (const f of this.girl.face) f.visible = !this.girlModel && this.restoreAt(33.98, -33.4) > 0.5;
  }
  maxWave() {
    return this.restoreAt(32, -30);
  }
  // CPU twin of the shader's restore test, for the few things that are not paint
  restoreAt(x, z) {
    let r = this.restore;
    for (const w of this.waves) if (w.max > 0 && Math.hypot(x - w.pos.x, z - w.pos.z) < w.r) r = 1;
    return r;
  }
}
