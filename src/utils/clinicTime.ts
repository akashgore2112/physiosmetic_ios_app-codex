// Helpers for clinic-local date math using Asia/Dubai without external deps

export const CLINIC_TZ = 'Asia/Dubai';
const TIMEZONE = CLINIC_TZ;

function toDubaiDate(d: Date): Date {
  // Convert given Date to an equivalent date/time in Asia/Dubai by reconstructing components
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(d).reduce((acc: any, p) => (acc[p.type] = p.value, acc), {} as any);
  const year = parseInt(parts.year, 10);
  const month = parseInt(parts.month, 10) - 1;
  const day = parseInt(parts.day, 10);
  const hour = parseInt(parts.hour || '0', 10);
  const minute = parseInt(parts.minute || '0', 10);
  const second = parseInt(parts.second || '0', 10);
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

export function getClinicToday(): Date {
  const now = new Date();
  const dubai = toDubaiDate(now);
  // start of day in Dubai
  dubai.setUTCHours(0, 0, 0, 0);
  return dubai;
}

export function formatISODate(d: Date): string {
  // Return YYYY-MM-DD in Dubai local date
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
  // en-CA yields YYYY-MM-DD
  return fmt.format(d);
}

export function getClinicDateWindow(daysAhead = 7): string[] {
  const start = getClinicToday();
  const out: string[] = [];
  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(start.getTime());
    d.setUTCDate(start.getUTCDate() + i);
    out.push(formatISODate(d));
  }
  return out;
}

export function isWithinClinicWindow(dateStr: string, daysAhead = 7): boolean {
  const window = getClinicDateWindow(daysAhead);
  return window.includes(dateStr);
}

// Lightweight helpers requested by spec
export function nowInClinicTZ(): Date {
  // Keep as JS Date; comparisons will be performed with string-based helpers
  return new Date();
}

export function isPastSlot(dateISO: string, startTimeHHMM: string): boolean {
  // dateISO: 'YYYY-MM-DD', startTimeHHMM: 'HH:MM'
  // Convert to a comparable Date (UTC baseline is acceptable for relative ordering here)
  try {
    const [y, m, d] = dateISO.split('-').map((n) => parseInt(n, 10));
    const [hh, mm] = startTimeHHMM.split(':').map((n) => parseInt(n, 10));
    const slotUtc = new Date(Date.UTC(y, (m - 1), d, hh, mm));
    const now = new Date();
    return slotUtc.getTime() <= now.getTime();
  } catch {
    return false;
  }
}
