import { useState, useEffect } from 'react';
import type { ThemeConfig, ThemeKey } from '../types';

export const THEMES: Record<ThemeKey, ThemeConfig> = {
  sticker: { file: '/themes/sticker.css', label: 'Sticker Pack', emoji: '🎨' },
  warm:    { file: '/themes/warm.css',    label: 'Cálido',       emoji: '☀️' },
  night:   { file: '/themes/night.css',   label: 'Noche',        emoji: '🌙' },
  pastel:  { file: '/themes/pastel.css',  label: 'Pastel',       emoji: '🌸' },
};

const THEME_KEY = 'finangel:theme';

const AUTO_NIGHT_START = 18;
const AUTO_NIGHT_END   = 6;
const AUTO_THEMES = new Set<ThemeKey>(['night', 'pastel']);

function getAutoTheme(): ThemeKey {
  const h = new Date().getHours();
  return (h >= AUTO_NIGHT_START || h < AUTO_NIGHT_END) ? 'night' : 'pastel';
}

export const useTheme = () => {
  const [storedTheme, setStoredTheme] = useState<ThemeKey>(
    () => (localStorage.getItem(THEME_KEY) as ThemeKey) || 'sticker'
  );

  const [autoTheme, setAutoTheme] = useState<ThemeKey>(getAutoTheme);

  const isAutoMode = AUTO_THEMES.has(storedTheme);
  const effectiveTheme = isAutoMode ? autoTheme : storedTheme;

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
