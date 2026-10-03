import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Download } from 'lucide-react';
import { useStore } from '@/state/store';
import { downloadText, deliveryTone, summarize, type GridRow } from '@/domain/performance';
import { fmtINR, fmtINRShort, fmtNum, fmtPct } from '@/domain/money';
import { Empty, PageTitle } from '@/components/viz/Cards';
import { Bars, ChartFrame } from '@/components/viz/Charts';
import { CreatorCell, Segmented, Stat, TierBadge } from '@/components/shared';
import type { Tier } from '@/domain/types';

type Scope = 'all' | 'Live' | 'Completed';
const ScopeSegmented = Segmented<Scope>;
const TIERS: Tier[] = ['Nano', 'Micro', 'Mid'];
const chipTone = (pct: number | null) => `t-${deliveryTone(pct)}`;

export default function Reports() {
  const { brandProgrammes, gridRows } = useStore();
  const [scope, setScope] = useState<Scope>('all');
  const [all, setAll] = useState(false);

  const data = useMemo(() => brandProgrammes
    .filter((p) => (p.status === 'Live' || p.status === 'Completed') && (scope === 'all' || p.status === scope))
    .map((p) => { const rows = gridRows(p.id); return { p, rows, sum: summarize(rows, p) }; }), [brandProgrammes, gridRows, scope]);

  const live: GridRow[] = data.flatMap((d) => d.rows.filter((r) => r.status === 'Live'));
  const fee = live.reduce((a, r) => a + r.fee, 0);
  const views = live.reduce((a, r) => a + (r.views ?? 0), 0);
  const expected = live.reduce((a, r) => a + r.expectedViews, 0);
  const hasSales = live.some((r) => r.orders !== null);
  const revenue = live.reduce((a, r) => a + (r.revenue ?? 0), 0);
  const delivery = expected ? (views / expected) * 100 : null;

  const byTier = TIERS.map((t) => {
    const g = live.filter((r) => r.creator.tier === t);
    const f = g.reduce((a, r) => a + r.fee, 0); const v = g.reduce((a, r) => a + (r.views ?? 0), 0); const e = g.reduce((a, r) => a + r.expectedViews, 0);
    return { name: t, n: g.length, delivery: e ? Math.round((v / e) * 100) : 0, cost: v ? Math.round((f / v) * 1000) : 0 };
  }).filter((x) => x.n > 0);

  const board = useMemo(() => {
    const m = new Map<string, { row: GridRow; campaigns: number; fee: number; views: number; expected: number; onTime: number; timed: number }>();
    for (const r of live) {
      const cur = m.get(r.creator.id) ?? { row: r, campaigns: 0, fee: 0, views: 0, expected: 0, onTime: 0, timed: 0 };
      cur.campaigns += 1; cur.fee += r.fee; cur.views += r.views ?? 0; cur.expected += r.expectedViews;
      if (r.postedOnTime !== null) { cur.timed += 1; if (r.postedOnTime) cur.onTime += 1; }
      m.set(r.creator.id, cur);
    }
    return [...m.values()].map((x) => ({ ...x, delivery: x.expected ? (x.views / x.expected) * 100 : 0, cost: x.views ? (x.fee / x.views) * 1000 : 0, onTimePct: x.timed ? (x.onTime / x.timed) * 100 : null }))
      .sort((a, b) => b.delivery - a.delivery);
  }, [live]);
  const shown = all ? board : board.slice(0, 10);

  const exportCsv = () => downloadText('nano-club-creator-leaderboard.csv', ['Creator,Handle,Tier,Campaigns,Fee (INR),Views,Expected views,Delivery %,Cost per 1000 views (INR),On time %',
    ...board.map((b) => [b.row.creator.name, `@${b.row.creator.handle}`, b.row.creator.tier, b.campaigns, b.fee, b.views, b.expected, b.delivery.toFixed(0), b.cost.toFixed(0), b.onTimePct === null ? '' : b.onTimePct.toFixed(0)].join(','))].join('\n'));

  return (
    <>
      <PageTitle title="Reports" sub="Compare campaigns and see which creators and creator sizes give you the best value."
        actions={<button className="btn" onClick={exportCsv} disabled={!board.length}><Download size={15} />Export leaderboard</button>} />

      <div className="toolbar">
        <ScopeSegmented label="Campaigns to include" value={scope} onChange={setScope} options={[{ value: 'all', label: 'All' }, { value: 'Live', label: 'Live' }, { value: 'Completed', label: 'Completed' }]} />
      </div>

      {!data.length ? <Empty title="Nothing to report yet">Reports appear once a campaign is live and creators have posted.</Empty> : (
        <>
          <div className="stats">
            <Stat label="Spend on live posts" value={fmtINRShort(fee)} sub={`${live.length} posts across ${data.length} campaign${data.length === 1 ? '' : 's'}`} tone="blue" />
            <Stat label="Views delivered" value={fmtNum(views)} sub={`of ${fmtNum(expected)} paid for`} tone={delivery === null ? 'neutral' : deliveryTone(delivery)} />
            <Stat label="Delivery" value={delivery === null ? '-' : fmtPct(delivery)} sub="views vs views paid for" tone={delivery === null ? 'neutral' : deliveryTone(delivery)} />
            <Stat label="Cost per 1,000 views" value={views ? fmtINR((fee / views) * 1000) : '-'} sub="blended across campaigns" tone="peach" />
            <Stat label="Sales via codes" value={hasSales ? fmtINRShort(revenue) : '-'} sub={hasSales && fee ? `${(revenue / fee).toFixed(1)}x return on spend` : 'Connect Shopify'} tone="mint" />
          </div>

          <div className="grid-2 mt">
            <ChartFrame title="Delivery by creator size" sub="Views delivered as a share of views paid for" summary={byTier.map((t) => `${t.name}: ${t.delivery}% delivery across ${t.n} posts`).join('; ')}>
              <Bars data={byTier} series={[{ key: 'delivery', label: 'Delivery %', color: '#ff6a2b' }]} />
            </ChartFrame>
            <ChartFrame title="Cost per 1,000 views by creator size" sub="Lower is better value" summary={byTier.map((t) => `${t.name}: ₹${t.cost} per 1,000 views`).join('; ')}>
              <Bars data={byTier} series={[{ key: 'cost', label: '₹ per 1,000 views', color: '#10222b' }]} />
            </ChartFrame>
          </div>

          <section className="mt" aria-label="Campaigns compared">
            <div className="sec-head"><h2>Campaigns compared</h2></div>
            <div className="dt-wrap"><table className="dt">
              <thead><tr><th>Campaign</th><th>Status</th><th className="num">Creators</th><th className="num">Spend</th><th className="num">Views</th><th className="num">Delivery</th><th className="num">Cost / 1,000</th><th className="num">Revenue</th><th className="num">Return</th></tr></thead>
              <tbody>{data.map(({ p, sum }) => (
                <tr key={p.id}>
                  <td><Link href={`/programmes/${p.id}?tab=performance`} className="textlink">{p.name}</Link></td>
                  <td>{p.status}</td>
                  <td className="num">{sum.creators}</td>
                  <td className="num">{fmtINRShort(sum.spend)}</td>
                  <td className="num">{fmtNum(sum.views)}</td>
                  <td className="num"><span className={`dchip ${chipTone(sum.deliveryPct)}`}>{sum.deliveryPct === null ? '-' : fmtPct(sum.deliveryPct)}</span></td>
                  <td className="num">{sum.costPer1000 ? fmtINR(sum.costPer1000) : '-'}</td>
                  <td className="num">{sum.revenue !== null ? fmtINRShort(sum.revenue) : '-'}</td>
                  <td className="num">{sum.roas !== null ? `${sum.roas.toFixed(1)}x` : '-'}</td>
                </tr>
              ))}</tbody>
            </table></div>
          </section>

          <section className="mt" aria-label="Creator leaderboard">
            <div className="sec-head"><h2>Creator leaderboard</h2><span className="muted">Ranked by views delivered against views paid for</span></div>
            <div className="dt-wrap"><table className="dt">
              <thead><tr><th>#</th><th>Creator</th><th>Size</th><th className="num">Posts</th><th className="num">Fees</th><th className="num">Views</th><th className="num">Delivery</th><th className="num">Cost / 1,000</th><th className="num">On time</th></tr></thead>
              <tbody>{shown.map((b, i) => (
                <tr key={b.row.creator.id}>
                  <td className="muted-cell">{i + 1}</td>
                  <td><Link href={`/marketplace/${b.row.creator.id}`}><CreatorCell creator={b.row.creator} /></Link></td>
                  <td><TierBadge tier={b.row.creator.tier} /></td>
                  <td className="num">{b.campaigns}</td>
                  <td className="num">{fmtINRShort(b.fee)}</td>
                  <td className="num">{fmtNum(b.views)}</td>
                  <td className="num"><span className={`dchip ${chipTone(b.delivery)}`}>{fmtPct(b.delivery)}</span></td>
                  <td className="num">{b.cost ? fmtINR(b.cost) : '-'}</td>
                  <td className="num">{b.onTimePct === null ? '-' : fmtPct(b.onTimePct)}</td>
                </tr>
              ))}</tbody>
            </table></div>
            {board.length > 10 && <p style={{ marginTop: 12 }}><button className="link-btn" onClick={() => setAll(!all)}>{all ? 'Show top 10' : `Show all ${board.length} creators`}</button></p>}
          </section>
        </>
      )}
    </>
  );
}
