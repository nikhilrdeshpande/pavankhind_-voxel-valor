
import React, { useState } from 'react';
import {
  BATTLE_PASS_TIERS, SEASON_NAME, SEASON_NAME_MR,
  loadBattlePassState, claimTier, getClaimableTiers,
} from '../monetization/BattlePass';
import type { BattlePassState } from '../monetization/BattlePass';
import { loadProfile, saveProfile } from '../game/Progression';
import { loadCosmeticState, saveCosmeticState } from '../game/Cosmetics';
import type { PlayerProfile } from '../game/Progression';
import type { Strings } from '../localization/strings';
import type { Lang } from '../localization/strings';

interface BattlePassScreenProps {
  t: Strings;
  lang: Lang;
  profile: PlayerProfile;
  onProfileUpdate: (p: PlayerProfile) => void;
  onClose: () => void;
}

const BattlePassScreen: React.FC<BattlePassScreenProps> = ({ t, lang, profile, onProfileUpdate, onClose }) => {
  const [bpState, setBpState] = useState<BattlePassState>(loadBattlePassState);
  const claimable = getClaimableTiers(bpState);

  const handleClaim = (tier: number) => {
    const state = { ...bpState };
    const reward = claimTier(state, tier);
    if (!reward) return;

    const p = loadProfile();
    if (reward.type === 'coins' && reward.amount) {
      p.currency += reward.amount;
    } else if (reward.type === 'sword_skin' && reward.id) {
      const cos = loadCosmeticState();
      if (!cos.ownedSwords.includes(reward.id)) {
        cos.ownedSwords.push(reward.id);
        saveCosmeticState(cos);
      }
    } else if (reward.type === 'angarkha_skin' && reward.id) {
      const cos = loadCosmeticState();
      if (!cos.ownedAngarkhas.includes(reward.id)) {
        cos.ownedAngarkhas.push(reward.id);
        saveCosmeticState(cos);
      }
    }
    saveProfile(p);
    onProfileUpdate({ ...p });
    setBpState(loadBattlePassState());
  };

  const seasonName = lang === 'mr' ? SEASON_NAME_MR : SEASON_NAME;

  return (
    <div className="absolute inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 intro-backdrop opacity-95 pointer-events-none" />
      <div className="relative flex h-full w-full flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl border-2 border-orange-900/60 bg-zinc-900/90 p-8 shadow-[0_0_60px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.5em] text-orange-200/80 font-bold">★ Battle Pass</div>
              <div className="mt-1 text-base font-bold text-orange-100">
                Season: <span style={{ color: '#fbbf24', textShadow: '0 0 8px rgba(251,191,36,0.3)' }}>{seasonName}</span>
              </div>
              <div className="mt-1 flex items-center gap-3">
                <span className="text-xs text-orange-200/50">{bpState.seasonKills} kills</span>
                <span className="text-xs font-bold" style={{ color: '#fbbf24' }}>
                  {Math.round((bpState.seasonKills / (BATTLE_PASS_TIERS[BATTLE_PASS_TIERS.length - 1]?.killsRequired || 1)) * 100)}% complete
                </span>
              </div>
              <div className="mt-2 w-56 h-3 bg-black/50 rounded-full overflow-hidden" style={{
                border: '1px solid rgba(234,179,8,0.3)',
                boxShadow: '0 0 8px rgba(234,179,8,0.1)',
              }}>
                <div className="h-full rounded-full transition-all" style={{
                  width: `${Math.min(100, (bpState.seasonKills / (BATTLE_PASS_TIERS[BATTLE_PASS_TIERS.length - 1]?.killsRequired || 1)) * 100)}%`,
                  background: 'linear-gradient(90deg, #b45309, #d97706, #fbbf24)',
                  boxShadow: '0 0 6px rgba(251,191,36,0.4)',
                }} />
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-orange-200 hover:bg-orange-500 hover:text-black transition-all font-bold uppercase tracking-widest text-xs rounded-sm"
              style={{ border: '1.5px solid rgba(249,115,22,0.5)', background: 'rgba(0,0,0,0.3)' }}
            >
              ← Back
            </button>
          </div>

          <div className="mt-6 space-y-2 max-h-[55vh] overflow-y-auto">
            {BATTLE_PASS_TIERS.map(tier => {
              const reached = bpState.seasonKills >= tier.killsRequired;
              const claimed = bpState.claimedTiers.includes(tier.tier);
              const canClaim = reached && !claimed;
              return (
                <div
                  key={tier.tier}
                  className="flex items-center justify-between p-3 transition-all rounded-sm"
                  style={{
                    border: claimed ? '1.5px solid rgba(34,197,94,0.4)' : canClaim ? '1.5px solid rgba(234,179,8,0.6)' : reached ? '1.5px solid rgba(234,179,8,0.3)' : '1px solid rgba(249,115,22,0.15)',
                    background: claimed
                      ? 'linear-gradient(135deg, rgba(22,101,52,0.12) 0%, rgba(0,0,0,0.3) 100%)'
                      : canClaim
                        ? 'linear-gradient(135deg, rgba(120,80,0,0.15) 0%, rgba(0,0,0,0.3) 100%)'
                        : reached
                          ? 'linear-gradient(135deg, rgba(80,53,0,0.08) 0%, rgba(0,0,0,0.3) 100%)'
                          : 'rgba(0,0,0,0.2)',
                    boxShadow: canClaim ? '0 0 12px rgba(234,179,8,0.1)' : 'none',
                    animation: canClaim ? 'daily-glow 1.5s ease-in-out infinite' : 'none',
                    opacity: !reached ? 0.5 : 1,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center text-sm font-black rounded-full flex-shrink-0" style={{
                      background: claimed ? 'linear-gradient(135deg, #16a34a, #22c55e)' : reached ? 'linear-gradient(135deg, #ca8a04, #eab308)' : 'rgba(75,85,99,0.3)',
                      color: claimed || reached ? '#000' : '#6b7280',
                      boxShadow: claimed ? '0 0 10px rgba(34,197,94,0.3)' : reached ? '0 0 10px rgba(234,179,8,0.3)' : 'none',
                    }}>
                      {claimed ? '✓' : tier.tier}
                    </div>
                    <div>
                      <div className="text-base font-bold" style={{ color: claimed ? '#86efac' : reached ? '#fde68a' : '#9ca3af' }}>
                        <span className="mr-1.5">{tier.reward.type === 'coins' ? '🪙' : tier.reward.type === 'sword_skin' ? '⚔' : '👘'}</span>
                        {lang === 'mr' ? tier.reward.nameMr : tier.reward.name}
                      </div>
                      <div className="text-[10px] opacity-50">{tier.killsRequired} kills</div>
                    </div>
                  </div>
                  <div>
                    {claimed && (
                      <span className="px-2 py-1 rounded text-[10px] uppercase tracking-widest font-bold bg-green-800/30 text-green-400 border border-green-600/30">
                        ✓ Claimed
                      </span>
                    )}
                    {canClaim && (
                      <button
                        onClick={() => handleClaim(tier.tier)}
                        className="px-4 py-1.5 text-xs uppercase tracking-widest font-bold rounded-sm transition-all"
                        style={{
                          background: 'linear-gradient(135deg, #b45309, #d97706)',
                          color: '#fef3c7',
                          border: '1px solid rgba(251,191,36,0.4)',
                          boxShadow: '0 0 10px rgba(217,119,6,0.3)',
                        }}
                      >
                        Claim
                      </button>
                    )}
                    {!reached && (
                      <span className="text-xs opacity-40 flex items-center gap-1">
                        🔒 {tier.killsRequired - bpState.seasonKills} to go
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BattlePassScreen;
