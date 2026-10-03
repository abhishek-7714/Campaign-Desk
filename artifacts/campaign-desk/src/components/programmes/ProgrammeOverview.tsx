import { useMemo, type ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Search } from 'lucide-react';
import type { Programme } from '@/domain/types';
import type { Tone } from '@/domain/format';
import { shortDate } from '@/domain/format';
import { todayISO } from '@/domain/helpers';
import { daysBetween, deliveryTone, programmeInsights, summarize, type GridRow, type Insight } from '@/domain/performance';
import { fmtINR, fmtINRShort, fmtNum, fmtPct } from '@/domain/money';
import { CreatorCell, Stat } from '@/components/shared';
import { ChartFrame, Donut } from '@/components/viz/Charts';
import { Empty, Pill } from '@/components/viz/Cards';
import { useStore } from '@/state/store';
import { plural } from './programmeUtils';
import '@/styles/programmes.css';

const INSIGHT_TONE: Record<Insight['tone'], Tone> = { good: 'green', warn: 'yellow', bad: 'coral', info: 'blue' };

function NextStep({ p, accepted, waiting }: { p: Programme; accepted: number; waiting: number }) {
  const { setProgrammeStatus } = useStore();
  const find = <Link href="/marketplace" className="btn"><Search size={14} />Find creators</Link>;
  let title: string; let body: string; let actions: ReactNode;
  if (p.status === 'Draft') {
    title = 'Next step: publish this campaign';
    body = 'It is a draft, so only you can see it. Publishing puts it on the marketplace where creators can apply. You can also invite creators yourself. Results show here once creators are accepted and their posts go live.';
    actions = <><button className="btn primary" onClick={() => setProgrammeStatus(p.id, 'Open call')}>Publish to marketplace</button>{find}</>;
  } else if (p.status === 'Open call') {
    title = accepted ? 'Next step: start the campaign' : 'Next step: accept your first creators';
    body = waiting
      ? `${plural(waiting, 'creator')} ${waiting === 1 ? 'is' : 'are'} in your pipeline. Accept the ones you want, then start the campaign when you are ready.`
      : 'Nobody is in your pipeline yet. Creators can apply until the apply-by date, and you can invite creators from the marketplace.';
    actions = <><Link href={`/programmes/${p.id}?tab=creators`} className="btn primary">Open creator pipeline<ArrowRight size={14} /></Link>{find}</>;
  } else if (p.status === 'Live') {
    title = 'No collaborations yet';
    body = 'This campaign is live but has no accepted creators. Add creators from the marketplace to start collecting results.';
    actions = <>{find}</>;
  } else {
    title = 'No collaborations were recorded';
    body = 'This campaign finished without any accepted creators, so there are no results to show.';
    actions = null;
  }
  return (
    <section className="card pg-next">
      <h3>{title}</h3>
      <p>{body}</p>
      {actions && <div className="row-actions">{actions}</div>}
    </section>
  );
}

function RankRow({ r }: { r: GridRow }) {
  const t = deliveryTone(r.deliveryPct);
  return (
    <li className="pg-rank">
      <Link href={`/campaigns/${r.collab.id}`} className="pg-clink"><CreatorCell creator={r.creator} size={30} /></Link>
      <span className={`dchip t-${t}`} title="Views delivered vs paid for">{fmtPct(r.deliveryPct ?? 0)}</span>
      <small className="muted">{r.costPer1000 === null ? '' : `${fmtINR(r.costPer1000)} per 1,000`}</small>
    </li>
  );
}

