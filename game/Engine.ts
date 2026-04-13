
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { Player } from './Player';
import { EnemyManager } from './EnemyManager';
import { World } from './World';
import { AudioManager } from './AudioManager';
import { InputManager } from './InputManager';
import type { GameConfig, GameStats } from './GameConfig';
import { GAME_MODES } from './GameConfig';
import { loadCosmeticState, getEquippedSwordSkin, getEquippedAngarkhaSkin, getEquippedShieldSkin } from './Cosmetics';
import { ParticlePool } from './ParticlePool';

export type { GameStats } from './GameConfig';
export { GAME_MODES } from './GameConfig';

// Custom vignette + damage flash + color grading shader
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uVignetteStrength: { value: 0.12 },
    uDamageFlash: { value: 0.0 },
    uScreenFlash: { value: 0.0 },
    uColorGrading: { value: new THREE.Vector3(1.0, 1.02, 1.04) }, // subtle cool Sahyadri tint
    uChromaOffset: { value: 0.0 },
    uGameProgress: { value: 0.0 }, // gameTime/duration for sunset progression
    uFilmGrain: { value: 0.03 },
    uDesaturate: { value: 0.0 }, // critical health desaturation
    uFakeBloomStrength: { value: 0.3 },
    uSunScreenPos: { value: [0.2, 0.5] },
    uGodRayIntensity: { value: 0.08 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uVignetteStrength;
    uniform float uDamageFlash;
    uniform float uScreenFlash;
    uniform vec3 uColorGrading;
    uniform float uChromaOffset;
    uniform float uGameProgress;
    uniform float uFilmGrain;
    uniform float uDesaturate;
    uniform float uFakeBloomStrength;
    uniform vec2 uSunScreenPos;
    uniform float uGodRayIntensity;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      float cr = uChromaOffset;
      vec4 color;
      if (cr > 0.0) {
        color.r = texture2D(tDiffuse, vUv + vec2(cr, 0.0)).r;
        color.g = texture2D(tDiffuse, vUv).g;
        color.b = texture2D(tDiffuse, vUv - vec2(cr, 0.0)).b;
        color.a = 1.0;
      } else {
        color = texture2D(tDiffuse, vUv);
      }
      // Progressive color grading (deeper amber as sunset progresses)
      vec3 grading = uColorGrading + vec3(0.05, -0.02, -0.08) * uGameProgress;
      color.rgb *= grading;

      // Contrast boost
      color.rgb = (color.rgb - 0.5) * 1.08 + 0.5;

      // Shadow/highlight tint: shadows -> cool blue, highlights -> warm gold
      float lumGrade = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      color.rgb += mix(vec3(-0.02, -0.01, 0.03), vec3(0.03, 0.02, -0.01), lumGrade) * 0.5;

      // Fake bloom: brighten pixels above threshold (works on mobile without extra pass)
      float lumBloom = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      float bloomMask = smoothstep(0.7, 1.0, lumBloom);
      color.rgb += color.rgb * bloomMask * uFakeBloomStrength;

      // Screen-space god rays from sun position
      float rayDist = distance(vUv, uSunScreenPos);
      float rays = smoothstep(0.8, 0.0, rayDist) * uGodRayIntensity;
      color.rgb += vec3(1.0, 0.9, 0.7) * rays;

      // Film grain
      float grain = (rand(vUv * uGameProgress * 100.0 + 0.5) - 0.5) * uFilmGrain;
      color.rgb += grain;

      // Desaturation: red-sepia on critical health, brief grey on hit
      if (uDesaturate > 0.0) {
        float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        vec3 sepia = vec3(lum * 1.1, lum * 0.85, lum * 0.65);
        color.rgb = mix(color.rgb, sepia, uDesaturate * 0.4);
      }

      // Vignette
      float dist = distance(vUv, vec2(0.5));
      float vig = smoothstep(0.65, 1.2, dist);
      color.rgb *= 1.0 - vig * uVignetteStrength;
      // Damage flash (red)
      color.rgb = mix(color.rgb, vec3(0.8, 0.05, 0.0), uDamageFlash * 0.45);
      // Screen flash (white, for valor strike)
      color.rgb = mix(color.rgb, vec3(1.0, 0.95, 0.8), uScreenFlash);
      gl_FragColor = color;
    }
  `,
};

export interface GameCallbacks {
  onWin: () => void;
  onLoss: () => void;
  onStatsUpdate: (stats: GameStats) => void;
}

export class PavankhindEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private world: World;
  private player: Player;
  private enemyManager: EnemyManager;
  private audioManager: AudioManager;
  private inputManager: InputManager;
  private clock: THREE.Clock;
  private frameId: number | null = null;
  private isActive: boolean = false;
  private gameTime: number = 0; // set in constructor from config
  private wave = 1;
  private score: number = 0;
  private potionTimer = 15;
  private activePotions: THREE.Group[] = [];
  private lastReinforceZ = 0;
  private reinforceCooldown = 0;
  private callbacks: GameCallbacks;
  private objectiveActive = false;
  private objectiveProgress = 0;
  private objectiveTarget = 12;
  private objectiveTimer = 0;
  private objectiveCooldown = 12;
  private objectiveZoneZ = 0;
  private objectivesCompleted = 0;
  private lastBossWave = 0;
  private nextWeaponUpgradeScore = 5;
  private perkTimer = 60;
  private perkReady = false;
  private config: GameConfig;
  private lastComboTier = 0;
  private combatDholStarted = false;
  private boundResize!: () => void;

  // Post-processing
  private composer: EffectComposer | null = null;
  private vignettePass: ShaderPass | null = null;
  private isMobile: boolean;

  // Dynamic FOV
  private baseFOV = 80;
  private targetFOV = 75;
  private currentFOV = 75;

  // Screen flash
  private screenFlash = 0;
  private damageFlashValue = 0;

  // Death sequence
  private deathSequenceActive = false;
  private deathTimer = 0;
  private proximityCheckTimer = 0;

  // Tutorial + wave banner + timing
  private tutorialStep = 0;
  private gameElapsed = 0;
  private prevWave = 0;
  private waveBannerTimer = 0;
  private enemyPosTimer = 0;

  // Ground decals
  private groundDecals: { mesh: THREE.Mesh; life: number }[] = [];

  // Sun position for god rays
  private sunWorldPos = new THREE.Vector3(-400, 80, -1800);

  // Particle pool
  private particlePool: ParticlePool;

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks, config?: GameConfig) {
    this.callbacks = callbacks;
    this.config = config || GAME_MODES.skirmish;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xaaccff);

    this.isMobile = window.matchMedia('(pointer: coarse)').matches;

    this.camera = new THREE.PerspectiveCamera(this.baseFOV, window.innerWidth / window.innerHeight, 0.1, 2400);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.isMobile });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.5 : 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.renderer.toneMappingExposure = 1.8;

    this.clock = new THREE.Clock();
    this.audioManager = new AudioManager(this.camera);
    this.inputManager = new InputManager();
    if (this.isMobile) {
      this.inputManager.setVirtualMode(true);
    }
    this.world = new World(this.scene, this.isMobile);

    this.gameTime = this.config.duration;
    this.wave = this.config.startWave;

    this.particlePool = new ParticlePool(this.scene, this.isMobile);
    this.player = new Player(this.scene, this.camera, this.inputManager, this.audioManager, this.isMobile);

    // Apply equipped cosmetics
    const cosState = loadCosmeticState();
    const swordSkin = getEquippedSwordSkin(cosState);
    this.player.applySwordSkin(swordSkin.bladeColor, swordSkin.guardColor, swordSkin.emissive);
    const angarkhaSkin = getEquippedAngarkhaSkin(cosState);
    this.player.applyAngarkhaSkin(angarkhaSkin.torsoColor, angarkhaSkin.sashColor);

    // Apply shield if equipped
    const shieldSkin = getEquippedShieldSkin(cosState);
    if (shieldSkin) {
      this.player.applyShield(shieldSkin.faceColor, shieldSkin.rimColor, shieldSkin.emblemColor);
    }

    this.enemyManager = new EnemyManager(this.scene, this.player, this.audioManager, (points) => {
        this.score += points;
        this.enemyManager.setDifficulty(Math.floor(this.score / 3));
    }, this.camera);
    this.enemyManager.setDifficulty(Math.max(0, (this.config.startWave - 1) * 2));

    // Apply daily challenge modifiers
    if (this.config.archersOnly) {
      this.enemyManager.setArchersOnly(true);
    }
    if (this.config.doubleSpeed) {
      this.enemyManager.setDoubleSpeed(true);
    }
    if (this.config.noBlocking) {
      this.player.setBlockingDisabled(true);
    }
    if (this.config.bossRush) {
      this.enemyManager.setBossRush(true);
    }
    if (this.config.fogOfWar) {
      this.scene.fog = new THREE.FogExp2(0xd8b898, 0.012);
    }
    // Note: World constructor already sets scene.fog for normal gameplay

    // Setup post-processing
    this.setupPostProcessing();

    this.boundResize = this.onWindowResize.bind(this);
    window.addEventListener('resize', this.boundResize);
    this.render();
  }

  private setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Bloom pass (skip on mobile for performance)
    if (!this.isMobile) {
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.6,   // strength
        0.4,   // radius
        0.6    // threshold
      );
      this.composer.addPass(bloomPass);
    }

    // Vignette + damage flash + color grading
    this.vignettePass = new ShaderPass(VignetteShader);
    this.composer.addPass(this.vignettePass);
  }

  public startIntroAudio() {
    this.audioManager.playIntroChant();
  }

  public stopIntroAudio() {
    this.audioManager.stopIntroMusic();
    this.audioManager.stopIntroChant();
  }

  public setMuted(muted: boolean) {
    this.audioManager.setMuted(muted);
  }

  public setVirtualKey(key: string, pressed: boolean) {
    this.inputManager.setKey(key, pressed);
  }

  public setVirtualMouseButton(button: number, pressed: boolean) {
    this.inputManager.setMouseButton(button, pressed);
  }

  public addVirtualLook(dx: number, dy: number) {
    this.inputManager.addMouseDelta(dx, dy);
  }

  public setActive(active: boolean) {
    this.isActive = active;
    if (active) {
      if (!this.inputManager.isInputActive()) {
        this.inputManager.lockPointer(this.renderer.domElement);
      }
      this.stopIntroAudio();
    } else {
      // Release pointer lock when game becomes inactive (menu screens, pause)
      // This prevents mouse movement from accumulating and tilting the camera
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      // Clear any accumulated mouse delta
      this.inputManager.clearMouseDelta();
    }
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.composer) {
      this.composer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  // Called by EnemyManager when valor strike fires
  public triggerScreenFlash() {
    this.screenFlash = 1.0;
  }

  // Called by EnemyManager to trigger valor FOV effect
  public triggerValorFOV() {
    // Zoom in briefly, then burst outward
    this.targetFOV = this.baseFOV - 10;
    setTimeout(() => { this.targetFOV = this.baseFOV + 20; }, 120);
    setTimeout(() => { this.targetFOV = this.baseFOV; }, 400);
  }

  private update() {
    if (!this.isActive) return;
    const rawDelta = Math.min(this.clock.getDelta(), 0.05);

    // Death sequence — skip all game logic, just animate death
    if (this.deathSequenceActive) {
      this.deathTimer -= rawDelta;
      this.player.tickSlowmo(rawDelta);
      const timeScale = this.player.getTimeScale();
      const delta = rawDelta * timeScale;
      this.player.updateDeath(delta);
      // Ramp desaturation and vignette during death
      if (this.vignettePass) {
        this.vignettePass.uniforms.uDesaturate.value = Math.min(0.8, this.vignettePass.uniforms.uDesaturate.value + rawDelta * 0.4);
        this.vignettePass.uniforms.uVignetteStrength.value = Math.min(0.5, this.vignettePass.uniforms.uVignetteStrength.value + rawDelta * 0.2);
      }
      if (this.deathTimer <= 0) {
        this.callbacks.onLoss();
      }
      return;
    }

    this.player.tickSlowmo(rawDelta);
    const timeScale = this.player.getTimeScale();
    const delta = rawDelta * timeScale;
    this.gameTime -= delta;
    this.wave = Math.max(this.config.startWave, Math.floor((this.config.duration - this.gameTime) / 45) + this.config.startWave);

    this.player.update(delta);
    this.enemyManager.update(delta);

    // Update ground decals
    this.groundDecals = this.groundDecals.filter(d => {
      d.life -= delta;
      const mat = d.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, d.life / 3) * 0.3;
      if (d.life <= 0) {
        this.scene.remove(d.mesh);
        return false;
      }
      return true;
    });

    // World update (torches, embers, dust motes)
    this.world.update(delta, this.player.getPosition());

    // Time-of-day progression (skip if fogOfWar override is active)
    if (!this.config.fogOfWar) {
      const progress = 1 - (this.gameTime / this.config.duration);
      this.world.updateTimeOfDay(Math.max(0, Math.min(1, progress)));
    }

    if (this.player.consumeValorStrike()) {
      this.enemyManager.triggerValorStrike(this.player.getPosition());
      this.audioManager.playWarCry();
      this.triggerScreenFlash();
      this.triggerValorFOV();
    }

    // Start combat dhol on first active frame
    if (!this.combatDholStarted) {
      this.audioManager.startCombatDhol();
      this.combatDholStarted = true;
      // Start ambient soundscape
      this.audioManager.startAmbientWind();
      this.audioManager.startAmbientBirds();
      this.audioManager.startDistantDrums();
    }

    // Dhol accent on combo tier change (3=fury, 6=onslaught, 9=mythic)
    const combo = this.player.getComboCount();
    const comboTier = combo >= 9 ? 3 : combo >= 6 ? 2 : combo >= 3 ? 1 : 0;
    if (comboTier > this.lastComboTier) {
      this.audioManager.playDholAccent();
    }
    this.lastComboTier = comboTier;

    // Dynamic music intensity
    this.audioManager.setCombatIntensity(comboTier);

    // Reactive drum volume based on enemy proximity (throttled to every 0.5s)
    this.proximityCheckTimer = (this.proximityCheckTimer || 0) - delta;
    if (this.proximityCheckTimer <= 0) {
      this.proximityCheckTimer = 0.5;
      const nearCount = this.enemyManager.getNearEnemyCount(this.player.getPosition(), 10);
      this.audioManager.setCombatProximity(nearCount + (this.player.isPlayerAttacking() ? 2 : 0));
    }

    if (this.score >= this.nextWeaponUpgradeScore) {
      this.player.upgradeWeapon();
      this.nextWeaponUpgradeScore += 5;
    }

    if (!this.perkReady) {
      this.perkTimer = Math.max(0, this.perkTimer - delta);
      if (this.perkTimer <= 0) {
        this.perkReady = true;
      }
    }

    const elapsed = this.config.duration - this.gameTime;
    const timeDifficulty = Math.floor(Math.pow(elapsed / this.config.duration, 1.5) * 10);
    this.enemyManager.setDifficulty(Math.max(timeDifficulty, Math.floor(this.score / 3)));

    if (this.wave % 3 === 0 && this.wave !== this.lastBossWave) {
      if (!this.enemyManager.isBossActive()) {
        this.enemyManager.spawnMiniBoss();
        this.lastBossWave = this.wave;
      }
    }

    this.objectiveCooldown = Math.max(0, this.objectiveCooldown - delta);
    if (!this.objectiveActive && this.objectiveCooldown <= 0) {
      this.objectiveActive = true;
      this.objectiveProgress = 0;
      this.objectiveTimer = 18;
      this.objectiveZoneZ = this.player.getPosition().z;
    }

    if (this.objectiveActive) {
      this.objectiveTimer -= delta;
      const playerZ = this.player.getPosition().z;
      if (Math.abs(playerZ - this.objectiveZoneZ) < 15) {
        this.objectiveProgress += delta;
      }
      if (this.objectiveProgress >= this.objectiveTarget) {
        this.objectivesCompleted += 1;
        this.score += 15;
        this.audioManager.playObjectiveComplete();
        this.objectiveActive = false;
        this.objectiveCooldown = 22;
      } else if (this.objectiveTimer <= 0) {
        this.objectiveActive = false;
        this.objectiveCooldown = 18;
      }
    }

    this.reinforceCooldown = Math.max(0, this.reinforceCooldown - delta);
    const playerZ = this.player.getPosition().z;
    if (Math.abs(playerZ - this.lastReinforceZ) > 120 && this.reinforceCooldown <= 0) {
      this.world.spawnReinforcementLine(playerZ - 30);
      this.lastReinforceZ = playerZ;
      this.reinforceCooldown = 8.0;
    }

    // Potion Logic
    this.potionTimer -= delta;
    if (this.potionTimer <= 0) {
        this.activePotions.push(this.world.spawnHerb(this.player.getPosition().z - 45));
        this.potionTimer = 25;
    }

    this.activePotions = this.activePotions.filter(p => {
        const dist = p.position.distanceTo(this.player.getPosition());
        if (dist < 3.0) {
            this.player.restore(40, 100);
            this.scene.remove(p);
            return false;
        }
        return true;
    });

    // Particle pool update
    this.particlePool.update(delta);

    // Dynamic FOV
    this.updateDynamicFOV(delta);

    // Update vignette/flash shader uniforms
    this.updatePostProcessUniforms(delta);

    // Track game elapsed time
    this.gameElapsed += delta;

    // Tutorial step progression
    if (this.tutorialStep === 0 && this.gameElapsed >= 3) this.tutorialStep = 1;
    if (this.tutorialStep === 1 && this.gameElapsed >= 6) this.tutorialStep = 2;
    if (this.tutorialStep === 2 && this.score > 0) this.tutorialStep = 3;
    if (this.tutorialStep === 3 && this.player.getBlockCount() > 0) this.tutorialStep = 4;
    if (this.tutorialStep === 4 && this.player.getDodgeCount() > 0) this.tutorialStep = 5;

    // Wave transition banner + wave-end healing
    if (this.wave > this.prevWave && this.prevWave > 0) {
      this.waveBannerTimer = 3.0;
      this.player.restore(15, 30); // Heal 15 HP + 30 stamina between waves
    }
    this.prevWave = this.wave;
    if (this.waveBannerTimer > 0) this.waveBannerTimer -= delta;

    // Pass elapsed time to enemy manager for difficulty ramping
    this.enemyManager.setGameElapsed(this.gameElapsed);

    // Throttle enemy position updates to every 250ms
    this.enemyPosTimer -= delta;
    const enemyPositions = this.enemyPosTimer <= 0
      ? (this.enemyPosTimer = 0.25, this.enemyManager.getEnemyPositions())
      : [];

    this.callbacks.onStatsUpdate({
      health: this.player.getHealth(),
      stamina: this.player.getStamina(),
      timeRemaining: this.gameTime,
      score: this.score,
      combo: this.player.getComboCount(),
      rage: this.player.getRage(),
      maxCombo: this.player.getMaxCombo(),
      damageTaken: this.player.getDamageTaken(),
      valorStrikes: this.player.getValorStrikesUsed(),
      wave: this.wave,
      weaponLevel: this.player.getWeaponLevel(),
      perkReady: this.perkReady,
      perkTimer: this.perkTimer,
      archerWarning: this.enemyManager.getArcherWarning(),
      objectiveProgress: this.objectiveActive ? this.objectiveProgress : 0,
      objectiveTarget: this.objectiveActive ? this.objectiveTarget : 0,
      objectiveTimer: this.objectiveActive ? this.objectiveTimer : 0,
      objectivesCompleted: this.objectivesCompleted,
      tutorialStep: this.tutorialStep,
      gameElapsed: this.gameElapsed,
      waveBanner: this.waveBannerTimer > 0 ? `WAVE ${this.wave}` : null,
      waveBannerTimer: this.waveBannerTimer,
      dodgeCooldown: this.player.getDodgeCooldown(),
      enemyPositions,
      playerYaw: this.player.getYaw(),
    });

    if (this.player.getHealth() <= 0 && !this.deathSequenceActive) {
      this.deathSequenceActive = true;
      this.deathTimer = 2.5;
      this.player.triggerDeath();
      this.audioManager.stopCombatDhol();
      this.audioManager.stopHeartbeat();
      this.audioManager.playDeathRumble();
    }
    if (this.gameTime <= 0) {
        this.audioManager.playCannon();
        this.audioManager.playShankh();
        this.callbacks.onWin();
    }
  }

  private updateDynamicFOV(delta: number) {
    // Dodge: FOV +15 for duration
    if (this.player.isDodging()) {
      this.targetFOV = this.baseFOV + 15;
    }
    // High combo (5+): subtle FOV increase
    else if (this.player.getComboCount() >= 5) {
      this.targetFOV = this.baseFOV + 3;
    }
    // Default back to base if no override active
    else if (this.targetFOV !== this.baseFOV - 10 && this.targetFOV !== this.baseFOV + 20) {
      this.targetFOV = this.baseFOV;
    }

    // Smooth lerp
    this.currentFOV = THREE.MathUtils.lerp(this.currentFOV, this.targetFOV, delta * 8);
    this.camera.fov = this.currentFOV;
    this.camera.updateProjectionMatrix();
  }

  private updatePostProcessUniforms(delta: number) {
    if (!this.vignettePass) return;

    // Damage flash from player
    const health = this.player.getHealth();
    const damagePulse = this.player.getDamagePulse();
    this.damageFlashValue = THREE.MathUtils.lerp(this.damageFlashValue, damagePulse > 0 ? damagePulse : 0, delta * 10);
    this.vignettePass.uniforms.uDamageFlash.value = this.damageFlashValue;

    // Chromatic aberration: damage pulse + valor strike spike
    const valorChroma = this.screenFlash > 0.5 ? 0.012 : 0;
    this.vignettePass.uniforms.uChromaOffset.value = Math.max(damagePulse * 0.008, valorChroma);

    // Dynamic vignette: intensifies when health < 40
    const lowHealthVig = health < 40 ? 0.12 + (1 - health / 40) * 0.25 : 0.12;
    this.vignettePass.uniforms.uVignetteStrength.value = lowHealthVig;

    // Screen flash (valor strike white flash)
    this.screenFlash = Math.max(0, this.screenFlash - delta * 6.5);
    this.vignettePass.uniforms.uScreenFlash.value = this.screenFlash;

    // Progressive color grading: shift toward amber as time runs out
    const progress = 1 - (this.gameTime / this.config.duration);
    this.vignettePass.uniforms.uGameProgress.value = Math.max(0, Math.min(1, progress));

    // Update sun screen position for god rays
    const sunScreen = this.sunWorldPos.clone().project(this.camera);
    this.vignettePass.uniforms.uSunScreenPos.value = [
      sunScreen.x * 0.5 + 0.5,
      sunScreen.y * 0.5 + 0.5,
    ];

    // Critical health desaturation + brief spike on hit
    const hitDesat = damagePulse > 0.5 ? 0.15 : 0;
    this.vignettePass.uniforms.uDesaturate.value = health < 20 ? 1.0 : hitDesat;

    // Heartbeat on low health
    if (health < 25 && health > 0) {
      this.audioManager.startHeartbeat();
    } else {
      this.audioManager.stopHeartbeat();
    }
  }

  private render() {
    try {
      this.update();
    } catch (err) {
      console.error('[PavankhindEngine] update error:', err);
    }

    // When game is not active (menu screens), keep camera stable
    if (!this.isActive) {
      this.camera.position.set(0, 3.5, 8);
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.set(-0.35, 0, 0);
    }

    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    this.frameId = requestAnimationFrame(this.render.bind(this));
  }

  public dispose() {
    if (this.frameId) cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.boundResize);
    this.inputManager.dispose();
    this.audioManager.stopCombatDhol();
    this.audioManager.stopIntroMusic();
    this.audioManager.stopIntroChant();
    this.audioManager.stopAmbientSounds();
    this.audioManager.stopHeartbeat();
    this.audioManager.stopTanpuraDrone();
    if (this.composer) {
      this.composer.dispose();
    }
    this.renderer.dispose();
  }

  public applyPerk(perkId: string) {
    this.player.applyPerk(perkId);
    this.perkReady = false;
    this.perkTimer = 60;
  }
}
