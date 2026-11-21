// Dev only: the asset lab.
//
// One asset (or a small scene of them) on a patch of lamplit cobbles under a night sky, so
// it can be built and judged in seconds without loading a whole world.
//
//   npm run dev, then open   /?debug&lab=worlds/starry/town/house.js
//
// The module named in ?lab= must export  lab(world)  (or the export named by &fn=).
// It adds whatever it wants to show to world.scene (and world.colliders / glows / maps),
// and may return { focus: [x, y, z], dist, views: [{ yaw, pitch, dist, fov, focus }] }.
//
//   lab.view(yaw, pitch, dist)       look at the focus from an angle (degrees)
//   await lab.sheet('name')          four views in one image -> ./capture/lab/name.jpg
//   await lab.shot('name', view)     one view, full frame   -> ./capture/lab/name.jpg
//   lab.grey(0..1)                   0 = the pencil sketch, 1 = fully painted
import * as THREE from 'three';
import { World } from '../engine/world.js';
import { Sky } from '../engine/sky.js';
import { paintMaterial, GroundMaps, glowPoints } from '../engine/paint.js';
import { terrain, patch, mix, Builder } from '../engine/build.js';
import { vnoise } from '../engine/gl.js';

const D2R = Math.PI / 180;
const dirOf = (az, el) => new THREE.Vector3(Math.sin(az * D2R) * Math.cos(el * D2R), Math.sin(el * D2R), -Math.cos(az * D2R) * Math.cos(el * D2R));

