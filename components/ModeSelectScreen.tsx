
import React, { useMemo } from 'react';
import { GAME_MODES } from '../game/GameConfig';
import { getRankName, getNextRank } from '../game/Progression';
import type { PlayerProfile } from '../game/Progression';
import type { Strings } from '../localization/strings';
import { getDailyModifier, isDailyCompleted, getDailyBest } from '../game/DailyChallenge';
import type { Lang } from '../localization/strings';

const MODE_KEYS = ['skirmish', 'battle', 'lastStand'] as const;

const MODE_META = {
  skirmish: { color: '#22c55e', icon: '⚔', stars: 1 },
  battle: { color: '#f97316', icon: '🔥', stars: 2 },
  lastStand: { color: '#ef4444', icon: '💀', stars: 3 },
};

interface ModeSelectScreenProps {
  t: Strings;
  lang: Lang;
  profile: PlayerProfile;
  isMobile?: boolean;
  onSelectMode: (key: string) => void;
  onSelectDaily: () => void;
  onOpenStore: () => void;
  onOpenBattlePass: () => void;
}

const ModeSelectScreen: React.FC<ModeSelectScreenProps> = ({ t, lang, profile, isMobile, onSelectMode, onSelectDaily, onOpenStore, onOpenBattlePass }) => {
  const next = getNextRank(profile.totalKills);
  const dailyMod = useMemo(() => getDailyModifier(), []);
  const dailyDone = isDailyCompleted();
  const dailyBest = getDailyBest();
  const rankPct = next ? Math.min(100, ((profile.totalKills % next.threshold) / next.threshold) * 100) : 100;

  const m = isMobile;

  return (
    <div className="absolute inset-0 z-40 overflow-hidden">
      <div className="absolute inset-0 intro-backdrop opacity-90 pointer-events-none" />
      <div className="absolute inset-0 intro-ember-field pointer-events-none" />

      <div className={`relative flex h-full w-full flex-col ${m ? 'px-3 py-2' : 'px-8 py-5'}`}>

        {/* ═══════════════ TOP BAR: Profile Status ═══════════════ */}
        <div className={`flex items-center justify-between ${m ? 'gap-2' : 'gap-6'} w-full max-w-5xl mx-auto`}>

          {/* Rank */}
          <div className="flex items-center gap-2">
            <div className={`${m ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base'} rounded-full flex items-center justify-center font-black`} style={{
              background: 'linear-gradient(135deg, #b45309, #d97706)',
              border: '2px solid rgba(251,191,36,0.5)',
              boxShadow: '0 0 12px rgba(217,119,6,0.3)',
              color: '#451a03',
            }}>
              {profile.totalKills > 500 ? '👑' : profile.totalKills > 200 ? '⚔' : '🛡'}
            </div>
            <div>
              <div className={`${m ? 'text-xs' : 'text-sm'} font-black uppercase tracking-wider text-orange-200`}>
                {getRankName(profile.totalKills)}
              </div>
              {next && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`${m ? 'w-12' : 'w-20'} h-1.5 rounded-full overflow-hidden`} style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(217,119,6,0.2)',
                  }}>
                    <div className="h-full rounded-full" style={{
                      width: `${rankPct}%`,
                      background: 'linear-gradient(90deg, #d97706, #fbbf24)',
                    }} />
                  </div>
                  <span className="text-[9px] text-orange-200/40">→ {next.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <h2 className={`${m ? 'text-lg' : 'text-3xl'} font-black uppercase text-orange-100 font-cinzel`}>
            {t.ui.selectMode}
          </h2>

          {/* Coins */}
          <div className="flex items-center gap-2" style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: '20px',
            padding: m ? '4px 10px' : '6px 14px',
          }}>
            <span className={`${m ? 'w-4 h-4' : 'w-5 h-5'} rounded-full inline-block`} style={{
              background: 'linear-gradient(135deg, #d97706, #fbbf24)',
              boxShadow: '0 0 6px rgba(251,191,36,0.4)',
            }} />
            <span className={`${m ? 'text-sm' : 'text-lg'} font-black text-yellow-300`}>{profile.currency}</span>
          </div>
        </div>

        {/* ═══════════════ CENTER: Mode Cards ═══════════════ */}
        <div className={`flex-1 flex items-center justify-center ${m ? 'mt-2' : 'mt-4'}`}>
          <div className={`w-full max-w-5xl grid grid-cols-3 ${m ? 'gap-2' : 'gap-4'}`}>
            {MODE_KEYS.map((key) => {
              const info = t.modes[key];
              const mode = GAME_MODES[key];
              const unlocked = profile.unlockedModes.includes(key);
              const best = profile.bestScore[key] ?? 0;
              const meta = MODE_META[key];

              return (
                <button
                  key={key}
                  disabled={!unlocked}
                  onClick={() => onSelectMode(key)}
                  className={`relative text-left transition-all rounded-lg overflow-hidden ${m ? 'p-3' : 'p-5'}`}
                  style={{
                    background: unlocked
                      ? `linear-gradient(170deg, ${meta.color}15 0%, rgba(0,0,0,0.6) 60%)`
                      : 'rgba(0,0,0,0.4)',
                    border: unlocked ? `2px solid ${meta.color}60` : '2px solid rgba(75,85,99,0.2)',
                    boxShadow: unlocked ? `0 4px 24px ${meta.color}20, inset 0 1px 0 ${meta.color}15` : 'none',
                    opacity: unlocked ? 1 : 0.45,
                    cursor: unlocked ? 'pointer' : 'not-allowed',
                  }}
                >
                  {/* Color accent bar */}
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: meta.color }} />

                  {/* Icon + Name */}
                  <div className="flex items-center gap-2">
                    <span className={`${m ? 'text-2xl' : 'text-3xl'}`}>{meta.icon}</span>
                    <div>
                      <div className={`${m ? 'text-sm' : 'text-xl'} font-black uppercase tracking-wide text-white`}>
                        {info.name}
                      </div>
                      {/* Stars */}
                      <div className="flex gap-0.5 mt-0.5">
                        {[1, 2, 3].map(s => (
                          <span key={s} className="text-xs" style={{ color: s <= meta.stars ? meta.color : 'rgba(255,255,255,0.12)' }}>★</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Info pills */}
                  <div className={`${m ? 'mt-2' : 'mt-3'} flex gap-1.5 flex-wrap`}>
                    <span className={`${m ? 'text-[9px]' : 'text-[11px]'} px-2 py-0.5 rounded-full font-bold`} style={{
                      background: `${meta.color}18`,
                      color: meta.color,
                      border: `1px solid ${meta.color}30`,
                    }}>
                      ⏱ {mode.duration}s
                    </span>
                    <span className={`${m ? 'text-[9px]' : 'text-[11px]'} px-2 py-0.5 rounded-full font-bold`} style={{
                      background: `${meta.color}18`,
                      color: meta.color,
                      border: `1px solid ${meta.color}30`,
                    }}>
                      ⚡ Wave {mode.startWave}+
                    </span>
                  </div>

                  {/* Description */}
                  <div className={`${m ? 'mt-1.5 text-[10px]' : 'mt-2.5 text-sm'} text-orange-100/50 leading-snug`}>
                    {info.desc}
                  </div>

                  {/* Best score */}
                  {unlocked && best > 0 && (
                    <div className={`${m ? 'mt-2 text-xs' : 'mt-3 text-sm'} font-bold flex items-center gap-1`} style={{ color: meta.color }}>
                      🏆 Best: {best}
                    </div>
                  )}

                  {/* Lock overlay */}
                  {!unlocked && (
                    <div className={`${m ? 'mt-2' : 'mt-3'} flex items-center gap-1.5`}>
                      <span className={`${m ? 'text-xs' : 'text-sm'}`}>🔒</span>
                      <span className={`${m ? 'text-[9px]' : 'text-xs'} text-red-300/70`}>{info.unlock}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══════════════ BOTTOM: Daily + Actions ═══════════════ */}
        <div className={`w-full max-w-5xl mx-auto ${m ? 'mt-1' : 'mt-3'}`}>

          {/* Daily challenge as compact banner */}
          <button
            onClick={onSelectDaily}
            className={`w-full rounded-lg text-left transition-all ${m ? 'p-2.5' : 'p-3'}`}
            style={{
              background: dailyDone
                ? 'linear-gradient(90deg, rgba(22,101,52,0.15), rgba(0,0,0,0.3))'
                : 'linear-gradient(90deg, rgba(120,80,0,0.15), rgba(0,0,0,0.3))',
              border: dailyDone ? '1.5px solid rgba(34,197,94,0.35)' : '1.5px solid rgba(234,179,8,0.35)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`${m ? 'text-base' : 'text-lg'}`}>{dailyDone ? '✅' : '📅'}</span>
                <span className={`${m ? 'text-xs' : 'text-sm'} font-bold uppercase tracking-wide ${dailyDone ? 'text-green-300/70' : 'text-yellow-200'}`}>
                  {t.daily.title}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  dailyDone ? 'bg-green-900/30 text-green-300/70 border border-green-800/30' : 'bg-amber-900/30 text-amber-300 border border-amber-700/30'
                }`}>
                  {lang === 'mr' ? dailyMod.nameMr : dailyMod.name}
                </span>
              </div>
              {dailyDone ? (
                <span className="text-[10px] text-green-400/70">✓ {t.daily.completed}</span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-yellow-400">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'linear-gradient(135deg, #d97706, #fbbf24)' }} />
                  {t.daily.bonus}
                </span>
              )}
            </div>
          </button>

          {/* Action bar */}
          <div className={`${m ? 'mt-2 gap-3' : 'mt-3 gap-4'} flex items-center justify-center`}>
            <button
              onClick={onOpenStore}
              className={`flex items-center gap-1.5 ${m ? 'px-4 py-2 text-[11px]' : 'px-5 py-2.5 text-xs'} font-bold uppercase tracking-widest transition-all rounded`}
              style={{
                background: 'linear-gradient(135deg, rgba(180,83,9,0.12), rgba(0,0,0,0.3))',
                border: '1.5px solid rgba(249,115,22,0.35)',
                color: '#fdba74',
              }}
            >
              ⚔ {t.ui.armory}
            </button>
            <button
              onClick={onOpenBattlePass}
              className={`flex items-center gap-1.5 ${m ? 'px-4 py-2 text-[11px]' : 'px-5 py-2.5 text-xs'} font-bold uppercase tracking-widest transition-all rounded`}
              style={{
                background: 'linear-gradient(135deg, rgba(120,80,0,0.12), rgba(0,0,0,0.3))',
                border: '1.5px solid rgba(234,179,8,0.35)',
                color: '#fde68a',
              }}
            >
              ★ {t.ui.battlePass}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModeSelectScreen;
