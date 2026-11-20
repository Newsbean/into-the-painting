import * as THREE from 'three';
import { paintMaterial } from '../../engine/paint.js';
import { tint, mix, xf } from '../../engine/build.js';
import { vnoise, clamp } from '../../engine/gl.js';

// ------------------------------------------------------------------
// The figure on the road: a pale head between two hands, a body like a
// flame. Drawn the way the picture draws it, simply and without menace.
// ------------------------------------------------------------------
// Catmull-Rom through evenly spaced keys: keeps hand-authored profiles smooth
function keyed(keys, t) {
  const n = keys.length - 1;
  const x = Math.min(Math.max(t, 0), 1) * n;
  const i = Math.min(Math.floor(x), n - 1);
  const f = x - i;
  const p0 = keys[Math.max(i - 1, 0)],
    p1 = keys[i],
    p2 = keys[i + 1],
    p3 = keys[Math.min(i + 2, n)];
  return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
}

// a tube lofted along a centre line with an elliptical section that changes as it goes
function loft(rows, seg, centre, radii, col) {
  const v = [],
    idx = [];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const c = centre(t);
    const [rx, rz] = radii(t);
    for (let k = 0; k < seg; k++) {
      const a = (k / seg) * Math.PI * 2;
      v.push(c[0] + Math.cos(a) * rx, c[1], c[2] + Math.sin(a) * rz);
    }
  }
  for (let i = 0; i < rows; i++)
    for (let k = 0; k < seg; k++) {
      const p0 = i * seg + k,
        p1 = i * seg + ((k + 1) % seg),
        p2 = p0 + seg,
        p3 = p1 + seg;
      idx.push(p0, p2, p1, p1, p2, p3);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return tint(g, col);
}

// the face, painted the way the picture paints it: two ringed eyes, two dots, one long O
function screamFace() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
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
  // hollow cheeks and temples: green-grey shadow, as in the tempera
  soft(118, 330, 70, 130, '98,118,92', 0.5);
  soft(394, 330, 70, 130, '112,104,78', 0.5);
  soft(256, 96, 170, 60, '150,128,74', 0.3);
  soft(256, 474, 120, 60, '90,100,84', 0.45);
  // brow ridge
  g.strokeStyle = 'rgba(92,78,50,0.55)';
  g.lineCap = 'round';
  g.lineWidth = 7;
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.moveTo(256 + sx * 128, 214);
    g.quadraticCurveTo(256 + sx * 92, 188, 256 + sx * 54, 208);
    g.stroke();
  }
  // eyes: pale rings with a small dark centre
  for (const sx of [-1, 1]) {
    const ex = 256 + sx * 92;
    soft(ex, 246, 44, 40, '86,84,62', 0.5);
    g.fillStyle = '#efe6c0';
    g.strokeStyle = '#3c3524';
    g.lineWidth = 7;
    g.beginPath();
    g.ellipse(ex, 244, 27, 25, 0, 0, 7);
    g.fill();
    g.stroke();
    g.fillStyle = '#2b2519';
    g.beginPath();
    g.arc(ex + sx * 1.5, 247, 7.5, 0, 7);
    g.fill();
  }
  // nose: a faint ridge and two nostrils
  g.strokeStyle = 'rgba(100,88,58,0.5)';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(256, 248);
  g.quadraticCurveTo(250, 282, 256, 304);
  g.stroke();
  g.fillStyle = '#3c3524';
  for (const nx of [242, 270]) {
    g.beginPath();
    g.ellipse(nx, 310, 5.5, 4.5, 0, 0, 7);
    g.fill();
  }
  // the mouth: a long open oval
  g.fillStyle = '#2a221b';
  g.strokeStyle = '#5c4a30';
  g.lineWidth = 7;
  g.beginPath();
  g.ellipse(256, 392, 30, 56, 0, 0, 7);
  g.fill();
  g.stroke();
  soft(256, 404, 15, 30, '132,62,48', 0.55);
  // the jaw line drawn in the same blue as the fjord
  g.strokeStyle = 'rgba(52,70,110,0.5)';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(150, 330);
  g.quadraticCurveTo(190, 470, 256, 490);
  g.quadraticCurveTo(322, 470, 362, 330);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

