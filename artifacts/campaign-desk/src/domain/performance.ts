/**
 * Everything that turns raw records (posts, snapshots, collaborations) into the numbers
 * brands look at. Pure functions: no React, no storage. Pages should call these instead of
 * re-deriving metrics, so every screen shows the same figure for the same thing.
 *
 * All numbers in this prototype are SAMPLE data produced by `simulateSnapshots`. Nothing is
 * collected from Instagram.
 */
import type { Campaign, Creator, InsightSource, Integrations, Post, Programme, Snapshot } from './types';
import { addDays, todayISO } from './helpers';
import { fmtINR, fmtNum, parseINR, roundTo } from './money';

/* ------------------------------ randomness ------------------------------ */

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rngFor = (key: string) => mulberry32(hash(key));

export const daysBetween = (fromISO: string, toISO: string) =>
  Math.round((new Date(`${toISO}T12:00:00`).getTime() - new Date(`${fromISO}T12:00:00`).getTime()) / 86400000);

/* ------------------------- sample-data simulator ------------------------- */

/**
 * Daily view counts for a post that has been live `daysLive` days. Views follow the usual
 * Reel curve: most of the total arrives in the first week.
 */
export function simulateSnapshots(key: string, expected: number, factor: number, er: number, daysLive: number): Snapshot[] {
  const rng = rngFor(key);
  const total = Math.max(0, expected * factor);
  const out: Snapshot[] = [];
  let prev = 0;
  for (let d = 0; d <= Math.max(0, daysLive); d += 1) {
    const curve = 1 - Math.exp(-(d + 0.7) / 3.4);
    const views = Math.max(prev, Math.round(total * curve * (0.97 + rng() * 0.06)));
    const likes = Math.round(views * (er * 0.8 / 100) * (0.88 + rng() * 0.24));
    const comments = Math.round(likes * (0.035 + rng() * 0.03));
    out.push({ day: d, views, likes, comments });
    prev = views;
  }
  return out;
}

/** A small upward nudge, used by "Refresh now". */
export function bumpSnapshots(snaps: Snapshot[], key: string): Snapshot[] {
  if (!snaps.length) return snaps;
  const rng = rngFor(`${key}:${Date.now()}`);
  const last = snaps[snaps.length - 1];
  const up = 1 + 0.004 + rng() * 0.02;
  return [...snaps.slice(0, -1), {
    ...last, views: Math.round(last.views * up), likes: Math.round(last.likes * up), comments: Math.round(last.comments * up),
  }];
}

/** Factor applied to expected views: how a creator tends to perform against what was priced. */
export function deliveryFactorFor(creator: Creator, key: string): number {
  const rng = rngFor(`factor:${key}`);
  const f = (creator.deliveredPct / 100) * (0.8 + rng() * 0.42);
  return Math.min(2.2, Math.max(0.18, f));
}

/** What an "AI reads the screenshot" step would extract. Deterministic per post. */
export function readScreenshotMock(post: Post, creator: Creator): { views?: number; reach: number; saves: number; shares: number; replies?: number } {
  const rng = rngFor(`shot:${post.id}`);
  if (post.type === 'Story') {
    const views = Math.round(creator.followers * (0.06 + rng() * 0.1));
    return { views, reach: Math.round(views * (0.88 + rng() * 0.08)), saves: Math.round(views * 0.004), shares: Math.round(views * (0.006 + rng() * 0.01)), replies: Math.round(views * (0.003 + rng() * 0.004)) };
  }
  const s = latest(post);
  const views = s?.views ?? creator.avgViews;
  const likes = s?.likes ?? views * 0.05;
  return { reach: Math.round(views * (0.74 + rng() * 0.12)), saves: Math.round(likes * (0.1 + rng() * 0.06)), shares: Math.round(likes * (0.06 + rng() * 0.05)) };
}

/** Insight values for a post whose reach is unlocked by a connected account. */
export function insightsFromConnection(post: Post, creator: Creator, source: InsightSource): NonNullable<Post['insights']> {
  const r = readScreenshotMock(post, creator);
  return { reach: r.reach, saves: r.saves, shares: r.shares, views: r.views, replies: r.replies, source, at: new Date().toISOString() };
}

/* -------------------------------- fees --------------------------------- */

export const expectedViewsFor = (creator: Creator) => Math.max(500, roundTo(creator.avgViews * 0.9, 500));

