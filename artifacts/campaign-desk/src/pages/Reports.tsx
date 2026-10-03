import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { useStore } from '@/state/store';
import { attentionAreas, campaignHealth, dashboardSummary, derivedInsights, workloadByOwner } from '@/domain/analytics';
import { DEMO_ENGAGEMENT, DEMO_METRICS, DEMO_OVERDUE } from '@/domain/demo-metrics';
import { Empty, PageTitle } from '@/components/viz/Cards';
import { Bars, ChartFrame, Donut, TrendChart } from '@/components/viz/Charts';

type Rows = Record<string, number | string>[];

export default function Reports() {
  const { campaigns, tasks } = useStore();
  const sum = dashboardSummary(campaigns, tasks);
  const health = campaignHealth(campaigns, tasks);
  const work = workloadByOwner(tasks);
  const areas = attentionAreas(campaigns, tasks);
  const insights = derivedInsights(campaigns, tasks);
  const open = sum.active;
  const completion = sum.completionRate;
  const overdueRate = open ? Math.round((sum.overdue / open) * 100) : 0;
  const eng = DEMO_ENGAGEMENT as unknown as Rows;
  const last = eng[eng.length - 1];
  const tiles = [
    { k: 'Active campaigns', v: String(sum.active), tone: 'blue' },
    { k: 'Completion rate', v: `${completion}%`, tone: 'green' },
    { k: 'Average turnaround (demo)', v: `${DEMO_METRICS.averageTurnaround.toFixed(1)} days`, tone: 'mint' },
    { k: 'Overdue rate', v: `${overdueRate}%`, tone: 'coral' },
  ];
  return (
    <>
      <PageTitle title="Reports" sub="Live counts come from your records. Charts marked Demo data are fictional sample observations." />
      <div className="tiles">{tiles.map((t, i) => <div key={t.k} className={`tile static t-${t.tone}`} style={{ animationDelay: `${i * 50}ms` }}><span className="tile-k">{t.k}</span><b>{t.v}</b></div>)}</div>
      {insights.length > 0 && <div className="insights mt">{insights.slice(0, 2).map((s) => <p key={s}>{s}</p>)}</div>}
      <div className="grid-2 mt wide-left">
        <ChartFrame title="Campaign engagement" sub="Example measurements, % per date" demo
          summary={last ? `Latest sample: engagement ${last.engagementRate}%, response ${last.responseRate}%. Fictional example data.` : 'No samples.'}>
          <TrendChart data={eng} area unit="%" height={280} series={[{ key: 'engagementRate', label: 'Engagement rate', color: '#3f3fbf' }, { key: 'responseRate', label: 'Response rate', color: '#1f9c8f' }]} />
        </ChartFrame>
        <ChartFrame title="Campaign health" sub="Live campaigns by state" summary={health.map((h) => `${h.name}: ${h.value}`).join('; ') || 'No campaigns.'}>
          <Donut data={health} centre="campaigns" />
        </ChartFrame>
      </div>
      <div className="grid-2 mt">
        <ChartFrame title="Workload by owner" sub="Live open and overdue tasks" summary={work.map((w) => `${w.name}: ${w.open} open, ${w.overdue} overdue`).join('; ') || 'No tasks.'}>
          <Bars data={work as unknown as Rows} series={[{ key: 'open', label: 'Open', color: '#8fa7f0' }, { key: 'overdue', label: 'Overdue', color: '#e8715f' }]} />
        </ChartFrame>
        <ChartFrame title="Overdue trend" sub="Example measurements, overdue items per date" demo summary="Fictional example data of overdue items over time.">
          <TrendChart data={DEMO_OVERDUE as unknown as Rows} series={[{ key: 'overdue', label: 'Overdue items', color: '#e8715f' }]} />
        </ChartFrame>
      </div>
      <section className="mt" aria-label="Top attention areas">
        <div className="sec-head"><h2>Top attention areas</h2><span className="muted">Ranked by open count, live</span></div>
        {areas.length ? (
          <div className="rank-grid">
            {areas.map((a, i) => (
              <Link key={a.name} href={a.href} className={`rank t-${['coral', 'peach', 'yellow', 'purple', 'blue'][Math.min(i, 4)]}`} data-testid={`rank-${i}`}>
                <span className="rank-n">{i + 1}</span><div><h3>{a.name}</h3><p>{a.description}</p></div><b>{a.count}</b><ArrowRight size={16} />
              </Link>
            ))}
          </div>
        ) : <Empty title="No attention areas">Nothing is flagged across your campaigns.</Empty>}
      </section>
    </>
  );
}
