
const STORAGE_KEY = 'pavankhind_battlepass';

export interface BattlePassTier {
  tier: number;
  killsRequired: number;
  reward: BattlePassReward;
}

export interface BattlePassReward {
  type: 'coins' | 'sword_skin' | 'angarkha_skin';
  id?: string;
  amount?: number;
  name: string;
  nameMr: string;
}

export const SEASON_NAME = 'Pavankhind';
export const SEASON_NAME_MR = 'पावनखिंड';

// Tuned to real kill rates (~25 kills per Skirmish run): tier 10 lands
// around 15-18 runs instead of the old 750-kill grind.
export const BATTLE_PASS_TIERS: BattlePassTier[] = [
  { tier: 1, killsRequired: 10, reward: { type: 'coins', amount: 15, name: '15 Coins', nameMr: '१५ नाणी' } },
  { tier: 2, killsRequired: 25, reward: { type: 'coins', amount: 25, name: '25 Coins', nameMr: '२५ नाणी' } },
  { tier: 3, killsRequired: 45, reward: { type: 'sword_skin', id: 'bhavani', name: 'Bhavani Talwar', nameMr: 'भवानी तलवार' } },
  { tier: 4, killsRequired: 70, reward: { type: 'coins', amount: 30, name: '30 Coins', nameMr: '३० नाणी' } },
  { tier: 5, killsRequired: 100, reward: { type: 'angarkha_skin', id: 'saffron', name: 'Saffron Warrior', nameMr: 'भगवा योद्धा' } },
  { tier: 6, killsRequired: 140, reward: { type: 'coins', amount: 40, name: '40 Coins', nameMr: '४० नाणी' } },
  { tier: 7, killsRequired: 190, reward: { type: 'sword_skin', id: 'wagh_nakh', name: 'Wagh Nakh', nameMr: 'वाघनख' } },
  { tier: 8, killsRequired: 250, reward: { type: 'coins', amount: 50, name: '50 Coins', nameMr: '५० नाणी' } },
  { tier: 9, killsRequired: 320, reward: { type: 'angarkha_skin', id: 'forest', name: 'Forest Green', nameMr: 'वनहिरवा' } },
  { tier: 10, killsRequired: 400, reward: { type: 'coins', amount: 100, name: '100 Coins', nameMr: '१०० नाणी' } },
];

export interface BattlePassState {
  seasonKills: number;
  claimedTiers: number[];
}

const DEFAULT_STATE: BattlePassState = {
  seasonKills: 0,
  claimedTiers: [],
};

export function loadBattlePassState(): BattlePassState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BattlePassState>;
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch { /* corrupt */ }
  return { ...DEFAULT_STATE };
}

export function saveBattlePassState(state: BattlePassState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* full */ }
}

export function addSeasonKills(kills: number): BattlePassState {
  const state = loadBattlePassState();
  state.seasonKills += kills;
  saveBattlePassState(state);
  return state;
}

export function getClaimableTiers(state: BattlePassState): BattlePassTier[] {
  return BATTLE_PASS_TIERS.filter(
    tier => state.seasonKills >= tier.killsRequired && !state.claimedTiers.includes(tier.tier)
  );
}

export function claimTier(state: BattlePassState, tier: number): BattlePassReward | null {
  const tierData = BATTLE_PASS_TIERS.find(t => t.tier === tier);
  if (!tierData) return null;
  if (state.seasonKills < tierData.killsRequired) return null;
  if (state.claimedTiers.includes(tier)) return null;

  state.claimedTiers.push(tier);
  saveBattlePassState(state);
  return tierData.reward;
}

export function getCurrentTier(state: BattlePassState): number {
  let current = 0;
  for (const tier of BATTLE_PASS_TIERS) {
    if (state.seasonKills >= tier.killsRequired) current = tier.tier;
  }
  return current;
}

export function getNextTier(state: BattlePassState): BattlePassTier | null {
  for (const tier of BATTLE_PASS_TIERS) {
    if (state.seasonKills < tier.killsRequired) return tier;
  }
  return null;
}