/** Plan-rate fee: expected views x programme rate per 1,000 views, rounded to ₹500. */
export function suggestedFee(creator: Creator, programme: Pick<Programme, 'ratePer1000'>): { expectedViews: number; fee: number } {
  const expectedViews = expectedViewsFor(creator);
  return { expectedViews, fee: Math.max(500, roundTo((expectedViews / 1000) * programme.ratePer1000, 500)) };
}

/* ------------------------------- row model ------------------------------- */

export type RowStatus = 'Live' | 'Fetching' | 'Planned' | 'Late' | 'Missed';

export const latest = (p: Post | undefined): Snapshot | undefined => (p && p.snapshots.length ? p.snapshots[p.snapshots.length - 1] : undefined);

export function postStatus(p: Post, nowMs: number, today = todayISO()): RowStatus {
  const posted = p.type === 'Story' ? !!p.postedAt : !!p.url;
  if (posted) return p.type !== 'Story' && p.fetchingUntil > nowMs ? 'Fetching' : 'Live';
  if (p.plannedDate && p.plannedDate < addDays(-7)) return 'Missed';
  if (p.plannedDate && p.plannedDate < today) return 'Late';
  return 'Planned';
}

export interface StoryInfo {
  post: Post;
  status: RowStatus;
  views: number | null;
  /** Posted, but numbers are private until the creator confirms them. */
  awaitingScreenshot: boolean;
  confirmed: boolean;
}

export interface GridRow {
  collab: Campaign;
  creator: Creator;
  primary?: Post;
  stories: StoryInfo[];
  status: RowStatus;
  fee: number;
  expectedViews: number;
  views: number | null;
  likes: number | null;
  comments: number | null;
  engagement: number | null; // (likes + comments) / views, percent
  deliveryPct: number | null; // views / expectedViews, percent
  costPer1000: number | null; // fee / views x 1000
  reach: number | null;
  saves: number | null;
  shares: number | null;
  insightSource?: InsightSource;
  /** Reach/saves/shares are private. True when nothing has unlocked them yet. */
  locked: boolean;
  /** The brand could unlock reach itself by connecting its Instagram (collab posts only). */
  brandCanUnlock: boolean;
  clicks: number | null;
  orders: number | null;
  revenue: number | null;
  roas: number | null;
  postedOnTime: boolean | null;
  daysLive: number | null;
  lastRefreshed: string;
  code: string;
}

export interface PerfState {
  campaigns: readonly Campaign[];
  posts: readonly Post[];
  creators: readonly Creator[];
  integrations: Integrations;
}

export function buildGridRows(programmeId: string, s: PerfState, nowMs = Date.now()): GridRow[] {
  const rows: GridRow[] = [];
  for (const collab of s.campaigns) {
    if (collab.programmeId !== programmeId) continue;
    const creator = s.creators.find((c) => c.id === collab.creatorId);
    if (!creator) continue;
    const mine = s.posts.filter((p) => p.collaborationId === collab.id);
    const primary = mine.find((p) => p.type === 'Reel') ?? mine.find((p) => p.type === 'Post');
    const fee = parseINR(collab.agreement.fee);
    const status: RowStatus = primary ? postStatus(primary, nowMs) : 'Planned';
    const snap = status === 'Live' || status === 'Fetching' ? latest(primary) : undefined;
    const expectedViews = primary?.expectedViews ?? 0;
    const views = snap && status === 'Live' ? snap.views : null;
    const engagement = snap && snap.views ? ((snap.likes + snap.comments) / snap.views) * 100 : null;
    const ins = primary?.insights;
    const orders = s.integrations.shopify && views !== null && collab.convRate ? Math.round(views * collab.convRate) : null;
    const revenue = orders !== null ? orders * (collab.aov ?? 0) : null;
    const stories: StoryInfo[] = mine.filter((p) => p.type === 'Story').map((p) => {
      const st = postStatus(p, nowMs);
      return { post: p, status: st, views: p.insights?.views ?? null, awaitingScreenshot: st === 'Live' && !p.insights, confirmed: !!p.insights };
    });
    rows.push({
      collab, creator, primary, stories, status, fee, expectedViews,
      views, likes: snap && status === 'Live' ? snap.likes : null, comments: snap && status === 'Live' ? snap.comments : null,
      engagement,
      deliveryPct: views !== null && expectedViews ? (views / expectedViews) * 100 : null,
      costPer1000: views ? (fee / views) * 1000 : null,
      reach: ins?.reach ?? null, saves: ins?.saves ?? null, shares: ins?.shares ?? null, insightSource: ins?.source,
      locked: !ins,
      brandCanUnlock: !ins && !!primary?.isCollab && !s.integrations.instagram,
      clicks: views !== null && s.integrations.shopify ? Math.round(views * 0.0058) : null,
      orders, revenue, roas: revenue !== null && fee ? revenue / fee : null,
      postedOnTime: primary?.postedAt && primary.plannedDate ? primary.postedAt <= primary.plannedDate : null,
      daysLive: primary?.postedAt ? daysBetween(primary.postedAt, todayISO()) : null,
      lastRefreshed: primary?.lastRefreshed ?? '',
      code: collab.code ?? '',
    });
  }
  return rows;
}

