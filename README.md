# Into the Painting

A short discovery game: a night guard walks into five famous paintings and brings their
colour back. Each world starts as a pencil sketch and is painted in as you explore.

| World | Painting | Folder |
|---|---|---|
| I | *The Starry Night*, Vincent van Gogh, 1889 | `src/worlds/starry` |
| II | *Under the Wave off Kanagawa*, Katsushika Hokusai, c. 1831 | `src/worlds/wave` |
| III | *Girl with a Pearl Earring*, Johannes Vermeer, c. 1665 | `src/worlds/pearl` |
| IV | *The Scream*, Edvard Munch, 1893 | `src/worlds/scream` |
| V | *Mona Lisa*, Leonardo da Vinci, c. 1503 | `src/worlds/mona` |
| hub | The Gallery Between | `src/worlds/gallery` |

Everything you see is built from code at load time: geometry, brush textures, skies,
music. There are no image files of the paintings in the project, and there should never be.

## Run it

You need Node 22 (20.19 or newer also works) and a browser with WebGL2.

```bash
npm ci
npm run dev
```

Open http://localhost:5173; the page reloads when you save a file. `npm run build` writes
the static site to `dist/`, and `npm run check` runs what CI runs on every pull request.
**[CONTRIBUTING.md](CONTRIBUTING.md) has the rest: the other commands, how we share the
work, and how to add an asset.**

Walk with WASD or the arrows, hold Space to ride the wind, Shift to hurry, M to mute.

### Handy addresses while working

| Address | What it does |
|---|---|
| `/?only=starry` | builds one world and drops you into it, fully painted (about 20 s instead of a full boot) |
| `/?only=starry&grey` | the same, still in pencil |
| `/?debug` | fixed quality and a readable canvas; `window.__game.debug` has `go(id)`, `restore(0..1)`, `cam(...)`, `tp(x, z)` |
| `/?debug&lab=worlds/starry/town/street.js` | the **asset lab**: one asset or a small scene, in seconds (see below) |
| `/?debug&film&only=starry` | the frame-by-frame film recorder (`src/dev/film.js`) |

## How the project is laid out

```
src/
  main.js            boot: loads each world lazily from its folder
  game.js            the loop, camera, story flow, finale
  engine/            the painterly engine, shared by every world
    paint.js           the paint shader (brushwork, sketch-to-colour, lamplight)
    strokes.js         brush atlases: oil, dab, wavy, soft, wood
    built.js           brush atlases for built surfaces: masonry, ashlar, brick, tiles, slate, cobble, plank
    build.js           Builder: merge tinted boxes, cylinders, roofs, trees into one mesh; terrain(), tiles()
    soup.js            Soup: the fast path for thousands of small faces (walls, reveals, roofs)
    weld.js            weld(): joins the corners loose triangles share, so less is sent to the graphics card
    facade.js          walls with openings, reveals, slabs: the pieces of any facade
    kit.js             Kit: a block of buildings as a few merged meshes plus instanced details
    plan.js            town planning: rows of lots along both sides of every street
    world.js           World base class: collision, story markers, the colour waves
    post.js sky.js player.js audio.js ui.js models.js
  worlds/<id>/       one folder per painting
    index.js           the World class: its look, its story text, and build() calling the parts in order
    sky.js terrain.js ...   one file per subject
    <set pieces>/      one file per set piece (vincent/, prints/, munch/, notebooks/)
  worlds/starry/town/  the town kit: house generator, facade parts, planner, church
  dev/               development only, never shipped: lab.js, film.js
```

### The one rule of a world's `build()`

A world is built by calling its parts in a fixed order. The parts share a seeded random
generator and a few geometry builders (passed around as `kit`). **A part that rolls the dice
once more or once less moves everything built after it**, so when you change a part, expect
later parts to shift, and when you only want to restyle something, keep its dice rolls as
they are. Set pieces that roll their own dice (`rng(seed)`) are free of this.

### Painting with code

- Every surface uses `paintMaterial({ stroke, scale, contrast, hueVar, ... })` from
  `engine/paint.js`. The stroke atlas gives each face its brushwork; the material never takes
  a photograph.
- Colour is per vertex. `Builder` (`engine/build.js`) and `Soup` (`engine/soup.js`) both
  produce geometry with the two attributes the shader needs (`color`, `aData`).
- `directed: 1` makes the brushwork follow the face it is on (courses level along a wall,
  tiles along the eaves). Use it with the atlases in `engine/built.js`.
- Light at night comes from `world.maps.lamp(x, z, radius, colour, strength)` (a pool on the
  ground that also warms nearby walls), from emissive faces (windows), and from
  `world.glows.push({ p, c, size })` (the halo of a lamp).
