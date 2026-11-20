import { Game } from './game.js';
import { UI } from './engine/ui.js';
import { GameAudio } from './engine/audio.js';
const ui = new UI();
const audio = new GameAudio();
const game = new Game(document.getElementById('stage'), ui, audio);

// Each world lives in its own folder under src/worlds and is only fetched when
// it is needed, so one world can be worked on (or broken) without the others.
const WORLDS = [
  { id: 'gallery', load: () => import('./worlds/gallery/index.js'), name: 'GalleryWorld', label: 'Hanging the frames…' },
  { id: 'starry', load: () => import('./worlds/starry/index.js'), name: 'StarryWorld', label: 'Stirring the night sky…' },
  { id: 'wave', load: () => import('./worlds/wave/index.js'), name: 'WaveWorld', label: 'Carving the woodblocks…' },
  { id: 'pearl', load: () => import('./worlds/pearl/index.js'), name: 'PearlWorld', label: 'Grinding lapis lazuli…' },
  { id: 'scream', load: () => import('./worlds/scream/index.js'), name: 'ScreamWorld', label: 'Waiting for the sunset…' },
  { id: 'mona', load: () => import('./worlds/mona/index.js'), name: 'MonaWorld', label: 'Blending the haze…' },
];
const classes = (list) => Promise.all(list.map(async (w) => ({ ...w, cls: (await w.load())[w.name] })));

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
    if (only && WORLDS.some((w) => w.id === only)) {
      await game.init(await classes(WORLDS.filter((w) => w.id === only)), (p, t) => ui.loading(p, t), { thumbnails: false });
      game.run();
      ui.hideLoading();
      await game.debug.go(only);
      game.debug.restore(params.has('grey') ? 0 : 1);
      return;
    }
    await game.init(await classes(WORLDS), (p, t) => ui.loading(p, t));
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
