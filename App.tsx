
import React, { useState, useCallback, useRef, useEffect } from 'react';
import GameContainer from './components/GameContainer';
import HUD from './components/HUD';
import StartScreen from './components/StartScreen';
import StoryScreen from './components/StoryScreen';
import ModeSelectScreen from './components/ModeSelectScreen';
import PauseMenu from './components/PauseMenu';
import Scorecard from './components/Scorecard';
import MobileControls from './components/MobileControls';
import type { PavankhindEngine } from './game/Engine';
import type { GameStats } from './game/GameConfig';
import { GAME_MODES } from './game/GameConfig';
import { loadProfile, processRunEnd } from './game/Progression';
import type { PlayerProfile } from './game/Progression';
import { strings } from './localization/strings';
import type { Lang } from './localization/strings';
import { getDailyConfig, completeDailyChallenge } from './game/DailyChallenge';
import { checkAchievements } from './game/Achievements';
import type { Achievement } from './game/Achievements';
import AchievementToast from './components/AchievementToast';
import { AdManager } from './monetization/AdManager';
import StoreScreen from './components/StoreScreen';
import BattlePassScreen from './components/BattlePassScreen';
import { addSeasonKills } from './monetization/BattlePass';

export type GameStatus = 'START' | 'STORY' | 'MODE_SELECT' | 'PLAYING' | 'VISHAL' | 'WON' | 'LOST';

const defaultStats: GameStats = {
  health: 100, stamina: 100, timeRemaining: 300, score: 0, combo: 0, rage: 0,
  maxCombo: 0, damageTaken: 0, valorStrikes: 0, wave: 1, weaponLevel: 1,
  perkReady: false, perkTimer: 60, archerWarning: 0,
  objectiveProgress: 0, objectiveTarget: 0, objectiveTimer: 0, objectivesCompleted: 0,
};

const perkOptions = [
  { id: 'blade', name: 'Blade of Bhavani', desc: '+20% damage' },
  { id: 'spirit', name: 'Steel Spirit', desc: '+40% stamina regen + heal' },
  { id: 'valor', name: 'War Cry', desc: '+30% Valor gain' },
];