// ------------------------------------------------------------------
// The figure on the road, sculpted rather than assembled: a pale head
// like an upturned pear held between two long hands, a body that sways
// like a flame. Simple and sad, never monstrous.
// ------------------------------------------------------------------
export function buildScreamer(strokes) {
  const body = paintMaterial({ stroke: strokes.oil, scale: 0.9, contrast: 0.26, hueVar: 0.16, objSpace: 1, rim: 0.2, band: 0.36, warp: 0, big: 0, wallStretch: 1, wallVert: 1 });
  const skin = paintMaterial({ stroke: strokes.soft, scale: 2.2, contrast: 0.12, hueVar: 0.1, objSpace: 1, rim: 0.1, band: 0.42, warp: 0, big: 0 });
  // the sun sets behind him, so the picture lights him from the front, as Munch did
  for (const m of [body, skin]) {
    m.uniforms.uSunDir = { value: new THREE.Vector3(0.6, 0.45, 0.66).normalize() };
    m.uniforms.uSunColor = { value: new THREE.Color(0xd8b070) };
  }
  const g = new THREE.Group();
  g.scale.setScalar(1.12);
  const mesh = (geo, mt) => {
    const m = new THREE.Mesh(geo, mt);
    m.frustumCulled = false;
    g.add(m);
    return m;
  };
  const PALE = 0xdccb92;
  // long strokes falling the length of the smock: blue-black, a little slate, a thread of umber
  const cloth = (x, y, z) => mix(0x141829, 0x2a3350, clamp(vnoise(x * 22 + z * 16, y * 0.9))).lerp(new THREE.Color(0x3a3320), vnoise(x * 9 + 4, y * 1.2 + z * 7) * 0.14);

  // --- the body: one long S from the hem to the collar
  const NECK = 1.34;
  const sway = (t) => 0.105 * Math.sin(t * Math.PI * 1.3 + 0.25) - 0.075 * t;
  const centre = (t) => [sway(t), t * NECK, 0.035 * Math.sin(t * Math.PI)];
  const RX = [0.215, 0.185, 0.165, 0.15, 0.148, 0.16, 0.185, 0.198, 0.15, 0.062];
  const RZ = [0.16, 0.145, 0.13, 0.118, 0.112, 0.118, 0.13, 0.128, 0.1, 0.06];
  mesh(loft(44, 22, centre, (t) => [keyed(RX, t), keyed(RZ, t)], cloth), body);
  const HX = sway(1),
    HY = NECK + 0.2;

  // --- the head: turned on a lathe from a hand-drawn profile (chin up to crown)
  const PROFILE = [
    [0.0, -0.215], [0.038, -0.208], [0.064, -0.176], [0.078, -0.128], [0.088, -0.072], [0.102, -0.012],
    [0.124, 0.05], [0.14, 0.108], [0.142, 0.158], [0.126, 0.202], [0.092, 0.232], [0.048, 0.25], [0.0, 0.256],
  ];
  const headGeo = (scale, phi0, phiLen, seg) => {
    const pts = PROFILE.map((q) => new THREE.Vector2(Math.max(q[0] * scale, 0.0001), q[1] * scale));
    const curve = new THREE.SplineCurve(pts);
    const geo = new THREE.LatheGeometry(curve.getPoints(40), seg, phi0, phiLen);
    geo.scale(1, 1, 0.9);
    geo.computeVertexNormals();
    return geo;
  };
  const head = mesh(tint(headGeo(1, 0, Math.PI * 2, 40), (x, y, z) => mix(PALE, 0xb9b07a, clamp(0.55 - z * 4 + (vnoise(x * 20, y * 20) - 0.5) * 0.3))), skin);
  head.position.set(HX, HY, 0.012);
  const face = new THREE.Mesh(headGeo(1.012, -0.95, 1.9, 28), new THREE.MeshBasicMaterial({ map: screamFace(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  face.position.copy(head.position);
  face.renderOrder = 3;
  face.frustumCulled = false;
  g.add(face);
  // neck
  mesh(loft(6, 12, (t) => [HX, NECK - 0.03 + t * 0.09, 0.012], (t) => [0.05 - t * 0.008, 0.048 - t * 0.008], () => new THREE.Color(0xc9b984)), skin);

  // --- arms: out at the elbow, up to the cheeks
  for (const sx of [-1, 1]) {
    const sh = [sway(0.9) + sx * 0.175, NECK - 0.13, 0.0];
    const el = [sway(0.72) + sx * 0.3, NECK - 0.3, 0.07];
    const wr = [HX + sx * 0.142, HY - 0.105, 0.075];
    const arm = (t) => {
      // quadratic Bezier through the elbow
      const u = 1 - t;
      const cx = 2 * el[0] - 0.5 * (sh[0] + wr[0]),
        cy = 2 * el[1] - 0.5 * (sh[1] + wr[1]),
        cz = 2 * el[2] - 0.5 * (sh[2] + wr[2]);
      return [u * u * sh[0] + 2 * u * t * cx + t * t * wr[0], u * u * sh[1] + 2 * u * t * cy + t * t * wr[1], u * u * sh[2] + 2 * u * t * cz + t * t * wr[2]];
    };
    // the loft helper stacks sections in y, so build the sleeve as short stacked rings along the curve
    const N = 16;
    const v = [],
      idx = [];
    const seg = 10;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const c = arm(t),
        c2 = arm(Math.min(1, t + 0.02)),
        c1 = arm(Math.max(0, t - 0.02));
      const dir = new THREE.Vector3(c2[0] - c1[0], c2[1] - c1[1], c2[2] - c1[2]).normalize();
      const side = new THREE.Vector3(0, 0, 1).cross(dir).normalize();
      const up = dir.clone().cross(side).normalize();
      const r = 0.068 - 0.026 * t + 0.012 * Math.sin(t * Math.PI);
      for (let k = 0; k < seg; k++) {
        const a = (k / seg) * Math.PI * 2;
        v.push(c[0] + (side.x * Math.cos(a) + up.x * Math.sin(a)) * r, c[1] + (side.y * Math.cos(a) + up.y * Math.sin(a)) * r, c[2] + (side.z * Math.cos(a) + up.z * Math.sin(a)) * r);
      }
    }
    for (let i = 0; i < N; i++)
      for (let k = 0; k < seg; k++) {
        const p0 = i * seg + k,
          p1 = i * seg + ((k + 1) % seg),
          p2 = p0 + seg,
          p3 = p1 + seg;
        idx.push(p0, p2, p1, p1, p2, p3);
      }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    sg.setIndex(idx);
    sg.computeVertexNormals();
    mesh(tint(sg, cloth), body);

    // the hand: a long palm flat on the cheek, four fingers to the temple, thumb along the jaw
    const hand = new THREE.Group();
    hand.position.set(HX + sx * 0.128, HY - 0.035, 0.07);
    hand.rotation.set(0.12, sx * 0.55, -sx * 0.1);
    const part = (geo, m4) => {
      const gg = tint(geo, PALE);
      gg.applyMatrix4(m4);
      const mm = new THREE.Mesh(gg, skin);
      mm.frustumCulled = false;
      hand.add(mm);
    };
    part(new THREE.SphereGeometry(0.05, 14, 10), xf(0, -0.02, 0, 0, 0.72, 1.25, 0.34));
    for (let f = 0; f < 4; f++) {
      const fx = (f - 1.5) * 0.019 * -sx;
      part(new THREE.CapsuleGeometry(0.0105, 0.07 - Math.abs(f - 1.5) * 0.008, 4, 8), xf(fx, 0.078 + (1.5 - Math.abs(f - 1.5)) * 0.006, 0.002, 0, 1, 1, 0.8, 0, (f - 1.5) * 0.07 * -sx));
    }
    part(new THREE.CapsuleGeometry(0.012, 0.05, 4, 8), xf(-sx * 0.034, -0.045, 0.016, 0, 1, 1, 0.8, 0.2, -sx * 0.9));
    g.add(hand);
  }
  return g;
}
