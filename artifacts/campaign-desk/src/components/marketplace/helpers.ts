import { useMemo } from 'react';
import type { Application, Creator, Programme } from '@/domain/types';
import { useStore } from '@/state/store';

/** Programmes a brand can still invite people to. */
export const isInvitable = (p: Programme) => p.status === 'Open call' || p.status === 'Live';
export const isActiveApp = (a: Application) => a.status !== 'Declined' && a.status !== 'Rejected';

const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));

export const MATCH_HELP =
  'Match score out of 100. 40 points for niche overlap with the programme, 20 for tier fit, 20 for views delivered against what was paid for, 20 for publishing on time.';

/** Simple 0-100 fit between a creator and a programme. */
export function matchScore(c: Creator, p: Programme): number {
  const overlap = c.niches.filter((n) => p.niches.includes(n)).length;
  const niche = p.niches.length ? clamp(overlap / Math.min(2, p.niches.length)) * 40 : 40;
  const tier = !p.tiers.length || p.tiers.includes(c.tier) ? 20 : 0;
  const delivery = clamp((c.deliveredPct - 60) / 40) * 20;
  const onTime = clamp((c.onTimeRate - 60) / 40) * 20;
  return Math.round(niche + tier + delivery + onTime);
}

export const matchTone = (score: number) => (score >= 75 ? 'green' : score >= 50 ? 'yellow' : 'neutral') as 'green' | 'yellow' | 'neutral';

export const RATE_OPTIONS = [
  { value: 'any', label: 'Any rate' },
  { value: 'u3', label: 'Under ₹3K' },
  { value: '3-8', label: '₹3-8K' },
  { value: '8-15', label: '₹8-15K' },
  { value: 'o15', label: 'Over ₹15K' },
] as const;

export function rateInBucket(rate: number, bucket: string): boolean {
  switch (bucket) {
    case 'u3': return rate < 3000;
    case '3-8': return rate >= 3000 && rate <= 8000;
    case '8-15': return rate > 8000 && rate <= 15000;
    case 'o15': return rate > 15000;
    default: return true;
  }
}

export const ONTIME_OPTIONS = [
  { value: '0', label: 'Any on-time rate' },
  { value: '80', label: 'On time 80%+' },
  { value: '90', label: 'On time 90%+' },
] as const;

export interface CreatorLinks {
  /** Collaborations in this workspace's programmes. */
  worked: { programmes: Programme[]; avgDelivery: number | null } | null;
  /** Programmes (Live) the creator is currently working in. */
  live: Programme[];
  /** Open applications or invitations that have not turned into a collaboration yet. */
  pending: { app: Application; programme: Programme }[];
}

/** How each creator already relates to this workspace: past work, live work, open invitations. */
export function useCreatorLinks(): (creatorId: string) => CreatorLinks {
  const { brandProgrammes, applications, gridRows } = useStore();
  const map = useMemo(() => {
    const out = new Map<string, CreatorLinks>();
    const get = (id: string): CreatorLinks => {
      let v = out.get(id);
      if (!v) { v = { worked: null, live: [], pending: [] }; out.set(id, v); }
      return v;
    };
    const deliveries = new Map<string, number[]>();
    for (const p of brandProgrammes) {
      for (const row of gridRows(p.id)) {
        const l = get(row.creator.id);
        if (!l.worked) l.worked = { programmes: [], avgDelivery: null };
        l.worked.programmes.push(p);
        if (p.status === 'Live') l.live.push(p);
        if (row.deliveryPct !== null) deliveries.set(row.creator.id, [...(deliveries.get(row.creator.id) ?? []), row.deliveryPct]);
      }
    }
    for (const [id, list] of deliveries) {
      const w = out.get(id)?.worked;
      if (w) w.avgDelivery = list.reduce((a, b) => a + b, 0) / list.length;
    }
    for (const a of applications) {
      if (!isActiveApp(a) || a.status === 'Accepted') continue;
      const programme = brandProgrammes.find((p) => p.id === a.programmeId);
      if (programme) get(a.creatorId).pending.push({ app: a, programme });
    }
    return out;
  }, [brandProgrammes, applications, gridRows]);
  return (id) => map.get(id) ?? { worked: null, live: [], pending: [] };
}
