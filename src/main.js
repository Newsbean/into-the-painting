import { Game } from './game.js';
import { UI } from './engine/ui.js';
import { GameAudio } from './engine/audio.js';
import { ABOUT as STARRY } from './worlds/starry/about.js';
import { ABOUT as WAVE } from './worlds/wave/about.js';
import { ABOUT as PEARL } from './worlds/pearl/about.js';
import { ABOUT as SCREAM } from './worlds/scream/about.js';
import { ABOUT as MONA } from './worlds/mona/about.js';

const ui = new UI();
const audio = new GameAudio();
let game;
try {
  game = new Game(document.getElementById('stage'), ui, audio);
} catch (err) {
  ui.trouble('This browser cannot draw the game: it has no WebGL2. A current Chrome, Edge, Firefox or Safari on a computer will.', false);
  throw err;
}

// Each world lives in its own folder under src/worlds. Its code is only fetched, and the
// world only built, when it is needed: the gallery and the first painting when the page
// opens (the title hangs over that one), the others when they are first walked into. Until
// then a world is its about.js: a name and a shape for its frame on the gallery wall.
const painting = (about, load, name) => ({ id: about.id, label: about.label, about, load, name });
const WORLDS = [
  { id: 'gallery', load: () => import('./worlds/gallery/index.js'), name: 'GalleryWorld', label: 'Hanging the frames…' },
  painting(STARRY, () => import('./worlds/starry/index.js'), 'StarryWorld'),
  painting(WAVE, () => import('./worlds/wave/index.js'), 'WaveWorld'),
  painting(PEARL, () => import('./worlds/pearl/index.js'), 'PearlWorld'),
  painting(SCREAM, () => import('./worlds/scream/index.js'), 'ScreamWorld'),
  painting(MONA, () => import('./worlds/mona/index.js'), 'MonaWorld'),
];

// The name of what is drawing the page, when that is the processor and not a graphics card
// (a browser with graphics acceleration switched off or lost, a virtual machine). A world
// that takes seconds to build and draw then takes minutes: better said than waited for.
function drawnInSoftware(gl) {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const name = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  return /swiftshader|basic render|llvmpipe|softpipe|software/i.test(name) ? name : null;
}

// ?only=<world id> builds a single world and drops straight into it, fully
// painted (add &grey for the sketch state). It is the fast loop for art work.
const params = new URLSearchParams(location.search);
const only = params.get('only');
// ?film (dev server only) adds the frame-by-frame recorder used for the showcase film
if (import.meta.env.DEV && params.has('film')) import('./dev/film.js').then((m) => m.installFilm(game));

(async () => {
  try {
    // ?lab=<module under src> (dev server only): the asset lab, see src/dev/lab.js
    if (import.meta.env.DEV && params.get('lab')) {
      const { runLab } = await import('./dev/lab.js');
      await runLab(game, ui, params.get('lab'), params);
      return;
    }
    if (drawnInSoftware(game.renderer.getContext()) && !params.has('anyway')) {
      await ui.trouble(
        'Your browser is drawing this page without the graphics card, so the game would take minutes to open and would crawl once it had. In Chrome or Edge: Settings, System, switch on “Use graphics acceleration when available”, then relaunch. If it is already on, close every window of the browser and open it again.'
      );
      game.lite = true; // (half the picture, to give the processor a chance)
    }
    if (only && WORLDS.some((w) => w.id === only)) {
      await game.init(WORLDS.filter((w) => w.id === only), (p, t) => ui.loading(p, t));
      game.run();
      ui.hideLoading();
      await game.debug.go(only);
      game.debug.restore(params.has('grey') ? 0 : 1);
      return;
    }
    await game.init(WORLDS, (p, t) => ui.loading(p, t), { first: ['gallery', WORLDS[1].id] });
    game.run();
    await game.showTitle();
    ui.hideLoading();
    performance.mark('ready'); // (how long opening took: performance.getEntriesByName('ready'))
  } catch (err) {
    console.error(err);
    document.getElementById('loading-text').textContent = 'Something went wrong: ' + err.message;
  }
})();

document.getElementById('begin').addEventListener('click', () => game.begin());
document.getElementById('again').addEventListener('click', () => location.reload());