// the light a world's assets will stand in; add a look when a world needs its own
const LOOKS = {
  starry: {
    env: { sunDir: dirOf(25, 34), sunColor: 0x66739e, skyColor: 0x7482bd, groundColor: 0x3d4272, fogColor: 0x2c4f9a, fog: [0.0021, 4, 0.03, 0.8], paper: 0xeee7d3, ink: 0x3d3f4f, rim: 0xffe27a, lamp: 1.1, lampFall: 0.24, sway: 0.3 },
    style: { kuwahara: 1.5, bloom: 0.55, threshold: 1.0, outline: 0.22, ink: 0x1a1d33, grain: 0.085, saturation: 1.16, contrast: 1.07, vignette: 0.6 },
    sky: /* glsl */ `
      vec3 skyColor(vec3 d){
        float h = clamp(d.y, -0.2, 1.0);
        vec3 c = mix(vec3(0.16, 0.30, 0.62), vec3(0.05, 0.11, 0.38), smoothstep(-0.05, 0.75, h));
        float n = texture(uNoise3, d * 1.6 + vec3(0.0, uTime * 0.004, 0.0)).r;
        float m = texture(uNoise3, d * 5.0 + 3.1).g;
        c += (n - 0.5) * 0.22 * vec3(0.6, 0.8, 1.0) + (m - 0.5) * 0.08;
        return mix(uPaper * 0.97, c, uSkyRestore);
      }`,
    ground: (x, z) => mix(0x1f5a4a, 0x235f72, vnoise(x * 0.05, z * 0.05)),
    cobble: (x, z) => mix(0x6c5fa6, 0xa57cb6, vnoise(x * 0.35, z * 0.35)).lerp(new THREE.Color(0x4a5cae), vnoise(x * 0.11 + 7, z * 0.11) * 0.5),
  },
  // the Great Wave: daylight on paper, flat colour, strong outlines   (&look=wave)
  wave: {
    env: { sunDir: new THREE.Vector3(0.45, 0.7, 0.5), sunColor: 0x4a4a48, skyColor: 0xc9c6bc, groundColor: 0x9a968c, fogColor: 0x7a858c, fog: [0.001, 0, 0.0, 0.5], paper: 0xf0e7d0, ink: 0x35405a, rim: 0x6fb0e0, lamp: 0.9, sway: 0.15 },
    style: { kuwahara: 0.6, outline: 0.92, sketchLine: 0.1, ink: 0x14244a, bloom: 0.25, threshold: 1.1, grain: 0.03, paper: 0.13, saturation: 1.02, contrast: 1.04, vignette: 0.32, tint: [1.0, 0.985, 0.95] },
    sky: /* glsl */ `
      vec3 skyColor(vec3 d){
        float h = clamp(d.y, -0.2, 1.0);
        vec3 c = mix(vec3(0.93, 0.89, 0.78), vec3(0.60, 0.69, 0.76), smoothstep(0.05, 0.9, h));
        return mix(uPaper * 0.97, c, uSkyRestore);
      }`,
    ground: (x, z) => mix(0x8faa7a, 0xa8b888, vnoise(x * 0.05, z * 0.05)),
    cobble: (x, z) => mix(0xd8cba8, 0xc9bb94, vnoise(x * 0.3, z * 0.3)),
    groundMat: (strokes) => paintMaterial({ stroke: strokes.wood, scale: 0.05, contrast: 0.14, hueVar: 0.1, warp: 0.05, flat: 0.72, rim: 0, band: 0.08, impasto: 0, big: 0 }),
  },
  // Delft: low gold afternoon light, thin glazes, an old master's surface   (&look=pearl)
  pearl: {
    env: { sunDir: new THREE.Vector3(-0.72, 0.36, 0.3).normalize(), sunColor: 0xd9a868, skyColor: 0x8f96a8, groundColor: 0x5c4e42, fogColor: 0xe9cfa6, fog: [0.0042, 0, 0.02, 0.8], paper: 0xf1e8d4, ink: 0x45403a, rim: 0xffe9a0, lamp: 1.2, sway: 0.18 },
    style: { kuwahara: 2.1, bloom: 0.42, threshold: 1.02, soft: 0.1, grain: 0.07, crackle: 0.07, saturation: 1.08, contrast: 1.08, vignette: 0.75, tint: [1.03, 1.0, 0.93], outline: 0.1, ink: 0x2a2018 },
    sky: /* glsl */ `
      vec3 skyColor(vec3 d){
        float h = clamp(d.y, 0.0, 1.0);
        vec3 c = mix(vec3(0.98, 0.84, 0.62), vec3(0.36, 0.52, 0.74), pow(smoothstep(0.0, 0.75, h), 0.7));
        float n = texture(uNoise3, d * 1.4 + vec3(uTime * 0.004, 0.0, 0.0)).r;
        c = mix(c, vec3(1.0, 0.93, 0.80), smoothstep(0.5, 0.66, n) * smoothstep(0.02, 0.2, h) * 0.8);
        return mix(uPaper * 0.97, c, uSkyRestore);
      }`,
    ground: (x, z) => mix(0x7f9a4a, 0xb0b458, vnoise(x * 0.02, z * 0.04)),
    cobble: (x, z) => mix(0xa89878, 0xc9b592, vnoise(x * 0.3, z * 0.3)),
    groundMat: (strokes) => paintMaterial({ stroke: strokes.cobble, scale: 0.26, contrast: 0.42, hueVar: 0.22, warp: 0, impasto: 0.08, rim: 0.04, band: 0.26, big: 0.3 }),
  },
  // The Scream: dusk under a red sky, long swaying strokes, everything a little unsteady   (&look=scream)
  scream: {
    env: { sunDir: new THREE.Vector3(-0.72, 0.3, -0.5), sunColor: 0xa8663a, skyColor: 0x70749a, groundColor: 0x2a2c4c, fogColor: 0x3a3f72, fog: [0.0018, 0, 0.01, 0.62], paper: 0xeee4cf, ink: 0x3a3440, rim: 0xffb060, lamp: 1.3, wobble: 0.1, sway: 0.4 },
    style: { kuwahara: 2.3, bloom: 0.32, threshold: 1.08, grain: 0.09, saturation: 1.16, contrast: 1.1, vignette: 0.8, warp: 0.4, outline: 0.34, ink: 0x161430 },
    sky: /* glsl */ `
      vec3 skyColor(vec3 d){
        float h = clamp(d.y, 0.0, 1.0);
        float n = texture(uNoise3, vec3(d.x * 0.9, d.y * 5.0 + uTime * 0.01, d.z * 0.9)).r;
        vec3 c = mix(vec3(0.95, 0.55, 0.12), vec3(0.85, 0.2, 0.08), smoothstep(0.35, 0.7, n));
        c = mix(c, vec3(0.2, 0.25, 0.5), smoothstep(0.35, 0.8, h + (n - 0.5) * 0.3));
        return mix(uPaper * 0.97, c, uSkyRestore);
      }`,
    ground: (x, z) => mix(0x1a2c52, 0x2c4a5a, vnoise(x * 0.03, z * 0.03)),
    cobble: (x, z) => mix(0x6a5a4a, 0x9a846a, vnoise(x * 0.3, z * 0.3)),
  },
};

