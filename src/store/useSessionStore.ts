import { create } from 'zustand';
import { getDisplayName, AuthUserLike } from '../utils/format';

type SessionState = {
  isLoggedIn: boolean;
  userId: string | null;
  displayName: string | null;
  profile: { full_name?: string | null; phone?: string | null } | null;
  postLoginIntent: { action: string; params?: any } | null;
  setSession: (userId: string, displayName?: string | null) => void;
  setProfile: (profile: { full_name?: string | null; phone?: string | null } | null, authUser?: AuthUserLike | null) => void;
  clearSession: () => void;
  setPostLoginIntent: (intent: { action: string; params?: any } | null) => void;
  consumePostLoginIntent: () => { action: string; params?: any } | null;
};

export const useSessionStore = create<SessionState>((set) => ({
  isLoggedIn: false,
  userId: null,
  displayName: null,
  profile: null,
  postLoginIntent: null,
  setSession: (userId: string, displayName?: string | null) =>
    set({ isLoggedIn: true, userId, displayName: displayName ?? null }),
  setProfile: (profile, authUser) =>
    set((state) => ({
      profile,
      displayName: getDisplayName(profile, authUser) ?? state.displayName ?? null,
    })),
  clearSession: () => set({ isLoggedIn: false, userId: null, displayName: null, profile: null }),
  setPostLoginIntent: (intent) => set({ postLoginIntent: intent }),
  consumePostLoginIntent: () => {
    let current: any = null;
    set((state) => {
      current = state.postLoginIntent;
      return { postLoginIntent: null } as any;
    });
    return current;
  },
}));

// TODO: Persist session to storage in a later phase
