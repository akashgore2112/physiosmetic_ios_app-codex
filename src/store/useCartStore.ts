import { create } from 'zustand';

export type CartItem = {
  // Product id (stable)
  id: string;
  // Unique line id (includes variant if any): used as key for cart operations
  line_id: string;
  name: string;
  price: number;
  qty: number;
  image_url?: string | null;
  variant_id?: string | null;
  variant_label?: string | null;
};

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (lineId: string) => void;
  clearCart: () => void;
  total: () => number;
  inc: (lineId: string) => void;
  dec: (lineId: string) => void;
  count: () => number;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (item) =>
    set((state) => {
      const index = state.items.findIndex((i) => i.line_id === item.line_id);
      if (index >= 0) {
        const updated = [...state.items];
        const existing = updated[index];
        updated[index] = { ...existing, qty: existing.qty + item.qty };
        return { items: updated };
      }
      return { items: [...state.items, item] };
    }),
  removeItem: (lineId) =>
    set((state) => ({ items: state.items.filter((i) => i.line_id !== lineId) })),
  clearCart: () => set({ items: [] }),
  total: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
  inc: (lineId) =>
    set((state) => ({ items: state.items.map((i) => (i.line_id === lineId ? { ...i, qty: i.qty + 1 } : i)) })),
  dec: (lineId) =>
    set((state) => ({ items: state.items.map((i) => (i.line_id === lineId ? { ...i, qty: Math.max(1, i.qty - 1) } : i)) })),
  count: () => get().items.reduce((sum, i) => sum + i.qty, 0),
}));

// TODO: Connect to Supabase orders in a later phase
