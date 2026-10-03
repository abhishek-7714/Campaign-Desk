import { Link } from 'wouter';
import { CalendarDays } from 'lucide-react';
import type { Programme } from '@/domain/types';
import { fmtDate } from '@/domain/helpers';
import { deliveryTone, summarize } from '@/domain/performance';
import { fmtINR, fmtINRShort, fmtNum, fmtPct } from '@/domain/money';
import { Bar, Pill } from '@/components/viz/Cards';
import { useStore } from '@/state/store';
import { STATUS_TONE, applyLeftLabel, plural } from './programmeUtils';
import '@/styles/programmes.css';

export default function ProgrammeCard({ p, i = 0 }: { p: Programme; i?: number }) {
  const { gridRows, applications } = useStore();
  const s = summarize(gridRows(p.id), p);
  const apps = applications.filter((a) => a.programmeId === p.id);
  const accepted = apps.filter((a) => a.status === 'Accepted').length;
  const applicants = apps.filter((a) => a.origin === 'creator').length;
  const tone = STATUS_TONE[p.status];
  const spendPct = p.budget ? (s.spend / p.budget) * 100 : 0;
  const showPerf = p.status === 'Live' || p.status === 'Completed';
  const dTone = deliveryTone(s.deliveryPct);
  const onPlan = s.costPer1000 !== null && s.costPer1000 <= p.ratePer1000;

  return (
    <article className={`ccard pg-card t-${tone}`} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }} data-testid={`card-programme-${p.id}`}>
      <div className="ccard-top">
        <Pill tone={tone}>{p.status}</Pill>
        <span className="tag">{p.deliverable}</span>
      </div>
      <h3><Link href={`/programmes/${p.id}`} className="stretch">{p.name}</Link></h3>
      <p className="muted">{p.product}</p>
      <span className="due-chip"><CalendarDays size={13} />{fmtDate(p.startDate)} to {fmtDate(p.endDate)}</span>

      <div className="pg-metric">
        <div className="pg-metric-h"><span>Budget used</span><b>{fmtINRShort(s.spend)} of {fmtINRShort(p.budget)}</b></div>
        <Bar value={spendPct} tone={spendPct > 100 ? 'coral' : 'blue'} label={`${p.name} budget used`} />
      </div>

      <div className="pg-metric">
        <div className="pg-metric-h"><span>Creators</span><b>{accepted} of {p.slots} slots</b></div>
        <Bar value={p.slots ? (accepted / p.slots) * 100 : 0} tone="mint" label={`${p.name} slots filled`} />
        {p.status === 'Open call' && (
          <p className="pg-sub">{plural(applicants, 'applicant')} so far. <b>{applyLeftLabel(p.applyBy)}</b></p>
        )}
        {p.status === 'Draft' && <p className="pg-sub">Not visible to creators yet.</p>}
      </div>

      {showPerf && (
        <div className="pg-perf">
          <div>
            <span className="pg-perf-k">Views delivered vs paid for</span>
            {s.deliveryPct === null ? <span className="muted">No live posts yet</span>
              : <span className={`dchip t-${dTone}`} title={`${fmtNum(s.views)} of ${fmtNum(s.expectedViews)} paid-for views`}>{fmtPct(s.deliveryPct)}</span>}
          </div>
          <div>
            <span className="pg-perf-k">Cost per 1,000 views</span>
            {s.costPer1000 === null ? <span className="muted">Not available yet</span>
              : <span className={onPlan ? 'pg-good' : 'pg-warn'}>{fmtINR(s.costPer1000)}<small> vs plan {fmtINR(p.ratePer1000)}</small></span>}
          </div>
        </div>
      )}
    </article>
  );
}
