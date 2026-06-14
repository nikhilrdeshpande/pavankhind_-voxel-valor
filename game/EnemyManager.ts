
import * as THREE from 'three';
import { Player } from './Player';
import { AudioManager } from './AudioManager';
import { createClothPanel, createMarathaDhal } from './ModelParts';
import { spawnTransientVfx } from './TransientVfx';
import { boostMetalReflections } from './EnvMap';

type EnemyType = 'STANDARD' | 'RUSHER' | 'SHIELDER' | 'ARCHER' | 'BRUTE' | 'BOSS';

class Enemy {
  public mesh: THREE.Group;
  private player: Player;
  private audio: AudioManager;
  private scene: THREE.Scene;
  private health: number;
  private maxHealth: number;
  private speed: number;
  private attackCooldown = 0;
  private isDead = false;
  private hitFlash = 0;
  private onKilled: () => void;
  private onHit: (pos: THREE.Vector3, isLethal: boolean) => void;
  private onArcherWindup: () => void;
  private circleAngle: number;
  private circleDir: number;
  private type: EnemyType;

  private healthBar: THREE.Mesh;
  private weaponPivot: THREE.Group;
  private lookTarget = new THREE.Object3D();
  private shieldStamina = 100;
  private shieldBrokenTimer = 0;
  private rangedCooldown = 0;
  private rangedWindup = 0;
  private shieldBar: THREE.Mesh | null = null;
  private bossChargeTimer = 0;
  private bossChargeDir = new THREE.Vector3(0, 0, -1);
  private bossChargeHit = false;
  private strikeWindup = 0;
  private strikePending = false;
  private deathTimer = -1;
  private rusherChargeTimer = 0;
  private rusherChargeCooldown = 0;
  private bruteAoeTimer = 0;
  private bruteAoeCooldown = 0;
  private bossPhase2 = false;
  private bossGroundPoundTimer = 0;
  private staggerTimer = 0;
  private circleTimer = 0;
  private circleDashTimer = 0;
  private bossEyeLeft: THREE.Mesh | null = null;
  private bossEyeRight: THREE.Mesh | null = null;
  private bossEyeLight: THREE.PointLight | null = null;
  private aimLine: THREE.Mesh | null = null;
  private recoilVelocity = new THREE.Vector3();

  // Walk animation refs
  private legL!: THREE.Mesh;
  private legR!: THREE.Mesh;
  private body!: THREE.Mesh;
  private walkCycleAnim = 0;
  private lastPos = new THREE.Vector3();
  private animTime = 0;

  // Attack wind-up tell
  private dangerRing: THREE.Mesh;
  // Boss aura
  private bossAuraRing: THREE.Mesh | null = null;

