import * as THREE from 'three';
import { Pipeline } from './engine/post.js';
import { G, initPaintGlobals } from './engine/paint.js';
import { strokeSet } from './engine/strokes.js';
import { noise3D, clamp, ease, lerp } from './engine/gl.js';
import { Player } from './engine/player.js';
import { wait } from './engine/ui.js';

const CURATOR = 'The Curator';

export class Game {
  constructor(canvas, ui, audio) {
    this.canvas = canvas;
    this.ui = ui;
    this.audio = audio;
    THREE.ColorManagement.enabled = false;
    const renderer = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false, preserveDrawingBuffer: new URLSearchParams(location.search).has('debug') }));
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setPixelRatio(1);
    renderer.autoClear = true;
    renderer.setClearColor(0x0b0d18, 1);
    this.camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.3, 1700);
    this.scale = 1;
    this.time = 0;
    this.mode = 'boot';
    this.input = { mx: 0, mz: 0, fly: false, run: false, lookX: 0, lookY: 0 };
    this.keys = new Set();
    this.worlds = {};
    this.order = [];
    this.world = null;
    this.camTween = null;
    this.drift = null;
    this.stuck = 0;
    this._ft = 16;
    this._ftT = 0;
    this._v = new THREE.Vector3();
    this.noAdapt = new URLSearchParams(location.search).has('debug');
  }

  async init(defs, onProgress, opts = {}) {
    initPaintGlobals();
    const strokes = strokeSet(this.renderer);
    const noise3 = noise3D(64, 9);
    this.ctx = { renderer: this.renderer, strokes, noise3 };
    this.pipeline = new Pipeline(this.renderer, 16, 16);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.player = new Player(strokes.dab);

    const total = defs.length;
    for (let i = 0; i < total; i++) {
      const d = defs[i];
      onProgress(i / total, d.label);
      await wait(30);
      const w = new d.cls(this.ctx);
      if (w.ready) await w.ready.catch((e) => console.warn('model load failed', e));
      this.worlds[w.id] = w;
      if (w.id !== 'gallery') this.order.push(w.id);
    }
    onProgress(0.96, 'Varnishing…');
    await wait(30);
    // warm every shader + bake the pictures that hang in the gallery
    this.gallery = this.worlds.gallery ?? null;
    if (opts.thumbnails !== false) await this.makeThumbnails();
    onProgress(1, 'Ready');
    this.bindInput();
    window.__game = this;
  }

  // ---------------------------------------------------------------- sizing
  resize() {
    const w = window.innerWidth,
      h = window.innerHeight;
    // never render more than a 1080p-class frame; the paint filter is per pixel
    this.maxScale = Math.min(1, 1920 / Math.max(1, w), 1080 / Math.max(1, h)) * 1;
    this.scale = Math.min(this.scale ?? 1, this.maxScale);
    const rw = Math.max(16, Math.round(w * this.scale)),
      rh = Math.max(16, Math.round(h * this.scale));
    this.renderer.setSize(rw, rh, false);
    this.pipeline.setSize(rw, rh);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.rw = rw;
    this.rh = rh;
  }
  adaptQuality(dtMs) {
    this._ft = lerp(this._ft, Math.min(dtMs, 80), 0.08);
    this._ftT += dtMs;
    if (this._ftT < 1400) return;
    this._ftT = 0;
    const before = this.scale;
    if (this._ft > 24 && this.scale > 0.5) this.scale = Math.max(0.5, this.scale * 0.86);
    else if (this._ft < 12.5 && this.scale < this.maxScale) this.scale = Math.min(this.maxScale, this.scale * 1.1);
    if (before !== this.scale) this.resize();
  }

  // ---------------------------------------------------------------- input
  bindInput() {
    const c = this.canvas;
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'Space') e.preventDefault();
      if (e.code === 'KeyM') this.audio.toggleMute();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    c.addEventListener('click', () => {
      // (where the browser will not hand over the pointer, an embedded preview for one, dragging still looks about)
      if (this.mode === 'play' && document.pointerLockElement !== c) c.requestPointerLock?.()?.catch?.(() => {});
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === c;
      this.ui.resume(!this.locked && this.mode === 'play' && this.everLocked);
      if (this.locked) this.everLocked = true;
    });
    let drag = false;
    c.addEventListener('mousedown', () => (drag = true));
    window.addEventListener('mouseup', () => (drag = false));
    window.addEventListener('mousemove', (e) => {
      if (this.locked || drag) {
        this.input.lookX += e.movementX;
        this.input.lookY += e.movementY;
      }
    });
  }
  readKeys() {
    const k = this.keys,
      i = this.input;
    i.mx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    i.mz = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    i.fly = k.has('Space');
    i.run = k.has('ShiftLeft') || k.has('ShiftRight');
  }

  // ---------------------------------------------------------------- camera helpers
  // frac < 1: the picture only fills that fraction of the screen height (the framed finale)
  viewPose(world, frac = 1) {
    const v = world.view;
    const fov = frac === 1 ? v.fov : (2 * Math.atan(Math.tan((v.fov * Math.PI) / 360) / frac) * 180) / Math.PI;
    return { pos: new THREE.Vector3(...v.pos), target: new THREE.Vector3(...v.target), fov };
  }
  setCamera(pose) {
    this.camera.position.copy(pose.pos);
    this.camera.lookAt(pose.target);
    this.camera.fov = pose.fov;
    this.camera.updateProjectionMatrix();
  }
  tweenCamera(pose, dur) {
    const cam = this.camera;
    const from = { pos: cam.position.clone(), quat: cam.quaternion.clone(), fov: cam.fov };
    const toQuat = pose.quat ?? new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(pose.pos, pose.target, cam.up));
    return new Promise((res) => {
      this.camTween = { from, to: { pos: pose.pos.clone(), quat: toQuat, fov: pose.fov }, t: 0, dur, res };
    });
  }
  followPose() {
    const cam = this.camera;
    const keep = { p: cam.position.clone(), q: cam.quaternion.clone(), f: cam.fov };
    this.player.resetCamera(this.world, cam);
    const pose = { pos: cam.position.clone(), quat: cam.quaternion.clone(), fov: 58, target: null };
    cam.position.copy(keep.p);
    cam.quaternion.copy(keep.q);
    cam.fov = keep.f;
    cam.updateProjectionMatrix();
    this.player.cinematic = true;
    return pose;
  }

  // ---------------------------------------------------------------- world switching
  setWorld(w) {
    this.world = w;
    w.activate(this.pipeline);
    this.player.addTo(w.scene);
    this.audio.setWorld(w.music ?? w.id);
  }

  async showTitle() {
    const w = this.worlds[this.order[0]];
    w.setRestored(1);
    this.setWorld(w);
    this.player.root.visible = this.player.trail.visible = this.player.shadow.visible = false;
    const pose = this.viewPose(w);
    this.setCamera(pose);
    this.drift = { pose, amp: 1.6 };
    this.player.cinematic = true;
    this.mode = 'title';
    this.ui.showTitle(true);
  }

  async begin() {
    this.audio.start();
    this.audio.setWorld('gallery');
    this.ui.showTitle(false);
    this.audio.thunder();
    this.pipeline.flash = 1;
    await this.ui.fade(1, 700, '#ffffff');
    this.pipeline.flash = 0;
    const first = this.worlds[this.order[0]];
    first.setRestored(0);
    this.player.root.visible = this.player.trail.visible = this.player.shadow.visible = true;
    this.ui.showHud(true);
    if (this.gallery) await this.enterGallery(null, true);
    else await this.enterWorld(first.id);
  }

  async enterWorld(id) {
    const w = this.worlds[id];
    this.mode = 'cinema';
    this.ui.clearCaptions();
    this.ui.cinema(true);
    this.ui.prompt('');
    await this.ui.fade(1, 800, '#f3ead6');
    this.setWorld(w);
    w.onEnter?.();
    const [sx, sz] = w.spawn.pos;
    this.player.place(new THREE.Vector3(sx, w.groundAt(sx, sz, 999), sz), w.spawn.yaw);
    this.player.setPigment(w.wisps.filter((x) => x.found).pop()?.def.color ?? 0xfff2c0);
    this.player.frozen = true;
    this.player.cinematic = true;
    this.ui.chapter(w.title, w.wispDefs.map((d) => '#' + new THREE.Color(d.color).getHexString()), '');
    w.wisps.forEach((x, i) => x.found && this.ui.dot(i));
    this.audio.setOpen(w.done ? 1 : 0.12 + (w.found / w.wisps.length) * 0.6);
    this.stuck = 0;

    const pose = this.viewPose(w);
    this.setCamera(pose);
    this.drift = { pose, amp: 0.8 };
    await this.ui.fade(0, 1400);
    if (!w.visited) {
      w.visited = true;
      await this.ui.card(w.kicker, w.title, w.sub, 3400);
    } else await wait(600);
    this.drift = null;
    await this.tweenCamera(this.followPose(), 3.2);
    this.player.resetCamera(w, this.camera);
    this.player.frozen = false;
    this.ui.cinema(false);
    this.mode = 'play';
    this.refreshObjective();
    if (w.stage === 'wisps' && w.found === 0) this.ui.say(CURATOR, w.hints.start);
    this.ui.keysDim(false);
    clearTimeout(this._keysT);
    this._keysT = setTimeout(() => this.ui.keysDim(true), 14000);
  }

  async enterGallery(fromId, first = false) {
    const g = this.gallery;
    this.mode = 'cinema';
    this.ui.clearCaptions();
    this.ui.prompt('');
    if (!first) await this.ui.fade(1, 800, '#f3ead6');
    this.setWorld(g);
    g.arrive(this, fromId);
    this.audio.setOpen(0.35 + 0.65 * (this.doneCount() / this.order.length));
    this.ui.chapter('The Gallery Between', [], '');
    this.ui.cinema(false);
    this.player.frozen = false;
    this.player.resetCamera(g, this.camera);
    await this.ui.fade(0, 1400);
    this.mode = 'play';
    g.welcome(this, fromId, first);
  }

  doneCount() {
    return this.order.filter((id) => this.worlds[id].done).length;
  }

  async ending() {
    this.mode = 'cinema';
    this.ui.clearCaptions();
    this.audio.finale();
    await this.ui.fade(1, 2600, '#fff4d6');
    this.ui.showHud(false);
    this.ui.showEnding(true);
    document.exitPointerLock?.();
    await this.ui.fade(0, 1600, '#fff4d6');
    this.mode = 'ending';
  }

  // ---------------------------------------------------------------- the loop of a painting
  refreshObjective() {
    const w = this.world;
    if (!w || w === this.gallery) return;
    const left = w.wisps.length - w.found;
    const text =
      w.stage === 'wisps'
        ? `Find the lost colours · ${left} left`
        : w.stage === 'memento'
        ? `Find ${w.memento.name}`
        : w.stage === 'echo'
        ? `Bring it to ${w.echo.name}`
        : w.stage === 'task'
        ? w.task.text(w)
        : w.stage === 'free'
        ? 'Painting restored · step through the golden frame'
        : '';
    this.ui.objective(text);
  }

  story(dt) {
    const w = this.world;
    const p = this.player.pos;
    const reach = 3.2 + this.player.fly * 3.5;
    this.stuck += dt;
    const markers = [];
    const mark = (pos, color) => markers.push({ pos, color, dist: pos.distanceTo(p) });

    if (w.stage === 'wisps') {
      w.wisps.forEach((wp, i) => {
        if (wp.found) return;
        mark(wp.pos, '#' + wp.color.getHexString());
        if (wp.pos.distanceTo(this._v.copy(p).setY(p.y + 1)) < reach) this.collect(wp, i);
      });
    } else if (w.stage === 'memento') {
      const mp = w.mementoGroup.position;
      mark(mp, '#fff0b8');
      if (mp.distanceTo(this._v.copy(p).setY(p.y + 1)) < reach + 1) this.pickMemento();
    } else if (w.stage === 'echo') {
      const ep = w.echoGroup.position;
      mark(new THREE.Vector3(ep.x, ep.y + 2, ep.z), '#ffe2a0');
      if (Math.hypot(ep.x - p.x, ep.z - p.z) < 5.5 && Math.abs(ep.y - p.y) < 6) {
        if (w.task && !w.task.done) this.startTask();
        else this.finale();
      }
    } else if (w.stage === 'task') {
      // the one thing this picture still needs: every world has its own (world.task)
      if (w.task.update(dt, this, mark)) {
        w.task.done = true;
        this.finale();
      }
    } else if (w.stage === 'free') {
      const pp = w.portal.position;
      mark(new THREE.Vector3(pp.x, pp.y + 2.4, pp.z), '#ffd76a');
      if (Math.hypot(pp.x - p.x, pp.z - p.z) < 2.3 && Math.abs(pp.y - p.y) < 5) {
        this.enterGallery(w.id);
        return;
      }
    }
    // the artist says hello the first time you wander close
    if (w.echoTalked === 0 && w.stage !== 'finale' && w.stage !== 'free') {
      const ep = w.echoGroup.position;
      if (Math.hypot(ep.x - p.x, ep.z - p.z) < 10 && w.stage !== 'echo') {
        w.echoTalked = 1;
        for (const line of w.echo.greet) this.ui.say(w.echo.name, line);
      }
    }
    // a nudge when nothing has happened for a while
    if (this.stuck > 75) {
      this.stuck = 20;
      const next = w.wisps.find((x) => !x.found);
      const hint = w.stage === 'wisps' ? (next?.def.high ? w.hints.high : 'Follow the coloured lights at the edge of your view.') : w.hints[w.stage];
      if (hint) this.ui.say(CURATOR, typeof hint === 'function' ? hint(w) : hint);
    }
    this.ui.setMarkers(markers, this.camera, window.innerWidth, window.innerHeight);
  }

  collect(wp, i) {
    const w = this.world;
    wp.found = true;
    w.found++;
    this.stuck = 0;
    w.bloom(wp.pos, wp.def.radius ?? 95);
    w.skyTarget = (w.found / w.wisps.length) * 0.82;
    w.onCollect?.(wp, i, this);
    this.player.setPigment(wp.def.color);
    this.audio.chime(i);
    this.audio.setOpen(0.12 + (w.found / w.wisps.length) * 0.6);
    this.ui.dot(i);
    this.ui.fact(wp.def.name, wp.def.fact);
    if (w.found === w.wisps.length) {
      w.stage = 'memento';
      w.mementoGroup.visible = true;
      this.ui.say(CURATOR, w.hints.memento);
    } else if (w.found === 1) {
      this.ui.say(CURATOR, 'Colour remembers where it belongs. Find the rest.');
    } else {
      const next = w.wisps.find((x) => !x.found);
      if (next?.def.high && w.found === w.wisps.length - 1) this.ui.say(CURATOR, w.hints.high);
    }
    this.refreshObjective();
  }

  pickMemento() {
    const w = this.world;
    w.stage = 'echo';
    this.stuck = 0;
    w.mementoGroup.visible = false;
    w.echoGroup.userData.beam.visible = true;
    this.audio.chime(3);
    this.ui.fact(w.memento.name, w.memento.text);
    this.ui.say(CURATOR, w.hints.echo);
    this.refreshObjective();
  }

  // The artist has what was lost, and asks for the one thing the picture still needs.
  // A world's task is { ask: [lines], text(world) -> the objective, start(game),
  // update(dt, game, mark) -> true when it is done }; mark(position, colour) puts a
  // marker at the edge of the view.
  startTask() {
    const w = this.world;
    w.stage = 'task';
    this.stuck = 0;
    w.echoGroup.userData.beam.visible = false;
    this.audio.chime(4);
    for (const line of w.task.ask) this.ui.say(w.echo.name, line);
    w.task.start?.(this);
    this.refreshObjective();
  }

  async finale() {
    const w = this.world;
    w.stage = 'finale';
    this.mode = 'cinema';
    this.ui.clearCaptions();
    this.ui.cinema(true);
    this.ui.setMarkers([], this.camera, 1, 1);
    this.player.frozen = true;
    this.player.cinematic = true;
    w.echoGroup.userData.beam.visible = false;
    for (const line of w.echo.thanks) this.ui.say(w.echo.name, line);
    await wait(1200);
    this.audio.finale();
    this.audio.setOpen(1);
    w.skyTarget = 1;
    w.onFinale?.(this);
    // The camera travels to where the painter stood, a little behind and above, then
    // pushes slowly in until the world sits exactly as it does in the original, inside
    // a gilt frame of the painting's own proportions.
    const pose = this.viewPose(w, 0.8);
    const back = new THREE.Vector3().subVectors(pose.pos, pose.target).setLength(w.pullBack ?? 6);
    const wide = { pos: pose.pos.clone().add(back).add(new THREE.Vector3(0, w.pullUp ?? 1.4, 0)), target: pose.target, fov: pose.fov + 5 };
    await this.tweenCamera(wide, 5.0);
    this.ui.matte(true, w.aspect, w.title, `${w.sub} · ${w.kicker.split('·').pop().trim()}`);
    await this.tweenCamera(pose, 5.0);
    this.drift = { pose, amp: 0.12 };
    await this.ui.queue;
    await this.ui.say(CURATOR, w.finalLine, 4200);
    this.ui.fact(w.title, w.finalFact, 9000);
    await wait(3800);
    this.ui.matte(false);
    await wait(1200);
    this.drift = null;
    w.done = true;
    w.stage = 'free';
    w.portal.visible = true;
    this.gallery?.onRestored?.(w, this);
    await this.tweenCamera(this.followPose(), 3.4);
    this.player.resetCamera(w, this.camera);
    this.player.frozen = false;
    this.ui.cinema(false);
    this.mode = 'play';
    this.refreshObjective();
    this.ui.say(CURATOR, 'It is whole again. Wander as long as you like. The golden frame will take you back.');
  }

  // ---------------------------------------------------------------- pictures for the gallery wall
  async makeThumbnails() {
    const H = 640;
    const cam = new THREE.PerspectiveCamera(50, 1, 0.3, 1700);
    for (const id of this.order) {
      const w = this.worlds[id];
      const W = Math.round(H * w.aspect);
      const pipe = new Pipeline(this.renderer, W, H);
      const mk = () => {
        const t = new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
        return t;
      };
      w.thumbGrey = mk();
      w.thumbColor = mk();
      const v = this.viewPose(w);
      cam.aspect = w.aspect;
      cam.fov = v.fov;
      cam.position.copy(v.pos);
      cam.lookAt(v.target);
      cam.updateProjectionMatrix();
      G.uPixel.value = H / (2 * Math.tan((cam.fov * Math.PI) / 360));
      G.uTime.value = 12;
      w.activate(pipe);
      w.thumbMode = true;
      for (const [val, target] of [
        [1, w.thumbColor],
        [0, w.thumbGrey],
      ]) {
        w.setRestored(val);
        w.wisps.forEach((x) => (x.group.visible = false));
        w.syncUniforms();
        pipe.render(w.scene, cam, target);
      }
      w.wisps.forEach((x) => (x.group.visible = true));
      w.thumbMode = false;
      w.setRestored(0);
      pipe.dispose();
      await wait(20);
    }
    this.gallery?.hang?.(this.order.map((id) => this.worlds[id]));
  }

  // ---------------------------------------------------------------- frame
  frame(dt) {
    dt = Math.min(dt, 0.05);
    this.time += dt;
    G.uTime.value = this.time;
    const w = this.world;
    if (!w) return;
    this.readKeys();
    const cam = this.camera;

    if (this.camTween) {
      const tw = this.camTween;
      tw.t = Math.min(1, tw.t + dt / tw.dur);
      const k = ease(tw.t);
      cam.position.lerpVectors(tw.from.pos, tw.to.pos, k);
      cam.quaternion.slerpQuaternions(tw.from.quat, tw.to.quat, k);
      cam.fov = lerp(tw.from.fov, tw.to.fov, k);
      cam.updateProjectionMatrix();
      if (tw.t >= 1) {
        this.camTween = null;
        tw.res();
      }
    } else if (this.drift) {
      const d = this.drift;
      const t = this.time;
      cam.position.set(d.pose.pos.x + Math.sin(t * 0.13) * d.amp, d.pose.pos.y + Math.sin(t * 0.17 + 1) * d.amp * 0.4, d.pose.pos.z + Math.cos(t * 0.11) * d.amp);
      cam.lookAt(d.pose.target);
      if (cam.fov !== d.pose.fov) {
        cam.fov = d.pose.fov;
        cam.updateProjectionMatrix();
      }
    }

    w.update(dt, this.time, this.player, this);
    this.player.update(dt, this.input, w, cam, this.time);
    if (this.mode === 'play') {
      if (w === this.gallery) w.story(dt, this);
      else this.story(dt);
    }
    this.audio.setWind(this.player.fly * clamp(this.player.speed / 18 + 0.25));
    this.input.lookX = this.input.lookY = 0;

    G.uPixel.value = this.rh / (2 * Math.tan((cam.fov * Math.PI) / 360));
    w.sky?.bake(this.renderer, dt);
    this.pipeline.render(w.scene, cam, null);
  }

  // ?debug: frames a second and how much is being drawn, in the corner of the screen.
  // (Trust it only while the game is on screen: a hidden or covered page is slowed down.)
  perfMeter() {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:50;font:11px/1.35 ui-monospace,Consolas,monospace;color:#fff;background:rgba(0,0,0,.55);padding:3px 7px;border-radius:4px;pointer-events:none;white-space:pre';
    document.body.appendChild(el);
    let t = 0,
      n = 0,
      worst = 0;
    return (ms) => {
      t += ms;
      n++;
      worst = Math.max(worst, ms);
      if (t < 500) return;
      const s = this.pipeline.stats;
      el.textContent = `${Math.round((1000 * n) / t)} fps  ${(t / n).toFixed(1)} ms (worst ${worst.toFixed(0)})\n${Math.round(s.triangles / 1000)}k triangles  ${s.calls} draws  ${this.rw}x${this.rh}`;
      t = n = worst = 0;
    };
  }

  run() {
    let last = performance.now();
    const meter = this.noAdapt ? this.perfMeter() : null;
    const loop = (now) => {
      const ms = now - last;
      last = now;
      meter?.(ms);
      // paused while a film is being rendered frame by frame from the debug hooks
      if (!this.paused) this.frame(ms / 1000);
      if (this.mode === 'play' && !this.noAdapt && !this.paused) this.adaptQuality(ms);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- handy while building worlds
  debug = {
    go: async (id) => {
      const w = this.worlds[id];
      this.ui.showTitle(false);
      this.ui.showHud(true);
      this.drift = null;
      this.player.root.visible = this.player.trail.visible = this.player.shadow.visible = true;
      this.setWorld(w);
      const [sx, sz] = w.spawn.pos;
      this.player.place(new THREE.Vector3(sx, w.groundAt(sx, sz, 999), sz), w.spawn.yaw);
      this.player.frozen = false;
      this.player.resetCamera(w, this.camera);
      this.mode = 'play';
      this.ui.fade(0, 10);
    },
    restore: (v) => this.world.setRestored(v),
    view: () => {
      this.player.cinematic = true;
      this.setCamera(this.viewPose(this.world));
    },
    cam: (px, py, pz, tx, ty, tz, fov = 58) => {
      this.player.cinematic = true;
      this.setCamera({ pos: new THREE.Vector3(px, py, pz), target: new THREE.Vector3(tx, ty, tz), fov });
    },
    tp: (x, z, y) => {
      this.player.pos.set(x, y ?? this.world.groundAt(x, z, 999), z);
      this.player.cinematic = false;
      this.player.resetCamera(this.world, this.camera);
    },
    // blow a region of the frame up to fill the window (for checking brushwork)
    zoom: (x0, y0, x1, y1) => {
      this.frame(1 / 60);
      let o = document.getElementById('zoomdbg');
      if (!o) {
        o = document.createElement('canvas');
        o.id = 'zoomdbg';
        o.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:99';
        document.body.appendChild(o);
      }
      o.width = window.innerWidth;
      o.height = window.innerHeight;
      const c = this.canvas;
      o.getContext('2d').drawImage(c, x0 * c.width, y0 * c.height, (x1 - x0) * c.width, (y1 - y0) * c.height, 0, 0, o.width, o.height);
    },
    unzoom: () => document.getElementById('zoomdbg')?.remove(),
    step: (n = 1, dt = 1 / 30) => {
      for (let i = 0; i < n; i++) this.frame(dt);
    },
  };
}
