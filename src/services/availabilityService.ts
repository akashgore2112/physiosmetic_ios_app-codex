import { supabase } from '../config/supabaseClient';

export type SlotItem = {
  id: string;
  label: string; // e.g., '10:00'
  date: string; // 'YYYY-MM-DD'
  time: string; // alias of start_time 'HH:mm'
  start_time: string;
  end_time: string;
  is_booked: boolean;
};

export async function getSlots(params: { serviceId: string; therapistId: string; date: string }): Promise<SlotItem[]> {
  const { serviceId, therapistId, date } = params;
  const { data, error } = await supabase
    .from('availability_slots')
    .select('id, date, start_time, end_time, is_booked')
    .eq('service_id', serviceId)
    .eq('therapist_id', therapistId)
    .eq('date', date)
    .eq('is_booked', false)
    .order('start_time', { ascending: true });
  if (error) {
    console.error('getSlots error', error);
    return [];
  }
  return (data ?? []).map((s: any) => ({
    id: s.id,
    label: String(s.start_time),
    date: s.date,
    time: String(s.start_time),
    start_time: String(s.start_time),
    end_time: String(s.end_time),
    is_booked: !!s.is_booked,
  }));
}

