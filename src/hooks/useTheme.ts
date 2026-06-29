import { useEffect, useState } from 'react';

import type { ThemeConfig, ThemeKey } from '../types';

type RealThemeKey = Exclude<ThemeKey, 'auto'>;

export const THEMES: Record<ThemeKey, ThemeConfig> = {
  sticker: { file: '/themes/sticker.css', label: 'Sticker Pack', emoji: '🎨' },
  warm:    { file: '/themes/warm.css',    label: 'Cálido',       emoji: '☀️' },
  night:   { file: '/themes/night.css',   label: 'Noche',        emoji: '🌙' },
  auto:    { file: '',                    label: 'Auto',         emoji: '🌓' },
};

const THEME_KEY = 'finangel:theme';

const AUTO_NIGHT_START = 18;
const AUTO_NIGHT_END   = 6;

function getAutoTheme(): RealThemeKey {
  const h = new Date().getHours();
  return (h >= AUTO_NIGHT_START || h < AUTO_NIGHT_END) ? 'night' : 'warm';
}

export const useTheme = () => {
  const [storedTheme, setStoredTheme] = useState<ThemeKey>(() => {
    const saved = localStorage.getItem(THEME_KEY) as ThemeKey;
    if (saved === 'pastel') return 'warm';
    return saved || 'sticker';
  });

  const [autoTheme, setAutoTheme] = useState<RealThemeKey>(getAutoTheme);

  const isAutoMode = storedTheme === 'auto';
  const effectiveTheme: RealThemeKey = isAutoMode ? autoTheme : storedTheme as RealThemeKey;

  // Update autoTheme every minute when in auto mode
  useEffect(() => {
    if (!isAutoMode) return;
    const id = setInterval(() => setAutoTheme(getAutoTheme()), 60_000);
    return () => clearInterval(id);
  }, [isAutoMode]);

  // Re-sync autoTheme when entering auto mode
  useEffect(() => {
    if (isAutoMode) setAutoTheme(getAutoTheme());
  }, [isAutoMode]);

  useEffect(() => {
    document.querySelectorAll('[data-fa-theme]').forEach(el => el.remove());

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = THEMES[effectiveTheme].file;
    link.setAttribute('data-fa-theme', effectiveTheme);
    document.head.appendChild(link);

    localStorage.setItem(THEME_KEY, storedTheme);
  }, [effectiveTheme, storedTheme]);

  return {
    theme: effectiveTheme,
    selectedTheme: storedTheme,
    setTheme: setStoredTheme,
    themes: THEMES,
    isAutoMode,
  };
};
