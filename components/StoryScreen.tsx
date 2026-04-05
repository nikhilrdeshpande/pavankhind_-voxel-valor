
import React, { useEffect, useRef } from 'react';
import type { StoryLine, Strings } from '../localization/strings';

interface StoryScreenProps {
  t: Strings;
  storyDialogue: StoryLine[];
  dialogueIndex: number;
  portraitMap: Record<string, string>;
  onNext: () => void;
  onSkipAll: () => void;
  onShowControls: () => void;
}

const StoryScreen: React.FC<StoryScreenProps> = ({ t, storyDialogue, dialogueIndex, portraitMap, onNext, onSkipAll, onShowControls }) => {
  const line = storyDialogue[dialogueIndex];
  const isLast = dialogueIndex === storyDialogue.length - 1;
  const prevSpeakerRef = useRef(line.speaker);
  const speakerChanged = line.speaker !== prevSpeakerRef.current;

  useEffect(() => {
    prevSpeakerRef.current = line.speaker;
  }, [line.speaker]);

  return (
    <div className="absolute inset-0 z-40 overflow-hidden screen-enter">
      <div className="absolute inset-0 intro-backdrop opacity-90 pointer-events-none" />
      <div className="absolute inset-0 intro-ember-field pointer-events-none" />
      <div className="relative flex h-full w-full items-center justify-center px-4 py-6 md:px-12 md:py-12">
        <div className="grid w-full max-w-5xl grid-cols-1 gap-4 lg:grid-cols-[0.7fr_1.3fr] lg:gap-10 justify-items-center lg:justify-items-stretch">
          <div className={`hidden lg:flex items-center justify-center ${speakerChanged ? 'portrait-enter' : ''}`}>
            <div
              className="story-portrait w-full max-w-xs md:max-w-sm"
              style={{ backgroundImage: `url(${portraitMap[line.speaker] || '/pavankhind-reference.png'})` }}
              role="img"
              aria-label={`${line.speaker} portrait`}
            />
          </div>
          <div className="w-full max-w-2xl lg:max-w-none border-2 border-orange-900/50 bg-zinc-900/80 p-4 md:p-8 lg:p-10 shadow-[0_0_60px_rgba(0,0,0,0.7)]">
            <h3 className={`text-xs font-bold uppercase tracking-[0.45em] mb-4 ${line.color}`}>
              {line.speaker}
            </h3>
            <p className="text-base md:text-2xl lg:text-3xl font-medium leading-tight mb-4 md:mb-10 text-orange-50">
              &ldquo;{line.text}&rdquo;
            </p>
            <div className="flex flex-wrap gap-2 md:gap-4">
              <button
                onClick={onNext}
                className="px-6 py-2 md:px-8 md:py-3 border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black transition-all font-bold uppercase tracking-widest text-xs md:text-sm"
              >
                {isLast ? t.start.drawBlade : t.ui.continueBtn}
              </button>
              <button
                onClick={onSkipAll}
                className="px-4 py-2 md:px-6 md:py-3 border border-orange-500/70 text-orange-200 hover:bg-orange-500 hover:text-black transition-all font-bold uppercase tracking-widest text-[10px] md:text-xs"
              >
                {t.ui.continueBtn === 'पुढे चला' ? 'कथा वगळा' : 'SKIP STORY'}
              </button>
              <button
                onClick={onShowControls}
                className="px-4 py-2 md:px-6 md:py-3 border border-orange-500/70 text-orange-200 hover:bg-orange-500 hover:text-black transition-all font-bold uppercase tracking-widest text-[10px] md:text-xs"
              >
                CONTROLS
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryScreen;
