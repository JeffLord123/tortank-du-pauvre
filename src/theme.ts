export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'lmp-theme';

export function getStoredTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function initThemeFromStorage(): void {
  applyTheme(getStoredTheme());
}
