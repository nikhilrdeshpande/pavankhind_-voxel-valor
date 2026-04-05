
import type { GameConfig } from './GameConfig';

export interface DailyModifier {
  id: string;
  name: string;
  nameMr: string;
  desc: string;
  descMr: string;
  apply: (config: GameConfig) => GameConfig;
}

const MODIFIERS: DailyModifier[] = [
  {
    id: 'archers_only',
    name: 'Archers Only',
    nameMr: 'केवळ धनुर्धर',
    desc: 'All enemies are archers. Dodge or die.',
    descMr: 'सर्व शत्रू धनुर्धारी. चुकवा किंवा मरा.',
    apply: (c) => ({ ...c, modeName: c.modeName + ' [Archers]', archersOnly: true }),
  },
  {
    id: 'double_speed',
    name: 'Double Speed',
    nameMr: 'दुप्पट वेग',
    desc: 'Enemies move twice as fast.',
    descMr: 'शत्रू दुप्पट वेगाने हलतात.',
    apply: (c) => ({ ...c, modeName: c.modeName + ' [Speed]', doubleSpeed: true }),
  },
  {
    id: 'no_blocking',
    name: 'No Blocking',
    nameMr: 'ढाल नाही',
    desc: 'Blocking is disabled. Dodge everything.',
    descMr: 'रक्षण अक्षम. सर्व काही चुकवा.',
    apply: (c) => ({ ...c, modeName: c.modeName + ' [No Block]', noBlocking: true }),
  },
  {
    id: 'boss_rush',
    name: 'Boss Rush',
    nameMr: 'सरदार हल्ला',
    desc: 'Mini-bosses spawn frequently.',
    descMr: 'सरदार वारंवार येतात.',
    apply: (c) => ({ ...c, modeName: c.modeName + ' [Boss Rush]', bossRush: true }),
  },
  {
    id: 'fog_of_war',
    name: 'Fog of War',
    nameMr: 'युद्धाचे धुके',
    desc: 'Dense fog — enemies appear suddenly.',
    descMr: 'दाट धुके — शत्रू अचानक येतात.',
    apply: (c) => ({ ...c, modeName: c.modeName + ' [Fog]', fogOfWar: true }),
  },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getDailyModifier(): DailyModifier {
  const seed = new Date().toDateString();
  const idx = hashString(seed) % MODIFIERS.length;
  return MODIFIERS[idx];
}

export function getDailyConfig(): GameConfig {
  const mod = getDailyModifier();
  const base: GameConfig = { duration: 120, startWave: 2, enemyMultiplier: 1.3, modeName: 'Daily' };
  return mod.apply(base);
}

const DAILY_KEY = 'pavankhind_daily';

interface DailyRecord {
  date: string;
  completed: boolean;
  bestScore: number;
}

function loadDailyRecord(): DailyRecord | null {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (raw) return JSON.parse(raw) as DailyRecord;
  } catch { /* corrupt */ }
  return null;
}

function saveDailyRecord(record: DailyRecord) {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(record));
  } catch { /* full */ }
}

export function isDailyCompleted(): boolean {
  const record = loadDailyRecord();
  if (!record) return false;
  return record.date === new Date().toDateString() && record.completed;
}

export function getDailyBest(): number {
  const record = loadDailyRecord();
  if (!record || record.date !== new Date().toDateString()) return 0;
  return record.bestScore;
}

export function completeDailyChallenge(score: number): { bonusCoins: number; newBest: boolean } {
  const today = new Date().toDateString();
  const record = loadDailyRecord();
  const prevBest = (record && record.date === today) ? record.bestScore : 0;
  const newBest = score > prevBest;
  const isFirstCompletion = !record || record.date !== today || !record.completed;
  const bonusCoins = isFirstCompletion ? 15 : 5;

  saveDailyRecord({
    date: today,
    completed: true,
    bestScore: Math.max(score, prevBest),
  });

  return { bonusCoins, newBest };
}
