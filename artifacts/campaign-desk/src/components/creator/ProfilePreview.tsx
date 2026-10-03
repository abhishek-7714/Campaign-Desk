import { CreatorCell, TierBadge } from '@/components/shared';
import type { Creator } from '@/domain/types';
import { fmtINR, fmtNum, fmtPct } from '@/domain/money';
import '@/styles/creator.css';

/** A compact version of how a brand sees this creator in the marketplace. */
export function ProfilePreview({ creator }: { creator: Creator }) {
  const stats: [string, string][] = [
    ['Followers', fmtNum(creator.followers)], ['Avg views', fmtNum(creator.avgViews)], ['Engagement', fmtPct(creator.engagementRate, 1)],
    ['On time', fmtPct(creator.onTimeRate)], ['Rate per Reel', fmtINR(creator.rate)],
  ];
  return (
    <div className="cr-preview">
      <div className="cr-preview-top">
        <CreatorCell creator={creator} size={42} sub={`@${creator.handle} · ${creator.city}`} />
        <TierBadge tier={creator.tier} />
      </div>
      <div className="tags">{creator.niches.map((n) => <span key={n} className="tag">{n}</span>)}</div>
      <dl className="cr-preview-stats">
        {stats.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
    </div>
  );
}
