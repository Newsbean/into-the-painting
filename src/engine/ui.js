// Everything the player reads. Kept deliberately small: a title card,
// one line of dialogue, a sketchbook note, and dots for the colours found.

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export class UI {
  constructor() {
    this.fadeEl = $('fade');
    this.hud = $('hud');
    this.queue = Promise.resolve();
    this.captionToken = 0;
    this.markers = [];
    this.keysTimer = null;
  }

  // ---------- screens
  loading(p, text) {
    $('loading-fill').style.width = `${Math.round(p * 100)}%`;
    if (text) $('loading-text').textContent = text;
  }
  hideLoading() {
    const el = $('loading');
    el.classList.add('hidden');
    setTimeout(() => (el.style.display = 'none'), 1300);
  }
  showTitle(on) {
    const el = $('title');
    if (on) el.style.display = '';
    el.classList.toggle('hidden', !on);
    if (!on) setTimeout(() => (el.style.display = 'none'), 1300);
  }
  showHud(on) {
    this.hud.classList.toggle('hidden', !on);
  }
  showEnding(on) {
    $('ending').classList.toggle('hidden', !on);
  }
  cinema(on) {
    this.hud.classList.toggle('cinema', on);
  }
  // close the screen down to a framed window in the painting's proportions
  matte(on, aspect = 1.3, title = '', sub = '') {
    const el = $('matte');
    if (on) {
      el.style.setProperty('--ar', String(aspect));
      $('plaque-title').textContent = title;
      $('plaque-sub').textContent = sub;
    }
    el.classList.toggle('show', on);
    this.hud.classList.toggle('framed', on);
  }

  async fade(to, ms = 900, color = '#f3ead6') {
    this.fadeEl.style.transitionDuration = `${ms}ms`;
    this.fadeEl.style.background = color;
    // force style flush so the transition always runs
    void this.fadeEl.offsetWidth;
    this.fadeEl.style.opacity = to;
    await wait(ms + 30);
  }

  // ---------- chapter header
  chapter(name, colors = [], objective = '') {
    $('chapter-name').textContent = name;
    const box = $('pigments');
    box.innerHTML = '';
    this.dots = colors.map((c) => {
      const i = document.createElement('i');
      i.dataset.color = c;
      box.appendChild(i);
      return i;
    });
    this.objective(objective);
  }
  dot(i) {
    const d = this.dots?.[i];
    if (!d) return;
    d.classList.add('on');
    d.style.background = d.dataset.color;
    d.style.boxShadow = `0 0 14px ${d.dataset.color}`;
  }
  objective(text) {
    $('objective').textContent = text;
  }

  // ---------- big title card
  async card(kicker, title, sub, hold = 3600) {
    $('card-kicker').textContent = kicker;
    $('card-title').textContent = title;
    $('card-sub').textContent = sub;
    $('card').classList.add('show');
    await wait(hold);
    $('card').classList.remove('show');
    await wait(900);
  }

  // ---------- dialogue. say() queues; lines never overlap
  say(who, text, hold) {
    const token = this.captionToken;
    this.queue = this.queue.then(async () => {
      if (token !== this.captionToken) return;
      const el = $('caption');
      $('caption-who').textContent = who;
      $('caption-text').textContent = text;
      el.classList.add('show');
      await wait(hold ?? Math.max(2600, 1300 + text.length * 52));
      el.classList.remove('show');
      await wait(480);
    });
    return this.queue;
  }
  clearCaptions() {
    this.captionToken++;
    $('caption').classList.remove('show');
    this.queue = Promise.resolve();
  }

  // ---------- sketchbook note
  async fact(label, text, hold = 7500) {
    const el = $('fact');
    const my = (this.factToken = (this.factToken ?? 0) + 1);
    $('fact-label').textContent = label;
    $('fact-text').textContent = text;
    el.classList.add('show');
    await wait(hold);
    if (my === this.factToken) el.classList.remove('show');
  }

  prompt(text) {
    const el = $('prompt');
    if (!text) return el.classList.remove('show');
    el.textContent = text;
    el.classList.add('show');
  }

  keysDim(on) {
    $('keys').classList.toggle('dim', on);
  }
  resume(on) {
    $('resume').classList.toggle('show', on);
  }

  // ---------- on-screen markers that point at what is left to find
  setMarkers(list, camera, w, h) {
    const box = $('markers');
    while (this.markers.length < list.length) {
      const i = document.createElement('i');
      box.appendChild(i);
      this.markers.push(i);
    }
    this.markers.forEach((el, k) => {
      const m = list[k];
      if (!m) {
        el.style.opacity = 0;
        return;
      }
      const v = m.pos.clone().project(camera);
      let x = v.x,
        y = v.y;
      const behind = v.z > 1;
      if (behind) {
        x = -x;
        y = -y;
      }
      const off = behind || Math.abs(x) > 0.94 || Math.abs(y) > 0.9;
      if (off) {
        const s = Math.max(Math.abs(x) / 0.94, Math.abs(y) / 0.88, 1e-3);
        x /= s;
        y /= s;
        if (behind) {
          // keep it pinned to an edge rather than floating mid-screen
          const s2 = Math.max(Math.abs(x) / 0.94, Math.abs(y) / 0.88);
          x /= s2;
          y /= s2;
        }
      }
      el.style.left = `${((x + 1) / 2) * w}px`;
      el.style.top = `${((1 - y) / 2) * h}px`;
      el.style.background = m.color;
      el.style.boxShadow = `0 0 16px 3px ${m.color}`;
      el.style.opacity = m.dist < 9 && !off ? 0 : off ? 0.95 : 0.75;
      el.dataset.d = `${Math.round(m.dist)} m`;
    });
  }
}

export { wait };
