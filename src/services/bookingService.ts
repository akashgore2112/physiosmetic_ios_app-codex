import { supabase } from '../config/supabaseClient';
import type { AvailabilitySlot } from '../types/AvailabilitySlot';
import type { Appointment } from '../types/appointment';
import { getClinicDateWindow } from '../utils/clinicTime';

export type SlotWithTherapist = AvailabilitySlot & { therapist?: { id: string; name: string } };

export async function getBookableDatesForService(serviceId: string): Promise<string[]> {
  // Distinct future dates that have at least one unbooked slot
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('availability_slots')
    .select('date')
    .eq('service_id', serviceId)
    .eq('is_booked', false)
    .gte('date', todayStr)
    .order('date')
    .limit(1000);
  if (error) throw error;
  const unique = Array.from(new Set((data ?? []).map((r: any) => r.date)));
  return unique;
}

export async function getSlotsForServiceAndDate(serviceId: string, date: string): Promise<SlotWithTherapist[]> {
  const { data, error } = await supabase
    .from('availability_slots')
    .select('id,therapist_id,service_id,date,start_time,end_time,is_booked, therapists!inner(id,name)')
    .eq('service_id', serviceId)
    .eq('date', date)
    .eq('is_booked', false)
    .order('start_time');
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    therapist_id: r.therapist_id,
    service_id: r.service_id,
    date: r.date,
    start_time: r.start_time,
    end_time: r.end_time,
    is_booked: r.is_booked,
    therapist: r.therapists ? { id: r.therapists.id, name: r.therapists.name } : undefined,
  }));
}

export async function getTherapistsForService(serviceId: string): Promise<{ id: string; name: string }[]> {
  const todayStr = new Date().toISOString().slice(0, 10);
  // Distinct therapists that have at least one future unbooked slot for this service
  const { data, error } = await supabase
    .from('availability_slots')
    .select('therapist_id, therapists!inner(id,name)')
    .eq('service_id', serviceId)
    .eq('is_booked', false)
    .gte('date', todayStr);
  if (error) throw error;
  const seen = new Set<string>();
  const out: { id: string; name: string }[] = [];
  for (const r of data ?? []) {
    if (r.therapists && !seen.has(r.therapists.id)) {
      seen.add(r.therapists.id);
      out.push({ id: r.therapists.id, name: r.therapists.name });
    }
  }
  return out;
}

export async function getNextAppointmentForUser(userId: string): Promise<(Appointment & {
  availability_slots: AvailabilitySlot,
  services?: { name: string },
  therapists?: { name: string },
}) | null> {
  // Safer approach: fetch a small window of future-by-date items then filter by time locally
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const nowTime = `${hh}:${mm}`;

  const { data, error } = await supabase
    .from('appointments')
    .select('id,status, service_id, therapist_id, availability_slots:slot_id(id,service_id,therapist_id,date,start_time,end_time,is_booked), services:service_id(name), therapists:therapist_id(name)')
    .eq('user_id', userId)
    .eq('status', 'booked')
    .gte('availability_slots.date', todayStr)
    .limit(50);
  if (error) throw error;
  const rows = (data ?? []) as any[];
  // Sort locally by (date, start_time)
  rows.sort((a: any, b: any) => {
    const ad = a.availability_slots?.date ?? '';
    const bd = b.availability_slots?.date ?? '';
    if (ad !== bd) return ad < bd ? -1 : 1;
    const at = (a.availability_slots?.start_time ?? '').slice(0, 5);
    const bt = (b.availability_slots?.start_time ?? '').slice(0, 5);
    return at < bt ? -1 : at > bt ? 1 : 0;
  });
  const first = rows.find((r) => (r.availability_slots?.date > todayStr) || (r.availability_slots?.date === todayStr && ((r.availability_slots?.start_time ?? '').slice(0, 5)) > nowTime));
  if (first) return first as any;

  // Fallback: fetch appointments → fetch their slots → compute future locally → join names
  const { data: appts, error: apptErr } = await supabase
    .from('appointments')
    .select('id,slot_id,service_id,therapist_id,status')
    .eq('user_id', userId)
    .eq('status', 'booked')
    .order('created_at', { ascending: true })
    .limit(50);
  if (apptErr) throw apptErr;
  const slotIds = (appts ?? []).map((a: any) => a.slot_id).filter(Boolean);
  if (slotIds.length === 0) return null;

  const { data: slots, error: slotErr } = await supabase
    .from('availability_slots')
    .select('id,service_id,therapist_id,date,start_time,end_time,is_booked')
    .in('id', slotIds);
  if (slotErr) throw slotErr;
  const futureSlots = (slots ?? []).filter((s: any) => {
    const t = typeof s.start_time === 'string' ? s.start_time.slice(0, 5) : '';
    return (s.date > todayStr) || (s.date === todayStr && t > nowTime);
  });
  if (futureSlots.length === 0) return null;
  futureSlots.sort((a: any, b: any) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.start_time < b.start_time ? -1 : a.start_time > b.start_time ? 1 : 0)));
  const chosenSlot = futureSlots[0];
  const chosenAppt = (appts ?? []).find((a: any) => a.slot_id === chosenSlot.id);
  if (!chosenAppt) return null;

  // Fetch names (best-effort)
  let serviceName: string | undefined;
  let therapistName: string | undefined;
  try {
    const [{ data: svc }] = await Promise.all([
      supabase.from('services').select('name').eq('id', chosenSlot.service_id).maybeSingle(),
    ]);
    serviceName = (svc as any)?.name;
  } catch {}
  try {
    const { data: th } = await supabase.from('therapists').select('name').eq('id', chosenSlot.therapist_id).maybeSingle();
    therapistName = (th as any)?.name;
  } catch {}

  return {
    id: chosenAppt.id,
    status: chosenAppt.status,
    service_id: chosenSlot.service_id,
    therapist_id: chosenSlot.therapist_id,
    availability_slots: chosenSlot as any,
    services: serviceName ? { name: serviceName } : undefined,
    therapists: therapistName ? { name: therapistName } : undefined,
  } as any;
}

