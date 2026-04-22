import { create } from 'zustand';
import type { UserProfile } from '../types';

const STORAGE_KEY = 'tortank-profiles-v1';

export type { UserProfile };

interface ProfileState {
  profiles: UserProfile[];
  activeProfileId: string | null;
  profilePickerOpen: boolean;
  /** Sync storage after external edits */
  hydrate: () => void;
  addProfile: (pseudo: string, isAdmin: boolean) => string;
  setActiveProfile: (id: string | null) => void;
  removeProfile: (id: string) => void;
  openProfilePicker: () => void;
  closeProfilePicker: () => void;
}

function readStorage(): Pick<ProfileState, 'profiles' | 'activeProfileId'> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { profiles: [], activeProfileId: null };
    const data = JSON.parse(raw) as { profiles?: UserProfile[]; activeProfileId?: string | null };
    const profiles = Array.isArray(data.profiles) ? data.profiles : [];
    let activeProfileId = data.activeProfileId ?? null;
    if (activeProfileId && !profiles.some(p => p.id === activeProfileId)) {
      activeProfileId = null;
    }
    return { profiles, activeProfileId };
  } catch {
    return { profiles: [], activeProfileId: null };
  }
}

function writeStorage(profiles: UserProfile[], activeProfileId: string | null) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ profiles, activeProfileId }));
}

let idSeq = 0;
const newProfileId = () => `prof-${Date.now()}-${++idSeq}`;

const initial = readStorage();

export const useProfileStore = create<ProfileState>(set => ({
  profiles: initial.profiles,
  activeProfileId: initial.activeProfileId,
  profilePickerOpen: false,

  hydrate: () => set(readStorage()),

  addProfile: (pseudo, isAdmin) => {
    const id = newProfileId();
    const p: UserProfile = {
      id,
      pseudo: pseudo.trim() || 'Sans nom',
      isAdmin,
    };
    set(s => {
      const profiles = [...s.profiles, p];
      writeStorage(profiles, id);
      return { profiles, activeProfileId: id, profilePickerOpen: false };
    });
    return id;
  },

  setActiveProfile: id => {
    set(s => {
      const profiles = s.profiles;
      if (id !== null && !profiles.some(p => p.id === id)) {
        writeStorage(profiles, s.activeProfileId);
        return s;
      }
      writeStorage(profiles, id);
      return { activeProfileId: id, profilePickerOpen: false };
    });
  },

  removeProfile: id => {
    set(s => {
      const profiles = s.profiles.filter(x => x.id !== id);
      let activeProfileId = s.activeProfileId;
      if (activeProfileId === id) activeProfileId = null;
      writeStorage(profiles, activeProfileId);
      return { profiles, activeProfileId };
    });
  },

  openProfilePicker: () => set({ profilePickerOpen: true }),
  closeProfilePicker: () => set({ profilePickerOpen: false }),
}));

export function getActiveProfile(profiles: UserProfile[], activeProfileId: string | null): UserProfile | null {
  if (!activeProfileId) return null;
  return profiles.find(p => p.id === activeProfileId) ?? null;
}
