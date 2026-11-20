import * as THREE from 'three';

// ---------------------------------------------------------------- math
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));

export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// cheap deterministic value noise (2D), used by terrain + placement
function hash2(ix, iz) {
  let h = (ix * 374761393 + iz * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}
export function vnoise(x, z) {
  const ix = Math.floor(x),
    iz = Math.floor(z);
  const fx = x - ix,
    fz = z - iz;
  const u = fx * fx * (3 - 2 * fx),
    v = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz),
    b = hash2(ix + 1, iz),
    c = hash2(ix, iz + 1),
    d = hash2(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, z, oct = 4) {
  let s = 0,
    a = 0.5,
    f = 1;
  for (let i = 0; i < oct; i++) {
    s += a * vnoise(x * f, z * f);
    f *= 2.03;
    a *= 0.5;
  }
  return s;
}

// ---------------------------------------------------------------- textures
export function noise3D(size = 64, seed = 7) {
  const r = rng(seed);
  const data = new Uint8Array(size * size * size * 4);
  for (let i = 0; i < data.length; i++) data[i] = (r() * 256) | 0;
  const t = new THREE.Data3DTexture(data, size, size, size);
  t.format = THREE.RGBAFormat;
  t.type = THREE.UnsignedByteType;
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = t.wrapR = THREE.RepeatWrapping;
  t.unpackAlignment = 1;
  t.needsUpdate = true;
  return t;
}

export function noise2D(size = 256, seed = 3) {
  const r = rng(seed);
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < data.length; i++) data[i] = (r() * 256) | 0;
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

// soft radial sprite used for every glow in the game
export function glowTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.18, 'rgba(255,255,255,0.72)');
  grd.addColorStop(0.45, 'rgba(255,255,255,0.2)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

// ---------------------------------------------------------------- fullscreen helper
const _cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const _tri = new THREE.BufferGeometry();
_tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
_tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
const _mesh = new THREE.Mesh(_tri, null);
_mesh.frustumCulled = false;

export function blit(renderer, material, target = null) {
  _mesh.material = material;
  renderer.setRenderTarget(target);
  renderer.render(_mesh, _cam);
}

export const FS_VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const color = (hex) => new THREE.Color(hex);
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
