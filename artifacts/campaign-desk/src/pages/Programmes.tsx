import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Plus } from 'lucide-react';
import type { ProgrammeStatus } from '@/domain/types';
import { Empty, PageTitle } from '@/components/viz/Cards';
import NewProgrammeDialog from '@/components/programmes/NewProgrammeDialog';
import ProgrammeCard from '@/components/programmes/ProgrammeCard';
import { plural } from '@/components/programmes/programmeUtils';
import { useStore } from '@/state/store';
import '@/styles/programmes.css';

const ORDER: ProgrammeStatus[] = ['Live', 'Open call', 'Draft', 'Completed'];
type Filter = 'All' | ProgrammeStatus;
const FILTERS: Filter[] = ['All', ...ORDER];

export default function Programmes() {
  const { brandProgrammes } = useStore();
  const [, navigate] = useLocation();
  const search = useSearch();
  const [filter, setFilter] = useState<Filter>('All');
  const [creating, setCreating] = useState(false);

  // Links elsewhere in the app use /programmes?new=1 to open the dialog.
  useEffect(() => {
    if (new URLSearchParams(search).get('new') === '1') { setCreating(true); navigate('/programmes', { replace: true }); }
  }, [search, navigate]);

  const count = (f: Filter) => brandProgrammes.filter((p) => f === 'All' || p.status === f).length;
  const rows = useMemo(
    () => brandProgrammes.filter((p) => filter === 'All' || p.status === filter).sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status)),
    [brandProgrammes, filter],
  );
  const sub = brandProgrammes.length
    ? `${plural(brandProgrammes.length, 'campaign')}, ${count('Live')} live, ${count('Open call')} taking applications`
    : 'Set up a campaign, pick creators and see what you get for your spend.';

  return (
    <>
      <PageTitle title="Campaigns" sub={sub}
        actions={<button className="btn primary lg" onClick={() => setCreating(true)} data-testid="button-new-programme"><Plus size={16} />New campaign</button>} />
      {brandProgrammes.length > 0 && (
        <div className="filters">
          <div className="chips" role="tablist" aria-label="Campaign status">
            {FILTERS.map((f) => (
              <button key={f} role="tab" aria-selected={filter === f} className={`chip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>{f}<span>{count(f)}</span></button>
            ))}
          </div>
        </div>
      )}
      {rows.length ? (
        <div className="pg-grid" key={filter}>{rows.map((p, i) => <ProgrammeCard key={p.id} p={p} i={i} />)}</div>
      ) : brandProgrammes.length ? (
        <Empty title={`No ${filter.toLowerCase()} campaigns`}>Pick another filter, or <button className="textlink" onClick={() => setFilter('All')}>show all campaigns</button>.</Empty>
      ) : (
        <Empty title="No campaigns yet">
          A campaign holds one product push: the brief, the creators and the results.<br />
          <button className="btn primary" style={{ marginTop: 14 }} onClick={() => setCreating(true)}><Plus size={15} />Create your first campaign</button>
        </Empty>
      )}
      {creating && <NewProgrammeDialog onClose={() => setCreating(false)} />}
    </>
  );
}
