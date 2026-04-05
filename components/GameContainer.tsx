
import React, { useRef, useEffect } from 'react';
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

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new PavankhindEngine(canvasRef.current, {
      onWin: () => onEndRef.current('WON'),
      onLoss: () => onEndRef.current('LOST'),
      onStatsUpdate: (s) => onUpdateStatsRef.current(s),
    }, gameConfig);

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

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${hideCursor ? 'cursor-none' : 'cursor-auto'}`}
    />
  );
};

export default GameContainer;
