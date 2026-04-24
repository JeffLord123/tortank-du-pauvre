import { create } from 'zustand';

const STORAGE_KEY = 'tortank-ui-prefs-v1';

export interface UiPreferencesState {
  /** Pulse sur les champs ciblés par l’alerte (défaut : désactivé) */
  alertFieldFlashesEnabled: boolean;
  setAlertFieldFlashesEnabled: (v: boolean) => void;
  hydrate: () => void;
}

function readStorage(): { alertFieldFlashesEnabled: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { alertFieldFlashesEnabled: false };
    const data = JSON.parse(raw) as { alertFieldFlashesEnabled?: boolean };
    return { alertFieldFlashesEnabled: data.alertFieldFlashesEnabled === true };
  } catch {
    return { alertFieldFlashesEnabled: false };
  }
}

function writeStorage(alertFieldFlashesEnabled: boolean) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ alertFieldFlashesEnabled }));
}

const initial = readStorage();

export const useUiPreferencesStore = create<UiPreferencesState>(set => ({
  alertFieldFlashesEnabled: initial.alertFieldFlashesEnabled,
  setAlertFieldFlashesEnabled: v => {
    set({ alertFieldFlashesEnabled: v });
    writeStorage(v);
  },
  hydrate: () => set(readStorage()),
}));
