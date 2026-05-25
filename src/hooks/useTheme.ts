import { useState, useEffect } from 'react';
import type { ThemeConfig, ThemeKey } from '../types';

export const THEMES: Record<ThemeKey, ThemeConfig> = {
  sticker: { file: '/themes/sticker.css', label: 'Sticker Pack', emoji: '🎨' },
  warm:    { file: '/themes/warm.css',    label: 'Cálido',       emoji: '☀️' },
  night:   { file: '/themes/night.css',   label: 'Noche',        emoji: '🌙' },
};

const THEME_KEY = 'finangel:theme';

export const useTheme = () => {
  const [theme, setThemeState] = useState<ThemeKey>(
    () => (localStorage.getItem(THEME_KEY) as ThemeKey) || 'sticker'
  );

  useEffect(() => {
    document.querySelectorAll('[data-fa-theme]').forEach(el => el.remove());

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = THEMES[theme].file;
    link.setAttribute('data-fa-theme', theme);
    document.head.appendChild(link);

    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return { theme, setTheme: setThemeState, themes: THEMES };
};
