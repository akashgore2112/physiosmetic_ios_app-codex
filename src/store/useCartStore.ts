import { create } from 'zustand';

export type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  image_url?: string | null;
};

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  total: () => number;
  inc: (itemId: string) => void;
  dec: (itemId: string) => void;
  count: () => number;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (item) =>
    set((state) => {
      const index = state.items.findIndex((i) => i.id === item.id);
      if (index >= 0) {
        const updated = [...state.items];
        const existing = updated[index];
        updated[index] = { ...existing, qty: existing.qty + item.qty };
        return { items: updated };
      }
      return { items: [...state.items, item] };
    }),
  removeItem: (itemId) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== itemId) })),
  clearCart: () => set({ items: [] }),
  total: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
  inc: (itemId) =>
    set((state) => ({ items: state.items.map((i) => (i.id === itemId ? { ...i, qty: i.qty + 1 } : i)) })),
  dec: (itemId) =>
    set((state) => ({ items: state.items.map((i) => (i.id === itemId ? { ...i, qty: Math.max(1, i.qty - 1) } : i)) })),
  count: () => get().items.reduce((sum, i) => sum + i.qty, 0),
}));

// TODO: Connect to Supabase orders in a later phase
