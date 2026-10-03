/**
 * Small pure helpers for the creator screens: how well a programme fits a creator,
 * plain-English deliverables, and which applications are still live.
 */
import type { Application, Creator, Programme, Tier } from '@/domain/types';
import { parseDeliverables } from '@/domain/collab';
import { daysBetween } from '@/domain/performance';
import { todayISO } from '@/domain/helpers';
import type { Tone } from '@/domain/format';

export interface Fit {
  score: number;
  matchedNiches: string[];
  nicheOk: boolean;
  tierOk: boolean;
  cityOk: boolean;
  cityRelevant: boolean;
  langOk: boolean;
}

/** Niche overlap 55, size 25, city 10, language 10. Each part is explained on the detail page. */
export function fitScore(creator: Creator, p: Programme): Fit {
  const matchedNiches = creator.niches.filter((n) => p.niches.includes(n));
  const nicheShare = Math.min(1, matchedNiches.length / Math.max(1, Math.min(2, creator.niches.length)));
  const tierOk = p.tiers.includes(creator.tier);
  const cityRelevant = p.cities.length > 0;
  const cityOk = !cityRelevant || p.cities.includes(creator.city);
  const langOk = creator.languages.some((l) => l === 'English' || l === 'Hindi');
  const score = Math.round(55 * nicheShare + (tierOk ? 25 : 0) + (cityOk ? 10 : 0) + (langOk ? 10 : 0));
  return { score, matchedNiches, nicheOk: matchedNiches.length > 0, tierOk, cityOk, cityRelevant, langOk };
}

export const FIT_EXPLAINER = 'Fit is out of 100: up to 55 for niches you share with the brand, 25 if your size (Nano, Micro or Mid) is in their range, 10 for city and 10 for language. Briefs here are in English or Hindi.';

export const fitLabel = (score: number) => (score >= 80 ? 'Great fit' : score >= 60 ? 'Good fit' : 'Partial fit');
export const fitTone = (score: number): Tone => (score >= 80 ? 'green' : score >= 60 ? 'blue' : 'neutral');

export const TIER_RANGE: Record<Tier, string> = { Nano: 'under 10K followers', Micro: '10K to 100K followers', Mid: '100K to 500K followers' };

/** Whole days from today to an ISO date. Negative when the date has passed. */
export const daysUntil = (iso: string) => daysBetween(todayISO(), iso);

export function countdown(applyBy: string): { text: string; urgent: boolean; over: boolean } {
  const d = daysUntil(applyBy);
  if (d < 0) return { text: 'Applications closed', urgent: false, over: true };
  if (d === 0) return { text: 'Last day to apply', urgent: true, over: false };
  if (d === 1) return { text: '1 day left', urgent: true, over: false };
  return { text: `${d} days left`, urgent: d <= 3, over: false };
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five'];
/** "1 Reel + 1 Story" -> "One Instagram Reel and one Story" */
export function plainDeliverable(s: string): string {
  const parts = parseDeliverables(s).map(({ type, n }) => {
    const w = WORDS[n] ?? String(n);
    const noun = type === 'Reel' ? (n === 1 ? 'Instagram Reel' : 'Instagram Reels')
      : type === 'Story' ? (n === 1 ? 'Story' : 'Stories')
        : n === 1 ? 'feed post' : 'feed posts';
    return `${w} ${noun}`;
  });
  const text = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Applications that are still going: not declined and not rejected. */
export const isLive = (a: Application) => a.status !== 'Declined' && a.status !== 'Rejected';
/** The brand has made a move and the creator needs to answer. */
export const needsAnswer = (a: Application) => a.status === 'Invited' || (a.status === 'Negotiating' && a.lastMoveBy === 'brand');

export const firstName = (name: string) => name.split(' ')[0];
