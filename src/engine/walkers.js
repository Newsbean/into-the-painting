// People on the move, for any world. Each kind of figure is one geometry drawn many times;
// only where each one stands is worked out every frame.
//
//   const road = way(world, [[x, z], ...])        a line to walk, with the ground's height along it
//   const folk = new Walkers(scene, material, [geometry, ...])
//   folk.add(road, 40, R, { wide: 1.5 })           forty of them on that way, keeping to the left
//   folk.build()
//   each frame: folk.tick(dt, time, camera.position)
//
// stand() places one instance on a way, for columns that keep their own order (a
// procession, a file of soldiers).
import * as THREE from 'three';
import { trace } from './plan.js';

// points a metre apart along a smoothed line, each with the height to walk at (bridges and decks count)
export function way(world, pts) {
  const Tr = trace(pts, 1);
  for (const p of Tr) p.y = world.groundAt(p.x, p.z, world.heightAt(p.x, p.z) + 3);
  return Tr;
}

const m4 = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  e = new THREE.Euler(),
  p = new THREE.Vector3(),
  sc = new THREE.Vector3();
// instance i of im stands s metres along Tr, `lat` to the left of it, facing the way it is going
// (dir 1 or -1); `step` drives the bob of its walk, k is its size. Out of sight (beyond `far`
// from the camera, or off the end of the way) nothing is drawn of it.
export function stand(im, i, Tr, s, lat, dir, step, k, cam, far = 330) {
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
  if ((x - cam.x) ** 2 + (z - cam.z) ** 2 > far * far) return im.setMatrixAt(i, m4.makeScale(0, 0, 0));
  q.setFromEuler(e.set(0, Math.atan2(tx * dir, tz * dir), Math.sin(step) * 0.035, 'YXZ'));
  im.setMatrixAt(i, m4.compose(p.set(x, a.y + (b.y - a.y) * t + Math.abs(Math.sin(step)) * 0.035, z), q, sc.setScalar(k)));
}

export class Walkers {
  constructor(scene, material, geometries) {
    this.scene = scene;
    this.material = material;
    this.pools = geometries.map((geo) => ({ geo, list: [], im: null }));
    this.all = [];
  }
  // n walkers on a way. wide: how far from the middle they may walk; speed: [slowest, fastest]
  add(Tr, n, R, { wide = 0.7, speed = [0.85, 1.45] } = {}) {
    for (let i = 0; i < n; i++) {
      const off = 0.5 + R() * wide;
      const w = { Tr, s: 2 + R() * (Tr.length_ - 4), dir: R() < 0.5 ? 1 : -1, v: speed[0] + R() * (speed[1] - speed[0]), off, lat: off, t: 0, ph: R() * 6.283, kind: (R() * this.pools.length) | 0, k: 0.94 + R() * 0.12 };
      this.pools[w.kind].list.push(w);
      this.all.push(w);
    }
    return this;
  }
  build() {
    for (const pool of this.pools) {
      pool.im = new THREE.InstancedMesh(pool.geo, this.material, Math.max(1, pool.list.length));
      pool.im.count = pool.list.length;
      pool.im.frustumCulled = false;
      this.scene.add(pool.im);
    }
    return this;
  }
  // aside(w): true while walker w should stand at the side of the way and wait
  tick(dt, time, cam, aside) {
    for (const { im, list } of this.pools) {
      for (let i = 0; i < list.length; i++) {
        const w = list[i];
        const wait = aside ? aside(w) : false;
        if (!wait) {
          w.s += w.dir * w.v * dt;
          w.t += dt;
          if (w.s > w.Tr.length_ - 1.5) w.dir = -1;
          else if (w.s < 1.5) w.dir = 1;
        }
        w.lat += ((wait ? 3.2 : w.off) - w.lat) * Math.min(1, dt * 1.6);
        stand(im, i, w.Tr, w.s, w.dir * w.lat, w.dir, w.t * w.v * 3.3 + w.ph, w.k, cam);
      }
      im.instanceMatrix.needsUpdate = true;
    }
  }
}
