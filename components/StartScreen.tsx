
import React from 'react';
import type { Strings } from '../localization/strings';

interface StartScreenProps {
  t: Strings;
  isMobile?: boolean;
  ensureIntroAudio: () => void;
  onPlay: () => void;
  onShowControls: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ t, isMobile, ensureIntroAudio, onPlay, onShowControls }) => (
  <div className="absolute inset-0 z-20 overflow-hidden" onPointerDown={ensureIntroAudio}>
    <div className="absolute inset-0 intro-reference pointer-events-none" />
    <div className="absolute inset-0 intro-ember-field pointer-events-none" />
    <div className="absolute inset-0 intro-backdrop pointer-events-none" />
    <div className={`relative h-full w-full ${isMobile ? 'px-6 py-2' : 'px-6 py-10 md:px-16 md:py-14'}`}>
      <div className="mx-auto flex h-full w-full max-w-6xl items-center">
        <div className={`intro-copy relative flex w-full flex-col justify-center text-left ${isMobile ? 'max-w-lg mx-auto' : 'mr-auto max-w-md md:max-w-xl'}`}>
          <p className={`${isMobile ? 'text-xs' : 'text-xs'} uppercase tracking-[0.5em] text-orange-200/80`}>{t.start.subtitle}</p>
          <h1 className={`mt-2 font-black uppercase tracking-tight text-orange-400 font-cinzel ${isMobile ? 'text-5xl' : 'text-5xl md:text-7xl'}`}>
            {t.start.title}
          </h1>
          <p className={`mt-1 ${isMobile ? 'text-sm' : 'text-sm'} uppercase tracking-[0.35em] text-orange-200/70`}>
            {t.start.tagline}
          </p>
          {!isMobile && (
            <p className="mt-6 text-lg text-orange-50/90">
              {t.start.description}
            </p>
          )}
          {!isMobile && (
            <div className="mt-8 space-y-2 text-sm uppercase tracking-[0.4em] text-orange-200/60">
              <div>{t.ui.harHarMahadev}</div>
            </div>
          )}
          <div className={`${isMobile ? 'mt-5' : 'mt-10'} flex flex-wrap gap-3`}>
            <button
              onClick={() => {
                ensureIntroAudio();
                onPlay();
              }}
              className={`${isMobile ? 'px-8 py-4 text-base' : 'px-10 py-4 text-lg'} bg-gradient-to-r from-orange-700 via-red-700 to-red-900 text-white font-black tracking-widest border-b-4 border-red-950 active:translate-y-1`}
            >
              {t.start.witnessVow}
            </button>
            <button
              onClick={onShowControls}
              className={`${isMobile ? 'px-6 py-3 text-xs' : 'px-8 py-4 text-sm'} border border-orange-500/70 text-orange-200 hover:bg-orange-500 hover:text-black transition-all btn-juice font-bold uppercase tracking-widest`}
            >
              {t.ui.controls}
            </button>
            {!isMobile && (
              <div className="flex items-center gap-3 rounded border border-orange-400/40 px-4 py-3 text-xs uppercase tracking-[0.35em] text-orange-200/70">
                {t.ui.desktopHint}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default StartScreen;
