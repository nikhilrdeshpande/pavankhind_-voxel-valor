
import * as THREE from 'three';

export class AudioManager {
  private static activeChants = new Set<HTMLAudioElement>();
  private listener: THREE.AudioListener;
  private audioContext: AudioContext;
  private introMasterGain: GainNode | null = null;
  private introOscillators: OscillatorNode[] = [];
  private introIntervalId: number | null = null;
  private introChantAudio: HTMLAudioElement | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private combatMasterGain: GainNode | null = null;
  private combatIntervalId: number | null = null;
  private ambientMasterGain: GainNode | null = null;
  private ambientWindNodes: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  private ambientBirdTimer: number | null = null;
  private distantDrumTimer: number | null = null;
  private combatIntensityLevel = 0;
  private hihatIntervalId: number | null = null;
  private tashaIntervalId: number | null = null;
  private tanpuraDroneNodes: OscillatorNode[] = [];
  private tanpuraDroneGain: GainNode | null = null;
  private heartbeatIntervalId: number | null = null;

  constructor(camera: THREE.Camera) {
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);
    this.audioContext = THREE.AudioContext.getContext();
  }

  public resume() {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    console.log('[AudioManager] setMuted', muted, 'activeChants', AudioManager.activeChants.size);
    if (this.introMasterGain) {
      this.introMasterGain.gain.setValueAtTime(muted ? 0 : 0.32, this.audioContext.currentTime);
    }
    if (this.combatMasterGain) {
      this.combatMasterGain.gain.setValueAtTime(muted ? 0 : this.combatTargetVolume, this.audioContext.currentTime);
    }
    if (this.ambientMasterGain) {
      this.ambientMasterGain.gain.setValueAtTime(muted ? 0 : 1.0, this.audioContext.currentTime);
    }
    if (this.tanpuraDroneGain) {
      this.tanpuraDroneGain.gain.setValueAtTime(muted ? 0 : 0.03, this.audioContext.currentTime);
    }
    if (muted) {
      this.stopHeartbeat();
    }
    AudioManager.activeChants.forEach((audio) => {
      audio.muted = muted;
      audio.volume = muted ? 0 : 0.7;
      if (muted) {
        audio.pause();
      }
    });
    if (this.introChantAudio) {
      this.introChantAudio.muted = muted;
      if (muted) {
        console.log('[AudioManager] pausing intro chant');
        this.introChantAudio.pause();
      } else {
        console.log('[AudioManager] resuming intro chant');
        this.introChantAudio.play().catch(() => {
          // Autoplay can be blocked; user gesture will resume.
        });
      }
    }
  }

  public playIntroMusic() {
    // Intro ambience disabled while using chant mp3 to avoid overlapping hum.
  }

  public stopIntroMusic() {
    if (!this.introMasterGain) return;
    this.introMasterGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1);
    if (this.introIntervalId) {
      window.clearInterval(this.introIntervalId);
      this.introIntervalId = null;
    }
    setTimeout(() => {
      this.introOscillators.forEach((osc) => {
        try {
          osc.stop();
        } catch {
          // Ignore already-stopped oscillators.
        }
      });
      this.introOscillators = [];
      this.introMasterGain?.disconnect();
      this.introMasterGain = null;
    }, 1100);
  }

  public playIntroChant() {
    if (this.introChantAudio) return;
    console.log('[AudioManager] playIntroChant');
    this.introChantAudio = new Audio('/har-har-mahadev.mp3');
    this.introChantAudio.loop = true;
    this.introChantAudio.volume = 0.7;
    this.introChantAudio.muted = this.muted;
    AudioManager.activeChants.add(this.introChantAudio);
    if (!this.muted) {
      this.introChantAudio.play().catch(() => {
        // Autoplay can be blocked; will start after user gesture.
      });
    }
  }

  public stopIntroChant() {
    if (this.introChantAudio) {
      console.log('[AudioManager] stopIntroChant');
      this.introChantAudio.pause();
      this.introChantAudio.currentTime = 0;
      AudioManager.activeChants.delete(this.introChantAudio);
      this.introChantAudio = null;
    }
  }

  private getNoiseBuffer() {
    if (this.noiseBuffer) return this.noiseBuffer;
    const bufferSize = this.audioContext.sampleRate * 1;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number) {
    if (this.muted) return;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.1, this.audioContext.currentTime + duration);
    gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
  }

  private combatBaseVolume = 0.06;
  private combatTargetVolume = 0.06;

  /** Set combat proximity — adjusts dhol volume based on nearby enemies */
  public setCombatProximity(nearCount: number) {
    const newTarget = nearCount > 0
      ? Math.min(0.25, 0.10 + nearCount * 0.03)
      : this.combatBaseVolume;
    if (Math.abs(newTarget - this.combatTargetVolume) < 0.005) return; // skip if unchanged
    this.combatTargetVolume = newTarget;
    if (this.combatMasterGain && !this.muted) {
      this.combatMasterGain.gain.linearRampToValueAtTime(
        this.combatTargetVolume,
        this.audioContext.currentTime + (nearCount > 0 ? 0.5 : 3.0)
      );
    }
  }

  public startCombatDhol() {
    if (this.combatMasterGain) return;
    const ctx = this.audioContext;
    this.combatMasterGain = ctx.createGain();
    this.combatMasterGain.gain.setValueAtTime(0, ctx.currentTime);
    this.combatMasterGain.gain.linearRampToValueAtTime(this.muted ? 0 : this.combatBaseVolume, ctx.currentTime + 2);
    this.combatMasterGain.connect(ctx.destination);

    const playDholHit = (time: number, accent: boolean) => {
      if (!this.combatMasterGain) return;
      const kick = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(accent ? 110 : 85, time);
      kick.frequency.exponentialRampToValueAtTime(42, time + 0.12);
      kickGain.gain.setValueAtTime(accent ? 0.8 : 0.5, time);
      kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      kick.connect(kickGain);
      kickGain.connect(this.combatMasterGain);
      kick.start(time);
      kick.stop(time + 0.22);

      const snap = ctx.createBufferSource();
      const snapGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      snap.buffer = this.getNoiseBuffer();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(accent ? 1400 : 1100, time);
      filter.Q.value = 0.9;
      snapGain.gain.setValueAtTime(accent ? 0.14 : 0.08, time);
      snapGain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);
      snap.connect(filter);
      filter.connect(snapGain);
      snapGain.connect(this.combatMasterGain);
      snap.start(time);
      snap.stop(time + 0.15);
    };

    const schedulePattern = () => {
      const now = ctx.currentTime;
      playDholHit(now, true);
      playDholHit(now + 0.30, false);
      playDholHit(now + 0.60, false);
      playDholHit(now + 0.85, true);
    };

    schedulePattern();
    this.combatIntervalId = window.setInterval(schedulePattern, 950);
  }

  public stopCombatDhol() {
    if (!this.combatMasterGain) return;
    this.combatMasterGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1.5);
    if (this.combatIntervalId) {
      window.clearInterval(this.combatIntervalId);
      this.combatIntervalId = null;
    }
    if (this.hihatIntervalId) { clearInterval(this.hihatIntervalId); this.hihatIntervalId = null; }
    if (this.tashaIntervalId) { clearInterval(this.tashaIntervalId); this.tashaIntervalId = null; }
    this.combatIntensityLevel = 0;
    const gain = this.combatMasterGain;
    this.combatMasterGain = null;
    setTimeout(() => {
      gain.disconnect();
    }, 1600);
  }

  /** Single accented dhol hit for combo tier upgrades */
  public playDholAccent() {
    if (this.muted) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const dest = ctx.destination;

    const kick = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kick.type = 'sine';
    kick.frequency.setValueAtTime(130, now);
    kick.frequency.exponentialRampToValueAtTime(50, now + 0.15);
    kickGain.gain.setValueAtTime(0.5, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    kick.connect(kickGain);
    kickGain.connect(dest);
    kick.start(now);
    kick.stop(now + 0.26);

    const snap = ctx.createBufferSource();
    const snapGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    snap.buffer = this.getNoiseBuffer();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.Q.value = 1.2;
    snapGain.gain.setValueAtTime(0.2, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    snap.connect(filter);
    filter.connect(snapGain);
    snapGain.connect(dest);
    snap.start(now);
    snap.stop(now + 0.14);
  }

  /** Procedural war cry for valor strike / boss kill */
  public playWarCry() {
    if (this.muted) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const dest = ctx.destination;
    const duration = 0.6;

    // Layered formant-like tones to simulate a shout
    const freqs = [220, 440, 660];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = i === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq * (0.95 + Math.random() * 0.1), now);
      osc.frequency.linearRampToValueAtTime(freq * 1.15, now + duration * 0.3);
      osc.frequency.linearRampToValueAtTime(freq * 0.8, now + duration);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800 + i * 400, now);
      filter.Q.value = 2;
      const vol = i === 0 ? 0.12 : 0.06;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.05);
      gain.gain.setValueAtTime(vol, now + duration * 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + duration + 0.01);
    });

    // Noise burst for breath texture
    const noise = ctx.createBufferSource();
    const noiseGain = ctx.createGain();
    const noiseBP = ctx.createBiquadFilter();
    noise.buffer = this.getNoiseBuffer();
    noiseBP.type = 'bandpass';
    noiseBP.frequency.setValueAtTime(2000, now);
    noiseBP.Q.value = 0.5;
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.08, now + 0.04);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7);
    noise.connect(noiseBP);
    noiseBP.connect(noiseGain);
    noiseGain.connect(dest);
    noise.start(now);
    noise.stop(now + duration);
  }

  public playSwordSwing() {
    const freq = 280 + Math.random() * 60;
    this.playTone(freq, 'sine', 0.12 + Math.random() * 0.06, 0.1);
  }

  public playSwordClash() {
    // Randomized pitch/duration for variety
    const variants: [number, OscillatorType, number, number][] = [
      [1500, 'square', 0.08, 0.05],
      [1700, 'square', 0.06, 0.06],
      [1300, 'square', 0.10, 0.04],
      [1600, 'sawtooth', 0.07, 0.05],
    ];
    const v = variants[Math.floor(Math.random() * variants.length)];
    this.playTone(v[0], v[1], v[2], v[3]);
  }

  public playHit() { this.playTone(70, 'sawtooth', 0.2, 0.2); }

  public playKill() {
    // Satisfying low thud + high ring for lethal hits
    this.playTone(55, 'sawtooth', 0.3, 0.25);
    this.playTone(800, 'sine', 0.15, 0.08);
  }

  public playBreath(intensity: number) { this.playTone(100, 'sine', 0.4, 0.05 * intensity); }

  public playCannon() {
    for (let i = 0; i < 3; i++) {
        this.playTone(40 + i * 15, 'sawtooth', 3.0, 0.6);
    }
  }

  /** Footstep thud — louder with ground crunch */
  public playFootstep() {
    if (this.muted) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(60 + Math.random() * 20, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
    // Ground crunch noise
    const noise = ctx.createBufferSource();
    const nGain = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    noise.buffer = this.getNoiseBuffer();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(200 + Math.random() * 200, now);
    bp.Q.value = 1.0;
    nGain.gain.setValueAtTime(0.04, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    noise.connect(bp);
    bp.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.08);
  }

  /** Dodge whoosh — rising pitch sweep */
  public playDodgeWhoosh() {
    if (this.muted) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    const noiseGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    noise.buffer = this.getNoiseBuffer();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.15);
    filter.Q.value = 1.5;
    noiseGain.gain.setValueAtTime(0.12, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.22);
  }

  /** Start ambient wind — noise + bandpass + LFO */
  public startAmbientWind() {
    if (this.ambientWindNodes || this.muted) return;
    const ctx = this.audioContext;
    if (!this.ambientMasterGain) {
      this.ambientMasterGain = ctx.createGain();
      this.ambientMasterGain.gain.setValueAtTime(1.0, ctx.currentTime);
      this.ambientMasterGain.connect(ctx.destination);
    }
    const source = ctx.createBufferSource();
    source.buffer = this.getNoiseBuffer();
    source.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(400, ctx.currentTime);
    bp.Q.value = 0.8;
    // Slow LFO on filter frequency
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.15;
    lfoGain.gain.value = 100;
    lfo.connect(lfoGain);
    lfoGain.connect(bp.frequency);
    lfo.start();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 2);
    source.connect(bp);
    bp.connect(gain);
    gain.connect(this.ambientMasterGain);
    source.start();
    this.ambientWindNodes = { source, gain };
  }

  /** Periodic bird chirps */
  public startAmbientBirds() {
    if (this.ambientBirdTimer) return;
    const chirp = () => {
      if (this.muted) return;
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      const dest = this.ambientMasterGain || ctx.destination;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const baseFreq = 2000 + Math.random() * 1000;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.linearRampToValueAtTime(baseFreq + 500, now + 0.05);
      osc.frequency.linearRampToValueAtTime(baseFreq - 200, now + 0.12);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.02, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.17);
    };
    const schedule = () => {
      chirp();
      this.ambientBirdTimer = window.setTimeout(schedule, 8000 + Math.random() * 7000);
    };
    schedule();
  }

  /** Distant Sultanate drums — low sine pulses that grow louder over time */
  public startDistantDrums() {
    if (this.distantDrumTimer) return;
    let volume = 0.015;
    const pulse = () => {
      if (this.muted) return;
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      const dest = this.ambientMasterGain || ctx.destination;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(50 + Math.random() * 20, now);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.55);
      volume = Math.min(0.06, volume + 0.002);
    };
    const schedule = () => {
      pulse();
      this.distantDrumTimer = window.setTimeout(schedule, 4000 + Math.random() * 2000);
    };
    schedule();
  }

  public stopAmbientSounds() {
    if (this.ambientWindNodes) {
      try { this.ambientWindNodes.source.stop(); } catch {}
      this.ambientWindNodes.gain.disconnect();
      this.ambientWindNodes = null;
    }
    if (this.ambientBirdTimer) {
      clearTimeout(this.ambientBirdTimer);
      this.ambientBirdTimer = null;
    }
    if (this.distantDrumTimer) {
      clearTimeout(this.distantDrumTimer);
      this.distantDrumTimer = null;
    }
    if (this.ambientMasterGain) {
      this.ambientMasterGain.disconnect();
      this.ambientMasterGain = null;
    }
  }

  /** Shield block — distinct from sword clash */
  public playShieldBlock() {
    if (this.muted) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    // Low thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
    // Wooden knock
    const noise = ctx.createBufferSource();
    const nGain = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    noise.buffer = this.getNoiseBuffer();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(600, now);
    bp.Q.value = 1.5;
    nGain.gain.setValueAtTime(0.1, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    noise.connect(bp);
    bp.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.12);
  }

  /** Brute ground slam */
  public playBruteSlam() {
    if (this.muted) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(35, now);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
    // Noise burst
    const noise = ctx.createBufferSource();
    const nGain = ctx.createGain();
    noise.buffer = this.getNoiseBuffer();
    nGain.gain.setValueAtTime(0.12, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    noise.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.35);
  }

  /** Boss phase 2 roar */
  public playBossRoar() {
    if (this.muted) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const freqs = [110, 220, 330];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 0.7, now + 0.8);
      const vol = i === 0 ? 0.15 : 0.08;
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.85);
    });
    // Sub-bass
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(55, now);
    subGain.gain.setValueAtTime(0.2, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.85);
  }

  /** Set combat music intensity based on combo tier */
  public setCombatIntensity(level: number) {
    if (level === this.combatIntensityLevel) return;
    this.combatIntensityLevel = level;
    if (!this.combatMasterGain) return;
    const ctx = this.audioContext;
    // Adjust base dhol gain
    const baseGain = level >= 3 ? 0.28 : level >= 1 ? 0.25 : 0.22;
    this.combatMasterGain.gain.linearRampToValueAtTime(this.muted ? 0 : baseGain, ctx.currentTime + 0.5);
    // Hi-hat layer at mid+ intensity
    if (level >= 1 && !this.hihatIntervalId) {
      const playHihat = () => {
        if (!this.combatMasterGain || this.muted) return;
        const now = ctx.currentTime;
        const noise = ctx.createBufferSource();
        const gain = ctx.createGain();
        const hp = ctx.createBiquadFilter();
        noise.buffer = this.getNoiseBuffer();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(8000, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        noise.connect(hp);
        hp.connect(gain);
        gain.connect(this.combatMasterGain!);
        noise.start(now);
        noise.stop(now + 0.06);
      };
      this.hihatIntervalId = window.setInterval(playHihat, 475);
    } else if (level < 1 && this.hihatIntervalId) {
      clearInterval(this.hihatIntervalId);
      this.hihatIntervalId = null;
    }
    // Tasha layer at high intensity
    if (level >= 2 && !this.tashaIntervalId) {
      const playTasha = () => {
        if (!this.combatMasterGain || this.muted) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(this.combatMasterGain!);
        osc.start(now);
        osc.stop(now + 0.14);
      };
      this.tashaIntervalId = window.setInterval(playTasha, 475);
    } else if (level < 2 && this.tashaIntervalId) {
      clearInterval(this.tashaIntervalId);
      this.tashaIntervalId = null;
    }
  }

  /** Tanpura drone for menu screens */
  public startTanpuraDrone() {
    if (this.tanpuraDroneGain) return;
    const ctx = this.audioContext;
    this.tanpuraDroneGain = ctx.createGain();
    this.tanpuraDroneGain.gain.setValueAtTime(0, ctx.currentTime);
    this.tanpuraDroneGain.gain.linearRampToValueAtTime(this.muted ? 0 : 0.03, ctx.currentTime + 2);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(800, ctx.currentTime);
    lp.connect(this.tanpuraDroneGain);
    this.tanpuraDroneGain.connect(ctx.destination);
    const freqs = [130, 260, 195]; // Pa-Sa-Sa harmonics
    freqs.forEach(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.connect(lp);
      osc.start();
      this.tanpuraDroneNodes.push(osc);
    });
  }

  public stopTanpuraDrone() {
    if (!this.tanpuraDroneGain) return;
    this.tanpuraDroneGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1);
    const nodes = this.tanpuraDroneNodes;
    const gain = this.tanpuraDroneGain;
    this.tanpuraDroneNodes = [];
    this.tanpuraDroneGain = null;
    setTimeout(() => {
      nodes.forEach(o => { try { o.stop(); } catch {} });
      gain.disconnect();
    }, 1100);
  }

  /** Low rumble for death sequence */
  public playDeathRumble() {
    if (this.muted) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(40, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 2.0);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 2.6);
  }

  /** Conch shell sound on victory */
  public playShankh() {
    if (this.muted) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    // Rising sawtooth sweep
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(200, now);
    osc1.frequency.linearRampToValueAtTime(800, now + 1.5);
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(400, now);
    osc2.frequency.linearRampToValueAtTime(1600, now + 1.5);
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(500, now);
    bp.frequency.linearRampToValueAtTime(1200, now + 1.5);
    bp.Q.value = 2;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.2);
    gain.gain.setValueAtTime(0.1, now + 1.0);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    osc1.connect(bp);
    osc2.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.55);
    osc2.stop(now + 1.55);
  }

  /** Heartbeat pulse when low HP */
  public playHeartbeat() {
    if (this.muted) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    // Double-beat like a heart
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(45, now + i * 0.15);
      gain.gain.setValueAtTime(0.12, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.25);
    }
  }

  public startHeartbeat() {
    if (this.heartbeatIntervalId) return;
    this.playHeartbeat();
    this.heartbeatIntervalId = window.setInterval(() => this.playHeartbeat(), 1500);
  }

  public stopHeartbeat() {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  /** Bow twang — distinct from sword swing */
  public playBowTwang() {
    if (this.muted) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600 + Math.random() * 100, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
    // String vibration
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1200, now);
    osc2.frequency.exponentialRampToValueAtTime(400, now + 0.1);
    gain2.gain.setValueAtTime(0.03, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.12);
  }

  /** Objective complete chime */
  public playObjectiveComplete() {
    if (this.muted) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + i * 0.08);
      gain.gain.setValueAtTime(0.08, now + i * 0.08 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.32);
    });
  }

  /** Parry success — sharp metallic ring */
  public playParrySuccess() {
    if (this.muted) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    // High metallic ring
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2200, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.15);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
    // Low impact
    const kick = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kick.type = 'sine';
    kick.frequency.setValueAtTime(200, now);
    kick.frequency.exponentialRampToValueAtTime(80, now + 0.1);
    kickGain.gain.setValueAtTime(0.15, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    kick.connect(kickGain);
    kickGain.connect(ctx.destination);
    kick.start(now);
    kick.stop(now + 0.14);
  }
}