- The sketch-to-colour change is in the shader. Anything drawn with `paintMaterial` joins in
  for free.

## The asset lab

Build and judge one thing at a time, without loading a world:

```
/?debug&lab=worlds/starry/town/street.js      a street of generated houses
/?debug&lab=worlds/starry/town/church.js      the church
/?debug&bare&lab=worlds/starry/town/district.js   a whole district, with its cost in the console
/?debug&lab=worlds/starry/town/swatches.js    every built-surface brush
```

The module named by `lab=` exports `lab(world)`; it adds what it wants to show to
`world.scene` and may return `{ focus, dist, views }`. In the browser console:

```js
await lab.sheet('my-asset')   // four views in one picture -> capture/lab/my-asset.jpg
await lab.shot('close', { yaw: 20, pitch: 3, dist: 6 })
lab.grey(0)                   // look at it as a pencil sketch
```

Put a `lab()` at the bottom of any new asset file. It is the quickest way to show others
what you made.

## The town kit (`src/worlds/starry/town`)

Built on the engine's `facade.js`, `kit.js` and `plan.js`, which any world can use for its own buildings.

| File | What it gives you |
|---|---|
| `house.js` | `house(kit, world, { x, z, ry, w, d, floors, R, style, shop })`: a town house with real window reveals, shops, balconies, dormers, chimneys |
| `parts.js` | the instanced details: windows with shutters, doors, shopfronts with awnings, balconies, lanterns, lamp posts, strings of lights |
| `kit.js` | `townMaterials(strokes)` and this town's `Kit` (the engine's Kit with these parts) |
| `town.js` | `buildTown(world, { streets, squares, keep, inside })`: houses, cobbles, lamps, lights |
| `layout.js` | where the Starry Night's town lies and how its streets run |
| `church.js` | the church with the steeple |

## The Edo kit (`src/worlds/wave/edo`)

The Great Wave's buildings, in the flat colour and clean line of the prints.

| File | What it gives you |
|---|---|
| `house.js` | `machiya` (merchant house: lattice front, shop curtain, pent roof), `kura` (storehouse), `minka` (thatched farmhouse), `pagoda`, `tenshu` (the castle keep) |
| `roof.js` | `roof(...)`: gable, hip and hip-and-gable roofs with hollowed slopes and lifted corners |
| `kit.js` | `edoMaterials(strokes)`, `EdoKit`, and the hanging parts: noren, paper lanterns, signboards, rain barrels, benches |
| `people.js` | townsfolk, travellers, porters; `edoCrowd` scatters them along streets |
| `town.js` | Edo itself: streets, lots, the quay, the pagoda and the keep |

Lab: `/?debug&look=wave&lab=worlds/wave/edo/lab.js`

## The wave, and what lives around it (`src/worlds/wave`)

| File | What it gives you |
|---|---|
| `great-wave.js` | every breaking wave: a cross-section swept along the crest, with hooked claws of foam rooted on the lip |
| `wave-material.js` | how a wave is painted (streaks that run with the water, the foam fringes, lace at the waterline, claws that clutch) and `sprayPoints` |
| `life/ground.js` | what covers the ground: grass, flowers, bushes, stones, the hill forest, beach gear, Edo's pines and moored boats |
| `life/walkers.js` | people walking the roads, and the daimyo's procession on the Tokaido |
| `life/sea-sky.js` | cranes and gulls with beating wings, coasters under sail |
| `life/air.js` | cherry petals on the wind, smoke from the roofs |
| `life/raw.js` | the tools those share: `Raw` (triangles with colour, sway and tint), `instances()` (one geometry in thousands of places, culled by square of ground), `shoreZ()` |

Everything in `life/` has its own dice and is built last, so adding to it never moves
anything else. The surf on the beach and the foam lines on the swell are two switches
on the engine's water paint: `waterMaterial({ shore: 1, lace: 0.6 })`.

## House rules

- All art is made in code. Never add museum photographs or scans of the paintings.
- Facts shown in the game about the artists and paintings must be true.
- *Girl with a Pearl Earring*: no characters or plot from the novel or the film.
- *The Scream*: the figure is never a monster, there are no jump scares, and the closing
  message stays gentle.
- The Japanese setting of the Great Wave is treated with respect.
- Keep comments short and about why; keep files to one subject so two people rarely need
  the same file.

## Recording the showcase film

`src/dev/film.js` steps the game at exactly 1/30 s and saves every frame through the dev
server into `./capture/film/<shot>/` (ignored by git). See the notes at the top of that file.
