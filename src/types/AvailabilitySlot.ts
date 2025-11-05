export interface AvailabilitySlot {
  id: string;
  therapist_id: string;
  service_id: string;
  date: string; // e.g., "2025-11-04"
  start_time: string; // "10:00"
  end_time: string; // "10:30"
  is_booked: boolean;
}

