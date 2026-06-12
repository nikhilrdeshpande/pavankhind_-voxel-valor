
import * as THREE from 'three';

interface Torch {
  light: THREE.PointLight;
  baseIntensity: number;
  phase: number; // random offset for flicker
}

export type PowerupKind = 'amrut' | 'utsah' | 'parakram' | 'dhal';

export interface PowerupInfo {
  kind: PowerupKind;
  name: string;
  effect: string;
  color: string;
}

export class World {
  private scene: THREE.Scene;
  private reinforcementCount = 0;
  private maxReinforcements = 24;
  private minZ = -1300;
  private maxZ = 80;

  // Torches
  private torches: Torch[] = [];
  private torchTime = 0;

  // Embers
  private emberMesh: THREE.InstancedMesh;
  private emberData: { x: number; y: number; z: number; speed: number; swayPhase: number }[] = [];
  private emberCount = 60;
  private emberDummy = new THREE.Object3D();

  // Fireflies
  private fireflyMesh: THREE.InstancedMesh | null = null;
  private fireflyData: { x: number; y: number; z: number; phase: number; speed: number }[] = [];
  private fireflyCount = 15;

  // Falling leaves
  private leafMeshes: { mesh: THREE.Mesh; vel: THREE.Vector3; rotSpeed: THREE.Vector3; life: number }[] = [];
  private leafTimer = 0;

  // Flags
  private flags: { mesh: THREE.Mesh; phase: number }[] = [];

  private isMobile: boolean;

  // Time-of-day refs
  private skyMesh!: THREE.Mesh;
  private skyStartColors!: Float32Array;
  private skyEndColors!: Float32Array;
  private sunDisc!: THREE.Mesh;
  private sunGlow!: THREE.Mesh;
  private hemiLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;
  private fog!: THREE.FogExp2;
  private skyUpdateTimer = 0;

  // Dust motes
  private dustMoteMesh!: THREE.InstancedMesh;
  private dustMoteData: { x: number; y: number; z: number; vx: number; vy: number; phase: number }[] = [];
  private dustMoteCount: number;
  private dustMoteDummy = new THREE.Object3D();

  // Stream
  private streamMaterial: THREE.ShaderMaterial | null = null;
  private waterfallMaterials: THREE.ShaderMaterial[] = [];
  private arrowBlockers: { x: number; z: number; radius: number }[] = [];

