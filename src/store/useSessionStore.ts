import { create } from 'zustand';
import { getDisplayName, AuthUserLike } from '../utils/format';

type SessionState = {
  isLoggedIn: boolean;
  userId: string | null;
  displayName: string | null;
  profile: { full_name?: string | null; phone?: string | null } | null;
  setSession: (userId: string, displayName?: string | null) => void;
  setProfile: (profile: { full_name?: string | null; phone?: string | null } | null, authUser?: AuthUserLike | null) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  isLoggedIn: false,
  userId: null,
  displayName: null,
  profile: null,
  setSession: (userId: string, displayName?: string | null) =>
    set({ isLoggedIn: true, userId, displayName: displayName ?? null }),
  setProfile: (profile, authUser) =>
    set((state) => ({
      profile,
      displayName: getDisplayName(profile, authUser) ?? state.displayName ?? null,
    })),
  clearSession: () => set({ isLoggedIn: false, userId: null, displayName: null, profile: null }),
}));

// TODO: Persist session to storage in a later phase
