# Working on Into the Painting together

Everything here is plain JavaScript and builds on any machine with Node and a browser
that has WebGL2 (Chrome, Edge, Firefox or Safari; Windows, macOS or Linux).

## Get set up

1. The repository is private: ask the owner to add you as a collaborator (GitHub →
   Settings → Collaborators), then clone it.
2. Use Node 22 (`.nvmrc` pins it; Node 20.19 or newer also works). With nvm: `nvm use`.
3. Install and run:

   ```bash
   npm ci
   npm run dev
   ```

   Open http://localhost:5173. The page reloads itself when you save a file.

| Command | What it is for |
|---|---|
| `npm run dev` | develop: reloads the page on every save |
| `npm run dev:lan` | the same, reachable from a phone or another computer on your network |
| `npm run dev:steady` | no automatic reload: for recording the film and for automated runs |
| `npm run check` | what CI runs: import paths, undefined names, production build |
| `npm run build` | the static site in `dist/` |
| `npm run preview` | serves `dist/` as it was built, to try the real thing before it goes out |

The game is published at https://into-the-painting.vercel.app. It goes out by hand: from a
checkout linked to the Vercel project (`vercel link`), `vercel deploy --prod`. Pushing to
GitHub does not publish anything.

You do not need the whole game to see your work. `/?only=wave` builds one world in about
twenty seconds; the asset lab (`/?debug&lab=<module>`, see the README) shows one asset in
about ten.

## How we avoid stepping on each other

- **One world is one folder, one subject is one file.** Pick the file that owns what you
  are changing; if two people need the same file often, split it.
- **`src/engine` is shared by every world.** Change it in its own pull request and say so
  in the title. Add options with defaults that keep the old behaviour, so the worlds you
  did not look at still look the same.
- **Branch from `main`, keep pull requests small**, one subject each:
  `git switch -c wave/harbour-lanterns`.
- **Run `npm run check` before you push.** CI runs it on every pull request, on Linux, so
  a wrong upper/lower case in an import path is caught there even if your machine forgives it.
- **Show it.** Put a lab sheet (`await lab.sheet('name')` writes `capture/lab/name.jpg`) or a
  screenshot in the pull request. `capture/` is ignored by git, so drag the picture into
  the pull request text.

## The rule of the dice

A world is built by calling its parts in a fixed order (see `build()` in its `index.js`).
The parts share one seeded random generator. A part that rolls once more or once less
moves everything built after it. So:

- to restyle something, keep its rolls exactly as they are;
- to add something new, give it its own generator (`const R = rng(1234)`) so nothing else
  moves;
- when you do mean to move things, say so in the pull request, because someone's set
  piece may now have a tree growing through it.

## Adding an asset

1. Make a file for it in the world's folder (or in `src/engine` if every world could use it).
2. Build it with `Soup` (fast, for many small faces) or `Builder` (boxes, cylinders, trees),
   and paint it with a `paintMaterial`. Colours go on the faces; the material adds the
   brushwork. No image files.
3. Give the file a `lab(world)` export that sets a few of them down, and look at it:
   `/?debug&lab=worlds/<world>/<your file>.js`, then `await lab.sheet('my-asset')`.
   Check it painted and as a pencil sketch (`lab.grey(0)`).
4. Call it from the part of the world where it belongs.

Things that are drawn many times (windows, lamps, lanterns) should be instanced parts in
the kit, and their fine detail should only be switched on near the camera: see
`src/worlds/starry/town/` for the pattern.

## Keep it fast

The game has to hold up on an ordinary laptop with integrated graphics. There, what
costs is not the paint filter but how much is drawn: the number of triangles in a frame,
and how many times the vertex program runs. Open any page with `?debug` and the corner
of the screen shows frames a second, triangles and draw calls for the frame. (Trust the
frames a second only while the game is actually on screen: browsers slow down a page
that is hidden or covered.)

As a guide, a frame of the Great Wave draws 350 to 700 thousand triangles, and the
Starry Night 250 thousand in the fields and about a million in the middle of town. If
something you add moves those numbers a lot, look at these first:

- **Weld it.** Everything is built as loose triangles, and `weld()` (`engine/weld.js`)
  joins the corners they share. `Builder.mesh()`, `Builder.meshes()`, `Soup.mesh()`, the
  kits and `terrain()` already do it. If you make a `THREE.Mesh` or an `InstancedMesh`
  from a geometry yourself, pass the geometry through `weld()` last.
- **Let it be skipped.** One huge mesh is always drawn, even when it is behind you. Use
  `Builder.meshes()` rather than `mesh()` for anything spread over the land, `tiles()` for
  a terrain or a sea, and `instances()` (`engine/scatter.js`) for scattered things.
- **Draw less of it far away.** Fine detail goes into a kit's instanced parts, which are
  switched off beyond a hundred metres or so; a whole block of a town gives way to plain
  stand-ins further off (`house.js` and `town.js` in `worlds/starry/town`).

To time a frame by hand, in the console of a `?debug&film&only=<world>` page:

```js
film.setup(1280, 720);
const gl = __game.renderer.getContext(), px = new Uint8Array(4);
let best = 1e9;
for (let i = 0; i < 30; i++) { const t0 = performance.now(); __game.frame(1 / 30); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); best = Math.min(best, performance.now() - t0); }
console.log(best.toFixed(1), 'ms a frame at best');
```

(The `readPixels` makes the browser wait for the graphics card; without it the number
means nothing. Take the best of many, with the page on screen.)

## What belongs in the game

See "House rules" in the README: all art is made in code, the facts are true, each
painting's world is treated with respect. If you are unsure whether something fits, open
a draft pull request and ask.

## Working with an AI assistant

Fine, and the same rules apply to what it writes. `.claude/launch.json` lets the Claude
desktop app start the dev server (it uses `dev:steady`, so a save does not reload the page
in the middle of a capture). Do not commit generated notes, logs or scratch files.