export default function ProgrammeOverview({ programme: p }: { programme: Programme }) {
  const { gridRows, applications } = useStore();
  const rows = useMemo(() => gridRows(p.id), [gridRows, p.id]);
  const apps = applications.filter((a) => a.programmeId === p.id);
  const accepted = apps.filter((a) => a.status === 'Accepted').length;
  const waiting = apps.filter((a) => !['Accepted', 'Declined', 'Rejected'].includes(a.status)).length;

  if (!rows.length) return <NextStep p={p} accepted={accepted} waiting={waiting} />;

  const s = summarize(rows, p);
  const insights = programmeInsights(rows, p);
  const spendPct = p.budget ? (s.spend / p.budget) * 100 : 0;
  const postsLive = s.live + s.fetching;
  const onPlan = s.costPer1000 !== null && s.costPer1000 <= p.ratePer1000;

  const ranked = rows.filter((r) => r.status === 'Live' && r.deliveryPct !== null).sort((a, b) => (b.deliveryPct ?? 0) - (a.deliveryPct ?? 0));
  const best = ranked.slice(0, 3);
  const worst = ranked.slice(best.length).slice(-3).reverse();
  const behind = rows.filter((r) => r.status === 'Late' || r.status === 'Missed');
  const today = todayISO();

  const health = [
    { name: 'Live', value: s.live, color: '#2f9a63' },
    { name: 'Fetching', value: s.fetching, color: '#3b6fe0' },
    { name: 'Planned', value: s.planned, color: '#b9b4c9' },
    { name: 'Late', value: s.late, color: '#d49a12' },
    { name: 'Missed', value: s.missed, color: '#e0594a' },
  ].filter((d) => d.value > 0);

  return (
    <div className="stack">
      <div className="stats">
        <Stat label="Spend vs budget" value={fmtINRShort(s.spend)} sub={`of ${fmtINRShort(p.budget)} budget (${fmtPct(spendPct)})`} tone={spendPct > 100 ? 'coral' : 'blue'} />
        <Stat label="Creators" value={`${accepted} / ${p.slots}`} sub="accepted of slots" tone="mint" />
        <Stat label="Posts" value={`${postsLive} live`} sub={`${s.late} late, ${s.missed} missed, ${s.planned} planned`} tone={s.late + s.missed ? 'yellow' : postsLive ? 'green' : 'neutral'} />
        <Stat label="Views delivered" value={s.deliveryPct === null ? '-' : fmtPct(s.deliveryPct)}
          sub={s.deliveryPct === null ? 'No live posts yet' : `${fmtNum(s.views)} of ${fmtNum(s.expectedViews)} expected`} tone={deliveryTone(s.deliveryPct)} />
        <Stat label="Cost per 1,000 views" value={s.costPer1000 === null ? '-' : fmtINR(s.costPer1000)}
          sub={`Plan ${fmtINR(p.ratePer1000)}${s.costPer1000 === null ? '' : onPlan ? ', ahead of plan' : ''}`} tone={s.costPer1000 === null ? 'neutral' : onPlan ? 'green' : 'yellow'} />
        {s.orders !== null && <Stat label="Orders" value={fmtNum(s.orders)} sub="Shopify, sample data" tone="purple" />}
        {s.revenue !== null && <Stat label="Revenue" value={fmtINRShort(s.revenue)} sub="Sample data" tone="purple" />}
        {s.roas !== null && <Stat label="ROAS" value={`${s.roas.toFixed(1)}x`} sub="Revenue per rupee of fees" tone={s.roas >= 1 ? 'green' : 'coral'} />}
      </div>

      <div className="grid-2">
        <section className="card" aria-label="Insights">
          <div className="card-head"><div><h3>Insights</h3><p className="muted">Worked out from the numbers on this page.</p></div></div>
          <ul className="pg-insights">
            {insights.map((i, k) => <li key={k} className={`t-${INSIGHT_TONE[i.tone]}`}><i aria-hidden="true" /><span>{i.text}</span></li>)}
          </ul>
        </section>
        <ChartFrame title="Campaign health" sub="Where every deliverable stands" summary={health.map((d) => `${d.value} ${d.name.toLowerCase()}`).join(', ')}>
          <Donut data={health} centre="posts" />
        </ChartFrame>
      </div>

      <div className="grid-2">
        <section className="card" aria-label="Best and worst">
          <div className="card-head"><div><h3>Best and worst</h3><p className="muted">Live creators by views delivered against views paid for.</p></div></div>
          {ranked.length ? (
            <>
              <span className="eyebrow">Best</span>
              <ul className="pg-ranklist">{best.map((r) => <RankRow key={r.collab.id} r={r} />)}</ul>
              {worst.length > 0 && <><span className="eyebrow">Weakest</span><ul className="pg-ranklist">{worst.map((r) => <RankRow key={r.collab.id} r={r} />)}</ul></>}
            </>
          ) : <p className="muted">Nothing to rank yet. This fills in once posts go live.</p>}
        </section>

        <section className="card" aria-label="Needs attention">
          <div className="card-head">
            <div><h3>Needs attention</h3><p className="muted">Posts that are late or missed.</p></div>
            {behind.length > 0 && <Link href={`/programmes/${p.id}?tab=performance`} className="textlink">Open Performance<ArrowRight size={13} /></Link>}
          </div>
          {behind.length ? (
            <ul className="pg-ranklist">
              {behind.map((r) => {
                const planned = r.primary?.plannedDate ?? '';
                const days = planned ? daysBetween(planned, today) : 0;
                return (
                  <li key={r.collab.id} className="pg-rank">
                    <Link href={`/programmes/${p.id}?tab=performance`} className="pg-clink"><CreatorCell creator={r.creator} size={30} /></Link>
                    <Pill tone={r.status === 'Missed' ? 'coral' : 'yellow'}>{r.status}</Pill>
                    <small className="muted">{planned ? `Planned ${shortDate(planned)}, ${plural(days, 'day')} ago` : 'No planned date'}</small>
                  </li>
                );
              })}
            </ul>
          ) : <Empty title="Nothing is late">Every planned post is either live or still on schedule.</Empty>}
        </section>
      </div>
    </div>
  );
}
