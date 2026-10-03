import { useState, type ReactNode } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { ArrowLeft, Send, X } from 'lucide-react';
import type { Creator } from '@/domain/types';
import { useStore } from '@/state/store';
import { CreatorAvatar, TierBadge } from '@/components/shared';
import { Empty, PageTitle } from '@/components/viz/Cards';
import InviteDialog from '@/components/marketplace/InviteDialog';
import { useCreatorLinks } from '@/components/marketplace/helpers';
import { expectedViewsFor } from '@/domain/performance';
import { fmtINR, fmtNum, fmtPct } from '@/domain/money';
import '@/styles/marketplace.css';

type NumRow = { label: string; get: (c: Creator) => number; show: (n: number) => string; better: 'high' | 'low' };

const NUM_ROWS: NumRow[] = [
  { label: 'Followers', get: (c) => c.followers, show: fmtNum, better: 'high' },
  { label: 'Avg views', get: (c) => c.avgViews, show: fmtNum, better: 'high' },
  { label: 'Engagement', get: (c) => c.engagementRate, show: (n) => fmtPct(n, 1), better: 'high' },
  { label: 'On-time rate', get: (c) => c.onTimeRate, show: (n) => fmtPct(n), better: 'high' },
  { label: 'Views delivered', get: (c) => c.deliveredPct, show: (n) => fmtPct(n), better: 'high' },
  { label: 'Rate per Reel', get: (c) => c.rate, show: fmtINR, better: 'low' },
  { label: 'Cost per 1,000 expected views', get: (c) => (c.rate / expectedViewsFor(c)) * 1000, show: fmtINR, better: 'low' },
];

export default function Compare() {
  const { creators } = useStore();
  const linksFor = useCreatorLinks();
  const [, navigate] = useLocation();
  const search = useSearch();
  const raw = (new URLSearchParams(search).get('ids') ?? '').split(',').filter(Boolean);
  const ids = Array.from(new Set(raw)).filter((id) => creators.some((c) => c.id === id)).slice(0, 4);
  const picked = ids.map((id) => creators.find((c) => c.id === id)!);
  const [inviting, setInviting] = useState<Creator | null>(null);

  const backHref = `/marketplace${ids.length ? `?cmp=${ids.join(',')}` : ''}`;
  const remove = (id: string) => navigate(`/marketplace/compare?ids=${ids.filter((x) => x !== id).join(',')}`, { replace: true });

  if (picked.length < 2) {
    return (
      <>
        <PageTitle title="Compare creators" />
        <Empty title="Pick at least two creators to compare">
          Tick the Compare box on two to four creator cards in the marketplace. <Link href={backHref} className="textlink">Go to the marketplace</Link>
        </Empty>
      </>
    );
  }

  const cell = (best: boolean, children: ReactNode, key: string) => (
    <td key={key} className={best ? 'mp-best' : undefined}>{children}{best && <span className="sr-only"> (best value)</span>}</td>
  );

  return (
    <>
      <PageTitle title="Compare creators" sub={`${picked.length} creators side by side. The best value in each number row is shaded green.`}
        actions={<Link href={backHref} className="btn"><ArrowLeft size={14} />Back to marketplace</Link>} />

      <div className="dt-wrap mp-compare">
        <table className="dt">
          <thead>
            <tr>
              <th className="sticky-col" scope="col"><span className="sr-only">Measure</span></th>
              {picked.map((c) => (
                <th key={c.id} scope="col" className="mp-ch">
                  <div className="mp-ch-top">
                    <Link href={`/marketplace/${c.id}`} className="mp-ch-id"><CreatorAvatar creator={c} size={36} /><span><b>{c.name}</b><small>@{c.handle}</small></span></Link>
                    <button type="button" className="icon-flat" aria-label={`Remove ${c.name} from comparison`} onClick={() => remove(c.id)}><X size={15} /></button>
                  </div>
                  <button type="button" className="btn small primary" onClick={() => setInviting(c)}><Send size={13} />Invite</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr><td className="sticky-col mp-rl">Tier</td>{picked.map((c) => <td key={c.id}><TierBadge tier={c.tier} /></td>)}</tr>
            {NUM_ROWS.map((r) => {
              const vals = picked.map(r.get);
              const target = r.better === 'high' ? Math.max(...vals) : Math.min(...vals);
              const allSame = vals.every((v) => v === vals[0]);
              return (
                <tr key={r.label}>
                  <td className="sticky-col mp-rl">{r.label}</td>
                  {picked.map((c, i) => cell(!allSame && vals[i] === target, r.show(vals[i]), c.id))}
                </tr>
              );
            })}
            <tr><td className="sticky-col mp-rl">Niches</td>{picked.map((c) => <td key={c.id}><div className="tags mp-wrap">{c.niches.map((n) => <span key={n} className="tag">{n}</span>)}</div></td>)}</tr>
            <tr><td className="sticky-col mp-rl">City</td>{picked.map((c) => <td key={c.id}>{c.city}</td>)}</tr>
            <tr><td className="sticky-col mp-rl">Languages</td>{picked.map((c) => <td key={c.id}>{c.languages.join(', ')}</td>)}</tr>
            <tr>
              <td className="sticky-col mp-rl">History with you</td>
              {picked.map((c) => {
                const w = linksFor(c.id).worked;
                return (
                  <td key={c.id}>
                    {w ? <>{w.programmes.length} collaboration{w.programmes.length === 1 ? '' : 's'}{w.avgDelivery !== null && <>, {Math.round(w.avgDelivery)}% delivered</>}</> : <span className="muted-cell">None yet</span>}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="muted mp-foot">Cost per 1,000 expected views is the asking rate divided by expected views (90% of average views).</p>

      {inviting && <InviteDialog creator={inviting} onClose={() => setInviting(null)} />}
    </>
  );
}