export async function runLab(game, ui, path, params) {
  const mod = await import(/* @vite-ignore */ '/src/' + path.replace(/^\/+/, ''));
  const fn = mod[params.get('fn') || 'lab'];
  if (typeof fn !== 'function') throw new Error(`${path} has no export "${params.get('fn') || 'lab'}"`);
  const look = LOOKS[params.get('look') || 'starry'];
  let info = {};

  class LabWorld extends World {
    constructor(ctx) {
      super(ctx);
      this.id = 'lab';
      this.title = 'Asset lab';
      this.sub = path;
      this.kicker = 'lab';
      this.aspect = 16 / 9;
      this.extent = 140;
      this.boundary = 130;
      this.ceiling = 90;
      this.env = look.env;
      this.style = look.style;
      this.spawn = { pos: [0, 16], yaw: Math.PI };
      this.view = { pos: [0, 6, 22], target: [0, 4, 0], fov: 55 };
      this.music = 'starry';
      const { strokes, noise3 } = ctx;
      const H = () => 0;
      this.maps = new GroundMaps(this.extent, H, 1024);
      this.sky = new Sky({ body: look.sky, noise3 });
      this.scene.add(this.sky.mesh);
      const ground = new THREE.Mesh(
        terrain(H, 300, 60, (x, z) => look.ground(x, z)),
        look.groundMat ? look.groundMat(strokes) : paintMaterial({ stroke: strokes.oil, scale: 0.052, contrast: 0.55, hueVar: 0.75, warp: 0.85, accent: 0xb9c95a, accentAmt: 0.3, impasto: 0.1, rim: 0.05, band: 0.3 })
      );
      this.scene.add(ground);
      if (!params.has('bare')) {
        const cb = new Builder();
        cb.parts.push(patch(0, 0, 46, H, (x, y, z) => look.cobble(x, z), { lift: 0.04, wobble: 0.03 }));
        this.scene.add(cb.mesh(look.groundMat ? look.groundMat(strokes) : paintMaterial({ stroke: strokes.dab, scale: 0.2, contrast: 0.62, hueVar: 0.9, warp: 0.1, accent: 0xf0b6c8, accentAmt: 0.35, impasto: 0.14, rim: 0.05, band: 0.3 })));
      }
      info = fn(this, { params }) || {};
      if (this.glows.length) this.scene.add(glowPoints(this.glows, 1));
      this.maps.finish();
    }
    heightAt() {
      return 0;
    }
    tick(dt, time, player, g) {
      info.tick?.(dt, time, g);
    }
  }

  await game.init([{ id: 'lab', cls: LabWorld, label: 'Setting up the lab…' }], (p, t) => ui.loading(p, t));
  game.run();
  ui.hideLoading();
  await game.debug.go('lab');
  game.debug.restore(params.has('grey') ? 0 : 1);

  const g = game;
  const w = g.world;
  const p = g.player;
  p.root.visible = p.trail.visible = p.shadow.visible = false;
  p.cinematic = true;
  p.frozen = true;
  p.pos.set(0, 0, 120);
  document.getElementById('hud').style.display = 'none';
  g.mode = 'lab';

  const focus0 = info.focus ?? [0, 4, 0];
  const dist0 = info.dist ?? 26;
  const st = { yaw: 30, pitch: 14, dist: dist0, fov: 50, focus: focus0 };
  function view(yaw = st.yaw, pitch = st.pitch, dist = st.dist, fov = st.fov, focus = st.focus) {
    Object.assign(st, { yaw, pitch, dist, fov, focus });
    const d = dirOf(yaw, pitch); // yaw 0 looks north from the south side; positive yaw swings the camera to the west
    g.setCamera({ pos: new THREE.Vector3(focus[0] - d.x * dist, Math.max(0.4, focus[1] + d.y * dist), focus[2] - d.z * dist), target: new THREE.Vector3(...focus), fov });
    return st;
  }
  const size = (W, H) => {
    g.renderer.setPixelRatio(1);
    g.renderer.setSize(W, H, false);
    g.pipeline.setSize(W, H);
    g.rw = W;
    g.rh = H;
    g.camera.aspect = W / H;
    g.camera.updateProjectionMatrix();
  };
  async function post(canvas, name, q = 0.9) {
    const bin = atob(canvas.toDataURL('image/jpeg', q).split(',')[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const res = await fetch(`/__capture?name=lab/${name}.jpg`, { method: 'POST', body: bytes });
    if (!res.ok) throw new Error('save failed ' + res.status);
    return `capture/lab/${name}.jpg`;
  }
  const steps = (n = 3) => {
    for (let i = 0; i < n; i++) g.frame(1 / 30);
  };
  // the standard four: three-quarter, street level, the other side, from above
  const VIEWS = info.views ?? [
    { yaw: 28, pitch: 12, dist: dist0 },
    { yaw: -14, pitch: 3, dist: dist0 * 0.5 },
    { yaw: 150, pitch: 10, dist: dist0 },
    { yaw: 40, pitch: 52, dist: dist0 * 1.25 },
  ];
  async function sheet(name, views = VIEWS) {
    g.paused = true;
    size(960, 540);
    const c = document.createElement('canvas');
    c.width = 1920;
    c.height = 1080;
    const x = c.getContext('2d');
    for (let i = 0; i < Math.min(4, views.length); i++) {
      const v = views[i];
      view(v.yaw, v.pitch, v.dist ?? dist0, v.fov ?? 50, v.focus ?? focus0);
      steps(3);
      x.drawImage(g.canvas, (i % 2) * 960, Math.floor(i / 2) * 540);
    }
    return post(c, name);
  }
  async function shot(name, v = {}) {
    g.paused = true;
    size(1600, 900);
    view(v.yaw ?? st.yaw, v.pitch ?? st.pitch, v.dist ?? st.dist, v.fov ?? st.fov, v.focus ?? st.focus);
    steps(3);
    return post(g.canvas, name);
  }
  const grey = (v) => {
    w.setRestored(v);
    steps(2);
  };
  view();
  window.lab = { view, sheet, shot, grey, steps, info, st, world: w, game: g };
}
