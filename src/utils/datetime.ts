export function combineDateTime(dateStr: string, timeStr: string): Date {
  // Accepts date like 'YYYY-MM-DD' and time 'HH:mm' or 'HH:mm:ss'
  const time = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return new Date(`${dateStr}T${time}`);
}

export function isPast(dateStr: string, timeStr: string): boolean {
  const dt = combineDateTime(dateStr, timeStr);
  const t = dt.getTime();
  return Number.isFinite(t) && t < Date.now();
}

