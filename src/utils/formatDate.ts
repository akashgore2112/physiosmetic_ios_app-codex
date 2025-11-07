export const formatDate = (isoDate: string): string => {
  try {
    const d = new Date(isoDate);
    // Use en-GB to ensure day precedes month: "Mon, 04 Nov"
    return d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return isoDate;
  }
};

export const formatTime = (hhmm: string): string => {
  try {
    const parts = hhmm.split(':');
    const d = new Date();
    d.setHours(parseInt(parts[0] || '0', 10));
    d.setMinutes(parseInt(parts[1] || '0', 10));
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return hhmm;
  }
};

export const formatDateTime = (isoDate: string, hhmm: string): string => {
  return `${formatDate(isoDate)} ${formatTime(hhmm)}`;
};

export const formatRelativeToNow = (isoDate: string, hhmm: string): string => {
  try {
    const [y, m, d] = isoDate.split('-').map((n) => parseInt(n, 10));
    const [hh, mm] = hhmm.split(':').map((n) => parseInt(n, 10));
    const target = new Date(y, (m - 1), d, hh, mm, 0, 0);
    const now = new Date();
    let diffMs = target.getTime() - now.getTime();
    const inPast = diffMs <= 0;
    diffMs = Math.abs(diffMs);
    const mins = Math.round(diffMs / 60000);
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    if (mins <= 1) return inPast ? 'just started' : 'starting now';
    const body = hrs > 0 ? `${hrs}h${rem > 0 ? ` ${rem}m` : ''}` : `${rem}m`;
    return inPast ? `${body} ago` : `in ${body}`;
  } catch {
    return '';
  }
};
