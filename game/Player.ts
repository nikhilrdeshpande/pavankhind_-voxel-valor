
import * as THREE from 'three';
import { InputManager } from './InputManager';
import { AudioManager } from './AudioManager';
import { createClothPanel, createMarathaDhal } from './ModelParts';
import { spawnTransientVfx } from './TransientVfx';
import { boostMetalReflections } from './EnvMap';

export class Player {
  private mesh: THREE.Group;
  private camera: THREE.PerspectiveCamera;
  private input: InputManager;
  private audio: AudioManager;

  private health: number = 100;
  private stamina: number = 100;
  private comboCount: number = 0;
  private comboTimer: number = 0;
  private rage: number = 0;
  private maxCombo = 0;
  private damageTaken = 0;
  private valorStrikesUsed = 0;
  private weaponLevel = 1;
  private attackMultiplier = 1;
  private staminaRegenMultiplier = 1;
  private valorGainMultiplier = 1;
  private moveSpeedMultiplier = 1;
  private killHeal = 0;
  private damageTakenMultiplier = 1;
  private dodgeCooldownScale = 1;
  private comboWindow = 2.0;
  private slowmoTimer = 0;
  private slowmoFactor = 0.35;
  private valorStrikeQueued = false;
  private valorStrikeCooldown = 0;
  private valorStrikeArmed = false;
  private blockingDisabled = false;
  private blockCount = 0;
  private dodgeCount = 0;
  private damageCooldown = 0;
  private usedValorSave = false;
  private cameraYaw = 0; // separate camera yaw for camera-relative movement
  private cameraPitch = -0.78;

  private velocity = new THREE.Vector3();
  private isBlocking = false;
  private attackCooldown = 0;
  private swingPhase: 'WINDUP' | 'STRIKE' | 'RECOVERY' | 'IDLE' = 'IDLE';
  private swingTimer = 0;
  private hitStopTimer = 0;
  private swingSide = 1;
  private swingHitEnemy = false;
  private swingCount = 0;
  private heavySwing = false;
  private parryTimer = 0;
  private wasBlockingInput = false;
  private dodgeTimer = 0;
  private dodgeCooldown = 0;
  private dodgeDir = new THREE.Vector3(0, 0, -1);

  private sword: THREE.Mesh;
  private swordPivot: THREE.Group;
  private rightArm: THREE.Group;
  private leftArm: THREE.Group;
  private leftSword: THREE.Mesh;
  private leftSwordPivot!: THREE.Group;
  private shieldGroup: THREE.Group | null = null;
  private valorAura!: THREE.Mesh;
  private hasShield = false;
  private cameraOffset = new THREE.Vector3(0, 7.2, 8.8);
  private cameraFocusTarget: THREE.Vector3 | null = null;
  private cameraLookAhead = new THREE.Vector3();
  private attackLungeTimer = 0;
  private cameraShake = 0;
  private damagePulse = 0;
  private minZ = -1300;
  private maxZ = 80;
  private readonly groundY = 1.0;

  // Sword trail
  private trailMesh: THREE.Mesh;
  private trailPositions: THREE.Vector3[] = [];
  private trailMaxFrames = 16;
  private scene: THREE.Scene;

  // Dodge afterimage
  private afterimages: { mesh: THREE.Group; life: number }[] = [];
  private cape!: THREE.Mesh;
  private capeSegments: THREE.Mesh[] = [];
  private swordGlowLight: THREE.PointLight | null = null;
  private isMobile: boolean;
  private elapsedTime = 0;
  private dustCooldown = 0;
  private dustParticles: { mesh: THREE.Mesh; life: number; vel: THREE.Vector3 }[] = [];
  private speedLines: THREE.Mesh[] = [];

  // Hit feedback
  private hitTilt = 0;
  private hitScale = 1.0;

  // Body part refs for animation
  private leftThigh!: THREE.Mesh;
  private leftShin!: THREE.Mesh;
  private rightThigh!: THREE.Mesh;
  private rightShin!: THREE.Mesh;
  private leftSandal!: THREE.Mesh;
  private rightSandal!: THREE.Mesh;
  private torso!: THREE.Mesh;
  private head!: THREE.Mesh;
  private pagdiTail!: THREE.Mesh;
  private walkCycle = 0;

