import * as THREE from 'three';

/**
 * Procedural Sahyadri-sunset environment map.
 * Set as scene.environment so every MeshStandardMaterial picks up reflections
 * and soft image-based lighting — gold/steel/sword metals reflect the warm sky
 * and horizon glow instead of reading as flat colour. One small PMREM, no files.
 */
export function createSahyadriEnv(renderer: THREE.WebGLRenderer): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Vertical band: dim warm zenith -> amber sky -> bright horizon -> dark ground
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0.0, '#2c1a0c');
  g.addColorStop(0.40, '#a85a26');
  g.addColorStop(0.50, '#ff9d4d'); // horizon glow — the bright reflected band
  g.addColorStop(0.57, '#5a2c14');
  g.addColorStop(1.0, '#080503');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);

  // Soft low sun bloom sitting on the horizon (matches the world sun direction-ish)
  const sun = ctx.createRadialGradient(170, 124, 0, 170, 124, 95);
  sun.addColorStop(0, 'rgba(255,232,188,0.95)');
  sun.addColorStop(1, 'rgba(255,232,188,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(75, 30, 190, 190);

  // Faint fire/ember glow low on the opposite side for warm fill on backs of models
  const fire = ctx.createRadialGradient(390, 150, 0, 390, 150, 70);
  fire.addColorStop(0, 'rgba(255,120,40,0.5)');
  fire.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = fire;
  ctx.fillRect(320, 90, 140, 130);

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromEquirectangular(tex);
  tex.dispose();
  pmrem.dispose();
  return rt.texture;
}

/**
 * Make metallic materials under a root catch the environment more strongly so
 * gold trim, blades and armour read as polished metal at gameplay distance.
 * Non-metals are left alone (their soft IBL fill comes from scene.environment).
 */
export function boostMetalReflections(root: THREE.Object3D) {
  root.traverse(obj => {
    const mat = (obj as THREE.Mesh).material;
    const mats = Array.isArray(mat) ? mat : mat ? [mat] : [];
    for (const m of mats) {
      const sm = m as THREE.MeshStandardMaterial;
      if (sm.isMeshStandardMaterial && sm.metalness >= 0.4) {
        sm.envMapIntensity = 1.6;
      }
    }
  });
}
