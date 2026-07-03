
import React, { useState, useRef, useCallback } from 'react';

export type MobileControlsProps = {
  onMove: (x: number, y: number) => void;
  onMoveEnd: () => void;
  onLook: (dx: number, dy: number) => void;
  onAttack: (pressed: boolean) => void;
  onBlock: (pressed: boolean) => void;
  onDodge: (pressed: boolean) => void;
  onValor: (pressed: boolean) => void;
  rage: number;
};

const LOOK_SENSITIVITY = 1.0;

const ActionButton: React.FC<{
  label: string;
  onPress: (pressed: boolean) => void;
  toggle?: boolean;
  active?: boolean;
  color?: string;
  size?: number;
  glow?: boolean;
  pulseClass?: string;
}> = ({ label, onPress, toggle, active, color = 'orange', size = 56, glow, pulseClass }) => {
  const [pressed, setPressed] = useState(false);
  const isActive = toggle ? !!active : pressed;
  const borderColor = color === 'yellow' ? 'border-yellow-400/70' : 'border-orange-500/70';
  const activeBg = color === 'yellow' ? 'bg-yellow-500/60' : 'bg-orange-500/60';
  const borderWidth = size >= 80 ? 'border-[3px]' : 'border-2';
  const fontSize = size >= 80 ? 'text-sm' : size <= 48 ? 'text-[8px]' : 'text-[10px]';
  return (
    <button
      className={`rounded-full ${borderWidth} ${borderColor} text-orange-200 uppercase ${fontSize} font-bold tracking-wider transition-transform duration-75 touch-none select-none ${
        isActive ? `${activeBg} scale-90` : 'bg-black/40 scale-100'
      } ${pulseClass || ''}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        boxShadow: glow && isActive ? '0 0 16px rgba(249,115,22,0.5)' : undefined,
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        if (toggle) {
          onPress(!active);
        } else {
          setPressed(true);
          onPress(true);
        }
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        if (!toggle) {
          setPressed(false);
          onPress(false);
        }
      }}
      onTouchCancel={(e) => {
        e.preventDefault();
        if (!toggle) {
          setPressed(false);
          onPress(false);
        }
      }}
    >
      {label}
    </button>
  );
};

const MobileControls: React.FC<MobileControlsProps> = ({
  onMove,
  onMoveEnd,
  onLook,
  onAttack,
  onBlock,
  onDodge,
  onValor,
  rage,
}) => {
  const moveOrigin = useRef<{ x: number; y: number } | null>(null);
  const lookOrigin = useRef<{ x: number; y: number } | null>(null);
  const [stickOffset, setStickOffset] = useState({ x: 0, y: 0 });
  const [autoAttack, setAutoAttack] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleStickStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    moveOrigin.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleStickMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!moveOrigin.current) return;
    const touch = event.touches[0];
    const dx = touch.clientX - moveOrigin.current.x;
    const dy = touch.clientY - moveOrigin.current.y;
    const max = 50;
    const x = Math.max(-1, Math.min(1, dx / max));
    const y = Math.max(-1, Math.min(1, dy / max));
    setStickOffset({ x: x * 35, y: y * 35 });
    onMove(x, y);
  };

  const handleStickEnd = () => {
    moveOrigin.current = null;
    setStickOffset({ x: 0, y: 0 });
    onMoveEnd();
  };

  const handleLookStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    lookOrigin.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleLookMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!lookOrigin.current) return;
    const touch = event.touches[0];
    const dx = touch.clientX - lookOrigin.current.x;
    const dy = touch.clientY - lookOrigin.current.y;
    onLook(dx * LOOK_SENSITIVITY, dy * LOOK_SENSITIVITY);
    lookOrigin.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleLookEnd = () => {
    lookOrigin.current = null;
  };

  const toggleAutoAttack = useCallback((on: boolean) => {
    setAutoAttack(on);
    onAttack(on);
  }, [onAttack]);

  // Attack with long-press to toggle auto-attack
  const handleAttackStart = useCallback(() => {
    if (!autoAttack) onAttack(true);
    longPressTimer.current = setTimeout(() => {
      toggleAutoAttack(!autoAttack);
      longPressTimer.current = null;
    }, 600);
  }, [autoAttack, onAttack, toggleAutoAttack]);

  const handleAttackEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!autoAttack) onAttack(false);
  }, [autoAttack, onAttack]);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 30 }}>
      {/* Look area — center only, NOT overlapping controls */}
      <div
        className="absolute pointer-events-auto touch-none"
        style={{
          top: '50px',
          bottom: '50px',
          left: '170px',
          right: '180px',
          zIndex: 30,
        }}
        onTouchStart={handleLookStart}
        onTouchMove={handleLookMove}
        onTouchEnd={handleLookEnd}
        onTouchCancel={handleLookEnd}
      />

      {/* Joystick — vertically centered on left side */}
      <div
        className="absolute pointer-events-auto touch-none"
        style={{
          left: 'calc(10px + var(--sai-left))',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          border: '2px solid rgba(249,115,22,0.4)',
          background: 'rgba(0,0,0,0.2)',
          zIndex: 40,
        }}
        onTouchStart={handleStickStart}
        onTouchMove={handleStickMove}
        onTouchEnd={handleStickEnd}
        onTouchCancel={handleStickEnd}
      >
        <div
          className="absolute rounded-full bg-orange-500/50 border border-orange-400/70 transition-transform duration-75"
          style={{
            width: '52px',
            height: '52px',
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${stickOffset.x}px), calc(-50% + ${stickOffset.y}px))`,
          }}
        />
      </div>

      {/* Auto-attack pill toggle — below joystick */}
      <div
        className="absolute pointer-events-auto touch-none"
        style={{
          left: 'calc(55px + var(--sai-left))',
          top: 'calc(50% + 90px)',
          zIndex: 40,
        }}
      >
        <button
          className="touch-none select-none flex items-center justify-center"
          style={{
            width: '52px',
            height: '44px',
            background: 'transparent',
            border: 'none',
            padding: 0,
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            toggleAutoAttack(!autoAttack);
          }}
        >
          {/* pill visual — tap area is the larger transparent button around it */}
          <div
            className="flex items-center rounded-full transition-colors duration-150"
            style={{
              width: '40px',
              height: '24px',
              background: autoAttack ? 'rgba(234,179,8,0.6)' : 'rgba(0,0,0,0.4)',
              border: `1px solid ${autoAttack ? 'rgba(234,179,8,0.7)' : 'rgba(249,115,22,0.3)'}`,
              padding: '2px',
            }}
          >
            <div
              className="rounded-full transition-transform duration-150"
              style={{
                width: '18px',
                height: '18px',
                background: autoAttack ? '#fde047' : 'rgba(249,115,22,0.5)',
                transform: autoAttack ? 'translateX(16px)' : 'translateX(0)',
              }}
            />
          </div>
        </button>
        <div className="text-[7px] text-orange-200/60 text-center mt-0.5 uppercase tracking-wider">Auto</div>
      </div>

      {/* Right-side action buttons — diamond layout anchored to bottom-right */}
      <div
        className="absolute pointer-events-none"
        style={{
          right: 'calc(12px + var(--sai-right))',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '160px',
          height: '180px',
          zIndex: 42,
        }}
      >
        {/* ATK — center right */}
        <button
          className="absolute pointer-events-auto touch-none select-none rounded-full border-[3px] border-orange-500/70 text-orange-200 uppercase text-xs font-bold tracking-wider transition-transform duration-75 bg-black/40"
          style={{
            width: '64px',
            height: '64px',
            right: '0px',
            top: '50%',
            transform: 'translateY(-50%)',
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.6)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-50%) scale(0.9)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(249,115,22,0.5)';
            handleAttackStart();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.4)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-50%) scale(1)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            handleAttackEnd();
          }}
          onTouchCancel={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.4)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-50%) scale(1)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            handleAttackEnd();
          }}
        >
          ATK
        </button>

        {/* Block — left of ATK */}
        <div
          className="absolute pointer-events-auto"
          style={{
            right: '80px',
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        >
          <ActionButton label="Block" onPress={onBlock} size={48} />
        </div>

        {/* Dodge — below ATK */}
        <div
          className="absolute pointer-events-auto"
          style={{
            right: '8px',
            bottom: '0px',
          }}
        >
          <ActionButton label="Dodge" onPress={onDodge} size={48} />
        </div>

        {/* Valor — always visible, greyed when charging, gold when ready */}
        <div
          className="absolute pointer-events-auto"
          style={{
            right: '80px',
            top: '0px',
            opacity: rage >= 100 ? 1 : 0.35,
            animation: rage >= 100 ? 'valor-btn-pulse 1.5s ease-in-out infinite' : 'none',
            borderRadius: '50%',
          }}
        >
          <ActionButton label={rage >= 100 ? 'Valor' : `${Math.round(rage)}%`} onPress={rage >= 100 ? onValor : () => {}} size={48} color={rage >= 100 ? 'yellow' : 'default'} glow={rage >= 100} />
        </div>
      </div>
    </div>
  );
};

export default MobileControls;
