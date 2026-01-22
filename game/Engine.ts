
import * as THREE from 'three';
import { Player } from './Player';
import { EnemyManager } from './EnemyManager';
import { World } from './World';
import { AudioManager } from './AudioManager';
import { InputManager } from './InputManager';

export interface GameCallbacks {
  onWin: () => void;
  onLoss: () => void;
  onStatsUpdate: (
    h: number,
    s: number,
    t: number,
    score: number,
    combo: number,
    rage: number,
    maxCombo: number,
    damageTaken: number,
    valorStrikes: number,
    wave: number,
    weaponLevel: number,
    objectiveProgress: number,
    objectiveTarget: number,
    objectiveTimer: number,
    objectivesCompleted: number
  ) => void;
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
  private gameTime: number = 300; 
  private wave = 1;
  private score: number = 0;
  private potionTimer = 15;
  private activePotions: THREE.Group[] = [];
  private lastReinforceZ = 0;
  private reinforceCooldown = 0;
  private callbacks: GameCallbacks;
  private objectiveActive = false;
  private objectiveProgress = 0;
  private objectiveTarget = 20;
  private objectiveTimer = 0;
  private objectiveCooldown = 12;
  private objectiveZoneZ = 0;
  private objectivesCompleted = 0;
  private lastBossWave = 0;
  private nextWeaponUpgradeScore = 8;

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.callbacks = callbacks;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xaaccff);

    this.camera = new THREE.PerspectiveCamera(88, window.innerWidth / window.innerHeight, 0.1, 2400);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    this.clock = new THREE.Clock();
    this.audioManager = new AudioManager(this.camera);
    this.inputManager = new InputManager();
    this.world = new World(this.scene);
    
    this.player = new Player(this.scene, this.camera, this.inputManager, this.audioManager);
    this.enemyManager = new EnemyManager(this.scene, this.player, this.audioManager, (points) => {
        this.score += points;
        this.enemyManager.setDifficulty(Math.floor(this.score / 4));
    });

    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.render();
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

  public setActive(active: boolean) {
    this.isActive = active;
    if (active) {
      this.inputManager.lockPointer(this.renderer.domElement);
      this.stopIntroAudio();
    }
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private update() {
    if (!this.isActive) return;
    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.gameTime -= delta;
    this.wave = Math.max(1, Math.floor((300 - this.gameTime) / 45) + 1);

    this.player.update(delta);
    this.enemyManager.update(delta);
    if (this.player.consumeValorStrike()) {
      this.enemyManager.triggerValorStrike(this.player.getPosition());
    }

    if (this.score >= this.nextWeaponUpgradeScore) {
      this.player.upgradeWeapon();
      this.nextWeaponUpgradeScore += 8;
    }

    const timeDifficulty = Math.floor((300 - this.gameTime) / 60);
    this.enemyManager.setDifficulty(Math.max(timeDifficulty, Math.floor(this.score / 4)));

    if (this.wave % 2 === 0 && this.wave !== this.lastBossWave) {
      if (!this.enemyManager.isBossActive()) {
        this.enemyManager.spawnMiniBoss();
        this.lastBossWave = this.wave;
      }
    }

    this.objectiveCooldown = Math.max(0, this.objectiveCooldown - delta);
    if (!this.objectiveActive && this.objectiveCooldown <= 0) {
      this.objectiveActive = true;
      this.objectiveProgress = 0;
      this.objectiveTimer = 28;
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
        this.score += 5;
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

    this.callbacks.onStatsUpdate(
      this.player.getHealth(),
      this.player.getStamina(),
      this.gameTime,
      this.score,
      this.player.getComboCount(),
      this.player.getRage(),
      this.player.getMaxCombo(),
      this.player.getDamageTaken(),
      this.player.getValorStrikesUsed(),
      this.wave,
      this.player.getWeaponLevel(),
      this.objectiveActive ? this.objectiveProgress : 0,
      this.objectiveActive ? this.objectiveTarget : 0,
      this.objectiveActive ? this.objectiveTimer : 0,
      this.objectivesCompleted
    );

    if (this.player.getHealth() <= 0) this.callbacks.onLoss();
    if (this.gameTime <= 0) {
        this.audioManager.playCannon();
        this.callbacks.onWin();
    }
  }

  private render() {
    this.update();
    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.render.bind(this));
  }

  public dispose() {
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.renderer.dispose();
  }
}
