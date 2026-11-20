import * as THREE from 'three';
import { ribbon, patch, gridGeo, mix } from '../../../engine/build.js';
import { vnoise, lerp } from '../../../engine/gl.js';
import { FOAM, MIDBLUE, PALE } from '../palette.js';
import { ROAD_W, ROAD_M, ROAD_E, STREAM1, STREAM2, PATH_FALL, PATH_SHRINE, PATH_HALL, PATH_PASS } from '../ground-plan.js';

// ---------------- the coast road, and the paths that leave it for the hills
export function roadsAndStreams(world, { H, GR }) {
  const dirt = (x, y, z) => mix(0xdccda4, 0xc6b48a, vnoise(x * 0.35, z * 0.35));
  for (const pts of [ROAD_W, ROAD_M, ROAD_E]) GR.parts.push(ribbon(pts, 3.8, H, dirt, { lift: 0.14, across: 3, step: 2 }));
  GR.parts.push(patch(-2, 211.3, 26, H, dirt, { lift: 0.13, wobble: 0.08, sz: 0.22, rings: 4, seg: 28 }));
  for (const pts of [PATH_FALL, PATH_SHRINE, PATH_HALL, PATH_PASS]) GR.parts.push(ribbon(pts, 2.2, H, dirt, { lift: 0.13, across: 2, step: 2 }));

  // running water, printed in stripes
  const water = (pts, w0, w1) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.5);
    const n = Math.ceil(curve.getLength() / 1.6);
    const c = curve.getSpacedPoints(n);
    GR.parts.push(
      gridGeo(
        n,
        4,
        (a, b, i) => {
          const p0 = c[Math.max(0, i - 1)],
            p1 = c[Math.min(n, i + 1)];
          const l = Math.hypot(p1.x - p0.x, p1.z - p0.z) || 1;
          const s = (b - 0.5) * lerp(w0, w1, a) * (1 + 0.18 * Math.sin(i * 0.9));
          const x = c[i].x + ((p1.z - p0.z) / l) * s,
            z = c[i].z - ((p1.x - p0.x) / l) * s;
          return [x, H(x, z) + 0.11, z];
        },
        (a, b, i, j) => new THREE.Color((i * 5 + j * 3) % 11 < 2 ? FOAM : j === 1 || j === 2 ? (i % 2 ? PALE : 0x8fb4c4) : MIDBLUE)
      )
    );
  };
  water(STREAM1, 2.6, 4.6);
  water(STREAM2, 2.0, 3.6);
}
