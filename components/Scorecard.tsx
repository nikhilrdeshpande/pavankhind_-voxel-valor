
import React, { useState, useEffect } from 'react';
import type { GameStats } from '../game/GameConfig';
import { getRankName } from '../game/Progression';
import type { PlayerProfile } from '../game/Progression';
import type { Strings } from '../localization/strings';
import type { GameStatus } from '../App';

interface ScorecardProps {
  t: Strings;
  status: GameStatus;
  stats: GameStats;
  profile: PlayerProfile;
  lastRunCoins: number;
  lastRunNewBest: boolean;
  canDoubleCoins: boolean;
  isMobile?: boolean;
  onViewScorecard: () => void;
  onShare: () => void;
  onPlayAgain: () => void;
  onDoubleCoins: () => void;
  onOpenStore: () => void;
}

function useCountUp(target: number, duration = 1200, delay = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);
  return value;
}

const Scorecard: React.FC<ScorecardProps> = ({
  t, status, stats, profile, lastRunCoins, lastRunNewBest, canDoubleCoins, isMobile,
  onViewScorecard, onShare, onPlayAgain, onDoubleCoins, onOpenStore,
}) => {
  const { score, maxCombo, damageTaken, valorStrikes, objectivesCompleted } = stats;

  const animScore = useCountUp(score, 1200, 300);
  const animCombo = useCountUp(maxCombo, 800, 600);
  const animDamage = useCountUp(Math.round(damageTaken), 800, 750);
  const animValor = useCountUp(valorStrikes, 600, 900);
  const animCoins = useCountUp(lastRunCoins, 800, 1050);

  const [visibleStep, setVisibleStep] = useState(0);
  useEffect(() => {
    const timers = [0, 150, 300, 600, 900, 1200].map((delay, i) =>
      setTimeout(() => setVisibleStep(i + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const isVictory = status === 'WON';
  const bgGradient = isVictory
    ? 'linear-gradient(135deg, rgba(120,80,20,0.15) 0%, rgba(30,20,10,0.9) 100%)'
    : 'linear-gradient(135deg, rgba(80,20,20,0.15) 0%, rgba(30,10,10,0.9) 100%)';
  const borderColor = isVictory ? 'rgba(212,160,23,0.4)' : 'rgba(180,40,40,0.4)';

  if (status === 'VISHAL') {
    return (
      <div className="absolute inset-0 z-50 overflow-hidden">
        <div className="absolute inset-0 intro-reference pointer-events-none" />
        <div className="absolute inset-0 intro-ember-field pointer-events-none" />
        <div className="absolute inset-0 intro-backdrop pointer-events-none" />
        <div className={`relative flex h-full w-full items-center justify-center ${isMobile ? 'px-3 py-4' : 'px-6 py-12'} text-center`}>
          <div className={`max-w-3xl border-2 border-orange-900/60 bg-zinc-900/80 ${isMobile ? 'p-4' : 'p-10'} shadow-[0_0_60px_rgba(0,0,0,0.7)]`}>
            <div className="text-xs uppercase tracking-[0.5em] text-orange-200/70">{t.vishalgad.subtitle}</div>
            <h2 className={`mt-2 ${isMobile ? 'text-2xl' : 'text-4xl md:text-5xl'} font-black uppercase text-orange-100`}>{t.vishalgad.title}</h2>
            <p className={`mt-3 ${isMobile ? 'text-sm' : 'text-lg'} text-orange-50/90`}>
              {t.vishalgad.text}
            </p>
            <button
              onClick={onViewScorecard}
              className={`mt-4 ${isMobile ? 'px-5 py-2 text-xs' : 'px-8 py-4 text-sm'} border border-orange-500 text-orange-200 hover:bg-orange-500 hover:text-black transition-all font-bold uppercase tracking-widest`}
            >
              {t.ui.viewScorecard}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 intro-reference pointer-events-none" />
      <div className="absolute inset-0 intro-ember-field pointer-events-none" />
      <div className="absolute inset-0 intro-backdrop pointer-events-none" />
      <div className={`relative flex h-full w-full items-center justify-center ${isMobile ? 'px-3 py-2' : 'px-6 py-12'} text-center`}>
        <div className={`w-full max-w-4xl ${isMobile ? 'p-3' : 'p-10'} shadow-[0_0_60px_rgba(0,0,0,0.7)] relative scorecard-ember-field ${isMobile ? 'overflow-y-auto max-h-full' : ''}`} style={{
          background: bgGradient,
          border: `2px solid ${borderColor}`,
        }}>
          {/* Title */}
          <div style={{
            opacity: visibleStep >= 1 ? 1 : 0,
            transform: visibleStep >= 1 ? 'translateY(0)' : 'translateY(-15px)',
            transition: 'all 0.4s ease-out',
          }}>
            <h2 className={`${isMobile ? 'text-2xl' : 'text-4xl md:text-5xl'} font-bold italic uppercase`} style={{
              color: isVictory ? '#fde68a' : '#fca5a5',
              textShadow: isVictory ? '0 0 20px rgba(212,160,23,0.4)' : '0 0 20px rgba(180,40,40,0.3)',
            }}>
              {isVictory ? t.scorecard.kingSafe : t.scorecard.bajiFallen}
            </h2>
            <div className={`saffron-rule ${isMobile ? 'w-32' : 'w-48'} mx-auto mt-2`} />
          </div>

          {/* Score */}
          <div style={{
            opacity: visibleStep >= 2 ? 1 : 0,
            transform: visibleStep >= 2 ? 'scale(1)' : 'scale(0.8)',
            transition: 'all 0.4s ease-out',
          }}>
            <div className={`${isMobile ? 'mt-2 text-2xl' : 'mt-6 text-3xl'} font-black`} style={{
              color: '#f97316',
              textShadow: '0 0 16px rgba(249,115,22,0.4)',
            }}>{animScore} {t.scorecard.elitesSlain}</div>
          </div>

          {/* Stats */}
          <div style={{
            opacity: visibleStep >= 3 ? 1 : 0,
            transform: visibleStep >= 3 ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.4s ease-out',
          }}>
            <div className={`${isMobile ? 'mt-3 grid-cols-3 gap-2 text-xs' : 'mt-6 gap-4 text-sm md:grid-cols-3'} grid uppercase tracking-[0.2em] text-orange-200/80`}>
              <div>{t.scorecard.maxCombo}: <span className="font-black text-orange-100">{animCombo}</span></div>
              <div>{t.scorecard.damageTaken}: <span className="font-black text-orange-100">{animDamage}</span></div>
              <div>{t.scorecard.valorStrikes}: <span className="font-black text-orange-100">{animValor}</span></div>
            </div>
            <div className={`${isMobile ? 'mt-2 text-[10px]' : 'mt-4 text-xs'} uppercase tracking-[0.35em] text-orange-200/60`}>
              {t.scorecard.objectivesCompleted}: {objectivesCompleted}
            </div>
          </div>

          {/* Coins, Rank, New Best */}
          <div style={{
            opacity: visibleStep >= 4 ? 1 : 0,
            transform: visibleStep >= 4 ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.4s ease-out',
          }}>
            {/* Coins earned — prominent */}
            <div className={`${isMobile ? 'mt-3' : 'mt-5'} flex items-center justify-center gap-2`}>
              <span className="inline-block w-5 h-5 rounded-full" style={{
                background: 'linear-gradient(135deg, #d97706, #fbbf24)',
                boxShadow: '0 0 12px rgba(251,191,36,0.5)',
              }} />
              <span className={`${isMobile ? 'text-lg' : 'text-2xl'} font-black`} style={{
                color: '#fbbf24',
                textShadow: '0 0 12px rgba(251,191,36,0.4)',
              }}>+{animCoins}</span>
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} uppercase tracking-wider text-yellow-200/60`}>{t.scorecard.coins}</span>
            </div>

            {/* Rank + New Best */}
            <div className={`${isMobile ? 'mt-2' : 'mt-3'} flex items-center justify-center gap-3`}>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{
                background: 'linear-gradient(135deg, rgba(217,119,6,0.3), rgba(180,83,9,0.2))',
                border: '1px solid rgba(217,119,6,0.4)',
                color: '#fbbf24',
              }}>
                {t.scorecard.rank}: {getRankName(profile.totalKills)}
              </span>
              {lastRunNewBest && (
                <span className={`${isMobile ? 'text-sm' : 'text-base'} font-black text-yellow-400`} style={{
                  animation: 'shimmer 2s ease-in-out infinite',
                  textShadow: '0 0 12px rgba(250,204,21,0.5)',
                }}>
                  ★ {t.scorecard.newBest}
                </span>
              )}
            </div>
          </div>

          {/* Medals */}
          <div style={{
            opacity: visibleStep >= 5 ? 1 : 0,
            transform: visibleStep >= 5 ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.4s ease-out',
          }}>
            <div className={`${isMobile ? 'mt-3 gap-2 text-xs' : 'mt-6 gap-3 text-sm'} flex flex-wrap justify-center`}>
              {damageTaken < 40 && (
                <span className={`${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'} rounded-sm font-bold uppercase tracking-wider flex items-center gap-1.5`} style={{
                  background: 'linear-gradient(135deg, rgba(192,192,192,0.1), rgba(0,0,0,0.3))',
                  border: '1.5px solid rgba(192,192,192,0.4)',
                  color: '#e5e7eb',
                  boxShadow: '0 0 10px rgba(192,192,192,0.1)',
                }}>
                  🛡 {t.medals.wallOfSteel}
                </span>
              )}
              {maxCombo >= 8 && (
                <span className={`${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'} rounded-sm font-bold uppercase tracking-wider flex items-center gap-1.5`} style={{
                  background: 'linear-gradient(135deg, rgba(212,160,23,0.15), rgba(0,0,0,0.3))',
                  border: '1.5px solid rgba(212,160,23,0.5)',
                  color: '#fde68a',
                  boxShadow: '0 0 10px rgba(212,160,23,0.15)',
                }}>
                  ⚡ {t.medals.relentless}
                </span>
              )}
              {valorStrikes >= 1 && (
                <span className={`${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'} rounded-sm font-bold uppercase tracking-wider flex items-center gap-1.5`} style={{
                  background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(0,0,0,0.3))',
                  border: '1.5px solid rgba(249,115,22,0.5)',
                  color: '#fdba74',
                  boxShadow: '0 0 10px rgba(249,115,22,0.15)',
                }}>
                  🔥 {t.medals.valorous}
                </span>
              )}
              {objectivesCompleted >= 1 && (
                <span className={`${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'} rounded-sm font-bold uppercase tracking-wider flex items-center gap-1.5`} style={{
                  background: 'linear-gradient(135deg, rgba(192,192,192,0.1), rgba(0,0,0,0.3))',
                  border: '1.5px solid rgba(192,192,192,0.4)',
                  color: '#e5e7eb',
                  boxShadow: '0 0 10px rgba(192,192,192,0.1)',
                }}>
                  🚩 {t.medals.bannerHolder}
                </span>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div style={{
            opacity: visibleStep >= 6 ? 1 : 0,
            transform: visibleStep >= 6 ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.4s ease-out',
          }}>
            <div className={`${isMobile ? 'mt-2 gap-2' : 'mt-6 gap-4'} flex flex-wrap items-center justify-center`}>
              {canDoubleCoins && (
                <button
                  onClick={onDoubleCoins}
                  className={`${isMobile ? 'px-5 py-2.5 text-sm' : 'px-6 py-3 text-sm'} font-black uppercase tracking-widest rounded-sm transition-all`}
                  style={{
                    background: 'linear-gradient(135deg, #b45309, #d97706, #fbbf24)',
                    color: '#451a03',
                    border: '1.5px solid rgba(251,191,36,0.6)',
                    boxShadow: '0 0 16px rgba(251,191,36,0.3)',
                  }}
                >
                  🪙 2X Coins
                </button>
              )}
              <button
                onClick={onShare}
                className={`${isMobile ? 'px-5 py-3 text-sm' : 'px-8 py-4 text-sm'} bg-gradient-to-r from-orange-700 via-red-700 to-red-900 text-white font-black uppercase tracking-widest`}
              >
                {t.ui.shareCard}
              </button>
              <button
                onClick={onOpenStore}
                className={`${isMobile ? 'px-5 py-3 text-sm' : 'px-8 py-4 text-sm'} border-2 border-yellow-700 text-yellow-300 hover:bg-yellow-950 font-bold uppercase tracking-widest`}
              >
                {t.ui.coinShop}
              </button>
              <button
                onClick={onPlayAgain}
                className={`${isMobile ? 'px-5 py-3 text-sm' : 'px-8 py-4 text-sm'} border-2 border-orange-800 text-orange-500 hover:bg-orange-950 font-bold uppercase tracking-widest`}
              >
                {t.ui.playAgain}
              </button>
            </div>
            {!isMobile && (
              <p className="mt-6 text-xs uppercase tracking-[0.4em] text-orange-200/70">
                {t.ui.harHarMahadev}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scorecard;
