
import React, { useRef, useEffect, useState } from 'react';
import { PavankhindEngine } from '../game/Engine';
import type { GameStats } from '../game/GameConfig';
import type { GameConfig } from '../game/GameConfig';

interface GameContainerProps {
  active: boolean;
  onEnd: (result: 'WON' | 'LOST') => void;
  onUpdateStats: (stats: GameStats) => void;
  onEngineReady?: (engine: PavankhindEngine) => void;
  hideCursor?: boolean;
  gameConfig?: GameConfig;
}

const GameContainer: React.FC<GameContainerProps> = ({ active, onEnd, onUpdateStats, onEngineReady, hideCursor = true, gameConfig }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PavankhindEngine | null>(null);
  const onEndRef = useRef(onEnd);
  const onUpdateStatsRef = useRef(onUpdateStats);
  const onEngineReadyRef = useRef(onEngineReady);

  onEndRef.current = onEnd;
  onUpdateStatsRef.current = onUpdateStats;
  onEngineReadyRef.current = onEngineReady;

  const [initError, setInitError] = useState(false);
  const [runtimeError, setRuntimeError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    let engine: PavankhindEngine;
    try {
      engine = new PavankhindEngine(canvasRef.current, {
        onWin: () => onEndRef.current('WON'),
        onLoss: () => onEndRef.current('LOST'),
        onStatsUpdate: (s) => onUpdateStatsRef.current(s),
        onFatalError: () => setRuntimeError(true),
      }, gameConfig);
    } catch (err) {
      // WebGL unavailable (old device, blocked context) — show a message, not a black screen
      console.error('[GameContainer] engine init failed:', err);
      setInitError(true);
      return;
    }

    engineRef.current = engine;
    onEngineReadyRef.current?.(engine);

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setActive(active);
    }
  }, [active]);

  if (initError || runtimeError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-center px-6">
        <div>
          <div className="text-2xl font-black uppercase tracking-widest text-orange-200">Pavankhind</div>
          <div className="mt-3 text-sm text-orange-100/80">
            {initError
              ? 'Your browser could not start 3D graphics (WebGL). Try updating your browser or enabling hardware acceleration.'
              : 'The battle was interrupted by a graphics error. Reload to rejoin the pass.'}
          </div>
          {runtimeError && (
            <button
              onClick={() => window.location.reload()}
              className="mt-6 border border-orange-500/70 px-8 py-3 text-sm font-bold uppercase tracking-widest text-orange-200 transition-all hover:bg-orange-500 hover:text-black"
            >
              Reload
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${hideCursor ? 'cursor-none' : 'cursor-auto'}`}
    />
  );
};

export default GameContainer;
