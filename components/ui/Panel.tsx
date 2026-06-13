import React from 'react';

type Accent = 'amber' | 'red' | 'gold';

const ACCENTS: Record<Accent, { border: string; line: string; corner: string }> = {
  amber: { border: 'rgba(120,53,15,0.65)', line: 'linear-gradient(90deg, transparent, #f59e0b, transparent)', corner: 'rgba(245,158,11,0.65)' },
  gold:  { border: 'rgba(133,100,20,0.65)', line: 'linear-gradient(90deg, transparent, #fbbf24, transparent)', corner: 'rgba(251,191,36,0.7)' },
  red:   { border: 'rgba(127,29,29,0.7)',  line: 'linear-gradient(90deg, transparent, #ef4444, transparent)', corner: 'rgba(239,68,68,0.7)' },
};

const Bracket: React.FC<{ pos: 'tl' | 'tr' | 'bl' | 'br'; color: string }> = ({ pos, color }) => {
  const base: React.CSSProperties = { position: 'absolute', width: 14, height: 14, pointerEvents: 'none' };
  const map = {
    tl: { top: -1, left: -1, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
    tr: { top: -1, right: -1, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` },
    bl: { bottom: -1, left: -1, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
    br: { bottom: -1, right: -1, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` },
  } as const;
  return <div style={{ ...base, ...map[pos] }} />;
};

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  accent?: Accent;
}

/** Unified framed panel: gradient fill, accent border + top line, corner brackets, depth shadow. */
export const Panel: React.FC<PanelProps> = ({ children, className = '', accent = 'amber' }) => {
  const a = ACCENTS[accent];
  return (
    <div className={`relative panel-enter ${className}`} style={{
      background: 'linear-gradient(160deg, rgba(28,25,23,0.94) 0%, rgba(12,10,9,0.93) 100%)',
      border: `2px solid ${a.border}`,
      boxShadow: '0 0 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.045)',
    }}>
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: a.line }} />
      <Bracket pos="tl" color={a.corner} />
      <Bracket pos="tr" color={a.corner} />
      <Bracket pos="bl" color={a.corner} />
      <Bracket pos="br" color={a.corner} />
      {children}
    </div>
  );
};