  constructor(
    scene: THREE.Scene,
    player: Player,
    audio: AudioManager,
    startPos: THREE.Vector3,
    difficulty: number,
    onKilled: () => void,
    onHit: (pos: THREE.Vector3, isLethal: boolean) => void,
    onArcherWindup: () => void,
    type: EnemyType
  ) {
    this.scene = scene;
    this.player = player;
    this.audio = audio;
    this.onKilled = onKilled;
    this.onHit = onHit;
    this.onArcherWindup = onArcherWindup;
    this.type = type;
    this.circleAngle = Math.random() * Math.PI * 2;
    this.circleDir = Math.random() < 0.5 ? 1 : -1;
    this.circleTimer = Math.random() * 1.5; // stagger initial dash timing

    if (this.type === 'RUSHER') {
      this.speed = 7.5 + difficulty * 1.1;
      this.maxHealth = 165 + difficulty * 30;
    } else if (this.type === 'ARCHER') {
      this.speed = 4.5 + difficulty * 0.5;
      this.maxHealth = 180 + difficulty * 25;
    } else if (this.type === 'BRUTE') {
      this.speed = 3.2 + difficulty * 0.4;
      this.maxHealth = 520 + difficulty * 70;
    } else if (this.type === 'BOSS') {
      this.speed = 2.8 + difficulty * 0.3;
      this.maxHealth = 900 + difficulty * 120;
    } else if (this.type === 'SHIELDER') {
      this.speed = 4.2 + difficulty * 0.6;
      this.maxHealth = 420 + difficulty * 60;
    } else {
      this.speed = 5.0 + difficulty * 0.8;
      this.maxHealth = 260 + difficulty * 40;
    }
    this.health = this.maxHealth;

    this.mesh = new THREE.Group();

    // --- Body (distinct color + scale per type) ---
    const bodyColor =
      this.type === 'RUSHER'   ? 0x4a2a1a :
      this.type === 'ARCHER'   ? 0x2a4a2a :
      this.type === 'BOSS'     ? 0x3a1f14 :
      this.type === 'BRUTE'    ? 0x1a1210 :
      this.type === 'SHIELDER' ? 0x111111 :
                                  0x1a1a1a;
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor });
    if (this.type === 'BOSS') {
      bodyMat.emissive.setHex(0x3a1208);
      bodyMat.emissiveIntensity = 0.4;
    }
    // Type-specific body geometry
    let bodyGeo: THREE.BoxGeometry;
    if (this.type === 'RUSHER') {
      bodyGeo = new THREE.BoxGeometry(0.6, 1.1, 0.4);
    } else if (this.type === 'ARCHER') {
      bodyGeo = new THREE.BoxGeometry(0.65, 1.3, 0.4);
    } else if (this.type === 'BRUTE') {
      bodyGeo = new THREE.BoxGeometry(0.9, 0.8, 0.6);
    } else if (this.type === 'BOSS') {
      bodyGeo = new THREE.BoxGeometry(0.8, 1.3, 0.5);
    } else {
      bodyGeo = new THREE.BoxGeometry(0.8, 1.3, 0.5);
    }
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.05;
    if (this.type === 'BOSS') {
      body.scale.set(1.5, 1.5, 1.5);
    }
    this.mesh.add(body);
    this.body = body;

    // Brute belly (second torso block for bulk)
    if (this.type === 'BRUTE') {
      const bellyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.9 });
      const belly = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.65), bellyMat);
      belly.position.set(0, 0.6, 0);
      this.mesh.add(belly);
    }

    // Archer hood
    if (this.type === 'ARCHER') {
      const hoodMat = new THREE.MeshStandardMaterial({ color: 0x1a3a1a, roughness: 0.85 });
      const hood = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.4), hoodMat);
      hood.position.set(0, 2.05, -0.15);
      hood.rotation.x = 0.2;
      this.mesh.add(hood);
      const scarf = createClothPanel(0.5, 0.55, 0x224a22, 0xd6a84a);
      scarf.position.set(0, 1.55, 0.34);
      scarf.rotation.x = -0.12;
      this.mesh.add(scarf);
    }

    // --- Headgear (Sultanate turban or pointed helmet) ---
    if (this.type === 'RUSHER') {
      // Pointed helmet for rushers
      const helmet = new THREE.Mesh(
        new THREE.ConeGeometry(0.2, 0.4, 6),
        new THREE.MeshStandardMaterial({ color: 0x7a3b16, metalness: 0.8 })
      );
      helmet.position.y = 2.2;
      this.mesh.add(helmet);
      const runnerSash = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.6, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xff3b1f, emissive: 0x661000, emissiveIntensity: 0.25, roughness: 0.7 })
      );
      runnerSash.position.set(0.22, 1.05, 0.32);
      runnerSash.rotation.z = 0.45;
      this.mesh.add(runnerSash);
    } else {
      // Flat-topped Sultanate turban
      const turbanColor = this.type === 'BOSS' ? 0x1a3a1a : 0x1a2a1a;
      const turbanMat = new THREE.MeshStandardMaterial({ color: turbanColor, roughness: 0.8 });
      const turbanBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.15, 8), turbanMat);
      turbanBase.position.y = 2.15;
      this.mesh.add(turbanBase);
      const turbanTop = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.12, 8), turbanMat);
      turbanTop.position.y = 2.28;
      this.mesh.add(turbanTop);
      // Turban wrap tail
      const turbanTail = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.3, 0.05),
        turbanMat
      );
      turbanTail.position.set(0, 2.0, -0.25);
      this.mesh.add(turbanTail);
    }

    // --- Glowing Eyes ---
    const eyeColor = this.type === 'ARCHER' ? 0x44ff44 :
                     this.type === 'BOSS' ? 0xff6600 : 0xff3300;
    const eyeIntensity = this.type === 'BOSS' ? 2.0 : 1.2;
    const eyeMat = new THREE.MeshStandardMaterial({
      color: eyeColor, emissive: eyeColor, emissiveIntensity: eyeIntensity,
    });
    const eyeSize = this.type === 'BOSS' ? 0.08 : 0.05;
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(eyeSize, eyeSize * 0.6, eyeSize * 0.5), eyeMat);
    eyeL.position.set(-0.12, 1.95, 0.28);
    this.mesh.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(eyeSize, eyeSize * 0.6, eyeSize * 0.5), eyeMat);
    eyeR.position.set(0.12, 1.95, 0.28);
    this.mesh.add(eyeR);

    // --- Legs (simple pillars) ---
    const legColor = bodyColor;
    const legMat = new THREE.MeshStandardMaterial({ color: legColor, roughness: 0.9 });
    const legScale = this.type === 'BOSS' ? 1.3 : this.type === 'BRUTE' ? 1.1 : 1.0;
    const legSpread = this.type === 'SHIELDER' ? 0.3 : 0.2;
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2 * legScale, 0.6, 0.2 * legScale), legMat);
    legL.position.set(-legSpread, 0.3, 0);
    this.mesh.add(legL);
    this.legL = legL;
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.2 * legScale, 0.6, 0.2 * legScale), legMat);
    legR.position.set(legSpread, 0.3, 0);
    this.mesh.add(legR);
    this.legR = legR;

    // --- Cloth band (type identification) ---
    const bandColor = this.type === 'RUSHER' ? 0xcc4400 :
                      this.type === 'ARCHER' ? 0x228844 :
                      this.type === 'SHIELDER' ? 0x2244aa :
                      this.type === 'BRUTE' ? 0x882200 :
                      this.type === 'BOSS' ? 0xaa6600 : 0x664422;
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.12, 0.55),
      new THREE.MeshStandardMaterial({ color: bandColor, roughness: 0.8 })
    );
    band.position.set(0, 0.7, 0);
    this.mesh.add(band);

    // --- Weapon ---
    this.weaponPivot = new THREE.Group();
    this.weaponPivot.position.set(0.6, 1.4, 0);
    if (this.type === 'ARCHER') {
      const bow = new THREE.Mesh(
        new THREE.TorusGeometry(0.6, 0.08, 6, 12, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0x5b3b22, roughness: 0.8 })
      );
      bow.rotation.z = Math.PI / 2;
      bow.position.y = 0.2;
      this.weaponPivot.add(bow);
      const string = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 1.08, 0.025),
        new THREE.MeshBasicMaterial({ color: 0xf7e7b2 })
      );
      string.position.set(0.36, 0.2, 0);
      this.weaponPivot.add(string);
      const nockedArrow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 1.2, 5),
        new THREE.MeshStandardMaterial({ color: 0xf2d28a, emissive: 0x442200, emissiveIntensity: 0.25 })
      );
      nockedArrow.rotation.x = Math.PI / 2;
      nockedArrow.position.set(0.32, 0.2, 0.25);
      this.weaponPivot.add(nockedArrow);
    } else {
      const swordColor = this.type === 'BRUTE' ? 0x444444 : 0xaaaaaa;
      const swordLen = this.type === 'BRUTE' || this.type === 'BOSS' ? 3.6 : 2.5;
      const sword = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, swordLen, 4),
          new THREE.MeshStandardMaterial({ color: swordColor, metalness: 0.9 })
      );
      sword.position.y = 0.8;
      this.weaponPivot.add(sword);
    }
    this.mesh.add(this.weaponPivot);

    // --- Arms (all types except RUSHER which has sprint-pose arms) ---
    if (this.type !== 'RUSHER') {
      const armMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.9 });
      const armScale = this.type === 'BOSS' ? 1.3 : this.type === 'BRUTE' ? 1.1 : 1.0;
      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2 * armScale, 0.7, 0.2 * armScale), armMat);
      armL.position.set(-0.55, 1.2, 0);
      this.mesh.add(armL);
      const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2 * armScale, 0.7, 0.2 * armScale), armMat);
      armR.position.set(0.55, 1.2, 0);
      this.mesh.add(armR);
    }

    // --- Type-Specific Accessories ---
    if (this.type === 'RUSHER') {
      // Arm boxes angled forward (sprinting pose)
      const rushArmMat = new THREE.MeshStandardMaterial({ color: 0x4a2a1a, roughness: 0.9 });
      const rushArmL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), rushArmMat);
      rushArmL.position.set(-0.55, 1.2, 0.2);
      rushArmL.rotation.x = -0.6;
      this.mesh.add(rushArmL);
      const rushArmR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), rushArmMat);
      rushArmR.position.set(0.55, 1.2, -0.2);
      rushArmR.rotation.x = 0.4;
      this.mesh.add(rushArmR);
      // Rusher forward lean
      body.rotation.x = -0.2;
    }

    if (this.type === 'ARCHER') {
      // Quiver on back
      const quiver = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.8, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x5b3b22, roughness: 0.8 })
      );
      quiver.position.set(0, 1.3, -0.35);
      this.mesh.add(quiver);
      const arrowBundleMat = new THREE.MeshStandardMaterial({ color: 0xd8b56a, emissive: 0x553300, emissiveIntensity: 0.25, roughness: 0.6 });
      for (let a = 0; a < 3; a++) {
        const arrow = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 4), arrowBundleMat);
        arrow.position.set(-0.06 + a * 0.06, 1.55, -0.45);
        arrow.rotation.x = 0.35;
        this.mesh.add(arrow);
      }
    }

    if (this.type === 'SHIELDER') {
      // Larger, more prominent shield with emblem
      const shield = createMarathaDhal(0x302418, 0x8a6b3f, 0x2f6fff, 1.2);
      shield.position.set(-0.55, 1.2, 0.4);
      shield.rotation.y = 0.08;
      this.mesh.add(shield);
      const helmetCrest = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.35, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x082a66, emissiveIntensity: 0.25 })
      );
      helmetCrest.position.set(0, 2.48, 0);
      this.mesh.add(helmetCrest);
    }

    if (this.type === 'BRUTE') {
      // Double shoulder pads
      const padMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.7, metalness: 0.2 });
      const padL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.35), padMat);
      padL.position.set(-0.55, 1.7, 0);
      this.mesh.add(padL);
      const padR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.35), padMat);
      padR.position.set(0.55, 1.7, 0);
      this.mesh.add(padR);
      // Chest armor plate
      const chestPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.6, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.5 })
      );
      chestPlate.position.set(0, 1.3, 0.3);
      this.mesh.add(chestPlate);
      // Mace head on weapon
      const maceHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.3 })
      );
      maceHead.position.y = 2.6;
      this.weaponPivot.add(maceHead);
      // Diagonal chain strap
      const chainMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 });
      const chain = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.6, 0.06), chainMat);
      chain.position.set(0.15, 1.3, 0.15);
      chain.rotation.z = 0.5;
      this.mesh.add(chain);
      const backSpikeMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6, roughness: 0.35 });
      for (let s = 0; s < 3; s++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 5), backSpikeMat);
        spike.position.set((s - 1) * 0.28, 1.78, -0.34);
        spike.rotation.x = -Math.PI / 2;
        this.mesh.add(spike);
      }
      const maceBandMat = new THREE.MeshStandardMaterial({ color: 0x8a6b3f, metalness: 0.7, roughness: 0.3 });
      for (let b = 0; b < 2; b++) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.28 + b * 0.08, 0.025, 5, 10), maceBandMat);
        band.position.y = 2.6;
        band.rotation.x = Math.PI / 2;
        this.weaponPivot.add(band);
      }
    }

    // --- Health Bar ---
    const barGeo = new THREE.PlaneGeometry(1.5, 0.15);
    const barMat2 = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
    this.healthBar = new THREE.Mesh(barGeo, barMat2);
    this.healthBar.position.y = 3.2;
    this.mesh.add(this.healthBar);

    // --- Boss Extras ---
    if (this.type === 'BOSS') {
      const shoulder = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.2, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x3a1f14, metalness: 0.2, roughness: 0.6 })
      );
      shoulder.position.set(0, 1.7, 0);
      this.mesh.add(shoulder);

      const hornMat = new THREE.MeshStandardMaterial({ color: 0x8a6b3f, roughness: 0.4 });
      const hornLeft = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.9, 6), hornMat);
      hornLeft.position.set(-0.35, 2.6, 0);
      hornLeft.rotation.z = Math.PI / 4;
      this.mesh.add(hornLeft);
      const hornRight = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.9, 6), hornMat);
      hornRight.position.set(0.35, 2.6, 0);
      hornRight.rotation.z = -Math.PI / 4;
      this.mesh.add(hornRight);
      // Emissive eye slits (larger)
      const bossEyeMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 2.5 });
      const bossEyeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.08), bossEyeMat);
      bossEyeL.position.set(-0.2, 2.0, 0.42);
      this.mesh.add(bossEyeL);
      const bossEyeR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.08), bossEyeMat);
      bossEyeR.position.set(0.2, 2.0, 0.42);
      this.mesh.add(bossEyeR);
      this.bossEyeLeft = bossEyeL;
      this.bossEyeRight = bossEyeR;

      // Boss cape
      const cape = createClothPanel(1.05, 1.7, 0x3a0a0a, 0xaa6600);
      cape.position.set(0, 1.0, -0.4);
      this.mesh.add(cape);

      // Battle standard with crescent top
      const standardPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 3, 4),
        new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.8 })
      );
      standardPole.position.set(0, 2.5, -0.5);
      this.mesh.add(standardPole);
      const standardFlag = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.5, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x1a4a1a, roughness: 0.8 })
      );
      standardFlag.position.set(0.4, 3.8, -0.5);
      this.mesh.add(standardFlag);
      // Crescent topper
      const crescentTop = new THREE.Mesh(
        new THREE.TorusGeometry(0.15, 0.03, 6, 8, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 })
      );
      crescentTop.position.set(0, 4.1, -0.5);
      this.mesh.add(crescentTop);
      // Kurta lower body
      const kurta = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 0.8, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.9 })
      );
      kurta.position.set(0, 0.3, 0);
      this.mesh.add(kurta);

      // Boss aura ring at feet
      const auraGeo = new THREE.RingGeometry(1.5, 1.8, 16);
      auraGeo.rotateX(-Math.PI / 2);
      this.bossAuraRing = new THREE.Mesh(auraGeo, new THREE.MeshBasicMaterial({
        color: 0xff6600, transparent: true, opacity: 0.3,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      }));
      this.bossAuraRing.position.y = 0.05;
      this.mesh.add(this.bossAuraRing);

      this.healthBar.scale.x = 1.4;
    }

    // --- Shielder stamina bar ---
    if (this.type === 'SHIELDER') {
      const shieldBarGeo = new THREE.PlaneGeometry(1.0, 0.08);
      const shieldBarMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide });
      this.shieldBar = new THREE.Mesh(shieldBarGeo, shieldBarMat);
      this.shieldBar.position.y = 2.9;
      this.mesh.add(this.shieldBar);
    }

    // Danger ring for attack wind-up
    const dangerRingGeo = new THREE.RingGeometry(0.5, 0.7, 8);
    dangerRingGeo.rotateX(-Math.PI / 2);
    this.dangerRing = new THREE.Mesh(dangerRingGeo, new THREE.MeshBasicMaterial({
      color: 0xff2200, transparent: true, opacity: 0.6,
      side: THREE.DoubleSide, depthWrite: false,
    }));
    this.dangerRing.position.y = 0.05;
    this.dangerRing.visible = false;
    this.mesh.add(this.dangerRing);

    if (this.type === 'ARCHER') {
      this.aimLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 1),
        new THREE.MeshBasicMaterial({
          color: 0xff2f1f,
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      this.aimLine.visible = false;
      this.scene.add(this.aimLine);
    }

    this.mesh.position.copy(startPos);
    const shadowBlob = new THREE.Mesh(
      new THREE.CircleGeometry(this.type === 'BOSS' ? 1.6 : this.type === 'BRUTE' ? 1.1 : 0.75, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
    );
    shadowBlob.rotation.x = -Math.PI / 2;
    shadowBlob.position.y = 0.025;
    this.mesh.add(shadowBlob);
    this.lastPos.copy(startPos);
    boostMetalReflections(this.mesh);
    scene.add(this.mesh);
  }

  public update(delta: number) {
    // Death animation: topple and sink, then remove
    if (this.deathTimer >= 0) {
      this.deathTimer -= delta;
      const t = Math.max(0, this.deathTimer / 0.35);
      // Topple rotation instead of just scale-down
      this.mesh.rotation.z += delta * 4;
      this.mesh.scale.setScalar(0.5 + t * 0.5);
      this.mesh.position.y -= delta * 2;
      if (this.deathTimer <= 0) {
        this.scene.remove(this.mesh);
        if (this.aimLine) this.scene.remove(this.aimLine);
      }
      return;
    }
    if (this.isDead) return;

    if (this.recoilVelocity.lengthSq() > 0.01) {
      this.mesh.position.addScaledVector(this.recoilVelocity, delta);
      this.recoilVelocity.multiplyScalar(Math.pow(0.04, delta));
      this.applyBlockerCollision();
    } else {
      this.recoilVelocity.set(0, 0, 0);
    }

    // Stagger: skip AI while staggered
    if (this.staggerTimer > 0) {
      this.staggerTimer -= delta;
      return;
    }

    // Boss phase 2: faster + ground pound
    if (this.type === 'BOSS' && !this.bossPhase2 && this.health < this.maxHealth * 0.5) {
      this.bossPhase2 = true;
      this.speed *= 1.4;
      // Phase 2 eye color change to red + point light
      const redMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 3.0 });
      if (this.bossEyeLeft) {
        (this.bossEyeLeft.material as THREE.Material).dispose();
        this.bossEyeLeft.material = redMat;
      }
      if (this.bossEyeRight) {
        (this.bossEyeRight.material as THREE.Material).dispose();
        this.bossEyeRight.material = redMat;
      }
      if (!this.bossEyeLight) {
        this.bossEyeLight = new THREE.PointLight(0xff0000, 40, 10);
        this.bossEyeLight.position.set(0, 2.0, 0.5);
        this.mesh.add(this.bossEyeLight);
      }
      this.audio.playBossRoar();
    }
    this.bossGroundPoundTimer = Math.max(0, this.bossGroundPoundTimer - delta);

    // Process pending strike timer
    if (this.strikePending) {
      this.strikeWindup -= delta;
      if (this.strikeWindup <= 0) {
        this.strikePending = false;
        this.resolveStrike();
      }
    }

    const pPos = this.player.getPosition();
    const dist = this.mesh.position.distanceTo(pPos);
    this.rangedCooldown = Math.max(0, this.rangedCooldown - delta);
    this.rusherChargeCooldown = Math.max(0, this.rusherChargeCooldown - delta);
    this.bruteAoeCooldown = Math.max(0, this.bruteAoeCooldown - delta);
    if (this.type === 'SHIELDER') {
      if (this.shieldBrokenTimer > 0) {
        this.shieldBrokenTimer -= delta;
      } else {
        this.shieldStamina = Math.min(100, this.shieldStamina + 18 * delta);
      }
    }

    if (this.type === 'ARCHER') {
        if (dist < 8.0) {
          const away = this.mesh.position.clone().sub(pPos).normalize();
          this.mesh.position.add(away.multiplyScalar(this.speed * delta));
          this.weaponPivot.rotation.x = THREE.MathUtils.lerp(this.weaponPivot.rotation.x, -0.3, delta * 5);
          // Still count down windup while retreating
          if (this.rangedWindup > 0) {
            const prev = this.rangedWindup;
            this.rangedWindup = Math.max(0, this.rangedWindup - delta);
            if (prev > 0 && this.rangedWindup <= 0) {
              this.audio.playBowTwang();
              EnemyManager.spawnArrow(this.scene, this.player, this.getProjectileOrigin(), pPos.clone());
            }
          }
        } else if (dist < 20.0) {
          if (this.rangedWindup > 0) {
            this.weaponPivot.rotation.x = THREE.MathUtils.lerp(this.weaponPivot.rotation.x, 1.4, delta * 8);
            const prev = this.rangedWindup;
            this.rangedWindup = Math.max(0, this.rangedWindup - delta);
            if (prev > 0 && this.rangedWindup <= 0) {
              this.audio.playBowTwang();
              EnemyManager.spawnArrow(this.scene, this.player, this.getProjectileOrigin(), pPos.clone());
            }
          } else if (this.rangedCooldown <= 0) {
            this.rangedCooldown = 2.2;
            this.rangedWindup = 0.45;
            this.weaponPivot.rotation.x = 1.2;
            this.onArcherWindup();
          } else {
            this.weaponPivot.rotation.x = THREE.MathUtils.lerp(this.weaponPivot.rotation.x, 0.2, delta * 5);
          }
        } else {
          const dir = pPos.clone().sub(this.mesh.position).normalize();
          this.mesh.position.add(dir.multiplyScalar(this.speed * delta));
          this.weaponPivot.rotation.x = THREE.MathUtils.lerp(this.weaponPivot.rotation.x, 0, delta * 5);
        }
    } else if (this.type === 'BOSS' && this.bossChargeTimer > 0) {
        this.bossChargeTimer -= delta;
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
        this.mesh.position.add(forward.multiplyScalar(20 * delta));
        if (!this.bossChargeHit && dist < 4.5) {
          this.player.takeDamage(26);
          this.bossChargeHit = true;
        }
        this.weaponPivot.rotation.x = THREE.MathUtils.lerp(this.weaponPivot.rotation.x, -1.6, delta * 10);
    } else if (this.type === 'RUSHER' && this.rusherChargeTimer > 0) {
        this.rusherChargeTimer -= delta;
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
        this.mesh.position.add(forward.multiplyScalar(this.speed * 2.5 * delta));
        if (dist < 3.0) {
          this.player.takeDamage(15);
          this.rusherChargeTimer = 0;
        }
        this.weaponPivot.rotation.x = THREE.MathUtils.lerp(this.weaponPivot.rotation.x, -1.2, delta * 10);
    } else if (dist > 6.0) {
        const dir = pPos.clone().sub(this.mesh.position).normalize();
        this.mesh.position.add(dir.multiplyScalar(this.speed * delta));
        this.weaponPivot.rotation.x = THREE.MathUtils.lerp(this.weaponPivot.rotation.x, 0, delta * 5);
    } else if (dist > 3.5) {
        // Circle, but dash inward after 2.5s of circling
        if (this.circleDashTimer > 0) {
          // Dashing inward toward player
          this.circleDashTimer -= delta;
          const dir = pPos.clone().sub(this.mesh.position).normalize();
          this.mesh.position.add(dir.multiplyScalar(this.speed * 1.8 * delta));
          this.weaponPivot.rotation.x = THREE.MathUtils.lerp(this.weaponPivot.rotation.x, -1.0, delta * 10);
          if (this.circleDashTimer <= 0) {
            this.circleTimer = 0;
          }
        } else {
          this.circleTimer += delta;
          this.circleAngle += delta * 1.5 * this.circleDir;
          const targetX = pPos.x + Math.cos(this.circleAngle) * 5.0;
          const targetZ = pPos.z + Math.sin(this.circleAngle) * 5.0;
          const target = new THREE.Vector3(targetX, 0, targetZ);
          this.mesh.position.lerp(target, delta * 3);
          this.weaponPivot.rotation.x = THREE.MathUtils.lerp(this.weaponPivot.rotation.x, 0.5, delta * 5);
          // After 2.5s of circling, dash inward
          if (this.circleTimer >= 2.5) {
            this.circleDashTimer = 0.5;
          }
        }
    } else {
        if (this.attackCooldown <= 0) {
            this.strike();
        } else {
            this.attackCooldown -= delta;
            this.weaponPivot.rotation.x = THREE.MathUtils.lerp(this.weaponPivot.rotation.x, -2, delta * 10);
        }
    }

    this.applyBlockerCollision();
    this.updateArcherAimTell(pPos);

    this.lookTarget.position.copy(this.mesh.position);
    this.lookTarget.lookAt(pPos);
    this.mesh.quaternion.slerp(this.lookTarget.quaternion, delta * 4);
    this.healthBar.lookAt(this.player.getCameraPosition());

    if (this.player.isPlayerAttacking() && dist < 5.0) {
      if (this.type === 'SHIELDER') {
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
        const toPlayer = pPos.clone().sub(this.mesh.position).normalize();
        const facingDot = forward.dot(toPlayer);
        if (this.shieldBrokenTimer <= 0 && facingDot > 0.4) {
          this.audio.playSwordClash();
          // Heavy strikes smash through guards: triple guard damage + half-power hit
          const heavy = this.player.isHeavyStrike();
          this.shieldStamina -= heavy ? 84 : 28;
          if (heavy) this.takeDamage(this.player.getAttackPower() * 0.5);
          if (this.shieldStamina <= 0) {
            this.shieldBrokenTimer = 2.0;
            this.shieldStamina = 0;
          }
        } else {
          this.takeDamage(this.player.getAttackPower());
        }
      } else {
        this.takeDamage(this.player.getAttackPower());
      }
    }

    if (this.hitFlash > 0) {
      this.hitFlash -= delta * 12;
      this.mesh.traverse(o => {
        if ((o as THREE.Mesh).isMesh && o !== this.healthBar) {
            const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial;
            if (m.emissive) m.emissive.setHex(this.hitFlash > 0.5 ? 0xffffff : 0x000000);
        }
      });
    }

    const healthPct = Math.max(0, this.health / this.maxHealth);
    this.healthBar.scale.x = healthPct;
    (this.healthBar.material as THREE.MeshBasicMaterial).color.setHSL(0.3 * healthPct, 1, 0.5);
    if (this.shieldBar) {
      const shieldPct = Math.max(0, this.shieldStamina / 100);
      this.shieldBar.scale.x = shieldPct;
      const shieldMat = this.shieldBar.material as THREE.MeshBasicMaterial;
      shieldMat.color.setHex(this.shieldBrokenTimer > 0 ? 0xf87171 : 0x3b82f6);
    }

    // --- Attack wind-up visual tell ---
    if (this.strikePending || this.bossChargeTimer > 0 || this.rusherChargeTimer > 0) {
      this.dangerRing.visible = true;
      const pulse = 1 + Math.sin(this.animTime * 12) * 0.15;
      this.dangerRing.scale.setScalar(pulse);
      (this.dangerRing.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(this.animTime * 8) * 0.2;
      // Lunge forward during windup
      if (this.strikePending && this.strikeWindup > 0) {
        const dir = this.player.getPosition().clone().sub(this.mesh.position).normalize();
        this.mesh.position.addScaledVector(dir, delta * 1.5);
        this.body.rotation.x = THREE.MathUtils.lerp(this.body.rotation.x, -0.15, delta * 8);
      }
    } else {
      this.dangerRing.visible = false;
      this.body.rotation.x = THREE.MathUtils.lerp(this.body.rotation.x, 0, delta * 8);
    }

    // --- Walk animation ---
    this.animTime += delta;
    const moveSpeed = this.mesh.position.distanceTo(this.lastPos) / Math.max(delta, 0.001);
    this.lastPos.copy(this.mesh.position);

    // Type-specific walk parameters
    let walkAmp = 0.35;
    let walkFreq = 1.0;
    if (this.type === 'RUSHER') { walkAmp = 0.5; walkFreq = 1.8; }
    else if (this.type === 'BRUTE') { walkAmp = 0.2; walkFreq = 0.6; }
    else if (this.type === 'BOSS') { walkAmp = 0.25; walkFreq = 0.7; }
    else if (this.type === 'SHIELDER') { walkAmp = 0.3; walkFreq = 0.8; }

    if (moveSpeed > 0.5) {
      this.walkCycleAnim += moveSpeed * delta * 4.5 * walkFreq;
      this.legL.rotation.x = Math.sin(this.walkCycleAnim) * walkAmp;
      this.legR.rotation.x = Math.sin(this.walkCycleAnim + Math.PI) * walkAmp;
      // Boss torso sway
      if (this.type === 'BOSS') {
        this.body.rotation.z = Math.sin(this.walkCycleAnim) * 0.03;
      }
    } else {
      // Idle: lerp legs back + subtle sway
      this.legL.rotation.x = THREE.MathUtils.lerp(this.legL.rotation.x, 0, delta * 8);
      this.legR.rotation.x = THREE.MathUtils.lerp(this.legR.rotation.x, 0, delta * 8);
      // Idle weapon sway
      if (!this.strikePending && this.attackCooldown <= 0) {
        this.weaponPivot.rotation.x = THREE.MathUtils.lerp(
          this.weaponPivot.rotation.x,
          Math.sin(this.animTime * 1.5) * 0.08,
          delta * 3
        );
      }
      // Idle body sway
      this.body.rotation.z = THREE.MathUtils.lerp(
        this.body.rotation.z,
        Math.sin(this.animTime * 0.8) * 0.02,
        delta * 3
      );
      // Boss breathing
      if (this.type === 'BOSS') {
        this.body.scale.y = 1 + Math.sin(this.animTime * 1.2) * 0.02;
      }
    }

    // Boss aura ring pulse
    if (this.bossAuraRing) {
      const auraPulse = 1 + Math.sin(this.animTime * 2) * 0.15;
      this.bossAuraRing.scale.setScalar(auraPulse);
      (this.bossAuraRing.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(this.animTime * 3) * 0.1;
    }
  }

  private strike() {
    if (this.type === 'BOSS') {
      const isCharge = this.bossPhase2 ? Math.random() > 0.3 : Math.random() > 0.5;
      if (isCharge) {
        this.attackCooldown = 3.2;
        this.bossChargeTimer = 0.7;
        this.bossChargeHit = false;
        return;
      }
      this.attackCooldown = 3.0;
      this.weaponPivot.rotation.x = 2.4;
      this.strikePending = true;
      this.strikeWindup = 0.45;
      return;
    }

    // Rusher: 50% chance to charge
    if (this.type === 'RUSHER' && this.rusherChargeCooldown <= 0 && Math.random() > 0.5) {
      this.rusherChargeTimer = 0.4;
      this.rusherChargeCooldown = 4.0;
      this.attackCooldown = 1.5;
      return;
    }

    // Brute: AoE ground slam every 3rd hit
    if (this.type === 'BRUTE' && this.bruteAoeCooldown <= 0) {
      this.bruteAoeCooldown = 6.0;
      this.attackCooldown = 2.5;
      this.weaponPivot.rotation.x = 2.5;
      this.strikePending = true;
      this.strikeWindup = 0.6;
      this.bruteAoeTimer = 1; // flag for AoE resolve
      return;
    }

    this.attackCooldown = 2.0;
    this.weaponPivot.rotation.x = 2; // Telegraph forward swing
    this.strikePending = true;
    this.strikeWindup = 0.4;
  }

  private resolveStrike() {
    if (this.isDead) return;
    const dist = this.mesh.position.distanceTo(this.player.getPosition());
    // Brute AoE slam
    if (this.bruteAoeTimer > 0) {
      this.bruteAoeTimer = 0;
      if (dist < 6.0) {
        this.player.takeDamage(18);
      }
      return;
    }
    if (this.type === 'BOSS') {
      if (dist < 5.5) this.player.takeDamage(30);
    } else {
      if (dist < 4.0) {
        const dmg = this.type === 'BRUTE' ? 22 : 12;
        this.player.takeDamage(dmg);
      }
    }
  }

  public takeDamage(amount: number) {
    if (this.hitFlash > 0.15) return;
    this.health -= amount;
    this.hitFlash = 1.5;
    const away = this.mesh.position.clone().sub(this.player.getPosition());
    away.y = 0;
    if (away.lengthSq() > 0.01) {
      const massFactor = this.type === 'BOSS' ? 0.35 : this.type === 'BRUTE' ? 0.55 : 1;
      this.recoilVelocity.add(away.normalize().multiplyScalar((this.type === 'RUSHER' ? 6 : 4.5) * massFactor));
    }
    this.applyStagger(this.type === 'BOSS' ? 0.08 : this.type === 'BRUTE' ? 0.12 : 0.18);
    const isLethal = this.health <= 0;
    if (isLethal) {
      this.audio.playKill();
    } else {
      this.audio.playSwordClash();
    }
    this.onHit(this.mesh.position.clone(), isLethal);
    this.player.triggerHitStop(isLethal);
    if (isLethal) this.die();
  }

  private die() {
    this.isDead = true;
    this.strikePending = false;
    this.dangerRing.visible = false;
    if (this.aimLine) {
      this.scene.remove(this.aimLine);
      this.aimLine = null;
    }
    this.onKilled();
    this.deathTimer = 0.35;

    // Spawn body-color debris shards — more for bosses
    const bodyMesh = this.mesh.children[0] as THREE.Mesh;
    const bodyColor = bodyMesh ? ((bodyMesh.material as THREE.MeshStandardMaterial).color.getHex()) : 0x333333;
    const debrisMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.9 });
    const shardCount = this.type === 'BOSS' ? 20 : 8;
    for (let i = 0; i < shardCount; i++) {
      const size = 0.1 + Math.random() * 0.2;
      const shard = new THREE.Mesh(
        new THREE.TetrahedronGeometry(size),
        debrisMat
      );
      shard.position.copy(this.mesh.position);
      shard.position.y += 1.0 + Math.random() * 0.5;
      shard.position.x += (Math.random() - 0.5) * 0.5;
      shard.position.z += (Math.random() - 0.5) * 0.5;
      const spread = this.type === 'BOSS' ? 6 : 4;
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        2 + Math.random() * 4,
        (Math.random() - 0.5) * spread
      );
      spawnTransientVfx(this.scene, [shard], 0.6, (_t, dt) => {
        shard.position.addScaledVector(vel, dt);
        vel.y -= 15 * dt;
        shard.rotation.x += 6 * dt;
        shard.rotation.z += 9 * dt;
        shard.scale.multiplyScalar(Math.pow(0.16, dt));
      });
    }

    // Soul wisp — rising golden sphere
    const wispCount = this.type === 'BOSS' ? 3 : 1;
    for (let w = 0; w < wispCount; w++) {
      const wisp = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        new THREE.MeshBasicMaterial({
          color: 0xffcc44, transparent: true, opacity: 0.8,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      wisp.position.copy(this.mesh.position);
      wisp.position.y += 1.2;
      wisp.position.x += (Math.random() - 0.5) * 0.5;
      const startY = wisp.position.y;
      spawnTransientVfx(this.scene, [wisp], 0.6, (t) => {
        const prog = 1 - t;
        wisp.position.y = startY + prog * 3;
        wisp.scale.setScalar(Math.max(0.001, t));
        (wisp.material as THREE.MeshBasicMaterial).opacity = t * 0.8;
      });
    }

    // Haptic feedback on mobile
    if (navigator.vibrate) navigator.vibrate(this.type === 'BOSS' ? [50, 20, 80] : 30);
  }

  public getType() { return this.type; }
  public isDead_() { return this.isDead; }

  public applyStagger(duration: number) {
    this.staggerTimer = duration;
  }

  private updateArcherAimTell(playerPos: THREE.Vector3) {
    if (!this.aimLine) return;
    const active = this.type === 'ARCHER' && this.rangedWindup > 0 && !this.isDead;
    this.aimLine.visible = active;
    if (!active) return;

    const start = this.getProjectileOrigin();
    const end = playerPos.clone().add(new THREE.Vector3(0, 1.05, 0));
    const mid = start.clone().lerp(end, 0.5);
    const length = start.distanceTo(end);
    this.aimLine.position.copy(mid);
    this.aimLine.scale.set(1, 1, length);
    this.aimLine.lookAt(end);
    const mat = this.aimLine.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.25 + (1 - this.rangedWindup / 0.45) * 0.45;
  }

  public isActive() { return !this.isDead || this.deathTimer > 0; }

  private getProjectileOrigin(): THREE.Vector3 {
    const origin = new THREE.Vector3(0, 0.35, 0.35);
    this.weaponPivot.localToWorld(origin);
    return origin;
  }

  private applyBlockerCollision() {
    for (const blocker of EnemyManager.getArrowBlockers()) {
      const dx = this.mesh.position.x - blocker.x;
      const dz = this.mesh.position.z - blocker.z;
      const minRadius = blocker.radius + (this.type === 'BOSS' ? 1.5 : this.type === 'BRUTE' ? 1.1 : 0.75);
      const distSq = dx * dx + dz * dz;
      if (distSq <= 0.0001 || distSq >= minRadius * minRadius) continue;
      const dist = Math.sqrt(distSq);
      const push = (minRadius - dist) + 0.04;
      this.mesh.position.x += (dx / dist) * push;
      this.mesh.position.z += (dz / dist) * push;
    }
    this.mesh.position.x = Math.max(-19.5, Math.min(19.5, this.mesh.position.x));
  }
}

