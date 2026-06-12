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
