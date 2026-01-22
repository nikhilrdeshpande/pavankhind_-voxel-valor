
import * as THREE from 'three';
import { InputManager } from './InputManager';
import { AudioManager } from './AudioManager';

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
  private valorStrikeQueued = false;
  private valorStrikeCooldown = 0;
  private valorStrikeArmed = false;
  
  private velocity = new THREE.Vector3();
  private isBlocking = false;
  private attackCooldown = 0;
  private swingPhase: 'WINDUP' | 'STRIKE' | 'RECOVERY' | 'IDLE' = 'IDLE';
  private swingTimer = 0;
  private hitStopTimer = 0;
  private swingSide = 1;
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
  private cameraOffset = new THREE.Vector3(0, 4.0, 9.0);
  private cameraShake = 0;
  private damagePulse = 0;
  private minZ = -1300;
  private maxZ = 80;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, input: InputManager, audio: AudioManager) {
    this.camera = camera;
    this.input = input;
    this.audio = audio;

    this.mesh = new THREE.Group();
    
    // Baji Prabhu - weathered angarkha and battle-worn look
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 1.6, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xceb79a, roughness: 0.9 })
    );
    torso.position.y = 1.1;
    this.mesh.add(torso);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.55, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x8d5a3b, roughness: 0.8 })
    );
    head.position.y = 1.95;
    this.mesh.add(head);

    const strap = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 1.7, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.8 })
    );
    strap.position.set(0.15, 1.1, 0.2);
    strap.rotation.z = 0.45;
    this.mesh.add(strap);

    const sash = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.25, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.7 })
    );
    sash.position.set(0, 0.55, 0.1);
    this.mesh.add(sash);

    const cape = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.2, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x3f1d1d, roughness: 0.95 })
    );
    cape.position.set(0.2, 1.2, -0.35);
    cape.rotation.y = -0.2;
    this.mesh.add(cape);

    const mustacheLeft = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.035, 6, 10, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x2b1b12, roughness: 0.9 })
    );
    mustacheLeft.position.set(-0.12, 1.9, 0.3);
    mustacheLeft.rotation.set(Math.PI / 2, 0, Math.PI / 6);
    this.mesh.add(mustacheLeft);

    const mustacheRight = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.035, 6, 10, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x2b1b12, roughness: 0.9 })
    );
    mustacheRight.position.set(0.12, 1.9, 0.3);
    mustacheRight.rotation.set(Math.PI / 2, 0, -Math.PI / 6);
    this.mesh.add(mustacheRight);

    // Right Arm (Sword)
    const rArm = new THREE.Group();
    const rArmMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 1.1, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xceb79a, roughness: 0.85 })
    );
    rArmMesh.position.y = -0.55;
    rArm.add(rArmMesh);
    rArm.position.set(0.65, 1.7, 0);
    this.rightArm = rArm;
    this.mesh.add(rArm);

    this.swordPivot = new THREE.Group();
    this.swordPivot.position.set(0, -0.9, -0.1); 
    rArm.add(this.swordPivot);
    this.sword = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 3.0, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 1.0, roughness: 0.15 })
    );
    this.sword.position.y = 1.8; 
    this.swordPivot.add(this.sword);

    // Left Arm & Second Sword
    this.leftArm = new THREE.Group();
    const lArmMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 1.1, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xceb79a, roughness: 0.85 })
    );
    lArmMesh.position.y = -0.55;
    this.leftArm.add(lArmMesh);

    const leftSwordPivot = new THREE.Group();
    leftSwordPivot.position.set(0, -0.9, -0.1);
    this.leftArm.add(leftSwordPivot);
    this.leftSword = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 2.7, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.9, roughness: 0.2 })
    );
    this.leftSword.position.y = 1.6;
    leftSwordPivot.add(this.leftSword);
    
    this.leftArm.position.set(-0.65, 1.7, 0);
    this.mesh.add(this.leftArm);

    scene.add(this.mesh);
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

    if (this.damagePulse > 0) {
      this.damagePulse -= delta * 4;
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
  }

  public triggerHitStop(isLethal: boolean) {
    this.hitStopTimer = isLethal ? 0.08 : 0.04;
    this.cameraShake = isLethal ? 1.2 : 0.6;
    this.comboCount++;
    this.comboTimer = 2.0;
    this.maxCombo = Math.max(this.maxCombo, this.comboCount);
    this.rage = Math.min(100, this.rage + (isLethal ? 18 : 8));
  }

  private handleMovement(delta: number) {
    let moveSpeed = (this.stamina < 15 ? 4 : 16);
    if (this.isBlocking) moveSpeed *= 0.4;

    const direction = new THREE.Vector3();
    if (this.input.keys['w']) direction.z -= 1;
    if (this.input.keys['s']) direction.z += 1;
    if (this.input.keys['a']) direction.x -= 1;
    if (this.input.keys['d']) direction.x += 1;

    if (direction.length() > 0) {
      direction.normalize().applyQuaternion(this.mesh.quaternion);
      this.velocity.lerp(direction.multiplyScalar(moveSpeed), delta * 15);
    } else {
      this.velocity.lerp(new THREE.Vector3(0, 0, 0), delta * 20);
    }

    const isLocked = !!document.pointerLockElement;
    const wantsDodge = isLocked && this.input.keys[' '] && this.dodgeCooldown <= 0 && this.stamina > 20;
    if (wantsDodge) {
      this.dodgeTimer = 0.25;
      this.dodgeCooldown = 0.6;
      this.stamina -= 20;
      this.dodgeDir = direction.length() > 0 ? direction.clone() : new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
    }

    if (this.dodgeTimer > 0) {
      this.velocity.copy(this.dodgeDir.clone().multiplyScalar(26));
    }

    const nextPos = this.mesh.position.clone().add(this.velocity.clone().multiplyScalar(delta));
    if (Math.abs(nextPos.x) < 19.5) {
      nextPos.z = Math.max(this.minZ, Math.min(this.maxZ, nextPos.z));
      this.mesh.position.copy(nextPos);
    }

    if (document.pointerLockElement) {
        this.mesh.rotation.y -= this.input.mouseDelta.x * 0.003;
        this.input.mouseDelta.set(0, 0);
    }
  }

  private handleCombat(delta: number) {
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    const isLocked = !!document.pointerLockElement;
    
    // Check RMB (button 2) for blocking
    this.isBlocking = isLocked && this.input.mouseButtons[2] && this.stamina > 2;
    const isBlockPressed = !!this.input.mouseButtons[2];
    if (isLocked && isBlockPressed && !this.wasBlockingInput) {
      this.parryTimer = 0.18;
    }
    this.wasBlockingInput = isBlockPressed;

    // Right Hand Animation (Sword)
    const rArm = this.rightArm;
    const comboMod = 1 + Math.min(this.comboCount * 0.15, 1.0);

    if (isLocked && this.input.mouseButtons[0] && this.swingPhase === 'IDLE' && !this.isBlocking && this.attackCooldown <= 0) {
      this.swingPhase = 'WINDUP';
      this.swingTimer = 0;
      this.swingSide *= -1;
      this.stamina -= 12;
      this.audio.playBreath(0.6);
    }

    if (this.swingPhase !== 'IDLE') {
      this.swingTimer += delta * comboMod;
      if (this.swingPhase === 'WINDUP') {
        rArm.rotation.x = THREE.MathUtils.lerp(rArm.rotation.x, Math.PI / 2.2, delta * 30 * comboMod);
        rArm.rotation.z = THREE.MathUtils.lerp(rArm.rotation.z, this.swingSide * 0.8, delta * 25 * comboMod);
        if (this.swingTimer > 0.07) { this.swingPhase = 'STRIKE'; this.swingTimer = 0; this.audio.playSwordSwing(); }
      } else if (this.swingPhase === 'STRIKE') {
        rArm.rotation.x = THREE.MathUtils.lerp(rArm.rotation.x, -Math.PI / 1.2, delta * 65 * comboMod);
        rArm.rotation.z = THREE.MathUtils.lerp(rArm.rotation.z, -this.swingSide * 0.5, delta * 45 * comboMod);
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

  private updateStats(delta: number) {
    if (this.swingPhase === 'IDLE' && !this.isBlocking) {
        this.stamina = Math.min(100, this.stamina + 65 * delta);
    }
    this.cameraShake = Math.max(0, this.cameraShake - delta * 5);
    if (this.comboTimer > 0) {
        this.comboTimer -= delta;
        if (this.comboTimer <= 0) this.comboCount = 0;
    }
    if (this.comboTimer <= 0) {
      this.rage = Math.max(0, this.rage - 12 * delta);
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
    const idealOffset = this.cameraOffset.clone().applyQuaternion(this.mesh.quaternion);
    const targetPos = this.mesh.position.clone().add(idealOffset);
    if (this.cameraShake > 0) {
      targetPos.x += (Math.random() - 0.5) * this.cameraShake;
      targetPos.y += (Math.random() - 0.5) * this.cameraShake;
    }
    this.camera.position.lerp(targetPos, delta * 15);
    const lookPoint = this.mesh.position.clone().add(new THREE.Vector3(0, 1.5, -10).applyQuaternion(this.mesh.quaternion));
    this.camera.lookAt(lookPoint);
  }

  public takeDamage(amount: number) {
    if (this.parryTimer > 0) {
      this.parryTimer = 0;
      this.audio.playSwordClash();
      this.cameraShake = 0.6;
      this.stamina = Math.min(100, this.stamina + 10);
      return;
    }
    if (this.dodgeTimer > 0) {
      return;
    }
    // Blocks 90% of incoming damage
    const finalAmount = this.isBlocking ? amount * 0.1 : amount;
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
  }

  public restore(h: number, s: number) {
    this.health = Math.min(100, this.health + h);
    this.stamina = Math.min(100, this.stamina + s);
    this.damagePulse = 1.0;
  }

  public getPosition() { return this.mesh.position; }
  public getCameraPosition() { return this.camera.position; }
  public getHealth() { return this.health; }
  public getStamina() { return this.stamina; }
  public isPlayerAttacking() { return this.swingPhase === 'STRIKE'; }
  public isPlayerBlocking() { return this.isBlocking; }
  public getAttackPower() { return 85 * (1 + (this.weaponLevel - 1) * 0.15); }
  public getComboCount() { return this.comboCount; }
  public getRage() { return this.rage; }
  public getMaxCombo() { return this.maxCombo; }
  public getDamageTaken() { return this.damageTaken; }
  public getValorStrikesUsed() { return this.valorStrikesUsed; }
  public getWeaponLevel() { return this.weaponLevel; }
  public upgradeWeapon() {
    this.weaponLevel = Math.min(4, this.weaponLevel + 1);
  }
  public consumeValorStrike() {
    if (!this.valorStrikeQueued) return false;
    this.valorStrikeQueued = false;
    this.valorStrikesUsed += 1;
    return true;
  }
}