export class EnemyManager {
  private enemies: Enemy[] = [];
  private scene: THREE.Scene;
  private player: Player;
  private audio: AudioManager;
  private spawnTimer = 0;
  private difficulty = 0;
  private onEnemyKilled: (points: number) => void;
  private hitBursts: HitBurst[] = [];
  private valorRings: ValorRing[] = [];
  private valorColumns: ValorColumn[] = [];
  private valorShockwaves: ValorShockwave[] = [];
  private static arrows: Arrow[] = [];

  /** Clear cross-instance state so a new game doesn't inherit live arrows. */
  public static resetStatics() {
    EnemyManager.arrows = [];
    DamageNumber.disposeShared();
  }
  private static arrowBlockers: { x: number; z: number; radius: number }[] = [];
  private bossActive = false;
  private archerWarningTimer = 0;
  private damageNumbers: DamageNumber[] = [];
  private camera: THREE.Camera | null = null;
  private firstSpawnDone = false;
  private archersOnly = false;
  private doubleSpeedMode = false;
  private bossRushMode = false;
  private bossRushTimer = 0;
  private currentStage = 1;

  constructor(scene: THREE.Scene, player: Player, audio: AudioManager, onEnemyKilled: (points: number) => void, camera?: THREE.Camera) {
    this.scene = scene;
    this.player = player;
    this.audio = audio;
    this.onEnemyKilled = onEnemyKilled;
    this.camera = camera || null;
  }

