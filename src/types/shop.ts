export type Product = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  in_stock: boolean;
  category?: string | null;
};

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string;
  qty: number;
};

export type Order = {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
};

