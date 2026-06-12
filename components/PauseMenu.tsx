
import React from 'react';
import type { Strings } from '../localization/strings';

interface PerkOption {
  id: string;
  name: string;
  desc: string;
}

const PERK_STYLE: Record<string, { color: string; icon: string }> = {
  blade: { color: '#ef4444', icon: '⚔️' },
  spirit: { color: '#3b82f6', icon: '💨' },
  valor: { color: '#f97316', icon: '🔥' },
  stride: { color: '#22c55e', icon: '👢' },
  bloodlust: { color: '#dc2626', icon: '🩸' },
  aegis: { color: '#a8a29e', icon: '🛡️' },
  swift: { color: '#06b6d4', icon: '🦅' },
  focus: { color: '#eab308', icon: '🎯' },
};

interface PauseMenuProps {
  t: Strings;
  paused: boolean;
  showPerkChoice: boolean;
  showControls: boolean;
  showQuitConfirm: boolean;
  perkOptions: PerkOption[];
  isMobile?: boolean;
  onSelectPerk: (id: string) => void;
  onResume: () => void;
  onShowControls: () => void;
  onShowQuit: () => void;
  onCloseControls: () => void;
  onOpenStore?: () => void;
  onQuit: () => void;
  onCancelQuit: () => void;
}