  public update(delta: number) {
    this.spawnTimer -= delta;
    // Early game: fewer concurrent enemies, slower spawn, fewer ranged threats.
    const isEarlyGame = this.gameElapsedTime < 30;
    const stagePressure = Math.max(0, this.currentStage - 1);
    const maxEnemies = isEarlyGame
      ? Math.min(4, 2 + Math.floor(this.difficulty * 0.35))
      : Math.min(18, 7 + stagePressure * 2 + Math.floor(this.difficulty * 0.85));

    // Initial spawn: just 1 enemy (not 3), give player time to learn
    if (!this.firstSpawnDone) {
      this.firstSpawnDone = true;
      this.spawnEnemy();
      this.spawnTimer = 5.0; // longer gap before second enemy
    }

    // Boss rush: spawn a boss every 30s
    if (this.bossRushMode) {
      this.bossRushTimer -= delta;
      if (this.bossRushTimer <= 0 && !this.bossActive) {
        this.spawnMiniBoss();
        this.bossRushTimer = 30;
      }
    }

    if (this.spawnTimer <= 0 && this.enemies.length < maxEnemies) {
      this.spawnEnemy();
      // Slower spawns in early game
      this.spawnTimer = isEarlyGame
        ? Math.max(3.2, 5.0 - this.difficulty * 0.25)
        : Math.max(0.95, 2.75 - stagePressure * 0.22 - this.difficulty * 0.34);
    }

    this.enemies = this.enemies.filter(e => {
      e.update(delta);
      return e.isActive();
    });

    this.hitBursts = this.hitBursts.filter(burst => burst.update(delta));
    this.valorRings = this.valorRings.filter(ring => ring.update(delta));
    this.valorColumns = this.valorColumns.filter(col => col.update(delta));
    this.valorShockwaves = this.valorShockwaves.filter(sw => sw.update(delta));
    EnemyManager.arrows = EnemyManager.arrows.filter(arrow => arrow.update(delta));
    this.archerWarningTimer = Math.max(0, this.archerWarningTimer - delta);
    if (this.camera) {
      this.damageNumbers = this.damageNumbers.filter(dn => dn.update(delta, this.camera!));
    }
  }

