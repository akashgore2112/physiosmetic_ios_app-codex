import { supabase } from '../config/supabaseClient';
import type { AvailabilitySlot } from '../types/AvailabilitySlot';
import type { Appointment } from '../types/appointment';
import { getClinicDateWindow, isPastSlot } from '../utils/clinicTime';
import { ensureProfileExists } from './profileService';

export type SlotWithTherapist = AvailabilitySlot & { therapist?: { id: string; name: string } };

export async function syncMyPastAppointments() {
  // call RPC to mark my past appointments completed
  const { data, error } = await supabase.rpc('mark_my_past_appointments_completed');
  if (error) console.warn('[syncMyPastAppointments] error', error);
  return data ?? 0;
}

type AppointmentRow = {
  id: string;
  service_id: string;
  therapist_id: string;
  slot_id: string | null;
  status: string;
  availability_slots?: { date: string; start_time: string; end_time: string } | null;
  services?: { name?: string } | null;
  therapists?: { name?: string } | null;
};

export type MyApptItem = {
  id: string;
  service_id: string;
  therapist_id: string;
  slot_id: string | null;
  status: string;
  slot: { date: string; start_time: string; end_time: string } | null;
  service_name?: string;
  therapist_name?: string;
  isPast?: boolean;
};

export async function getMyUpcomingAppointments(limit = 3, userId?: string): Promise<MyApptItem[]> {
  // fire-and-forget cleanup
  syncMyPastAppointments().catch(() => {});
  let q = supabase
    .from('appointments')
    .select('id,service_id,therapist_id,slot_id,status, availability_slots:slot_id(date,start_time,end_time), services:service_id(name), therapists:therapist_id(name)')
    .eq('status', 'booked')
    // Order by related table columns using foreignTable to satisfy PostgREST
    .order('date', { ascending: true, foreignTable: 'availability_slots' })
    .order('start_time', { ascending: true, foreignTable: 'availability_slots' })
    .limit(limit);
  if (userId) q = q.eq('user_id', userId);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as AppointmentRow[];
  // Filter to future-only using start_time (hide as soon as start passes)
  const items = rows
    .filter((r) => r.availability_slots && !isPastSlot(r.availability_slots.date, r.availability_slots.start_time))
    .map<MyApptItem>((r) => ({
      id: r.id,
      service_id: r.service_id,
      therapist_id: r.therapist_id,
      slot_id: r.slot_id,
      status: r.status,
      slot: r.availability_slots ? { ...r.availability_slots } : null,
      service_name: r.services?.name ?? undefined,
      therapist_name: r.therapists?.name ?? undefined,
    }));
  return items;
}

