export interface Service {
  id: string;
  name: string;
  category: string;
  description?: string;
  duration_minutes?: number;
  base_price?: number;
  is_online_allowed?: boolean;
  is_active?: boolean;
  image_url?: string;
}

