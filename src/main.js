import { Game } from './game.js';
import { UI } from './engine/ui.js';
import { GameAudio } from './engine/audio.js';
import { StarryWorld } from './worlds/starry.js';
import { GalleryWorld } from './worlds/gallery.js';
import { WaveWorld } from './worlds/wave.js';
import { PearlWorld } from './worlds/pearl.js';
import { ScreamWorld } from './worlds/scream.js';
import { MonaWorld } from './worlds/mona.js';

const ui = new UI();
const audio = new GameAudio();
const game = new Game(document.getElementById('stage'), ui, audio);

const WORLDS = [
  { id: 'gallery', cls: GalleryWorld, label: 'Hanging the frames…' },
  { id: 'starry', cls: StarryWorld, label: 'Stirring the night sky…' },
  { id: 'wave', cls: WaveWorld, label: 'Carving the woodblocks…' },
  { id: 'pearl', cls: PearlWorld, label: 'Grinding lapis lazuli…' },
  { id: 'scream', cls: ScreamWorld, label: 'Waiting for the sunset…' },
  { id: 'mona', cls: MonaWorld, label: 'Blending the haze…' },
];

// ?only=<world id> builds a single world and drops straight into it, fully
// painted (add &grey for the sketch state). It is the fast loop for art work.
const params = new URLSearchParams(location.search);
const only = params.get('only');
// ?film (dev server only) adds the frame-by-frame recorder used for the showcase film
if (import.meta.env.DEV && params.has('film')) import('./dev/film.js').then((m) => m.installFilm(game));

(async () => {
  try {
    if (only && WORLDS.some((w) => w.id === only)) {
      await game.init(WORLDS.filter((w) => w.id === only), (p, t) => ui.loading(p, t), { thumbnails: false });
      game.run();
      ui.hideLoading();
      await game.debug.go(only);
      game.debug.restore(params.has('grey') ? 0 : 1);
      return;
    }
    await game.init(WORLDS, (p, t) => ui.loading(p, t));
    game.run();
    await game.showTitle();
    ui.hideLoading();
  } catch (err) {
    console.error(err);
    document.getElementById('loading-text').textContent = 'Something went wrong: ' + err.message;
  }
})();

document.getElementById('begin').addEventListener('click', () => game.begin());
document.getElementById('again').addEventListener('click', () => location.reload());