  constructor(scene: THREE.Scene, isMobile = false) {
    this.scene = scene;
    this.isMobile = isMobile;

    // --- Sahyadri Monsoon Sky — misty grey-blue ---
    this.scene.background = new THREE.Color(0xb8c8cc);

    // Hemisphere: cool overcast sky, deep green ground bounce
    this.hemiLight = new THREE.HemisphereLight(0xe8eef0, 0x2a5a3a, 1.6);
    scene.add(this.hemiLight);

    // Ambient fill — neutral, not warm
    const ambientFill = new THREE.AmbientLight(0xe0e8e0, 0.55);
    scene.add(ambientFill);

    const shadowRes = isMobile ? 1024 : 2048;
    this.sunLight = new THREE.DirectionalLight(0xfff0d8, 2.0);
    this.sunLight.position.set(-120, 180, -200);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(shadowRes, shadowRes);
    this.sunLight.shadow.camera.left = -90;
    this.sunLight.shadow.camera.right = 90;
    this.sunLight.shadow.camera.top = 140;
    this.sunLight.shadow.camera.bottom = -140;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 520;
    this.sunLight.shadow.bias = -0.00015;
    this.sunLight.shadow.normalBias = 0.04;
    scene.add(this.sunLight);

    // Dynamic fog — blue-grey Sahyadri mist
    this.fog = new THREE.FogExp2(0xb0bcc0, 0.0018);
    scene.fog = this.fog;

    // Sky dome with sunset gradient: warm amber horizon → deep indigo zenith
    const skyGeo = new THREE.SphereGeometry(2000, 32, 24);
    const skyColors = new Float32Array(skyGeo.attributes.position.count * 3);
    const posAttr = skyGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i);
      const t = Math.max(0, Math.min(1, (y + 2000) / 4000)); // 0=bottom, 1=top
      // Horizon: muted warm, Zenith: deep blue-grey, Bottom: grey-green
      const horizon = new THREE.Color(0xd0c8b0);
      const zenith = new THREE.Color(0x607898);
      const bottom = new THREE.Color(0x8a9a8a);
      let c: THREE.Color;
      if (t < 0.45) {
        c = bottom.clone().lerp(horizon, t / 0.45);
      } else {
        c = horizon.clone().lerp(zenith, (t - 0.45) / 0.55);
      }
      skyColors[i * 3] = c.r;
      skyColors[i * 3 + 1] = c.g;
      skyColors[i * 3 + 2] = c.b;
    }
    skyGeo.setAttribute('color', new THREE.BufferAttribute(skyColors, 3));
    const skyMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
    });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(this.skyMesh);

    // Store start colors and compute end colors for time-of-day lerp
    this.skyStartColors = new Float32Array(skyColors);
    this.skyEndColors = new Float32Array(skyColors.length);
    const endHorizon = new THREE.Color(0xc04830);
    const endZenith = new THREE.Color(0x2a1840);
    const endBottom = new THREE.Color(0x603030);
    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i);
      const t = Math.max(0, Math.min(1, (y + 2000) / 4000));
      let c: THREE.Color;
      if (t < 0.45) {
        c = endBottom.clone().lerp(endHorizon, t / 0.45);
      } else {
        c = endHorizon.clone().lerp(endZenith, (t - 0.45) / 0.55);
      }
      this.skyEndColors[i * 3] = c.r;
      this.skyEndColors[i * 3 + 1] = c.g;
      this.skyEndColors[i * 3 + 2] = c.b;
    }

    // --- Sun Disc (emissive sphere near horizon) ---
    this.sunDisc = new THREE.Mesh(
      new THREE.SphereGeometry(60, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffe0a0 })
    );
    this.sunDisc.position.set(-400, 80, -1800);
    scene.add(this.sunDisc);

    // Sun glow (larger, softer)
    this.sunGlow = new THREE.Mesh(
      new THREE.SphereGeometry(120, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffaa44,
        transparent: true,
        opacity: 0.15,
      })
    );
    this.sunGlow.position.copy(this.sunDisc.position);
    scene.add(this.sunGlow);

    // --- Ground with vertex-colored grass edges ---
    const gapWidth = 70;
    const groundGeo = new THREE.PlaneGeometry(gapWidth, 3400, 90, 420);
    groundGeo.rotateX(-Math.PI / 2);

    // Sculpt terrain + paint vertex colors
    const groundPos = groundGeo.attributes.position;
    const groundColors = new Float32Array(groundPos.count * 3);
    const trailColor = new THREE.Color(0x6b5a3a);   // dusty trail center
    const grassColor = new THREE.Color(0x2a6a2a);   // monsoon green edges
    const darkGrass = new THREE.Color(0x1a5a1a);    // deep lush green

    for (let i = 0; i < groundPos.count; i++) {
      const x = groundPos.getX(i);
      const z = groundPos.getZ(i);
      const ridge = Math.sin(z * 0.035) * 0.6 + Math.sin(z * 0.12) * 0.2;
      const edge = Math.abs(x) / (gapWidth * 0.5);
      const rockiness = Math.sin(z * 0.18 + x * 0.3) * 0.25;
      const height = ridge - edge * 1.2 + rockiness;
      groundPos.setY(i, height);

      // Color: trail center (grey-brown stone) → grass edges + mud patches
      let c: THREE.Color;
      const stonePathColor = new THREE.Color(0x8a7a6a);
      const mudColor = new THREE.Color(0x4a3a2a);
      if (edge < 0.2) {
        // Stone path center — raised slightly
        c = stonePathColor.clone();
        groundPos.setY(i, height + 0.1);
      } else if (edge < 0.4) {
        c = stonePathColor.clone().lerp(trailColor, (edge - 0.2) / 0.2);
      } else if (edge < 0.7) {
        c = trailColor.clone().lerp(grassColor, (edge - 0.4) / 0.3);
      } else {
        c = grassColor.clone().lerp(darkGrass, (edge - 0.7) / 0.3);
      }
      // Random mud patches
      const mudNoise = Math.sin(x * 0.8 + z * 0.6) * Math.cos(x * 0.3 - z * 0.9);
      if (mudNoise > 0.7 && edge > 0.3 && edge < 0.8) {
        c = mudColor.clone();
        groundPos.setY(i, height - 0.15);
      }
      groundColors[i * 3] = c.r;
      groundColors[i * 3 + 1] = c.g;
      groundColors[i * 3 + 2] = c.b;
    }
    groundGeo.setAttribute('color', new THREE.BufferAttribute(groundColors, 3));
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1.0,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // --- Laterite Cliffs ---
    const cliffMats = [
      new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.95, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: 0x6a3a22, roughness: 0.95, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 0.95, metalness: 0.05 }),
    ];
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x1a6a18, roughness: 0.9 });
    const createCliff = (side: number) => {
      for (let z = -1800; z < 700; z += 130) {
        const width = 60 + Math.random() * 40;
        const height = 140 + Math.random() * 80;
        const depth = 120 + Math.random() * 60;
        const mat = cliffMats[Math.floor(Math.random() * cliffMats.length)];
        const wall = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
        const xPos = side * (gapWidth * 0.5 + 22 + Math.random() * 10);
        wall.position.set(xPos, height * 0.45, z);
        wall.receiveShadow = true;
        this.scene.add(wall);

        // Laterite layering strips (Western Ghats rock strata)
        for (let s = 0; s < 2; s++) {
          const stripMat = cliffMats[(Math.floor(Math.random() * cliffMats.length) + 1) % cliffMats.length];
          const strip = new THREE.Mesh(new THREE.BoxGeometry(width + 2, 3, depth + 2), stripMat);
          strip.position.set(xPos, height * 0.2 + s * height * 0.3, z);
          this.scene.add(strip);
        }
        // Water streaks on 30% of cliff faces
        if (Math.random() > 0.7) {
          const streakMat = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, metalness: 0.2, roughness: 0.5 });
          const streak = new THREE.Mesh(new THREE.BoxGeometry(1.5, height * 0.6, 0.5), streakMat);
          streak.position.set(xPos - side * (width * 0.2), height * 0.5, z + (Math.random() - 0.5) * 20);
          this.scene.add(streak);
        }

        // Bush clusters on cliff faces
        if (Math.random() > 0.4) {
          const bushSize = 3 + Math.random() * 5;
          const bush = new THREE.Mesh(new THREE.BoxGeometry(bushSize, bushSize * 0.7, bushSize), bushMat);
          bush.position.set(xPos - side * (width * 0.3), height * 0.3 + Math.random() * 20, z + (Math.random() - 0.5) * 40);
          this.scene.add(bush);
        }
      }
    };
    createCliff(1);
    createCliff(-1);

    // --- Torches along cliff walls ---
    this.spawnTorches(gapWidth);

    // --- Boulders (instanced for performance: 120 → 2 draw calls) ---
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMats = [
      new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: 0x6a4a35, roughness: 0.9 }),
    ];
    const rockCounts = [60, 60];
    for (let m = 0; m < 2; m++) {
      const rockMesh = new THREE.InstancedMesh(rockGeo, rockMats[m], rockCounts[m]);
      rockMesh.castShadow = true;
      rockMesh.receiveShadow = true;
      const d = new THREE.Object3D();
      for (let i = 0; i < rockCounts[m]; i++) {
        const size = 0.6 + Math.random() * 1.8;
        d.position.set(
          (Math.random() - 0.5) * (gapWidth - 8),
          0.3 + Math.random() * 0.6,
          -Math.random() * 1400 + 120
        );
        d.rotation.set(Math.random(), Math.random(), Math.random());
        d.scale.setScalar(size);
        d.updateMatrix();
        rockMesh.setMatrixAt(i, d.matrix);
        if (size > 1.2 && Math.abs(d.position.x) < 23) {
          this.arrowBlockers.push({ x: d.position.x, z: d.position.z, radius: size * 1.25 });
        }
      }
      rockMesh.instanceMatrix.needsUpdate = true;
      this.scene.add(rockMesh);
    }

    // --- Grass Tufts (instanced cones along path edges) ---
    const grassGeo = new THREE.ConeGeometry(0.5, 1.8, 5);
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 0.9 });
    const grassMesh = new THREE.InstancedMesh(grassGeo, grassMat, 80);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 80; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const xOffset = side * (gapWidth * 0.35 + Math.random() * 8);
      const z = -Math.random() * 1400 + 100;
      dummy.position.set(xOffset, 0.6, z);
      dummy.scale.set(0.8 + Math.random() * 0.5, 0.8 + Math.random() * 0.6, 0.8 + Math.random() * 0.5);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.updateMatrix();
      grassMesh.setMatrixAt(i, dummy.matrix);
      // Vary green shade per instance
      const shade = new THREE.Color().setHSL(0.28 + Math.random() * 0.06, 0.5 + Math.random() * 0.2, 0.2 + Math.random() * 0.1);
      grassMesh.setColorAt(i, shade);
    }
    grassMesh.instanceMatrix.needsUpdate = true;
    if (grassMesh.instanceColor) grassMesh.instanceColor.needsUpdate = true;
    this.scene.add(grassMesh);

    // --- Tree Silhouettes on Cliff Tops ---
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.9 });
    const treeCanopyMat = new THREE.MeshStandardMaterial({ color: 0x1a4a14, roughness: 0.9 });
    for (let i = 0; i < 20; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const z = -1400 + i * 80 + Math.random() * 40;
      const xBase = side * (gapWidth * 0.5 + 35 + Math.random() * 20);
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 12, 1.2), treeTrunkMat);
      trunk.position.y = 70;
      tree.add(trunk);
      const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(6, 0), treeCanopyMat);
      canopy.position.y = 80;
      tree.add(canopy);
      tree.position.set(xBase, 0, z);
      this.scene.add(tree);
    }

// --- Banyan Trees (distinctive with multiple trunks + wide canopy + aerial roots) ---
const banyanTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 0.9 });
const banyanCanopyMat = new THREE.MeshStandardMaterial({ color: 0x1a5a14, roughness: 0.85 });
const aerialRootMat = new THREE.MeshStandardMaterial({ color: 0x5a4a38, roughness: 0.9 });
for (let i = 0; i < 6; i++) {
  const side = i % 2 === 0 ? 1 : -1;
  const z = -1200 + i * 250 + Math.random() * 80;
  const xBase = side * (gapWidth * 0.5 + 8 + Math.random() * 6);
  const banyan = new THREE.Group();
  // Multiple angled trunks
  for (let t = 0; t < 3; t++) {
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.5, 8 + Math.random() * 4, 1.5), banyanTrunkMat);
    trunk.position.set((t - 1) * 2.5, 4, (Math.random() - 0.5) * 2);
    trunk.rotation.z = (t - 1) * 0.15;
    banyan.add(trunk);
  }
  // Wide flat canopy
  const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(10, 0), banyanCanopyMat);
  canopy.position.y = 10;
  canopy.scale.set(1.5, 0.4, 1.5);
  banyan.add(canopy);
  // Hanging aerial roots
  for (let r = 0; r < 5; r++) {
    const root = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3 + Math.random() * 2, 0.15), aerialRootMat);
    root.position.set((Math.random() - 0.5) * 12, 5 + Math.random() * 2, (Math.random() - 0.5) * 8);
    banyan.add(root);
  }
  banyan.position.set(xBase, 0, z);
  this.scene.add(banyan);
}

