
import React, { useState, useCallback, useRef, useEffect } from 'react';
import GameContainer from './components/GameContainer';
import type { PavankhindEngine } from './game/Engine';

export type GameStatus = 'START' | 'STORY' | 'PLAYING' | 'VISHAL' | 'WON' | 'LOST';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>('START');
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [health, setHealth] = useState(100);
  const [stamina, setStamina] = useState(100);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(300);
  const [combo, setCombo] = useState(0);
  const [rage, setRage] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [damageTaken, setDamageTaken] = useState(0);
  const [valorStrikes, setValorStrikes] = useState(0);
  const [wave, setWave] = useState(1);
  const [weaponLevel, setWeaponLevel] = useState(1);
  const [objectiveProgress, setObjectiveProgress] = useState(0);
  const [objectiveTarget, setObjectiveTarget] = useState(0);
  const [objectiveTimer, setObjectiveTimer] = useState(0);
  const [objectivesCompleted, setObjectivesCompleted] = useState(0);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [introAudioStarted, setIntroAudioStarted] = useState(false);
  const engineRef = useRef<PavankhindEngine | null>(null);

  const storyDialogue = [
    { speaker: "Shivaji Maharaj", text: "Baji, the Sultanate's numbers are overwhelming. I must reach Vishalgad to signal the resistance.", color: "text-orange-400" },
    { speaker: "Baji Prabhu", text: "Go, Maharaj. Speed is your shield. I shall turn this pass into a wall of steel.", color: "text-white" },
    { speaker: "Shivaji Maharaj", text: "300 against 10,000... This is a heavy burden I place on your shoulders, my brother.", color: "text-orange-400" },
    { speaker: "Baji Prabhu", text: "It is not a burden, but an honor. Till the third cannon sounds, not a single petal shall be crushed by their boots. Har Har Mahadev!", color: "text-white" }
  ];

  const handleGameEnd = useCallback((result: 'WON' | 'LOST') => {
    if (result === 'WON') {
      setStatus('VISHAL');
      return;
    }
    setStatus(result);
  }, []);

  const handleStatsUpdate = useCallback(
    (
      h: number,
      s: number,
      t: number,
      sc: number,
      c: number,
      r: number,
      mc: number,
      dt: number,
      vs: number,
      w: number,
      wl: number,
      op: number,
      ot: number,
      otimer: number,
      oc: number
    ) => {
    setHealth(h);
    setStamina(s);
    setTimeRemaining(t);
    setScore(sc);
    setCombo(c);
    setRage(r);
    setMaxCombo(mc);
    setDamageTaken(dt);
    setValorStrikes(vs);
    setWave(w);
    setWeaponLevel(wl);
    setObjectiveProgress(op);
    setObjectiveTarget(ot);
    setObjectiveTimer(otimer);
    setObjectivesCompleted(oc);
  }, []);

  const handleEngineReady = useCallback((engine: PavankhindEngine) => {
    engineRef.current = engine;
    engine.setMuted(muted);
  }, [muted]);

  const ensureIntroAudio = useCallback(() => {
    if (introAudioStarted) return;
    engineRef.current?.startIntroAudio();
    setIntroAudioStarted(true);
  }, [introAudioStarted]);

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
    }
  }, [status]);

  useEffect(() => {
    if (paused || showControls || showQuitConfirm || status === 'VISHAL' || status === 'WON' || status === 'LOST') {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    }
  }, [paused, showControls, showQuitConfirm, status]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (status !== 'PLAYING') return;
      const key = event.key.toLowerCase();
      if (key === 'p') {
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
  }, [status]);

  const portraitMap: Record<string, string> = {
    "Shivaji Maharaj": "/shivaji-maharaj.png",
    "Baji Prabhu": "/baji-prabhu.png",
  };

  const nextDialogue = () => {
    ensureIntroAudio();
    if (dialogueIndex < storyDialogue.length - 1) {
      setDialogueIndex(prev => prev + 1);
    } else {
      setStatus('PLAYING');
    }
  };

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

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1b0f0b');
    gradient.addColorStop(0.45, '#3b1c13');
    gradient.addColorStop(1, '#0b0705');
    ctx.fillStyle = gradient;

    ctx.fillStyle = '#f59e0b';
    ctx.font = '700 64px Cinzel, serif';
    ctx.fillText('PAVANKHIND', 80, 140);

    ctx.fillStyle = '#fde68a';
    ctx.font = '600 22px Spectral, serif';
    ctx.fillText('THE STAND OF THE 300', 80, 180);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 120px Spectral, serif';
    ctx.fillText(String(score), 80, 340);

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
    const fileName = `pavankhind-kills-${score}.png`;
    const shareUrl = 'https://pavankhind.bobhata.com';

    if (blob && navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Pavankhind',
            text: `I stood the pass. ${score} Sultanate elites slain. Har Har Mahadev.`,
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
  }, [score]);

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden font-spectral">
      <GameContainer 
        active={status === 'PLAYING' && !paused && !showControls && !showQuitConfirm} 
        onEnd={handleGameEnd} 
        onUpdateStats={handleStatsUpdate}
        onEngineReady={handleEngineReady}
        hideCursor={status === 'PLAYING' && !paused && !showControls && !showQuitConfirm}
      />
      <div className="absolute top-4 right-4 z-50">
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

      {status === 'PLAYING' && (
        <>
          <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
            <div className="w-64 h-6 bg-gray-900 border-2 border-orange-900 rounded-sm relative overflow-hidden">
              <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${health}%` }} />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase">Vitality</span>
            </div>
            <div className="w-64 h-4 bg-gray-900 border-2 border-orange-900 rounded-sm relative overflow-hidden">
              <div className="h-full bg-yellow-500 transition-all duration-300" style={{ width: `${stamina}%` }} />
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold uppercase">Spirit</span>
            </div>
            <div className="w-64 h-3 bg-gray-900 border-2 border-orange-900 rounded-sm relative overflow-hidden">
              <div className={`h-full transition-all duration-300 ${rage >= 100 ? 'bg-yellow-400' : 'bg-orange-500'}`} style={{ width: `${rage}%` }} />
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold uppercase">Valor</span>
            </div>
          </div>

          <div className="absolute top-6 right-6 z-10 text-right">
            <div className="text-4xl font-black text-orange-500 tracking-tighter">{score} ELITES SLAIN</div>
            <div className="mt-2 text-xs uppercase tracking-[0.4em] text-orange-200/70">Wave {wave}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.4em] text-orange-200/70">Weapon Lv {weaponLevel}</div>
          </div>

          {objectiveTarget > 0 && (
            <div className="absolute top-20 right-6 z-10 text-right">
              <div className="text-xs uppercase tracking-[0.35em] text-orange-200/70">Hold the Line</div>
              <div className="mt-2 w-48 h-2 bg-gray-900 border border-orange-900/60 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-orange-500 transition-all duration-200"
                  style={{ width: `${Math.min(100, (objectiveProgress / objectiveTarget) * 100)}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-orange-200/60">
                {Math.ceil(objectiveTimer)}s
              </div>
            </div>
          )}

          {combo > 1 && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 text-center">
              <div className="text-2xl font-black text-orange-200 tracking-widest">
                COMBO x{combo}
              </div>
            </div>
          )}

          {rage >= 100 && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 text-center">
              <div className="text-xs font-black text-yellow-300 tracking-[0.4em] uppercase">
                Valor Ready · Press V
              </div>
            </div>
          )}

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center pointer-events-none">
             <div className="text-3xl font-black text-white tabular-nums drop-shadow-lg">
                {Math.floor(timeRemaining / 60)}:{(Math.ceil(timeRemaining % 60)).toString().padStart(2, '0')}
             </div>
          </div>
          {health < 40 && <div className="absolute inset-0 pointer-events-none vignette-low-health" />}
        </>
      )}

      {status === 'START' && (
        <div className="absolute inset-0 z-20 overflow-hidden" onPointerDown={ensureIntroAudio}>
          <div className="absolute inset-0 intro-reference pointer-events-none" />
          <div className="absolute inset-0 intro-ember-field pointer-events-none" />
          <div className="absolute inset-0 intro-backdrop pointer-events-none" />
          <div className="relative h-full w-full px-6 py-10 md:px-16 md:py-14">
            <div className="mx-auto flex h-full w-full max-w-6xl items-center">
              <div className="intro-copy relative mr-auto flex w-full max-w-md flex-col justify-center text-left md:max-w-xl">
                <p className="text-xs uppercase tracking-[0.5em] text-orange-200/80">Swarajya Chronicles</p>
                <h1 className="mt-4 text-5xl font-black uppercase tracking-tight text-orange-400 md:text-7xl font-cinzel">
                  Pavankhind
                </h1>
                <p className="mt-2 text-sm uppercase tracking-[0.35em] text-orange-200/70">
                  The Stand of the 300
                </p>
                <p className="mt-6 text-lg text-orange-50/90">
                  The mountain pass trembles. Steel will speak. Hold the line until the third cannon cries.
                </p>
                <div className="mt-8 space-y-2 text-sm uppercase tracking-[0.4em] text-orange-200/60">
                  <div>Har Har Mahadev</div>
                  <div>Protect the King</div>
                </div>
                <div className="mt-10 flex flex-wrap gap-4">
                  <button
                    onClick={() => {
                      ensureIntroAudio();
                      setStatus('STORY');
                    }}
                    className="px-10 py-4 bg-gradient-to-r from-orange-700 via-red-700 to-red-900 text-white text-lg font-black tracking-widest border-b-4 border-red-950 active:translate-y-1"
                  >
                    WITNESS THE VOW
                  </button>
                  <button
                    onClick={() => setShowControls(true)}
                    className="px-8 py-4 border border-orange-500/70 text-orange-200 hover:bg-orange-500 hover:text-black transition-all font-bold uppercase tracking-widest text-sm"
                  >
                    CONTROLS
                  </button>
                  <div className="flex items-center gap-3 rounded border border-orange-400/40 px-4 py-3 text-xs uppercase tracking-[0.35em] text-orange-200/70">
                    Mouse to look, click to strike
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {status === 'STORY' && (
        <div className="absolute inset-0 z-40 overflow-hidden">
          <div className="absolute inset-0 intro-backdrop opacity-90 pointer-events-none" />
          <div className="absolute inset-0 intro-ember-field pointer-events-none" />
          <div className="relative flex h-full w-full items-center justify-center px-6 py-12 md:px-12">
            <div className="grid w-full max-w-5xl grid-cols-1 gap-8 md:grid-cols-[0.7fr_1.3fr] md:gap-10">
              <div className="flex items-center justify-center">
                <div
                  className="story-portrait w-full max-w-xs md:max-w-sm"
                  style={{ backgroundImage: `url(${portraitMap[storyDialogue[dialogueIndex].speaker] || '/pavankhind-reference.png'})` }}
                  role="img"
                  aria-label={`${storyDialogue[dialogueIndex].speaker} portrait`}
                />
              </div>
              <div className="w-full border-2 border-orange-900/50 bg-zinc-900/80 p-8 md:p-10 shadow-[0_0_60px_rgba(0,0,0,0.7)]">
                <h3 className={`text-xs font-bold uppercase tracking-[0.45em] mb-4 ${storyDialogue[dialogueIndex].color}`}>
                  {storyDialogue[dialogueIndex].speaker}
                </h3>
                <p className="text-2xl md:text-3xl font-medium leading-tight mb-10 text-orange-50">
                  "{storyDialogue[dialogueIndex].text}"
                </p>
                <button
                  onClick={nextDialogue}
                  className="px-8 py-3 border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black transition-all font-bold uppercase tracking-widest text-sm"
                >
                  {dialogueIndex === storyDialogue.length - 1 ? "DRAW YOUR BLADE" : "CONTINUE"}
                </button>
                <button
                  onClick={() => setShowControls(true)}
                  className="ml-4 px-6 py-3 border border-orange-500/70 text-orange-200 hover:bg-orange-500 hover:text-black transition-all font-bold uppercase tracking-widest text-xs"
                >
                  CONTROLS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {status === 'PLAYING' && paused && !showControls && !showQuitConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-lg border-2 border-orange-900/60 bg-zinc-900/90 p-8 text-center shadow-[0_0_60px_rgba(0,0,0,0.7)]">
            <div className="text-sm uppercase tracking-[0.4em] text-orange-200/70">Paused</div>
            <div className="mt-4 text-3xl font-black uppercase text-orange-100">Hold the Line</div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setPaused(false)}
                className="px-6 py-3 border border-orange-500 text-orange-200 hover:bg-orange-500 hover:text-black transition-all font-bold uppercase tracking-widest text-xs"
              >
                Resume (P)
              </button>
              <button
                onClick={() => {
                  setPaused(true);
                  setShowControls(true);
                }}
                className="px-6 py-3 border border-orange-500/70 text-orange-200 hover:bg-orange-500 hover:text-black transition-all font-bold uppercase tracking-widest text-xs"
              >
                Controls (C)
              </button>
              <button
                onClick={() => {
                  setPaused(true);
                  setShowQuitConfirm(true);
                }}
                className="px-6 py-3 border border-red-500/70 text-red-200 hover:bg-red-500 hover:text-black transition-all font-bold uppercase tracking-widest text-xs"
              >
                Quit (Q)
              </button>
            </div>
          </div>
        </div>
      )}

      {showControls && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-2xl border-2 border-orange-900/60 bg-zinc-900/90 p-8 shadow-[0_0_60px_rgba(0,0,0,0.7)]">
            <div className="text-xs uppercase tracking-[0.5em] text-orange-200/70">Controls</div>
              <div className="mt-4 grid gap-4 text-sm uppercase tracking-[0.3em] text-orange-100 md:grid-cols-2">
                <div>W A S D — Move</div>
                <div>Mouse — Look</div>
                <div>Left Click — Strike</div>
                <div>Right Click — Block</div>
                <div>Space — Dodge</div>
                <div>V — Valor Strike (when ready)</div>
                <div>P — Pause</div>
                <div>C — Controls</div>
                <div>Q — Quit</div>
              </div>
            <div className="mt-5 text-xs uppercase tracking-[0.35em] text-orange-200/70">
              Valor fills on hits. When the bar is full, press V to unleash a strike.
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowControls(false);
                  if (status === 'PLAYING') setPaused(false);
                }}
                className="px-6 py-3 border border-orange-500 text-orange-200 hover:bg-orange-500 hover:text-black transition-all font-bold uppercase tracking-widest text-xs"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {showQuitConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-full max-w-lg border-2 border-red-900/60 bg-zinc-900/95 p-8 text-center shadow-[0_0_60px_rgba(0,0,0,0.7)]">
            <div className="text-xs uppercase tracking-[0.5em] text-red-200/70">Quit Run</div>
            <div className="mt-4 text-2xl font-bold text-red-100">Leave the battlefield?</div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 border border-red-500 text-red-200 hover:bg-red-500 hover:text-black transition-all font-bold uppercase tracking-widest text-xs"
              >
                Quit to Menu
              </button>
              <button
                onClick={() => {
                  setShowQuitConfirm(false);
                  if (status === 'PLAYING') setPaused(false);
                }}
                className="px-6 py-3 border border-orange-500 text-orange-200 hover:bg-orange-500 hover:text-black transition-all font-bold uppercase tracking-widest text-xs"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {status === 'VISHAL' && (
        <div className="absolute inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 intro-reference pointer-events-none" />
          <div className="absolute inset-0 intro-ember-field pointer-events-none" />
          <div className="absolute inset-0 intro-backdrop pointer-events-none" />
          <div className="relative flex h-full w-full items-center justify-center px-6 py-12 text-center">
            <div className="max-w-3xl border-2 border-orange-900/60 bg-zinc-900/80 p-10 shadow-[0_0_60px_rgba(0,0,0,0.7)]">
              <div className="text-xs uppercase tracking-[0.5em] text-orange-200/70">Vishalgad</div>
              <h2 className="mt-4 text-4xl md:text-5xl font-black uppercase text-orange-100">Shivaji Maharaj Reaches Vishalgad</h2>
              <p className="mt-6 text-lg text-orange-50/90">
                The signal is sent. The pass holds. History turns with your stand.
              </p>
              <button
                onClick={() => setStatus('WON')}
                className="mt-8 px-8 py-4 border border-orange-500 text-orange-200 hover:bg-orange-500 hover:text-black transition-all font-bold uppercase tracking-widest text-sm"
              >
                View Scorecard
              </button>
            </div>
          </div>
        </div>
      )}

      {(status === 'WON' || status === 'LOST') && (
        <div className="absolute inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 intro-reference pointer-events-none" />
          <div className="absolute inset-0 intro-ember-field pointer-events-none" />
          <div className="absolute inset-0 intro-backdrop pointer-events-none" />
          <div className="relative flex h-full w-full items-center justify-center px-6 py-12 text-center">
            <div className="w-full max-w-4xl border-2 border-orange-900/60 bg-zinc-900/80 p-10 shadow-[0_0_60px_rgba(0,0,0,0.7)]">
              <h2 className="text-4xl md:text-5xl font-bold italic text-orange-100 uppercase">
                {status === 'WON' ? "The King is Safe" : "Baji Prabhu has Fallen"}
              </h2>
              <div className="mt-6 text-3xl font-black text-orange-500">{score} Sultanate Elites Slain</div>
              <div className="mt-6 grid gap-4 text-sm uppercase tracking-[0.3em] text-orange-200/80 md:grid-cols-3">
                <div>Max Combo: {maxCombo}</div>
                <div>Damage Taken: {Math.round(damageTaken)}</div>
                <div>Valor Strikes: {valorStrikes}</div>
              </div>
              <div className="mt-4 text-xs uppercase tracking-[0.35em] text-orange-200/60">
                Objectives Completed: {objectivesCompleted}
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs uppercase tracking-[0.3em] text-orange-100">
                {damageTaken < 40 && <span className="px-3 py-1 border border-orange-500/50">Wall of Steel</span>}
                {maxCombo >= 8 && <span className="px-3 py-1 border border-orange-500/50">Relentless</span>}
                {valorStrikes >= 1 && <span className="px-3 py-1 border border-orange-500/50">Valorous</span>}
                {objectivesCompleted >= 1 && <span className="px-3 py-1 border border-orange-500/50">Banner Holder</span>}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={handleShareDownload}
                  className="px-8 py-4 bg-gradient-to-r from-orange-700 via-red-700 to-red-900 text-white text-sm font-black uppercase tracking-widest"
                >
                  Share Card
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-8 py-4 border-2 border-orange-800 text-orange-500 hover:bg-orange-950 font-bold uppercase tracking-widest text-sm"
                >
                  Return to Swarajya
                </button>
              </div>
              <p className="mt-6 text-xs uppercase tracking-[0.4em] text-orange-200/70">
                Har Har Mahadev
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
