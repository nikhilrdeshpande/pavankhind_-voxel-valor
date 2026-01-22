
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
    return;

    const ctx = this.audioContext;
    this.introMasterGain = ctx.createGain();
    this.introMasterGain.gain.setValueAtTime(0, ctx.currentTime);
    this.introMasterGain.gain.linearRampToValueAtTime(this.muted ? 0 : 0.32, ctx.currentTime + 1.5);
    this.introMasterGain.connect(ctx.destination);

    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.16, ctx.currentTime);
    droneGain.connect(this.introMasterGain);

    const droneFreqs = [98, 196, 294];
    droneFreqs.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      osc.type = index % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(700, ctx.currentTime);
      filter.Q.value = 0.8;
      osc.connect(filter);
      filter.connect(droneGain);
      osc.start();
      this.introOscillators.push(osc);
    });

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.18;
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain);
    lfoGain.connect(droneGain.gain);
    lfo.start();
    this.introOscillators.push(lfo);

    const playDholHit = (time: number, accent: boolean) => {
      const kick = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(accent ? 120 : 90, time);
      kick.frequency.exponentialRampToValueAtTime(45, time + 0.12);
      kickGain.gain.setValueAtTime(accent ? 0.9 : 0.6, time);
      kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      kick.connect(kickGain);
      kickGain.connect(this.introMasterGain);
      kick.start(time);
      kick.stop(time + 0.22);

      const snap = ctx.createBufferSource();
      const snapGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      snap.buffer = this.getNoiseBuffer();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, time);
      filter.Q.value = 0.9;
      snapGain.gain.setValueAtTime(accent ? 0.18 : 0.1, time);
      snapGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      snap.connect(filter);
      filter.connect(snapGain);
      snapGain.connect(this.introMasterGain);
      snap.start(time);
      snap.stop(time + 0.16);
    };

    const schedulePattern = () => {
      const now = ctx.currentTime;
      playDholHit(now, true);
      playDholHit(now + 0.28, false);
      playDholHit(now + 0.56, false);
      playDholHit(now + 0.82, true);
    };

    schedulePattern();
    this.introIntervalId = window.setInterval(schedulePattern, 900);
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

  public playSwordSwing() { this.playTone(300, 'sine', 0.15, 0.1); }
  public playSwordClash() { this.playTone(1500, 'square', 0.08, 0.05); }
  public playHit() { this.playTone(70, 'sawtooth', 0.2, 0.2); }
  public playBreath(intensity: number) { this.playTone(100, 'sine', 0.4, 0.05 * intensity); }
  public playCannon() {
    for (let i = 0; i < 3; i++) {
        this.playTone(40 + i * 15, 'sawtooth', 3.0, 0.6);
    }
  }
}
