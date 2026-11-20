import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { paintMaterial } from './paint.js';

// Generated figures live in src/assets/models. They are found by name so the
// game still runs (with its hand-built stand-ins) if a model is missing.
const FILES = import.meta.glob('../assets/models/*.glb', { eager: true, query: '?url', import: 'default' });

export function modelUrl(key) {
  const hit = Object.keys(FILES)
    .filter((p) => p.toLowerCase().includes(key.toLowerCase()))
    .sort()
    .pop();
  return hit ? FILES[hit] : null;
}

// Load a GLB and repaint it with the game's brushwork: its texture becomes
// the pigment, and it turns to pencil and back with the rest of the world.
export async function loadFigure(key, strokes, { height = 1.6, contrast = 0.07, band = 0.42, stroke = 'soft' } = {}) {
  const url = modelUrl(key);
  if (!url) return null;
  // figures are simplified and meshopt-compressed offline (about 80k triangles, 1.6 MB)
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url);
  const root = gltf.scene;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const s = height / size.y;
  root.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  const scaler = new THREE.Group();
  scaler.scale.setScalar(s);
  scaler.add(root);
  const holder = new THREE.Group();
  holder.add(scaler);
  root.traverse((o) => {
    if (!o.isMesh) return;
    const tex = o.material.map ?? null;
    if (tex) {
      tex.colorSpace = THREE.NoColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
    }
    const base = o.material.color ? o.material.color.clone() : new THREE.Color(0xffffff);
    o.material = paintMaterial({ stroke: strokes[stroke], map: tex, tintColor: base, scale: 2.4 / Math.max(size.y, 1e-3), contrast, hueVar: 0.04, objSpace: 1, rim: 0.05, band, warp: 0, big: 0, impasto: 0.02, side: THREE.DoubleSide });
    o.frustumCulled = false;
  });
  holder.userData.size = size.multiplyScalar(s);
  return holder;
}


