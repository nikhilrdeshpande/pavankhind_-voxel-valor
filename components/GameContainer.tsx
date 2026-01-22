
import React, { useRef, useEffect } from 'react';
import { PavankhindEngine } from '../game/Engine';

interface GameContainerProps {
  active: boolean;
  onEnd: (result: 'WON' | 'LOST') => void;
  // Fix: Updated to 6 arguments to match handleStatsUpdate in App.tsx and the Engine callback
  onUpdateStats: (
    health: number,
    stamina: number,
    timeRemaining: number,
    score: number,
    combo: number,
    rage: number,
    maxCombo: number,
    damageTaken: number,
    valorStrikes: number,
    wave: number,
    weaponLevel: number,
    objectiveProgress: number,
    objectiveTarget: number,
    objectiveTimer: number,
    objectivesCompleted: number
  ) => void;
  onEngineReady?: (engine: PavankhindEngine) => void;
  hideCursor?: boolean;
}

const GameContainer: React.FC<GameContainerProps> = ({ active, onEnd, onUpdateStats, onEngineReady, hideCursor = true }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PavankhindEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new PavankhindEngine(canvasRef.current, {
      onWin: () => onEnd('WON'),
      onLoss: () => onEnd('LOST'),
      onStatsUpdate: onUpdateStats,
    });
    
    engineRef.current = engine;
    onEngineReady?.(engine);

    return () => {
      engine.dispose();
    };
  }, [onEnd, onUpdateStats, onEngineReady]);

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
