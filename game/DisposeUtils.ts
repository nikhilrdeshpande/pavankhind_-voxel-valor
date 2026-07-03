import * as THREE from 'three';

const TEXTURE_KEYS = [
  'map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap',
  'alphaMap', 'aoMap', 'bumpMap', 'envMap', 'lightMap',
] as const;

function disposeMaterial(mat: THREE.Material) {
  for (const key of TEXTURE_KEYS) {
    const tex = (mat as unknown as Record<string, THREE.Texture | null>)[key];
    if (tex && tex.isTexture) tex.dispose();
  }
  mat.dispose();
}

/**
 * Dispose every geometry, material, and texture under a root.
 * Only safe at full teardown (shared materials die with their siblings).
 */
export function disposeSceneGraph(root: THREE.Object3D) {
  root.traverse(obj => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach(disposeMaterial);
    else if (mat) disposeMaterial(mat);
  });
  root.clear();
}

/**
 * End-of-life disposer for a single transient VFX object. Dedupes geometries
 * and materials via Sets so a resource shared across children (e.g. one shard
 * material reused by 16 shards) is disposed exactly once — never double-freed.
 * Also detaches the root from its parent. Safe to call per-effect, not just at
 * teardown.
 */
export function disposeObject3D(root: THREE.Object3D) {
  const geos = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  root.traverse(obj => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) geos.add(mesh.geometry);
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach(m => mats.add(m));
    else if (mat) mats.add(mat);
  });
  geos.forEach(g => g.dispose());
  mats.forEach(disposeMaterial);
  root.removeFromParent();
}
