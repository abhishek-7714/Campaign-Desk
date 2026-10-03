import { useState } from 'react';
import { Link } from 'wouter';
import { AGREEMENT_FIELDS, gapFields } from '@/domain/helpers';
import { useStore } from '@/state/store';
import { Bar, Empty, PageTitle, Person } from '@/components/viz/Cards';

export default function Agreements() {
  const { campaigns, search } = useStore();
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'complete'>('all');
  const q = search.trim().toLowerCase();
  const items = campaigns.map((c) => {
    const gaps = gapFields(c.agreement);
    return { c, gaps, pct: Math.round(((AGREEMENT_FIELDS.length - gaps.length) / AGREEMENT_FIELDS.length) * 100) };
  }).filter(({ c, gaps }) => (!q || `${c.issueKey} ${c.title} ${c.creator}`.toLowerCase().includes(q)) && (filter === 'all' || (filter === 'unresolved' ? gaps.length > 0 : gaps.length === 0)))
    .sort((a, b) => a.pct - b.pct);
  const open = campaigns.filter((c) => gapFields(c.agreement).length).length;
  return (
    <>
      <PageTitle title="Agreements" sub={`${open} of ${campaigns.length} campaigns have unresolved terms.`} />
      <div className="filters"><div className="chips">
        {(['all', 'unresolved', 'complete'] as const).map((f) => <button key={f} className={`chip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>)}
      </div></div>
      {items.length ? (
        <div className="cgrid">
          {items.map(({ c, gaps, pct }, i) => {
            const tone = pct === 100 ? 'green' : pct >= 50 ? 'yellow' : 'coral';
            return (
              <article key={c.id} className={`ccard agr t-${tone}`} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }} data-testid={`card-agreement-${c.id}`}>
                <span className="eyebrow">Agreement health</span>
                <h3>{c.title}</h3>
                <Person name={c.creator} />
                <div className="agr-pct"><b>{pct}%</b><span className="muted">{AGREEMENT_FIELDS.length - gaps.length} of {AGREEMENT_FIELDS.length} terms confirmed</span></div>
                <Bar value={pct} tone={tone} label={`${c.title} agreement completion`} />
                {gaps.length ? <div className="missing-list"><span>Missing</span>{gaps.map((g) => <em key={g.key}>{g.label}</em>)}</div> : <p className="ok-note">All terms confirmed.</p>}
                <Link href={`/campaigns/${c.id}?tab=agreement`} className="btn solid">{gaps.length ? 'Resolve terms' : 'View terms'}</Link>
              </article>
            );
          })}
        </div>
      ) : <Empty title="No agreements match">Adjust the search or filter.</Empty>}
    </>
  );
}
