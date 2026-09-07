
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
    stage, stageProgress,
    stageDirective, stageBanner, stageBannerTimer, cannonSignals,
    recentPickup, pickupToastTimer,
    killStreak, streakBanner, streakBannerTimer,
    volleyWarning,
    objectiveKind, sardarStage, sardarBannerTimer, finaleActive,
  } = stats;

  const prevScoreRef = useRef(score);
  const scoreChanged = score !== prevScoreRef.current;

  const [killFloats, setKillFloats] = useState<{ id: number; key: number }[]>([]);
  const killIdRef = useRef(0);
  const [battleCry, setBattleCry] = useState<string | null>(null);
  const battleCryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Kill feedback: +1 floating number on score change. Update the ref AFTER the
  // check (not in a separate earlier effect, which would clobber it first).
  useEffect(() => {
    if (score > prevScoreRef.current) {
      const id = ++killIdRef.current;
      setKillFloats(prev => [...prev.slice(-4), { id, key: id }]);
      setTimeout(() => setKillFloats(prev => prev.filter(k => k.id !== id)), 800);
    }
    prevScoreRef.current = score;
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

  const comboColor = combo >= 9 ? '#c084fc' : combo >= 6 ? '#ef4444' : '#f97316';
  const comboLabel = combo >= 9 ? t.combo.mythic : combo >= 6 ? t.combo.onslaught : t.combo.fury;

  // Ceil the whole value first, then split — avoids "1:60" at minute boundaries.
  const timerTotal = Math.max(0, Math.ceil(timeRemaining));
  const timerSeconds = timerTotal % 60;
  const timerMinutes = Math.floor(timerTotal / 60);
  const timerLow = timeRemaining < 30;
  const timerCritical = timeRemaining < 10;

  return (
    <>
      {/* Mobile pause button — top-right, above all controls */}
      {isMobile && onPause && (
        <button
          onClick={onPause}
          className="absolute z-50 w-11 h-11 rounded-full flex items-center justify-center pointer-events-auto"
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

      {/* Health / Stamina / Valor bars — labels outside the fill (desktop) */}
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
        <div className="flex items-center gap-2">
          {!isMobile && <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-red-300/70 w-14 text-right">{t.ui.vitality}</span>}
          {isMobile && <div style={{ width: '3px', height: '14px', background: '#ef4444', borderRadius: '1px', flexShrink: 0 }} />}
          <div className={`${isMobile ? 'h-[16px]' : 'h-[18px]'} rounded-xs relative overflow-hidden`} style={{
            width: isMobile ? '118px' : '230px',
            background: 'linear-gradient(180deg, #1a0808 0%, #0d0404 100%)',
            border: '1px solid rgba(220,60,40,0.4)',
            boxShadow: `0 0 ${health < 40 ? '12px' : '6px'} rgba(220,60,40,${health < 40 ? 0.5 : 0.2})`,
          }}>
            <div className="h-full transition-all duration-300" style={{
              width: `${health}%`,
              background: 'linear-gradient(180deg, #ef4444 0%, #b91c1c 60%, #7f1d1d 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
            }} />
            <span className={`absolute right-1.5 top-1/2 -translate-y-1/2 ${isMobile ? 'text-[8px]' : 'text-[11px]'} font-black tabular-nums`}
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>{Math.round(health)}</span>
          </div>
        </div>

        {/* Stamina */}
        <div className="flex items-center gap-2">
          {!isMobile && <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-yellow-300/70 w-14 text-right">{t.ui.spirit}</span>}
          {isMobile && <div style={{ width: '3px', height: '8px', background: '#eab308', borderRadius: '1px', flexShrink: 0 }} />}
          <div className={`${isMobile ? 'h-[10px]' : 'h-[11px]'} rounded-xs relative overflow-hidden`} style={{
            width: isMobile ? '118px' : '230px',
            background: 'linear-gradient(180deg, #1a1400 0%, #0d0a00 100%)',
            border: '1px solid rgba(234,179,8,0.3)',
            boxShadow: '0 0 6px rgba(234,179,8,0.15)',
          }}>
            <div className="h-full transition-all duration-300" style={{
              width: `${stamina}%`,
              background: 'linear-gradient(180deg, #eab308 0%, #ca8a04 60%, #a16207 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
            }} />
          </div>
        </div>

        {/* Valor / Rage — glows + shows READY tag when full */}
        <div className="flex items-center gap-2">
          {!isMobile && <span className="text-[9px] font-bold uppercase tracking-[0.15em] w-14 text-right" style={{ color: rage >= 100 ? '#fde047' : 'rgba(249,115,22,0.7)' }}>{t.ui.valor}</span>}
          {isMobile && <div style={{ width: '3px', height: '6px', background: '#f97316', borderRadius: '1px', flexShrink: 0 }} />}
          <div className={`${isMobile ? 'h-[8px]' : 'h-[9px]'} rounded-xs relative overflow-hidden`} style={{
            width: isMobile ? '118px' : '230px',
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
          </div>
          {!isMobile && rage >= 100 && (
            <span className="text-[9px] font-black uppercase tracking-[0.15em] valor-ready-pulse" style={{ color: '#fde047', textShadow: '0 0 8px rgba(250,204,21,0.6)' }}>
              ▶ V
            </span>
          )}
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
        {/* Score — big number over label */}
        <div className="flex flex-col items-end leading-none">
          <span className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-black tabular-nums transition-transform duration-200`} style={{
            color: '#f97316',
            textShadow: '0 0 12px rgba(249,115,22,0.45)',
            transform: scoreChanged ? 'scale(1.12)' : 'scale(1)',
          }}>
            {score}
          </span>
          <span className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} uppercase tracking-[0.4em] text-orange-200/60 mt-0.5`}>{t.ui.elitesSlain}</span>
        </div>
        {!isMobile && (
          <div className="flex flex-col items-end gap-1 mt-1">
            <div className="h-px w-24 bg-gradient-to-l from-orange-500/40 to-transparent" />
            <div className="text-[10px] uppercase tracking-[0.32em] text-orange-200/70">{t.ui.weaponLv} {weaponLevel}</div>
            <div className="text-[10px] uppercase tracking-[0.32em] text-orange-200/55">
              {t.ui.nextPerk} {Math.ceil(perkTimer)}s
            </div>
          </div>
        )}
        {objectiveTarget > 0 && (
          <div className="pt-2 flex flex-col items-end">
            <div className={`${isMobile ? 'text-xs' : 'text-sm'} uppercase tracking-[0.3em] font-black`} style={{
              color: '#f59e0b',
              textShadow: '0 0 8px rgba(245,158,11,0.4)',
              animation: 'pulse-glow 2s ease-in-out infinite',
            }}>
              ⚑ {t.objectives[objectiveKind] ?? t.ui.holdTheLine}
            </div>
            <div className="mt-2 w-44 h-2.5 rounded-xs overflow-hidden" style={{
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
            {objectiveKind === 'slay' && (
              <div className="mt-1 text-[10px] uppercase tracking-[0.3em] font-bold text-orange-200/80">
                {Math.floor(objectiveProgress)} / {objectiveTarget}
              </div>
            )}
            <div className="mt-1 text-[10px] uppercase tracking-[0.3em] font-bold" style={{
              color: objectiveTimer < 5 ? '#ef4444' : '#fdba74',
              animation: objectiveTimer < 5 ? 'timer-pulse 0.5s ease-in-out infinite' : 'none',
            }}>
              {Math.ceil(objectiveTimer)}s
            </div>
          </div>
        )}
      </div>

      {/* Combo display — below the top-center cluster */}
      {combo > 1 && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-[15] text-center pointer-events-none"
          style={{ top: isMobile ? '72px' : '96px' }}
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

      {/* ── Top-center command cluster: stage·wave / timer / cannon + stage bar ── */}
      <div
        className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none z-[15] flex flex-col items-center"
        style={{ top: isMobile ? 'calc(4px + var(--sai-top))' : '10px' }}
      >
        {/* Stage · Wave context line */}
        <div className={`${isMobile ? 'text-[8px] tracking-[0.18em] max-w-[150px] truncate' : 'text-[10px] tracking-[0.4em]'} uppercase font-bold`} style={{
          color: stage === 3 ? '#fca5a5' : '#fcd34d',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        }}>
          {t.stages[stage]?.name} · {t.ui.wave} {wave}
        </div>
        {/* Timer */}
        <div className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-black tabular-nums leading-none mt-0.5`} style={{
          color: timerCritical ? '#ef4444' : timerLow ? '#f97316' : '#fff8ec',
          textShadow: timerCritical ? '0 0 14px rgba(239,68,68,0.7)' : '0 2px 6px rgba(0,0,0,0.7)',
          animation: timerCritical ? 'timer-pulse 0.5s ease-in-out infinite' : timerLow ? 'timer-pulse 1s ease-in-out infinite' : 'none',
        }}>
          {timerMinutes}:{timerSeconds.toString().padStart(2, '0')}
        </div>
        {/* Stage progress bar */}
        <div className={`mt-1 ${isMobile ? 'w-28' : 'w-40'} h-1 rounded-full overflow-hidden`} style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div className="h-full transition-all duration-200" style={{
            width: `${Math.max(0, Math.min(100, stageProgress * 100))}%`,
            background: stage === 3 ? 'linear-gradient(90deg, #ef4444, #facc15)' : 'linear-gradient(90deg, #f59e0b, #fde68a)',
          }} />
        </div>
        {/* Cannon signals — the win condition, 3 dots */}
        <div className="mt-1.5 flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className={`${isMobile ? 'h-2 w-2' : 'h-2.5 w-2.5'} rounded-full transition-all`} style={{
              background: i < cannonSignals ? '#fde68a' : 'rgba(0,0,0,0.5)',
              border: i < cannonSignals ? '1px solid rgba(253,230,138,0.9)' : '1px solid rgba(253,186,116,0.3)',
              boxShadow: i < cannonSignals ? '0 0 10px rgba(253,230,138,0.7)' : 'none',
            }} />
          ))}
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
        <div className={`absolute inset-0 flex justify-center z-30 pointer-events-none ${isMobile ? 'items-start pt-[16%]' : 'items-center'}`} style={{
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
                {t.tutorial.survivedWave} {wave - 1} — {t.ui.nowEntering} {wave}
              </div>
            )}
            <div className={`mt-3 ${isMobile ? 'text-xs' : 'text-sm'} uppercase tracking-[0.35em] text-yellow-100/65`}>
              {t.stages[stage]?.name}
            </div>
          </div>
        </div>
      )}

      {stageBannerTimer > 0 && stageBanner && (
        <div className={`absolute inset-0 flex justify-center z-[25] pointer-events-none ${isMobile ? 'items-start pt-[16%]' : 'items-center'}`} style={{
          opacity: stageBannerTimer > 2.8 ? (3.6 - stageBannerTimer) * 1.25 : stageBannerTimer > 0.6 ? 1 : stageBannerTimer * 1.6,
        }}>
          <div className="text-center">
            <div className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-black uppercase tracking-[0.2em]`} style={{
              color: finaleActive || stage === 3 ? '#fecaca' : '#fde68a',
              textShadow: finaleActive || stage === 3 ? '0 0 28px rgba(239,68,68,0.55)' : '0 0 24px rgba(245,158,11,0.45)',
            }}>
              {finaleActive ? t.finaleBanner : (t.stages[stage]?.name ?? stageBanner)}
            </div>
            {!finaleActive && (
              <div className={`mt-2 ${isMobile ? 'text-xs' : 'text-sm'} uppercase tracking-[0.32em] text-orange-100/70`}>
                {t.stages[stage]?.directive ?? stageDirective}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sardar Intro Banner ── */}
      {sardarBannerTimer > 0 && sardarStage > 0 && stageBannerTimer <= 0 && (
        <div className="absolute top-[16%] left-1/2 -translate-x-1/2 z-[27] pointer-events-none" style={{
          opacity: sardarBannerTimer > 2.6 ? (3.2 - sardarBannerTimer) * 1.7 : sardarBannerTimer > 0.5 ? 1 : sardarBannerTimer * 2,
        }}>
          <div className="text-center">
            <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-black uppercase tracking-[0.25em]`} style={{
              color: '#fda4af',
              textShadow: '0 0 24px rgba(225,29,72,0.6)',
            }}>
              ⚔ {t.sardars[sardarStage]?.title}
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
