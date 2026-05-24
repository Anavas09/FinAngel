import { useState } from 'react';
import { DEFAULT_TWEAKS, LS_TWEAKS_KEY } from '../data/constants';
import { loadState, saveState } from '../data/utils';

export const useTweaks = () => {
  const [tweaks, setTweaksState] = useState(() => ({
    ...DEFAULT_TWEAKS,
    ...(loadState(LS_TWEAKS_KEY) || {}),
  }));

  const setTweak = (key, value) => {
    setTweaksState(prev => {
      const next = { ...prev, [key]: value };
      saveState(LS_TWEAKS_KEY, next);
      return next;
    });
  };

  return [tweaks, setTweak];
};
