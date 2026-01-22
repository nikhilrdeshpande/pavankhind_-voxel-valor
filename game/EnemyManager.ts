
import * as THREE from 'three';
import { Player } from './Player';
import { AudioManager } from './AudioManager';

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
  private circleAngle: number;
  private circleDir: number;
  private type: EnemyType;
  
  private healthBar: THREE.Mesh;
  private weaponPivot: THREE.Group;
  private lookTarget = new THREE.Object3D();
  private shieldStamina = 100;
  private shieldBrokenTimer = 0;
  private rangedCooldown = 0;

  constructor(
    scene: THREE.Scene,
    player: Player,
    audio: AudioManager,
    startPos: THREE.Vector3,
    difficulty: number,
    onKilled: () => void,
    onHit: (pos: THREE.Vector3, isLethal: boolean) => void,
    type: EnemyType
  ) {
    this.scene = scene;
    this.player = player;
    this.audio = audio;
    this.onKilled = onKilled;
    this.onHit = onHit;
    this.type = type;
    this.circleAngle = Math.random() * Math.PI * 2;
    this.circleDir = Math.random() < 0.5 ? 1 : -1;
    
    if (this.type === 'RUSHER') {
      this.speed = 7.5 + difficulty * 1.1;
      this.maxHealth = 220 + difficulty * 35;
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
      this.maxHealth = 350 + difficulty * 50;
    }
    this.health = this.maxHealth;

    this.mesh = new THREE.Group();
    
    // Body
    const bodyColor =
      this.type === 'RUSHER'
        ? 0x2f1f14
        : this.type === 'ARCHER'
        ? 0x2b3a2c
        : this.type === 'BOSS'
        ? 0x3a1f14
        : this.type === 'BRUTE'
        ? 0x2d2420
        : this.type === 'SHIELDER'
        ? 0x111111
        : 0x1a1a1a;
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor });
    if (this.type === 'BOSS') {
      bodyMat.emissive.setHex(0x3a1208);
      bodyMat.emissiveIntensity = 0.4;
    }
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.3, 0.5), bodyMat);
    body.position.y = 1.05;
    if (this.type === 'RUSHER') {
      body.scale.set(0.9, 0.9, 0.9);
    } else if (this.type === 'BRUTE') {
      body.scale.set(1.2, 1.2, 1.2);
    } else if (this.type === 'BOSS') {
      body.scale.set(1.5, 1.5, 1.5);
    }
    this.mesh.add(body);

    const helmetColor = this.type === 'RUSHER' ? 0x7a3b16 : 0xaa8800;
    const helmet = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.2, 8), new THREE.MeshStandardMaterial({ color: helmetColor, metalness: 0.8 }));
    helmet.position.y = 2.2;
    this.mesh.add(helmet);

    // Weapon
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
    } else {
      const sword = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, this.type === 'BRUTE' || this.type === 'BOSS' ? 3.6 : 2.5, 4),
          new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9 })
      );
      sword.position.y = 0.8;
      this.weaponPivot.add(sword);
    }
    this.mesh.add(this.weaponPivot);

    if (this.type === 'SHIELDER') {
      const shield = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.7, 0.12, 14),
        new THREE.MeshStandardMaterial({ color: 0x3a2a1a, metalness: 0.6, roughness: 0.4 })
      );
      shield.rotation.x = Math.PI / 2;
      shield.position.set(-0.55, 1.2, 0.4);
      this.mesh.add(shield);
    }

    if (this.type === 'BOSS') {
      const shoulder = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.2, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x3a1f14, metalness: 0.2, roughness: 0.6 })
      );
      shoulder.position.set(0, 1.7, 0);
      this.mesh.add(shoulder);

      const hornMat = new THREE.MeshStandardMaterial({ color: 0x8a6b3f, roughness: 0.4 });
      const hornLeft = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5, 6), hornMat);
      hornLeft.position.set(-0.3, 2.5, 0);
      hornLeft.rotation.z = Math.PI / 4;
      this.mesh.add(hornLeft);
      const hornRight = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5, 6), hornMat);
      hornRight.position.set(0.3, 2.5, 0);
      hornRight.rotation.z = -Math.PI / 4;
      this.mesh.add(hornRight);

      this.healthBar.scale.x = 1.4;
    }

    // Health UI
    const barGeo = new THREE.PlaneGeometry(1.5, 0.15);
    const barMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
    this.healthBar = new THREE.Mesh(barGeo, barMat);
    this.healthBar.position.y = 3.2;
    this.mesh.add(this.healthBar);

    this.mesh.position.copy(startPos);
    scene.add(this.mesh);
  }

  public update(delta: number) {
    if (this.isDead) return;

    const pPos = this.player.getPosition();
    const dist = this.mesh.position.distanceTo(pPos);
    this.rangedCooldown = Math.max(0, this.rangedCooldown - delta);
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
        } else if (dist < 20.0) {
          if (this.rangedCooldown <= 0) {
            this.rangedCooldown = 2.2;
            this.weaponPivot.rotation.x = 1.2;
            this.audio.playSwordSwing();
            EnemyManager.spawnArrow(this.scene, this.player, this.mesh.position.clone(), pPos.clone());
          } else {
            this.weaponPivot.rotation.x = THREE.MathUtils.lerp(this.weaponPivot.rotation.x, 0.2, delta * 5);
          }
        } else {
          const dir = pPos.clone().sub(this.mesh.position).normalize();
          this.mesh.position.add(dir.multiplyScalar(this.speed * delta));
          this.weaponPivot.rotation.x = THREE.MathUtils.lerp(this.weaponPivot.rotation.x, 0, delta * 5);
        }
    } else if (dist > 6.0) {
        const dir = pPos.clone().sub(this.mesh.position).normalize();
        this.mesh.position.add(dir.multiplyScalar(this.speed * delta));
        this.weaponPivot.rotation.x = THREE.MathUtils.lerp(this.weaponPivot.rotation.x, 0, delta * 5);
    } else if (dist > 3.5) {
        this.circleAngle += delta * 1.5 * this.circleDir;
        const targetX = pPos.x + Math.cos(this.circleAngle) * 5.0;
        const targetZ = pPos.z + Math.sin(this.circleAngle) * 5.0;
        const target = new THREE.Vector3(targetX, 0, targetZ);
        this.mesh.position.lerp(target, delta * 3);
        this.weaponPivot.rotation.x = THREE.MathUtils.lerp(this.weaponPivot.rotation.x, 0.5, delta * 5);
    } else {
        if (this.attackCooldown <= 0) {
            this.strike();
        } else {
            this.attackCooldown -= delta;
            this.weaponPivot.rotation.x = THREE.MathUtils.lerp(this.weaponPivot.rotation.x, -2, delta * 10);
        }
    }
    
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
          this.shieldStamina -= 28;
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
  }

  private strike() {
    this.attackCooldown = 2.0;
    this.weaponPivot.rotation.x = 2; // Telegraph forward swing
    setTimeout(() => {
        if (this.isDead) return;
        const dist = this.mesh.position.distanceTo(this.player.getPosition());
        if (dist < 4.0) {
            const dmg = this.type === 'BOSS' ? 30 : this.type === 'BRUTE' ? 22 : 12;
            this.player.takeDamage(dmg);
        }
    }, 400);
  }

  public takeDamage(amount: number) {
    if (this.hitFlash > 0.15) return;
    this.health -= amount;
    this.hitFlash = 1.5;
    this.audio.playSwordClash();
    const isLethal = this.health <= 0;
    this.onHit(this.mesh.position.clone(), isLethal);
    this.player.triggerHitStop(isLethal);
    if (isLethal) this.die();
  }

  private die() {
    this.isDead = true;
    this.onKilled();
    this.scene.remove(this.mesh);
  }

  public isActive() { return !this.isDead; }
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
  private static arrows: Arrow[] = [];
  private bossActive = false;

  constructor(scene: THREE.Scene, player: Player, audio: AudioManager, onEnemyKilled: (points: number) => void) {
    this.scene = scene;
    this.player = player;
    this.audio = audio;
    this.onEnemyKilled = onEnemyKilled;
  }

  public update(delta: number) {
    this.spawnTimer -= delta;
    const maxEnemies = 4 + Math.floor(this.difficulty * 0.5); 
    
    if (this.spawnTimer <= 0 && this.enemies.length < maxEnemies) {
      this.spawnEnemy();
      this.spawnTimer = Math.max(2.0, 5.0 - this.difficulty * 0.7);
    }

    this.enemies = this.enemies.filter(e => {
      e.update(delta);
      return e.isActive();
    });

    this.hitBursts = this.hitBursts.filter(burst => burst.update(delta));
    EnemyManager.arrows = EnemyManager.arrows.filter(arrow => arrow.update(delta));
  }

  private spawnEnemy() {
    const startPos = new THREE.Vector3((Math.random() - 0.5) * 35, 0, this.player.getPosition().z - 75);
    const roll = Math.random();
    let type: EnemyType = 'STANDARD';
    if (roll > 0.93) {
      type = 'BRUTE';
    } else if (roll > 0.83) {
      type = 'SHIELDER';
    } else if (roll > 0.68) {
      type = 'RUSHER';
    } else if (roll > 0.52) {
      type = 'ARCHER';
    }
    this.enemies.push(
      new Enemy(
        this.scene,
        this.player,
        this.audio,
        startPos,
        this.difficulty,
        () => this.onEnemyKilled(1),
        (pos, lethal) => this.spawnHitBurst(pos, lethal),
        type
      )
    );
  }

  public setDifficulty(level: number) { this.difficulty = level; }
  public freezeAll() { this.enemies = []; }
  public isBossActive() { return this.bossActive; }
  public triggerValorStrike(center: THREE.Vector3) {
    const radius = 8.5;
    this.enemies.forEach(enemy => {
      const dist = enemy.mesh.position.distanceTo(center);
      if (dist <= radius) {
        enemy.takeDamage(9999);
      }
    });
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
      },
      (pos, lethal) => this.spawnHitBurst(pos, lethal),
      'BOSS'
    );
    this.enemies.push(boss);
  }

  private spawnHitBurst(position: THREE.Vector3, lethal: boolean) {
    const burst = new HitBurst(this.scene, position, lethal);
    this.hitBursts.push(burst);
  }

  public static spawnArrow(scene: THREE.Scene, player: Player, start: THREE.Vector3, target: THREE.Vector3) {
    const arrow = new Arrow(scene, player, start, target);
    EnemyManager.arrows.push(arrow);
  }
}

