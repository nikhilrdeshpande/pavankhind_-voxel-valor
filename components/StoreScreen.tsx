
import React, { useState } from 'react';
import {
  SWORD_SKINS, ANGARKHA_SKINS,
  loadCosmeticState, buySword, buyAngarkha, equipSword, equipAngarkha,
} from '../game/Cosmetics';
import type { CosmeticState } from '../game/Cosmetics';
import { loadProfile, saveProfile } from '../game/Progression';
import type { PlayerProfile } from '../game/Progression';
import type { Strings } from '../localization/strings';
import type { Lang } from '../localization/strings';

interface StoreScreenProps {
  t: Strings;
  lang: Lang;
  profile: PlayerProfile;
  onProfileUpdate: (p: PlayerProfile) => void;
  onClose: () => void;
}

const StoreScreen: React.FC<StoreScreenProps> = ({ t, lang, profile, onProfileUpdate, onClose }) => {
  const [cosState, setCosState] = useState<CosmeticState>(loadCosmeticState);
  const [tab, setTab] = useState<'swords' | 'angarkha'>('swords');

  const handleBuySword = (id: string) => {
    const result = buySword(id, { ...cosState }, profile.currency);
    if (result.success) {
      profile.currency -= result.cost;
      saveProfile(profile);
      onProfileUpdate({ ...profile });
      setCosState(loadCosmeticState());
    }
  };

  const handleBuyAngarkha = (id: string) => {
    const result = buyAngarkha(id, { ...cosState }, profile.currency);
    if (result.success) {
      profile.currency -= result.cost;
      saveProfile(profile);
      onProfileUpdate({ ...profile });
      setCosState(loadCosmeticState());
    }
  };

  const handleEquipSword = (id: string) => {
    const s = { ...cosState };
    equipSword(id, s);
    setCosState(s);
  };

  const handleEquipAngarkha = (id: string) => {
    const s = { ...cosState };
    equipAngarkha(id, s);
    setCosState(s);
  };

  return (
    <div className="absolute inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 intro-backdrop opacity-95 pointer-events-none" />
      <div className="relative flex h-full w-full flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl border-2 border-orange-900/60 bg-zinc-900/90 p-8 shadow-[0_0_60px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.5em] text-orange-200/70">Armory</div>
              <div className="mt-1 text-xs uppercase tracking-[0.3em] text-orange-200/50">
                {profile.currency} {t.scorecard.coins}
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-orange-500 text-orange-200 hover:bg-orange-500 hover:text-black transition-all font-bold uppercase tracking-widest text-xs"
            >
              Back
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setTab('swords')}
              className={`px-4 py-2 text-xs uppercase tracking-widest font-bold transition-all ${
                tab === 'swords' ? 'bg-orange-500 text-black' : 'border border-orange-500/50 text-orange-200'
              }`}
            >
              Swords
            </button>
            <button
              onClick={() => setTab('angarkha')}
              className={`px-4 py-2 text-xs uppercase tracking-widest font-bold transition-all ${
                tab === 'angarkha' ? 'bg-orange-500 text-black' : 'border border-orange-500/50 text-orange-200'
              }`}
            >
              Angarkha
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 max-h-[50vh] overflow-y-auto">
            {tab === 'swords' && SWORD_SKINS.map(skin => {
              const owned = cosState.ownedSwords.includes(skin.id);
              const equipped = cosState.equippedSword === skin.id;
              return (
                <div
                  key={skin.id}
                  className={`p-5 transition-all rounded-sm ${
                    equipped ? '' : ''
                  }`}
                  style={{
                    border: equipped ? '2px solid rgba(234,179,8,0.6)' : '1px solid rgba(249,115,22,0.2)',
                    background: equipped
                      ? 'linear-gradient(135deg, rgba(234,179,8,0.1) 0%, rgba(0,0,0,0.4) 100%)'
                      : skin.cost >= 200
                        ? 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(0,0,0,0.4) 100%)'
                        : skin.cost >= 100
                          ? 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(0,0,0,0.4) 100%)'
                          : 'linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 100%)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-sm"
                      style={{
                        backgroundColor: `#${skin.bladeColor.toString(16).padStart(6, '0')}`,
                        boxShadow: `0 0 8px #${skin.bladeColor.toString(16).padStart(6, '0')}40`,
                      }}
                    />
                    <div>
                      <div className="text-sm font-bold text-orange-100">
                        {lang === 'mr' ? skin.nameMr : skin.name}
                      </div>
                      {!owned && <div className="text-[10px] text-orange-200/50">● {skin.cost} coins</div>}
                      {equipped && <div className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest">EQUIPPED</div>}
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    {!owned && (
                      <button
                        onClick={() => handleBuySword(skin.id)}
                        disabled={profile.currency < skin.cost}
                        className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold ${
                          profile.currency >= skin.cost
                            ? 'border border-yellow-500 text-yellow-200 hover:bg-yellow-500 hover:text-black'
                            : 'border border-gray-600 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Buy
                      </button>
                    )}
                    {owned && !equipped && (
                      <button
                        onClick={() => handleEquipSword(skin.id)}
                        className="px-3 py-1 text-[10px] uppercase tracking-widest font-bold border border-orange-500 text-orange-200 hover:bg-orange-500 hover:text-black"
                      >
                        Equip
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {tab === 'angarkha' && ANGARKHA_SKINS.map(skin => {
              const owned = cosState.ownedAngarkhas.includes(skin.id);
              const equipped = cosState.equippedAngarkha === skin.id;
              return (
                <div
                  key={skin.id}
                  className={`p-5 transition-all rounded-sm`}
                  style={{
                    border: equipped ? '2px solid rgba(234,179,8,0.6)' : '1px solid rgba(249,115,22,0.2)',
                    background: equipped
                      ? 'linear-gradient(135deg, rgba(234,179,8,0.1) 0%, rgba(0,0,0,0.4) 100%)'
                      : skin.cost >= 200
                        ? 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(0,0,0,0.4) 100%)'
                        : skin.cost >= 100
                          ? 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(0,0,0,0.4) 100%)'
                          : 'linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 100%)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-sm"
                      style={{
                        backgroundColor: `#${skin.torsoColor.toString(16).padStart(6, '0')}`,
                        boxShadow: `0 0 8px #${skin.torsoColor.toString(16).padStart(6, '0')}40`,
                      }}
                    />
                    <div>
                      <div className="text-sm font-bold text-orange-100">
                        {lang === 'mr' ? skin.nameMr : skin.name}
                      </div>
                      {!owned && <div className="text-[10px] text-orange-200/50">● {skin.cost} coins</div>}
                      {equipped && <div className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest">EQUIPPED</div>}
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    {!owned && (
                      <button
                        onClick={() => handleBuyAngarkha(skin.id)}
                        disabled={profile.currency < skin.cost}
                        className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold ${
                          profile.currency >= skin.cost
                            ? 'border border-yellow-500 text-yellow-200 hover:bg-yellow-500 hover:text-black'
                            : 'border border-gray-600 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Buy
                      </button>
                    )}
                    {owned && !equipped && (
                      <button
                        onClick={() => handleEquipAngarkha(skin.id)}
                        className="px-3 py-1 text-[10px] uppercase tracking-widest font-bold border border-orange-500 text-orange-200 hover:bg-orange-500 hover:text-black"
                      >
                        Equip
                      </button>
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

export default StoreScreen;
