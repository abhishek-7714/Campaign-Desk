import { useMemo } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Plus } from 'lucide-react';
import { useStore } from '@/state/store';
import { campaignOverdue } from '@/domain/helpers';
import { campaignHealth, campaignSignals, dashboardSummary } from '@/domain/analytics';
import { DEMO_ENGAGEMENT, DEMO_METRICS } from '@/domain/demo-metrics';
import { attentionItems } from '@/domain/attention';
import { ago } from '@/domain/format';
import { Bar, CampaignCard, Empty, PageTitle, Pill } from '@/components/viz/Cards';
import { Spark } from '@/components/viz/Charts';

export default function Home() {
  const { campaigns, tasks, activity, openDialog, campaignById } = useStore();
  const sum = dashboardSummary(campaigns, tasks);
  const health = campaignHealth(campaigns, tasks);
  const total = health.reduce((a, h) => a + h.value, 0);
  const attention = useMemo(() => attentionItems(campaigns, tasks).slice(0, 5), [campaigns, tasks]);
  const live = useMemo(() => campaigns.filter((c) => c.status !== 'Complete')
    .map((c) => ({ c, s: campaignSignals(c, tasks) }))
    .sort((a, b) => Number(b.s.attention) - Number(a.s.attention) || a.c.dueDate.localeCompare(b.c.dueDate)).slice(0, 4), [campaigns, tasks]);
  const completion = sum.completionRate;
  const tiles = [
    { k: 'Active campaigns', v: sum.active, tone: 'blue', href: '/campaigns?filter=active', note: 'in motion' },
    { k: 'Overdue', v: sum.overdue, tone: 'coral', href: '/campaigns?due=overdue', note: 'past due date' },
    { k: 'Awaiting review', v: sum.review, tone: 'purple', href: '/campaigns?filter=review', note: 'need a decision' },
    { k: 'Needs action', v: sum.needsAction, tone: 'yellow', href: '/campaigns?attention=1', note: 'open issues' },
  ];
  const recent = activity.slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 6);
  const metric = [
    { k: 'Engagement rate', v: `${DEMO_METRICS.engagementRate.toFixed(1)}%`, spark: 'engagementRate', color: '#3b6fe0' },
    { k: 'Creator response rate', v: `${DEMO_METRICS.responseRate.toFixed(1)}%`, spark: 'responseRate', color: '#1f9c8f' },
  ];
  return (
    <>
      <PageTitle title="Good morning, Abhishek." sub="Here's what needs your attention."
        actions={<button className="btn primary lg" onClick={() => openDialog({ type: 'campaign' })} data-testid="button-new-campaign"><Plus size={16} />New campaign</button>} />

      <div className="tiles">
        {tiles.map((t, i) => (
          <Link key={t.k} href={t.href} className={`tile t-${t.tone}`} style={{ animationDelay: `${i * 50}ms` }} data-testid={`tile-${t.k.toLowerCase().replace(/ /g, '-')}`}>
            <span className="tile-k">{t.k}</span><b>{t.v}</b><span className="tile-n">{t.note}<ArrowRight size={14} /></span>
          </Link>
        ))}
      </div>

      <div className="grid-2 mt">
        <section className="card pulse" aria-label="Campaign pulse">
          <div className="card-head"><div><h3>Campaign pulse</h3><p className="muted">Campaigns by state, live from your records</p></div></div>
          {total ? (
            <div className="seg-bar" role="img" aria-label={health.map((h) => `${h.name} ${h.value}`).join(', ')}>
              {health.filter((h) => h.value > 0).map((h) => <span key={h.name} style={{ flexGrow: h.value, background: h.color }}><em>{h.value}</em></span>)}
            </div>
          ) : <div className="chart-zero">No campaigns yet. Create one to see its state here.</div>}
          <ul className="legend row">{health.map((h) => <li key={h.name}><i style={{ background: h.color }} />{h.name}<b>{h.value}</b></li>)}</ul>
          <p className="insight">{sum.needsAction === 0 ? 'No active campaigns need attention right now.' : `${sum.needsAction} active campaign${sum.needsAction === 1 ? '' : 's'} need${sum.needsAction === 1 ? 's' : ''} attention this week.`}</p>
        </section>

        <section className="card" aria-label="Metrics">
          <div className="card-head"><div><h3>Performance</h3><p className="muted">Sample observations and live completion</p></div></div>
          <div className="metric-grid">
            {metric.map((m) => (
              <div key={m.k} className="metric">
                <span className="demo-tag">Demo data</span>
                <span className="metric-k">{m.k}</span><b>{m.v}</b>
                <Spark data={DEMO_ENGAGEMENT as unknown as Record<string, number | string>[]} k={m.spark} color={m.color} />
              </div>
            ))}
            <div className="metric">
              <span className="metric-k">Campaign completion</span><b>{Math.round(completion)}%</b>
              <Bar value={completion} tone="green" label="Campaign completion" />
              <small className="muted">Task completion {Math.round(sum.taskCompletionRate)}%</small>
            </div>
            <div className="metric">
              <span className="demo-tag">Demo data</span>
              <span className="metric-k">Average turnaround</span><b>{DEMO_METRICS.averageTurnaround.toFixed(1)}<small> days</small></b>
              <Bar value={Math.min(100, (DEMO_METRICS.averageTurnaround / 7) * 100)} tone="peach" label="Turnaround against a 7-day scale" />
            </div>
          </div>
        </section>
      </div>

      <section className="mt" aria-label="Needs your attention">
        <div className="sec-head"><h2>Needs your attention</h2><span className="muted">{attention.length} to resolve</span></div>
        {attention.length ? (
          <div className="attn-grid">
            {attention.map((a, i) => (
              <article key={a.campaign.id} className={`acard t-${a.tone}`} style={{ animationDelay: `${i * 50}ms` }} data-testid={`card-attention-${a.campaign.id}`}>
                <span className="eyebrow">{a.campaign.title}</span>
                <h3>{a.label}</h3>
                <p>{a.desc}</p>
                <div className="acard-foot">
                  {a.due ? <Pill tone={a.tone}>{a.due}</Pill> : <span />}
                  <Link href={a.href} className="btn solid">{a.cta}<ArrowRight size={14} /></Link>
                </div>
              </article>
            ))}
          </div>
        ) : <Empty title="Nothing needs you right now">Every open campaign is on track.</Empty>}
      </section>

      <section className="mt" aria-label="Active campaigns">
        <div className="sec-head"><h2>Active campaigns</h2><Link href="/campaigns" className="textlink">All campaigns<ArrowRight size={14} /></Link></div>
        {live.length ? <div className="cgrid">{live.map(({ c }, i) => <CampaignCard key={c.id} c={c} i={i} />)}</div> : <Empty title="No open campaigns">Start one with New campaign.</Empty>}
        {live.some(({ c }) => campaignOverdue(c)) && <p className="muted fine">Overdue campaigns are outlined in coral.</p>}
      </section>

      <section className="card mt" aria-label="Recent activity">
        <div className="card-head"><div><h3>Recent activity</h3><p className="muted">Newest first</p></div></div>
        {recent.length ? (
          <ol className="feed">
            {recent.map((a) => (
              <li key={a.id}><i /><div><span className="feed-t">{ago(a.timestamp)}{a.example && ' · example history'}</span>
                <p><b>{a.actor}</b> {a.message}</p>
                {campaignById(a.campaignId) && <Link href={`/campaigns/${a.campaignId}?tab=activity`} className="textlink">{campaignById(a.campaignId)?.title}</Link>}</div></li>
            ))}
          </ol>
        ) : <Empty title="No activity yet">Changes you make will appear here.</Empty>}
      </section>
    </>
  );
}
