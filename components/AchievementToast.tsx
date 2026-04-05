
import React, { useEffect, useState, useRef } from 'react';
import type { Achievement } from '../game/Achievements';
import type { Lang } from '../localization/strings';

interface AchievementToastProps {
  achievements: Achievement[];
  lang: Lang;
}

const AchievementToast: React.FC<AchievementToastProps> = ({ achievements, lang }) => {
  const [current, setCurrent] = useState<Achievement | null>(null);
  const queueRef = useRef<Achievement[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (achievements.length === 0) return;
    queueRef.current = [...achievements];
    // Initial delay before first toast
    timerRef.current = setTimeout(() => showNext(), 1500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [achievements]);

  const showNext = () => {
    if (queueRef.current.length === 0) {
      setCurrent(null);
      return;
    }
    const next = queueRef.current.shift()!;
    setCurrent(next);
    // Show each for 3s, then next after 2s gap
    timerRef.current = setTimeout(() => {
      setCurrent(null);
      timerRef.current = setTimeout(() => showNext(), 200);
    }, 3000);
  };

  if (!current) return null;

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[55] flex flex-col gap-2 pointer-events-none">
      <div
        key={current.id}
        className="animate-slide-down border border-yellow-500/70 bg-black/80 px-6 py-3 text-center shadow-[0_0_20px_rgba(234,179,8,0.3)]"
      >
        <div className="text-[10px] uppercase tracking-[0.5em] text-yellow-400/70">Achievement Unlocked</div>
        <div className="mt-1 text-sm font-bold text-yellow-100">
          {lang === 'mr' ? current.nameMr : current.name}
        </div>
        <div className="mt-1 text-[11px] text-yellow-200/60">
          {lang === 'mr' ? current.descMr : current.desc}
        </div>
      </div>
    </div>
  );
};

export default AchievementToast;
