export interface Order {
  id: string;
  user_id: string;
  total_amount?: number;
  status?: string; // 'placed' | 'pending' | 'cancelled' | etc.
  created_at?: string;
}

