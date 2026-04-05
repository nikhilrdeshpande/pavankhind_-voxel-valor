
import React, { useMemo } from 'react';
import { GAME_MODES } from '../game/GameConfig';
import { getRankName, getNextRank } from '../game/Progression';
import type { PlayerProfile } from '../game/Progression';
import type { Strings } from '../localization/strings';
import { getDailyModifier, isDailyCompleted, getDailyBest } from '../game/DailyChallenge';
import type { Lang } from '../localization/strings';

const MODE_KEYS = ['skirmish', 'battle', 'lastStand'] as const;

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
      <div className={`relative flex h-full w-full flex-col items-center justify-center ${isMobile ? 'px-3 py-3' : 'px-6 py-12'}`}>
        <div className={`${isMobile ? 'text-xs' : 'text-xs'} uppercase tracking-[0.5em] text-orange-200/70`}>{t.ui.chooseMode}</div>
        <h2 className={`mt-1 ${isMobile ? 'text-2xl' : 'text-3xl md:text-4xl'} font-black uppercase text-orange-100 font-cinzel`}>{t.ui.selectMode}</h2>
        <div className={`mt-1 ${isMobile ? 'text-xs' : 'text-xs'} uppercase tracking-[0.35em] text-orange-200/60`}>
          {getRankName(profile.totalKills)} · {profile.currency} {t.scorecard.coins}
        </div>

        {/* Mode cards — horizontal scroll on mobile, grid on desktop */}
        {isMobile ? (
          <div className="mt-3 w-full px-2">
            <div className="flex gap-2 w-full">
              {MODE_KEYS.map((key) => {
                const info = t.modes[key];
                const mode = GAME_MODES[key];
                const unlocked = profile.unlockedModes.includes(key);
                const best = profile.bestScore[key] ?? 0;
                return (
                  <button
                    key={key}
                    disabled={!unlocked}
                    onClick={() => onSelectMode(key)}
                    className={`relative p-3 text-left transition-all flex-1 min-w-0 ${
                      unlocked
                        ? 'bg-black/40 text-orange-100 cursor-pointer'
                        : 'bg-black/20 text-gray-500 cursor-not-allowed'
                    }`}
                    style={{
                      border: unlocked ? '2px solid rgba(249,115,22,0.5)' : '2px solid rgba(107,114,128,0.3)',
                      borderTop: `3px solid ${key === 'skirmish' ? '#22c55e' : key === 'battle' ? '#f97316' : '#ef4444'}`,
                    }}
                  >
                    <div className="text-base font-black uppercase tracking-wide">{info.name}</div>
                    <div className="mt-1 flex gap-1 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-orange-200/80">{mode.duration}s</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-orange-200/80">Wave {mode.startWave}+</span>
                    </div>
                    <div className="mt-1 text-xs opacity-80 line-clamp-2">{info.desc}</div>
                    {unlocked && best > 0 && (
                      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-orange-300">Best: {best}</div>
                    )}
                    {!unlocked && (
                      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-red-400">🔒 {info.unlock}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-8 grid w-full max-w-4xl gap-4 md:grid-cols-3">
            {MODE_KEYS.map((key) => {
              const info = t.modes[key];
              const mode = GAME_MODES[key];
              const unlocked = profile.unlockedModes.includes(key);
              const best = profile.bestScore[key] ?? 0;
              return (
                <button
                  key={key}
                  disabled={!unlocked}
                  onClick={() => onSelectMode(key)}
                  className={`relative p-6 text-left transition-all ${
                    unlocked
                      ? 'bg-black/40 text-orange-100 hover:bg-orange-500/20 cursor-pointer'
                      : 'bg-black/20 text-gray-500 cursor-not-allowed'
                  }`}
                  style={{
                    border: unlocked ? '2px solid rgba(249,115,22,0.5)' : '2px solid rgba(107,114,128,0.3)',
                    borderTop: `3px solid ${key === 'skirmish' ? '#22c55e' : key === 'battle' ? '#f97316' : '#ef4444'}`,
                  }}
                >
                  <div className="text-lg font-black uppercase tracking-wide">{info.name}</div>
                  <div className="mt-1 flex gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-orange-200/80">{mode.duration}s</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-orange-200/80">Wave {mode.startWave}+</span>
                  </div>
                  <div className="mt-3 text-sm opacity-80">{info.desc}</div>
                  {unlocked && best > 0 && (
                    <div className="mt-3 text-xs uppercase tracking-[0.3em] text-orange-300">Best: {best}</div>
                  )}
                  {!unlocked && (
                    <div className="mt-3 text-[10px] uppercase tracking-[0.3em] text-red-400">🔒 {info.unlock}</div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Daily challenge */}
        <button
          onClick={onSelectDaily}
          className={`${isMobile ? 'mt-2 p-2' : 'mt-6 p-4'} w-full max-w-4xl text-left transition-all ${
            dailyDone
              ? 'bg-black/30 text-green-200/70'
              : 'bg-black/40 text-yellow-100 hover:bg-yellow-600/20 cursor-pointer'
          }`}
          style={{
            border: dailyDone ? '2px solid rgba(34,197,94,0.3)' : '2px solid rgba(234,179,8,0.4)',
            animation: dailyDone ? 'none' : 'daily-glow 2s ease-in-out infinite',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className={`${isMobile ? 'text-sm' : 'text-sm'} font-black uppercase tracking-wide`}>{t.daily.title}</span>
              <span className={`ml-2 ${isMobile ? 'text-[10px]' : 'text-xs'} uppercase tracking-[0.3em] opacity-70`}>
                {lang === 'mr' ? dailyMod.nameMr : dailyMod.name}
              </span>
            </div>
            {dailyDone && <span className="text-[10px] uppercase tracking-[0.3em] text-green-400">{t.daily.completed}</span>}
          </div>
          {!isMobile && (
            <div className="mt-1 text-xs opacity-60">
              {lang === 'mr' ? dailyMod.descMr : dailyMod.desc}
              {!dailyDone && <span className="ml-2 text-yellow-400">{t.daily.bonus}</span>}
              {dailyBest > 0 && <span className="ml-2">{t.daily.best}: {dailyBest}</span>}
            </div>
          )}
        </button>

        {/* Bottom row: Armory, Battle Pass, rank progress */}
        <div className={`${isMobile ? 'mt-2 gap-2' : 'mt-4 gap-4'} flex items-center flex-wrap justify-center`}>
          <button
            onClick={onOpenStore}
            className={`${isMobile ? 'px-4 py-2 text-xs' : 'px-5 py-2 text-xs'} border border-orange-500/60 text-orange-200 hover:bg-orange-500 hover:text-black transition-all font-bold uppercase tracking-widest`}
          >
            Armory
          </button>
          <button
            onClick={onOpenBattlePass}
            className={`${isMobile ? 'px-4 py-2 text-xs' : 'px-5 py-2 text-xs'} border border-yellow-500/60 text-yellow-200 hover:bg-yellow-500 hover:text-black transition-all font-bold uppercase tracking-widest`}
          >
            Battle Pass
          </button>
          {next && (
            <div className="flex items-center gap-2">
              <div className={`${isMobile ? 'text-[9px]' : 'text-[10px]'} uppercase tracking-[0.3em] text-orange-200/50`}>
                Next: {next.name}
              </div>
              <div className={`${isMobile ? 'w-20' : 'w-32'} h-2 bg-black/50 rounded-full overflow-hidden border border-orange-500/20`}>
                <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-500" style={{
                  width: `${Math.min(100, ((profile.totalKills % next.threshold) / next.threshold) * 100)}%`,
                }} />
              </div>
              <div className={`${isMobile ? 'text-[9px]' : 'text-[10px]'} text-orange-200/40`}>{next.threshold - profile.totalKills} to go</div>
            </div>
          )}
        </div>
        {!isMobile && (
          <div className="mt-4 max-w-2xl text-center text-[11px] italic text-orange-200/40 leading-relaxed">
            {tip}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModeSelectScreen;
