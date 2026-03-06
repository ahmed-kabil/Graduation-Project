/**
 * Returns a WhatsApp-style date label for a given timestamp:
 *  - "Today"       if the date is today
 *  - "Yesterday"   if the date is yesterday
 *  - Weekday name  if within the last 7 days (e.g. "Monday")
 *  - Full date     otherwise (e.g. "5 March 2026")
 */
export function getDateLabel(date: Date): string {
  const now = new Date();

  const strip = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const todayMs = strip(now);
  const dateMs = strip(date);
  const diffDays = Math.round((todayMs - dateMs) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)
    return date.toLocaleDateString(undefined, { weekday: 'long' });

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Returns a date-only key string (YYYY-MM-DD) for grouping.
 */
export function dateKey(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
