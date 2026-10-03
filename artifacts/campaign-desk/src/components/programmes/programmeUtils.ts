import type { ProgrammeStatus, Tier } from '@/domain/types';
import type { Tone } from '@/domain/format';
import { todayISO } from '@/domain/helpers';
import { daysBetween } from '@/domain/performance';
import { roundTo } from '@/domain/money';

/** Local helpers for the brand-side Campaign (programme) screens. */

export const STATUS_TONE: Record<ProgrammeStatus, Tone> = { Live: 'blue', 'Open call': 'yellow', Draft: 'neutral', Completed: 'green' };

export const DELIVERABLE_OPTIONS = ['1 Reel', '1 Reel + 1 Story', '1 Reel + 2 Stories'] as const;

export const daysUntil = (iso: string) => daysBetween(todayISO(), iso);

export function applyLeftLabel(applyBy: string): string {
  const d = daysUntil(applyBy);
  if (d < 0) return 'Applications closed';
  if (d === 0) return 'Last day to apply';
  return `${d} day${d === 1 ? '' : 's'} left to apply`;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Public report link for a campaign. */
export const shareUrl = (programmeId: string) => `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/share/${programmeId}`;

/** Rough expected views per Reel by creator size, used only to suggest a starting fee range. */
const MIN_VIEWS: Record<Tier, number> = { Nano: 4000, Micro: 15000, Mid: 80000 };
const MAX_VIEWS: Record<Tier, number> = { Nano: 15000, Micro: 90000, Mid: 220000 };

export function suggestFeeRange(tiers: readonly Tier[], ratePer1000: number): { min: number; max: number } | null {
  if (!tiers.length || !(ratePer1000 > 0)) return null;
  const lo = Math.min(...tiers.map((t) => MIN_VIEWS[t]));
  const hi = Math.max(...tiers.map((t) => MAX_VIEWS[t]));
  return { min: Math.max(500, roundTo((lo / 1000) * ratePer1000, 500)), max: Math.max(500, roundTo((hi / 1000) * ratePer1000, 500)) };
}