  private spawnEnemy() {
    const isOpening = this.gameElapsedTime < 30;
    const startPos = new THREE.Vector3((Math.random() - 0.5) * 35, 0, this.player.getPosition().z - (isOpening ? 90 : 75));
    let type: EnemyType = 'STANDARD';
    if (isOpening && !this.archersOnly) {
      type = this.gameElapsedTime < 15 || Math.random() < 0.75 ? 'STANDARD' : 'RUSHER';
    } else if (this.archersOnly) {
      type = 'ARCHER';
    } else if (this.currentStage === 1) {
      const roll = Math.random();
      if (roll > 0.88) {
        type = 'ARCHER';
      } else if (roll > 0.68) {
        type = 'RUSHER';
      }
    } else if (this.currentStage === 2) {
      const roll = Math.random();
      if (roll > 0.92) {
        type = 'BRUTE';
      } else if (roll > 0.76) {
        type = 'SHIELDER';
      } else if (roll > 0.54) {
        type = 'ARCHER';
      } else if (roll > 0.34) {
        type = 'RUSHER';
      }
    } else {
      const roll = Math.random();
      if (roll > 0.82) {
        type = 'BRUTE';
      } else if (roll > 0.62) {
        type = 'SHIELDER';
      } else if (roll > 0.38) {
        type = 'ARCHER';
      } else if (roll > 0.20) {
        type = 'RUSHER';
      }
    }
    this.enemies.push(
      new Enemy(
        this.scene,
        this.player,
        this.audio,
        startPos,
        this.doubleSpeedMode ? this.difficulty + 8 : Math.max(0, this.difficulty - (isOpening ? 2 : 0)),
        () => this.onEnemyKilled(1),
        (pos, lethal) => this.spawnHitBurst(pos, lethal),
        () => this.triggerArcherWarning(),
        type
      )
    );
  }

