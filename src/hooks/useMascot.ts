import { useMemo } from 'react';

import { MASCOT_COPY } from '../data/constants';

import type { MascotMood, MascotPersonality, MascotState } from '../types';

interface UseMascotResult {
  mascotMood: MascotState;
  mascotLine: string;
}

export const useMascot = (monthNet: number, incomeTotal: number, personality: MascotPersonality): UseMascotResult => {
  const mood: MascotMood = monthNet > incomeTotal * 0.2 ? 'great' : monthNet > 0 ? 'ok' : 'warn';
  const mascotMood: MascotState = ({ great: 'celebrating', ok: 'happy', warn: 'worried' } as const)[mood];
  const mascotLine = useMemo(() => {
    const lines = MASCOT_COPY[personality]?.[mood] ?? MASCOT_COPY.motivadora[mood];
    return lines[Math.floor(Math.random() * lines.length)];
  }, [personality, mood]);

  return { mascotMood, mascotLine };
};