// --- Wildflower Clusters ---
const flowerColors = [0xff4444, 0xffdd44, 0xbb44ff];
const flowerGeo = new THREE.ConeGeometry(0.15, 0.4, 5);
const flowerCount = isMobile ? 20 : 40;
for (let fc = 0; fc < flowerColors.length; fc++) {
  const fMat = new THREE.MeshStandardMaterial({ color: flowerColors[fc], roughness: 0.8 });
  const fMesh = new THREE.InstancedMesh(flowerGeo, fMat, Math.ceil(flowerCount / 3));
  const d = new THREE.Object3D();
  for (let i = 0; i < Math.ceil(flowerCount / 3); i++) {
    const side = Math.random() > 0.5 ? 1 : -1;
    d.position.set(
      side * (gapWidth * 0.32 + Math.random() * 6),
      0.2 + Math.random() * 0.1,
      -Math.random() * 1200
    );
    d.scale.set(0.6 + Math.random() * 0.4, 0.6 + Math.random() * 0.4, 0.6 + Math.random() * 0.4);
    d.updateMatrix();
    fMesh.setMatrixAt(i, d.matrix);
  }
  fMesh.instanceMatrix.needsUpdate = true;
  this.scene.add(fMesh);
}

// --- Fallen Logs ---
const logMat = new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 0.9 });
for (let i = 0; i < 7; i++) {
  const side = i % 2 === 0 ? 1 : -1;
  const logLen = 3 + Math.random() * 4;
  const log = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, logLen, 6), logMat);
  log.position.set(
    side * (gapWidth * 0.35 + Math.random() * 4),
    0.3,
    -200 - i * 150 + Math.random() * 50
  );
  log.rotation.z = Math.PI / 2;
  log.rotation.y = (Math.random() - 0.5) * 0.4;
  this.scene.add(log);
}

    // --- Distant Mountain Ridgeline (Sahyadri vista) ---
    const mountainMats = [
      new THREE.MeshBasicMaterial({ color: 0x6a5a4a }), // nearest, warmer
      new THREE.MeshBasicMaterial({ color: 0x7a6a5a }), // mid
      new THREE.MeshBasicMaterial({ color: 0x8a7a6a }), // farthest
    ];
    const mountainData = [
      { z: -1600, height: 200, width: 600, color: 0 },
      { z: -1800, height: 260, width: 800, color: 1 },
      { z: -2000, height: 180, width: 1000, color: 2 },
    ];
    for (const md of mountainData) {
      // Simple triangular ridge using a cone flattened on Z
      const mtGeo = new THREE.ConeGeometry(md.width * 0.5, md.height, 4);
      const mountain = new THREE.Mesh(mtGeo, mountainMats[md.color]);
      mountain.position.set(0, md.height * 0.3, md.z);
      mountain.scale.z = 0.3;
      this.scene.add(mountain);
      // Offset second peak
      const mt2 = new THREE.Mesh(mtGeo, mountainMats[md.color]);
      mt2.position.set(md.width * 0.3, md.height * 0.25, md.z - 50);
      mt2.scale.z = 0.25;
      this.scene.add(mt2);
    }

// --- Fort Vishalgad (upgraded with stepped base, crenellations, gateway) ---
const fortMat = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 1.0 });
// Stepped base (3 platforms)
for (let p = 0; p < 3; p++) {
  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(110 - p * 15, 10, 50 - p * 5),
    fortMat
  );
  platform.position.set(0, 25 + p * 12, -1400);
  this.scene.add(platform);
}
// Main tower
const fortTower = new THREE.Mesh(new THREE.BoxGeometry(25, 55, 25), fortMat);
fortTower.position.set(0, 70, -1400);
this.scene.add(fortTower);
// Second tower
const fortTower2 = new THREE.Mesh(new THREE.BoxGeometry(18, 40, 18), fortMat);
fortTower2.position.set(35, 55, -1400);
this.scene.add(fortTower2);
// Crenellations (spaced blocks on top)
for (let c = -4; c <= 4; c++) {
  const cren = new THREE.Mesh(new THREE.BoxGeometry(5, 6, 5), fortMat);
  cren.position.set(c * 12, 100, -1400);
  this.scene.add(cren);
}
// Gateway arch (2 pillars + lintel)
const gatewayMat = new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.9 });
const pillarL = new THREE.Mesh(new THREE.BoxGeometry(5, 30, 5), gatewayMat);
pillarL.position.set(-10, 40, -1375);
this.scene.add(pillarL);
const pillarR = new THREE.Mesh(new THREE.BoxGeometry(5, 30, 5), gatewayMat);
pillarR.position.set(10, 40, -1375);
this.scene.add(pillarR);
const lintel = new THREE.Mesh(new THREE.BoxGeometry(25, 5, 5), gatewayMat);
lintel.position.set(0, 57, -1375);
this.scene.add(lintel);
// Gateway torches
const torchGlowMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 2.0, transparent: true, opacity: 0.9 });
for (const tx of [-10, 10]) {
  const tPole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 4, 4), new THREE.MeshStandardMaterial({ color: 0x4a3018 }));
  tPole.position.set(tx, 58, -1373);
  this.scene.add(tPole);
  const tFlame = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), torchGlowMat);
  tFlame.position.set(tx, 60.5, -1373);
  this.scene.add(tFlame);
  if (!isMobile) {
    const tLight = new THREE.PointLight(0xff8833, 30, 20);
    tLight.position.set(tx, 60, -1373);
    this.scene.add(tLight);
  }
}
// Fort flag
const flagPole = new THREE.Mesh(
  new THREE.CylinderGeometry(0.3, 0.3, 20, 4),
  new THREE.MeshStandardMaterial({ color: 0x5a4a3a })
);
flagPole.position.set(0, 108, -1400);
this.scene.add(flagPole);
const flag = new THREE.Mesh(
  new THREE.BoxGeometry(8, 5, 0.1),
  new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 0.3 })
);
flag.position.set(4, 115, -1400);
this.scene.add(flag);

// --- Saffron Battle Flags (Maratha left cliff side) ---
const bhagwaFlagMat = new THREE.MeshStandardMaterial({
  color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 0.4, side: THREE.DoubleSide
});
for (let i = 0; i < 7; i++) {
  const z = -1000 + i * 180;
  const xPos = -(gapWidth * 0.5 + 10);
  // Pole
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 8, 4),
    new THREE.MeshStandardMaterial({ color: 0x5a4a3a })
  );
  pole.position.set(xPos, 4, z);
  this.scene.add(pole);
  // Flag
  const bhagwaFlag = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 0.05), bhagwaFlagMat);
  bhagwaFlag.position.set(xPos + 1.5, 7.5, z);
  this.scene.add(bhagwaFlag);
  this.flags.push({ mesh: bhagwaFlag, phase: Math.random() * Math.PI * 2 });
}