  public setDifficulty(level: number) { this.difficulty = level; }
  public setStage(stage: number) { this.currentStage = Math.max(1, Math.min(3, stage)); }
  public freezeAll() { this.enemies = []; }
  public isBossActive() { return this.bossActive; }
  public getArcherWarning() { return this.archerWarningTimer; }
  public getNearEnemyCount(pos: THREE.Vector3, radius: number): number {
    return this.enemies.filter(e => e.mesh.position.distanceTo(pos) < radius).length;
  }

  public getEnemyPositions(): { x: number; z: number; type: string }[] {
    return this.enemies
      .filter(e => !e.isDead_())
      .map(e => ({ x: e.mesh.position.x, z: e.mesh.position.z, type: e.getType() }));
  }
  public getNearestEnemyPosition(pos: THREE.Vector3, radius: number): THREE.Vector3 | null {
    let nearest: Enemy | null = null;
    let nearestDistSq = radius * radius;
    for (const enemy of this.enemies) {
      if (enemy.isDead_()) continue;
      const distSq = enemy.mesh.position.distanceToSquared(pos);
      if (distSq < nearestDistSq) {
        nearest = enemy;
        nearestDistSq = distSq;
      }
    }
    return nearest ? nearest.mesh.position.clone() : null;
  }
  private gameElapsedTime = 0;
  public setGameElapsed(t: number) { this.gameElapsedTime = t; }
  public setArchersOnly(v: boolean) { this.archersOnly = v; }
  public setDoubleSpeed(v: boolean) { this.doubleSpeedMode = v; }
  public setBossRush(v: boolean) { this.bossRushMode = v; }
  public triggerValorStrike(center: THREE.Vector3) {
    const radius = 8.5;
    this.enemies.forEach(enemy => {
      const dist = enemy.mesh.position.distanceTo(center);
      if (dist <= radius) {
        enemy.takeDamage(9999);
      }
    });
    // Multiple expanding rings (3 waves, staggered)
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.valorRings.push(new ValorRing(this.scene, center.clone(), radius));
      }, i * 80);
    }
    // Central light column
    this.valorColumns.push(new ValorColumn(this.scene, center.clone()));
    // Ground shockwave
    this.valorShockwaves.push(new ValorShockwave(this.scene, center.clone(), radius * 1.5));
    // Haptic burst
    if (navigator.vibrate) navigator.vibrate([40, 30, 60]);
  }

  public spawnMiniBoss() {
    if (this.bossActive) return;
    const startPos = new THREE.Vector3(0, 0, this.player.getPosition().z - 85);
    this.bossActive = true;
    const boss = new Enemy(
      this.scene,
      this.player,
      this.audio,
      startPos,
      this.difficulty + 2,
      () => {
        this.bossActive = false;
        this.onEnemyKilled(6);
        this.audio.playWarCry();
      },
      (pos, lethal) => this.spawnHitBurst(pos, lethal),
      () => this.triggerArcherWarning(),
      'BOSS'
    );
    this.enemies.push(boss);
  }

  private spawnHitBurst(position: THREE.Vector3, lethal: boolean) {
    const burst = new HitBurst(this.scene, position, lethal);
    this.hitBursts.push(burst);
    // Spawn damage number
    if (this.camera) {
      const dmg = this.player.getAttackPower();
      this.damageNumbers.push(new DamageNumber(this.scene, position, dmg, this.camera));
    }
  }

  private triggerArcherWarning() {
    this.archerWarningTimer = 1.5;
  }

  public static spawnArrow(scene: THREE.Scene, player: Player, start: THREE.Vector3, target: THREE.Vector3) {
    const arrow = new Arrow(scene, player, start, target);
    EnemyManager.arrows.push(arrow);
  }
  public setArrowBlockers(blockers: { x: number; z: number; radius: number }[]) {
    EnemyManager.arrowBlockers = blockers;
  }
  public static getArrowBlockers() {
    return EnemyManager.arrowBlockers;
  }
}

