import { useState, useEffect } from 'react';

export const THEMES = {
  sticker: { file: '/themes/sticker.css', label: 'Sticker Pack', emoji: '🎨' },
  warm:    { file: '/themes/warm.css',    label: 'Cálido',       emoji: '☀️' },
  night:   { file: '/themes/night.css',   label: 'Noche',        emoji: '🌙' },
};

const THEME_KEY = 'finangel:theme';

export const useTheme = () => {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem(THEME_KEY) || 'sticker'
  );

  useEffect(() => {
    document.querySelectorAll('[data-fa-theme]').forEach(el => el.remove());

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = THEMES[theme]?.file || THEMES.sticker.file;
    link.setAttribute('data-fa-theme', theme);
    document.head.appendChild(link);

    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return { theme, setTheme: setThemeState, themes: THEMES };
};
