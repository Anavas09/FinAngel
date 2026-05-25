import { useState } from 'react';
import { DEFAULT_TWEAKS, LS_TWEAKS_KEY } from '../data/constants';
import { loadState, saveState } from '../data/utils';
import type { Tweaks } from '../types';

export const useTweaks = (): [Tweaks, <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void] => {
  const [tweaks, setTweaksState] = useState<Tweaks>(() => ({
    ...DEFAULT_TWEAKS,
    ...(loadState<Partial<Tweaks>>(LS_TWEAKS_KEY) ?? {}),
  }));

  const setTweak = <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => {
    setTweaksState(prev => {
      const next = { ...prev, [key]: value };
      saveState(LS_TWEAKS_KEY, next);
      return next;
    });
  };

  return [tweaks, setTweak];
};
