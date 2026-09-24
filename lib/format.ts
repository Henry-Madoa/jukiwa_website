/*
 * Presentation helpers. Pure functions with no database or DOM access, so the same code formats a
 * figure on the server during SSR and in the browser after hydration — which is what keeps the two
 * renders byte-identical and hydration quiet.
 */
import type { Cents, IsoDate, IsoDateTime } from './types.ts';

export const DEFAULT_LOCALE = 'en-GB';

/** Minor units → "KES 12,345". Decimals are off by default: loan figures are quoted in whole shillings. */
export function formatMoney(cents: Cents | null | undefined, symbol = 'KES', decimals = 0): string {
  const value = Number(cents || 0) / 100;
  return `${symbol} ${value.toLocaleString(DEFAULT_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`.trim();
}

/** "2026-01-06" → "6 January 2026". Anything unparseable comes back untouched. */
export function formatDate(value: IsoDate | IsoDateTime | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(DEFAULT_LOCALE, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** "6 Jan 2026" — for lists and cards, where the long form would wrap. */
export function formatDateShort(value: IsoDate | IsoDateTime | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(DEFAULT_LOCALE, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** "6 January 2026, 14:30" */
export function formatDateTime(value: IsoDateTime | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString(DEFAULT_LOCALE, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}, ${date.toLocaleTimeString(
    DEFAULT_LOCALE,
    { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' },
  )}`;
}

/** "14:30" */
export function formatTime(value: IsoDateTime | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(DEFAULT_LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
}

/** The parts of a date a calendar tile shows: "JAN" over "6" over "Tue". */
export function dateParts(value: IsoDate | IsoDateTime): { month: string; day: string; weekday: string; year: string } {
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return { month: '', day: '', weekday: '', year: '' };
  return {
    month: date.toLocaleDateString(DEFAULT_LOCALE, { month: 'short', timeZone: 'UTC' }).toUpperCase(),
    day: String(date.getUTCDate()),
    weekday: date.toLocaleDateString(DEFAULT_LOCALE, { weekday: 'short', timeZone: 'UTC' }),
    year: String(date.getUTCFullYear()),
  };
}

/** "3 days ago", "in 2 weeks", "today". Rendered server-side, so it is stable per request. */
export function relativeDays(value: IsoDate | IsoDateTime | null | undefined, now = new Date()): string {
  if (!value) return '';
  const then = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(then.getTime())) return '';
  const days = Math.round((then.getTime() - now.getTime()) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  const rtf = new Intl.RelativeTimeFormat(DEFAULT_LOCALE, { numeric: 'auto' });
  if (Math.abs(days) < 30) return rtf.format(days, 'day');
  if (Math.abs(days) < 365) return rtf.format(Math.round(days / 30), 'month');
  return rtf.format(Math.round(days / 365), 'year');
}

/** Cuts text to a whole word, appending an ellipsis only when something was actually cut. */
export function truncate(text: string | null | undefined, max = 180): string {
  const value = String(text ?? '').trim();
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ') > max * 0.6 ? cut.lastIndexOf(' ') : max)}…`;
}

/** Initials for an avatar with no photograph. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** A phone number as `tel:` wants it. */
export const telHref = (phone: string | null | undefined): string => `tel:${String(phone ?? '').replace(/[^\d+]/g, '')}`;

/** Kenyan mobile numbers in international form, for wa.me links. */
export function whatsappHref(phone: string | null | undefined, text?: string): string {
  const digits = String(phone ?? '').replace(/[^\d]/g, '').replace(/^0/, '254');
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

/** Minor units → "KES 1.2M", "KES 450K" — for a headline figure where the exact shilling is noise. */
export function formatMoneyCompact(cents: Cents | null | undefined, symbol = 'KES'): string {
  const value = Number(cents || 0) / 100;
  const abs = Math.abs(value);
  const [n, unit] = abs >= 1e9 ? [value / 1e9, 'B'] : abs >= 1e6 ? [value / 1e6, 'M'] : abs >= 1e3 ? [value / 1e3, 'K'] : [value, ''];
  const digits = unit && Math.abs(n) < 10 ? 1 : 0;
  return `${symbol} ${n.toLocaleString(DEFAULT_LOCALE, { maximumFractionDigits: digits })}${unit}`.trim();
}

/** Basis points → "2.5%". A monthly rate of 250 bp reads "2.5% a month". */
export const formatBp = (bp: number | null | undefined): string =>
  `${(Number(bp || 0) / 100).toLocaleString(DEFAULT_LOCALE, { maximumFractionDigits: 2 })}%`;

/** "12 months", "1 month", "2 years" once it divides evenly and is long enough to read better. */
export function formatTerm(months: number): string {
  if (months >= 24 && months % 12 === 0) return `${months / 12} years`;
  return `${months} month${months === 1 ? '' : 's'}`;
}
