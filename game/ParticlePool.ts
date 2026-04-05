
import * as THREE from 'three';

interface Particle {
  active: boolean;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number;
  maxLife: number;
  scale: number;
  r: number; g: number; b: number;
  gravity: number;
}

export class ParticlePool {
  private mesh: THREE.InstancedMesh;
  private particles: Particle[];
  private dummy = new THREE.Object3D();
  private count: number;
  private colorAttr: THREE.InstancedBufferAttribute;

  constructor(scene: THREE.Scene, isMobile: boolean) {
    this.count = isMobile ? 100 : 200;

    const geo = new THREE.IcosahedronGeometry(0.05, 0);
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, this.count);
    this.mesh.frustumCulled = false;

    // Per-instance colors
    const colors = new Float32Array(this.count * 3);
    this.colorAttr = new THREE.InstancedBufferAttribute(colors, 3);
    this.mesh.instanceColor = this.colorAttr;

    // Initialize all particles as dead (hidden)
    this.particles = [];
    for (let i = 0; i < this.count; i++) {
      this.particles.push({
        active: false,
        x: 0, y: -1000, z: 0,
        vx: 0, vy: 0, vz: 0,
        life: 0, maxLife: 0,
        scale: 0,
        r: 1, g: 1, b: 1,
        gravity: 0,
      });
      // Hide by positioning far below
      this.dummy.position.set(0, -1000, 0);
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;

    scene.add(this.mesh);
  }

  emit(
    count: number,
    position: THREE.Vector3,
    velocityRange: { x: number; y: number; z: number },
    lifeRange: [number, number],
    color: THREE.Color,
    scaleRange: [number, number] = [0.8, 1.5],
    gravity: number = 12,
  ) {
    let spawned = 0;
    for (let i = 0; i < this.count && spawned < count; i++) {
      if (!this.particles[i].active) {
        const p = this.particles[i];
        p.active = true;
        p.x = position.x + (Math.random() - 0.5) * 0.5;
        p.y = position.y + (Math.random() - 0.5) * 0.3;
        p.z = position.z + (Math.random() - 0.5) * 0.5;
        p.vx = (Math.random() - 0.5) * velocityRange.x;
        p.vy = velocityRange.y * (0.5 + Math.random() * 0.5);
        p.vz = (Math.random() - 0.5) * velocityRange.z;
        p.maxLife = lifeRange[0] + Math.random() * (lifeRange[1] - lifeRange[0]);
        p.life = p.maxLife;
        p.scale = scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0]);
        p.r = color.r;
        p.g = color.g;
        p.b = color.b;
        p.gravity = gravity;
        spawned++;
      }
    }
  }

  update(delta: number) {
    let needsUpdate = false;

    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      needsUpdate = true;
      p.life -= delta;

      if (p.life <= 0) {
        p.active = false;
        this.dummy.position.set(0, -1000, 0);
        this.dummy.scale.setScalar(0);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      // Physics
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;
      p.vy -= p.gravity * delta;

      // Fade scale with life
      const t = p.life / p.maxLife;
      const currentScale = p.scale * t;

      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.scale.setScalar(currentScale);
      this.dummy.rotation.set(p.life * 3, p.life * 5, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      // Update color with fade
      this.colorAttr.setXYZ(i, p.r * t, p.g * t, p.b * t);
    }

    if (needsUpdate) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.colorAttr.needsUpdate = true;
    }
  }
}
