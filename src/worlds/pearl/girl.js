import * as THREE from 'three';
import { paintMaterial } from '../../engine/paint.js';
import { tint, mix, xf } from '../../engine/build.js';
import { clamp } from '../../engine/gl.js';
import { loadFigure } from '../../engine/models.js';

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

// the hand-built girl: she stands in until the generated figure has loaded
export function buildGirl(strokes) {
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

// ---------------- the girl
export function addGirl(world, kit) {
  const { strokes, S } = kit;
  const girl = buildGirl(strokes);
  girl.group.position.set(33.98, 0.06, -33.4);
  girl.group.rotation.y = -Math.PI / 2 - 0.25;
  S.add(girl.group);
  world.girl = girl;
  world.ready = loadFigure('girl', strokes, { height: 1.62 }).then((m) => {
    if (!m) return;
    m.position.set(33.98, 0.06, -33.4);
    S.add(m);
    girl.group.visible = false;
    world.girlModel = m;
  });
  world.colliders.push({ x: 33.98, z: -33.4, r: 0.45, top: 2 });
}
