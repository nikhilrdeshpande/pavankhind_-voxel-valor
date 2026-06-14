import * as THREE from 'three';

export function createMarathaDhal(faceColor: number, rimColor: number, emblemColor: number, scale = 1): THREE.Group {
  // A real dhal is a convex round shield: domed hide/steel face, rolled rim,
  // and four raised brass bosses (char-tuk) in a square near the centre.
  const group = new THREE.Group();
  group.scale.setScalar(scale);
  // Convention: the dome bulges along +Z (away from the forearm).

  // Domed face — a shallow spherical cap instead of a flat disc.
  const faceMat = new THREE.MeshStandardMaterial({
    color: faceColor,
    roughness: 0.6,
    metalness: 0.35,
  });
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.42),
    faceMat,
  );
  // Cap sits around the +Y pole; rotate it to bulge toward +Z, then squash:
  // planar radius ~0.64 (just inside the 0.67 rim), shallow ~0.22 depth.
  dome.rotation.x = Math.PI / 2;
  dome.scale.set(0.72, 0.32, 0.72);
  group.add(dome);

  // Solid back plate so the shield is never see-through.
  const backMat = new THREE.MeshStandardMaterial({ color: 0x2a1c10, roughness: 0.85, metalness: 0.1, side: THREE.DoubleSide });
  const back = new THREE.Mesh(new THREE.CircleGeometry(0.66, 28), backMat);
  back.position.z = -0.02;
  group.add(back);

  // Rolled brass rim around the edge.
  const rimMat = new THREE.MeshStandardMaterial({ color: rimColor, roughness: 0.3, metalness: 0.85 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.67, 0.06, 10, 32), rimMat);
  group.add(rim);

  // Central raised brass boss.
  const bossMat = new THREE.MeshStandardMaterial({
    color: rimColor, roughness: 0.25, metalness: 0.9,
    emissive: emblemColor, emissiveIntensity: 0.18,
  });
  const centerBoss = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), bossMat);
  centerBoss.rotation.x = Math.PI / 2;
  centerBoss.position.z = 0.27; // crown the dome peak (~0.29)
  group.add(centerBoss);

  // Four raised bosses in a square — the signature char-tuk fittings.
  // z follows the dome surface so each boss sits proud of the leather.
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const r = 0.38;
    const z = 0.235; // dome surface height at r=0.38
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), bossMat);
    boss.rotation.x = Math.PI / 2;
    boss.position.set(Math.cos(angle) * r, Math.sin(angle) * r, z);
    group.add(boss);
    // small brass ring seat around each boss
    const seat = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.014, 6, 16), rimMat);
    seat.position.set(Math.cos(angle) * r, Math.sin(angle) * r, z - 0.04);
    group.add(seat);
  }

  // Leather grip strap on the back.
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x2f2116, roughness: 0.92 });
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.06), gripMat);
  grip.position.z = -0.06;
  group.add(grip);

  return group;
}

export function createClothPanel(width: number, height: number, color: number, trimColor?: number): THREE.Group {
  const group = new THREE.Group();
  const cloth = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 0.045),
    new THREE.MeshStandardMaterial({ color, roughness: 0.92, side: THREE.DoubleSide })
  );
  group.add(cloth);

  if (trimColor !== undefined) {
    const trimMat = new THREE.MeshStandardMaterial({ color: trimColor, metalness: 0.25, roughness: 0.55 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, 0.045, 0.055), trimMat);
    top.position.y = height * 0.5;
    group.add(top);
    const bottom = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, 0.045, 0.055), trimMat);
    bottom.position.y = -height * 0.5;
    group.add(bottom);
  }

  return group;
}
