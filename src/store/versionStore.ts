import { create } from 'zustand';

export type AppVersion = 'v1' | 'v2' | 'v3';

export interface VersionInfo {
  id: AppVersion;
  label: string;
  description: string;
}

export const APP_VERSIONS: VersionInfo[] = [
  { id: 'v1', label: 'V1 standard', description: 'Version actuelle' },
  { id: 'v2', label: 'V2 specs Romain PP', description: 'Logique objectif/budget & sliders leviers modifiée' },
  { id: 'v3', label: 'V3 test jeff', description: 'Copie de la V1 standard' },
];

interface VersionState {
  activeVersion: AppVersion;
  setVersion: (version: AppVersion) => void;
}

export const useVersionStore = create<VersionState>((set) => ({
  activeVersion: 'v2',
  setVersion: (version) => set({ activeVersion: version }),
}));
