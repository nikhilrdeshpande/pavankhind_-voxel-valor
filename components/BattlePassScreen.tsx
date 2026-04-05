
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
              <div className="text-xs uppercase tracking-[0.5em] text-orange-200/70">Battle Pass</div>
              <div className="mt-1 text-sm font-bold text-orange-100">
                Season: {seasonName}
              </div>
              <div className="mt-1 text-xs text-orange-200/50">
                {bpState.seasonKills} kills this season
              </div>
              {/* Overall progress bar */}
              <div className="mt-2 w-48 h-2 bg-black/50 rounded-full overflow-hidden border border-orange-500/20">
                <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all" style={{
                  width: `${Math.min(100, (bpState.seasonKills / (BATTLE_PASS_TIERS[BATTLE_PASS_TIERS.length - 1]?.killsRequired || 1)) * 100)}%`,
                }} />
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-orange-500 text-orange-200 hover:bg-orange-500 hover:text-black transition-all font-bold uppercase tracking-widest text-xs"
            >
              Back
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
                  className={`flex items-center justify-between border p-3 transition-all ${
                    claimed
                      ? 'border-green-700/40 bg-green-900/10 text-green-200/60'
                      : reached
                        ? 'border-yellow-500/60 bg-yellow-900/10 text-yellow-100'
                        : 'border-orange-500/20 bg-black/20 text-orange-200/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center text-xs font-black rounded-full" style={{
                      background: claimed ? 'linear-gradient(135deg, #16a34a, #22c55e)' : reached ? 'linear-gradient(135deg, #ca8a04, #eab308)' : 'rgba(75,85,99,0.3)',
                      color: claimed || reached ? '#000' : '#6b7280',
                      border: canClaim ? '2px solid #eab308' : 'none',
                      animation: canClaim ? 'daily-glow 1.5s ease-in-out infinite' : 'none',
                      boxShadow: claimed ? '0 0 6px rgba(34,197,94,0.3)' : reached ? '0 0 6px rgba(234,179,8,0.3)' : 'none',
                    }}>
                      {tier.tier}
                    </div>
                    <div>
                      <div className="text-sm font-bold">
                        <span className="mr-1">{tier.reward.type === 'coins' ? '●' : '◆'}</span>
                        {lang === 'mr' ? tier.reward.nameMr : tier.reward.name}
                      </div>
                      <div className="text-[10px] opacity-50">{tier.killsRequired} kills</div>
                    </div>
                  </div>
                  <div>
                    {claimed && <span className="text-[10px] uppercase tracking-widest text-green-400">Claimed</span>}
                    {canClaim && (
                      <button
                        onClick={() => handleClaim(tier.tier)}
                        className="px-3 py-1 text-[10px] uppercase tracking-widest font-bold border border-yellow-500 text-yellow-200 hover:bg-yellow-500 hover:text-black"
                      >
                        Claim
                      </button>
                    )}
                    {!reached && (
                      <span className="text-[10px] opacity-40">{tier.killsRequired - bpState.seasonKills} to go</span>
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
