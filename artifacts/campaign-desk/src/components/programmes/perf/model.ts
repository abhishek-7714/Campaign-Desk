/**
 * Local helpers for the performance screens: filters, sorting, column choices, chart series.
 * Per-row metrics always come from GridRow (src/domain/performance.ts). Nothing here re-derives them.
 */
import type { GridRow, RowStatus } from '@/domain/performance';
import type { Post, Programme } from '@/domain/types';
import { slug, toISO } from '@/domain/helpers';

/* ------------------------------- columns ------------------------------- */

export type ColKey = 'views' | 'likes' | 'comments' | 'engagement' | 'reach' | 'saves' | 'shares' | 'orders' | 'revenue' | 'roas' | 'code' | 'link';

export const COLUMN_GROUPS: { title: string; note?: string; items: { key: ColKey; label: string }[] }[] = [
  { title: 'Public', note: 'Collected from the public post page', items: [
    { key: 'views', label: 'Views' }, { key: 'likes', label: 'Likes' }, { key: 'comments', label: 'Comments' }, { key: 'engagement', label: 'Engagement' },
  ] },
  { title: 'Private', note: 'Only the creator can see these', items: [
    { key: 'reach', label: 'Reach' }, { key: 'saves', label: 'Saves' }, { key: 'shares', label: 'Shares' },
  ] },
  { title: 'Sales', note: 'Orders, revenue and return on spend need Shopify', items: [
    { key: 'orders', label: 'Orders' }, { key: 'revenue', label: 'Revenue' }, { key: 'roas', label: 'Return on spend' }, { key: 'code', label: 'Code' },
  ] },
  { title: 'Link', items: [{ key: 'link', label: 'Post link' }] },
];

export const SALES_COLS: ColKey[] = ['orders', 'revenue', 'roas'];
export const PRIVATE_COLS: ColKey[] = ['reach', 'saves', 'shares'];
export const DEFAULT_COLS: ColKey[] = ['views', 'engagement', 'reach', 'saves', 'shares', 'orders', 'revenue', 'roas', 'link'];

/* ------------------------------- status ------------------------------- */

export type StatusFilter = 'all' | 'live' | 'late' | 'missed' | 'planned' | 'under' | 'over';

export function matchesStatus(r: GridRow, f: StatusFilter): boolean {
  switch (f) {
    case 'all': return true;
    case 'live': return r.status === 'Live' || r.status === 'Fetching';
    case 'late': return r.status === 'Late';
    case 'missed': return r.status === 'Missed';
    case 'planned': return r.status === 'Planned';
    case 'under': return r.deliveryPct !== null && r.deliveryPct < 70;
    case 'over': return r.deliveryPct !== null && r.deliveryPct > 100;
    default: return true;
  }
}

const STATUS_RANK: Record<RowStatus, number> = { Live: 0, Fetching: 1, Late: 2, Missed: 3, Planned: 4 };
export const statusRank = (s: RowStatus) => STATUS_RANK[s];

export const isBarter = (r: GridRow) => /^barter/i.test(r.collab.agreement.fee.trim());

/* -------------------------------- sorting -------------------------------- */

export type SortKey =
  | 'creator' | 'status' | 'fee' | 'expected' | 'views' | 'delivery' | 'cpm' | 'likes' | 'comments' | 'engagement'
  | 'reach' | 'saves' | 'shares' | 'stories' | 'orders' | 'revenue' | 'roas' | 'code';
export type SortDir = 'asc' | 'desc';

const SORT_VALUE: Record<SortKey, (r: GridRow) => number | string | null> = {
  creator: (r) => r.creator.name,
  status: (r) => STATUS_RANK[r.status],
  fee: (r) => r.fee,
  expected: (r) => r.expectedViews || null,
  views: (r) => r.views,
  delivery: (r) => r.deliveryPct,
  cpm: (r) => (r.fee ? r.costPer1000 : null),
  likes: (r) => r.likes,
  comments: (r) => r.comments,
  engagement: (r) => r.engagement,
  reach: (r) => r.reach,
  saves: (r) => r.saves,
  shares: (r) => r.shares,
  stories: (r) => (r.stories.length ? r.stories.filter((s) => s.awaitingScreenshot).length : null),
  orders: (r) => r.orders,
  revenue: (r) => r.revenue,
  roas: (r) => r.roas,
  code: (r) => r.code || null,
};

/** Empty values always sort last, whichever direction is chosen. */
export function sortRows(rows: GridRow[], key: SortKey, dir: SortDir): GridRow[] {
  const get = SORT_VALUE[key];
  const m = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = get(a); const y = get(b);
    if (x === null && y === null) return STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.creator.name.localeCompare(b.creator.name);
    if (x === null) return 1;
    if (y === null) return -1;
    if (typeof x === 'string' || typeof y === 'string') return String(x).localeCompare(String(y)) * m;
    return (x - y) * m || a.creator.name.localeCompare(b.creator.name);
  });
}

/* --------------------------------- dates --------------------------------- */

export function addToISO(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export interface DayPoint { date: string; views: number; likes: number; comments: number }

/** A post's snapshots mapped to calendar dates (posted date + day offset). */
export function snapshotSeries(post: Post | undefined): DayPoint[] {
  if (!post || !post.postedAt) return [];
  return post.snapshots.map((s) => ({ date: addToISO(post.postedAt, s.day), views: s.views, likes: s.likes, comments: s.comments }));
}

/** Total public views of all live Reels by date. Each post's last known value carries forward. */
export function cumulativeViews(rows: GridRow[]): { date: string; views: number }[] {
  const series = rows.filter((r) => r.status === 'Live' && r.primary).map((r) => snapshotSeries(r.primary));
  const all = series.filter((s) => s.length);
  if (!all.length) return [];
  const first = all.map((s) => s[0].date).sort()[0];
  const last = all.map((s) => s[s.length - 1].date).sort().slice(-1)[0];
  const maps = all.map((s) => ({ from: s[0].date, to: s[s.length - 1].date, m: new Map(s.map((p) => [p.date, p.views])) }));
  const out: { date: string; views: number }[] = [];
  const carry = maps.map(() => 0);
  for (let d = first, guard = 0; d <= last && guard < 400; d = addToISO(d, 1), guard += 1) {
    let total = 0;
    maps.forEach((x, i) => {
      const v = x.m.get(d);
      if (v !== undefined) carry[i] = v;
      total += d >= x.from ? carry[i] : 0;
    });
    out.push({ date: d, views: total });
  }
  return out;
}

/* ---------------------------- links, codes, copy ---------------------------- */

export const BRAND_SITE = 'https://riseoats.com';
export const trackingLink = (code: string, programme: Pick<Programme, 'name'>, handle: string) =>
  `${BRAND_SITE}/?ref=${encodeURIComponent(code)}&utm_source=instagram&utm_medium=creator&utm_campaign=${slug(programme.name)}&utm_content=${handle}`;
export const shortTracking = (code: string) => `${BRAND_SITE.replace('https://', '')}/?ref=${code}…`;

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through to the legacy path */ }
  try {
    const t = document.createElement('textarea');
    t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    const ok = document.execCommand('copy');
    t.remove();
    return ok;
  } catch { return false; }
}

export const isHttp = (u: string) => /^https?:\/\//i.test(u);
export const csvCell = (v: string | number | null) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Normalised form of a post link, for spotting duplicates. */
export const normUrl = (u: string) => u.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '').replace(/\/$/, '');

export const firstName = (name: string) => name.split(' ')[0];
export const fmtMillions = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, '')}K` : String(Math.round(n)));