const portraitMap: Record<string, string> = {
  "Shivaji Maharaj": "/shivaji-maharaj.png",
  "Baji Prabhu": "/baji-prabhu.png",
};

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>('START');
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [stats, setStats] = useState<GameStats>(defaultStats);
  const [selectedModeKey, setSelectedModeKey] = useState<string>('skirmish');
  const [showPerkChoice, setShowPerkChoice] = useState(false);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [introAudioStarted, setIntroAudioStarted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile>(loadProfile);
  const [lastRunCoins, setLastRunCoins] = useState(0);
  const [lastRunNewBest, setLastRunNewBest] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [lang, setLang] = useState<Lang>('mr');
  const [isDailyMode, setIsDailyMode] = useState(false);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [canDoubleCoins, setCanDoubleCoins] = useState(true);
  const [showStore, setShowStore] = useState(false);
  const [showBattlePass, setShowBattlePass] = useState(false);
  const engineRef = useRef<PavankhindEngine | null>(null);
  const statsRef = useRef<GameStats>(defaultStats);
  const selectedModeKeyRef = useRef(selectedModeKey);
  const mutedRef = useRef(muted);
  const isDailyRef = useRef(false);
  statsRef.current = stats;
  selectedModeKeyRef.current = selectedModeKey;
  mutedRef.current = muted;
  isDailyRef.current = isDailyMode;

  const t = strings[lang];
  const storyDialogue = t.storyDialogue;

  const handleGameEnd = useCallback((result: 'WON' | 'LOST') => {
    const currentProfile = loadProfile();
    const s = statsRef.current;
    const runResult = {
      modeKey: selectedModeKeyRef.current,
      score: s.score,
      won: result === 'WON',
      objectivesCompleted: s.objectivesCompleted,
    };
    const { coins, newBest } = processRunEnd(currentProfile, runResult);
    let totalCoins = coins;

    if (isDailyRef.current) {
      const daily = completeDailyChallenge(s.score);
      totalCoins += daily.bonusCoins;
      currentProfile.currency += daily.bonusCoins;
    }

    setProfile(currentProfile);
    setLastRunCoins(totalCoins);
    setLastRunNewBest(newBest);

    // Track season kills for battle pass
    addSeasonKills(s.score);

    const achCtx = {
      totalKills: currentProfile.totalKills,
      totalRuns: currentProfile.totalRuns,
      runScore: s.score,
      runMaxCombo: s.maxCombo,
      runDamageTaken: s.damageTaken,
      runValorStrikes: s.valorStrikes,
      runObjectives: s.objectivesCompleted,
      runWon: result === 'WON',
      modesCompleted: Object.keys(currentProfile.bestScore).filter(k => (currentProfile.bestScore[k] ?? 0) > 0),
    };
    const unlocked = checkAchievements(achCtx);
    if (unlocked.length > 0) {
      setNewAchievements(unlocked);
    }

    if (result === 'WON') {
      setStatus('VISHAL');
      return;
    }
    setStatus(result);
  }, []);

  const handleStatsUpdate = useCallback((s: GameStats) => {
    setStats(s);
  }, []);

  const handleEngineReady = useCallback((engine: PavankhindEngine) => {
    engineRef.current = engine;
    engine.setMuted(mutedRef.current);
  }, []);

  const ensureIntroAudio = useCallback(() => {
    if (introAudioStarted) return;
    engineRef.current?.startIntroAudio();
    setIntroAudioStarted(true);
  }, [introAudioStarted]);

  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    engineRef.current?.setMuted(muted);
    if (!engineRef.current) return;
    if (muted) {
      engineRef.current.stopIntroAudio();
      return;
    }
    if (introAudioStarted && (status === 'START' || status === 'STORY')) {
      engineRef.current.startIntroAudio();
    }
  }, [muted, introAudioStarted, status]);

  useEffect(() => {
    if (status !== 'PLAYING') {
      setPaused(false);
      setShowControls(false);
      setShowQuitConfirm(false);
      setShowPerkChoice(false);
    }
  }, [status]);

  useEffect(() => {
    if (paused || showControls || showQuitConfirm || showPerkChoice || status === 'VISHAL' || status === 'WON' || status === 'LOST') {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    }
  }, [paused, showControls, showQuitConfirm, showPerkChoice, status]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (status !== 'PLAYING') return;
      if (showPerkChoice) return;
      const key = event.key.toLowerCase();
      if (key === 'p' || key === 'escape') {
        setPaused(prev => !prev);
        setShowControls(false);
        setShowQuitConfirm(false);
      } else if (key === 'c') {
        setPaused(true);
        setShowControls(true);
        setShowQuitConfirm(false);
      } else if (key === 'q') {
        setPaused(true);
        setShowQuitConfirm(true);
        setShowControls(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [status, showPerkChoice]);

  useEffect(() => {
    if (status !== 'PLAYING') return;
    if (stats.perkReady && !showPerkChoice) {
      setPaused(true);
      setShowPerkChoice(true);
    }
  }, [stats.perkReady, showPerkChoice, status]);

  const selectPerk = useCallback((id: string) => {
    engineRef.current?.applyPerk(id);
    setShowPerkChoice(false);
    setPaused(false);
  }, []);

  const setKey = useCallback((key: string, pressed: boolean) => {
    engineRef.current?.setVirtualKey(key, pressed);
  }, []);

  const setMouseButton = useCallback((button: number, pressed: boolean) => {
    engineRef.current?.setVirtualMouseButton(button, pressed);
  }, []);

  const addLook = useCallback((dx: number, dy: number) => {
    engineRef.current?.addVirtualLook(dx, dy);
  }, []);

  const nextDialogue = useCallback(() => {
    ensureIntroAudio();
    if (dialogueIndex < storyDialogue.length - 1) {
      setDialogueIndex(prev => prev + 1);
    } else {
      setStatus('MODE_SELECT');
    }
  }, [ensureIntroAudio, dialogueIndex, storyDialogue.length]);

  const skipAllDialogue = useCallback(() => {
    ensureIntroAudio();
    setStatus('MODE_SELECT');
  }, [ensureIntroAudio]);

  const handleSelectMode = useCallback((key: string) => {
    setSelectedModeKey(key);
    setIsDailyMode(false);
    setCanDoubleCoins(true);
    setStats(defaultStats);
    setGameKey(k => k + 1);
    setStatus('PLAYING');
  }, []);

  const handleSelectDaily = useCallback(() => {
    setSelectedModeKey('daily');
    setIsDailyMode(true);
    setCanDoubleCoins(true);
    setStats(defaultStats);
    setGameKey(k => k + 1);
    setStatus('PLAYING');
  }, []);

  const handleDoubleCoins = useCallback(() => {
    AdManager.getInstance().showRewardedAd('double_coins', (rewarded) => {
      if (rewarded) {
        setCanDoubleCoins(false);
        setLastRunCoins(prev => {
          const bonus = prev;
          const p = loadProfile();
          p.currency += bonus;
          setProfile({ ...p });
          return prev * 2;
        });
      }
    });
  }, []);

  const handleShareDownload = useCallback(async () => {
    const canvas = document.createElement('canvas');
    const width = 1200;
    const height = 630;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const backgroundUrl = '/pavankhind-reference.png';
    const background = new Image();
    background.crossOrigin = 'anonymous';
    const backgroundLoaded = new Promise<void>((resolve) => {
      background.onload = () => resolve();
      background.onerror = () => resolve();
    });
    background.src = backgroundUrl;
    await backgroundLoaded;

    if (background.complete && background.naturalWidth > 0) {
      const scale = Math.max(width / background.naturalWidth, height / background.naturalHeight);
      const drawWidth = background.naturalWidth * scale;
      const drawHeight = background.naturalHeight * scale;
      const offsetX = (width - drawWidth) * 0.5;
      const offsetY = (height - drawHeight) * 0.5;
      ctx.drawImage(background, offsetX, offsetY, drawWidth, drawHeight);
      ctx.fillStyle = 'rgba(8, 5, 4, 0.6)';
      ctx.fillRect(0, 0, width, height);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#1b0f0b');
      gradient.addColorStop(0.45, '#3b1c13');
      gradient.addColorStop(1, '#0b0705');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.fillStyle = 'rgba(249, 115, 22, 0.2)';
    ctx.beginPath();
    ctx.ellipse(220, 120, 200, 120, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.font = '700 64px Cinzel, serif';
    ctx.fillText('PAVANKHIND', 80, 140);

    ctx.fillStyle = '#fde68a';
    ctx.font = '600 22px Spectral, serif';
    ctx.fillText('THE STAND OF THE 300', 80, 180);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 120px Spectral, serif';
    ctx.fillText(String(stats.score), 80, 340);

    ctx.fillStyle = '#f59e0b';
    ctx.font = '700 36px Spectral, serif';
    ctx.fillText('SULTANATE ELITES SLAIN', 80, 390);

    ctx.fillStyle = '#fca5a5';
    ctx.font = '500 22px Spectral, serif';
    ctx.fillText('Har Har Mahadev', 80, 440);

    ctx.fillStyle = '#fde68a';
    ctx.font = '600 24px Spectral, serif';
    ctx.fillText('Play now →', 80, 520);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 26px Spectral, serif';
    ctx.fillText('https://pavankhind.bobhata.com', 200, 520);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    const fileName = `pavankhind-kills-${stats.score}.png`;
    const shareUrl = 'https://pavankhind.bobhata.com';

    if (blob && navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Pavankhind',
            text: `I stood the pass. ${stats.score} Sultanate elites slain. Har Har Mahadev.`,
            url: shareUrl,
            files: [file],
          });
          return;
        } catch {
          // fall through to download
        }
      }
    }

    if (blob) {
      const link = document.createElement('a');
      link.download = fileName;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    }
  }, [stats.score]);

  const isPlaying = status === 'PLAYING';
  const gameActive = isPlaying && !paused && !showControls && !showQuitConfirm && !showPerkChoice;

  return (
    <div className="relative w-full bg-black text-white overflow-hidden font-spectral game-root">
      <GameContainer
        key={gameKey}
        active={gameActive}
        onEnd={handleGameEnd}
        onUpdateStats={handleStatsUpdate}
        onEngineReady={handleEngineReady}
        hideCursor={gameActive}
        gameConfig={isDailyMode ? getDailyConfig() : GAME_MODES[selectedModeKey]}
      />
      <div className={`absolute top-4 right-4 z-50 flex gap-2 ${isPlaying ? 'hidden' : ''}`}>
        <button
          onClick={() => setLang(l => l === 'mr' ? 'en' : 'mr')}
          className="flex items-center justify-center w-10 h-10 rounded-full border border-orange-500/70 bg-black/40 text-orange-200 hover:bg-orange-500 hover:text-black transition-all text-xs font-bold"
          aria-label="Toggle language"
        >
          {lang === 'mr' ? 'EN' : 'मर'}
        </button>
        <button
          onClick={() => setMuted(prev => !prev)}
          className="flex items-center justify-center w-10 h-10 rounded-full border border-orange-500/70 bg-black/40 text-orange-200 hover:bg-orange-500 hover:text-black transition-all"
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
            {muted ? (
              <path d="M4 9v6h4l5 4V5L8 9H4zm12.59-3.41L15.17 7l2.83 2.83L15.17 12l1.42 1.41L19 10.83l2.83 2.83L23.25 12l-2.83-2.83 2.83-2.83L21.83 4l-2.83 2.83L16.17 4l-.58 1.59z" />
            ) : (
              <path d="M4 9v6h4l5 4V5L8 9H4zm9.5 3a3.5 3.5 0 0 0-1.5-2.87v5.74A3.5 3.5 0 0 0 13.5 12zm0-7a8.5 8.5 0 0 0-3.5-6.9v2.3A6.5 6.5 0 0 1 16 12a6.5 6.5 0 0 1-3.5 5.6v2.3A8.5 8.5 0 0 0 13.5 5z" />
            )}
          </svg>
        </button>
      </div>

      <AchievementToast achievements={newAchievements} lang={lang} />

      {isPlaying && <HUD stats={stats} t={t} isMobile={isMobile} onPause={() => setPaused(true)} />}

      {isPlaying && isMobile && gameActive && (
        <MobileControls
          onMove={(x, y) => {
            setKey('w', y < -0.2);
            setKey('s', y > 0.2);
            setKey('a', x < -0.2);
            setKey('d', x > 0.2);
          }}
          onMoveEnd={() => {
            setKey('w', false);
            setKey('s', false);
            setKey('a', false);
            setKey('d', false);
          }}
          onLook={(dx, dy) => addLook(dx, dy)}
          onAttack={(pressed) => setMouseButton(0, pressed)}
          onBlock={(pressed) => setMouseButton(2, pressed)}
          onDodge={(pressed) => setKey(' ', pressed)}
          onValor={(pressed) => setKey('v', pressed)}
          rage={stats.rage}
        />
      )}

      {status === 'START' && (
        <StartScreen
          t={t}
          isMobile={isMobile}
          ensureIntroAudio={ensureIntroAudio}
          onPlay={() => {
            ensureIntroAudio();
            setStatus('STORY');
          }}
          onShowControls={() => setShowControls(true)}
        />
      )}

      {status === 'STORY' && (
        <StoryScreen
          t={t}
          storyDialogue={storyDialogue}
          dialogueIndex={dialogueIndex}
          portraitMap={portraitMap}
          onNext={nextDialogue}
          onSkipAll={skipAllDialogue}
          onShowControls={() => setShowControls(true)}
        />
      )}

      {status === 'MODE_SELECT' && !showStore && !showBattlePass && (
        <ModeSelectScreen
          t={t}
          lang={lang}
          profile={profile}
          isMobile={isMobile}
          onSelectMode={handleSelectMode}
          onSelectDaily={handleSelectDaily}
          onOpenStore={() => setShowStore(true)}
          onOpenBattlePass={() => setShowBattlePass(true)}
        />
      )}

      {showStore && (
        <StoreScreen
          t={t}
          lang={lang}
          profile={profile}
          onProfileUpdate={(p) => setProfile(p)}
          onClose={() => setShowStore(false)}
        />
      )}

      {showBattlePass && (
        <BattlePassScreen
          t={t}
          lang={lang}
          profile={profile}
          onProfileUpdate={(p) => setProfile(p)}
          onClose={() => setShowBattlePass(false)}
        />
      )}

      <PauseMenu
        t={t}
        isMobile={isMobile}
        paused={isPlaying && paused}
        showPerkChoice={isPlaying && showPerkChoice}
        showControls={showControls}
        showQuitConfirm={isPlaying && showQuitConfirm}
        perkOptions={perkOptions}
        onSelectPerk={selectPerk}
        onResume={() => setPaused(false)}
        onShowControls={() => { setPaused(true); setShowControls(true); }}
        onShowQuit={() => { setPaused(true); setShowQuitConfirm(true); }}
        onCloseControls={() => { setShowControls(false); if (isPlaying) setPaused(false); }}
        onQuit={() => window.location.reload()}
        onCancelQuit={() => { setShowQuitConfirm(false); setPaused(false); }}
      />

      {(status === 'VISHAL' || status === 'WON' || status === 'LOST') && (
        <Scorecard
          t={t}
          status={status}
          stats={stats}
          profile={profile}
          lastRunCoins={lastRunCoins}
          lastRunNewBest={lastRunNewBest}
          canDoubleCoins={canDoubleCoins}
          isMobile={isMobile}
          onViewScorecard={() => setStatus('WON')}
          onShare={handleShareDownload}
          onPlayAgain={() => {
            setProfile(loadProfile());
            setStatus('MODE_SELECT');
          }}
          onDoubleCoins={handleDoubleCoins}
        />
      )}
    </div>
  );
};

export default App;
