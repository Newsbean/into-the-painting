// The people on the move. Townsfolk, travellers and porters walk the coast road, the
// paths up to the shrines and the streets of Edo, keeping to the left and turning back at
// the ends. And a daimyo's procession makes its slow way along the Tokaido to the capital:
// heralds, spears, banners, the lacquered boxes, the palanquin, the baggage behind.
//
// Each kind of figure is one geometry drawn many times; only where they stand is worked
// out every frame.
import * as THREE from 'three';
import { Builder } from '../../../engine/build.js';
import { Soup } from '../../../engine/soup.js';
import { rng } from '../../../engine/gl.js';
import { weld } from '../../../engine/weld.js';
import { trace } from '../../../engine/plan.js';
import { edoPerson } from '../edo/people.js';
import { edoStreets } from '../edo/town.js';
import { ROAD_W, ROAD_M, ROAD_E, PATH_FALL, PATH_SHRINE, PATH_HALL, PATH_PASS } from '../ground-plan.js';
import { horse, person } from '../figures.js';
import { rod } from '../helpers.js';

const T = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
const BALL = new THREE.IcosahedronGeometry(1, 1);
const LIVERY = 0x1f3f7a,
  LACQUER = 0x1c1c22,
  GOLD = 0xd9a93a,
  CREAM = 0xe9dfc6;

// The whole coast road as one line, from the east end of the bay, over the bridge, round
// the workshop's forecourt (clear of the drying prints and of Hokusai), and on into Edo.
function tokaido() {
  return [...ROAD_E].reverse().concat([[45, 221]], [...ROAD_M].reverse(), [[21.5, 209.5], [16, 209.2], [4, 209.8], [-12, 210], [-20, 213.6]], [...ROAD_W].reverse(), edoStreets().find((s) => s.name === 'tokaido').pts);
}

// one geometry for each kind of figure in the procession, and a handful for everyone else
function figures(R) {
  const make = (o, extra) => {
    const S = new Soup();
    edoPerson(S, { x: 0, y: 0, z: 0, ry: 0, R, ...o });
    extra?.(S);
    return weld(S.geometry());
  };
  const built = (fn) => {
    const B = new Builder();
    fn(B);
    return weld(B.geometry());
  };
  const retainer = { kind: 'townsman', robe: LIVERY, sash: CREAM, hat: 'jingasa' };
  return {
    folk: [
      ...['townsman', 'townswoman', 'townsman', 'townswoman', 'traveller', 'porter', 'townswoman', 'traveller', 'townsman', 'porter', 'townswoman', 'traveller'].map((kind) => make({ kind })),
    ],
    herald: make({ kind: 'traveller', robe: LACQUER, sash: 0xd9482b, hat: 'jingasa' }),
    spear: make(retainer, (S) => {
      S.add(new THREE.CylinderGeometry(0.02, 0.024, 3.5, 5), 0x2a2a2e, T(0.27, 1.85, 0.12));
      S.add(new THREE.ConeGeometry(0.035, 0.3, 4), 0xc9c9c0, T(0.27, 3.75, 0.12));
      S.add(BALL, 0xefe7d2, T(0.27, 3.42, 0.12, 0, 0, 0, 0.13, 0.2, 0.13), { sway: 0.3 }); // the tuft below the blade
    }),
    banner: make(retainer, (S) => {
      S.add(new THREE.CylinderGeometry(0.022, 0.026, 4.2, 5), 0x3a2a1e, T(0.27, 2.2, 0.1));
      S.add(new THREE.BoxGeometry(0.03, 2.5, 0.6, 1, 4, 1), (x, y) => (Math.abs(y - 0.5) < 0.22 ? 0xd9482b : 0xf3ecd8), T(0.27, 2.95, 0.43), { sway: 0.7 });
      S.add(new THREE.BoxGeometry(0.04, 0.04, 0.66), 0x3a2a1e, T(0.27, 4.22, 0.4));
    }),
    // the travelling box on its pole, lacquer and gilt
    box: make(retainer, (S) => {
      S.add(new THREE.CylinderGeometry(0.02, 0.02, 1.7, 5), 0x3a2a1e, T(0.2, 1.42, -0.35, Math.PI / 2));
      S.add(new THREE.BoxGeometry(0.42, 0.36, 0.5), LACQUER, T(0.2, 1.2, -1.0));
      S.add(new THREE.BoxGeometry(0.44, 0.06, 0.52), GOLD, T(0.2, 1.36, -1.0));
    }),
    samurai: [0x3f4e62, 0x4a4a55, 0x5a4a3a].map((robe) =>
      make({ kind: 'townsman', robe, sash: LACQUER, hat: 'jingasa' }, (S) => {
        S.add(new THREE.BoxGeometry(0.03, 0.04, 0.95), LACQUER, T(-0.2, 0.98, -0.12, 0.25, 0.12)); // the long sword
        S.add(new THREE.BoxGeometry(0.03, 0.04, 0.55), LACQUER, T(-0.21, 1.03, 0.02, 0.2, 0.1)); // and the short
        S.add(new THREE.BoxGeometry(0.62, 0.3, 0.07), 0x6f7f96, T(0, 1.3, -0.1, 0.12)); // stiff shoulders
      })
    ),
    bearer: make({ kind: 'porter', robe: LIVERY, sash: CREAM, hat: 'jingasa' }),
    porter: make({ kind: 'porter' }),
    groom: make({ kind: 'traveller' }),
    // the palanquin: a lacquered box slung from one long beam (its four bearers walk as themselves)
    palanquin: built((B) => {
      B.box(0.12, 0.1, 4.8, LACQUER, 0, 1.4, 0);
      B.box(0.9, 0.95, 1.4, 0x2a2a30, 0, 0.36, 0);
      B.box(0.94, 0.4, 0.74, 0xc9b98a, 0, 0.74, 0); // the blind
      B.box(0.93, 0.06, 1.43, GOLD, 0, 0.38, 0);
      B.box(1.06, 0.08, 1.6, LACQUER, 0, 1.3, 0);
      for (const sz of [-0.6, 0.6]) rod(B, [0, 1.36, sz], [0, 1.45, sz], 0.035, 0.035, GOLD, 4);
    }),
    rider: built((B) => {
      horse(B, 0, 0, 0, 0, { col: 0x5a4030 });
      B.box(0.9, 0.06, 0.8, 0xd9482b, 0, 1.6, -0.05);
      person(B, 0, 1.4, -0.08, 0, { pose: 'kneel', coat: 0x3f4e62, sash: LACQUER, hat: 'flat', hatCol: LACQUER });
    }),
    pack: built((B) => horse(B, 0, 0, 0, 0, { col: 0x8a6a48, load: 0xb89a5a })),
  };
}

