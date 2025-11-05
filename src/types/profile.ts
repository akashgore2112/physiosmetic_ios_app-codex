export interface Profile {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  role?: 'patient' | 'staff' | 'admin' | string;
  created_at?: string;
}