class HitBurst {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private velocities: THREE.Vector3[] = [];
  private life = 0.35;

  constructor(scene: THREE.Scene, position: THREE.Vector3, lethal: boolean) {
    this.scene = scene;
    this.group = new THREE.Group();
    const color = lethal ? 0xff6b3d : 0xffc55c;
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2 });

    for (let i = 0; i < 8; i++) {
      const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.08 + Math.random() * 0.12), mat);
      shard.position.set(
        (Math.random() - 0.5) * 0.6,
        1.2 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.6
      );
      this.group.add(shard);
      this.velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        4 + Math.random() * 6,
        (Math.random() - 0.5) * 6
      ));
    }

    this.group.position.copy(position);
    this.scene.add(this.group);
  }

  public update(delta: number) {
    this.life -= delta;
    this.group.children.forEach((child, idx) => {
      const vel = this.velocities[idx];
      child.position.addScaledVector(vel, delta);
      vel.y -= 18 * delta;
      child.scale.multiplyScalar(1 - delta * 1.5);
    });

    if (this.life <= 0) {
      this.scene.remove(this.group);
      return false;
    }
    return true;
  }
}

class Arrow {
  private scene: THREE.Scene;
  private player: Player;
  private mesh: THREE.Mesh;
  private velocity: THREE.Vector3;
  private life = 3.5;

  constructor(scene: THREE.Scene, player: Player, start: THREE.Vector3, target: THREE.Vector3) {
    this.scene = scene;
    this.player = player;
    this.mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 2.0, 6),
      new THREE.MeshStandardMaterial({ color: 0x8a6b3f, roughness: 0.7 })
    );
    this.mesh.rotation.z = Math.PI / 2;
    this.mesh.position.copy(start).add(new THREE.Vector3(0, 1.4, 0));
    const dir = target.clone().sub(start).normalize();
    this.velocity = dir.multiplyScalar(22);
    this.scene.add(this.mesh);
  }

  public update(delta: number) {
    this.life -= delta;
    this.mesh.position.addScaledVector(this.velocity, delta);
    const dist = this.mesh.position.distanceTo(this.player.getPosition());
    if (dist < 2.2) {
      this.player.takeDamage(10);
      this.scene.remove(this.mesh);
      return false;
    }
    if (this.life <= 0) {
      this.scene.remove(this.mesh);
      return false;
    }
    return true;
  }
}
