// Dev only: records the showcase film frame by frame.
//
//   npm run dev:steady, then open  /?debug&film   (the whole game: a shot fetches its own
//                                  world), or /?debug&film&only=<world> to work on one
//   film.setup()                     1920x1080, game loop paused, HUD hidden
//   await film.render('<shot>')      frames -> ./capture/film/<shot>/0001.jpg ...
//   await film.render('<shot>', { preview: 4 })   a few stills -> ./capture/prev/
//   await film.stills('<name>', [views])          several angles on one sheet -> ./capture/prev/
//   film.queue([...shots])           one after another; film.st says how far it has got
//   await film.cards(); await film.matte(world)   the title cards and gilt frames -> ./capture/film/overlay/
//   await film.score(cues, seconds, marks)        the music -> ./capture/film/score.wav
//
// Every frame is stepped at exactly 1/30 s, so a shot renders the same however slow
// the machine is. tools/film/assemble.mjs cuts the shots together with ffmpeg, following
// tools/film/cut.json.
import * as THREE from 'three';
import { renderScore, wavBlob } from '../engine/audio.js';
import { ease, smooth, clamp, lerp } from '../engine/gl.js';

const FPS = 30;
const DT = 1 / FPS;

export function installFilm(g) {
  const st = { busy: null, done: 0, total: 0, error: null, size: null };
  const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const gy = (x, z) => g.world.groundAt(x, z, 9999);
  // [x, height above the ground, z] -> world position
  const rel = (a) => [a[0], gy(a[0], a[2]) + a[1], a[2]];
  const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const out = (t) => 1 - Math.pow(1 - clamp(t), 3);

  function setup(W = 1920, H = 1080) {
    g.paused = true;
    g.mode = 'film'; // no story triggers while the camera is ours
    g.drift = null;
    g.camTween = null;
    document.getElementById('hud').style.display = 'none';
    g.renderer.setPixelRatio(1);
    g.renderer.setSize(W, H, false);
    g.pipeline.setSize(W, H);
    g.rw = W;
    g.rh = H;
    g.camera.aspect = W / H;
    g.camera.updateProjectionMatrix();
    g.keys.clear();
    st.size = [W, H];
    return `${g.world?.id} ${W}x${H}`;
  }

  // clear the play markers out of the picture; Mira only when the shot is about her
  function dress({ mira = false, restored = 1 } = {}) {
    const w = g.world;
    for (const x of w.wisps ?? []) x.group.visible = false;
    if (w.echoGroup) w.echoGroup.visible = false;
    if (w.mementoGroup) w.mementoGroup.visible = false;
    if (w.portal) w.portal.visible = false;
    const p = g.player;
    p.root.visible = p.trail.visible = p.shadow.visible = mira;
    p.cinematic = true;
    p.frozen = !mira;
    p.canFly = true;
    g.keys.clear();
    if (!mira) {
      // her lantern lights the paint around her: park it out of sight
      p.pos.set(900, gy(900, 900), 900);
      p.vel.set(0, 0, 0);
    }
    // no colour waves left over from the last take
    for (const x of w.waves) x.max = x.r = x.fresh = 0;
    if (restored !== null) w.setRestored(restored);
  }

  const cam = (p, t, fov = 55) => g.setCamera({ pos: V(p), target: V(t), fov });
  // Catmull-Rom through camera keys [{ p, t, fov }]
  function along(keys, u) {
    const n = keys.length - 1;
    if (n < 1) return keys[0];
    const s = clamp(u) * n;
    const i = Math.min(n - 1, Math.floor(s));
    const f = s - i;
    const K = (j) => keys[Math.max(0, Math.min(n, j))];
    const cr = (a, b, c, d) => 0.5 * (2 * b + (c - a) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (3 * b - a - 3 * c + d) * f * f * f);
    const v = (key) => [0, 1, 2].map((ax) => cr(K(i - 1)[key][ax], K(i)[key][ax], K(i + 1)[key][ax], K(i + 2)[key][ax]));
    return { p: v('p'), t: v('t'), fov: lerp(K(i).fov ?? 55, K(i + 1).fov ?? 55, f) };
  }
  const fly = (keys, u) => {
    const k = along(keys, u);
    cam(k.p, k.t, k.fov);
  };

  // toDataURL, not toBlob: in a background tab toBlob waits on idle time, about a second a frame
  async function save(path, q = 0.93, canvas = g.canvas) {
    const b64 = canvas.toDataURL('image/jpeg', q).split(',')[1];
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const res = await fetch('/__capture?name=' + path, { method: 'POST', body: bytes });
    if (!res.ok) throw new Error('save failed ' + res.status);
  }

  // one loose still, for finding angles: heights are above the ground unless abs
  async function still(name, p, t, fov = 55, abs = false) {
    if (p === 'view') g.setCamera(g.viewPose(g.world));
    else cam(abs ? p : rel(p), abs ? t : rel(t), fov);
    g.frame(DT);
    g.frame(DT);
    await save(`prev/${name}.jpg`, 0.85);
    return name;
  }

  // Several stills on one sheet, for looking a place over -> ./capture/prev/<name>.jpg
  //   await film.stills('town', [{ p: [x, h, z], t: [x, h, z], fov }, 'view', { p, t, abs: true }])
  // Heights are above the ground unless abs; 'view' is the painting's own view; a view's
  // pre() runs before it is drawn.
  async function stills(name, views, { W = 960, H = 540, cols = 4 } = {}) {
    setup(W, H);
    cols = Math.min(cols, views.length);
    const c = document.createElement('canvas');
    c.width = cols * W;
    c.height = Math.ceil(views.length / cols) * H;
    const x = c.getContext('2d');
    views.forEach((v, i) => {
      v.pre?.();
      if (v === 'view') g.setCamera(g.viewPose(g.world));
      else cam(v.abs ? v.p : rel(v.p), v.abs ? v.t : rel(v.t), v.fov ?? 55);
      g.frame(v.dt ?? DT);
      g.frame(v.dt ?? DT);
      x.drawImage(g.canvas, (i % cols) * W, Math.floor(i / cols) * H, W, H);
    });
    await save(`prev/${name}.jpg`, 0.88, c);
    return `${name} ${c.width}x${c.height}`;
  }

  // The game's own finale move: from a step back, in to the painting's exact view,
  // sized so the picture fills the gilt window (80% of the frame height).
  function framed(world, frames, { settle = 0.62, init, each } = {}) {
    let wide, pose;
    return {
      world,
      frames,
      init(w) {
        dress();
        pose = g.viewPose(w, 0.8);
        const back = new THREE.Vector3().subVectors(pose.pos, pose.target).setLength(w.pullBack ?? 6);
        wide = { pos: pose.pos.clone().add(back).add(new THREE.Vector3(0, w.pullUp ?? 1.4, 0)), fov: pose.fov + 5 };
        init?.(w);
      },
      each(i, u, w) {
        const k = ease(clamp(u / settle));
        g.setCamera({ pos: wide.pos.clone().lerp(pose.pos, k), target: pose.target, fov: lerp(wide.fov, pose.fov, k) });
        each?.(i, u, w);
      },
    };
  }

  const SHOTS = {};

  // ------------------------------------------------------------------ The Starry Night
  // the hook: a village in pencil, and the colour coming home
  SHOTS.starry_bloom = {
    world: 'starry',
    frames: 156,
    warm: 40,
    init() {
      dress({ restored: 0 });
      this.k = [
        { p: rel([-30, 52, 62]), t: rel([8, 10, -46]), fov: 56 },
        { p: rel([-22, 40, 46]), t: rel([9, 14, -52]), fov: 56 },
        { p: rel([-15, 27, 33]), t: rel([10, 27, -64]), fov: 58 },
      ];
      this.slot = null;
    },
    each(i, u, w) {
      fly(this.k, ease(u) * 0.8 + u * 0.2);
      const at = 36;
      if (i === at) {
        w.bloom(V(rel([12, 1, -44])), 900);
        this.slot = w.waves.find((x) => x.max === 900);
      }
      if (i === at + 34) w.skyTarget = 1;
      if (this.slot && i > at) this.slot.r = 1 + 230 * Math.pow((i - at) / (this.frames - at), 1.5);
      w.restore = smooth(0.7, 1, u);
    },
  };
  // Mira over the rooftops (her paint trail is left out: it blows out this close to the lens)
  SHOTS.starry_flight = {
    world: 'starry',
    frames: 96,
    warm: 45,
    init() {
      dress({ mira: true });
      const p = g.player;
      p.trail.visible = false;
      p.place(V([-4, 0, 150]), Math.PI);
      p.pos.y = gy(-4, 150) + 15;
      p.onGround = false;
      p.vel.set(0, 0, -22);
      p.fly = 1;
      g.keys.add('KeyW');
      g.keys.add('ShiftLeft');
    },
    each(i, u) {
      const p = g.player;
      p.camYaw = Math.PI * 2 + 0.16 * Math.sin(u * 2.6 - 0.4);
      p.vel.y = 2.2 * Math.cos(u * Math.PI * 1.1);
      const q = p.pos;
      cam([q.x + 2.6 - 1.6 * u, q.y + 1.5 + 0.5 * u, q.z + 6.2], [q.x - 0.4, q.y + 3.2, q.z - 40], 62);
    },
  };
  SHOTS.starry_cafe = {
    world: 'starry',
    frames: 84,
    init() {
      dress();
      this.k = [
        { p: rel([11.6, 2.3, -26.6]), t: rel([23.2, 3.4, -44.6]), fov: 54 },
        { p: rel([14.6, 2.6, -30.4]), t: rel([23.4, 3.6, -45.2]), fov: 54 },
      ];
    },
    each(i, u) {
      fly(this.k, u);
    },
  };
  SHOTS.starry_sunflowers = {
    world: 'starry',
    frames: 84,
    init() {
      dress();
      this.k = [
        { p: rel([17, 3.4, 81.4]), t: rel([56, 6.4, 108.6]), fov: 58 },
        { p: rel([22.5, 4.6, 85.2]), t: rel([58, 7, 110]), fov: 58 },
      ];
    },
    each(i, u) {
      fly(this.k, u);
    },
  };
  // a street of the town across the river, down to its square
  SHOTS.starry_street = {
    world: 'starry',
    frames: 72,
    init() {
      dress();
      this.k = [
        { p: rel([27.6, 2.6, -258]), t: rel([26.6, 8.5, -310]), fov: 58 },
        { p: rel([26.8, 3.2, -267]), t: rel([26.6, 9.5, -310]), fov: 58 },
      ];
    },
    each(i, u) {
      fly(this.k, u);
    },
  };
  // the game of this picture: she flies its lights alight, one ring after another
  SHOTS.starry_lights = {
    world: 'starry',
    frames: 96,
    warm: 20,
    init(w) {
      dress({ mira: true });
      const L = w.task.lights;
      this.pts = [[62, 26, 96], ...[0, 1, 2, 3].map((k) => L[k].g.position.toArray())].map((a) => ({ p: a, t: a }));
      this.lit = -1;
      this.pop = [];
      L.forEach((l, k) => {
        l.g.visible = l.shaft.visible = k < 4;
        l.hoop.visible = true;
        l.hoop.material.opacity = 0.9;
        l.star.scale.setScalar(4);
        l.star.material.opacity = 0.6;
      });
      const p = g.player;
      p.trail.visible = false;
      p.glow.material.opacity = 0.4; // (at this distance her lantern would hide her)
      p.place(V(this.pts[0].p), Math.PI);
      p.fly = 1;
      p.frozen = true;
      this.at = (s) => V(along(this.pts, s).p);
    },
    each(i, u, w) {
      // she is carried along the course, not flown: the same every take
      const s = 0.15 + u * 0.64,
        a = this.at(s),
        dir = this.at(s + 0.012).sub(a).normalize(),
        p = g.player;
      p.pos.copy(a);
      p.vel.copy(dir).multiplyScalar(26);
      p.onGround = false;
      p.yaw = Math.atan2(dir.x, dir.z);
      const L = w.task.lights;
      for (let k = this.lit + 1; k < 4; k++) {
        if (a.distanceTo(L[k].g.position) > 6) continue;
        this.lit = k;
        this.pop[k] = i;
        L[k].hoop.visible = L[k].shaft.visible = false;
      }
      // a ring she has lit bursts, and is gone before the camera reaches it
      this.pop.forEach((at, k) => {
        const f = clamp((i - at) / 5);
        L[k].star.scale.setScalar(4 + 9 * Math.sin(f * Math.PI));
        L[k].star.material.opacity = 1 - f;
      });
      const side = new THREE.Vector3(-dir.z, 0, dir.x);
      const eye = a.clone().addScaledVector(dir, -7.2).addScaledVector(side, 1.7).add(new THREE.Vector3(0, 2.1, 0));
      cam(eye.toArray(), a.clone().addScaledVector(dir, 40).add(new THREE.Vector3(0, -1.5, 0)).toArray(), 60);
    },
  };
  SHOTS.starry_frame = framed('starry', 120);

  // ------------------------------------------------------------------ The Great Wave
  const calmSea = (w) => {
    w.final = 0;
    w.applyRise?.(0);
  };
  SHOTS.wave_shore = {
    world: 'wave',
    frames: 84,
    init(w) {
      dress();
      calmSea(w);
      this.k = [
        { p: rel([87, 12.5, 218]), t: rel([52, 9, 100]), fov: 55 },
        { p: rel([80, 6.5, 196]), t: rel([57, 7.6, 120]), fov: 51 },
      ];
    },
    each(i, u, w) {
      w.final = 0;
      fly(this.k, u);
    },
  };
  // in along the pier to the beach, with everyone on it
  SHOTS.wave_front = {
    world: 'wave',
    frames: 66,
    init(w) {
      dress();
      calmSea(w);
      this.k = [
        { p: rel([15, 8.5, 160]), t: rel([4, 3.5, 216]), fov: 54 },
        { p: rel([9, 5.2, 181]), t: rel([2, 3.6, 218]), fov: 54 },
      ];
    },
    each(i, u, w) {
      w.final = 0;
      fly(this.k, u);
    },
  };
  SHOTS.wave_village = {
    world: 'wave',
    frames: 84,
    init(w) {
      dress();
      calmSea(w);
      this.k = [
        { p: rel([-26, 6.5, 200]), t: rel([-74, 11, 272]), fov: 58 },
        { p: rel([-34, 8, 208]), t: rel([-76, 12, 274]), fov: 58 },
      ];
    },
    each(i, u, w) {
      w.final = 0;
      fly(this.k, u);
    },
  };
  SHOTS.wave_torii = {
    world: 'wave',
    frames: 84,
    init(w) {
      dress();
      calmSea(w);
      this.k = [
        { p: rel([56, 4.2, 252]), t: rel([70, 11, 300]), fov: 58 },
        { p: rel([59.5, 6, 259]), t: rel([70.5, 12.5, 302]), fov: 58 },
      ];
    },
    each(i, u, w) {
      w.final = 0;
      fly(this.k, u);
    },
  };
  SHOTS.wave_bridge = {
    world: 'wave',
    frames: 84,
    init(w) {
      dress();
      calmSea(w);
      this.k = [
        { p: rel([30.0, 3.9, 233.4]), t: rel([45.6, 3.5, 220.6]), fov: 55 },
        { p: rel([33.8, 4.5, 230.2]), t: rel([46.2, 3.7, 219.8]), fov: 55 },
      ];
    },
    each(i, u, w) {
      w.final = 0;
      fly(this.k, u);
    },
  };
  // the sea stands up into the picture
  SHOTS.wave_rise = framed('wave', 150, {
    settle: 0.7,
    init: calmSea,
    each(i, u, w) {
      w.final = ease(clamp((u - 0.1) / 0.5));
    },
  });

  // ------------------------------------------------------------------ Girl with a Pearl Earring
  SHOTS.pearl_canal = {
    world: 'pearl',
    frames: 84,
    init(w) {
      dress();
      w.turn = 0;
      this.k = [
        { p: rel([-27, 3.0, 11.5]), t: rel([30, 6.5, -22]), fov: 56 },
        { p: rel([-17, 2.6, 9.5]), t: rel([32, 6.5, -22]), fov: 56 },
      ];
    },
    each(i, u, w) {
      w.turn = 0;
      fly(this.k, u);
    },
  };
  SHOTS.pearl_studio = {
    world: 'pearl',
    frames: 72,
    init(w) {
      dress();
      w.turn = 0;
      this.k = [
        { p: [38.9, 2.25, -28.9], t: [32.4, 1.25, -33.6], fov: 56 },
        { p: [37.9, 2.05, -30.1], t: [32.6, 1.3, -33.6], fov: 54 },
      ];
    },
    each(i, u, w) {
      w.turn = 0;
      fly(this.k, u);
    },
  };
  // Delft as it was rebuilt: over the stepped gables, on the market square, along the side canal
  const delft = (frames, a, b) => ({
    world: 'pearl',
    frames,
    init(w) {
      dress();
      w.turn = 0;
      this.k = [a, b].map((q) => ({ p: rel(q.p), t: rel(q.t), fov: q.fov }));
    },
    each(i, u, w) {
      w.turn = 0;
      fly(this.k, u);
    },
  });
  SHOTS.pearl_roofs = delft(72, { p: [46, 32, 66], t: [-20, 4, 20], fov: 58 }, { p: [31, 26, 53], t: [-27, 4, 25], fov: 58 });
  SHOTS.pearl_market = delft(60, { p: [-27, 2.8, 28], t: [-48, 11, 82], fov: 58 }, { p: [-29.4, 3.1, 33.4], t: [-47.4, 11.6, 83], fov: 58 });
  SHOTS.pearl_side = delft(60, { p: [59.6, 3.4, 17], t: [62, 4, 110], fov: 56 }, { p: [60.5, 3.0, 23.5], t: [62, 4.2, 110], fov: 56 });
  // the last stroke, and she turns
  SHOTS.pearl_turn = framed('pearl', 138, {
    settle: 0.66,
    init(w) {
      w.turn = 0;
    },
    each(i, u, w) {
      w.turn = ease(clamp((u - 0.06) / 0.5));
    },
  });

  // ------------------------------------------------------------------ The Scream
  SHOTS.scream_sun = {
    world: 'scream',
    frames: 84,
    init() {
      dress();
      this.k = [
        { p: [-167.5, 4.2, -116.5], t: [-150, 2.4, -128], fov: 55 },
        { p: [-164, 4.9, -119.5], t: [-149, 2.6, -129], fov: 55 },
      ];
    },
    each(i, u) {
      fly(this.k, u);
    },
  };
  SHOTS.scream_fjord = {
    world: 'scream',
    frames: 84,
    init() {
      dress();
      this.k = [
        { p: rel([-116, 6.5, -60]), t: rel([-60, 7, -110]), fov: 60 },
        { p: rel([-108, 8, -67]), t: rel([-58, 8, -112]), fov: 60 },
      ];
    },
    each(i, u) {
      fly(this.k, u);
    },
  };
  SHOTS.scream_road = {
    world: 'scream',
    frames: 78,
    init(w) {
      dress();
      const v = w.view;
      const e = [v.pos[0] - 0.643 * 1.8, v.pos[1] - 1.6, v.pos[2] - 0.766 * 1.8]; // where the figure stands
      this.k = [
        { p: [e[0] + 9.5, e[1] + 2.5, e[2] + 2.2], t: [e[0] - 10, e[1] + 1.9, e[2] - 4.6], fov: 58 },
        { p: [e[0] + 7.2, e[1] + 2.2, e[2] + 4.0], t: [e[0] - 10, e[1] + 1.8, e[2] - 4.2], fov: 56 },
      ];
    },
    each(i, u) {
      fly(this.k, u);
    },
  };
  // Kristiania from out on the fjord, and its quay at dusk
  const fjord = (frames, a, b) => ({
    world: 'scream',
    frames,
    init() {
      dress();
      this.k = [a, b].map((q) => ({ p: rel(q.p), t: rel(q.t), fov: q.fov }));
    },
    each(i, u) {
      fly(this.k, u);
    },
  });
  SHOTS.scream_harbour = fjord(72, { p: [-219, 14, -204], t: [-215, 6, -80], fov: 56 }, { p: [-211, 11, -190], t: [-214, 6, -80], fov: 56 });
  SHOTS.scream_quay = fjord(60, { p: [-149.4, 4.2, -102], t: [-162, 3, -150], fov: 58 }, { p: [-151.6, 3.6, -107.5], t: [-162.5, 3, -150], fov: 58 });
  // (the figure on the road is the one you bring the diary back to: he belongs in this picture)
  SHOTS.scream_frame = framed('scream', 132, {
    settle: 0.66,
    init(w) {
      w.echoGroup.visible = true;
      if (w.echoGroup.userData.beam) w.echoGroup.userData.beam.visible = false;
    },
  });

  // ------------------------------------------------------------------ Mona Lisa
  SHOTS.mona_valley = {
    world: 'mona',
    frames: 84,
    init() {
      dress();
      this.k = [
        { p: rel([66, 54, 70]), t: rel([0, 20, -40]), fov: 58 },
        { p: rel([52, 62, 52]), t: rel([2, 18, -46]), fov: 58 },
      ];
    },
    each(i, u) {
      fly(this.k, u);
    },
  };
  SHOTS.mona_horse = {
    world: 'mona',
    frames: 78,
    init() {
      dress();
      this.k = [
        { p: rel([-42, 4.2, 113]), t: rel([-60, 6.6, 94]), fov: 56 },
        { p: rel([-47, 6.6, 110]), t: rel([-60.5, 7.2, 94]), fov: 56 },
      ];
    },
    each(i, u) {
      fly(this.k, u);
    },
  };
  SHOTS.mona_screw = {
    world: 'mona',
    frames: 78,
    init() {
      dress();
      this.k = [
        { p: rel([-93, 5, 24]), t: rel([-112, 6.4, 8]), fov: 56 },
        { p: rel([-98, 6.4, 20.5]), t: rel([-112.5, 7, 8]), fov: 56 },
      ];
    },
    each(i, u) {
      fly(this.k, u);
    },
  };
  SHOTS.mona_workshop = {
    world: 'mona',
    frames: 78,
    init(w) {
      dress();
      const L = w.heightAt(0, 0);
      this.k = [
        { p: [3.8, L + 2.5, 20.4], t: [-0.6, L + 1.5, -3.3], fov: 58 },
        { p: [2.2, L + 2.0, 12.5], t: [-0.3, L + 1.4, -3.3], fov: 56 },
      ];
    },
    each(i, u) {
      fly(this.k, ease(u) * 0.5 + u * 0.5);
    },
  };
  // the walled town of towers from the air, and the bridge of arches that stands behind her
  const valley = (frames, a, b) => ({
    world: 'mona',
    frames,
    init() {
      dress();
      this.k = [a, b].map((q) => ({ p: rel(q.p), t: rel(q.t), fov: q.fov }));
    },
    each(i, u) {
      fly(this.k, u);
    },
  });
  SHOTS.mona_town = valley(72, { p: [-172, 54, -90], t: [-130, 14, -150], fov: 56 }, { p: [-181, 47, -113], t: [-130, 14, -150], fov: 56 });
  SHOTS.mona_bridge = valley(60, { p: [25, 7.2, -97], t: [63, 5, -121], fov: 56 }, { p: [28.6, 6.8, -99.6], t: [63.3, 5, -121], fov: 56 });
  // the game of this picture: his three players, gathered beside her, play her a smile
  SHOTS.mona_band = {
    world: 'mona',
    frames: 72,
    warm: 10,
    init(w) {
      dress();
      const t = w.task,
        p = g.player,
        L = w.heightAt(0, 0),
        none = () => {};
      if (t.stage !== 'play') {
        // play the puzzle through to where they stand in the loggia
        t.start();
        for (const m of t.band) {
          p.pos.copy(m.g.position);
          t.update(DT, g, none);
        }
        p.pos.set(3.9, L, 0);
        t.update(DT, g, none);
        g.camTween = null;
      }
      g.ui.mini();
      for (const m of t.band) m.tag.visible = false;
      for (const x of w.waves) x.max = x.r = x.fresh = 0;
      p.pos.set(900, gy(900, 900), 900);
      Object.assign(t, { round: 4, phase: 'ready', t: 0.05, warm: 0.3 });
      this.k = [
        { p: [1.5, L + 1.65, 2.6], t: [-2.0, L + 1.2, -2.8], fov: 44 },
        { p: [0.9, L + 1.6, 1.5], t: [-1.9, L + 1.2, -2.8], fov: 44 },
      ];
    },
    each(i, u, w) {
      const t = w.task;
      t.warm = 0.3 + 0.7 * u;
      t.update(DT, g, () => {});
      if (t.phase === 'play') Object.assign(t, { phase: 'ready', t: 0.05 }); // they play on
      fly(this.k, u);
    },
  };
  // the last stroke: the smile
  SHOTS.mona_frame = framed('mona', 126, {
    settle: 0.66,
    init(w) {
      w.smile = 0;
    },
    each(i, u, w) {
      w.smile = ease(clamp((u - 0.22) / 0.42));
    },
  });

  // ------------------------------------------------------------------ The Gallery Between
  // (its pictures follow world.done; the shots set that, and the last one puts it back)
  const hall = (done) => {
    for (const p of g.world.pictures) {
      p.world.done = done;
      p.mat.uniforms.uDone.value = done ? 1 : 0;
      p.mat.uniforms.uPulse.value = 0;
      if (p.beam) p.beam.visible = false;
    }
  };
  // five masterpieces, in pencil
  SHOTS.gallery_wall = {
    world: 'gallery',
    frames: 90,
    init() {
      dress({ restored: null });
      hall(false);
      this.k = [
        { p: [0, 4.2, 33], t: [0, 4.4, -18], fov: 44 },
        { p: [0, 4.1, 27], t: [0, 4.4, -18], fov: 44 },
      ];
    },
    each(i, u) {
      fly(this.k, u);
    },
  };
  // she walks up to the first of them, and the camera goes on into it
  SHOTS.gallery_step = {
    world: 'gallery',
    frames: 72,
    warm: 12,
    init(w) {
      dress({ mira: true, restored: null });
      hall(false);
      const { slot: s, mark: m } = w.pictures[0];
      this.at = (d, side = 0, h = 0) => [m.x + s.nx * d + s.nz * side, h, m.z + s.nz * d - s.nx * side];
      this.dir = new THREE.Vector3(-s.nx, 0, -s.nz);
      this.m = m;
      const p = g.player;
      p.trail.visible = false;
      p.place(V(this.at(8.6)), Math.atan2(-s.nx, -s.nz));
      p.frozen = true;
    },
    each(i, u) {
      // carried, like the flight: her walk is the same every take
      const p = g.player,
        a = this.at(8.6 - 4.4 * u),
        m = this.m,
        k = ease(u);
      p.pos.set(a[0], 0, a[2]);
      p.vel.copy(this.dir).multiplyScalar(2.6);
      cam(mix3(this.at(13.5, 1.9, 2.3), this.at(5.6, 0.35, 3.3), k), [m.x, lerp(2.7, 4.0, k), m.z], lerp(46, 40, k));
    },
  };
  // and at the end of the night they come home, one after another
  SHOTS.gallery_home = {
    world: 'gallery',
    frames: 164, // (the title comes up over the end of it)
    init() {
      dress({ restored: null });
      hall(false);
      // back and a little up: the pictures sink below the middle of the frame, where the title comes
      this.k = [
        { p: [0, 4.0, 23], t: [0, 4.5, -18], fov: 46 },
        { p: [0, 4.3, 32], t: [0, 12.5, -18], fov: 44 },
      ];
    },
    each(i, u, w) {
      w.pictures.forEach((p, k) => {
        const v = ease(clamp((u * 2.05 - k * 0.13) / 0.3));
        p.mat.uniforms.uDone.value = v;
        p.world.done = i < this.frames - 1 && v > 0.5;
      });
      fly(this.k, ease(u));
    },
  };

  async function render(name, { preview = 0 } = {}) {
    const s = SHOTS[name];
    if (!s) throw new Error('no shot ' + name);
    if (st.busy) throw new Error('busy with ' + st.busy);
    if (s.world !== g.world.id) {
      // with the whole game loaded (/?debug&film) a shot fetches its own world
      if (!g.worlds?.[s.world]) throw new Error(`${name} needs the ${s.world} world`);
      await g.debug.go(s.world);
      setup(...(st.size ?? []));
    }
    if (!st.size) setup();
    Object.assign(st, { busy: name, done: 0, total: s.frames, error: null });
    try {
      const w = g.world;
      s.init?.(w);
      for (let i = 0; i < (s.warm ?? 30); i++) {
        s.each?.(0, 0, w);
        g.frame(DT);
      }
      const pick = preview ? new Set(Array.from({ length: preview }, (_, k) => Math.round((k * (s.frames - 1)) / Math.max(1, preview - 1)))) : null;
      let n = 0;
      for (let i = 0; i < s.frames; i++) {
        if (st.cancel) throw new Error('cancelled');
        s.each?.(i, s.frames > 1 ? i / (s.frames - 1) : 0, w);
        g.frame(DT);
        if (!pick) await save(`film/${name}/${String(i + 1).padStart(4, '0')}.jpg`);
        else if (pick.has(i)) await save(`prev/${name}_${String(++n).padStart(2, '0')}.jpg`, 0.85);
        st.done = i + 1;
      }
      g.keys.clear();
    } catch (e) {
      st.error = String(e);
      throw e;
    } finally {
      st.busy = null;
    }
    return `${name} ${s.frames}`;
  }
  // several shots, one after the other; poll film.st while it runs
  function queue(names, opt) {
    st.queue = names.slice();
    st.finished = [];
    st.cancel = false;
    st.t0 = performance.now();
    st.running = (async () => {
      for (const n of names) {
        await render(n, opt);
        st.finished.push(n);
      }
      st.queue = null;
      return 'done';
    })().catch((e) => {
      st.error = String(e);
      st.queue = null;
    });
    return 'queued ' + names.length;
  }

  // ------------------------------------------------------------------ title cards and the gilt matte
  const SERIF = '"Cormorant Garamond", Georgia, serif';
  const SANS = 'Jost, "Segoe UI", sans-serif';
  async function fonts() {
    const want = ['italic 500 80px "Cormorant Garamond"', '500 80px "Cormorant Garamond"', '400 20px Jost', '300 20px Jost', '500 20px Jost'];
    await Promise.all(want.map((f) => document.fonts.load(f))).catch(() => {});
    return want.map((f) => document.fonts.check(f));
  }
  const sheet = () => {
    const c = document.createElement('canvas');
    c.width = 1920;
    c.height = 1080;
    return [c, c.getContext('2d')];
  };
  async function savePng(c, name) {
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const res = await fetch(`/__capture?name=film/overlay/${name}.png`, { method: 'POST', body: blob });
    if (!res.ok) throw new Error('save failed ' + res.status);
    return name;
  }
  const CREAM = '#f6efdc';
  function text(x, str, px, py, { font, size, align = 'center', alpha = 1, track = 0, shadow = 0.6, color = CREAM } = {}) {
    x.save();
    x.font = font.replace('$', size + 'px');
    x.textAlign = align;
    x.letterSpacing = track * size + 'px';
    x.globalAlpha = alpha;
    x.fillStyle = color;
    if (shadow) {
      x.shadowColor = `rgba(8, 6, 4, ${shadow})`;
      x.shadowBlur = size * 0.5;
      x.shadowOffsetY = size * 0.04;
      x.fillText(str, px + (align === 'center' ? (track * size) / 2 : 0), py); // once for the halo
    }
    x.fillText(str, px + (align === 'center' ? (track * size) / 2 : 0), py);
    x.restore();
  }

  // the gilt window of the finished picture, exactly as the game draws it in CSS
  async function matte(w = g.world) {
    await fonts();
    const [c, x] = sheet();
    const H = 1080 * 0.8,
      W = Math.min(H * w.aspect, 1920 * 0.92);
    const x0 = Math.round((1920 - W) / 2),
      y0 = (1080 - H) / 2;
    x.fillStyle = 'rgba(16, 13, 11, 0.97)';
    x.fillRect(0, 0, 1920, 1080);
    x.clearRect(x0, y0, W, H);
    // soft shadow falling inward from the frame
    x.save();
    x.beginPath();
    x.rect(x0, y0, W, H);
    x.clip();
    x.shadowColor = 'rgba(0, 0, 0, 0.45)';
    x.shadowBlur = 70;
    x.lineWidth = 60;
    x.strokeStyle = '#000';
    x.strokeRect(x0 - 30, y0 - 30, W + 60, H + 60);
    x.restore();
    const ring = (d, col) => {
      x.fillStyle = col;
      x.beginPath();
      x.rect(x0, y0, W, H);
      x.rect(x0 + d, y0 + d, W - 2 * d, H - 2 * d);
      x.fill('evenodd');
    };
    ring(19, '#7a5a1e');
    ring(15, '#f0d27a');
    ring(12, '#9a7226');
    ring(2, 'rgba(255, 240, 190, 0.9)');
    const sub = `${w.sub} · ${w.kicker.split('·').pop().trim()}`;
    text(x, w.title, 960, 1027, { font: `italic 500 $ ${SERIF}`, size: 40, shadow: 0 });
    text(x, sub.toUpperCase(), 960, 1058, { font: `400 $ ${SANS}`, size: 15, track: 0.3, alpha: 0.75, shadow: 0 });
    await savePng(c, 'matte_' + w.id);
    return { id: w.id, title: w.title, sub, aspect: w.aspect };
  }

  // a place and a year, bottom left, as each world opens
  async function place(id, line, name) {
    await fonts();
    const [c, x] = sheet();
    const gr = x.createLinearGradient(0, 760, 0, 1080);
    gr.addColorStop(0, 'rgba(10, 8, 6, 0)');
    gr.addColorStop(1, 'rgba(10, 8, 6, 0.5)');
    x.fillStyle = gr;
    x.fillRect(0, 760, 1920, 320);
    text(x, line, 96, 968, { font: `italic 500 $ ${SERIF}`, size: 58, align: 'left' });
    text(x, name.toUpperCase(), 99, 1010, { font: `400 $ ${SANS}`, size: 19, align: 'left', track: 0.34, alpha: 0.86 });
    return savePng(c, 'place_' + id);
  }
  async function line(id, str, { y = 952, size = 60 } = {}) {
    await fonts();
    const [c, x] = sheet();
    const gr = x.createLinearGradient(0, 720, 0, 1080);
    gr.addColorStop(0, 'rgba(10, 8, 6, 0)');
    gr.addColorStop(1, 'rgba(10, 8, 6, 0.55)');
    x.fillStyle = gr;
    x.fillRect(0, 720, 1920, 360);
    text(x, str, 960, y, { font: `italic 500 $ ${SERIF}`, size });
    return savePng(c, 'line_' + id);
  }
  async function titleCard() {
    await fonts();
    const [c, x] = sheet();
    const gr = x.createRadialGradient(960, 520, 80, 960, 520, 900);
    gr.addColorStop(0, 'rgba(10, 8, 6, 0.42)');
    gr.addColorStop(1, 'rgba(10, 8, 6, 0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 1920, 1080);
    text(x, 'Into the Painting', 960, 548, { font: `italic 500 $ ${SERIF}`, size: 176, shadow: 0.7 });
    text(x, 'Walk into five masterpieces'.toUpperCase(), 960, 628, { font: `400 $ ${SANS}`, size: 25, track: 0.42, alpha: 0.92 });
    text(x, 'Play it in your browser  ·  into-the-painting.vercel.app'.toUpperCase(), 960, 968, { font: `400 $ ${SANS}`, size: 17, track: 0.3, alpha: 0.78 });
    return savePng(c, 'title');
  }
  async function cards() {
    const ok = await fonts();
    const made = [
      await line('one', 'One night. Five masterpieces without their colour.'),
      await line('two', 'Step inside, and bring it home.'),
      await line('three', 'Every painting hides a puzzle of its own.'),
      await place('starry', 'Saint-Rémy, 1889', 'Vincent van Gogh'),
      await place('wave', 'Off Kanagawa, c. 1831', 'Katsushika Hokusai'),
      await place('pearl', 'Delft, c. 1665', 'Johannes Vermeer'),
      await place('scream', 'Kristiania, 1893', 'Edvard Munch'),
      await place('mona', 'Florence, c. 1503', 'Leonardo da Vinci'),
      await titleCard(),
    ];
    return { fonts: ok, made };
  }

  // ------------------------------------------------------------------ the score
  async function score(cues, duration, marks = []) {
    const buf = await renderScore(cues, duration, marks);
    const res = await fetch('/__capture?name=film/score.wav', { method: 'POST', body: wavBlob(buf) });
    if (!res.ok) throw new Error('save failed ' + res.status);
    // numbers to sanity-check the mix without ears
    const d = buf.getChannelData(0);
    let peak = 0,
      sum = 0;
    for (let i = 0; i < d.length; i++) {
      const v = Math.abs(d[i]);
      if (v > peak) peak = v;
      sum += v * v;
    }
    return { seconds: buf.duration, peak: +peak.toFixed(3), rms: +Math.sqrt(sum / d.length).toFixed(4) };
  }

  // The whole film, from /?debug&film: the cards, the gilt frames, the score, and then every
  // shot in the cut, queued (watch film.st). all({ shots: false }) leaves the frames alone.
  async function all({ shots = true } = {}) {
    const cut = await (await fetch('/tools/film/cut.json')).json();
    setup(...cut.size);
    const made = await cards();
    for (const id of g.order) await matte(g.worlds[id]);
    const music = cut.music ? await score(cut.music.cues, cut.music.seconds, cut.music.marks) : null;
    const names = [...new Set(cut.clips.map((c) => c.shot).filter(Boolean))];
    return { cards: made.made.length, music, shots: shots ? queue(names) : names };
  }

  const film = { st, setup, dress, cam, rel, still, stills, render, queue, all, SHOTS, matte, cards, score, fly, along, V, gy, ease, out, mix3 };
  window.film = film;
  return film;
}