export function addWalkers(world, { S, H }) {
  const R = rng(1689);
  const F = figures(R);
  const mat = world.edoKit.mats.detail;

  // the ways people go, each a line of points a metre apart with the height of the ground under it
  const way = (pts) => {
    const Tr = trace(pts, 1);
    for (const p of Tr) p.y = world.groundAt(p.x, p.z, H(p.x, p.z) + 3);
    return Tr;
  };
  const road = way(tokaido());
  const ways = [road, ...edoStreets().filter((s) => s.name !== 'tokaido').map((s) => way(s.pts)), way(PATH_FALL), way(PATH_SHRINE), way(PATH_HALL), way(PATH_PASS)];
  const share = [70, 16, 12, 9, 12, 9, 5, 4, 4, 4]; // how many walk each

  // ---- everyone who is simply out walking
  const walkers = [];
  ways.forEach((Tr, wi) => {
    for (let i = 0; i < (share[wi] ?? 4); i++) {
      const off = 0.5 + R() * (wi ? 0.7 : 1.5);
      walkers.push({ Tr, s: 2 + R() * (Tr.length_ - 4), dir: R() < 0.5 ? 1 : -1, v: 0.85 + R() * 0.6, off, lat: off, t: 0, ph: R() * 6.283, kind: (R() * F.folk.length) | 0, k: 0.94 + R() * 0.12 });
    }
  });
  const pools = F.folk.map((geo, kind) => {
    const list = walkers.filter((w) => w.kind === kind);
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    im.count = list.length;
    im.frustumCulled = false;
    S.add(im);
    return { im, list };
  });

  // ---- the procession: who walks where in the column. [figure, metres behind the head, metres left of the middle]
  const column = [];
  const rank = (name, back, lat, n = 1, gap = 1.5) => {
    for (let i = 0; i < n; i++) column.push({ name, back: back + i * gap, lat });
  };
  let at = 0;
  const two = (name, rows) => {
    rank(name, at, 0.8, rows);
    rank(name, at, -0.8, rows);
    at += rows * 1.5 + 0.8;
  };
  two('herald', 1);
  two('spear', 4);
  two('banner', 2);
  rank('box', at, 0, 2);
  at += 3.6;
  two('samurai', 2);
  at += 2.4; // the palanquin, two bearers before it and two behind
  rank('bearer', at - 2.2, 0);
  rank('bearer', at - 1.5, 0);
  rank('palanquin', at, 0);
  rank('bearer', at + 1.5, 0);
  rank('bearer', at + 2.2, 0);
  at += 4.2;
  rank('rider', at, 0);
  at += 2.8;
  two('samurai', 2);
  two('porter', 3);
  rank('groom', at + 0.4, 0.7);
  rank('pack', at + 1.2, 0);
  const columnLength = at + 3;
  const parade = {};
  for (const m of column) {
    const geos = Array.isArray(F[m.name]) ? F[m.name] : [F[m.name]];
    m.pool = m.name + ((R() * geos.length) | 0);
    (parade[m.pool] ??= { geo: geos[Number(m.pool.slice(m.name.length))], list: [] }).list.push(m);
  }
  for (const p of Object.values(parade)) {
    p.im = new THREE.InstancedMesh(p.geo, mat, p.list.length);
    p.im.frustumCulled = false;
    S.add(p.im);
  }
  let head = road.length_ * 0.36; // they start out east of the workshop, in sight of the pier
  console.log('wave: walkers', walkers.length, '+ procession of', column.length);

  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler(),
    p = new THREE.Vector3(),
    sc = new THREE.Vector3();
  // a figure at s metres along a way, `lat` to the left of it, facing the way it is going
  const stand = (im, i, Tr, s, lat, dir, step, k, cam) => {
    const f = (s / Tr.length_) * (Tr.length - 1);
    if (f < 0 || f > Tr.length - 1) return im.setMatrixAt(i, m4.makeScale(0, 0, 0));
    const i0 = Math.min(Tr.length - 2, f | 0),
      t = f - i0,
      a = Tr[i0],
      b = Tr[i0 + 1];
    const tx = a.tx + (b.tx - a.tx) * t,
      tz = a.tz + (b.tz - a.tz) * t;
    const x = a.x + (b.x - a.x) * t - tz * lat,
      z = a.z + (b.z - a.z) * t + tx * lat;
    // out of sight, out of mind: nothing is drawn of those too far off to see
    if ((x - cam.x) ** 2 + (z - cam.z) ** 2 > 330 * 330) return im.setMatrixAt(i, m4.makeScale(0, 0, 0));
    q.setFromEuler(e.set(0, Math.atan2(tx * dir, tz * dir), Math.sin(step) * 0.035, 'YXZ'));
    im.setMatrixAt(i, m4.compose(p.set(x, a.y + (b.y - a.y) * t + Math.abs(Math.sin(step)) * 0.035, z), q, sc.setScalar(k)));
  };

  return {
    tick(dt, time, cam) {
      for (const { im, list } of pools) {
        list.forEach((w, i) => {
          // on the highway everyone stands aside for the procession, and waits until it has gone by
          const aside = w.Tr === road && w.s > head - columnLength - 2 && w.s < head + 7;
          if (!aside) {
            w.s += w.dir * w.v * dt;
            w.t += dt;
            if (w.s > w.Tr.length_ - 1.5) w.dir = -1;
            else if (w.s < 1.5) w.dir = 1;
          }
          w.lat += ((aside ? 3.2 : w.off) - w.lat) * Math.min(1, dt * 1.6);
          stand(im, i, w.Tr, w.s, w.dir * w.lat, w.dir, w.t * w.v * 3.3 + w.ph, w.k, cam);
        });
        im.instanceMatrix.needsUpdate = true;
      }
      // the column keeps its order; when its tail has passed into Edo it sets out again from the east
      head += 0.8 * dt;
      if (head > road.length_ + columnLength) head = 0;
      for (const { im, list } of Object.values(parade)) {
        list.forEach((m, i) => stand(im, i, road, head - m.back, m.lat, 1, time * 2.7 + m.back * 1.9, 1, cam));
        im.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
