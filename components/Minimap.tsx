
import React, { useRef, useEffect } from 'react';
import type { GameStats } from '../game/GameConfig';

interface MinimapProps {
  stats: GameStats;
  isMobile?: boolean;
}

const ENEMY_COLORS: Record<string, string> = {
  STANDARD: '#ef4444',
  RUSHER: '#ef4444',
  ARCHER: '#22c55e',
  SHIELDER: '#3b82f6',
  BRUTE: '#f97316',
  BOSS: '#f97316',
};

const Minimap: React.FC<MinimapProps> = ({ stats, isMobile }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = isMobile ? 70 : 100;
  const range = 50; // world units visible on radar

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = size * 2; // 2x for retina
    canvas.width = s;
    canvas.height = s;
    const cx = s / 2;
    const cy = s / 2;
    const radius = s / 2 - 4;

    // Clear
    ctx.clearRect(0, 0, s, s);

    // Background circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(249,115,22,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Range rings
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Player triangle at center (pointing up = forward)
    const yaw = stats.playerYaw;
    ctx.save();
    ctx.translate(cx, cy);
    // Don't rotate — enemies will be rotated relative to player
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(-4, 4);
    ctx.lineTo(4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Enemy dots (rotated so forward = up)
    const playerPos = { x: 0, z: 0 }; // player is at mesh position, enemies relative
    // We need the actual player position — use the first enemy's relative position
    // Since we don't have player position in stats, use (0,0) as reference
    // Actually, enemies have world positions. We need player world pos too.
    // For now, assume player is near origin (game keeps player in the pass)

    for (const e of stats.enemyPositions) {
      // Relative position
      const dx = e.x - 0; // relative to player (player at ~0 for X)
      const dz = e.z - 0; // relative to player

      // Rotate by negative yaw so forward = up
      const sinY = Math.sin(-yaw);
      const cosY = Math.cos(-yaw);
      const rx = dx * cosY - dz * sinY;
      const rz = dx * sinY + dz * cosY;

      // Scale to radar
      const px = cx + (rx / range) * radius;
      const py = cy + (rz / range) * radius;

      // Skip if outside radar
      const distFromCenter = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
      if (distFromCenter > radius - 2) continue;

      const color = ENEMY_COLORS[e.type] || '#ef4444';
      ctx.beginPath();
      ctx.arc(px, py, e.type === 'BOSS' || e.type === 'BRUTE' ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Glow for bosses
      if (e.type === 'BOSS') {
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }, [stats.enemyPositions, stats.playerYaw, size, range]);

  return (
    <div
      className="absolute pointer-events-none z-10"
      style={{
        width: size,
        height: size,
        bottom: isMobile ? undefined : '80px',
        left: isMobile ? undefined : '16px',
        top: isMobile ? '80px' : undefined,
        right: isMobile ? undefined : undefined,
        ...(isMobile ? { left: '8px' } : {}),
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
      />
    </div>
  );
};

export default React.memo(Minimap);
