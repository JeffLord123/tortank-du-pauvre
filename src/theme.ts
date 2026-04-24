export type Theme = 'light' | 'dark';

/** Clé localStorage ; garder alignée avec le script inline dans `app/layout.tsx`. */
export const THEME_STORAGE_KEY = 'lmp-theme';

export function getStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function initThemeFromStorage(): void {
  applyTheme(getStoredTheme());
}
