
const STORAGE_KEY = 'pavankhind_cosmetics';

export interface SwordSkin {
  id: string;
  name: string;
  nameMr: string;
  bladeColor: number;
  guardColor: number;
  emissive?: number;
  cost: number;
}

export interface AngarkhaSkin {
  id: string;
  name: string;
  nameMr: string;
  torsoColor: number;
  sashColor: number;
  cost: number;
}

export const SWORD_SKINS: SwordSkin[] = [
  { id: 'default', name: 'Steel Blade', nameMr: 'पोलादी तलवार', bladeColor: 0xeeeeee, guardColor: 0xd4a017, cost: 0 },
  { id: 'bhavani', name: 'Bhavani Talwar', nameMr: 'भवानी तलवार', bladeColor: 0xffd700, guardColor: 0xff6600, emissive: 0x332200, cost: 50 },
  { id: 'wagh_nakh', name: 'Wagh Nakh', nameMr: 'वाघनख', bladeColor: 0xc0c0c0, guardColor: 0x8b4513, cost: 80 },
  { id: 'patta', name: 'Patta', nameMr: 'पट्टा', bladeColor: 0xb8b8d0, guardColor: 0x4a4a6a, emissive: 0x0a0a1a, cost: 120 },
  { id: 'flame', name: 'Flame Edge', nameMr: 'अग्नी धार', bladeColor: 0xff4400, guardColor: 0xcc2200, emissive: 0x441100, cost: 200 },
];

export const ANGARKHA_SKINS: AngarkhaSkin[] = [
  { id: 'default', name: 'Classic', nameMr: 'पारंपरिक', torsoColor: 0xceb79a, sashColor: 0x7f1d1d, cost: 0 },
  { id: 'saffron', name: 'Saffron Warrior', nameMr: 'भगवा योद्धा', torsoColor: 0xe87722, sashColor: 0x8b2500, cost: 40 },
  { id: 'royal', name: 'Royal Blue', nameMr: 'राजनीळा', torsoColor: 0x2a4a8a, sashColor: 0x1a2a5a, cost: 60 },
  { id: 'forest', name: 'Forest Green', nameMr: 'वनहिरवा', torsoColor: 0x3a6a3a, sashColor: 0x1a3a1a, cost: 60 },
  { id: 'night', name: 'Night Shadow', nameMr: 'रात्रीची छाया', torsoColor: 0x1a1a2a, sashColor: 0x0a0a1a, cost: 100 },
];

export type LeftHandType = 'sword' | 'shield';

export interface ShieldSkin {
  id: string;
  name: string;
  nameMr: string;
  faceColor: number;
  rimColor: number;
  emblemColor: number;
  cost: number;
}

export const SHIELD_SKINS: ShieldSkin[] = [
  { id: 'maratha_dhal', name: 'Maratha Dhal', nameMr: 'मराठा ढाल', faceColor: 0x8b4513, rimColor: 0xd4a017, emblemColor: 0xff6600, cost: 0 },
  { id: 'iron_buckler', name: 'Iron Buckler', nameMr: 'लोखंडी ढाल', faceColor: 0x555555, rimColor: 0x888888, emblemColor: 0xcccccc, cost: 90 },
  { id: 'royal_guard', name: 'Royal Guard', nameMr: 'राजरक्षक ढाल', faceColor: 0x1a2a6a, rimColor: 0xd4a017, emblemColor: 0xffd700, cost: 150 },
];

export interface CosmeticState {
  ownedSwords: string[];
  ownedAngarkhas: string[];
  ownedShields: string[];
  equippedSword: string;
  equippedAngarkha: string;
  equippedLeftHand: LeftHandType;
  equippedShield: string;
}

const DEFAULT_STATE: CosmeticState = {
  ownedSwords: ['default'],
  ownedAngarkhas: ['default'],
  ownedShields: ['maratha_dhal'],
  equippedSword: 'default',
  equippedAngarkha: 'default',
  equippedLeftHand: 'shield' as LeftHandType,
  equippedShield: 'maratha_dhal',
};

export function loadCosmeticState(): CosmeticState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CosmeticState>;
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch { /* corrupt */ }
  return { ...DEFAULT_STATE };
}

export function saveCosmeticState(state: CosmeticState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* full */ }
}

export function buySword(swordId: string, state: CosmeticState, currency: number): { success: boolean; cost: number } {
  const skin = SWORD_SKINS.find(s => s.id === swordId);
  if (!skin || state.ownedSwords.includes(swordId)) return { success: false, cost: 0 };
  if (currency < skin.cost) return { success: false, cost: skin.cost };
  state.ownedSwords.push(swordId);
  saveCosmeticState(state);
  return { success: true, cost: skin.cost };
}

export function buyAngarkha(angarkhaId: string, state: CosmeticState, currency: number): { success: boolean; cost: number } {
  const skin = ANGARKHA_SKINS.find(s => s.id === angarkhaId);
  if (!skin || state.ownedAngarkhas.includes(angarkhaId)) return { success: false, cost: 0 };
  if (currency < skin.cost) return { success: false, cost: skin.cost };
  state.ownedAngarkhas.push(angarkhaId);
  saveCosmeticState(state);
  return { success: true, cost: skin.cost };
}

export function equipSword(swordId: string, state: CosmeticState) {
  if (state.ownedSwords.includes(swordId)) {
    state.equippedSword = swordId;
    saveCosmeticState(state);
  }
}

export function equipAngarkha(angarkhaId: string, state: CosmeticState) {
  if (state.ownedAngarkhas.includes(angarkhaId)) {
    state.equippedAngarkha = angarkhaId;
    saveCosmeticState(state);
  }
}

export function buyShield(shieldId: string, state: CosmeticState, currency: number): { success: boolean; cost: number } {
  const skin = SHIELD_SKINS.find(s => s.id === shieldId);
  if (!skin || state.ownedShields.includes(shieldId)) return { success: false, cost: 0 };
  if (currency < skin.cost) return { success: false, cost: skin.cost };
  state.ownedShields.push(shieldId);
  saveCosmeticState(state);
  return { success: true, cost: skin.cost };
}

export function equipShield(shieldId: string, state: CosmeticState) {
  if (state.ownedShields.includes(shieldId)) {
    state.equippedShield = shieldId;
    state.equippedLeftHand = 'shield';
    saveCosmeticState(state);
  }
}

export function equipLeftSword(state: CosmeticState) {
  state.equippedLeftHand = 'sword';
  saveCosmeticState(state);
}

export function getEquippedSwordSkin(state: CosmeticState): SwordSkin {
  return SWORD_SKINS.find(s => s.id === state.equippedSword) ?? SWORD_SKINS[0];
}

export function getEquippedAngarkhaSkin(state: CosmeticState): AngarkhaSkin {
  return ANGARKHA_SKINS.find(s => s.id === state.equippedAngarkha) ?? ANGARKHA_SKINS[0];
}

export function getEquippedShieldSkin(state: CosmeticState): ShieldSkin | null {
  if (state.equippedLeftHand !== 'shield') return null;
  return SHIELD_SKINS.find(s => s.id === state.equippedShield) ?? null;
}
