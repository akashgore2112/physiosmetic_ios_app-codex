import { create } from 'zustand';

type Selection = {
  latitude: number;
  longitude: number;
  line1?: string;
  line2?: string;
  unit?: string;
  building?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  formatted_address?: string;
} | null;

type MapPickerState = {
  selection: Selection;
  setSelection: (s: Selection) => void;
  consumeSelection: () => Selection;
};

export const useMapPickerStore = create<MapPickerState>((set, get) => ({
  selection: null,
  setSelection: (s) => set({ selection: s }),
  consumeSelection: () => {
    const cur = get().selection;
    set({ selection: null });
    return cur;
  },
}));