export async function getMyAllAppointments(): Promise<MyApptItem[]> {
  syncMyPastAppointments().catch(() => {});
  const { data, error } = await supabase
    .from('appointments')
    .select('id,service_id,therapist_id,slot_id,status, availability_slots:slot_id(date,start_time,end_time), services:service_id(name), therapists:therapist_id(name)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  const rows = (data ?? []) as AppointmentRow[];
  return rows.map<MyApptItem>((r) => {
    const slot = r.availability_slots ? { ...r.availability_slots } : null;
    const isPast = slot ? isPastSlot(slot.date, slot.start_time) : false;
    return {
      id: r.id,
      service_id: r.service_id,
      therapist_id: r.therapist_id,
      slot_id: r.slot_id,
      status: r.status,
      slot,
      service_name: r.services?.name ?? undefined,
      therapist_name: r.therapists?.name ?? undefined,
      isPast,
    };
  });
}

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
    .order('start_time', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []).filter((r: any) => !isPastSlot(r.date, r.start_time));
  return rows.map((r: any) => ({
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

export async function getUpcomingAppointmentsForUser(userId: string, max = 10): Promise<Array<Appointment & {
  availability_slots: AvailabilitySlot,
  services?: { name: string },
  therapists?: { name: string },
}>> {
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
    .limit(100);
  if (error) throw error;
  const rows = (data ?? []) as any[];
  const future = rows.filter((r) => {
    const d = r.availability_slots?.date || '';
    const t = (r.availability_slots?.start_time || '').slice(0, 5);
    return (d > todayStr) || (d === todayStr && t > nowTime);
  });
  future.sort((a: any, b: any) => {
    const ad = a.availability_slots?.date ?? '';
    const bd = b.availability_slots?.date ?? '';
    if (ad !== bd) return ad < bd ? -1 : 1;
    const at = (a.availability_slots?.start_time ?? '').slice(0, 5);
    const bt = (b.availability_slots?.start_time ?? '').slice(0, 5);
    return at < bt ? -1 : at > bt ? 1 : 0;
  });
  return future.slice(0, max) as any;
}

export async function getNextSlotsForService(serviceId: string, limit = 3): Promise<SlotWithTherapist[]> {
  const { data, error } = await supabase
    .from('availability_slots')
    .select('id,therapist_id,service_id,date,start_time,end_time,is_booked, therapists!inner(id,name)')
    .eq('service_id', serviceId)
    .eq('is_booked', false)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) throw error;
  const future = (data ?? []).filter((r: any) => !isPastSlot(r.date, r.start_time)).slice(0, limit);
  return future.map((r: any) => ({
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
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) throw error;
  const filtered = (data ?? []).filter((r: any) => !isPastSlot(r.date, r.start_time));
  const earliestByPair = new Map<string, any>();
  for (const r of filtered) {
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

export async function getNextSlotForTherapist(serviceId: string, therapistId: string): Promise<{ date: string; start_time: string } | null> {
  const windowDates = getClinicDateWindow(7);
  const { data, error } = await supabase
    .from('availability_slots')
    .select('date,start_time')
    .eq('service_id', serviceId)
    .eq('therapist_id', therapistId)
    .eq('is_booked', false)
    .in('date', windowDates)
    .order('date')
    .order('start_time')
    .limit(1);
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return { date: (data[0] as any).date, start_time: (data[0] as any).start_time };
}

// Earliest FUTURE, unbooked slot for a given service across any therapist
export async function getNextSlotForService(serviceId: string): Promise<{ date: string; start_time: string } | null> {
  const { data, error } = await supabase
    .from('availability_slots')
    .select('date,start_time')
    .eq('service_id', serviceId)
    .eq('is_booked', false)
    .order('date')
    .order('start_time')
    .limit(20);
  if (error) throw error;
  const rows = (data ?? []).filter((r: any) => !isPastSlot(r.date, r.start_time));
  if (rows.length === 0) return null;
  return { date: rows[0].date, start_time: rows[0].start_time };
}

// Simple in-memory cache for next slots by service (TTL ~3 minutes)
type NextCacheEntry = { date: string; start_time: string; expires: number };
const nextSlotCache: Record<string, NextCacheEntry> = {};
let nextSlotsLastUpdated: number | null = null;

export function getCachedNextSlot(serviceId: string): { date: string; start_time: string } | null {
  const e = nextSlotCache[serviceId];
  if (e && e.expires > Date.now()) return { date: e.date, start_time: e.start_time };
  return null;
}

export async function primeNextSlotsForServices(serviceIds: string[]): Promise<Record<string, { date: string; start_time: string }>> {
  const ids = Array.from(new Set(serviceIds.filter(Boolean)));
  if (ids.length === 0) return {};
  // Filter out ids that are still fresh
  const now = Date.now();
  const missing = ids.filter((id) => !(nextSlotCache[id] && nextSlotCache[id].expires > now));
  if (missing.length === 0) {
    const out: Record<string, { date: string; start_time: string }> = {};
    ids.forEach((id) => { const e = nextSlotCache[id]; if (e) out[id] = { date: e.date, start_time: e.start_time }; });
    return out;
  }
  const { data, error } = await supabase
    .from('availability_slots')
    .select('service_id,date,start_time')
    .in('service_id', missing)
    .eq('is_booked', false)
    .order('service_id')
    .order('date')
    .order('start_time')
    .limit(1000);
  if (error) return {};
  const byService: Record<string, { date: string; start_time: string }> = {};
  for (const r of (data ?? [])) {
    if (!r?.service_id || !r?.date || !r?.start_time) continue;
    if (isPastSlot(r.date, r.start_time)) continue;
    if (!byService[r.service_id]) byService[r.service_id] = { date: r.date, start_time: r.start_time };
  }
  const ttl = 3 * 60 * 1000;
  Object.entries(byService).forEach(([sid, val]) => {
    nextSlotCache[sid] = { ...val, expires: Date.now() + ttl };
  });
  nextSlotsLastUpdated = Date.now();
  return byService;
}

// Batched getter that returns earliest FUTURE slot per serviceId
export async function getNextSlotsForServices(serviceIds: string[]): Promise<Record<string, { date: string; start_time: string }>> {
  return primeNextSlotsForServices(serviceIds);
}

export function getNextSlotsLastUpdated(): number | null {
  return nextSlotsLastUpdated;
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
  // Payment parameters (NEW)
  payment?: {
    payment_method?: string;
    payment_status?: string;
    payment_gateway?: string;
    gateway_order_id?: string;
    gateway_payment_id?: string;
  };
  amountPaid?: number;
  discountAmount?: number;
  couponCode?: string;
  idempotencyKey?: string;
}): Promise<Appointment & { amount_paid?: number }> {
  // Ensure the user has a corresponding profiles row to satisfy FK constraints
  try { await ensureProfileExists(params.userId, null, null); } catch {}

  // Call atomic RPC with server-side locking and validation
  const { data, error } = await supabase.rpc('book_appointment', {
    p_user_id: params.userId,
    p_service_id: params.serviceId,
    p_therapist_id: params.therapistId,
    p_slot_id: params.slotId,
    p_is_online: false,
    p_notes: params.notes ?? null,
    // Payment parameters
    p_payment_method: params.payment?.payment_method ?? 'pay_at_clinic',
    p_payment_status: params.payment?.payment_status ?? 'pending',
    p_payment_gateway: params.payment?.payment_gateway ?? null,
    p_gateway_order_id: params.payment?.gateway_order_id ?? null,
    p_gateway_payment_id: params.payment?.gateway_payment_id ?? null,
    p_amount_paid: params.amountPaid ?? null,
    p_discount_amount: params.discountAmount ?? 0,
    p_coupon_code: params.couponCode ?? null,
    p_idempotency_key: params.idempotencyKey ?? null,
  });

  if (error) throw error;

  // Handle JSONB response from enhanced RPC
  const result = data as { success: boolean; appointment_id?: string; amount_paid?: number; error?: string; message?: string };

  if (!result.success) {
    // Map error codes to user-friendly messages
    const message = result.message || 'Booking failed. Please try again.';
    const err = new Error(message) as Error & { code?: string };
    err.code = result.error;
    throw err;
  }

  if (!result.appointment_id) {
    throw new Error('Booking succeeded but no appointment ID returned.');
  }

  // Fetch the full appointment record to return
  const { data: appt, error: fetchErr } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', result.appointment_id)
    .maybeSingle();

  if (fetchErr || !appt) {
    throw fetchErr ?? new Error('Failed to fetch appointment details.');
  }

  return { ...(appt as Appointment), amount_paid: result.amount_paid };
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