const PauseMenu: React.FC<PauseMenuProps> = ({
  t, paused, showPerkChoice, showControls, showQuitConfirm,
  perkOptions, isMobile, onSelectPerk, onResume, onShowControls, onShowQuit,
  onCloseControls, onOpenStore, onQuit, onCancelQuit,
}) => {
  return (
    <>
      {showPerkChoice && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
          <div className={`w-full max-w-3xl border-2 border-orange-900/60 bg-zinc-900/90 ${isMobile ? 'p-3 mx-2' : 'p-8'} text-center shadow-[0_0_60px_rgba(0,0,0,0.7)]`}>
            <div className={`${isMobile ? 'text-[9px]' : 'text-xs'} uppercase tracking-[0.5em] text-orange-200/70`}>{t.ui.choosePath}</div>
            <div className={`${isMobile ? 'mt-1 text-xl' : 'mt-4 text-3xl'} font-black uppercase text-orange-100`}>{t.ui.perkUnlocked}</div>
            <div className={`${isMobile ? 'mt-1 text-[10px]' : 'mt-3 text-xs'} uppercase tracking-[0.24em] text-orange-200/60`}>
              Choose one upgrade. The fight resumes immediately.
            </div>
            <div className={`${isMobile ? 'mt-2' : 'mt-6'} grid gap-2 grid-cols-3`}>
              {perkOptions.map(option => (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => onSelectPerk(option.id)}
                  className={`bg-black/40 ${isMobile ? 'px-2 py-2' : 'px-4 py-6'} text-left text-orange-100 hover:bg-orange-500/20 transition-all`}
                  style={{
                    border: '1px solid rgba(249,115,22,0.5)',
                    borderTop: `3px solid ${PERK_STYLE[option.id]?.color ?? '#22c55e'}`,
                  }}
                >
                  <div className={`${isMobile ? 'text-[10px]' : 'text-sm'} uppercase tracking-[0.25em]`}>
                    <span className="mr-1">{PERK_STYLE[option.id]?.icon ?? '⚔️'}</span>
                    {option.name}
                  </div>
                  <div className={`${isMobile ? 'mt-1 text-[9px]' : 'mt-3 text-xs'} uppercase tracking-[0.2em] text-orange-200/80`}>{option.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {paused && !showControls && !showQuitConfirm && !showPerkChoice && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className={`w-full max-w-lg border-2 border-orange-900/60 bg-zinc-900/90 ${isMobile ? 'p-4 mx-3' : 'p-8'} text-center shadow-[0_0_60px_rgba(0,0,0,0.7)]`}>
            <div className={`${isMobile ? 'text-[10px]' : 'text-sm'} uppercase tracking-[0.4em] text-orange-200/70`}>{t.ui.paused}</div>
            <div className={`${isMobile ? 'mt-2 text-xl' : 'mt-4 text-3xl'} font-black uppercase text-orange-100`}>{t.ui.holdLine}</div>
            <div className={`${isMobile ? 'mt-3' : 'mt-6'} flex flex-wrap justify-center gap-3`}>
              <button
                onClick={onResume}
                className={`${isMobile ? 'px-4 py-2' : 'px-6 py-3'} border border-orange-500 text-orange-200 hover:bg-orange-500 hover:text-black transition-all font-bold uppercase tracking-widest text-xs`}
              >
                {t.ui.resume}
              </button>
              <button
                onClick={onShowControls}
                className={`${isMobile ? 'px-4 py-2' : 'px-6 py-3'} border border-orange-500/70 text-orange-200 hover:bg-orange-500 hover:text-black transition-all font-bold uppercase tracking-widest text-xs`}
              >
                {t.ui.controls}
              </button>
              {onOpenStore && (
                <button
                  onClick={onOpenStore}
                  className={`${isMobile ? 'px-4 py-2' : 'px-6 py-3'} border border-yellow-500/70 text-yellow-200 hover:bg-yellow-500 hover:text-black transition-all font-bold uppercase tracking-widest text-xs`}
                >
                  Coin Shop
                </button>
              )}
              <button
                onClick={onShowQuit}
                className={`${isMobile ? 'px-4 py-2' : 'px-6 py-3'} border border-red-500/70 text-red-200 hover:bg-red-500 hover:text-black transition-all font-bold uppercase tracking-widest text-xs`}
              >
                {t.ui.quit}
              </button>
            </div>
          </div>
        </div>
      )}

      {showControls && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className={`w-full max-w-2xl border-2 border-orange-900/60 bg-zinc-900/90 ${isMobile ? 'p-4 mx-3' : 'p-8'} shadow-[0_0_60px_rgba(0,0,0,0.7)]`}>
            <div className="text-xs uppercase tracking-[0.5em] text-orange-200/70">{t.ui.controls}</div>
            {isMobile ? (
              <div className="mt-3 text-left">
                <div className="text-[10px] uppercase tracking-[0.5em] text-orange-200/50 mb-1">Movement</div>
                <div className="grid gap-1 text-xs uppercase tracking-[0.2em] text-orange-100 grid-cols-2 mb-3">
                  <div>Left Joystick — Move</div>
                  <div>Center Area — Look</div>
                  <div>Dodge Button — Dodge</div>
                </div>
                <div className="text-[10px] uppercase tracking-[0.5em] text-orange-200/50 mb-1">Combat</div>
                <div className="grid gap-1 text-xs uppercase tracking-[0.2em] text-orange-100 grid-cols-2 mb-3">
                  <div>ATK Button — Strike</div>
                  <div>Block Button — Block</div>
                  <div>Valor Button — Valor Strike</div>
                  <div>Auto Pill — Auto-Attack</div>
                </div>
                <div className="text-[9px] uppercase tracking-[0.25em] text-orange-200/60">
                  Valor fills on hits. When full, the Valor button appears with a golden glow.
                </div>
              </div>
            ) : (
              <div className="mt-4 text-left">
                <div className="text-[10px] uppercase tracking-[0.5em] text-orange-200/50 mb-2">Movement</div>
                <div className="grid gap-2 text-sm uppercase tracking-[0.3em] text-orange-100 md:grid-cols-2 mb-4">
                  <div>W A S D — Move</div>
                  <div>Mouse — Look</div>
                  <div>Space — Dodge</div>
                </div>
                <div className="text-[10px] uppercase tracking-[0.5em] text-orange-200/50 mb-2">Combat</div>
                <div className="grid gap-2 text-sm uppercase tracking-[0.3em] text-orange-100 md:grid-cols-2 mb-4">
                  <div>Left Click — Strike</div>
                  <div>Right Click — Block</div>
                  <div>V — Valor Strike (when ready)</div>
                </div>
                <div className="text-[10px] uppercase tracking-[0.5em] text-orange-200/50 mb-2">System</div>
                <div className="grid gap-2 text-sm uppercase tracking-[0.3em] text-orange-100 md:grid-cols-2">
                  <div>P — Pause</div>
                  <div>C — Controls</div>
                  <div>Q — Quit</div>
                </div>
                <div className="mt-5 text-xs uppercase tracking-[0.35em] text-orange-200/70">
                  Valor fills on hits. When the bar is full, press V to unleash a strike.
                </div>
              </div>
            )}
            <div className={`${isMobile ? 'mt-3' : 'mt-6'} flex justify-end`}>
              <button
                onClick={onCloseControls}
                className={`${isMobile ? 'px-4 py-2' : 'px-6 py-3'} border border-orange-500 text-orange-200 hover:bg-orange-500 hover:text-black transition-all font-bold uppercase tracking-widest text-xs`}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {showQuitConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className={`w-full max-w-lg border-2 border-red-900/60 bg-zinc-900/95 ${isMobile ? 'p-4 mx-3' : 'p-8'} text-center shadow-[0_0_60px_rgba(0,0,0,0.7)]`}>
            <div className="text-xs uppercase tracking-[0.5em] text-red-200/70">{t.ui.quit}</div>
            <div className={`${isMobile ? 'mt-2 text-lg' : 'mt-4 text-2xl'} font-bold text-red-100`}>{t.ui.quitConfirm}</div>
            <div className={`${isMobile ? 'mt-3' : 'mt-6'} flex flex-wrap justify-center gap-3`}>
              <button
                onClick={onQuit}
                className={`${isMobile ? 'px-4 py-2' : 'px-6 py-3'} border border-red-500 text-red-200 hover:bg-red-500 hover:text-black transition-all font-bold uppercase tracking-widest text-xs`}
              >
                {t.ui.quitToMenu}
              </button>
              <button
                onClick={onCancelQuit}
                className={`${isMobile ? 'px-4 py-2' : 'px-6 py-3'} border border-orange-500 text-orange-200 hover:bg-orange-500 hover:text-black transition-all font-bold uppercase tracking-widest text-xs`}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PauseMenu;