// --- Wooden Barricade at pass entrance ---
const barricadeMat = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.9 });
for (let i = 0; i < 3; i++) {
  const barLog = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 12, 6), barricadeMat);
  barLog.position.set(0, 0.8 + i * 0.7, this.maxZ - 2);
  barLog.rotation.z = Math.PI / 2;
  this.scene.add(barLog);
}
// Supports
const supportL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 0.5), barricadeMat);
supportL.position.set(-5, 1.5, this.maxZ - 2);
this.scene.add(supportL);
const supportR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 0.5), barricadeMat);
supportR.position.set(5, 1.5, this.maxZ - 2);
this.scene.add(supportR);

// --- Stone Memorial Markers ---
const memorialMat = new THREE.MeshStandardMaterial({ color: 0xb0a080, roughness: 0.9 });
for (let i = 0; i < 4; i++) {
  const slab = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.2), memorialMat);
  slab.position.set(
    (i % 2 === 0 ? 1 : -1) * (gapWidth * 0.3 + Math.random() * 3),
    0.75,
    -300 - i * 250
  );
  this.scene.add(slab);
}

// --- God-rays (semi-transparent beams) ---
if (!isMobile) {
  const rayMat = new THREE.MeshBasicMaterial({
    color: 0xffdd88, transparent: true, opacity: 0.03,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  for (let i = 0; i < 4; i++) {
    const ray = new THREE.Mesh(new THREE.BoxGeometry(8, 200, 0.5), rayMat);
    ray.position.set(-200 + i * 100, 100, -800 - i * 200);
    ray.rotation.z = 0.3 + i * 0.1;
    this.scene.add(ray);
  }
}

// --- Rim Backlight (golden hour) ---
const rimLight = new THREE.DirectionalLight(0xffaa66, 0.3);
rimLight.position.set(0, 50, 200);
this.scene.add(rimLight);

    // --- Mist Layers (drifting translucent planes, orange tinted for sunset) ---
    const mistMat = new THREE.MeshBasicMaterial({
      color: 0xd0a880,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 3; i++) {
      const mistPlane = new THREE.Mesh(new THREE.PlaneGeometry(400, 40), mistMat);
      mistPlane.position.set(0, 5 + i * 8, -400 - i * 300);
      mistPlane.rotation.x = -Math.PI / 2;
      this.scene.add(mistPlane);
    }

    this.spawnTeammates();
    this.spawnWallGuards();
    this.spawnPassGates();
    this.createBattlefieldLandmarks(gapWidth);
    this.createStageGateways(gapWidth);

    // --- Ambient Embers ---
    this.emberMesh = this.createEmbers();

    // --- Fireflies ---
    if (!isMobile) {
      this.fireflyMesh = this.createFireflies();
    }

    // --- Stone Steps & Stream ---
    this.createStoneSteps();
    this.createStream();

    // --- Battle Remnants (environmental storytelling) ---
    this.createBattleRemnants();

    // --- Dust Motes ---
    this.dustMoteCount = isMobile ? 30 : 60;
    this.createDustMotes();
  }

  private createStoneSteps() {
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x7a6a5a, roughness: 0.95 });
    const stepPositions = [-300, -600, -900, -1100];
    for (const z of stepPositions) {
      for (let s = 0; s < 3; s++) {
        const step = new THREE.Mesh(
          new THREE.BoxGeometry(14, 0.3, 2),
          stepMat
        );
        step.position.set(0, -s * 0.3 + 0.15, z - s * 2);
        step.receiveShadow = true;
        this.scene.add(step);
      }
    }
  }

  private createStream() {
    // Water shader (procedural, no textures)
    const waterShader = {
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float wave = sin(vUv.y * 25.0 + uTime * 3.0) * 0.5 + 0.5;
          float wave2 = sin(vUv.y * 40.0 - uTime * 2.0 + vUv.x * 10.0) * 0.3 + 0.5;
          float foam = smoothstep(0.88, 1.0, wave);
          vec3 water = mix(vec3(0.12, 0.22, 0.32), vec3(0.25, 0.35, 0.45), wave * wave2);
          water += foam * 0.2;
          gl_FragColor = vec4(water, 0.5);
        }
      `,
    };

    // Main stream along left cliff
    this.streamMaterial = new THREE.ShaderMaterial({
      ...waterShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const streamGeo = new THREE.PlaneGeometry(2.5, 1400, 1, 80);
    streamGeo.rotateX(-Math.PI / 2);
    const stream = new THREE.Mesh(streamGeo, this.streamMaterial);
    stream.position.set(-32, 0.08, -600);
    this.scene.add(stream);

    // Waterfalls at cliff positions
    const waterfallShader = {
      uniforms: { uTime: { value: 0 } },
      vertexShader: waterShader.vertexShader,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float fall = sin(vUv.y * 15.0 + uTime * 5.0) * 0.3 + 0.7;
          float foam = smoothstep(0.85, 1.0, fall);
          vec3 water = mix(vec3(0.18, 0.28, 0.38), vec3(0.4, 0.5, 0.6), fall);
          water += foam * 0.3;
          float alpha = 0.6 * (1.0 - vUv.y * 0.3);
          gl_FragColor = vec4(water, alpha);
        }
      `,
    };

    const waterfallPositions = [
      { x: -34, z: -400, h: 8 },
      { x: -33, z: -850, h: 6 },
    ];

    for (const wp of waterfallPositions) {
      const wfMat = new THREE.ShaderMaterial({
        ...waterfallShader,
        uniforms: { uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const wfGeo = new THREE.PlaneGeometry(1.5, wp.h);
      const wf = new THREE.Mesh(wfGeo, wfMat);
      wf.position.set(wp.x, wp.h / 2 + 1, wp.z);
      this.scene.add(wf);
      this.waterfallMaterials.push(wfMat);
    }
  }

  private createBattleRemnants() {
    const dummy = new THREE.Object3D();

    // Fallen soldiers (lying on ground)
    const fallenGeo = new THREE.CapsuleGeometry(0.3, 0.8, 4, 6);
    const fallenMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.95 });
    const fallenCount = 8;
    const fallenMesh = new THREE.InstancedMesh(fallenGeo, fallenMat, fallenCount);
    const fallenPositions = [-200, -350, -500, -650, -750, -900, -1050, -1200];
    for (let i = 0; i < fallenCount; i++) {
      const side = (i % 2 === 0 ? 1 : -1) * (8 + Math.random() * 10);
      dummy.position.set(side, 0.3, fallenPositions[i] + (Math.random() - 0.5) * 30);
      dummy.rotation.set(0, Math.random() * Math.PI, Math.PI / 2);
      dummy.updateMatrix();
      fallenMesh.setMatrixAt(i, dummy.matrix);
    }
    fallenMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(fallenMesh);

    // Broken spears sticking in ground
    const spearGeo = new THREE.CylinderGeometry(0.03, 0.03, 3, 4);
    const spearMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.9 });
    const spearCount = 12;
    const spearMesh = new THREE.InstancedMesh(spearGeo, spearMat, spearCount);
    for (let i = 0; i < spearCount; i++) {
      const z = -100 - i * 100 + (Math.random() - 0.5) * 40;
      const x = (Math.random() - 0.5) * 30;
      dummy.position.set(x, 1.2, z);
      dummy.rotation.set(
        (Math.random() - 0.5) * 0.6,
        Math.random() * Math.PI,
        (Math.random() - 0.5) * 0.4
      );
      dummy.scale.setScalar(0.8 + Math.random() * 0.4);
      dummy.updateMatrix();
      spearMesh.setMatrixAt(i, dummy.matrix);
    }
    spearMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(spearMesh);

    // Blood pools on ground
    const poolGeo = new THREE.CircleGeometry(0.8, 8);
    poolGeo.rotateX(-Math.PI / 2);
    const poolMat = new THREE.MeshBasicMaterial({
      color: 0x3a1a1a, transparent: true, opacity: 0.25, depthWrite: false,
    });
    const poolCount = 8;
    const poolMesh = new THREE.InstancedMesh(poolGeo, poolMat, poolCount);
    for (let i = 0; i < poolCount; i++) {
      const z = -150 - i * 140 + (Math.random() - 0.5) * 30;
      const x = (Math.random() - 0.5) * 20;
      dummy.position.set(x, 0.02, z);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.scale.setScalar(0.5 + Math.random() * 1.0);
      dummy.updateMatrix();
      poolMesh.setMatrixAt(i, dummy.matrix);
    }
    poolMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(poolMesh);

    // Broken cart at z=-400
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.95 });
    const cartBase = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 2), woodMat);
    cartBase.position.set(-12, 0.4, -400);
    cartBase.rotation.z = 0.3;
    this.scene.add(cartBase);
    const cartSide = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 2), woodMat);
    cartSide.position.set(-13.3, 0.7, -400);
    cartSide.rotation.z = 0.5;
    this.scene.add(cartSide);
    const cartWheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.6, 0.08, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.9 })
    );
    cartWheel.position.set(-10.5, 0.6, -399);
    cartWheel.rotation.y = Math.PI / 2;
    this.scene.add(cartWheel);

    // Fallen logs in the narrow choke (z -600 to -1000)
    const logMat = new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 0.95 });
    const log1 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.35, 8, 6), logMat);
    log1.position.set(5, 0.35, -700);
    log1.rotation.z = Math.PI / 2;
    this.scene.add(log1);
    const log2 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 6, 6), logMat);
    log2.position.set(-8, 0.3, -950);
    log2.rotation.z = Math.PI / 2;
    log2.rotation.y = 0.3;
    this.scene.add(log2);
  }

  private createDustMotes() {
    const geo = new THREE.PlaneGeometry(0.06, 0.06);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffd080, transparent: true, opacity: 0.25,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this.dustMoteMesh = new THREE.InstancedMesh(geo, mat, this.dustMoteCount);
    for (let i = 0; i < this.dustMoteCount; i++) {
      this.dustMoteData.push({
        x: (Math.random() - 0.5) * 40,
        y: 0.5 + Math.random() * 4,
        z: (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 0.3,
        vy: 0.15 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
      });
      this.dustMoteDummy.position.set(this.dustMoteData[i].x, this.dustMoteData[i].y, this.dustMoteData[i].z);
      this.dustMoteDummy.updateMatrix();
      this.dustMoteMesh.setMatrixAt(i, this.dustMoteDummy.matrix);
    }
    this.dustMoteMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.dustMoteMesh);
  }

  private createBattlefieldLandmarks(gapWidth: number) {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.95 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x8a6b3f, roughness: 0.9 });
    const saffronMat = new THREE.MeshStandardMaterial({
      color: 0xff6a00,
      emissive: 0xff3b00,
      emissiveIntensity: 0.25,
      roughness: 0.75,
      side: THREE.DoubleSide,
    });
    const enemyBannerMat = new THREE.MeshStandardMaterial({
      color: 0x14301f,
      emissive: 0x07140d,
      emissiveIntensity: 0.2,
      roughness: 0.85,
      side: THREE.DoubleSide,
    });

    const landmarkZ = [-160, -430, -720, -1010];
    for (let i = 0; i < landmarkZ.length; i++) {
      const z = landmarkZ[i];
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (gapWidth * 0.28);

      const tripod = new THREE.Group();
      for (let leg = 0; leg < 3; leg++) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 5.5, 5), woodMat);
        pole.position.y = 2.4;
        pole.rotation.z = (leg - 1) * 0.22;
        pole.rotation.y = (leg / 3) * Math.PI * 2;
        tripod.add(pole);
      }
      const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.8, 5), ropeMat);
      cross.position.y = 4.6;
      cross.rotation.z = Math.PI / 2;
      tripod.add(cross);
      tripod.position.set(x, 0, z);
      tripod.rotation.y = side > 0 ? -0.25 : 0.25;
      this.scene.add(tripod);

      const bannerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 7.5, 5), woodMat);
      bannerPole.position.set(-side * (gapWidth * 0.32), 3.6, z - 30);
      this.scene.add(bannerPole);

      const banner = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 2.1, 0.05),
        i % 2 === 0 ? saffronMat : enemyBannerMat
      );
      banner.position.set(-side * (gapWidth * 0.32) + 1.5, 6.1, z - 30);
      this.scene.add(banner);
      this.flags.push({ mesh: banner, phase: Math.random() * Math.PI * 2 });
    }

    const drumMat = new THREE.MeshStandardMaterial({ color: 0x6b3018, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd8b98a, roughness: 0.75 });
    for (let i = 0; i < 6; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = -220 - i * 150;
      const drum = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.9, 10), drumMat);
      shell.rotation.z = Math.PI / 2;
      drum.add(shell);
      const faceL = new THREE.Mesh(new THREE.CircleGeometry(0.52, 10), skinMat);
      faceL.position.x = -0.46;
      faceL.rotation.y = -Math.PI / 2;
      drum.add(faceL);
      const faceR = new THREE.Mesh(new THREE.CircleGeometry(0.52, 10), skinMat);
      faceR.position.x = 0.46;
      faceR.rotation.y = Math.PI / 2;
      drum.add(faceR);
      drum.position.set(side * (gapWidth * 0.22 + Math.random() * 4), 0.55, z);
      drum.rotation.y = Math.random() * Math.PI;
      this.scene.add(drum);
    }

    const arrowMat = new THREE.MeshStandardMaterial({ color: 0xc7a86a, roughness: 0.75 });
    const fletchMat = new THREE.MeshStandardMaterial({ color: 0xff6a00, emissive: 0x552000, emissiveIntensity: 0.2 });
    for (let i = 0; i < 26; i++) {
      const arrow = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 4), arrowMat);
      shaft.rotation.x = Math.PI / 2;
      arrow.add(shaft);
      const fletch = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 0.18), fletchMat);
      fletch.position.z = -1.0;
      arrow.add(fletch);
      arrow.position.set((Math.random() - 0.5) * (gapWidth * 0.65), 0.25, -120 - Math.random() * 1050);
      arrow.rotation.set(-0.8 + Math.random() * 0.35, Math.random() * Math.PI, 0.15 - Math.random() * 0.3);
      this.scene.add(arrow);
    }
  }

  private createStageGateways(gapWidth: number) {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5f4a3a, roughness: 0.95 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xa66a2a, roughness: 0.85 });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xff7a1a,
      emissive: 0xff3b0a,
      emissiveIntensity: 2.2,
      transparent: true,
      opacity: 0.9,
    });
    const bannerColors = [0xff7a00, 0xb91c1c, 0xfacc15];
    const stageZ = [-300, -690, -1080];

    stageZ.forEach((z, idx) => {
      const group = new THREE.Group();
      const width = gapWidth * 0.72;
      for (const side of [-1, 1]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 7.5 + idx * 1.2, 2.2), stoneMat);
        pillar.position.set(side * width * 0.5, 3.75 + idx * 0.6, 0);
        pillar.receiveShadow = true;
        group.add(pillar);

        const cap = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.8, 3.0), trimMat);
        cap.position.set(side * width * 0.5, 7.8 + idx * 1.2, 0);
        group.add(cap);

        const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 0.45, 8), trimMat);
        brazier.position.set(side * width * 0.5, 8.45 + idx * 1.2, 0);
        group.add(brazier);

        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 8), flameMat);
        flame.position.set(side * width * 0.5, 9.1 + idx * 1.2, 0);
        group.add(flame);

        if (!this.isMobile) {
          const light = new THREE.PointLight(0xff7a22, 45 + idx * 20, 28);
          light.position.copy(flame.position);
          group.add(light);
        }
      }

      const lintel = new THREE.Mesh(new THREE.BoxGeometry(width + 4, 1.0, 2.5), stoneMat);
      lintel.position.set(0, 7.8 + idx * 1.2, 0);
      group.add(lintel);

      const bannerMat = new THREE.MeshStandardMaterial({
        color: bannerColors[idx],
        emissive: bannerColors[idx],
        emissiveIntensity: 0.2 + idx * 0.12,
        roughness: 0.8,
        side: THREE.DoubleSide,
      });
      const banner = new THREE.Mesh(new THREE.BoxGeometry(5 + idx, 2.1, 0.08), bannerMat);
      banner.position.set(0, 6.15 + idx * 1.1, -0.2);
      group.add(banner);
      this.flags.push({ mesh: banner, phase: Math.random() * Math.PI * 2 });

      const ringGeo = new THREE.RingGeometry(4.5 + idx, 4.8 + idx, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ring = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({
          color: bannerColors[idx],
          transparent: true,
          opacity: 0.18,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      ring.position.y = 0.08;
      group.add(ring);

      group.position.set(0, 0, z);
      this.scene.add(group);
    });
  }

  private spawnTorches(gapWidth: number) {
    const torchPoleMat = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.9 });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff4400,
      emissiveIntensity: 2.0,
      transparent: true,
      opacity: 0.9,
    });

    for (let i = 0; i < 20; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const z = -1200 + i * 130 + (Math.random() - 0.5) * 30;
      const xPos = side * (gapWidth * 0.5 + 5);

      // Torch pole
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.15, 4, 6),
        torchPoleMat
      );
      pole.position.set(xPos, 2, z);
      this.scene.add(pole);

      // Flame planes (2-3 overlapping for volume)
      for (let f = 0; f < 3; f++) {
        const flame = new THREE.Mesh(
          new THREE.PlaneGeometry(0.6, 0.9),
          flameMat
        );
        flame.position.set(xPos, 4.3 + f * 0.1, z);
        flame.rotation.y = (f / 3) * Math.PI;
        this.scene.add(flame);
      }

      // Point light
      const baseIntensity = 40 + Math.random() * 20;
      const light = new THREE.PointLight(0xff8833, baseIntensity, 25);
      light.position.set(xPos, 4.5, z);
      this.scene.add(light);

      this.torches.push({
        light,
        baseIntensity,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private createEmbers(): THREE.InstancedMesh {
    const geo = new THREE.PlaneGeometry(0.15, 0.15);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff6622,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, this.emberCount);

    for (let i = 0; i < this.emberCount; i++) {
      const data = {
        x: (Math.random() - 0.5) * 40,
        y: Math.random() * 15,
        z: -Math.random() * 200,
        speed: 1 + Math.random() * 2,
        swayPhase: Math.random() * Math.PI * 2,
      };
      this.emberData.push(data);

      this.emberDummy.position.set(data.x, data.y, data.z);
      this.emberDummy.rotation.set(Math.random(), Math.random(), Math.random());
      this.emberDummy.updateMatrix();
      mesh.setMatrixAt(i, this.emberDummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.scene.add(mesh);
    return mesh;
  }

  private createFireflies(): THREE.InstancedMesh {
    const geo = new THREE.SphereGeometry(0.08, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xccff66,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, this.fireflyCount);
    for (let i = 0; i < this.fireflyCount; i++) {
      this.fireflyData.push({
        x: (Math.random() - 0.5) * 30,
        y: 1 + Math.random() * 4,
        z: -Math.random() * 100,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.5,
      });
      this.emberDummy.position.set(this.fireflyData[i].x, this.fireflyData[i].y, this.fireflyData[i].z);
      this.emberDummy.updateMatrix();
      mesh.setMatrixAt(i, this.emberDummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.scene.add(mesh);
    return mesh;
  }

  public update(delta: number, playerPos: THREE.Vector3) {
    this.torchTime += delta;

    // Flicker torches
    for (const torch of this.torches) {
      const flicker = Math.sin(this.torchTime * 8 + torch.phase) * 0.3 +
                      Math.sin(this.torchTime * 13 + torch.phase * 2.7) * 0.2;
      torch.light.intensity = torch.baseIntensity * (1 + flicker);
    }

    // Update embers
    for (let i = 0; i < this.emberCount; i++) {
      const d = this.emberData[i];
      d.y += d.speed * delta;
      d.x += Math.sin(this.torchTime * 1.5 + d.swayPhase) * 0.5 * delta;

      // Wrap: reset when above Y=15
      if (d.y > 15) {
        d.y = 0;
        d.x = playerPos.x + (Math.random() - 0.5) * 40;
        d.z = playerPos.z + (Math.random() - 0.5) * 40;
      }

      this.emberDummy.position.set(d.x, d.y, d.z);
      this.emberDummy.rotation.z = this.torchTime * 2 + d.swayPhase;
      this.emberDummy.updateMatrix();
      this.emberMesh.setMatrixAt(i, this.emberDummy.matrix);
    }
    this.emberMesh.instanceMatrix.needsUpdate = true;

    // Animate fireflies
    if (this.fireflyMesh) {
      for (let i = 0; i < this.fireflyCount; i++) {
        const f = this.fireflyData[i];
        f.x += Math.sin(this.torchTime * 0.5 + f.phase) * 0.3 * delta;
        f.y += Math.sin(this.torchTime * 0.8 + f.phase * 1.3) * 0.2 * delta;
        f.z += Math.cos(this.torchTime * 0.3 + f.phase * 0.7) * 0.2 * delta;
        // Keep near player
        if (Math.abs(f.z - playerPos.z) > 60) {
          f.z = playerPos.z + (Math.random() - 0.5) * 40;
          f.x = playerPos.x + (Math.random() - 0.5) * 30;
        }
        this.emberDummy.position.set(f.x, f.y, f.z);
        // Pulsing scale for glow effect
        const pulse = 0.5 + Math.sin(this.torchTime * 3 + f.phase) * 0.5;
        this.emberDummy.scale.setScalar(pulse);
        this.emberDummy.updateMatrix();
        this.fireflyMesh.setMatrixAt(i, this.emberDummy.matrix);
      }
      this.fireflyMesh.instanceMatrix.needsUpdate = true;
    }

    // Falling leaves
    this.leafTimer -= delta;
    if (this.leafTimer <= 0 && this.leafMeshes.length < 10) {
      this.leafTimer = 1 + Math.random() * 2;
      const leafMat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0x8a6a30 : 0x5a7a2a,
        transparent: true, opacity: 0.7, side: THREE.DoubleSide,
      });
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25), leafMat);
      const side = Math.random() > 0.5 ? 1 : -1;
      leaf.position.set(
        playerPos.x + side * (25 + Math.random() * 10),
        40 + Math.random() * 30,
        playerPos.z + (Math.random() - 0.5) * 40
      );
      this.scene.add(leaf);
      this.leafMeshes.push({
        mesh: leaf,
        vel: new THREE.Vector3((Math.random() - 0.5) * 2, -1 - Math.random(), (Math.random() - 0.5) * 1),
        rotSpeed: new THREE.Vector3(Math.random() * 2, Math.random() * 3, Math.random() * 2),
        life: 8,
      });
    }
    this.leafMeshes = this.leafMeshes.filter(l => {
      l.life -= delta;
      l.mesh.position.addScaledVector(l.vel, delta);
      l.vel.x += Math.sin(this.torchTime + l.rotSpeed.y) * 0.5 * delta;
      l.mesh.rotation.x += l.rotSpeed.x * delta;
      l.mesh.rotation.y += l.rotSpeed.y * delta;
      if (l.life <= 0 || l.mesh.position.y < 0) {
        this.scene.remove(l.mesh);
        return false;
      }
      return true;
    });

    // Animate battle flags — enhanced ripple
    for (const f of this.flags) {
      const t = this.torchTime;
      f.mesh.rotation.y = Math.sin(t * 2 + f.phase) * 0.2;
      f.mesh.rotation.z = Math.sin(t * 3.5 + f.phase * 1.3) * 0.06;
      f.mesh.scale.x = 1 + Math.sin(t * 3 + f.phase) * 0.12;
      // Vertical flutter
      f.mesh.position.y += Math.sin(t * 4 + f.phase) * 0.002;
    }

    // Update stream/waterfall time
    if (this.streamMaterial) {
      this.streamMaterial.uniforms.uTime.value = this.torchTime;
    }
    for (const wfMat of this.waterfallMaterials) {
      wfMat.uniforms.uTime.value = this.torchTime;
    }

    // Animate dust motes
    for (let i = 0; i < this.dustMoteCount; i++) {
      const d = this.dustMoteData[i];
      d.y += d.vy * delta;
      d.x += Math.sin(this.torchTime * 0.7 + d.phase) * d.vx * delta;
      d.z += Math.cos(this.torchTime * 0.5 + d.phase * 1.3) * 0.15 * delta;

      // Recycle when too high or too far from player
      if (d.y > 6 || Math.abs(d.x - playerPos.x) > 25 || Math.abs(d.z - playerPos.z) > 25) {
        d.x = playerPos.x + (Math.random() - 0.5) * 40;
        d.y = 0.3 + Math.random() * 1.5;
        d.z = playerPos.z + (Math.random() - 0.5) * 40;
      }

      this.dustMoteDummy.position.set(d.x, d.y, d.z);
      this.dustMoteDummy.rotation.z = this.torchTime + d.phase;
      this.dustMoteDummy.updateMatrix();
      this.dustMoteMesh.setMatrixAt(i, this.dustMoteDummy.matrix);
    }
    this.dustMoteMesh.instanceMatrix.needsUpdate = true;
  }

  public updateTimeOfDay(progress: number, delta: number) {
    // progress: 0 = start, 1 = end of game

    // Dynamic fog
    const fogStartColor = new THREE.Color(0xd8b898);
    const fogEndColor = new THREE.Color(0xb07060);
    this.fog.color.copy(fogStartColor).lerp(fogEndColor, progress * 0.5);
    this.fog.density = 0.0018 + progress * 0.001;

    // Lights — every frame (cheap)
    this.hemiLight.intensity = 1.6 - progress * 0.7;
    this.sunLight.intensity = 2.5 - progress * 1.1;
    this.sunLight.color.setHex(0xffe8c0).lerp(new THREE.Color(0xff8844), progress);
    (this.scene.background as THREE.Color).set(0xd8b888).lerp(new THREE.Color(0x804838), progress);

    // Sun disc: lower and redden
    this.sunDisc.position.y = 80 - progress * 50;
    (this.sunDisc.material as THREE.MeshBasicMaterial).color.set(0xffd080).lerp(new THREE.Color(0xff4020), progress);
    this.sunGlow.position.y = this.sunDisc.position.y;

    // Sky dome vertex colors — throttled (every 3 seconds)
    this.skyUpdateTimer -= delta;
    if (this.skyUpdateTimer <= 0) {
      this.skyUpdateTimer = 3.0;
      const colAttr = this.skyMesh.geometry.getAttribute('color') as THREE.BufferAttribute;
      const arr = colAttr.array as Float32Array;
      for (let i = 0; i < arr.length; i++) {
        arr[i] = this.skyStartColors[i] + (this.skyEndColors[i] - this.skyStartColors[i]) * progress;
      }
      colAttr.needsUpdate = true;
    }
  }

  private spawnTeammates() {
    const mGeo = new THREE.CapsuleGeometry(0.4, 1.0, 4, 8);
    const mMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const teamMesh = new THREE.InstancedMesh(mGeo, mMat, 45);
    const d = new THREE.Object3D();
    for (let i = 0; i < 45; i++) {
      const col = i % 15;
      const row = Math.floor(i / 15);
      d.position.set((col - 7.5) * 3, 1.0, 20 + row * 6);
      d.updateMatrix();
      teamMesh.setMatrixAt(i, d.matrix);
    }
    teamMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(teamMesh);
  }

  private spawnWallGuards() {
    const allyMat = new THREE.MeshStandardMaterial({ color: 0xd6c7b2, roughness: 0.9 });
    const enemyMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.9 });
    const bodyGeo = new THREE.CapsuleGeometry(0.45, 1.2, 4, 8);
    const spearGeo = new THREE.CylinderGeometry(0.05, 0.05, 3.6, 6);
    const spearMat = new THREE.MeshStandardMaterial({ color: 0x8a6b3f, roughness: 0.8 });

    const zStart = -1200;
    const zEnd = 200;
    const count = Math.floor((zEnd - zStart) / 10);

    const spawnInstancedLine = (side: number, mat: THREE.MeshStandardMaterial) => {
      const bodyMesh = new THREE.InstancedMesh(bodyGeo, mat, count);
      const spearMesh = new THREE.InstancedMesh(spearGeo, spearMat, count);
      const d = new THREE.Object3D();
      const rotY = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      for (let i = 0; i < count; i++) {
        const z = zStart + i * 10;
        // Body
        d.position.set(side * 28, 1.0, z);
        d.rotation.set(0, rotY, 0);
        d.scale.set(1, 1, 1);
        d.updateMatrix();
        bodyMesh.setMatrixAt(i, d.matrix);
        // Spear
        d.position.set(side * 28 + 0.6 * side * Math.cos(rotY), 2.0, z - 0.6 * side * Math.sin(rotY));
        d.rotation.set(0, rotY, side * 0.2);
        d.updateMatrix();
        spearMesh.setMatrixAt(i, d.matrix);
      }
      bodyMesh.instanceMatrix.needsUpdate = true;
      spearMesh.instanceMatrix.needsUpdate = true;
      this.scene.add(bodyMesh);
      this.scene.add(spearMesh);
    };

    spawnInstancedLine(-1, allyMat);
    spawnInstancedLine(1, enemyMat);
  }

  private spawnPassGates() {
    const allyMat = new THREE.MeshStandardMaterial({ color: 0xe0c7a4, roughness: 0.9 });
    const enemyMat = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.9 });
    const bodyGeo = new THREE.CapsuleGeometry(0.45, 1.2, 4, 8);
    const shieldGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.12, 8);
    const shieldMat = new THREE.MeshStandardMaterial({ color: 0x6b4f2a, roughness: 0.7 });

    const xPositions: number[] = [];
    for (let x = -18; x <= 18; x += 3) xPositions.push(x);
    const count = xPositions.length;

    const spawnGate = (z: number, mat: THREE.MeshStandardMaterial) => {
      const bodyMesh = new THREE.InstancedMesh(bodyGeo, mat, count);
      const shieldMesh = new THREE.InstancedMesh(shieldGeo, shieldMat, count);
      const d = new THREE.Object3D();
      const rotY = z > 0 ? Math.PI : 0;
      for (let i = 0; i < count; i++) {
        d.position.set(xPositions[i], 1.0, z);
        d.rotation.set(0, rotY, 0);
        d.scale.set(1, 1, 1);
        d.updateMatrix();
        bodyMesh.setMatrixAt(i, d.matrix);

        d.position.set(xPositions[i], 1.1, z + (z > 0 ? -0.4 : 0.4));
        d.rotation.set(Math.PI / 2, rotY, 0);
        d.updateMatrix();
        shieldMesh.setMatrixAt(i, d.matrix);
      }
      bodyMesh.instanceMatrix.needsUpdate = true;
      shieldMesh.instanceMatrix.needsUpdate = true;
      this.scene.add(bodyMesh);
      this.scene.add(shieldMesh);
    };

    spawnGate(this.maxZ + 12, allyMat);
    spawnGate(this.minZ - 20, enemyMat);
  }

  public spawnReinforcementLine(z: number) {
    if (this.reinforcementCount >= this.maxReinforcements) return;
    const allyMat = new THREE.MeshStandardMaterial({ color: 0xd8c2a2, roughness: 0.9 });
    const enemyMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 });
    const bodyGeo = new THREE.CapsuleGeometry(0.42, 1.1, 4, 8);
    const spearGeo = new THREE.CylinderGeometry(0.05, 0.05, 3.4, 6);
    const spearMat = new THREE.MeshStandardMaterial({ color: 0x7a5b32, roughness: 0.8 });

    const spawnSide = (side: number, mat: THREE.MeshStandardMaterial) => {
      for (let i = 0; i < 4; i++) {
        const guard = new THREE.Group();
        const body = new THREE.Mesh(bodyGeo, mat);
        body.position.y = 1.0;
        guard.add(body);
        const spear = new THREE.Mesh(spearGeo, spearMat);
        spear.position.set(0.6 * side, 2.0, 0);
        spear.rotation.z = side * 0.2;
        guard.add(spear);
        guard.position.set(side * 26, 0, z + i * 2.2);
        guard.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        this.scene.add(guard);
        this.reinforcementCount++;
      }
    };

    spawnSide(-1, allyMat);
    spawnSide(1, enemyMat);
  }

  public spawnPowerup(z: number, kind: PowerupKind = this.pickPowerupKind()): THREE.Group {
    const group = new THREE.Group();
    const info = this.getPowerupInfo(kind);
    group.userData.powerupKind = kind;
    group.userData.powerupName = info.name;
    group.userData.powerupEffect = info.effect;
    group.userData.powerupColor = info.color;

    const auraColor = parseInt(info.color.slice(1), 16);
    const aura = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.05, 8, 24),
      new THREE.MeshBasicMaterial({ color: auraColor, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending })
    );
    aura.rotation.x = Math.PI / 2;
    aura.position.y = 0.5;
    aura.userData.spin = 2.5;

    if (kind === 'amrut') {
      const jarMat = new THREE.MeshStandardMaterial({
        color: 0xff8800,
        emissive: 0xff4400,
        emissiveIntensity: 2.5,
        metalness: 0.15,
        roughness: 0.35,
      });
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.9, 10), jarMat);
      jar.position.y = 0.5;
      group.add(jar);

      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.34, 0),
        new THREE.MeshStandardMaterial({ color: 0x7cffc4, emissive: 0x18ff9a, emissiveIntensity: 2.8, roughness: 0.2 })
      );
      gem.position.y = 1.25;
      gem.userData.float = true;
      group.add(gem);
    } else if (kind === 'utsah') {
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x2f6f36, emissive: 0x0a3f16, emissiveIntensity: 0.3, roughness: 0.7 });
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x8cff66, emissive: 0x2fff40, emissiveIntensity: 1.6, roughness: 0.45 });
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.85, 7), stemMat);
      stem.position.y = 0.45;
      group.add(stem);
      for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.75, 5), leafMat);
        leaf.position.set(Math.cos(i * 1.26) * 0.25, 0.82, Math.sin(i * 1.26) * 0.25);
        leaf.rotation.z = Math.PI / 2.5;
        leaf.rotation.y = i * 1.26;
        leaf.userData.float = true;
        group.add(leaf);
      }
    } else if (kind === 'parakram') {
      const flameMat = new THREE.MeshStandardMaterial({
        color: 0xff4a1c,
        emissive: 0xff1800,
        emissiveIntensity: 3.2,
        roughness: 0.35,
      });
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.25, 9), flameMat);
      flame.position.y = 0.85;
      flame.userData.float = true;
      group.add(flame);
      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 0),
        new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
      );
      core.position.y = 0.82;
      core.userData.float = true;
      group.add(core);
    } else {
      const shield = new THREE.Group();
      const face = new THREE.Mesh(
        new THREE.CylinderGeometry(0.48, 0.48, 0.16, 18),
        new THREE.MeshStandardMaterial({ color: 0x3a4d7a, metalness: 0.45, roughness: 0.35, emissive: 0x061a44, emissiveIntensity: 0.5 })
      );
      face.rotation.x = Math.PI / 2;
      shield.add(face);
      const boss = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.22, emissive: 0x8a5a00, emissiveIntensity: 0.4 })
      );
      boss.position.z = 0.12;
      shield.add(boss);
      shield.position.y = 0.8;
      shield.userData.float = true;
      group.add(shield);
    }

    group.add(aura);

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.95, 24),
      new THREE.MeshBasicMaterial({ color: auraColor, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.08;
    halo.userData.pulse = true;
    group.add(halo);

    const light = new THREE.PointLight(auraColor, 90, 30);
    light.position.y = 1.1;
    group.add(light);

    const label = this.createPowerupLabel(info);
    group.add(label);

    group.position.set((Math.random() - 0.5) * 35, 0.6, z);

    this.scene.add(group);
    return group;
  }

  public spawnHerb(z: number): THREE.Group {
    return this.spawnPowerup(z, 'amrut');
  }

  private pickPowerupKind(): PowerupKind {
    const roll = Math.random();
    if (roll < 0.38) return 'amrut';
    if (roll < 0.65) return 'utsah';
    if (roll < 0.86) return 'parakram';
    return 'dhal';
  }

  private getPowerupInfo(kind: PowerupKind): PowerupInfo {
    if (kind === 'utsah') {
      return { kind, name: 'Utsah Herb', effect: 'Full stamina + dodge ready', color: '#8cff66' };
    }
    if (kind === 'parakram') {
      return { kind, name: 'Parakram Flame', effect: '+50 Valor charge', color: '#ff4a1c' };
    }
    if (kind === 'dhal') {
      return { kind, name: 'Dhal Ward', effect: '+25 HP + shield stamina', color: '#7fb3ff' };
    }
    return { kind, name: 'Amrut Kalash', effect: '+40 HP + full stamina', color: '#7cffc4' };
  }

  private createPowerupLabel(info: PowerupInfo): THREE.Sprite {
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 288;
    labelCanvas.height = 104;
    const ctx = labelCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(10, 6, 2, 0.76)';
      ctx.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
      ctx.strokeStyle = info.color;
      ctx.lineWidth = 4;
      ctx.strokeRect(3, 3, labelCanvas.width - 6, labelCanvas.height - 6);
      ctx.fillStyle = '#fff4c2';
      ctx.font = '700 25px serif';
      ctx.textAlign = 'center';
      ctx.fillText(info.name.toUpperCase(), 144, 38);
      ctx.fillStyle = info.color;
      ctx.font = '700 19px sans-serif';
      ctx.fillText(info.effect.toUpperCase(), 144, 72);
    }
    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({
      map: labelTexture,
      transparent: true,
      depthWrite: false,
    }));
    label.scale.set(4.5, 1.65, 1);
    label.position.y = 2.25;
    return label;
  }

  public getArrowBlockers() {
    return this.arrowBlockers;
  }
}