class HitBurst {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private velocities: THREE.Vector3[] = [];
  private life: number;
  private dustRing: THREE.Mesh | null = null;
  private dustLife = 0;

  constructor(scene: THREE.Scene, position: THREE.Vector3, lethal: boolean) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.life = lethal ? 0.5 : 0.35;
    const color = lethal ? 0xff6b3d : 0xffc55c;
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5 });

    const count = lethal ? 16 : 10;
    for (let i = 0; i < count; i++) {
      // Mix tetrahedrons and box shards
      const geo = i % 3 === 0
        ? new THREE.BoxGeometry(0.08 + Math.random() * 0.1, 0.08 + Math.random() * 0.1, 0.08 + Math.random() * 0.1)
        : new THREE.TetrahedronGeometry(0.08 + Math.random() * 0.12);
      const shard = new THREE.Mesh(geo, mat);
      shard.position.set(
        (Math.random() - 0.5) * 0.6,
        1.2 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.6
      );
      this.group.add(shard);
      const spread = lethal ? 1.5 : 1.0;
      this.velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 6 * spread,
        4 + Math.random() * 6,
        (Math.random() - 0.5) * 6 * spread
      ));
    }

    // Spark particles on non-lethal hits
    if (!lethal) {
      const sparkMat = new THREE.MeshBasicMaterial({
        color: 0xffffaa, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      for (let s = 0; s < 7; s++) {
        const spark = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), sparkMat);
        spark.position.set(
          (Math.random() - 0.5) * 0.3,
          1.2 + Math.random() * 0.3,
          (Math.random() - 0.5) * 0.3
        );
        this.group.add(spark);
        this.velocities.push(new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          3 + Math.random() * 5,
          (Math.random() - 0.5) * 8
        ));
      }
    }

    this.group.position.copy(position);
    this.scene.add(this.group);

    // Ground dust ring on lethal hits
    if (lethal) {
      const dustGeo = new THREE.RingGeometry(0.2, 1.5, 24);
      const dustMat = new THREE.MeshBasicMaterial({
        color: 0x8a7a60,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      this.dustRing = new THREE.Mesh(dustGeo, dustMat);
      this.dustRing.rotation.x = -Math.PI / 2;
      this.dustRing.position.copy(position);
      this.dustRing.position.y = 0.1;
      this.scene.add(this.dustRing);
      this.dustLife = 0.4;
    }
  }

  public update(delta: number) {
    this.life -= delta;
    this.group.children.forEach((child, idx) => {
      const vel = this.velocities[idx];
      child.position.addScaledVector(vel, delta);
      vel.y -= 18 * delta;
      child.scale.multiplyScalar(1 - delta * 1.5);
    });

    // Update dust ring
    if (this.dustRing) {
      this.dustLife -= delta;
      const t = Math.max(0, this.dustLife / 0.4);
      this.dustRing.scale.setScalar(1 + (1 - t) * 3);
      (this.dustRing.material as THREE.MeshBasicMaterial).opacity = t * 0.5;
      if (this.dustLife <= 0) {
        this.scene.remove(this.dustRing);
        this.dustRing = null;
      }
    }

    if (this.life <= 0) {
      this.scene.remove(this.group);
      if (this.dustRing) {
        this.scene.remove(this.dustRing);
      }
      return false;
    }
    return true;
  }
}

class Arrow {
  private scene: THREE.Scene;
  private player: Player;
  private mesh: THREE.Group;
  private velocity: THREE.Vector3;
  private life = 4.0;

