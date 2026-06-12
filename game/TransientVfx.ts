import * as THREE from 'three';

// Short-lived VFX (rings, sparks, debris) ticked from the main game loop.
// Replaces per-effect requestAnimationFrame loops, which kept running through
// pause/slow-mo and never disposed their geometry/materials.

interface VfxEntry {
  life: number;
  maxLife: number;
  meshes: THREE.Mesh[];
  scene: THREE.Scene;
  /** t is the remaining-life fraction (1 → 0). dt is scaled game delta. */
  tick: (t: number, dt: number) => void;
}

const entries: VfxEntry[] = [];

export function spawnTransientVfx(
  scene: THREE.Scene,
  meshes: THREE.Mesh[],
  maxLife: number,
  tick: (t: number, dt: number) => void,
) {
  for (const m of meshes) scene.add(m);
  entries.push({ life: maxLife, maxLife, meshes, scene, tick });
}

export function updateTransientVfx(delta: number) {
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    e.life -= delta;
    if (e.life <= 0) {
      removeEntry(e);
      entries.splice(i, 1);
    } else {
      e.tick(e.life / e.maxLife, delta);
    }
  }
}

export function clearTransientVfx() {
  for (const e of entries) removeEntry(e);
  entries.length = 0;
}

function removeEntry(e: VfxEntry) {
  for (const m of e.meshes) {
    e.scene.remove(m);
    m.geometry.dispose();
    const mat = m.material;
    if (Array.isArray(mat)) mat.forEach(x => x.dispose());
    else mat.dispose();
  }
}
