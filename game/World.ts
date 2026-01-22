
import * as THREE from 'three';

export class World {
  private scene: THREE.Scene;
  private reinforcementCount = 0;
  private maxReinforcements = 24;
  private minZ = -1300;
  private maxZ = 80;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    this.scene.background = new THREE.Color(0x6a5c4e);

    const hemiLight = new THREE.HemisphereLight(0xfcebd3, 0x3b4654, 0.9);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffe2b3, 1.6);
    sunLight.position.set(-120, 180, -200);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(4096, 4096);
    scene.add(sunLight);

    const skyGeo = new THREE.SphereGeometry(2000, 32, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x9a8571,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    const gapWidth = 70;
    const groundGeo = new THREE.PlaneGeometry(gapWidth, 3400, 90, 420);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x4b3b2a,
      roughness: 1.0,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Sculpt a rocky trail
    const groundPos = groundGeo.attributes.position;
    for (let i = 0; i < groundPos.count; i++) {
      const x = groundPos.getX(i);
      const z = groundPos.getZ(i);
      const ridge = Math.sin(z * 0.035) * 0.6 + Math.sin(z * 0.12) * 0.2;
      const edge = Math.abs(x) / (gapWidth * 0.5);
      const rockiness = Math.sin(z * 0.18 + x * 0.3) * 0.25;
      const height = ridge - edge * 1.2 + rockiness;
      groundPos.setY(i, height);
    }
    groundGeo.computeVertexNormals();

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x2c2520,
      roughness: 0.95,
      metalness: 0.05,
    });
    const createCliff = (side: number) => {
      for (let z = -1800; z < 700; z += 130) {
        const width = 60 + Math.random() * 40;
        const height = 140 + Math.random() * 80;
        const depth = 120 + Math.random() * 60;
        const wall = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
        wall.position.set(side * (gapWidth * 0.5 + 22 + Math.random() * 10), height * 0.45, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        this.scene.add(wall);
      }
    };
    createCliff(1);
    createCliff(-1);

    // Scatter boulders along the path
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x3b3027, roughness: 0.9 });
    for (let i = 0; i < 120; i++) {
      const size = 0.6 + Math.random() * 1.8;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), rockMat);
      const x = (Math.random() - 0.5) * (gapWidth - 8);
      const z = -Math.random() * 1400 + 120;
      rock.position.set(x, 0.3 + Math.random() * 0.6, z);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }

    // Distant fort silhouette
    const fortMat = new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 1.0 });
    const fortBase = new THREE.Mesh(new THREE.BoxGeometry(90, 30, 40), fortMat);
    fortBase.position.set(0, 45, -1400);
    this.scene.add(fortBase);
    const fortTower = new THREE.Mesh(new THREE.BoxGeometry(20, 50, 20), fortMat);
    fortTower.position.set(0, 70, -1400);
    this.scene.add(fortTower);

    this.spawnTeammates();
    this.spawnWallGuards();
    this.spawnPassGates();
    scene.fog = new THREE.FogExp2(0x7b6a58, 0.0042);
  }

  private spawnTeammates() {
    const mGeo = new THREE.CapsuleGeometry(0.4, 1.0, 4, 8);
    const mMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    for (let i = 0; i < 45; i++) {
        const m = new THREE.Group();
        m.add(new THREE.Mesh(mGeo, mMat));
        const col = i % 15;
        const row = Math.floor(i / 15);
        m.position.set((col - 7.5) * 3, 0, 20 + row * 6);
        this.scene.add(m);
    }
  }

  private spawnWallGuards() {
    const allyMat = new THREE.MeshStandardMaterial({ color: 0xd6c7b2, roughness: 0.9 });
    const enemyMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.9 });
    const bodyGeo = new THREE.CapsuleGeometry(0.45, 1.2, 4, 8);
    const spearGeo = new THREE.CylinderGeometry(0.05, 0.05, 3.6, 6);
    const spearMat = new THREE.MeshStandardMaterial({ color: 0x8a6b3f, roughness: 0.8 });

    const spawnLine = (side: number, mat: THREE.MeshStandardMaterial, zStart: number, zEnd: number) => {
      for (let z = zStart; z < zEnd; z += 10) {
        const guard = new THREE.Group();
        const body = new THREE.Mesh(bodyGeo, mat);
        body.position.y = 1.0;
        guard.add(body);

        const spear = new THREE.Mesh(spearGeo, spearMat);
        spear.position.set(0.6 * side, 2.0, 0);
        spear.rotation.z = side * 0.2;
        guard.add(spear);

        guard.position.set(side * 28, 0, z);
        guard.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        this.scene.add(guard);
      }
    };

    spawnLine(-1, allyMat, -1200, 200);
    spawnLine(1, enemyMat, -1200, 200);
  }

  private spawnPassGates() {
    const allyMat = new THREE.MeshStandardMaterial({ color: 0xe0c7a4, roughness: 0.9 });
    const enemyMat = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.9 });
    const bodyGeo = new THREE.CapsuleGeometry(0.45, 1.2, 4, 8);
    const shieldGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.12, 12);
    const shieldMat = new THREE.MeshStandardMaterial({ color: 0x6b4f2a, roughness: 0.7 });

    const spawnGate = (z: number, mat: THREE.MeshStandardMaterial) => {
      for (let x = -18; x <= 18; x += 3) {
        const guard = new THREE.Group();
        const body = new THREE.Mesh(bodyGeo, mat);
        body.position.y = 1.0;
        guard.add(body);

        const shield = new THREE.Mesh(shieldGeo, shieldMat);
        shield.rotation.x = Math.PI / 2;
        shield.position.set(0, 1.1, 0.4);
        guard.add(shield);

        guard.position.set(x, 0, z);
        guard.rotation.y = z > 0 ? Math.PI : 0;
        this.scene.add(guard);
      }
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

  public spawnHerb(z: number): THREE.Group {
    const group = new THREE.Group();
    // Amrut Jar Visual
    const jar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.5, 0.9, 8),
        new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff4400, emissiveIntensity: 3 })
    );
    jar.position.y = 0.5;
    group.add(jar);

    const aura = new THREE.Mesh(
        new THREE.TorusGeometry(0.8, 0.05, 8, 16),
        new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.5 })
    );
    aura.rotation.x = Math.PI / 2;
    aura.position.y = 0.5;
    group.add(aura);

    const light = new THREE.PointLight(0xffaa00, 60, 25);
    group.add(light);
    
    group.position.set((Math.random() - 0.5) * 35, 0.6, z);
    
    // Add logic to rotate jar in engine if needed, or just let it stay
    this.scene.add(group);
    return group;
  }
}