  constructor(scene: THREE.Scene, player: Player, start: THREE.Vector3, target: THREE.Vector3) {
    this.scene = scene;
    this.player = player;
    this.mesh = new THREE.Group();
    const arrowMat = new THREE.MeshStandardMaterial({
      color: 0xfff1a8,
      emissive: 0xff3b1f,
      emissiveIntensity: 1.4,
      roughness: 0.35,
    });
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 1.8, 8),
      arrowMat
    );
    shaft.rotation.x = Math.PI / 2;
    this.mesh.add(shaft);

    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.42, 8),
      new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xff5a1f, emissiveIntensity: 1.2, metalness: 0.3 })
    );
    head.rotation.x = Math.PI / 2;
    head.position.z = 1.1;
    this.mesh.add(head);

    const trail = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 2.8, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xff3b1f,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    trail.rotation.x = -Math.PI / 2;
    trail.position.z = -1.5;
    this.mesh.add(trail);

    const fletchMat = new THREE.MeshBasicMaterial({
      color: 0xfff0a0,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 3; i++) {
      const fletch = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.12), fletchMat);
      fletch.position.z = -0.95;
      fletch.rotation.z = (i / 3) * Math.PI * 2;
      this.mesh.add(fletch);
    }

    const startPoint = start.clone();
    const targetPoint = target.clone().add(new THREE.Vector3(0, 1.05, 0));
    this.mesh.position.copy(startPoint);
    const dir = targetPoint.clone().sub(startPoint).normalize();
    this.velocity = dir.multiplyScalar(18);
    this.mesh.lookAt(targetPoint);
    this.scene.add(this.mesh);
  }

  public update(delta: number) {
    this.life -= delta;
    this.mesh.position.addScaledVector(this.velocity, delta);
    this.mesh.lookAt(this.mesh.position.clone().add(this.velocity));
    const dist = this.mesh.position.distanceTo(this.player.getPosition());
    if (dist < 2.8 && this.player.deflectProjectile(this.mesh.position)) {
      this.spawnDeflectImpact();
      this.scene.remove(this.mesh);
      return false;
    }
    if (this.hitsBlocker()) {
      this.spawnBlockerImpact();
      this.scene.remove(this.mesh);
      return false;
    }
    if (dist < 2.2) {
      this.player.takeDamage(15);
      this.scene.remove(this.mesh);
      return false;
    }
    if (this.life <= 0) {
      this.scene.remove(this.mesh);
      return false;
    }
    return true;
  }

  private hitsBlocker(): boolean {
    const pos = this.mesh.position;
    return EnemyManager.getArrowBlockers().some(blocker => {
      const dx = pos.x - blocker.x;
      const dz = pos.z - blocker.z;
      return dx * dx + dz * dz < blocker.radius * blocker.radius && pos.y < 3.2;
    });
  }

  private spawnBlockerImpact() {
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
    );
    spark.position.copy(this.mesh.position);
    spawnTransientVfx(this.scene, [spark], 0.18, (t) => {
      spark.scale.setScalar(1 + (1 - t) * 1.44);
      (spark.material as THREE.MeshBasicMaterial).opacity = t;
    });
  }

  private spawnDeflectImpact() {
    const ringGeo = new THREE.RingGeometry(0.25, 1.1, 24);
    const ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: 0x9fd8ff,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    ring.position.copy(this.mesh.position);
    ring.lookAt(this.player.getCameraPosition());

    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xfff4b8,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sparks: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const spark = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.28), sparkMat);
      spark.position.copy(this.mesh.position);
      spark.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      sparks.push(spark);
    }

    spawnTransientVfx(this.scene, [ring, ...sparks], 0.22, (t, dt) => {
      ring.scale.setScalar(1 + (1 - t) * 2.4);
      (ring.material as THREE.MeshBasicMaterial).opacity = t * 0.9;
      sparks.forEach((spark, i) => {
        const angle = (i / sparks.length) * Math.PI * 2;
        spark.position.x += Math.cos(angle) * 5.4 * dt;
        spark.position.y += 2.1 * dt;
        spark.position.z += Math.sin(angle) * 5.4 * dt;
        (spark.material as THREE.MeshBasicMaterial).opacity = t * 0.95;
      });
    });
  }
}

class ValorRing {
  private scene: THREE.Scene;
  private ring: THREE.Mesh;
  private life = 0.35;
  private maxRadius: number;

  constructor(scene: THREE.Scene, center: THREE.Vector3, maxRadius: number) {
    this.scene = scene;
    this.maxRadius = maxRadius;
    const geo = new THREE.RingGeometry(0.1, 0.5, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    this.ring = new THREE.Mesh(geo, mat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.copy(center);
    this.ring.position.y = 0.5;
    this.scene.add(this.ring);
  }

  public update(delta: number) {
    this.life -= delta;
    const t = 1 - this.life / 0.35; // 0→1
    const scale = t * this.maxRadius;
    this.ring.scale.setScalar(scale);
    const mat = this.ring.material as THREE.MeshBasicMaterial;
    mat.opacity = (1 - t) * 0.9;
    if (this.life <= 0) {
      this.scene.remove(this.ring);
      return false;
    }
    return true;
  }
}

// Light column for valor strike
class ValorColumn {
  private scene: THREE.Scene;
  private column: THREE.Mesh;
  private life = 0.5;

  constructor(scene: THREE.Scene, center: THREE.Vector3) {
    this.scene = scene;
    const geo = new THREE.CylinderGeometry(0.3, 1.5, 20, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.column = new THREE.Mesh(geo, mat);
    this.column.position.copy(center);
    this.column.position.y = 10;
    this.scene.add(this.column);
  }

  public update(delta: number) {
    this.life -= delta;
    const t = Math.max(0, this.life / 0.5); // 1→0
    this.column.scale.set(1 + (1 - t) * 2, 1, 1 + (1 - t) * 2);
    (this.column.material as THREE.MeshBasicMaterial).opacity = t * 0.7;
    if (this.life <= 0) {
      this.scene.remove(this.column);
      return false;
    }
    return true;
  }
}

class DamageNumber {
  private scene: THREE.Scene;
  private mesh: THREE.Mesh;
  private life = 0.8;
  private velocity = new THREE.Vector3(0, 3, 0);

  // Shared across all damage numbers — built once, never per-hit.
  private static geo: THREE.PlaneGeometry | null = null;
  private static texCache = new Map<string, THREE.CanvasTexture>();

  /** Cached number texture keyed by value+colour — avoids a GPU upload per hit. */
  private static getTexture(amount: number, big: boolean): THREE.CanvasTexture {
    const rounded = Math.round(amount);
    const key = `${rounded}|${big ? 1 : 0}`;
    let tex = DamageNumber.texCache.get(key);
    if (tex) return tex;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = big ? '#ff4444' : '#ffcc44';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(rounded.toString(), 64, 48);
    ctx.fillText(rounded.toString(), 64, 48);
    tex = new THREE.CanvasTexture(canvas);
    DamageNumber.texCache.set(key, tex);
    return tex;
  }

  /** Free shared resources on engine teardown. */
  static disposeShared() {
    DamageNumber.texCache.forEach(t => t.dispose());
    DamageNumber.texCache.clear();
    DamageNumber.geo?.dispose();
    DamageNumber.geo = null;
  }

  constructor(scene: THREE.Scene, position: THREE.Vector3, amount: number, camera: THREE.Camera) {
    this.scene = scene;
    if (!DamageNumber.geo) DamageNumber.geo = new THREE.PlaneGeometry(1.5, 0.75);
    const mat = new THREE.MeshBasicMaterial({
      map: DamageNumber.getTexture(amount, amount >= 200), transparent: true, opacity: 1.0,
      side: THREE.DoubleSide, depthWrite: false,
    });
    this.mesh = new THREE.Mesh(DamageNumber.geo, mat);
    this.mesh.position.copy(position);
    this.mesh.position.y += 2.5 + Math.random() * 0.5;
    this.mesh.position.x += (Math.random() - 0.5) * 1.0;
    this.mesh.lookAt(camera.position);
    this.velocity.x = (Math.random() - 0.5) * 2;
    this.scene.add(this.mesh);
  }

  public update(delta: number, camera: THREE.Camera): boolean {
    this.life -= delta;
    this.mesh.position.addScaledVector(this.velocity, delta);
    this.velocity.y -= 2 * delta;
    this.mesh.lookAt(camera.position);
    const t = Math.max(0, this.life / 0.8);
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = t;
    this.mesh.scale.setScalar(0.8 + (1 - t) * 0.4);
    if (this.life <= 0) {
      this.scene.remove(this.mesh);
      (this.mesh.material as THREE.Material).dispose(); // shared geo + cached texture survive
      return false;
    }
    return true;
  }
}

// Ground shockwave disc for valor strike
class ValorShockwave {
  private scene: THREE.Scene;
  private disc: THREE.Mesh;
  private life = 0.4;
  private maxRadius: number;

  constructor(scene: THREE.Scene, center: THREE.Vector3, maxRadius: number) {
    this.scene = scene;
    this.maxRadius = maxRadius;
    const geo = new THREE.CircleGeometry(1, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffcc44,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.disc = new THREE.Mesh(geo, mat);
    this.disc.rotation.x = -Math.PI / 2;
    this.disc.position.copy(center);
    this.disc.position.y = 0.15;
    this.scene.add(this.disc);
  }

  public update(delta: number) {
    this.life -= delta;
    const t = 1 - this.life / 0.4; // 0→1
    const scale = t * this.maxRadius;
    this.disc.scale.setScalar(scale);
    (this.disc.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.5;
    if (this.life <= 0) {
      this.scene.remove(this.disc);
      return false;
    }
    return true;
  }
}
