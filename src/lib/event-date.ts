/** An event's `meta.date` is a plain `YYYY-MM-DD` calendar day (never a
 *  timestamp), so every reader of it has to split the string rather than
 *  construct a Date — `new Date('2026-09-08')` parses as UTC midnight and
 *  renders as the 7th for anyone west of Greenwich. */

function fields(meta: unknown): Record<string, unknown> {
  return typeof meta === 'object' && meta !== null
    ? (meta as Record<string, unknown>)
    : {}
}

export function eventDate(meta: unknown): string | null {
  const value = fields(meta).date
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : null
}

/** The day number and a short month name, for the design's date block. */
export function eventDayMonth(
  meta: unknown,
  locale: string,
): { day: string; month: string } {
  const date = eventDate(meta)
  if (!date) return { day: '--', month: '' }
  const [year, month, day] = date.split('-')
  // Noon UTC, so the month name cannot slip a day either way.
  const formatted = new Intl.DateTimeFormat(locale, {
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${year}-${month}-${day}T12:00:00Z`))
  return { day, month: formatted }
}

/** Time and place on one line — a session is one thing happening once. */
export function eventWhen(meta: unknown): string {
  const { time, place } = fields(meta)
  return [time, place].filter((v) => typeof v === 'string' && v).join(' · ')
}
