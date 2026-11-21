import * as THREE from 'three';

// weld(geometry): give a list of loose triangles an index, so that corners which are the
// same in every attribute (place, normal, colour, sway...) become one vertex.
//
// Everything in this game is built as loose triangles, three corners each, because that
// is the easy way to merge thousands of small pieces. But the graphics card then runs
// the vertex program once for every corner: six times for each square of ground instead
// of once, three times a face on a cylinder instead of barely half. On integrated
// graphics that is most of the frame. Welding changes nothing that is drawn: flat faces
// keep their own corners (their normals differ), smooth ones share them.
//
// Corners must match bit for bit to be joined, which copies of the same corner always do.
// It works in place, takes about a tenth of a second per million corners, and returns
// the geometry. Do it last: an indexed geometry can no longer be merged with loose ones.
export function weld(geo) {
  if (!geo || geo.index) return geo;
  const names = Object.keys(geo.attributes);
  const n = geo.attributes.position.count;
  if (n < 6) return geo;
  // every attribute as whole numbers: the bits of a float, or the small integers as they are
  const views = names.map((name) => {
    const a = geo.attributes[name];
    return { name, a, size: a.itemSize, bits: a.array instanceof Float32Array ? new Uint32Array(a.array.buffer, a.array.byteOffset, a.array.length) : a.array };
  });
  const hash = new Uint32Array(n).fill(2166136261);
  for (const { bits, size } of views)
    for (let i = 0, k = 0; i < n; i++) {
      let h = hash[i];
      for (let c = 0; c < size; c++) h = Math.imul(h ^ bits[k++], 16777619);
      hash[i] = h;
    }
  const cap = 1 << Math.ceil(Math.log2(n * 2 + 1)),
    mask = cap - 1;
  const table = new Int32Array(cap).fill(-1); // slot -> kept vertex
  const first = new Uint32Array(n); // kept vertex -> the corner it was first seen at
  const remap = new Uint32Array(n);
  const nv = views.length;
  let m = 0;
  for (let i = 0; i < n; i++) {
    const h = hash[i];
    let slot = h & mask;
    for (;;) {
      const j = table[slot];
      if (j < 0) {
        table[slot] = m;
        first[m] = i;
        remap[i] = m++;
        break;
      }
      const o = first[j];
      if (hash[o] === h) {
        let same = true;
        for (let v = 0; v < nv && same; v++) {
          const { bits, size } = views[v];
          for (let c = 0, a = o * size, b = i * size; c < size; c++) if (bits[a + c] !== bits[b + c]) {
            same = false;
            break;
          }
        }
        if (same) {
          remap[i] = j;
          break;
        }
      }
      slot = (slot + 1) & mask;
    }
  }
  if (m > n * 0.92) return geo; // nothing much to share: leave it as it was
  for (const { name, a, size } of views) {
    const src = a.array,
      dst = new src.constructor(m * size);
    for (let j = 0; j < m; j++) {
      const o = first[j] * size;
      for (let c = 0; c < size; c++) dst[j * size + c] = src[o + c];
    }
    geo.setAttribute(name, new THREE.BufferAttribute(dst, size, a.normalized));
  }
  geo.setIndex(new THREE.BufferAttribute(m > 65535 ? remap : new Uint16Array(remap), 1));
  return geo;
}
