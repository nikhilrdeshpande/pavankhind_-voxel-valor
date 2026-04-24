import * as THREE from 'three';

export function createMarathaDhal(faceColor: number, rimColor: number, emblemColor: number, scale = 1): THREE.Group {
  const group = new THREE.Group();
  group.scale.setScalar(scale);

  const faceMat = new THREE.MeshStandardMaterial({
    color: faceColor,
    roughness: 0.55,
    metalness: 0.25,
    emissive: faceColor,
    emissiveIntensity: 0.06,
  });
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.08, 20), faceMat);
  face.rotation.x = Math.PI / 2;
  group.add(face);

  const rimMat = new THREE.MeshStandardMaterial({ color: rimColor, roughness: 0.28, metalness: 0.75 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.69, 0.055, 8, 24), rimMat);
  rim.rotation.x = Math.PI / 2;
  group.add(rim);

  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.018, 6, 20), rimMat);
  innerRing.rotation.x = Math.PI / 2;
  innerRing.position.z = 0.045;
  group.add(innerRing);

  const bossMat = new THREE.MeshStandardMaterial({
    color: rimColor,
    roughness: 0.25,
    metalness: 0.8,
    emissive: emblemColor,
    emissiveIntensity: 0.24,
  });
  const boss = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), bossMat);
  boss.position.z = 0.07;
  group.add(boss);

  const studMat = new THREE.MeshStandardMaterial({ color: emblemColor, metalness: 0.65, roughness: 0.35 });
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const radius = i % 2 === 0 ? 0.42 : 0.28;
    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.04, 7, 7), studMat);
    stud.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.07);
    group.add(stud);
  }

  const spokeMat = new THREE.MeshStandardMaterial({ color: rimColor, metalness: 0.55, roughness: 0.35 });
  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.58, 0.025), spokeMat);
    spoke.position.z = 0.055;
    spoke.rotation.z = (i / 4) * Math.PI;
    group.add(spoke);
  }

  const gripMat = new THREE.MeshStandardMaterial({ color: 0x2f2116, roughness: 0.9 });
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.48, 0.08), gripMat);
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
