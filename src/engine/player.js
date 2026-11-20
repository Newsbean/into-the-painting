import * as THREE from 'three';
import { paintMaterial, glowSprite, G } from './paint.js';
import { tint, xf } from './build.js';
import { clamp, damp, lerp } from './gl.js';

// Mira: night guard, mustard raincoat, satchel, one very large brush.

const COL = {
  coat: 0xe9b02c,
  coatDark: 0xc98a1c,
  trousers: 0x1f3f55,
  boots: 0x5a3421,
  skin: 0xf0c3a0,
  hair: 0x3a2018,
  satchel: 0x8a4a2c,
  wood: 0xb98a55,
  metal: 0xc9ccd6,
};

function part(mat, geo, col, m) {
  const g = tint(geo, col);
  if (m) g.applyMatrix4(m);
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false;
  return mesh;
}

export class Player {
  constructor(strokeTex) {
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.camYaw = 0;
    this.camPitch = 0.22;
    this.camDist = 7.5;
    this.onGround = true;
    this.fly = 0; // 0 walking .. 1 riding the wind
    this.phase = 0;
    this.speed = 0;
    this.idleLook = 0;
    this.canFly = true;
    this.frozen = false;
    this.pigment = new THREE.Color(0xfff2c0);
    this._pigTarget = new THREE.Color(0xfff2c0);

    const mat = (this.mat = paintMaterial({ stroke: strokeTex, scale: 1.6, contrast: 0.22, hueVar: 0.25, objSpace: 1, rim: 0.4, band: 0.22, warp: 0 }));
    // Mira is the one thing that is never grey
    mat.uniforms.uRestore = { value: 1 };
    const root = (this.root = new THREE.Group());
    const body = (this.body = new THREE.Group());
    body.position.y = 0.76;
    root.add(body);

    // raincoat: bell shape
    body.add(part(mat, new THREE.CylinderGeometry(0.2, 0.36, 0.66, 12), (x, y) => (y < -0.2 ? new THREE.Color(COL.coatDark) : new THREE.Color(COL.coat)), xf(0, 0.2, 0)));
    body.add(part(mat, new THREE.SphereGeometry(0.21, 12, 8), COL.coat, xf(0, 0.52, 0, 0, 1.08, 0.6, 0.95)));
    body.add(part(mat, new THREE.SphereGeometry(0.17, 10, 8), COL.coatDark, xf(0, 0.62, -0.17, 0, 1, 0.8, 0.8))); // hood
    body.add(part(mat, new THREE.BoxGeometry(0.24, 0.2, 0.1), COL.satchel, xf(-0.3, 0.02, 0.06, 0.2)));
    body.add(part(mat, new THREE.BoxGeometry(0.05, 0.72, 0.03), COL.satchel, xf(-0.03, 0.34, 0.2, 0, 1, 1, 1, 0, 0.72)));

    const head = (this.head = new THREE.Group());
    head.position.y = 0.82;
    body.add(head);
    head.add(part(mat, new THREE.SphereGeometry(0.235, 16, 12), COL.skin, xf(0, 0, 0, 0, 1, 1.04, 0.98)));
    head.add(part(mat, new THREE.SphereGeometry(0.25, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), COL.hair, xf(0, 0.03, -0.025, 0, 1, 1, 1, -0.28)));
    head.add(part(mat, new THREE.SphereGeometry(0.11, 10, 8), COL.hair, xf(0, 0.26, -0.1))); // bun
    head.add(part(mat, new THREE.SphereGeometry(0.1, 8, 6), COL.hair, xf(-0.12, 0.11, 0.17, 0, 1.3, 0.7, 0.6)));
    head.add(part(mat, new THREE.SphereGeometry(0.1, 8, 6), COL.hair, xf(0.1, 0.13, 0.17, 0, 1.2, 0.6, 0.6)));
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1210 });
    for (const sx of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), eyeMat);
      e.position.set(sx * 0.085, -0.01, 0.213);
      e.scale.set(1, 1.35, 0.6);
      head.add(e);
    }

    const limb = (len, r0, r1, col) => part(mat, new THREE.CylinderGeometry(r0, r1, len, 8), col, xf(0, -len / 2, 0));
    const mkArm = (sx) => {
      const sh = new THREE.Group();
      sh.position.set(sx * 0.25, 0.52, 0);
      sh.add(limb(0.3, 0.075, 0.07, COL.coat));
      const el = new THREE.Group();
      el.position.y = -0.3;
      el.add(limb(0.27, 0.07, 0.06, COL.coat));
      el.add(part(mat, new THREE.SphereGeometry(0.065, 8, 6), COL.skin, xf(0, -0.3, 0)));
      sh.add(el);
      body.add(sh);
      return { sh, el };
    };
    this.armL = mkArm(-1);
    this.armR = mkArm(1);

    const mkLeg = (sx) => {
      const hip = new THREE.Group();
      hip.position.set(sx * 0.11, 0.02, 0);
      hip.add(limb(0.36, 0.095, 0.08, COL.trousers));
      const knee = new THREE.Group();
      knee.position.y = -0.36;
      knee.add(limb(0.3, 0.08, 0.07, COL.trousers));
      knee.add(part(mat, new THREE.BoxGeometry(0.15, 0.13, 0.27), COL.boots, xf(0, -0.34, 0.05)));
      hip.add(knee);
      body.add(hip);
      return { hip, knee };
    };
    this.legL = mkLeg(-1);
    this.legR = mkLeg(1);

    // the brush
    const brush = (this.brush = new THREE.Group());
    brush.position.y = -0.3;
    brush.rotation.x = Math.PI / 2;
    brush.add(part(mat, new THREE.CylinderGeometry(0.028, 0.04, 1.15, 8), COL.wood, xf(0, 0.32, 0)));
    brush.add(part(mat, new THREE.CylinderGeometry(0.058, 0.04, 0.16, 8), COL.metal, xf(0, 0.97, 0)));
    this.tipMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), this.tipMat);
    tip.scale.set(0.85, 2.3, 0.85);
    tip.position.y = 1.22;
    brush.add(tip);
    this.tip = new THREE.Object3D();
    this.tip.position.y = 1.4;
    brush.add(this.tip);
    this.glow = glowSprite(0xffffff, 1.5, 0.9);
    this.tip.add(this.glow);
    this.armR.el.add(brush);

    // contact shadow
    const sh = new THREE.Mesh(
      new THREE.CircleGeometry(0.62, 20).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uA: { value: 0.4 } },
        vertexShader: `varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying vec2 vP; uniform float uA; void main(){ float d = length(vP) / 0.62; gl_FragColor = vec4(0.02,0.02,0.06, (1.0 - smoothstep(0.2, 1.0, d)) * uA); }`,
      })
    );
    sh.renderOrder = 2;
    this.shadow = sh;

    // ribbon of paint trailing from the brush
    const N = (this.trailN = 56);
    this.trailPts = Array.from({ length: N }, () => new THREE.Vector3());
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3));
    const tuv = new Float32Array(N * 2 * 2);
    for (let i = 0; i < N; i++) {
      tuv.set([i / (N - 1), 0, i / (N - 1), 1], i * 4);
    }
    tg.setAttribute('uv', new THREE.BufferAttribute(tuv, 2));
    const idx = [];
    for (let i = 0; i < N - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    tg.setIndex(idx);
    this.trailMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(1, 1, 1) }, uAmt: { value: 0 }, uNoise: G.uNoise, uTime: G.uTime },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        varying vec2 vUv; uniform vec3 uColor; uniform float uAmt; uniform sampler2D uNoise; uniform float uTime;
        void main(){
          float edge = 1.0 - abs(vUv.y - 0.5) * 2.0;
          float n = texture2D(uNoise, vec2(vUv.x * 0.06 - uTime * 0.01, vUv.y * 0.012)).r;
          float a = smoothstep(0.0, 0.5, edge) * (1.0 - vUv.x) * (0.55 + 0.75 * n) * uAmt;
          gl_FragColor = vec4(uColor * a * 1.5, 1.0);
        }`,
    });
    this.trail = new THREE.Mesh(tg, this.trailMat);
    this.trail.frustumCulled = false;
    this.trail.renderOrder = 12;
    this._tipW = new THREE.Vector3();
    this._v = new THREE.Vector3();
    this._side = new THREE.Vector3();
    this._lookT = 0;
  }

  addTo(scene) {
    scene.add(this.root, this.shadow, this.trail);
  }

  setPigment(hex) {
    this._pigTarget.set(hex);
  }

  place(pos, yaw = 0) {
    this.pos.copy(pos);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.camYaw = yaw + Math.PI;
    this.camPitch = 0.2;
    this.fly = 0;
    this.onGround = true;
    this.root.position.copy(this.pos);
    this.root.rotation.y = yaw;
    this.root.updateMatrixWorld(true);
    this.tip.getWorldPosition(this._tipW);
    for (const p of this.trailPts) p.copy(this._tipW);
  }

  update(dt, input, world, camera, time) {
    const frozen = this.frozen;
    const mx = frozen ? 0 : input.mx,
      mz = frozen ? 0 : input.mz;
    // --- look
    if (!frozen) {
      this.camYaw -= input.lookX * 0.0024;
      this.camPitch = clamp(this.camPitch + input.lookY * 0.002, -0.85, 1.25);
      if (input.lookX !== 0 || input.lookY !== 0) this._lookT = 0;
    }
    this._lookT += dt;
    const fx = -Math.sin(this.camYaw),
      fz = -Math.cos(this.camYaw);
    const rx = -fz,
      rz = fx;
    let dx = fx * mz + rx * mx,
      dz = fz * mz + rz * mx;
    const dl = Math.hypot(dx, dz);
    if (dl > 1) {
      dx /= dl;
      dz /= dl;
    }
    const moving = dl > 0.05;

    // --- vertical
    const ground = world.groundAt(this.pos.x, this.pos.z, this.pos.y);
    const wantUp = !frozen && input.fly && this.canFly;
    const airborne = this.pos.y > ground + 0.12;
    if (wantUp) {
      this.vel.y = damp(this.vel.y, 7.5, 4, dt);
      this.onGround = false;
    } else if (airborne || this.vel.y > 0) {
      // drift down on the painted wind; nose down to dive
      const dive = moving && mz > 0 ? clamp(this.camPitch, -0.3, 1) * 9 : 0;
      this.vel.y = damp(this.vel.y, -2.4 - dive, 2.2, dt);
    }
    const flying = !this.onGround;
    this.fly = damp(this.fly, flying && this.pos.y > ground + 0.9 ? 1 : 0, 5, dt);

    // --- horizontal
    const maxSp = flying ? (input.run ? 26 : 16) : input.run ? 10.5 : 6.2;
    const tx = dx * maxSp,
      tz = dz * maxSp;
    const k = flying ? 2.6 : 9;
    this.vel.x = damp(this.vel.x, tx, k, dt);
    this.vel.z = damp(this.vel.z, tz, k, dt);
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.pos.y += this.vel.y * dt;
    this.speed = Math.hypot(this.vel.x, this.vel.z);

    world.collide(this.pos, 0.45);
    const g2 = world.groundAt(this.pos.x, this.pos.z, this.pos.y);
    if (this.pos.y <= g2 + 0.02 && this.vel.y <= 0.01) {
      this.pos.y = this.onGround ? damp(this.pos.y, g2, 22, dt) : g2;
      if (this.pos.y < g2) this.pos.y = g2;
      this.vel.y = 0;
      this.onGround = true;
    } else if (this.onGround && !wantUp) {
      // walking off a small step: stick to the ground
      if (this.pos.y - g2 < 0.7) this.pos.y = damp(this.pos.y, g2, 18, dt);
      else this.onGround = false;
    }
    const ceil = world.ceiling ?? 120;
    if (this.pos.y > ceil) {
      this.pos.y = ceil;
      this.vel.y = Math.min(this.vel.y, 0);
    }

    // --- facing
    if (this.speed > 0.4) {
      const want = Math.atan2(this.vel.x, this.vel.z);
      let d = want - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.turn = damp(this.turn ?? 0, d, 6, dt);
      this.yaw += d * Math.min(1, dt * (flying ? 5 : 11));
    } else this.turn = damp(this.turn ?? 0, 0, 6, dt);

    // gentle auto-follow so the mouse is optional
    if (moving && this._lookT > 1.4 && Math.abs(mx) > 0.1) {
      this.camYaw -= mx * dt * 0.9;
    }

    this.animate(dt, time, flying);
    this.updateCamera(dt, world, camera, flying);
    this.updateTrail(dt, camera);

    // lantern on the brush lights the paint around her
    this.pigment.lerp(this._pigTarget, 1 - Math.exp(-dt * 2.5));
    this.tipMat.color.copy(this.pigment).multiplyScalar(2.4);
    this.glow.material.color.copy(this.pigment);
    this.trailMat.uniforms.uColor.value.copy(this.pigment);
    G.uLantern.value.set(this._tipW.x, this._tipW.y, this._tipW.z, 9 + this.fly * 9);
    G.uLanternColor.value.copy(this.pigment).multiplyScalar(0.34);

    this.shadow.position.set(this.pos.x, g2 + 0.05, this.pos.z);
    const hgt = this.pos.y - g2;
    this.shadow.scale.setScalar(1 + hgt * 0.12);
    this.shadow.material.uniforms.uA.value = 0.36 * Math.exp(-hgt * 0.1);
  }

  animate(dt, time, flying) {
    const sp = this.speed;
    const f = this.fly;
    const walkAmp = clamp(sp / 6) * (1 - f);
    this.phase += dt * (3.2 + sp * 1.25) * (sp > 0.3 ? 1 : 0);
    const s = Math.sin(this.phase),
      c = Math.cos(this.phase);
    const idle = Math.sin(time * 1.6) * 0.5 + 0.5;

    this.root.position.copy(this.pos);
    this.root.rotation.y = this.yaw;
    const bob = Math.abs(c) * 0.06 * walkAmp + idle * 0.012 * (1 - walkAmp);
    const hover = Math.sin(time * 2.1) * 0.12 * f;
    this.body.position.y = 0.76 + bob + hover + f * 0.25;
    // lean into the run; lie on the wind when flying
    const pitch = clamp(this.vel.y * -0.035, -0.35, 0.4);
    this.body.rotation.x = lerp(walkAmp * 0.12, 1.12 + pitch, f);
    this.body.rotation.z = damp(this.body.rotation.z, clamp(-(this.turn ?? 0) * 1.3, -0.6, 0.6) * (0.25 + f * 0.9), 6, dt);

    const set = (o, x, kx) => {
      o.hip.rotation.x = x;
      o.knee.rotation.x = kx;
    };
    const flut = Math.sin(time * 5) * 0.18;
    set(this.legL, lerp(s * 0.85 * walkAmp, 0.12 + flut, f), lerp(Math.max(0, -c) * 1.25 * walkAmp, 0.35 - flut, f));
    set(this.legR, lerp(-s * 0.85 * walkAmp, 0.12 - flut, f), lerp(Math.max(0, c) * 1.25 * walkAmp, 0.35 + flut, f));

    this.armL.sh.rotation.x = lerp(-s * 0.7 * walkAmp, 0.5, f);
    this.armL.sh.rotation.z = lerp(-0.12, -0.5, f);
    this.armL.el.rotation.x = lerp(-0.25 - walkAmp * 0.4, -0.2, f);
    // brush arm: carried like a lantern on foot, thrust ahead in the air
    this.armR.sh.rotation.x = lerp(-0.75 + s * 0.12 * walkAmp + idle * 0.04, -2.75, f);
    this.armR.sh.rotation.z = lerp(0.18, 0.12, f);
    this.armR.el.rotation.x = lerp(-0.7, -0.08, f);
    this.brush.rotation.x = lerp(Math.PI * 0.42, Math.PI * 0.03, f);
    this.head.rotation.x = lerp(0, -0.85, f);
    this.root.updateMatrixWorld(true);
    this.tip.getWorldPosition(this._tipW);
    this.glow.scale.setScalar(1.35 + idle * 0.25 + f * 1.2);
  }

  updateCamera(dt, world, camera, flying) {
    if (this.cinematic) return;
    const wantDist = lerp(7.2, 12.5, this.fly) + this.speed * 0.08;
    this.camDist = damp(this.camDist, wantDist, 3, dt);
    const t = this._camTarget ?? (this._camTarget = this.pos.clone().add(new THREE.Vector3(0, 1.5, 0)));
    const ty = this.pos.y + 1.55 + this.fly * 0.6;
    t.x = damp(t.x, this.pos.x, 14, dt);
    t.z = damp(t.z, this.pos.z, 14, dt);
    t.y = damp(t.y, ty, 9, dt);
    const cp = Math.cos(this.camPitch),
      sp = Math.sin(this.camPitch);
    const ox = Math.sin(this.camYaw) * cp,
      oy = sp,
      oz = Math.cos(this.camYaw) * cp;
    // pull in if something solid is between her and the lens
    let dist = this.camDist;
    const room = world.roomAt?.(this.pos.x, this.pos.z, this.pos.y);
    for (let i = 1; i <= 8; i++) {
      const d = (this.camDist * i) / 8;
      const x = t.x + ox * d,
        y = t.y + oy * d,
        z = t.z + oz * d;
      if (world.blocked(x, y, z) || (room && (x < room.minx || x > room.maxx || z < room.minz || z > room.maxz || y > room.ceil))) {
        dist = Math.max(1.6, d - this.camDist / 8);
        break;
      }
    }
    this._dist = damp(this._dist ?? dist, dist, dist < (this._dist ?? dist) ? 18 : 3, dt);
    camera.position.set(t.x + ox * this._dist, t.y + oy * this._dist, t.z + oz * this._dist);
    const gy = world.groundAt(camera.position.x, camera.position.z, camera.position.y + 2) + 0.5;
    if (camera.position.y < gy) camera.position.y = gy;
    camera.lookAt(t.x, t.y + 0.25, t.z);
    const fov = lerp(58, 72, this.fly * clamp(this.speed / 22));
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = damp(camera.fov, fov, 3, dt);
      camera.updateProjectionMatrix();
    }
  }

  // snap the follow camera (after teleports / cinematics)
  resetCamera(world, camera) {
    this._camTarget = null;
    this._dist = undefined;
    this.cinematic = false;
    this.updateCamera(1, world, camera, false);
    this.updateCamera(1, world, camera, false);
  }

  updateTrail(dt, camera) {
    const pts = this.trailPts;
    const N = this.trailN;
    // shift history when the tip has moved far enough
    if (pts[0].distanceToSquared(this._tipW) > 0.09) {
      for (let i = N - 1; i > 0; i--) pts[i].copy(pts[i - 1]);
    }
    pts[0].copy(this._tipW);
    // let old paint sag a little
    for (let i = 4; i < N; i++) pts[i].y -= dt * 0.12 * (i / N);
    const pos = this.trail.geometry.attributes.position;
    const amt = clamp(this.speed / 9) * 0.55 + this.fly * 0.75;
    this.trailMat.uniforms.uAmt.value = damp(this.trailMat.uniforms.uAmt.value, amt, 3, dt);
    const w = 0.16 + this.fly * 0.34;
    for (let i = 0; i < N; i++) {
      const a = pts[Math.max(0, i - 1)],
        b = pts[Math.min(N - 1, i + 1)];
      this._v.subVectors(b, a);
      this._side.subVectors(camera.position, pts[i]).cross(this._v).normalize();
      const ww = w * (0.35 + Math.sin((i / (N - 1)) * Math.PI) * 1.0);
      pos.setXYZ(i * 2, pts[i].x + this._side.x * ww, pts[i].y + this._side.y * ww, pts[i].z + this._side.z * ww);
      pos.setXYZ(i * 2 + 1, pts[i].x - this._side.x * ww, pts[i].y - this._side.y * ww, pts[i].z - this._side.z * ww);
    }
    pos.needsUpdate = true;
  }

  get tipWorld() {
    return this._tipW;
  }
}
