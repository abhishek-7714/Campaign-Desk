const inr = new Intl.NumberFormat('en-IN');
const trim = (s: string) => s.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');

/** Full rupee amount with Indian digit grouping: ₹1,23,456 */
export const fmtINR = (n: number) => `₹${inr.format(Math.round(n))}`;

/** Short rupee amount: ₹950, ₹4.5K, ₹2.5L, ₹1.2Cr */
export function fmtINRShort(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (a >= 1e7) return `${sign}₹${trim((a / 1e7).toFixed(2))}Cr`;
  if (a >= 1e5) return `${sign}₹${trim((a / 1e5).toFixed(a >= 1e6 ? 1 : 2))}L`;
  if (a >= 1e3) return `${sign}₹${trim((a / 1e3).toFixed(a >= 1e4 ? 0 : 1))}K`;
  return `${sign}₹${Math.round(a)}`;
}

/** Compact count: 950, 4.5K, 1.2M */
export function fmtNum(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return `${trim((n / 1e6).toFixed(a >= 1e7 ? 0 : 1))}M`;
  if (a >= 1e3) return `${trim((n / 1e3).toFixed(a >= 1e4 ? 0 : 1))}K`;
  return String(Math.round(n));
}

/** Full count with Indian grouping: 1,23,456 */
export const fmtFull = (n: number) => inr.format(Math.round(n));

export const fmtPct = (n: number, digits = 0) => `${trim(n.toFixed(digits))}%`;

/** "₹27,000", "27000", "27K" -> 27000. Returns 0 when nothing numeric is found. */
export function parseINR(s: string): number {
  if (!s) return 0;
  const m = s.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(k|l|lakh|cr)?/i);
  if (!m) return 0;
  const n = Number(m[1]);
  const u = (m[2] ?? '').toLowerCase();
  return Math.round(u === 'k' ? n * 1e3 : u === 'l' || u === 'lakh' ? n * 1e5 : u === 'cr' ? n * 1e7 : n);
}

export const roundTo = (n: number, step: number) => Math.round(n / step) * step;
