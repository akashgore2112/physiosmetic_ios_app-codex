export interface Appointment {
  id: string;
  user_id: string;
  service_id: string;
  therapist_id: string;
  slot_id: string;
  status?: string; // 'booked' | 'cancelled' | etc.
  notes?: string | null;
  created_at?: string;
}

