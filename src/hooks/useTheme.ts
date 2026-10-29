import { useCallback, useState } from 'react';

export type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark',
  );

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try {
        localStorage.setItem('exorcist-theme', next);
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