/* -------------------------------- summary -------------------------------- */

export interface Summary {
  creators: number;
  spend: number;
  budget: number;
  live: number;
  fetching: number;
  planned: number;
  late: number;
  missed: number;
  expectedViews: number; // of live rows
  views: number;
  deliveryPct: number | null;
  costPer1000: number | null; // blended, live rows only
  planCostPer1000: number;
  orders: number | null;
  revenue: number | null;
  roas: number | null;
  storiesAwaiting: number;
  storiesTotal: number;
  unlocked: number;
}

export function summarize(rows: GridRow[], programme: Pick<Programme, 'budget' | 'ratePer1000'>): Summary {
  const live = rows.filter((r) => r.status === 'Live');
  const liveFee = live.reduce((a, r) => a + r.fee, 0);
  const views = live.reduce((a, r) => a + (r.views ?? 0), 0);
  const expected = live.reduce((a, r) => a + r.expectedViews, 0);
  const hasSales = live.some((r) => r.orders !== null);
  const revenue = hasSales ? live.reduce((a, r) => a + (r.revenue ?? 0), 0) : null;
  return {
    creators: rows.length,
    spend: rows.reduce((a, r) => a + r.fee, 0),
    budget: programme.budget,
    live: live.length,
    fetching: rows.filter((r) => r.status === 'Fetching').length,
    planned: rows.filter((r) => r.status === 'Planned').length,
    late: rows.filter((r) => r.status === 'Late').length,
    missed: rows.filter((r) => r.status === 'Missed').length,
    expectedViews: expected,
    views,
    deliveryPct: expected ? (views / expected) * 100 : null,
    costPer1000: views ? (liveFee / views) * 1000 : null,
    planCostPer1000: programme.ratePer1000,
    orders: hasSales ? live.reduce((a, r) => a + (r.orders ?? 0), 0) : null,
    revenue,
    roas: revenue !== null && liveFee ? revenue / liveFee : null,
    storiesAwaiting: rows.reduce((a, r) => a + r.stories.filter((s) => s.awaitingScreenshot).length, 0),
    storiesTotal: rows.reduce((a, r) => a + r.stories.length, 0),
    unlocked: rows.filter((r) => !r.locked).length,
  };
}

/** Delivery bucket used for colour: how many of the paid-for views arrived. */
export const deliveryTone = (pct: number | null): 'green' | 'yellow' | 'coral' | 'neutral' =>
  pct === null ? 'neutral' : pct >= 100 ? 'green' : pct >= 70 ? 'yellow' : 'coral';

/* -------------------------------- insights -------------------------------- */

export interface Insight { tone: 'good' | 'warn' | 'bad' | 'info'; text: string }