  // Verlet cape physics
  private capePositions: THREE.Vector3[] = [];
  private capePrevPositions: THREE.Vector3[] = [];
  private capeRestLength = 0.4;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, input: InputManager, audio: AudioManager, isMobile = false) {
    this.camera = camera;
    this.input = input;
    this.audio = audio;
    this.scene = scene;
    this.isMobile = isMobile;

    this.mesh = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({ color: 0x8d5a3b, roughness: 0.8 });
    const angarkhaMat = new THREE.MeshStandardMaterial({ color: 0xceb79a, roughness: 0.9 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.7, roughness: 0.3 });

    // --- Torso (Angarkha) ---
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 1.6, 0.6),
      angarkhaMat
    );
    torso.position.y = 1.1;
    this.mesh.add(torso);
    this.torso = torso;

    // Angarkha front panel (V-overlap)
    const frontPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 1.5, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xf5f0e0, roughness: 0.85 })
    );
    frontPanel.position.set(0.05, 1.1, 0.32);
    frontPanel.rotation.y = -0.1;
    this.mesh.add(frontPanel);

    const angarkhaFoldMat = new THREE.MeshStandardMaterial({ color: 0xe7d8ba, roughness: 0.88 });
    for (let i = 0; i < 3; i++) {
      const fold = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.32 - i * 0.08, 0.018), angarkhaFoldMat);
      fold.position.set(-0.25 + i * 0.18, 1.08, 0.335);
      fold.rotation.z = -0.08 + i * 0.04;
      this.mesh.add(fold);
    }

    // Gold buttons along overlap
    for (let i = 0; i < 3; i++) {
      const button = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), goldMat);
      button.position.set(0.2, 1.5 - i * 0.35, 0.33);
      this.mesh.add(button);
    }

    // --- Dhoti (lower garment) ---
    const dhoti = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.8, 0.55),
      new THREE.MeshStandardMaterial({ color: 0xf0e6d0, roughness: 0.85 })
    );
    dhoti.position.set(0, 0.2, 0);
    this.mesh.add(dhoti);

    // --- Leg segments (thigh + shin) ---
    const legMat = new THREE.MeshStandardMaterial({ color: 0x8d5a3b, roughness: 0.8 });
    const dhotiFabricMat = new THREE.MeshStandardMaterial({ color: 0xf0e6d0, roughness: 0.85 });
    // Left leg
    const leftThigh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.45, 0.25), dhotiFabricMat);
    leftThigh.position.set(-0.2, -0.25, 0);
    this.mesh.add(leftThigh);
    this.leftThigh = leftThigh;
    const leftShin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.2), legMat);
    leftShin.position.set(-0.2, -0.6, 0);
    this.mesh.add(leftShin);
    this.leftShin = leftShin;
    // Right leg
    const rightThigh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.45, 0.25), dhotiFabricMat);
    rightThigh.position.set(0.2, -0.25, 0);
    this.mesh.add(rightThigh);
    this.rightThigh = rightThigh;
    const rightShin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.2), legMat);
    rightShin.position.set(0.2, -0.6, 0);
    this.mesh.add(rightShin);
    this.rightShin = rightShin;

    // --- Sandals ---
    const sandalMat = new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.9 });
    const leftSandal = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.35), sandalMat);
    leftSandal.position.set(-0.2, -0.82, 0.03);
    this.mesh.add(leftSandal);
    this.leftSandal = leftSandal;
    const rightSandal = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.35), sandalMat);
    rightSandal.position.set(0.2, -0.82, 0.03);
    this.mesh.add(rightSandal);
    this.rightSandal = rightSandal;

    // Kolhapuri sandal straps
    const strapMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9 });
    const lStrap = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.25), strapMat);
    lStrap.position.set(-0.2, -0.76, 0.03);
    this.mesh.add(lStrap);
    const rStrap = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.25), strapMat);
    rStrap.position.set(0.2, -0.76, 0.03);
    this.mesh.add(rStrap);

    // --- Head ---
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.55, 0.55),
      skinMat
    );
    head.position.y = 1.95;
    this.mesh.add(head);
    this.head = head;

    // --- Face Detail ---
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a0e08, roughness: 0.9 });
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.03), eyeMat);
    eyeL.position.set(-0.1, 1.95, 0.28);
    this.mesh.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.03), eyeMat);
    eyeR.position.set(0.1, 1.95, 0.28);
    this.mesh.add(eyeR);
    const noseBridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.1), skinMat);
    noseBridge.position.set(0, 1.88, 0.28);
    this.mesh.add(noseBridge);

    // --- Pagdi (Saffron Turban - layered wrap) ---
    const pagdiMat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.8 });
    const pagdiBase = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.55), pagdiMat);
    pagdiBase.position.set(0, 2.15, 0);
    this.mesh.add(pagdiBase);
    const pagdiMid = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.5), pagdiMat);
    pagdiMid.position.set(0.02, 2.33, 0.02);
    pagdiMid.rotation.y = 0.1;
    this.mesh.add(pagdiMid);
    const pagdiTop = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.45), pagdiMat);
    pagdiTop.position.set(-0.02, 2.48, -0.02);
    pagdiTop.rotation.y = -0.08;
    this.mesh.add(pagdiTop);
    const pagdiHighlightMat = new THREE.MeshStandardMaterial({ color: 0xffa02b, roughness: 0.75 });
    for (let i = 0; i < 3; i++) {
      const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.66 - i * 0.05, 0.045, 0.58 - i * 0.04), pagdiHighlightMat);
      wrap.position.set(0.01 * i, 2.18 + i * 0.14, 0.01 * i);
      wrap.rotation.y = 0.2 - i * 0.16;
      this.mesh.add(wrap);
    }
    // Trailing pagdi tail strip
    const pagdiTail = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.5, 0.06),
      pagdiMat
    );
    pagdiTail.position.set(0, 2.1, -0.32);
    pagdiTail.rotation.x = 0.3;
    this.mesh.add(pagdiTail);
    this.pagdiTail = pagdiTail;

    // Turban jewel (shirastra)
    const shirastraGlowMat = new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.7, roughness: 0.3, emissive: 0xd4a017, emissiveIntensity: 0.3 });
    const shirastra = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.15, 0.08),
      shirastraGlowMat
    );
    shirastra.position.set(0, 2.3, 0.3);
    this.mesh.add(shirastra);

    // Hero plume and tilak improve identity/readability from the angled camera.
    const plume = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.45, 6),
      new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xff6a00, emissiveIntensity: 0.35, roughness: 0.55 })
    );
    plume.position.set(0.16, 2.65, 0.08);
    plume.rotation.z = -0.35;
    this.mesh.add(plume);

    const tilak = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.18, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xff2f12, emissive: 0x7a1206, emissiveIntensity: 0.4 })
    );
    tilak.position.set(0, 1.98, 0.57);
    this.mesh.add(tilak);

    // --- Shoulder Guards (Valkalam) ---
    const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.6, metalness: 0.3 });
    const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.4), shoulderMat);
    shoulderL.position.set(-0.55, 1.85, 0);
    this.mesh.add(shoulderL);
    const shoulderR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.4), shoulderMat);
    shoulderR.position.set(0.55, 1.85, 0);
    this.mesh.add(shoulderR);

    // Wider pauldrons give Baji a stronger heroic silhouette.
    const pauldronMat = new THREE.MeshStandardMaterial({ color: 0xb7791f, metalness: 0.45, roughness: 0.35 });
    const pauldronL = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.5), pauldronMat);
    pauldronL.position.set(-0.66, 1.82, 0);
    pauldronL.rotation.z = 0.08;
    this.mesh.add(pauldronL);
    const pauldronR = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.5), pauldronMat);
    pauldronR.position.set(0.66, 1.82, 0);
    pauldronR.rotation.z = -0.08;
    this.mesh.add(pauldronR);

    // --- Strap ---
    const strap = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 1.7, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.8 })
    );
    strap.position.set(0.15, 1.1, 0.2);
    strap.rotation.z = 0.45;
    this.mesh.add(strap);

    // --- Sash ---
    const sash = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.25, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.7 })
    );
    sash.position.set(0, 0.55, 0.1);
    this.mesh.add(sash);

    const waistPlate = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.12, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.65, roughness: 0.35 })
    );
    waistPlate.position.set(0, 0.68, 0.42);
    this.mesh.add(waistPlate);

    const waistCordMat = new THREE.MeshStandardMaterial({ color: 0xf6c453, roughness: 0.45, metalness: 0.35 });
    const waistCord = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.025, 5, 18), waistCordMat);
    waistCord.position.set(0, 0.61, 0.08);
    waistCord.scale.z = 0.42;
    waistCord.rotation.x = Math.PI / 2;
    this.mesh.add(waistCord);

    // --- Dagger Sheath ---
    const sheathMat = new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.8 });
    const sheath = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.06), sheathMat);
    sheath.position.set(-0.35, 0.35, 0.2);
    sheath.rotation.z = 0.3;
    this.mesh.add(sheath);
    // Dagger handle
    const daggerHandle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.04), goldMat);
    daggerHandle.position.set(-0.35, 0.55, 0.2);
    daggerHandle.rotation.z = 0.3;
    this.mesh.add(daggerHandle);

    // --- Sash tassel ---
    const tassel = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.3, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.7 })
    );
    tassel.position.set(-0.45, 0.3, 0.15);
    this.mesh.add(tassel);

    // --- Gold trim along angarkha ---
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.6, roughness: 0.4 });
    const trimLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.5, 0.02), trimMat);
    trimLeft.position.set(-0.48, 1.1, 0.3);
    this.mesh.add(trimLeft);
    const trimRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.5, 0.02), trimMat);
    trimRight.position.set(0.48, 1.1, 0.3);
    this.mesh.add(trimRight);

    // --- Multi-segment Cape ---
    const capeMat = new THREE.MeshStandardMaterial({ color: 0x3f1d1d, roughness: 0.95 });
    for (let i = 0; i < 3; i++) {
      const seg = createClothPanel(0.85 - i * 0.05, 0.45, 0x3f1d1d, i === 0 ? 0xd4a017 : undefined);
      seg.position.set(0.2, 1.55 - i * 0.4, -0.35 - i * 0.06);
      seg.rotation.y = -0.2;
      this.mesh.add(seg);
      this.capeSegments.push(seg.children[0] as THREE.Mesh);
    }
    this.cape = this.capeSegments[0]; // keep reference for compatibility

    // Initialize Verlet cape positions
    for (let i = 0; i < 3; i++) {
      const pos = new THREE.Vector3(0.2, 1.55 - i * 0.4, -0.35 - i * 0.06);
      this.capePositions.push(pos.clone());
      this.capePrevPositions.push(pos.clone());
    }

    // --- Prominent Maratha Mustache ---
    const mustacheMat = new THREE.MeshStandardMaterial({ color: 0x2b1b12, roughness: 0.9 });
    const mustacheLeft = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.04, 6, 10, Math.PI),
      mustacheMat
    );
    mustacheLeft.position.set(-0.14, 1.88, 0.3);
    mustacheLeft.rotation.set(Math.PI / 2, 0, Math.PI / 6);
    this.mesh.add(mustacheLeft);

    const mustacheRight = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.04, 6, 10, Math.PI),
      mustacheMat
    );
    mustacheRight.position.set(0.14, 1.88, 0.3);
    mustacheRight.rotation.set(Math.PI / 2, 0, -Math.PI / 6);
    this.mesh.add(mustacheRight);

    // --- Right Arm + Sword with Cross-Guard ---
    const rArm = new THREE.Group();
    const rUpperArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.55, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xceb79a, roughness: 0.85 })
    );
    rUpperArm.position.y = -0.28;
    rArm.add(rUpperArm);
    const rForearm = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.55, 0.25),
      skinMat
    );
    rForearm.position.y = -0.75;
    rArm.add(rForearm);
    rArm.position.set(0.65, 1.7, 0);
    this.rightArm = rArm;
    this.mesh.add(rArm);

    // --- Wrist Guards (Vambraces) ---
    const vambraceMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, metalness: 0.5, roughness: 0.4 });
    const rVambrace = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.28), vambraceMat);
    rVambrace.position.y = -0.65;
    rArm.add(rVambrace);

    this.swordPivot = new THREE.Group();
    this.swordPivot.position.set(0, -0.9, -0.1);
    rArm.add(this.swordPivot);
    this.sword = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 3.15, 0.045),
      new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 1.0, roughness: 0.15 })
    );
    this.sword.position.y = 1.8;
    this.swordPivot.add(this.sword);
    // Blade edge highlight
    const bladeEdge = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 2.9, 0.01),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaaaaaa, emissiveIntensity: 0.3, metalness: 1.0, roughness: 0.1 })
    );
    bladeEdge.position.set(0.08, 1.8, 0);
    this.swordPivot.add(bladeEdge);
    const bladeTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.085, 0.28, 4),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.1 })
    );
    bladeTip.position.y = 3.42;
    bladeTip.rotation.z = Math.PI / 4;
    this.swordPivot.add(bladeTip);
    // Cross-guard
    const crossGuardR = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.08, 0.08),
      goldMat
    );
    crossGuardR.position.y = 0.3;
    this.swordPivot.add(crossGuardR);

    // Sword pommel
    const pommelR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), goldMat);
    pommelR.position.y = 0.2;
    this.swordPivot.add(pommelR);

    // --- Sword glow light (skip on mobile) ---
    if (!this.isMobile) {
      this.swordGlowLight = new THREE.PointLight(0xff8833, 0, 8);
      this.swordGlowLight.position.set(0, 1.5, 0);
      this.swordPivot.add(this.swordGlowLight);
    }

    // --- Left Arm + Second Sword with Cross-Guard ---
    this.leftArm = new THREE.Group();
    const lUpperArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.55, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xceb79a, roughness: 0.85 })
    );
    lUpperArm.position.y = -0.28;
    this.leftArm.add(lUpperArm);
    const lForearm = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.55, 0.25),
      skinMat
    );
    lForearm.position.y = -0.75;
    this.leftArm.add(lForearm);

    const lVambrace = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.28), vambraceMat);
    lVambrace.position.y = -0.65;
    this.leftArm.add(lVambrace);

    this.leftSwordPivot = new THREE.Group();
    this.leftSwordPivot.position.set(0, -0.9, -0.1);
    this.leftArm.add(this.leftSwordPivot);
    this.leftSword = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 2.7, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.9, roughness: 0.2 })
    );
    this.leftSword.position.y = 1.6;
    this.leftSwordPivot.add(this.leftSword);
    // Cross-guard
    const crossGuardL = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.07, 0.07),
      goldMat
    );
    crossGuardL.position.y = 0.25;
    this.leftSwordPivot.add(crossGuardL);

    // Left sword pommel
    const pommelL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), goldMat);
    pommelL.position.y = 0.15;
    this.leftSwordPivot.add(pommelL);

    this.leftArm.position.set(-0.65, 1.7, 0);
    this.mesh.add(this.leftArm);

    this.mesh.position.y = this.groundY;

    const valorAuraGeo = new THREE.RingGeometry(1.15, 1.55, 36);
    valorAuraGeo.rotateX(-Math.PI / 2);
    this.valorAura = new THREE.Mesh(
      valorAuraGeo,
      new THREE.MeshBasicMaterial({
        color: 0xffb000,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.valorAura.position.y = -0.92;
    this.valorAura.visible = false;
    this.mesh.add(this.valorAura);

    // --- Sword Trail ---
    this.trailMesh = this.createSwordTrail();
    scene.add(this.trailMesh);

    boostMetalReflections(this.mesh);
    scene.add(this.mesh);
  }

  private createSwordTrail(): THREE.Mesh {
    // Create a ribbon geometry with enough vertices for the trail
    const segments = this.trailMaxFrames - 1;
    const geo = new THREE.BufferGeometry();
    // Two vertices per frame (top and bottom of ribbon)
    const positions = new Float32Array(this.trailMaxFrames * 2 * 3);
    const alphas = new Float32Array(this.trailMaxFrames * 2);
    const indices: number[] = [];
    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      indices.push(a, c, b, b, c, d);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    geo.setIndex(indices);

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uColor: { value: new THREE.Color(0xff8833) },
        uComboBoost: { value: 1.0 },
      },
      vertexShader: `
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vAlpha = alpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uComboBoost;
        varying float vAlpha;
        void main() {
          // Gradient: newest (vAlpha~1) = white-hot, oldest (vAlpha~0) = deep orange
          vec3 hotColor = vec3(1.0, 0.95, 0.8);
          vec3 coolColor = uColor;
          vec3 col = mix(coolColor, hotColor, vAlpha);
          gl_FragColor = vec4(col, vAlpha * uComboBoost);
        }
      `,
    });

    return new THREE.Mesh(geo, mat);
  }

  private updateSwordTrail() {
    // Get world position of the sword tip
    const tipLocal = new THREE.Vector3(0, 3.2, 0);
    const baseLocal = new THREE.Vector3(0, 0.3, 0);
    const tipWorld = tipLocal.clone();
    const baseWorld = baseLocal.clone();
    this.sword.localToWorld(tipWorld);
    this.sword.localToWorld(baseWorld);

    if (this.swingPhase === 'STRIKE') {
      this.trailPositions.unshift(tipWorld.clone(), baseWorld.clone());
      if (this.trailPositions.length > this.trailMaxFrames * 2) {
        this.trailPositions.length = this.trailMaxFrames * 2;
      }
    } else {
      // Fade out: remove oldest positions
      if (this.trailPositions.length > 0) {
        this.trailPositions.splice(this.trailPositions.length - 2, 2);
      }
    }

    const posAttr = this.trailMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const alphaAttr = this.trailMesh.geometry.getAttribute('alpha') as THREE.BufferAttribute;
    const totalFrames = Math.floor(this.trailPositions.length / 2);

    for (let i = 0; i < this.trailMaxFrames; i++) {
      if (i < totalFrames) {
        const tip = this.trailPositions[i * 2];
        const base = this.trailPositions[i * 2 + 1];
        posAttr.setXYZ(i * 2, tip.x, tip.y, tip.z);
        posAttr.setXYZ(i * 2 + 1, base.x, base.y, base.z);
        // Alpha fades from 1 (newest) to 0 (oldest)
        const alpha = 1 - i / this.trailMaxFrames;
        alphaAttr.setX(i * 2, alpha);
        alphaAttr.setX(i * 2 + 1, alpha * 0.5); // base is dimmer
      } else {
        // Hide unused vertices
        posAttr.setXYZ(i * 2, 0, -100, 0);
        posAttr.setXYZ(i * 2 + 1, 0, -100, 0);
        alphaAttr.setX(i * 2, 0);
        alphaAttr.setX(i * 2 + 1, 0);
      }
    }
    posAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
    this.trailMesh.visible = totalFrames > 1;
    // Combo boost: brighter trail at 5+ combo
    const trailMat = this.trailMesh.material as THREE.ShaderMaterial;
    trailMat.uniforms.uComboBoost.value = this.heavySwing ? 2.0 : this.comboCount >= 5 ? 1.5 : 1.0;
  }

  public applySwordSkin(bladeColor: number, guardColor: number, emissive?: number) {
    const bladeMat = this.sword.material as THREE.MeshStandardMaterial;
    bladeMat.color.setHex(bladeColor);
    if (emissive !== undefined) {
      bladeMat.emissive.setHex(emissive);
      bladeMat.emissiveIntensity = 0.5;
    } else {
      bladeMat.emissive.setHex(0x000000);
      bladeMat.emissiveIntensity = 0;
    }
    const leftBladeMat = this.leftSword.material as THREE.MeshStandardMaterial;
    leftBladeMat.color.setHex(bladeColor);
    if (emissive !== undefined) {
      leftBladeMat.emissive.setHex(emissive);
      leftBladeMat.emissiveIntensity = 0.4;
    } else {
      leftBladeMat.emissive.setHex(0x000000);
      leftBladeMat.emissiveIntensity = 0;
    }
    // Update cross-guards
    this.swordPivot.children.forEach(child => {
      if (child !== this.sword && (child as THREE.Mesh).isMesh) {
        ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setHex(guardColor);
      }
    });
    // Update trail color based on sword skin
    const trailMat = this.trailMesh.material as THREE.ShaderMaterial;
    if (emissive !== undefined) {
      trailMat.uniforms.uColor.value.setHex(emissive);
    } else {
      trailMat.uniforms.uColor.value.setHex(0xff8833);
    }
  }

  public applyShield(faceColor: number, rimColor: number, emblemColor: number) {
    // Remove left sword, add shield
    this.leftSwordPivot.visible = false;
    this.hasShield = true;

    // Remove old shield if exists
    if (this.shieldGroup) {
      this.leftArm.remove(this.shieldGroup);
    }

    this.shieldGroup = new THREE.Group();
    this.shieldGroup.position.set(0, -0.5, -0.3);
    this.shieldGroup.rotation.x = -0.3;
    this.shieldGroup.add(createMarathaDhal(faceColor, rimColor, emblemColor, 1.04));

    this.leftArm.add(this.shieldGroup);
  }

  public removeShield() {
    if (this.shieldGroup) {
      this.leftArm.remove(this.shieldGroup);
      this.shieldGroup = null;
    }
    this.leftSwordPivot.visible = true;
    this.hasShield = false;
  }

  public applyAngarkhaSkin(torsoColor: number, sashColor: number) {
    // Torso is mesh.children[0]
    const torso = this.mesh.children[0] as THREE.Mesh;
    if (torso?.isMesh) {
      (torso.material as THREE.MeshStandardMaterial).color.setHex(torsoColor);
    }
    // Right arm mesh
    const rArmMesh = this.rightArm.children[0] as THREE.Mesh;
    if (rArmMesh?.isMesh) {
      (rArmMesh.material as THREE.MeshStandardMaterial).color.setHex(torsoColor);
    }
    // Left arm mesh
    const lArmMesh = this.leftArm.children[0] as THREE.Mesh;
    if (lArmMesh?.isMesh) {
      (lArmMesh.material as THREE.MeshStandardMaterial).color.setHex(torsoColor);
    }
    // Sash is at index 6 (torso, frontPanel, 3 buttons, dhoti, head... actually let's find it by color)
    this.mesh.children.forEach(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat.color.getHex() === 0x7f1d1d) {
          mat.color.setHex(sashColor);
        }
      }
    });
  }

  public update(delta: number) {
    if (this.hitStopTimer > 0) {
        this.hitStopTimer -= delta;
        return;
    }

    this.parryTimer = Math.max(0, this.parryTimer - delta);
    this.dodgeTimer = Math.max(0, this.dodgeTimer - delta);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - delta);

    this.handleMovement(delta);
    this.handleCombat(delta);
    this.handleValorStrikeInput(delta);
    this.updateStats(delta);
    this.updateCamera(delta);
    this.updateSwordTrail();
    this.updateAfterimages(delta);

    // Elapsed time
    this.elapsedTime += delta;

    // Locomotion & idle animation
    this.animateLocomotion(delta);

    // Verlet cape physics
    this.updateCapeVerlet(delta);

    // Sword glow light intensity based on swing phase
    if (this.swordGlowLight) {
      const targetIntensity = this.swingPhase === 'STRIKE' ? 60 : this.swingPhase === 'WINDUP' ? 30 : 0;
      this.swordGlowLight.intensity = THREE.MathUtils.lerp(this.swordGlowLight.intensity, targetIntensity, delta * 15);
    }

    // Sword idle breathing glow
    const bladeMat = this.sword.material as THREE.MeshStandardMaterial;
    if (this.swingPhase === 'IDLE' && bladeMat.emissiveIntensity !== undefined) {
      const breathe = (Math.sin(this.elapsedTime * 3) * 0.5 + 0.5) * 0.15;
      // Only do breathing if no skin emissive override
      if (bladeMat.emissive.getHex() === 0x000000) {
        bladeMat.emissive.setHex(0x443322);
        bladeMat.emissiveIntensity = breathe;
      }
    }

    // Footstep dust
    this.updateDust(delta);

    // Speed lines during dodge
    this.updateSpeedLines();

    if (this.damagePulse > 0) {
      this.damagePulse -= delta * 4;
    }

    // Hit feedback recovery
    if (this.hitTilt !== 0) {
      this.hitTilt = THREE.MathUtils.lerp(this.hitTilt, 0, delta * 12);
      if (Math.abs(this.hitTilt) < 0.001) this.hitTilt = 0;
    }
    if (this.hitScale !== 1.0) {
      this.hitScale = THREE.MathUtils.lerp(this.hitScale, 1.0, delta * 15);
      this.mesh.scale.setScalar(this.hitScale);
      if (Math.abs(this.hitScale - 1.0) < 0.001) {
        this.hitScale = 1.0;
        this.mesh.scale.setScalar(1.0);
      }
    }

    const material = (this.mesh.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
    const rageGlow = this.rage >= 100 ? 0.6 : 0;
    const pulseGlow = Math.max(0, this.damagePulse);
    if (pulseGlow > 0) {
      material.emissive.setHex(0xff2b2b);
      material.emissiveIntensity = pulseGlow;
    } else if (rageGlow > 0) {
      material.emissive.setHex(0xffa63b);
      material.emissiveIntensity = rageGlow;
    } else {
      material.emissive.setHex(0x000000);
      material.emissiveIntensity = 0;
    }
    this.updateHeroStateVisuals(delta);
  }

  private updateHeroStateVisuals(delta: number) {
    const auraMat = this.valorAura.material as THREE.MeshBasicMaterial;
    const valorReady = this.rage >= 100;
    this.valorAura.visible = valorReady || auraMat.opacity > 0.02;
    const targetOpacity = valorReady ? 0.62 : 0;
    auraMat.opacity = THREE.MathUtils.lerp(auraMat.opacity, targetOpacity, delta * 8);
    const auraPulse = 1 + Math.sin(this.elapsedTime * 5) * 0.08;
    this.valorAura.scale.setScalar(auraPulse);
    this.valorAura.rotation.z += delta * (valorReady ? 1.8 : 0.6);

    if (this.shieldGroup) {
      const targetShieldGlow = this.isBlocking ? 0.42 : 0.08;
      this.shieldGroup.traverse(child => {
        if (!(child as THREE.Mesh).isMesh) return;
        const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (!mat.emissive) return;
        mat.emissive.setHex(this.isBlocking ? 0x8fc7ff : mat.color.getHex());
        mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetShieldGlow, delta * 10);
      });
    }
  }

  public triggerHitStop(isLethal: boolean) {
    this.hitStopTimer = isLethal ? 0.08 : 0.04;
    this.cameraShake = isLethal ? 1.2 : 0.6;
    this.swingHitEnemy = true;
    this.comboCount++;
    this.comboTimer = this.comboWindow;
    this.maxCombo = Math.max(this.maxCombo, this.comboCount);
    this.rage = Math.min(100, this.rage + (isLethal ? 18 : 8) * this.valorGainMultiplier);

    // Combo healing (Bloodborne rally system)
    if (this.comboCount >= 9) {
      this.health = Math.min(100, this.health + 5); // 5 HP at Mythic combo
    } else if (this.comboCount >= 5) {
      this.health = Math.min(100, this.health + 2); // 2 HP at Fury combo
    }

    // Kill healing
    if (isLethal) {
      this.health = Math.min(100, this.health + 5); // +5 HP per kill
      this.slowmoTimer = 0.18;
    }
  }

  private handleMovement(delta: number) {
    // Keep mesh upright — only Y rotation allowed during gameplay
    if (!this.isDead) {
      this.mesh.rotation.x = 0;
      this.mesh.rotation.z = 0;
    }

    let moveSpeed = (this.stamina < 15 ? 4 : 14);
    moveSpeed *= this.moveSpeedMultiplier;
    if (this.isBlocking) moveSpeed *= 0.4;

    // Camera-relative movement (Genshin/Roblox pattern)
    // Joystick/WASD moves relative to camera direction, not character direction
    const direction = new THREE.Vector3();
    if (this.input.keys['w']) direction.z -= 1;
    if (this.input.keys['s']) direction.z += 1;
    if (this.input.keys['a']) direction.x -= 1;
    if (this.input.keys['d']) direction.x += 1;

    // Apply camera yaw to movement direction
    const camYawQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0), this.cameraYaw
    );

    if (direction.length() > 0) {
      direction.normalize().applyQuaternion(camYawQuat);
      this.velocity.lerp(direction.multiplyScalar(moveSpeed), delta * 15);

      // Auto-rotate character to face movement direction
      const targetYaw = Math.atan2(this.velocity.x, this.velocity.z);
      // Smooth turn toward movement direction
      let yawDiff = targetYaw - this.mesh.rotation.y;
      // Normalize to [-PI, PI]
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      this.mesh.rotation.y += yawDiff * Math.min(1, delta * 12);
    } else {
      this.velocity.lerp(new THREE.Vector3(0, 0, 0), delta * 20);
    }

    const isActive = this.input.isInputActive();
    const wantsDodge = isActive && this.input.keys[' '] && this.dodgeCooldown <= 0 && this.stamina > 20;
    if (wantsDodge) {
      this.dodgeTimer = 0.25;
      this.dodgeCooldown = 0.6 * this.dodgeCooldownScale;
      this.dodgeCount++;
      this.stamina -= 20;
      // Dodge in camera-relative direction
      this.dodgeDir = direction.length() > 0 ? direction.clone() : new THREE.Vector3(0, 0, -1).applyQuaternion(camYawQuat);
      this.spawnAfterimage();
      this.spawnDodgeBurst();
      this.audio.playDodgeWhoosh();
    }

    if (this.dodgeTimer > 0) {
      this.velocity.copy(this.dodgeDir.clone().multiplyScalar(26));
    }

    const nextPos = this.mesh.position.clone().add(this.velocity.clone().multiplyScalar(delta));
    nextPos.x = Math.max(-19.5, Math.min(19.5, nextPos.x));
    nextPos.y = this.groundY;
    nextPos.z = Math.max(this.minZ, Math.min(this.maxZ, nextPos.z));
    this.mesh.position.copy(nextPos);
    // Belt-and-suspenders: hard clamp after copy to prevent any frame skip escape
    this.mesh.position.x = Math.max(-19.5, Math.min(19.5, this.mesh.position.x));
    this.mesh.position.y = this.groundY;
    this.mesh.position.z = Math.max(this.minZ, Math.min(this.maxZ, this.mesh.position.z));

    if (this.input.isInputActive()) {
        // Mouse/touch controls camera yaw (not character — character auto-faces velocity)
        const rawTurn = this.input.mouseDelta.x * 0.00135;
        const clampedTurn = Math.max(-0.08, Math.min(0.08, rawTurn));
        this.cameraYaw -= clampedTurn;
        const rawPitch = this.input.mouseDelta.y * 0.0011;
        this.cameraPitch = THREE.MathUtils.clamp(this.cameraPitch - rawPitch, -1.12, -0.52);
        // Normalize to [-PI, PI]
        while (this.cameraYaw > Math.PI) this.cameraYaw -= Math.PI * 2;
        while (this.cameraYaw < -Math.PI) this.cameraYaw += Math.PI * 2;
        this.input.mouseDelta.set(0, 0);
    }
  }

  private spawnAfterimage() {
    // Create a ghostly copy of the player mesh at current position
    const ghost = new THREE.Group();
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x66aaff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });
    // Simple silhouette: torso + head
    const torsoGhost = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.6, 0.6), ghostMat);
    torsoGhost.position.y = 1.1;
    ghost.add(torsoGhost);
    const headGhost = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), ghostMat);
    headGhost.position.y = 1.95;
    ghost.add(headGhost);

    ghost.position.copy(this.mesh.position);
    ghost.rotation.copy(this.mesh.rotation);
    this.scene.add(ghost);
    this.afterimages.push({ mesh: ghost, life: 0.3 });
  }

  private updateAfterimages(delta: number) {
    this.afterimages = this.afterimages.filter(img => {
      img.life -= delta;
      const opacity = Math.max(0, img.life / 0.3) * 0.4;
      img.mesh.children.forEach(child => {
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.opacity = opacity;
      });
      if (img.life <= 0) {
        this.scene.remove(img.mesh);
        return false;
      }
      return true;
    });
  }

  private handleCombat(delta: number) {
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    const isActive = this.input.isInputActive();

    // Check RMB (button 2) for blocking
    this.isBlocking = !this.blockingDisabled && isActive && this.input.mouseButtons[2] && this.stamina > 2;
    const isBlockPressed = !!this.input.mouseButtons[2];
    if (isActive && isBlockPressed && !this.wasBlockingInput) {
      this.parryTimer = 0.3;
      this.blockCount++;
    }
    this.wasBlockingInput = isBlockPressed;

    // Right Hand Animation (Sword)
    const rArm = this.rightArm;
    const comboMod = 1 + Math.min(this.comboCount * 0.15, 1.0);

    if (isActive && this.input.mouseButtons[0] && this.swingPhase === 'IDLE' && !this.isBlocking && this.attackCooldown <= 0) {
      this.swingPhase = 'WINDUP';
      this.swingTimer = 0;
      this.swingSide *= -1;
      this.swingHitEnemy = false;
      this.swingCount++;
      // Every 3rd swing while in a combo becomes a heavy strike: more damage,
      // smashes through Shielder guards, bigger lunge.
      this.heavySwing = this.comboCount >= 2 && this.swingCount % 3 === 0;
      this.attackLungeTimer = this.heavySwing ? 0.2 : 0.14;
      this.faceCombatTarget(delta, 1);
      this.stamina -= this.heavySwing ? 16 : 12;
      this.audio.playBreath(this.heavySwing ? 1.1 : 0.6);
      if (this.heavySwing) this.cameraShake = Math.max(this.cameraShake, 0.25);
    }

    if (this.swingPhase !== 'IDLE') {
      this.swingTimer += delta * comboMod;
      this.faceCombatTarget(delta, this.swingPhase === 'STRIKE' ? 1.15 : 0.65);
      const heavyAmp = this.heavySwing ? 1.25 : 1;
      if (this.swingPhase === 'WINDUP') {
        rArm.rotation.x = THREE.MathUtils.lerp(rArm.rotation.x, (Math.PI / 2.2) * heavyAmp, delta * 30 * comboMod);
        rArm.rotation.z = THREE.MathUtils.lerp(rArm.rotation.z, this.swingSide * 0.8 * heavyAmp, delta * 25 * comboMod);
        if (this.swingTimer > (this.heavySwing ? 0.1 : 0.07)) { this.swingPhase = 'STRIKE'; this.swingTimer = 0; this.audio.playSwordSwing(); }
      } else if (this.swingPhase === 'STRIKE') {
        rArm.rotation.x = THREE.MathUtils.lerp(rArm.rotation.x, (-Math.PI / 1.2) * heavyAmp, delta * 65 * comboMod);
        rArm.rotation.z = THREE.MathUtils.lerp(rArm.rotation.z, -this.swingSide * 0.5 * heavyAmp, delta * 45 * comboMod);
        this.applyAttackLunge(delta);
        if (this.swingTimer > 0.09) { this.swingPhase = 'RECOVERY'; this.swingTimer = 0; }
      } else if (this.swingPhase === 'RECOVERY') {
        rArm.rotation.x = THREE.MathUtils.lerp(rArm.rotation.x, 0, delta * 25 * comboMod);
        rArm.rotation.z = THREE.MathUtils.lerp(rArm.rotation.z, 0, delta * 25 * comboMod);
        if (this.swingTimer > 0.1) { this.swingPhase = 'IDLE'; this.attackCooldown = 0.04; }
      }
    } else {
        rArm.rotation.x = THREE.MathUtils.lerp(rArm.rotation.x, 0, delta * 20);
        rArm.rotation.z = THREE.MathUtils.lerp(rArm.rotation.z, 0, delta * 20);
    }

    // Left Hand (Shield) Animation
    if (this.isBlocking) {
        // Move shield into center-defensive position
        this.leftArm.position.set(
            THREE.MathUtils.lerp(this.leftArm.position.x, -0.2, delta * 15),
            THREE.MathUtils.lerp(this.leftArm.position.y, 1.4, delta * 15),
            THREE.MathUtils.lerp(this.leftArm.position.z, -0.4, delta * 15)
        );
        this.leftArm.rotation.y = THREE.MathUtils.lerp(this.leftArm.rotation.y, 1.2, delta * 15);
        this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, -0.5, delta * 15);
        this.stamina -= delta * 8; // Drain stamina while active blocking
    } else {
        // Return shield to side idle position
        this.leftArm.position.set(
            THREE.MathUtils.lerp(this.leftArm.position.x, -0.65, delta * 15),
            THREE.MathUtils.lerp(this.leftArm.position.y, 1.7, delta * 15),
            THREE.MathUtils.lerp(this.leftArm.position.z, 0, delta * 15)
        );
        this.leftArm.rotation.y = THREE.MathUtils.lerp(this.leftArm.rotation.y, 0, delta * 15);
        this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, 0, delta * 15);
    }
  }

  private faceCombatTarget(delta: number, strength: number) {
    if (!this.cameraFocusTarget) return;
    const toTarget = this.cameraFocusTarget.clone().sub(this.mesh.position);
    toTarget.y = 0;
    if (toTarget.lengthSq() < 0.01 || toTarget.lengthSq() > 36 * 36) return;
    const targetYaw = Math.atan2(toTarget.x, toTarget.z);
    let yawDiff = targetYaw - this.mesh.rotation.y;
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    this.mesh.rotation.y += yawDiff * Math.min(1, delta * 14 * strength);
  }

  private applyAttackLunge(delta: number) {
    if (this.attackLungeTimer <= 0 || !this.cameraFocusTarget) return;
    this.attackLungeTimer = Math.max(0, this.attackLungeTimer - delta);
    const toTarget = this.cameraFocusTarget.clone().sub(this.mesh.position);
    toTarget.y = 0;
    const dist = toTarget.length();
    if (dist < 1.8 || dist > 7.0) return;
    toTarget.normalize();
    this.mesh.position.addScaledVector(toTarget, delta * 8.5);
    this.mesh.position.x = Math.max(-19.5, Math.min(19.5, this.mesh.position.x));
    this.mesh.position.z = Math.max(this.minZ, Math.min(this.maxZ, this.mesh.position.z));
  }

  private updateStats(delta: number) {
    // Tick i-frame cooldown
    this.damageCooldown = Math.max(0, this.damageCooldown - delta);
    // i-frame flicker: toggle mesh visibility every 0.05s when invulnerable
    if (this.damageCooldown > 0) {
      this.mesh.visible = Math.floor(this.damageCooldown / 0.05) % 2 === 0;
    } else {
      this.mesh.visible = true;
    }

    if (this.swingPhase === 'IDLE' && !this.isBlocking) {
        this.stamina = Math.min(100, this.stamina + 65 * this.staminaRegenMultiplier * delta);
    }
    // Exponential decay — industry standard (Smash Bros / Hades style)
    this.cameraShake *= Math.pow(0.05, delta);
    if (this.cameraShake < 0.01) this.cameraShake = 0;
    if (this.comboTimer > 0) {
        this.comboTimer -= delta;
        if (this.comboTimer <= 0) this.comboCount = 0;
    }
    if (this.comboTimer <= 0) {
      this.rage = Math.max(0, this.rage - 6 * delta);
    }
  }

  private handleValorStrikeInput(delta: number) {
    this.valorStrikeCooldown = Math.max(0, this.valorStrikeCooldown - delta);
    const wantsStrike = this.input.keys['v'];

    if (!wantsStrike) {
      this.valorStrikeArmed = false;
      return;
    }

    if (this.valorStrikeArmed || this.valorStrikeCooldown > 0) return;
    if (this.rage < 100 || this.isBlocking) return;

    this.valorStrikeQueued = true;
    this.valorStrikeArmed = true;
    this.valorStrikeCooldown = 1.0;
    this.rage = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.cameraShake = 1.0;
  }

  private updateCamera(delta: number) {
    // High angled third-person view: readable like an action dungeon camera, while still showing Baji's model.
    const baseZ = 8.8;
    const baseY = 7.2;

    // Combo pull-back: wider view at high combos
    const comboZ = this.comboCount >= 5 ? 2.0 : 0;

    // Lerp camera offset
    const targetZ = baseZ + comboZ;
    this.cameraOffset.z = THREE.MathUtils.lerp(this.cameraOffset.z, targetZ, delta * 5);
    this.cameraOffset.y = THREE.MathUtils.lerp(this.cameraOffset.y, baseY, delta * 5);

    // Camera follows cameraYaw (independent of character facing)
    const yaw = this.cameraYaw;
    const sinY = Math.sin(yaw);
    const cosY = Math.cos(yaw);
    const offX = this.cameraOffset.x * cosY + this.cameraOffset.z * sinY;
    const offZ = -this.cameraOffset.x * sinY + this.cameraOffset.z * cosY;

    const targetPos = new THREE.Vector3(
      this.mesh.position.x + offX,
      this.mesh.position.y + this.cameraOffset.y,
      this.mesh.position.z + offZ
    );

    const velocityAhead = this.velocity.clone();
    if (velocityAhead.lengthSq() > 1) {
      velocityAhead.normalize().multiplyScalar(1.4);
    }
    const focusAhead = new THREE.Vector3();
    if (this.cameraFocusTarget) {
      focusAhead.copy(this.cameraFocusTarget).sub(this.mesh.position);
      focusAhead.y = 0;
      if (focusAhead.lengthSq() > 0.01) {
        focusAhead.normalize().multiplyScalar(1.8);
      }
    }
    this.cameraLookAhead.lerp(velocityAhead.add(focusAhead), 1 - Math.pow(0.02, delta));
    targetPos.add(this.cameraLookAhead);

    if (this.cameraShake > 0) {
      targetPos.x += (Math.random() - 0.5) * this.cameraShake;
      targetPos.y += (Math.random() - 0.5) * this.cameraShake;
    }
    // Frame-rate independent smooth follow
    const smoothFactor = 1 - Math.pow(0.001, delta);
    this.camera.position.lerp(targetPos, smoothFactor);

    // Set camera rotation directly — avoid lookAt() which can flip at certain angles
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = yaw; // Same direction as player
    this.camera.rotation.x = this.cameraPitch; // mouse Y shifts from top tactical angle toward lower shoulder view
    this.camera.rotation.z = 0; // Never roll
  }

  private updateDust(delta: number) {
    this.dustCooldown = Math.max(0, this.dustCooldown - delta);
    const speed = this.velocity.length();
    if (speed > 8 && this.dustCooldown <= 0) {
      this.dustCooldown = 0.15;
      this.audio.playFootstep();
      const dustMat = new THREE.MeshBasicMaterial({ color: 0xc0a880, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
      for (let i = 0; i < 4; i++) {
        const dust = new THREE.Mesh(new THREE.PlaneGeometry(0.3 + Math.random() * 0.3, 0.15 + Math.random() * 0.15), dustMat.clone());
        dust.position.copy(this.mesh.position);
        dust.position.x += (Math.random() - 0.5) * 0.6;
        dust.position.y = 0.1 + Math.random() * 0.2;
        dust.position.z += (Math.random() - 0.5) * 0.6;
        dust.rotation.x = -Math.PI / 2;
        this.scene.add(dust);
        this.dustParticles.push({
          mesh: dust,
          life: 0.3,
          vel: new THREE.Vector3((Math.random() - 0.5) * 2, 0.5 + Math.random(), (Math.random() - 0.5) * 2),
        });
      }
    }
    this.dustParticles = this.dustParticles.filter(p => {
      p.life -= delta;
      p.mesh.position.addScaledVector(p.vel, delta);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.life / 0.3) * 0.4;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        return false;
      }
      return true;
    });
  }

  private updateSpeedLines() {
    // Create speed lines on first call
    if (this.speedLines.length === 0) {
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      for (let i = 0; i < 10; i++) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.8), lineMat.clone());
        line.visible = false;
        this.scene.add(line);
        this.speedLines.push(line);
      }
    }
    const isDodge = this.dodgeTimer > 0;
    this.speedLines.forEach((line, i) => {
      if (isDodge) {
        line.visible = true;
        const angle = (i / 10) * Math.PI * 2;
        const radius = 1.5;
        line.position.copy(this.camera.position);
        line.position.x += Math.cos(angle) * radius;
        line.position.y += Math.sin(angle) * radius;
        line.position.z -= 3;
        line.lookAt(this.camera.position);
        (line.material as THREE.MeshBasicMaterial).opacity = 0.3;
      } else {
        const mat = line.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, mat.opacity - 0.05);
        if (mat.opacity <= 0) line.visible = false;
      }
    });
  }

  private updateCapeVerlet(delta: number) {
    const t = this.elapsedTime;
    // Wind force
    const windX = Math.sin(t * 0.7) * 0.4;
    const windZ = Math.cos(t * 0.5) * 0.3;

    for (let i = 0; i < this.capePositions.length; i++) {
      const pos = this.capePositions[i];
      const prev = this.capePrevPositions[i];

      // Velocity from Verlet integration
      const vx = pos.x - prev.x;
      const vy = pos.y - prev.y;
      const vz = pos.z - prev.z;

      prev.copy(pos);

      // Apply velocity + wind + player movement opposition + gravity
      pos.x += vx * 0.95 + windX * delta + (-this.velocity.x * 0.015);
      pos.y += vy * 0.95 - 2 * delta * delta; // slight gravity
      pos.z += vz * 0.95 + windZ * delta + (-this.velocity.z * 0.015);
    }

    // Constraint: anchor first segment to player back, constrain distances
    const anchorWorld = new THREE.Vector3(0.2, 1.55, -0.35);
    this.capePositions[0].copy(anchorWorld);

    for (let i = 1; i < this.capePositions.length; i++) {
      const a = this.capePositions[i - 1];
      const b = this.capePositions[i];
      const diff = b.clone().sub(a);
      const dist = diff.length();
      if (dist > this.capeRestLength) {
        diff.multiplyScalar((dist - this.capeRestLength) / dist * 0.5);
        b.sub(diff);
      }
    }

    // Convert positions to mesh rotations
    for (let i = 0; i < this.capeSegments.length; i++) {
      const target = this.capePositions[i];
      const next = i < this.capePositions.length - 1 ? this.capePositions[i + 1] : null;
      if (next) {
        const dir = next.clone().sub(target);
        this.capeSegments[i].rotation.x = Math.atan2(-dir.y, -dir.z) * 0.5;
        this.capeSegments[i].rotation.z = dir.x * 0.3;
      }
    }
  }

  private animateLocomotion(delta: number) {
    const speed = this.velocity.length();
    const isMoving = speed > 1;

    if (isMoving) {
      this.walkCycle += speed * delta * 4.0;
    }

    const t = this.elapsedTime;
    const wc = this.walkCycle;
    const lerpSpeed = delta * 8;

    if (isMoving) {
      // --- Walking/Running ---
      // Thighs: opposing pendulum swing
      this.leftThigh.rotation.x = Math.sin(wc) * 0.4;
      this.rightThigh.rotation.x = Math.sin(wc + Math.PI) * 0.4;

      // Shins: offset phase, backward swing only
      this.leftShin.rotation.x = Math.max(0, Math.sin(wc - 0.5)) * 0.3;
      this.rightShin.rotation.x = Math.max(0, Math.sin(wc + Math.PI - 0.5)) * 0.3;

      // Sandals: foot lift
      this.leftSandal.position.y = -0.82 + Math.max(0, Math.sin(wc)) * 0.08;
      this.rightSandal.position.y = -0.82 + Math.max(0, Math.sin(wc + Math.PI)) * 0.08;

      // Left arm counter-swing (right arm handled by combat)
      if (!this.isBlocking) {
        this.leftArm.rotation.x = THREE.MathUtils.lerp(
          this.leftArm.rotation.x,
          Math.sin(wc + Math.PI) * 0.25,
          lerpSpeed
        );
      }
      // Right arm gentle swing only when idle (not attacking)
      if (this.swingPhase === 'IDLE') {
        this.rightArm.rotation.x = THREE.MathUtils.lerp(
          this.rightArm.rotation.x,
          Math.sin(wc) * 0.15,
          lerpSpeed
        );
      }

      // Torso bob + sway
      this.torso.position.y = 1.1 + Math.sin(wc * 2) * 0.03;
      this.torso.rotation.z = Math.sin(wc) * 0.02;

      // Head counter-sway
      this.head.rotation.z = -Math.sin(wc) * 0.015;

      // Pagdi tail bounces with movement
      this.pagdiTail.rotation.x = 0.3 + Math.sin(wc * 2) * 0.06;
    } else {
      // --- Idle ---
      // Lerp legs back to rest
      this.leftThigh.rotation.x = THREE.MathUtils.lerp(this.leftThigh.rotation.x, 0, lerpSpeed);
      this.rightThigh.rotation.x = THREE.MathUtils.lerp(this.rightThigh.rotation.x, 0, lerpSpeed);
      this.leftShin.rotation.x = THREE.MathUtils.lerp(this.leftShin.rotation.x, 0, lerpSpeed);
      this.rightShin.rotation.x = THREE.MathUtils.lerp(this.rightShin.rotation.x, 0, lerpSpeed);
      this.leftSandal.position.y = THREE.MathUtils.lerp(this.leftSandal.position.y, -0.82, lerpSpeed);
      this.rightSandal.position.y = THREE.MathUtils.lerp(this.rightSandal.position.y, -0.82, lerpSpeed);

      // Idle breathing — torso bob
      this.torso.position.y = 1.1 + Math.sin(t * 1.5) * 0.02;
      this.torso.rotation.z = THREE.MathUtils.lerp(this.torso.rotation.z, 0, lerpSpeed);
      this.head.rotation.z = THREE.MathUtils.lerp(this.head.rotation.z, 0, lerpSpeed);

      // Idle sword sway
      if (this.swingPhase === 'IDLE') {
        this.swordPivot.rotation.z = Math.sin(t * 1.2) * 0.04;
      }

      // Idle left arm pendulum
      if (!this.isBlocking) {
        this.leftArm.rotation.x = THREE.MathUtils.lerp(
          this.leftArm.rotation.x,
          Math.sin(t * 0.8) * 0.03,
          lerpSpeed
        );
      }

      // Pagdi tail gentle sway
      this.pagdiTail.rotation.x = 0.3 + Math.sin(t * 2.5) * 0.05;
    }
  }

  public takeDamage(amount: number) {
    // Post-hit invulnerability (i-frames) — prevents stunlock
    if (this.damageCooldown > 0) return;
    if (this.parryTimer > 0) {
      this.parryTimer = 0;
      this.audio.playParrySuccess();
      this.cameraShake = 1.0;
      this.stamina = Math.min(100, this.stamina + 20);
      this.hitStopTimer = 0.1; // Freeze frame on parry
      this.rage = Math.min(100, this.rage + 12);
      // Spawn parry flash ring
      this.spawnParryFlash();
      return;
    }
    if (this.dodgeTimer > 0) {
      return;
    }
    // Blocks 90% of incoming damage
    const finalAmount = (this.isBlocking ? amount * 0.1 : amount) * this.damageTakenMultiplier;
    this.health -= finalAmount;
    this.damageTaken += finalAmount;

    if (this.isBlocking) {
        this.audio.playSwordClash();
        this.stamina -= 10; // Extra stamina hit on block
    } else {
        this.audio.playHit();
    }

    this.damagePulse = 1.0;
    this.cameraShake = this.isBlocking ? 0.2 : 0.8;
    this.comboCount = 0;
    this.rage = Math.max(0, this.rage - 20);

    // Hit feedback: directional tilt + scale punch
    this.hitTilt = (Math.random() > 0.5 ? 1 : -1) * (this.isBlocking ? 0.03 : 0.08);
    this.hitScale = this.isBlocking ? 0.98 : 0.95;
    this.mesh.scale.setScalar(this.hitScale);

    // Haptic feedback on mobile — richer patterns
    if (navigator.vibrate) navigator.vibrate(this.isBlocking ? [10, 5, 10] : [30, 10, 50]);

    // Post-hit invulnerability (0.4s i-frames)
    this.damageCooldown = this.isBlocking ? 0.2 : 0.4;

    // Valor Save: survive death once per game if rage >= 50
    if (this.health <= 0 && this.rage >= 50 && !this.usedValorSave) {
      this.health = 20;
      this.rage = 0;
      this.usedValorSave = true;
      this.damageCooldown = 1.0; // 1 full second invulnerability
      this.slowmoTimer = 0.5;
      this.slowmoFactor = 0.2;
      this.cameraShake = 1.5;
      this.audio.playWarCry();
    }
  }

  private spawnParryFlash() {
    const ringGeo = new THREE.RingGeometry(0.3, 1.5, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.9,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(this.mesh.position);
    ring.position.y = 1.5;
    ring.lookAt(this.camera.position);
    spawnTransientVfx(this.scene, [ring], 0.2, (t) => {
      ring.scale.setScalar(1 + (1 - t) * 3);
      (ring.material as THREE.MeshBasicMaterial).opacity = t * 0.9;
    });
  }

  private spawnDodgeBurst() {
    const ringGeo = new THREE.RingGeometry(0.5, 1.8, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: 0x66ccff,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    }));
    ring.position.copy(this.mesh.position);
    ring.position.y = 0.08;
    spawnTransientVfx(this.scene, [ring], 0.28, (t) => {
      ring.scale.setScalar(1 + (1 - t) * 1.8);
      (ring.material as THREE.MeshBasicMaterial).opacity = t * 0.55;
    });
  }

  public restore(h: number, s: number) {
    this.health = Math.min(100, this.health + h);
    this.stamina = Math.min(100, this.stamina + s);
    this.damagePulse = 1.0;
  }

  public gainValor(amount: number) {
    this.rage = Math.min(100, this.rage + amount);
    this.damagePulse = 0.65;
  }

  public refreshDodge() {
    this.dodgeCooldown = 0;
    this.stamina = Math.min(100, this.stamina + 35);
    this.spawnDodgeBurst();
  }

  public tickSlowmo(realDelta: number) {
    this.slowmoTimer = Math.max(0, this.slowmoTimer - realDelta);
  }

  public setBlockingDisabled(v: boolean) { this.blockingDisabled = v; }
  public getPosition() { return this.mesh.position; }
  public getCameraPosition() { return this.camera.position; }
  public getHealth() { return this.health; }
  public getStamina() { return this.stamina; }
  public isPlayerAttacking() { return this.swingPhase === 'STRIKE'; }
  public isPlayerBlocking() { return this.isBlocking; }
  public deflectProjectile(from: THREE.Vector3): boolean {
    if (!this.isBlocking || this.stamina < 4) return false;
    const toProjectile = from.clone().sub(this.mesh.position);
    toProjectile.y = 0;
    if (toProjectile.lengthSq() < 0.01) return false;
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
    if (forward.dot(toProjectile.normalize()) < 0.15) return false;
    this.stamina = Math.max(0, this.stamina - 6);
    this.rage = Math.min(100, this.rage + 6);
    this.cameraShake = 0.35;
    this.spawnParryFlash();
    this.audio.playSwordClash();
    return true;
  }
  public getAttackPower() { return 120 * (1 + (this.weaponLevel - 1) * 0.15) * this.attackMultiplier * (this.heavySwing ? 1.8 : 1); }
  public isHeavyStrike() { return this.heavySwing && this.swingPhase === 'STRIKE'; }
  public onEnemyKilled() {
    if (this.killHeal > 0) this.health = Math.min(100, this.health + this.killHeal);
  }
  public triggerVictorySlowmo() {
    this.slowmoTimer = 1.8;
    this.slowmoFactor = 0.25;
  }
  public getComboCount() { return this.comboCount; }
  public getRage() { return this.rage; }
  public getMaxCombo() { return this.maxCombo; }
  public getDamageTaken() { return this.damageTaken; }
  public getValorStrikesUsed() { return this.valorStrikesUsed; }
  public getWeaponLevel() { return this.weaponLevel; }
  public getTimeScale() { return this.slowmoTimer > 0 ? this.slowmoFactor : 1; }
  public isDodging() { return this.dodgeTimer > 0; }
  public getDamagePulse() { return this.damagePulse; }
  public getBlockCount() { return this.blockCount; }
  public getDodgeCount() { return this.dodgeCount; }
  public getDodgeCooldown() { return this.dodgeCooldown; }
  public getYaw() { return this.cameraYaw; }
  public setCameraFocus(target: THREE.Vector3 | null) {
    this.cameraFocusTarget = target ? target.clone() : null;
  }
  public applyPerk(id: string) {
    if (id === 'blade') {
      this.attackMultiplier = Math.min(1.6, this.attackMultiplier + 0.2);
    } else if (id === 'spirit') {
      this.staminaRegenMultiplier = Math.min(2.0, this.staminaRegenMultiplier + 0.4);
      this.health = Math.min(100, this.health + 15);
      this.stamina = Math.min(100, this.stamina + 35);
    } else if (id === 'valor') {
      this.valorGainMultiplier = Math.min(2.0, this.valorGainMultiplier + 0.3);
    } else if (id === 'stride') {
      this.moveSpeedMultiplier = Math.min(1.4, this.moveSpeedMultiplier + 0.2);
    } else if (id === 'bloodlust') {
      this.killHeal = Math.min(6, this.killHeal + 3);
    } else if (id === 'aegis') {
      this.damageTakenMultiplier = Math.max(0.7, this.damageTakenMultiplier - 0.12);
    } else if (id === 'swift') {
      this.dodgeCooldownScale = Math.max(0.45, this.dodgeCooldownScale - 0.3);
    } else if (id === 'focus') {
      this.comboWindow = Math.min(4.0, this.comboWindow + 1.0);
    }
  }
  private isDead = false;
  private deathAnimTimer = 0;

  public triggerDeath() {
    this.isDead = true;
    this.deathAnimTimer = 0;
    this.slowmoTimer = 2.5;
    this.slowmoFactor = 0.2;
  }

  public updateDeath(delta: number) {
    if (!this.isDead) return;
    this.deathAnimTimer += delta;
    // Forward fall: rotate mesh forward
    const targetRotX = -Math.PI / 3;
    this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, targetRotX, delta * 1.5);
    // Drop sword pivot
    this.swordPivot.rotation.x = THREE.MathUtils.lerp(this.swordPivot.rotation.x, -Math.PI / 2, delta * 2);
    // Slow orbit
    this.mesh.rotation.y += delta * 0.3;
    // Camera: slowly rise and pull back
    this.cameraOffset.y = THREE.MathUtils.lerp(this.cameraOffset.y, 7.0, delta * 1.2);
    this.cameraOffset.z = THREE.MathUtils.lerp(this.cameraOffset.z, 14.0, delta * 1.2);

    // Manual camera update (skip dynamic offsets during death)
    const idealOffset = this.cameraOffset.clone().applyQuaternion(this.mesh.quaternion);
    const targetPos = this.mesh.position.clone().add(idealOffset);
    this.camera.position.lerp(targetPos, delta * 5);
    const lookPoint = this.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    this.camera.lookAt(lookPoint);
  }

  public getIsDead() { return this.isDead; }

  public upgradeWeapon() {
    this.weaponLevel = Math.min(6, this.weaponLevel + 1);
  }
  public consumeValorStrike() {
    if (!this.valorStrikeQueued) return false;
    this.valorStrikeQueued = false;
    this.valorStrikesUsed += 1;
    return true;
  }
}
