
import React, { useState } from 'react';
import { Panel } from './ui/Panel';
import {
  SWORD_SKINS, ANGARKHA_SKINS, SHIELD_SKINS,
  loadCosmeticState, buySword, buyAngarkha, buyShield,
  equipSword, equipAngarkha, equipShield, equipLeftSword,
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

function getRarityStyle(cost: number) {
  if (cost >= 200) return { border: '1.5px solid rgba(249,115,22,0.6)', boxShadow: '0 0 16px rgba(249,115,22,0.15)', bg: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(0,0,0,0.4) 100%)' };
  if (cost >= 120) return { border: '1.5px solid rgba(168,85,247,0.5)', boxShadow: '0 0 16px rgba(168,85,247,0.12)', bg: 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(0,0,0,0.4) 100%)' };
  if (cost >= 80) return { border: '1.5px solid rgba(59,130,246,0.5)', boxShadow: '0 0 16px rgba(59,130,246,0.12)', bg: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(0,0,0,0.4) 100%)' };
  return { border: '1px solid rgba(249,115,22,0.2)', boxShadow: 'none', bg: 'linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 100%)' };
}

const StoreScreen: React.FC<StoreScreenProps> = ({ t, lang, profile, onProfileUpdate, onClose }) => {
  const [cosState, setCosState] = useState<CosmeticState>(loadCosmeticState);
  const [tab, setTab] = useState<'swords' | 'angarkha' | 'shields'>('swords');

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

  const handleBuyShield = (id: string) => {
    const result = buyShield(id, { ...cosState }, profile.currency);
    if (result.success) {
      profile.currency -= result.cost;
      saveProfile(profile);
      onProfileUpdate({ ...profile });
      setCosState(loadCosmeticState());
    }
  };

  const handleEquipShield = (id: string) => {
    const s = { ...cosState };
    equipShield(id, s);
    setCosState(s);
  };

  const handleEquipDualSword = () => {
    const s = { ...cosState };
    equipLeftSword(s);
    setCosState(s);
  };

  return (
    <div className="absolute inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 intro-backdrop opacity-95 pointer-events-none" />
      <div className="relative flex h-full w-full flex-col items-center justify-center px-6 py-12">
        <Panel accent="amber" className="w-full max-w-3xl p-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.5em] text-orange-200/80 font-bold">⚔ {t.ui.armory}</div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-block w-3.5 h-3.5 rounded-full" style={{
                  background: 'linear-gradient(135deg, #d97706, #fbbf24)',
                  boxShadow: '0 0 6px rgba(251,191,36,0.4)',
                }} />
                <span className="text-sm font-bold text-yellow-300">{profile.currency}</span>
                <span className="text-[10px] text-orange-200/40 uppercase tracking-wider">{t.scorecard.coins}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-orange-200 hover:bg-orange-500 hover:text-black transition-all btn-juice font-bold uppercase tracking-widest text-xs rounded-sm"
              style={{ border: '1.5px solid rgba(249,115,22,0.5)', background: 'rgba(0,0,0,0.3)' }}
            >
              ← Back
            </button>
          </div>

          <div className="mt-4 flex gap-1">
            <button
              onClick={() => setTab('swords')}
              className="px-5 py-2.5 text-xs uppercase tracking-widest font-bold transition-all rounded-t-sm"
              style={{
                background: tab === 'swords' ? 'linear-gradient(180deg, rgba(249,115,22,0.3), transparent)' : 'transparent',
                borderBottom: tab === 'swords' ? '2px solid #f97316' : '2px solid transparent',
                color: tab === 'swords' ? '#fdba74' : 'rgba(253,186,116,0.4)',
              }}
            >
              ⚔ Swords
            </button>
            <button
              onClick={() => setTab('angarkha')}
              className="px-5 py-2.5 text-xs uppercase tracking-widest font-bold transition-all rounded-t-sm"
              style={{
                background: tab === 'angarkha' ? 'linear-gradient(180deg, rgba(249,115,22,0.3), transparent)' : 'transparent',
                borderBottom: tab === 'angarkha' ? '2px solid #f97316' : '2px solid transparent',
                color: tab === 'angarkha' ? '#fdba74' : 'rgba(253,186,116,0.4)',
              }}
            >
              👘 Angarkha
            </button>
            <button
              onClick={() => setTab('shields')}
              className="px-5 py-2.5 text-xs uppercase tracking-widest font-bold transition-all rounded-t-sm"
              style={{
                background: tab === 'shields' ? 'linear-gradient(180deg, rgba(249,115,22,0.3), transparent)' : 'transparent',
                borderBottom: tab === 'shields' ? '2px solid #f97316' : '2px solid transparent',
                color: tab === 'shields' ? '#fdba74' : 'rgba(253,186,116,0.4)',
              }}
            >
              🛡 Shields
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 max-h-[50vh] overflow-y-auto">
            {tab === 'swords' && SWORD_SKINS.map(skin => {
              const owned = cosState.ownedSwords.includes(skin.id);
              const equipped = cosState.equippedSword === skin.id;
              const rarity = getRarityStyle(skin.cost);
              const colorHex = `#${skin.bladeColor.toString(16).padStart(6, '0')}`;
              return (
                <div
                  key={skin.id}
                  className="p-4 transition-all rounded-sm hover:translate-y-[-2px]"
                  style={{
                    border: equipped ? '2px solid rgba(234,179,8,0.6)' : rarity.border,
                    background: equipped ? 'linear-gradient(135deg, rgba(234,179,8,0.1) 0%, rgba(0,0,0,0.4) 100%)' : rarity.bg,
                    boxShadow: equipped ? '0 0 20px rgba(234,179,8,0.15)' : rarity.boxShadow,
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-sm flex-shrink-0"
                      style={{
                        backgroundColor: colorHex,
                        boxShadow: `0 0 16px ${colorHex}50, inset 0 0 20px rgba(255,255,255,0.1)`,
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    />
                    <div className="flex-1">
                      <div className="text-base font-bold text-orange-100">
                        {lang === 'mr' ? skin.nameMr : skin.name}
                      </div>
                      {!owned && (
                        <div className="mt-0.5 flex items-center gap-1">
                          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: 'linear-gradient(135deg, #d97706, #fbbf24)' }} />
                          <span className="text-xs text-yellow-300 font-bold">{skin.cost}</span>
                        </div>
                      )}
                      {equipped && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-green-400 font-bold uppercase tracking-widest">
                          <span>✓</span> Equipped
                        </div>
                      )}
                    </div>
                    <div>
                      {!owned && (
                        <button
                          onClick={() => handleBuySword(skin.id)}
                          disabled={profile.currency < skin.cost}
                          className="px-4 py-1.5 text-[11px] uppercase tracking-widest font-bold rounded-sm transition-all"
                          style={profile.currency >= skin.cost ? {
                            background: 'linear-gradient(135deg, #b45309, #d97706)',
                            color: '#fef3c7',
                            border: '1px solid rgba(251,191,36,0.4)',
                            boxShadow: '0 0 8px rgba(217,119,6,0.2)',
                          } : {
                            background: 'rgba(75,85,99,0.2)',
                            color: '#6b7280',
                            border: '1px solid rgba(75,85,99,0.3)',
                          }}
                        >
                          Buy
                        </button>
                      )}
                      {owned && !equipped && (
                        <button
                          onClick={() => handleEquipSword(skin.id)}
                          className="px-4 py-1.5 text-[11px] uppercase tracking-widest font-bold rounded-sm transition-all"
                          style={{
                            border: '1px solid rgba(249,115,22,0.5)',
                            color: '#fdba74',
                            background: 'rgba(249,115,22,0.1)',
                          }}
                        >
                          Equip
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {tab === 'angarkha' && ANGARKHA_SKINS.map(skin => {
              const owned = cosState.ownedAngarkhas.includes(skin.id);
              const equipped = cosState.equippedAngarkha === skin.id;
              const rarity = getRarityStyle(skin.cost);
              const colorHex = `#${skin.torsoColor.toString(16).padStart(6, '0')}`;
              return (
                <div
                  key={skin.id}
                  className="p-4 transition-all rounded-sm hover:translate-y-[-2px]"
                  style={{
                    border: equipped ? '2px solid rgba(234,179,8,0.6)' : rarity.border,
                    background: equipped ? 'linear-gradient(135deg, rgba(234,179,8,0.1) 0%, rgba(0,0,0,0.4) 100%)' : rarity.bg,
                    boxShadow: equipped ? '0 0 20px rgba(234,179,8,0.15)' : rarity.boxShadow,
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-sm flex-shrink-0"
                      style={{
                        backgroundColor: colorHex,
                        boxShadow: `0 0 16px ${colorHex}50, inset 0 0 20px rgba(255,255,255,0.1)`,
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    />
                    <div className="flex-1">
                      <div className="text-base font-bold text-orange-100">
                        {lang === 'mr' ? skin.nameMr : skin.name}
                      </div>
                      {!owned && (
                        <div className="mt-0.5 flex items-center gap-1">
                          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: 'linear-gradient(135deg, #d97706, #fbbf24)' }} />
                          <span className="text-xs text-yellow-300 font-bold">{skin.cost}</span>
                        </div>
                      )}
                      {equipped && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-green-400 font-bold uppercase tracking-widest">
                          <span>✓</span> Equipped
                        </div>
                      )}
                    </div>
                    <div>
                      {!owned && (
                        <button
                          onClick={() => handleBuyAngarkha(skin.id)}
                          disabled={profile.currency < skin.cost}
                          className="px-4 py-1.5 text-[11px] uppercase tracking-widest font-bold rounded-sm transition-all"
                          style={profile.currency >= skin.cost ? {
                            background: 'linear-gradient(135deg, #b45309, #d97706)',
                            color: '#fef3c7',
                            border: '1px solid rgba(251,191,36,0.4)',
                            boxShadow: '0 0 8px rgba(217,119,6,0.2)',
                          } : {
                            background: 'rgba(75,85,99,0.2)',
                            color: '#6b7280',
                            border: '1px solid rgba(75,85,99,0.3)',
                          }}
                        >
                          Buy
                        </button>
                      )}
                      {owned && !equipped && (
                        <button
                          onClick={() => handleEquipAngarkha(skin.id)}
                          className="px-4 py-1.5 text-[11px] uppercase tracking-widest font-bold rounded-sm transition-all"
                          style={{
                            border: '1px solid rgba(249,115,22,0.5)',
                            color: '#fdba74',
                            background: 'rgba(249,115,22,0.1)',
                          }}
                        >
                          Equip
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {tab === 'shields' && (
              <>
                {/* Dual sword option */}
                <div
                  className="p-4 transition-all rounded-sm hover:translate-y-[-2px]"
                  style={{
                    border: cosState.equippedLeftHand === 'sword' ? '2px solid rgba(234,179,8,0.6)' : '1px solid rgba(249,115,22,0.2)',
                    background: cosState.equippedLeftHand === 'sword' ? 'linear-gradient(135deg, rgba(234,179,8,0.1) 0%, rgba(0,0,0,0.4) 100%)' : 'linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 100%)',
                    boxShadow: cosState.equippedLeftHand === 'sword' ? '0 0 20px rgba(234,179,8,0.15)' : 'none',
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-sm flex-shrink-0 flex items-center justify-center text-2xl" style={{
                      background: 'linear-gradient(135deg, rgba(238,238,238,0.15), rgba(0,0,0,0.3))',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}>⚔</div>
                    <div className="flex-1">
                      <div className="text-base font-bold text-orange-100">{lang === 'mr' ? 'दुहेरी तलवार' : 'Dual Swords'}</div>
                      <div className="mt-0.5 text-xs text-orange-200/50">{lang === 'mr' ? 'मूळ शैली' : 'Default style'}</div>
                      {cosState.equippedLeftHand === 'sword' && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-green-400 font-bold uppercase tracking-widest">
                          <span>✓</span> Equipped
                        </div>
                      )}
                    </div>
                    {cosState.equippedLeftHand !== 'sword' && (
                      <button
                        onClick={handleEquipDualSword}
                        className="px-4 py-1.5 text-[11px] uppercase tracking-widest font-bold rounded-sm transition-all"
                        style={{
                          border: '1px solid rgba(249,115,22,0.5)',
                          color: '#fdba74',
                          background: 'rgba(249,115,22,0.1)',
                        }}
                      >
                        Equip
                      </button>
                    )}
                  </div>
                </div>

                {/* Shield skins */}
                {SHIELD_SKINS.map(skin => {
                  const owned = cosState.ownedShields.includes(skin.id);
                  const equipped = cosState.equippedLeftHand === 'shield' && cosState.equippedShield === skin.id;
                  const rarity = getRarityStyle(skin.cost);
                  const colorHex = `#${skin.faceColor.toString(16).padStart(6, '0')}`;
                  const rimHex = `#${skin.rimColor.toString(16).padStart(6, '0')}`;
                  return (
                    <div
                      key={skin.id}
                      className="p-4 transition-all rounded-sm hover:translate-y-[-2px]"
                      style={{
                        border: equipped ? '2px solid rgba(234,179,8,0.6)' : rarity.border,
                        background: equipped ? 'linear-gradient(135deg, rgba(234,179,8,0.1) 0%, rgba(0,0,0,0.4) 100%)' : rarity.bg,
                        boxShadow: equipped ? '0 0 20px rgba(234,179,8,0.15)' : rarity.boxShadow,
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-14 h-14 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: colorHex,
                            boxShadow: `0 0 16px ${colorHex}50, inset 0 0 12px rgba(255,255,255,0.1)`,
                            border: `3px solid ${rimHex}`,
                          }}
                        />
                        <div className="flex-1">
                          <div className="text-base font-bold text-orange-100">
                            {lang === 'mr' ? skin.nameMr : skin.name}
                          </div>
                          {!owned && (
                            <div className="mt-0.5 flex items-center gap-1">
                              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: 'linear-gradient(135deg, #d97706, #fbbf24)' }} />
                              <span className="text-xs text-yellow-300 font-bold">{skin.cost}</span>
                            </div>
                          )}
                          {equipped && (
                            <div className="mt-0.5 flex items-center gap-1 text-xs text-green-400 font-bold uppercase tracking-widest">
                              <span>✓</span> Equipped
                            </div>
                          )}
                        </div>
                        <div>
                          {!owned && (
                            <button
                              onClick={() => handleBuyShield(skin.id)}
                              disabled={profile.currency < skin.cost}
                              className="px-4 py-1.5 text-[11px] uppercase tracking-widest font-bold rounded-sm transition-all"
                              style={profile.currency >= skin.cost ? {
                                background: 'linear-gradient(135deg, #b45309, #d97706)',
                                color: '#fef3c7',
                                border: '1px solid rgba(251,191,36,0.4)',
                                boxShadow: '0 0 8px rgba(217,119,6,0.2)',
                              } : {
                                background: 'rgba(75,85,99,0.2)',
                                color: '#6b7280',
                                border: '1px solid rgba(75,85,99,0.3)',
                              }}
                            >
                              Buy
                            </button>
                          )}
                          {owned && !equipped && (
                            <button
                              onClick={() => handleEquipShield(skin.id)}
                              className="px-4 py-1.5 text-[11px] uppercase tracking-widest font-bold rounded-sm transition-all"
                              style={{
                                border: '1px solid rgba(249,115,22,0.5)',
                                color: '#fdba74',
                                background: 'rgba(249,115,22,0.1)',
                              }}
                            >
                              Equip
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default StoreScreen;