export async function getNextSlotsForService(serviceId: string, limit = 3): Promise<SlotWithTherapist[]> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('availability_slots')
    .select('id,therapist_id,service_id,date,start_time,end_time,is_booked, therapists!inner(id,name)')
    .eq('service_id', serviceId)
    .eq('is_booked', false)
    .gte('date', todayStr)
    .order('date')
    .order('start_time')
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    therapist_id: r.therapist_id,
    service_id: r.service_id,
    date: r.date,
    start_time: r.start_time,
    end_time: r.end_time,
    is_booked: r.is_booked,
    therapist: r.therapists ? { id: r.therapists.id, name: r.therapists.name } : undefined,
  }));
}

export type NextAvailableSlot = SlotWithTherapist & {
  service?: { id: string; name: string };
  therapist?: { id: string; name: string };
};

// Home: get strictly future, unbooked slots within clinic window and pick earliest per (service, therapist)
export async function getNextAvailableSlots(limit = 3): Promise<NextAvailableSlot[]> {
  const windowDates = getClinicDateWindow(7);
  const { data, error } = await supabase
    .from('availability_slots')
    .select('id,service_id,therapist_id,date,start_time,end_time,is_booked, services:service_id(id,name), therapists:therapist_id(id,name)')
    .in('date', windowDates)
    .eq('is_booked', false)
    .order('date')
    .order('start_time');
  if (error) throw error;
  const earliestByPair = new Map<string, any>();
  for (const r of data ?? []) {
    const key = `${r.service_id}:${r.therapist_id}`;
    if (!earliestByPair.has(key)) earliestByPair.set(key, r);
  }
  const picked = Array.from(earliestByPair.values()).slice(0, limit).map((r: any) => ({
    id: r.id,
    therapist_id: r.therapist_id,
    service_id: r.service_id,
    date: r.date,
    start_time: r.start_time,
    end_time: r.end_time,
    is_booked: r.is_booked,
    service: r.services ? { id: r.services.id, name: r.services.name } : undefined,
    therapist: r.therapists ? { id: r.therapists.id, name: r.therapists.name } : undefined,
  }));
  return picked;
}

// Double-book guard: block if user has any appointment at same date+time already
async function hasUserApptAtDateTime(userId: string, date: string, startTime: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, slot:availability_slots!inner(date,start_time)')
    .eq('user_id', userId)
    .eq('status', 'booked')
    .eq('availability_slots.date', date)
    .eq('availability_slots.start_time', startTime)
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function bookAppointment(params: {
  userId: string;
  serviceId: string;
  therapistId: string;
  slotId: string;
  notes?: string;
}): Promise<Appointment> {
  // Pre-check: fetch slot info then ensure user doesn't have appointment at same date+time
  const { data: slot, error: slotErr } = await supabase
    .from('availability_slots')
    .select('id,date,start_time')
    .eq('id', params.slotId)
    .maybeSingle();
  if (slotErr || !slot) throw slotErr ?? new Error('Slot not found');
  if (await hasUserApptAtDateTime(params.userId, slot.date, slot.start_time)) {
    throw new Error('You already have an appointment at this time.');
  }

  const { data, error } = await supabase.rpc('book_appointment', {
    p_user_id: params.userId,
    p_service_id: params.serviceId,
    p_therapist_id: params.therapistId,
    p_slot_id: params.slotId,
    p_is_online: false,
    p_notes: params.notes ?? null,
  });
  if (error) throw error;
  return data as Appointment;
}

export async function cancelAppointment(apptId: string): Promise<void> {
  // get slot id to free
  const { data: appt, error: apptErr } = await supabase
    .from('appointments')
    .select('id,slot_id,status')
    .eq('id', apptId)
    .maybeSingle();
  if (apptErr || !appt) throw apptErr ?? new Error('Appointment not found');

  const { error: updErr } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', apptId);
  if (updErr) throw updErr;

  if (appt.slot_id) {
    // free slot
    await supabase.from('availability_slots').update({ is_booked: false }).eq('id', appt.slot_id);
  }
}

export async function rescheduleAppointment(params: {
  apptId: string;
  newSlotId: string;
  userId: string;
  serviceId: string;
  therapistId: string;
}): Promise<Appointment> {
  // cancel old then book new atomically would require RPC; for now do sequentially for MVP
  await cancelAppointment(params.apptId);
  return bookAppointment({
    userId: params.userId,
    serviceId: params.serviceId,
    therapistId: params.therapistId,
    slotId: params.newSlotId,
  });
}
