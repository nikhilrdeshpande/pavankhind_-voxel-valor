
import React, { useState, useRef, useEffect } from 'react';
import type { GameStats } from '../game/GameConfig';
import type { Strings } from '../localization/strings';

interface HUDProps {
  stats: GameStats;
  t: Strings;
  isMobile?: boolean;
  onPause?: () => void;
}

const HUD: React.FC<HUDProps> = ({ stats, t, isMobile, onPause }) => {
  const {
    health, stamina, timeRemaining, score, combo, rage,
    wave, weaponLevel, perkTimer, archerWarning,
    objectiveProgress, objectiveTarget, objectiveTimer,
    tutorialStep, gameElapsed, waveBanner, waveBannerTimer,
    waveProgress, nextWaveIn, stage, stageProgress,
    stageName, stageDirective, stageBanner, stageBannerTimer, cannonSignals,
    recentPickup, pickupToastTimer,
    killStreak, streakBanner, streakBannerTimer,
    volleyWarning,
  } = stats;

  const prevScoreRef = useRef(score);
  const scoreChanged = score !== prevScoreRef.current;
  useEffect(() => { prevScoreRef.current = score; }, [score]);

  const [killFloats, setKillFloats] = useState<{ id: number; key: number }[]>([]);
  const killIdRef = useRef(0);
  const [battleCry, setBattleCry] = useState<string | null>(null);
  const battleCryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Kill feedback: +1 floating number on score change
  useEffect(() => {
    if (score > prevScoreRef.current) {
      const diff = score - prevScoreRef.current;
      const id = ++killIdRef.current;
      setKillFloats(prev => [...prev.slice(-4), { id, key: id }]);
      setTimeout(() => setKillFloats(prev => prev.filter(k => k.id !== id)), 800);
    }
  }, [score]);

  // Battle cries on combo 5+ or parry (triggered by combo crossing 5)
  const battleCries = ["Har Har Mahadev!", "Jai Bhavani!", "Prahar!"];
  useEffect(() => {
    if (combo === 5 || combo === 8 || combo === 12) {
      const cry = battleCries[Math.floor(Math.random() * battleCries.length)];
      setBattleCry(cry);
      if (battleCryTimerRef.current) clearTimeout(battleCryTimerRef.current);
      battleCryTimerRef.current = setTimeout(() => setBattleCry(null), 1500);
    }
  }, [combo]);

  const comboTier = combo >= 9 ? 'mythic' : combo >= 6 ? 'onslaught' : combo >= 3 ? 'fury' : '';
  const comboColor = combo >= 9 ? '#c084fc' : combo >= 6 ? '#ef4444' : '#f97316';
  const comboLabel = combo >= 9 ? t.combo.mythic : combo >= 6 ? t.combo.onslaught : t.combo.fury;

  const timerSeconds = Math.ceil(timeRemaining % 60);
  const timerMinutes = Math.floor(timeRemaining / 60);
  const timerLow = timeRemaining < 30;
  const timerCritical = timeRemaining < 10;

  return (
    <>
      {/* Mobile pause button — top-right, above all controls */}
      {isMobile && onPause && (
        <button
          onClick={onPause}
          className="absolute z-50 w-10 h-10 rounded-full flex items-center justify-center pointer-events-auto"
          style={{
            top: 'calc(4px + var(--sai-top))',
            right: 'calc(6px + var(--sai-right))',
            background: 'rgba(0,0,0,0.6)',
            border: '1.5px solid rgba(249,115,22,0.5)',
          }}
        >
          <span className="text-orange-200 text-base font-bold">⏸</span>
        </button>
      )}

      {/* Health / Stamina / Rage bars */}
      <div
        className={`absolute z-10 flex flex-col pointer-events-none ${isMobile ? 'gap-1' : 'gap-2 top-6 left-6'}`}
        style={isMobile ? {
          top: '2px',
          left: '2px',
          paddingLeft: 'var(--sai-left)',
          paddingTop: 'var(--sai-top)',
        } : undefined}
      >
        {/* Health */}
        <div className="flex items-center gap-1">
          {!isMobile && <span className="text-[10px] text-red-300/80 w-4">⚔</span>}
          {isMobile && <div style={{ width: '3px', height: '14px', background: '#ef4444', borderRadius: '1px', flexShrink: 0 }} />}
          <div className={`${isMobile ? 'h-[16px]' : 'h-6'} rounded-sm relative overflow-hidden`} style={{
            width: isMobile ? '150px' : '256px',
            background: 'linear-gradient(180deg, #1a0808 0%, #0d0404 100%)',
            border: '1px solid rgba(220,60,40,0.4)',
            boxShadow: `0 0 ${health < 40 ? '12px' : '6px'} rgba(220,60,40,${health < 40 ? 0.5 : 0.2})`,
          }}>
            <div className="h-full transition-all duration-300" style={{
              width: `${health}%`,
              background: 'linear-gradient(180deg, #ef4444 0%, #b91c1c 60%, #7f1d1d 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
            }} />
            {!isMobile && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{t.ui.vitality}</span>
            )}
            <span className={`absolute right-1 top-1/2 -translate-y-1/2 ${isMobile ? 'text-[8px]' : 'text-xs'} font-black tabular-nums`}
              style={{ textShadow: '0 0 6px rgba(239,68,68,0.6)' }}>{Math.round(health)}</span>
          </div>
        </div>
        {health < 40 && (
          <style>{`@keyframes pulse-bar { 0%,100% { opacity:1 } 50% { opacity:0.6 } }`}</style>
        )}

        {/* Stamina */}
        <div className="flex items-center gap-1">
          {!isMobile && <span className="text-[10px] text-yellow-300/80 w-4">⚡</span>}
          {isMobile && <div style={{ width: '3px', height: '8px', background: '#eab308', borderRadius: '1px', flexShrink: 0 }} />}
          <div className={`${isMobile ? 'h-[10px]' : 'h-4'} rounded-sm relative overflow-hidden`} style={{
            width: isMobile ? '150px' : '256px',
            background: 'linear-gradient(180deg, #1a1400 0%, #0d0a00 100%)',
            border: '1px solid rgba(234,179,8,0.3)',
            boxShadow: '0 0 6px rgba(234,179,8,0.15)',
          }}>
            <div className="h-full transition-all duration-300" style={{
              width: `${stamina}%`,
              background: 'linear-gradient(180deg, #eab308 0%, #ca8a04 60%, #a16207 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
            }} />
            {!isMobile && (
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold uppercase tracking-wider"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{t.ui.spirit}</span>
            )}
          </div>
        </div>

        {/* Rage / Valor */}
        <div className="flex items-center gap-1">
          {!isMobile && <span className="text-[10px] text-orange-400/80 w-4">🔥</span>}
          {isMobile && <div style={{ width: '3px', height: '6px', background: '#f97316', borderRadius: '1px', flexShrink: 0 }} />}
          <div className={`${isMobile ? 'h-[8px]' : 'h-3'} rounded-sm relative overflow-hidden`} style={{
            width: isMobile ? '150px' : '256px',
            background: 'linear-gradient(180deg, #1a0c00 0%, #0d0600 100%)',
            border: `1px solid ${rage >= 100 ? 'rgba(250,204,21,0.6)' : 'rgba(249,115,22,0.3)'}`,
            boxShadow: rage >= 100 ? '0 0 14px rgba(250,204,21,0.4)' : '0 0 4px rgba(249,115,22,0.15)',
            animation: rage >= 100 ? 'pulse-glow 1.5s ease-in-out infinite' : 'none',
          }}>
            <div className={`h-full transition-all duration-300`} style={{
              width: `${rage}%`,
              background: rage >= 100
                ? 'linear-gradient(180deg, #facc15 0%, #f59e0b 50%, #d97706 100%)'
                : 'linear-gradient(180deg, #f97316 0%, #ea580c 60%, #c2410c 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
            }} />
            {!isMobile && (
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold uppercase tracking-wider"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{t.ui.valor}</span>
            )}
          </div>
        </div>
      </div>

      {/* Score & info */}
      <div
        className={`absolute z-10 text-right flex flex-col pointer-events-none ${isMobile ? 'gap-1' : 'top-6 right-6 gap-3'}`}
        style={isMobile ? {
          top: '2px',
          right: '2px',
          paddingRight: 'calc(52px + var(--sai-right))',
          paddingTop: 'var(--sai-top)',
        } : undefined}
      >
        <div className={`${isMobile ? 'text-xl' : 'text-4xl'} font-black tracking-tighter transition-transform duration-200`} style={{
          color: '#f97316',
          textShadow: '0 0 12px rgba(249,115,22,0.4)',
          transform: scoreChanged ? 'scale(1.08)' : 'scale(1)',
        }}>
          {score} {t.ui.elitesSlain}
        </div>
        <div className={`${isMobile ? 'text-xs' : 'text-xs'} uppercase tracking-[0.4em] text-orange-200/70`}>{t.ui.wave} {wave}</div>
        {!isMobile && (
          <div className="w-44 self-end">
            <div className="h-1.5 overflow-hidden rounded-full bg-black/50 border border-orange-900/50">
              <div
                className="h-full transition-all duration-200"
                style={{
                  width: `${Math.max(0, Math.min(100, waveProgress * 100))}%`,
                  background: 'linear-gradient(90deg, #d97706, #fbbf24)',
                }}
              />
            </div>
            <div className="mt-1 text-[9px] uppercase tracking-[0.28em] text-orange-200/50">
              Round shift in {Math.ceil(nextWaveIn)}s
            </div>
          </div>
        )}
        {!isMobile && (
          <div className="w-44 self-end">
            <div className="flex justify-between text-[9px] uppercase tracking-[0.28em] text-orange-200/60">
              <span>Stage {stage}/3</span>
              <span>{stageName}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/50 border border-yellow-900/50">
              <div
                className="h-full transition-all duration-200"
                style={{
                  width: `${Math.max(0, Math.min(100, stageProgress * 100))}%`,
                  background: stage === 3 ? 'linear-gradient(90deg, #ef4444, #facc15)' : 'linear-gradient(90deg, #f59e0b, #fde68a)',
                }}
              />
            </div>
            <div className="mt-1 text-[9px] uppercase tracking-[0.2em] text-yellow-100/55">
              {stageDirective}
            </div>
            <div className="mt-2 flex justify-end gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-2.5 w-2.5 rounded-full" style={{
                  background: i < cannonSignals ? '#fde68a' : 'rgba(0,0,0,0.55)',
                  border: i < cannonSignals ? '1px solid rgba(253,230,138,0.9)' : '1px solid rgba(253,186,116,0.3)',
                  boxShadow: i < cannonSignals ? '0 0 10px rgba(253,230,138,0.65)' : 'none',
                }} />
              ))}
            </div>
            <div className="mt-1 text-[8px] uppercase tracking-[0.24em] text-orange-100/45">
              Cannon signal {cannonSignals}/3
            </div>
          </div>
        )}
        {!isMobile && <div className="text-xs uppercase tracking-[0.4em] text-orange-200/70">{t.ui.weaponLv} {weaponLevel}</div>}
        {!isMobile && <div className="text-[10px] uppercase tracking-[0.35em] text-orange-200/60">
          {t.ui.nextPerk}: {Math.ceil(perkTimer)}s
        </div>}
        {objectiveTarget > 0 && (
          <div className="pt-2">
            <div className="text-sm uppercase tracking-[0.35em] font-black" style={{
              color: '#f59e0b',
              textShadow: '0 0 8px rgba(245,158,11,0.4)',
              animation: 'pulse-glow 2s ease-in-out infinite',
            }}>
              ⚑ {t.ui.holdTheLine}
            </div>
            <div className="mt-2 w-48 h-3 rounded-sm overflow-hidden" style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(245,158,11,0.4)',
              boxShadow: '0 0 8px rgba(245,158,11,0.2)',
            }}>
              <div
                className="h-full transition-all duration-200"
                style={{
                  width: `${Math.min(100, (objectiveProgress / objectiveTarget) * 100)}%`,
                  background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                }}
              />
            </div>
            <div className="mt-1 text-xs uppercase tracking-[0.3em] font-bold" style={{
              color: objectiveTimer < 5 ? '#ef4444' : '#fdba74',
              animation: objectiveTimer < 5 ? 'timer-pulse 0.5s ease-in-out infinite' : 'none',
            }}>
              {Math.ceil(objectiveTimer)}s remaining
            </div>
          </div>
        )}
      </div>

      {/* Combo display — offset below timer on mobile */}
      {combo > 1 && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-[15] text-center pointer-events-none"
          style={{ top: isMobile ? '36px' : '24px' }}
        >
          <div className="font-black tracking-widest" style={{
            fontSize: isMobile
              ? (combo >= 9 ? '1.25rem' : combo >= 6 ? '1.1rem' : '1rem')
              : (combo >= 9 ? '2rem' : combo >= 6 ? '1.75rem' : '1.5rem'),
            color: comboColor,
            textShadow: `0 0 ${combo >= 9 ? '24px' : combo >= 6 ? '18px' : '12px'} ${comboColor}80`,
            animation: 'combo-entrance 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}>
            {comboLabel} x{combo}
          </div>
          {combo >= 6 && (
            <div className="mt-1 w-full h-[2px] rounded-full mx-auto" style={{
              background: `linear-gradient(90deg, transparent, ${comboColor}, transparent)`,
              animation: 'pulse-glow 1s ease-in-out infinite',
              maxWidth: '120px',
            }} />
          )}
        </div>
      )}

      {archerWarning > 0 && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10 text-center">
          <div className="text-xs font-black text-red-300 tracking-[0.4em] uppercase">
            {t.ui.incomingArrow}
          </div>
        </div>
      )}

      {recentPickup && pickupToastTimer > 0 && (
        <div className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none" style={{ top: isMobile ? '70px' : '112px' }}>
          <div className="pickup-toast px-4 py-2 text-center" style={{
            border: `1px solid ${recentPickup.color}`,
            background: 'linear-gradient(180deg, rgba(8,5,2,0.82), rgba(20,10,4,0.68))',
            boxShadow: `0 0 20px ${recentPickup.color}55`,
          }}>
            <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-black uppercase tracking-[0.28em]`} style={{
              color: recentPickup.color,
              textShadow: `0 0 10px ${recentPickup.color}77`,
            }}>
              {recentPickup.name}
            </div>
            <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} mt-1 uppercase tracking-[0.18em] text-orange-100/80`}>
              {recentPickup.effect}
            </div>
          </div>
        </div>
      )}

      {/* Valor indicator — always visible on desktop, shows charge progress */}
      {!isMobile && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 text-center">
          <div className={`px-4 py-2 rounded ${rage >= 100 ? 'valor-ready-pulse' : ''}`} style={{
            border: rage >= 100 ? '1px solid rgba(255,102,0,0.5)' : '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(0,0,0,0.5)',
          }}>
            <div className="text-xs font-black tracking-[0.4em] uppercase" style={{
              color: rage >= 100 ? '#fde047' : '#666',
              textShadow: rage >= 100 ? '0 0 10px rgba(250,204,21,0.5)' : 'none',
            }}>
              {rage >= 100 ? t.ui.valorReady : `VALOR ${Math.round(rage)}%`}
            </div>
            <div className={`text-[10px] mt-1 tracking-widest ${rage >= 100 ? 'text-orange-300/80 breathe' : 'text-gray-500'}`}>
              {rage >= 100 ? 'V to clear nearby enemies' : 'fills when hits land'}
            </div>
            {/* Progress bar */}
            {rage < 100 && (
              <div className="mt-1 w-20 h-1 bg-black/50 rounded-full overflow-hidden mx-auto">
                <div className="h-full rounded-full transition-all" style={{
                  width: `${rage}%`,
                  background: 'linear-gradient(90deg, #d97706, #f59e0b)',
                }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timer — top-center on mobile, bottom on desktop */}
      <div
        className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none"
        style={isMobile ? {
          top: 'calc(8px + var(--sai-top))',
          zIndex: 15,
        } : {
          bottom: '40px',
        }}
      >
        <div className={`${isMobile ? 'px-3 py-1' : 'px-5 py-2'} rounded-full`} style={{
          background: 'rgba(0,0,0,0.5)',
          border: `1px solid ${timerCritical ? 'rgba(239,68,68,0.5)' : timerLow ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.15)'}`,
          boxShadow: timerCritical ? '0 0 12px rgba(239,68,68,0.3)' : 'none',
        }}>
          <div className={`${isMobile ? 'text-xl' : 'text-3xl'} font-black tabular-nums`} style={{
            color: timerCritical ? '#ef4444' : timerLow ? '#f97316' : '#ffffff',
            textShadow: timerCritical ? '0 0 8px rgba(239,68,68,0.5)' : '0 0 4px rgba(0,0,0,0.5)',
            animation: timerCritical ? 'timer-pulse 0.5s ease-in-out infinite' : timerLow ? 'timer-pulse 1s ease-in-out infinite' : 'none',
          }}>
            {timerMinutes}:{timerSeconds.toString().padStart(2, '0')}
          </div>
        </div>
      </div>
      {health < 40 && <div className="absolute inset-0 pointer-events-none vignette-low-health" />}

      {/* Kill feedback floats */}
      {killFloats.map(k => (
        <div key={k.key} className="absolute top-20 left-1/2 -translate-x-1/2 z-10 kill-float">
          <span className="text-2xl font-black text-orange-400" style={{ textShadow: '0 0 8px rgba(249,115,22,0.5)' }}>+1</span>
        </div>
      ))}

      {/* Battle cry flash */}
      {battleCry && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-20 battle-cry-flash">
          <div className="text-3xl md:text-4xl font-black uppercase tracking-widest" style={{
            color: '#fde68a',
            textShadow: '0 0 20px rgba(249,115,22,0.6), 0 0 40px rgba(249,115,22,0.3)',
          }}>
            {battleCry}
          </div>
        </div>
      )}

      {/* Mythic combo edge glow */}
      {combo >= 9 && (
        <>
          <div className="absolute top-0 left-0 right-0 h-1 z-10 mythic-edge-glow" style={{
            background: 'linear-gradient(90deg, transparent, #c084fc, transparent)',
          }} />
          <div className="absolute bottom-0 left-0 right-0 h-1 z-10 mythic-edge-glow" style={{
            background: 'linear-gradient(90deg, transparent, #c084fc, transparent)',
          }} />
        </>
      )}

      {/* ── Wave Transition Banner ── */}
      {waveBannerTimer > 0 && waveBanner && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none" style={{
          opacity: waveBannerTimer > 2.5 ? (3 - waveBannerTimer) * 2 : waveBannerTimer > 0.5 ? 1 : waveBannerTimer * 2,
        }}>
          <div className="text-center">
            <div className={`${isMobile ? 'text-3xl' : 'text-5xl'} font-black uppercase tracking-wider`} style={{
              color: wave % 3 === 0 ? '#ef4444' : '#fde68a',
              textShadow: wave % 3 === 0 ? '0 0 30px rgba(239,68,68,0.5)' : '0 0 30px rgba(253,230,138,0.4)',
            }}>
              {wave % 3 === 0 ? `⚠ ${(t as any).tutorial?.bossApproaching || 'BOSS APPROACHING!'}` : waveBanner}
            </div>
            {wave > 1 && wave % 3 !== 0 && (
              <div className={`mt-2 ${isMobile ? 'text-sm' : 'text-lg'} text-orange-200/70 uppercase tracking-widest`}>
                {(t as any).tutorial?.survivedWave || 'You survived Wave'} {wave - 1} — now entering {wave}
              </div>
            )}
            <div className={`mt-3 ${isMobile ? 'text-xs' : 'text-sm'} uppercase tracking-[0.35em] text-yellow-100/65`}>
              {stage === 1 ? 'Opening Hold' : stage === 2 ? 'Enemy Surge' : 'Final Stand'}
            </div>
          </div>
        </div>
      )}

      {stageBannerTimer > 0 && stageBanner && (
        <div className="absolute inset-0 flex items-center justify-center z-[25] pointer-events-none" style={{
          opacity: stageBannerTimer > 2.8 ? (3.6 - stageBannerTimer) * 1.25 : stageBannerTimer > 0.6 ? 1 : stageBannerTimer * 1.6,
        }}>
          <div className="text-center">
            <div className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-black uppercase tracking-[0.2em]`} style={{
              color: stage === 3 ? '#fecaca' : '#fde68a',
              textShadow: stage === 3 ? '0 0 28px rgba(239,68,68,0.55)' : '0 0 24px rgba(245,158,11,0.45)',
            }}>
              {stageBanner}
            </div>
            <div className={`mt-2 ${isMobile ? 'text-xs' : 'text-sm'} uppercase tracking-[0.32em] text-orange-100/70`}>
              {stageDirective}
            </div>
          </div>
        </div>
      )}

      {/* ── Arrow Volley Warning ── */}
      {volleyWarning > 0 && (
        <div className="absolute top-[14%] left-1/2 -translate-x-1/2 z-[29] pointer-events-none">
          <div className={`px-5 py-2 ${isMobile ? 'text-sm' : 'text-lg'} font-black uppercase tracking-[0.2em] text-red-100`} style={{
            background: 'rgba(127,29,29,0.75)',
            border: '1px solid rgba(248,113,113,0.8)',
            textShadow: '0 0 14px rgba(248,113,113,0.8)',
          }}>
            ⚠ {t.ui.volleyIncoming}
          </div>
        </div>
      )}

      {/* ── Kill Streak Banner ── */}
      {streakBannerTimer > 0 && streakBanner && (
        <div className="absolute top-[22%] left-1/2 -translate-x-1/2 z-[28] pointer-events-none" style={{
          opacity: streakBannerTimer > 1.8 ? (2.2 - streakBannerTimer) * 2.5 : streakBannerTimer > 0.4 ? 1 : streakBannerTimer * 2.5,
          transform: `translateX(-50%) scale(${streakBannerTimer > 1.8 ? 1.3 - (streakBannerTimer - 1.8) * 0.5 : 1})`,
        }}>
          <div className="text-center">
            <div className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-black uppercase tracking-[0.25em]`} style={{
              color: streakBanner === 'legendary' ? '#c084fc' : streakBanner === 'unstoppable' ? '#f87171' : '#fb923c',
              textShadow: '0 0 26px rgba(239,68,68,0.6)',
            }}>
              {(t as any).streaks?.[streakBanner] ?? streakBanner}
            </div>
            <div className={`mt-1 ${isMobile ? 'text-xs' : 'text-sm'} font-bold uppercase tracking-[0.4em] text-orange-100/80`}>
              {killStreak} ⚔
            </div>
          </div>
        </div>
      )}

      {/* ── Objective Banner (persistent) ── */}
      {gameElapsed < 90 && (
        <div className={`absolute ${isMobile ? 'top-8' : 'top-4'} left-1/2 -translate-x-1/2 z-10 pointer-events-none`}>
          <div className={`px-4 py-1.5 rounded-full ${isMobile ? 'text-[10px]' : 'text-xs'} font-bold uppercase tracking-widest`} style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(249,115,22,0.3)',
            color: '#fdba74',
          }}>
            ⚔ {(t as any).tutorial?.objective || 'HOLD THE PASS — Survive'} {Math.floor(timeRemaining / 60)}:{String(Math.floor(timeRemaining % 60)).padStart(2, '0')}
          </div>
        </div>
      )}

      {/* ── Tutorial Prompts ── */}
      {tutorialStep < 5 && gameElapsed < 30 && (
        <div className={`absolute ${isMobile ? 'bottom-16' : 'bottom-20'} left-1/2 -translate-x-1/2 z-20 pointer-events-none`}>
          <div className={`px-5 py-2.5 rounded-lg ${isMobile ? 'text-sm' : 'text-base'} font-bold text-center`} style={{
            background: 'rgba(0,0,0,0.7)',
            border: '1.5px solid rgba(249,115,22,0.4)',
            color: '#fde68a',
            boxShadow: '0 0 20px rgba(0,0,0,0.5)',
            animation: 'combo-entrance 0.4s ease-out',
          }}>
            {tutorialStep === 0 && (isMobile ? ((t as any).tutorial?.moveMobile || 'Joystick to Move') : ((t as any).tutorial?.move || 'WASD to Move'))}
            {tutorialStep === 1 && (isMobile ? ((t as any).tutorial?.lookMobile || 'Drag to Look') : ((t as any).tutorial?.look || 'Mouse to Look Around'))}
            {tutorialStep === 2 && (isMobile ? ((t as any).tutorial?.attackMobile || 'Tap ATK') : ((t as any).tutorial?.attack || 'Click to Strike'))}
            {tutorialStep === 3 && (isMobile ? ((t as any).tutorial?.blockMobile || 'Tap Block') : ((t as any).tutorial?.block || 'Right-Click to Block'))}
            {tutorialStep === 4 && (isMobile ? ((t as any).tutorial?.dodgeMobile || 'Tap Dodge') : ((t as any).tutorial?.dodge || 'Space to Dodge'))}
          </div>
        </div>
      )}

      {/* ── Stat Labels (first 20 seconds) ── */}
      {gameElapsed < 20 && (
        <div className="absolute z-5 pointer-events-none" style={{
          top: isMobile ? '60px' : '120px',
          left: isMobile ? '2px' : '6px',
          paddingLeft: isMobile ? 'var(--sai-left)' : undefined,
        }}>
          <div className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} text-orange-200/50 space-y-1`} style={{
            opacity: Math.max(0, 1 - gameElapsed / 20),
          }}>
            <div>← {(t as any).tutorial?.healthLabel || 'Health'}</div>
            <div>← {(t as any).tutorial?.staminaLabel || 'Stamina'}</div>
            <div>← {(t as any).tutorial?.valorLabel || 'Valor'}</div>
          </div>
        </div>
      )}
    </>
  );
};

export default React.memo(HUD);
