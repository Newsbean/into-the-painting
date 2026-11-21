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
    scatter.js         Raw and instances(): one small geometry in thousands of places (grass, stones, trees);
                       footprints(): "is this spot taken?"
    walkers.js         people walking along ways: way(), Walkers, stand()
    flock.js           birds on the wing: cranes, gulls, pigeons
    air.js             petals on the wind, smoke from the roofs
    facade.js          walls with openings, reveals, slabs: the pieces of any facade
    kit.js             Kit: a block of buildings as a few merged meshes plus instanced details
    plan.js            town planning: rows of lots along both sides of every street
    townhouse.js       townHouse() and warehouse(): houses with real openings, painted from whatever kit they are given
    animals.js         horse, cow (or ox), sheep
    plants.js          grass, bracken, scrub, stones: what grows anywhere
    world.js           World base class: collision, story markers, the colour waves
    post.js sky.js player.js audio.js ui.js models.js
  worlds/<id>/       one folder per painting
    index.js           the World class: its look, its story text, and build() calling the parts in order
    sky.js terrain.js ...   one file per subject
    <set pieces>/      one file per set piece (vincent/, prints/, munch/, notebooks/)
  worlds/starry/town/  the town kit: house generator, facade parts, planner, church
  worlds/wave/edo/     the Edo kit: merchant houses, storehouses, farmhouses, pagoda, castle
  worlds/pearl/delft/  the Delft kit: canal houses, the Nieuwe Kerk, town hall, mill, gate, ship
  worlds/scream/kristiania/  the Kristiania kit: board houses, warehouses, church, barque, people
  worlds/scream/country/     hill farms, boathouses, forest and ground cover
  worlds/mona/tuscany/       the Tuscan kit: tower houses, church, town wall, bridge, people, cypress and olive
  dev/               development only, never shipped: lab.js, film.js
