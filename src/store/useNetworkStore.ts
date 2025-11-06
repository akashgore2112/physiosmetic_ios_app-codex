import { create } from 'zustand';

type NetState = {
  isOnline: boolean;
  setOnline: (v: boolean) => void;
};

export const useNetworkStore = create<NetState>((set) => ({
  // optimistic until first probe
  isOnline: true,
  setOnline: (v) => set({ isOnline: v }),
}));

export default useNetworkStore;
