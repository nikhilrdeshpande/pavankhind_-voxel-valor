
export interface GameConfig {
  duration: number;       // seconds (90, 180, 300)
  startWave: number;      // 1, 2, 3
  enemyMultiplier: number; // 1.0, 1.2, 1.5
  modeName: string;       // 'Skirmish', 'Battle', 'Last Stand'
  archersOnly?: boolean;
  doubleSpeed?: boolean;
  noBlocking?: boolean;
  bossRush?: boolean;
  fogOfWar?: boolean;
}

export interface GameStats {
  health: number;
  stamina: number;
  timeRemaining: number;
  score: number;
  combo: number;
  rage: number;
  maxCombo: number;
  damageTaken: number;
  valorStrikes: number;
  wave: number;
  weaponLevel: number;
  perkReady: boolean;
  perkTimer: number;
  archerWarning: number;
  objectiveProgress: number;
  objectiveTarget: number;
  objectiveTimer: number;
  objectivesCompleted: number;
  // New fields for playability overhaul
  tutorialStep: number;
  gameElapsed: number;
  waveBanner: string | null;
  waveBannerTimer: number;
  dodgeCooldown: number;
  enemyPositions: { x: number; z: number; type: string }[];
  playerPosition: { x: number; z: number };
  playerYaw: number;
  waveProgress: number;
  nextWaveIn: number;
  stage: number;
  stageProgress: number;
  stageName: string;
  stageDirective: string;
  stageBanner: string | null;
  stageBannerTimer: number;
  cannonSignals: number;
  recentPickup: {
    name: string;
    effect: string;
    color: string;
  } | null;
  pickupToastTimer: number;
}

export const GAME_MODES: Record<string, GameConfig> = {
  skirmish: { duration: 90, startWave: 1, enemyMultiplier: 1.0, modeName: 'Skirmish' },
  battle: { duration: 180, startWave: 2, enemyMultiplier: 1.2, modeName: 'Battle' },
  lastStand: { duration: 300, startWave: 3, enemyMultiplier: 1.5, modeName: 'Last Stand' },
};
