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
