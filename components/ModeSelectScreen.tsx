
import React, { useMemo } from 'react';
import { GAME_MODES } from '../game/GameConfig';
import { getRankName, getNextRank } from '../game/Progression';
import type { PlayerProfile } from '../game/Progression';
import type { Strings } from '../localization/strings';
import { getDailyModifier, isDailyCompleted, getDailyBest } from '../game/DailyChallenge';
import type { Lang } from '../localization/strings';

const MODE_KEYS = ['skirmish', 'battle', 'lastStand'] as const;

const MODE_COLORS = {
  skirmish: { accent: '#22c55e', glow: 'rgba(34,197,94,0.3)', bg: 'rgba(34,197,94,0.08)', icon: '⚔' },
  battle: { accent: '#f97316', glow: 'rgba(249,115,22,0.3)', bg: 'rgba(249,115,22,0.08)', icon: '🔥' },
  lastStand: { accent: '#ef4444', glow: 'rgba(239,68,68,0.3)', bg: 'rgba(239,68,68,0.08)', icon: '💀' },
};

const DIFFICULTY = {
  skirmish: { label: 'Easy', labelMr: 'सोपे', stars: 1 },
  battle: { label: 'Medium', labelMr: 'मध्यम', stars: 2 },
  lastStand: { label: 'Hard', labelMr: 'कठीण', stars: 3 },
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
  const tip = useMemo(() => {
    const tips = t.historicalTips;
    return tips[Math.floor(Math.random() * tips.length)];
  }, [t]);

  return (
    <div className="absolute inset-0 z-40 overflow-hidden">
      <div className="absolute inset-0 intro-backdrop opacity-90 pointer-events-none" />
      <div className="absolute inset-0 intro-ember-field pointer-events-none" />
      <div className={`relative flex h-full w-full flex-col items-center ${isMobile ? 'px-3 py-2 justify-start' : 'px-6 py-6 justify-center'}`}>

        {/* ── Header ── */}
        <div className="text-center">
          <h2 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-black uppercase text-orange-100 font-cinzel`}>
            {t.ui.selectMode}
          </h2>
          {/* Rank + Coins row */}
          <div className="mt-2 flex items-center justify-center gap-4">
            <span className="px-3 py-1 rounded text-xs font-bold uppercase tracking-wider" style={{
              background: 'linear-gradient(135deg, rgba(217,119,6,0.25), rgba(120,53,0,0.3))',
              border: '1px solid rgba(217,119,6,0.5)',
              color: '#fbbf24',
            }}>
              {getRankName(profile.totalKills)}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-bold text-yellow-300">
              <span className="inline-block w-4 h-4 rounded-full" style={{
                background: 'linear-gradient(135deg, #d97706, #fbbf24)',
                boxShadow: '0 0 8px rgba(251,191,36,0.4)',
              }} />
              {profile.currency}
              <span className="text-[10px] font-normal text-orange-200/40 uppercase tracking-wider ml-0.5">
                {t.scorecard.coins}
              </span>
            </span>
          </div>
        </div>

        {/* ── Mode Cards ── */}
        <div className={`${isMobile ? 'mt-3' : 'mt-6'} w-full max-w-5xl ${isMobile ? 'px-1' : 'px-4'}`}>
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-3' : 'grid-cols-3'}`}>
            {MODE_KEYS.map((key) => {
              const info = t.modes[key];
              const mode = GAME_MODES[key];
              const unlocked = profile.unlockedModes.includes(key);
              const best = profile.bestScore[key] ?? 0;
              const colors = MODE_COLORS[key];
              const diff = DIFFICULTY[key];

              return (
                <button
                  key={key}
                  disabled={!unlocked}
                  onClick={() => onSelectMode(key)}
                  className={`relative text-left transition-all rounded ${isMobile ? 'p-3' : 'p-5'} group`}
                  style={{
                    background: unlocked
                      ? `linear-gradient(160deg, ${colors.bg} 0%, rgba(0,0,0,0.5) 100%)`
                      : 'rgba(0,0,0,0.3)',
                    border: unlocked
                      ? `2px solid ${colors.accent}50`
                      : '2px solid rgba(75,85,99,0.3)',
                    boxShadow: unlocked ? `0 0 20px ${colors.glow}` : 'none',
                    opacity: unlocked ? 1 : 0.5,
                    cursor: unlocked ? 'pointer' : 'not-allowed',
                  }}
                >
                  {/* Top color strip */}
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t" style={{ background: colors.accent }} />

                  {/* Icon + Title */}
                  <div className="flex items-center gap-2">
                    <span className={`${isMobile ? 'text-xl' : 'text-2xl'}`}>{colors.icon}</span>
                    <span className={`${isMobile ? 'text-base' : 'text-xl'} font-black uppercase tracking-wide text-orange-100`}>
                      {info.name}
                    </span>
                  </div>

                  {/* Difficulty stars */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map(s => (
                        <span key={s} className={`${isMobile ? 'text-xs' : 'text-sm'}`} style={{
                          color: s <= diff.stars ? colors.accent : 'rgba(255,255,255,0.15)',
                        }}>★</span>
                      ))}
                    </div>
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: colors.accent }}>
                      {lang === 'mr' ? diff.labelMr : diff.label}
                    </span>
                  </div>

                  {/* Duration + Wave tags */}
                  <div className={`${isMobile ? 'mt-2' : 'mt-3'} flex gap-1.5 flex-wrap`}>
                    <span className={`${isMobile ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'} rounded-full font-bold`} style={{
                      background: `${colors.accent}20`,
                      color: colors.accent,
                      border: `1px solid ${colors.accent}40`,
                    }}>{mode.duration}s</span>
                    <span className={`${isMobile ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'} rounded-full font-bold`} style={{
                      background: `${colors.accent}20`,
                      color: colors.accent,
                      border: `1px solid ${colors.accent}40`,
                    }}>Wave {mode.startWave}+</span>
                  </div>

                  {/* Description */}
                  <div className={`${isMobile ? 'mt-1.5 text-[10px]' : 'mt-2 text-xs'} text-orange-200/60 leading-relaxed`}>
                    {info.desc}
                  </div>

                  {/* Best score or lock */}
                  {unlocked && best > 0 && (
                    <div className={`${isMobile ? 'mt-2' : 'mt-3'} flex items-center gap-1.5`}>
                      <span className="text-[10px]">🏆</span>
                      <span className={`text-xs font-bold uppercase tracking-wider`} style={{ color: colors.accent }}>
                        Best: {best}
                      </span>
                    </div>
                  )}
                  {!unlocked && (
                    <div className={`${isMobile ? 'mt-2' : 'mt-3'} flex items-center gap-1.5`}>
                      <span className="text-sm">🔒</span>
                      <span className="text-[10px] uppercase tracking-wider text-red-400/80">{info.unlock}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Daily Challenge ── */}
        <div className={`${isMobile ? 'mt-3' : 'mt-5'} w-full max-w-5xl ${isMobile ? 'px-1' : 'px-4'}`}>
          <button
            onClick={onSelectDaily}
            className={`w-full text-left transition-all rounded ${isMobile ? 'p-3' : 'p-4'}`}
            style={{
              background: dailyDone
                ? 'linear-gradient(135deg, rgba(22,101,52,0.12), rgba(0,0,0,0.4))'
                : 'linear-gradient(135deg, rgba(120,80,0,0.12), rgba(0,0,0,0.4))',
              border: dailyDone ? '2px solid rgba(34,197,94,0.4)' : '2px solid rgba(234,179,8,0.4)',
              boxShadow: dailyDone ? 'none' : '0 0 16px rgba(234,179,8,0.08)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`${isMobile ? 'text-lg' : 'text-xl'} flex-shrink-0`}>
                  {dailyDone ? '✅' : '⚔'}
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`${isMobile ? 'text-sm' : 'text-base'} font-black uppercase tracking-wide ${dailyDone ? 'text-green-200/70' : 'text-yellow-100'}`}>
                      {t.daily.title}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      dailyDone ? 'bg-green-900/40 text-green-300 border border-green-700/30' : 'bg-amber-900/40 text-amber-300 border border-amber-600/30'
                    }`}>
                      {lang === 'mr' ? dailyMod.nameMr : dailyMod.name}
                    </span>
                  </div>
                  <div className={`mt-0.5 ${isMobile ? 'text-[10px]' : 'text-xs'} text-orange-200/50`}>
                    {lang === 'mr' ? dailyMod.descMr : dailyMod.desc}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                {dailyDone ? (
                  <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-green-900/30 text-green-400 border border-green-700/30">
                    ✓ {t.daily.completed}
                  </span>
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <span className="flex items-center gap-1 text-sm font-bold text-yellow-400">
                      <span className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(135deg, #d97706, #fbbf24)' }} />
                      {t.daily.bonus}
                    </span>
                    {dailyBest > 0 && (
                      <span className="text-[10px] text-orange-200/40">{t.daily.best}: {dailyBest}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </button>
        </div>

        {/* ── Bottom: Store buttons + rank progress ── */}
        <div className={`${isMobile ? 'mt-2' : 'mt-4'} flex items-center flex-wrap justify-center gap-3`}>
          <button
            onClick={onOpenStore}
            className={`${isMobile ? 'px-4 py-2 text-xs' : 'px-5 py-2.5 text-xs'} font-bold uppercase tracking-widest transition-all rounded`}
            style={{
              background: 'linear-gradient(135deg, rgba(180,83,9,0.15), rgba(0,0,0,0.3))',
              border: '1.5px solid rgba(249,115,22,0.4)',
              color: '#fdba74',
            }}
          >
            ⚔ Armory
          </button>
          <button
            onClick={onOpenBattlePass}
            className={`${isMobile ? 'px-4 py-2 text-xs' : 'px-5 py-2.5 text-xs'} font-bold uppercase tracking-widest transition-all rounded`}
            style={{
              background: 'linear-gradient(135deg, rgba(120,80,0,0.15), rgba(0,0,0,0.3))',
              border: '1.5px solid rgba(234,179,8,0.4)',
              color: '#fde68a',
            }}
          >
            ★ Battle Pass
          </button>
          {next && (
            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase tracking-wider text-orange-200/40`}>
                Next: {next.name}
              </span>
              <div className={`${isMobile ? 'w-16' : 'w-28'} h-2 bg-black/40 rounded-full overflow-hidden border border-orange-500/20`}>
                <div className="h-full rounded-full" style={{
                  width: `${Math.min(100, ((profile.totalKills % next.threshold) / next.threshold) * 100)}%`,
                  background: 'linear-gradient(90deg, #d97706, #fbbf24)',
                }} />
              </div>
              <span className="text-[10px] text-orange-200/30">{next.threshold - profile.totalKills} to go</span>
            </div>
          )}
        </div>

        {/* Historical tip */}
        {!isMobile && (
          <div className="mt-3 max-w-2xl text-center text-[11px] italic text-orange-200/30 leading-relaxed">
            {tip}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModeSelectScreen;
