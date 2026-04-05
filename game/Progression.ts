
const STORAGE_KEY = 'pavankhind_profile';

export interface PlayerProfile {
  totalKills: number;
  totalRuns: number;
  bestScore: Record<string, number>;
  unlockedModes: string[];
  currency: number;
  rank: number;
}

export const RANKS = [
  { name: 'Sainik', threshold: 0 },
  { name: 'Sardar', threshold: 50 },
  { name: 'Senapati', threshold: 200 },
  { name: 'Sarnaubat', threshold: 500 },
  { name: 'Swarajya Rakshak', threshold: 1000 },
];

const DEFAULT_PROFILE: PlayerProfile = {
  totalKills: 0,
  totalRuns: 0,
  bestScore: {},
  unlockedModes: ['skirmish'],
  currency: 0,
  rank: 0,
};

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
      return { ...DEFAULT_PROFILE, ...parsed };
    }
  } catch {
    // corrupt data, reset
  }
  return { ...DEFAULT_PROFILE };
}

export function saveProfile(profile: PlayerProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // storage full or disabled
  }
}

export function getRankName(totalKills: number): string {
  let name = RANKS[0].name;
  for (const r of RANKS) {
    if (totalKills >= r.threshold) name = r.name;
  }
  return name;
}

export function getRankIndex(totalKills: number): number {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (totalKills >= RANKS[i].threshold) idx = i;
  }
  return idx;
}

export function getNextRank(totalKills: number): { name: string; threshold: number } | null {
  for (const r of RANKS) {
    if (totalKills < r.threshold) return r;
  }
  return null;
}

/** Unlock conditions: skirmish=default, battle=survive 1 skirmish, lastStand=survive 1 battle */
export function checkUnlocks(profile: PlayerProfile): string[] {
  const unlocked = ['skirmish'];
  if ((profile.bestScore['skirmish'] ?? 0) > 0 || profile.totalRuns > 0) {
    unlocked.push('battle');
  }
  if ((profile.bestScore['battle'] ?? 0) > 0) {
    unlocked.push('lastStand');
  }
  return unlocked;
}

export interface RunResult {
  modeKey: string;
  score: number;
  won: boolean;
  objectivesCompleted: number;
}

/** Process end-of-run: update profile and return coins earned */
export function processRunEnd(profile: PlayerProfile, result: RunResult): { coins: number; newBest: boolean } {
  const { modeKey, score, won, objectivesCompleted } = result;

  profile.totalKills += score;
  profile.totalRuns += 1;

  const prevBest = profile.bestScore[modeKey] ?? 0;
  const newBest = score > prevBest;
  if (newBest) {
    profile.bestScore[modeKey] = score;
  }

  // Coins: kills + objective bonus + survival bonus
  let coins = score;
  coins += objectivesCompleted * 3;
  if (won) coins += 10;

  profile.currency += coins;
  profile.rank = getRankIndex(profile.totalKills);
  profile.unlockedModes = checkUnlocks(profile);

  saveProfile(profile);
  return { coins, newBest };
}