/** Plain-language observations. Rule-based, not AI-written, and only about numbers on screen. */
export function programmeInsights(rows: GridRow[], programme: Pick<Programme, 'ratePer1000'>): Insight[] {
  const out: Insight[] = [];
  const live = rows.filter((r) => r.status === 'Live' && r.deliveryPct !== null);
  if (!live.length) return [{ tone: 'info', text: 'No posts are live yet. Add links as creators publish and numbers will appear here.' }];

  const under = live.filter((r) => (r.deliveryPct ?? 0) < 60);
  if (under.length) {
    const spend = under.reduce((a, r) => a + r.fee, 0);
    out.push({ tone: 'bad', text: `${under.length} creator${under.length === 1 ? '' : 's'} delivered under 60% of the views you paid for, ${fmtINR(spend)} of spend.` });
  }
  const sum = summarize(rows, { budget: 0, ratePer1000: programme.ratePer1000 });
  if (sum.costPer1000 !== null) {
    const better = sum.costPer1000 <= programme.ratePer1000;
    out.push({
      tone: better ? 'good' : 'warn',
      text: `Blended cost is ${fmtINR(sum.costPer1000)} per 1,000 views against a plan of ${fmtINR(programme.ratePer1000)}${better ? ', so you are ahead of plan.' : '.'}`,
    });
  }
  const star = [...live].sort((a, b) => (a.costPer1000 ?? 1e9) - (b.costPer1000 ?? 1e9)).find((r) => (r.deliveryPct ?? 0) >= 110);
  if (star) out.push({ tone: 'good', text: `${star.creator.name} delivered ${Math.round(star.deliveryPct ?? 0)}% of expected views at ${fmtINR(star.costPer1000 ?? 0)} per 1,000, your best value so far.` });

  const byTier = (['Nano', 'Micro', 'Mid'] as const).map((t) => {
    const g = live.filter((r) => r.creator.tier === t);
    return { t, n: g.length, avg: g.length ? g.reduce((a, r) => a + (r.deliveryPct ?? 0), 0) / g.length : 0 };
  }).filter((x) => x.n >= 3);
  if (byTier.length >= 2) {
    const best = [...byTier].sort((a, b) => b.avg - a.avg)[0];
    const worst = [...byTier].sort((a, b) => a.avg - b.avg)[0];
    if (best.t !== worst.t && best.avg - worst.avg >= 10) out.push({ tone: 'info', text: `${best.t} creators delivered ${Math.round(best.avg)}% of expected views on average, against ${Math.round(worst.avg)}% for ${worst.t}.` });
  }
  const behind = rows.filter((r) => r.status === 'Late' || r.status === 'Missed');
  if (behind.length) out.push({ tone: 'warn', text: `${behind.length} deliverable${behind.length === 1 ? ' is' : 's are'} late or missed: ${behind.slice(0, 3).map((r) => r.creator.name.split(' ')[0]).join(', ')}${behind.length > 3 ? ' and others' : ''}.` });
  if (sum.storiesAwaiting) out.push({ tone: 'info', text: `${sum.storiesAwaiting} stor${sum.storiesAwaiting === 1 ? 'y is' : 'ies are'} waiting for a screenshot. Story views are private to the creator.` });
  return out.slice(0, 5);
}

/* ---------------------------------- CSV ---------------------------------- */

export function gridToCSV(rows: GridRow[]): string {
  const head = ['Creator', 'Handle', 'Tier', 'Status', 'Fee (INR)', 'Expected views', 'Views', 'Delivery %', 'Likes', 'Comments', 'Engagement %', 'Cost per 1000 views (INR)', 'Reach', 'Saves', 'Shares', 'Reach source', 'Orders', 'Revenue (INR)', 'ROAS', 'Code', 'Post link'];
  const q = (v: string | number | null) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) => [
    r.creator.name, `@${r.creator.handle}`, r.creator.tier, r.status, r.fee, r.expectedViews, r.views,
    r.deliveryPct === null ? null : r.deliveryPct.toFixed(0), r.likes, r.comments, r.engagement === null ? null : r.engagement.toFixed(1),
    r.costPer1000 === null ? null : r.costPer1000.toFixed(0), r.reach, r.saves, r.shares, r.insightSource ?? '', r.orders, r.revenue,
    r.roas === null ? null : r.roas.toFixed(1), r.code, r.primary?.url ?? '',
  ].map(q).join(','));
  return [head.join(','), ...lines].join('\n');
}

export function downloadText(filename: string, text: string, mime = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ----------------------------- link validation ---------------------------- */

export type LinkKind = 'Reel' | 'Post' | 'Story' | null;
/** Recognises an Instagram post link. Returns the kind, or null when it is not one. */
export function parseInstagramLink(raw: string): { kind: LinkKind; handle?: string } {
  const s = raw.trim();
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (!/(^|\.)instagram\.com$/i.test(u.hostname)) return { kind: null };
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts[0] === 'stories') return { kind: 'Story', handle: parts[1] };
    const i = parts.findIndex((x) => ['reel', 'reels', 'p', 'tv'].includes(x));
    if (i === -1 || !parts[i + 1]) return { kind: null };
    return { kind: parts[i] === 'p' ? 'Post' : 'Reel', handle: i > 0 ? parts[0] : undefined };
  } catch {
    return { kind: null };
  }
}

/** Short label for a post link, for tables: "reel/C9xk2…" */
export const shortLink = (url: string) => url.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '');

/** Sample-data caption used wherever a view count is shown without a source. */
export const SAMPLE_NOTE = 'Sample data for this prototype. Live collection is not connected.';

export { fmtNum };
