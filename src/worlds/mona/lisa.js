import * as THREE from 'three';
import { paintMaterial } from '../../engine/paint.js';
import { tint, mix, xf } from '../../engine/build.js';
import { clamp, damp } from '../../engine/gl.js';
import { loadFigure } from '../../engine/models.js';

// her face, twice: once before the last stroke, once after
function faceTexture(smile) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.translate(256, 256);
  g.scale(1.3, 1.3);
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
    g.arc(0, 0, 1, 0, 7);
    g.fill();
    g.restore();
  };
  // sfumato: shadows with no edges
  soft(400, 270, 150, 240, '70,52,30', 0.42);
  soft(256, 130, 200, 60, '70,52,30', 0.25);
  soft(256, 440, 170, 60, '60,44,26', 0.35);
  for (const ex of [162, 346]) soft(ex, 208, 60, 34, '74,52,30', 0.42);
  for (const [ex, sh] of [[162, 5], [346, 8]]) {
    g.save();
    g.translate(ex, 214);
    g.beginPath();
    g.moveTo(-33, 3);
    g.quadraticCurveTo(-2, -15, 33, 1);
    g.quadraticCurveTo(2, 14, -33, 3);
    g.closePath();
    g.fillStyle = '#d9cfb6';
    g.fill();
    g.save();
    g.clip();
    g.fillStyle = '#4a3418';
    g.beginPath();
    g.arc(-4 + sh, 0, 13.5, 0, 7);
    g.fill();
    g.fillStyle = '#16100a';
    g.beginPath();
    g.arc(-4 + sh, 0, 6.5, 0, 7);
    g.fill();
    g.restore();
    g.fillStyle = 'rgba(255,250,236,0.9)';
    g.beginPath();
    g.arc(-9 + sh, -4, 3, 0, 7);
    g.fill();
    // heavy upper lid
    g.strokeStyle = 'rgba(58,38,20,0.85)';
    g.lineWidth = 5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-36, 4);
    g.quadraticCurveTo(-2, -18, 36, 2);
    g.stroke();
    g.strokeStyle = 'rgba(96,70,44,0.5)';
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(-38, -10);
    g.quadraticCurveTo(-2, -32, 38, -12);
    g.stroke();
    g.restore();
  }
  // long nose, told only by its shadow
  g.strokeStyle = 'rgba(84,60,36,0.42)';
  g.lineWidth = 9;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(278, 210);
  g.quadraticCurveTo(290, 270, 282, 306);
  g.stroke();
  soft(262, 314, 34, 13, '74,50,30', 0.45);
  soft(238, 286, 15, 22, '255,244,214', 0.26);
  // the mouth
  const lift = smile ? 9 : 1;
  g.fillStyle = '#9c5446';
  g.beginPath();
  g.moveTo(204, 362 - lift);
  g.quadraticCurveTo(232, 352, 254, 358);
  g.quadraticCurveTo(276, 352, 304, 362 - lift);
  g.quadraticCurveTo(254, 384, 204, 362 - lift);
  g.fill();
  g.strokeStyle = 'rgba(64,30,22,0.85)';
  g.lineWidth = 3.2;
  g.beginPath();
  g.moveTo(198 - (smile ? 6 : 0), 362 - lift * 1.5);
  g.quadraticCurveTo(254, 372, 310 + (smile ? 6 : 0), 362 - lift * 1.5);
  g.stroke();
  // the corners are lost in shadow: that is the whole trick
  soft(196, 360 - lift, 22, 16, '66,44,26', smile ? 0.6 : 0.45);
  soft(312, 360 - lift, 24, 16, '66,44,26', smile ? 0.62 : 0.5);
  if (smile) {
    soft(176, 330, 34, 22, '255,236,200', 0.2);
    soft(334, 330, 30, 22, '255,230,196', 0.14);
  }
  soft(254, 404, 44, 13, '70,50,30', 0.34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

function buildLisa(strokes) {
  const mat = paintMaterial({ stroke: strokes.soft, scale: 2.6, contrast: 0.22, hueVar: 0.12, objSpace: 1, rim: 0.04, band: 0.36, warp: 0, big: 0, impasto: 0.02 });
  const skinMat = paintMaterial({ stroke: strokes.soft, scale: 2, contrast: 0.05, hueVar: 0.03, objSpace: 1, rim: 0.03, band: 0.46, warp: 0, big: 0, impasto: 0 });
  const part = (geo, col, m, mt = mat) => {
    const g = tint(geo, col);
    if (m) g.applyMatrix4(m);
    const mesh = new THREE.Mesh(g, mt);
    mesh.frustumCulled = false;
    return mesh;
  };
  const g = new THREE.Group();
  const skin = 0xe6c79a,
    dress = 0x2c3222,
    sleeve = 0x6a4a1e,
    hair = 0x24160e;
  // chair, lap, torso
  g.add(part(new THREE.BoxGeometry(0.62, 0.06, 0.5), 0x4a3220, xf(0, 0.45, -0.05)));
  g.add(part(new THREE.BoxGeometry(0.72, 0.05, 0.1), 0x5a3c24, xf(0, 0.72, 0.27)));
  g.add(part(new THREE.SphereGeometry(0.27, 18, 14), dress, xf(0, 0.5, 0.06, 0, 1.05, 0.5, 0.95)));
  g.add(part(new THREE.CylinderGeometry(0.165, 0.22, 0.5, 16), (x, y) => mix(dress, 0x3c4028, clamp(y * 2 + 0.5)), xf(0, 0.78, 0, 0, 1.15, 1, 0.8)));
  g.add(part(new THREE.SphereGeometry(0.2, 18, 14), dress, xf(0, 0.99, -0.01, 0, 1.22, 0.6, 0.78)));
  g.add(part(new THREE.SphereGeometry(0.15, 16, 12), skin, xf(0, 1.02, 0.07, 0, 1.1, 0.55, 0.55), skinMat)); // the open neckline
  g.add(part(new THREE.SphereGeometry(0.2, 16, 12), 0x1c2016, xf(-0.13, 0.97, -0.04, 0, 0.9, 0.5, 0.8, 0, 0.5))); // shawl over one shoulder
  // sleeves, hands folded right over left
  for (const sx of [-1, 1]) {
    g.add(part(new THREE.CylinderGeometry(0.085, 0.075, 0.36, 10), sleeve, xf(sx * 0.28, 0.83, 0.03, 0, 1, 1, 1, 0.25, sx * 0.14)));
    g.add(part(new THREE.CylinderGeometry(0.07, 0.055, 0.34, 10), (x, y) => mix(sleeve, 0x9a7430, clamp(y * 3 + 0.5)), xf(sx * 0.17, 0.75, 0.2, 0, 1, 1, 1, 1.25, sx * 0.75)));
  }
  g.add(part(new THREE.SphereGeometry(0.055, 12, 10), skin, xf(0.04, 0.77, 0.3, 0.3, 1.5, 0.6, 1.0), skinMat));
  g.add(part(new THREE.SphereGeometry(0.055, 12, 10), skin, xf(-0.03, 0.805, 0.31, -0.2, 1.6, 0.6, 1.0), skinMat));
  g.add(part(new THREE.CylinderGeometry(0.052, 0.066, 0.13, 14), skin, xf(0, 1.11, 0), skinMat));

  const head = new THREE.Group();
  head.position.set(0, 1.27, 0.01);
  head.scale.setScalar(1.14);
  g.add(head);
  const HS = [0.9, 1.17, 0.98];
  head.add(part(new THREE.SphereGeometry(0.105, 32, 24), skin, xf(0, 0, 0, 0, ...HS), skinMat));
  const mk = (smile) => {
    const fgeo = new THREE.SphereGeometry(0.1062, 32, 24, Math.PI / 2 - 0.9, 1.8, Math.PI / 2 - 0.8, 1.6);
    fgeo.applyMatrix4(xf(0, 0, 0, 0, 1, 1, 1, 0.22));
    fgeo.applyMatrix4(xf(0, 0, 0, 0, ...HS));
    const m = new THREE.Mesh(fgeo, new THREE.MeshBasicMaterial({ map: faceTexture(smile), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.renderOrder = 3;
    head.add(m);
    return m;
  };
  const plain = mk(false),
    smiling = mk(true);
  // dark hair parted in the middle, falling to the shoulders, under a thin veil
  head.add(part(new THREE.SphereGeometry(0.113, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, xf(0, 0.012, -0.012, 0, 0.95, 1.12, 1.03, -0.42)));
  for (const sx of [-1, 1]) head.add(part(new THREE.SphereGeometry(0.06, 12, 10), hair, xf(sx * 0.088, -0.1, -0.02, 0, 0.7, 2.3, 1.0, 0, sx * 0.08)));
  head.add(part(new THREE.SphereGeometry(0.1, 14, 10), 0x1c140e, xf(0, -0.08, -0.07, 0, 1.1, 1.6, 0.7)));
  return { group: g, head, plain, smiling };
}

// ---------------- Lisa
export function seatLisa(world, kit) {
  const { S, strokes, LY } = kit;
  const lisa = buildLisa(strokes);
  world.ready = loadFigure('mona', strokes, { height: 1.36 }).then((m) => {
    if (!m) return;
    m.position.set(0, LY + 0.02, -3.3);
    m.rotation.y = world.modelYaw ?? 0;
    S.add(m);
    lisa.group.visible = false;
    world.lisaModel = m;
  });
  lisa.group.position.set(0, LY + 0.02, -3.3);
  world.view = { pos: [world._viewRel.pos[0], LY + world._viewRel.pos[1], -3.3 + world._viewRel.pos[2]], target: [0, LY + world._viewRel.target[1], -3.3], fov: world._viewRel.fov };
  lisa.group.rotation.y = -0.34;
  S.add(lisa.group);
  lisa.head.rotation.y = 0.3;
  world.lisa = lisa;
  world.colliders.push({ x: 0, z: -3.3, r: 0.55, top: LY + 1.6 });
}

// the smile comes with the last stroke
export function tickLisa(world, dt) {
  if (world.stage === 'finale' || world.done) world.smile = damp(world.smile, 1, 0.4, dt);
  const vis = world.restore > 0.5 || world.waves.some((w) => w.max > 0 && Math.hypot(w.pos.x, w.pos.z + 3.3) < w.r);
  world.lisa.plain.visible = world.lisa.smiling.visible = vis && !world.lisaModel;
  world.lisa.plain.material.opacity = 1 - world.smile;
  world.lisa.smiling.material.opacity = world.smile;
}