```

### The one rule of a world's `build()`

A world is built by calling its parts in a fixed order. The parts share a seeded random
generator and a few geometry builders (passed around as `kit`). **A part that rolls the dice
once more or once less moves everything built after it**, so when you change a part, expect
later parts to shift, and when you only want to restyle something, keep its dice rolls as
they are. Set pieces that roll their own dice (`rng(seed)`) are free of this.

### The story of a world, and its game

Every world plays the same way: find the five lost colours, find the keepsake, carry it to
the artist. Then comes the one thing only that picture needs: a game of its own, which can
be failed and tried again, and which gets harder as it goes. When it is won the picture is
finished. It lives in the world's `task.js`:

```js
world.task = {
  ask: ['what the artist says when he asks for it', ...],
  text: () => 'the objective shown on screen',
  hint: () => 'what the curator says when the player is stuck',
  start(game) {},                       // set the scene (game.hold(pose) takes the camera)
  update(dt, game, mark) { ... }        // every frame; return true when it is won
};
```

A game reads `game.keys` (held) and `game.pressed` (just gone down), and shows itself with
`ui.meter(value, label)`, `ui.prompt(text)`, `ui.mini(w, h)` (a sheet to draw on) and
`audio.tone(k)`.

| World | Its game |
|---|---|
| The Starry Night | **Eleven lights.** Fly a course of rings that winds in over the village and light all eleven in one flight. Each light gives barely enough time to reach the next: it takes Shift, early turns and a dive. Run out and the sky goes dark again. |
| The Great Wave | **Pull the print.** Three blocks cut from the real print by colour slide over the sheet; press each when its corner marks meet. Off register spoils the sheet and it starts again; each block is faster and less forgiving. |
| Girl with a Pearl Earring | **Which one is she?** The market fills with girls in headscarves. Find the blue scarf with the yellow tail and the pearl, against the clock, three times: more girls each round, scarves nearer to hers, and at the last she keeps away from you. |
| The Scream | **Breathe.** Hold Space as the ring opens, let go as it closes. Breaths in time still the sky (you can watch it happen); breaths out of time bring the scream back. They grow longer, uneven and less forgiving. |
| Mona Lisa | **Play her a smile.** Three musicians play a phrase; play it back. Five phrases, each a note longer and quicker. Her smile grows with every one; a wrong note and she looks away. |

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

Everything in `life/` has its own dice and is built last, so adding to it never moves
anything else. The tools it uses are the engine's (`scatter.js`, `walkers.js`, `flock.js`,
`air.js`), so any world can have the same. The surf on the beach and the foam lines on
the swell are two switches on the engine's water paint: `waterMaterial({ shore: 1, lace: 0.6 })`.

## The Delft kit (`src/worlds/pearl/delft`)

Girl with a Pearl Earring's town, about 1660: brick, pale stone, red shutters, water.

| File | What it gives you |
|---|---|
| `kit.js` | `delftMaterials(strokes)`, `DelftKit`, and the parts: cross-windows with shutters, doors, shop awnings, hoists, lanterns, signs, wall ties, barrels, crates, market stalls |
| `house.js` | `canalHouse(...)`: narrow and tall, stepped or spout gable, stone bands, shop or door; `front: true` dresses a wall that already stands |
| `landmarks.js` | `nieuweKerk`, `stadhuis`, `mill` and `millSails`, `gate`, `bridge` |
| `ship.js` | `trader` (the fluyt in the harbour) and `barge` |
| `people.js` | burghers, women, maids, boys; `delftCrowd` stands them about the streets |
| `plan.js` | the ground plan: where the canals and the harbour are, the bridges, the streets |
| `town.js` | Delft itself: houses, quays, market, trees, people walking, barges, birds, smoke |

Lab: `/?debug&look=pearl&lab=worlds/pearl/delft/lab.js` (add `&show=church`, `hall` or `mill`)

## The Kristiania kit and the country round it (`src/worlds/scream`)

The Scream's town of the 1890s, and the Norwegian hillside it lies under.

| File | What it gives you |
|---|---|
| `kristiania/kit.js` | `kristianiaMaterials(strokes)`, `KristianiaKit`, and the parts: casement windows, panelled doors, warehouse gates, hoists, gas lamps, barrels, crates, bollards |
| `kristiania/landmarks.js` | `church`, `barque`, `sjekteGeo` (a small boat under sail) |
| `kristiania/people.js` | `kristianiaPerson`: overcoats and long dresses, and with `col`, `hat`, `arms`, `lean` the same figure is a dancer, a girl at a railing, a farmer; `seatedMan` |
| `kristiania/town.js` | the town itself: quay, Karl Johan, the square, the pier, lamps, people, boats, gulls, smoke |
| `country/plan.js` | `YARDS`: the terraces cut into the hill for the farms, his garden and the green by the water |
| `country/farm.js` | `barn` (stone byre, red hayloft, a bridge to its door), `stabbur` (storehouse on legs), `naust` (boathouse on a landing), `skigard` (the leaning-rail fence), `hesje` (hay on a rack), `cart`, `rowboat` |
| `country/plants.js` | spruce, pine, birch and rowan made of brush dabs, juniper, scrub, heather, bracken, grass, stones |
| `country/index.js` | lays all of it out, and puts walkers and hay carts on the road |

To put something on a slope, give it a yard in `country/plan.js`: the ground is cut level
there, and everything else (grass, trees, fields) keeps off it. `country/` has its own dice.
The trees and box houses the hill used to have still throw theirs into builders nobody
draws (`land.js`, `munch/`), which is how the rest of the world has stayed where it was.

Lab: `/?debug&look=scream&lab=worlds/scream/kristiania/lab.js`

## The Tuscan kit (`src/worlds/mona/tuscany`)

The Mona Lisa's valley about 1503: stucco the colour of the earth, rough stone, terracotta.

| File | What it gives you |
|---|---|
| `kit.js` | `tuscanMaterials(strokes)`, `TuscanKit`, its palette `TU`, and the parts: shuttered windows, arched doors, market stalls, oil jars, barrels, lanterns |
| `build.js` | `torre` (tower house), `pieve` (church and bell tower), `mura` (town wall and gate), `ponte` (the bridge of round arches) |
| `life.js` | `tuscanPerson`, and what grows only here: `cypressGeo`, `olivoGeo`, `pinoGeo` (umbrella pine), `viteGeo` (a vine on its stake), `fioreGeo`; `pagliaio` (a haystack) |
| `index.js` | lays it out: the walled town on its hill, farms with groves and vineyards, oxen, sheep, walkers, pigeons, smoke, ground cover |

The houses themselves are the engine's (`engine/townhouse.js`): give it another kit, with its
own materials, parts and palette (`kit.pal`), and the same generator builds another country.

## House rules

- Every world is made in code: no photograph or scan is ever used inside a painting's world.
  The one exception is the wall of the gallery, which may hang the real paintings (below).
- Facts shown in the game about the artists and paintings must be true.
- *Girl with a Pearl Earring*: no characters or plot from the novel or the film.
- *The Scream*: the figure is never a monster, there are no jump scares, and the closing
  message stays gentle.
- The Japanese setting of the Great Wave is treated with respect.
- Keep comments short and about why; keep files to one subject so two people rarely need
  the same file.

## The pictures on the gallery wall

The gallery hangs a picture of each world, rendered from the world itself. If a file
`public/paintings/<id>.jpg` exists (`starry`, `wave`, `pearl`, `scream`, `mona`) that
photograph of the real painting hangs there instead: as a pencil study until its world is
restored, in its own colours after. All five paintings are in the public domain; use
reproductions that are too (Wikimedia Commons), and list where each came from in
`public/paintings/CREDITS.md`.

## Recording the showcase film

`src/dev/film.js` steps the game at exactly 1/30 s and saves every frame through the dev
server into `./capture/film/<shot>/` (ignored by git). See the notes at the top of that file.
