import { useMemo } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Plus } from 'lucide-react';
import { STATUSES } from '@/domain/types';
import { campaignDueSoon, campaignOverdue } from '@/domain/helpers';
import { campaignSignals } from '@/domain/analytics';
import { matchCampaign } from '@/domain/search';
import { useStore } from '@/state/store';
import { CampaignCard, Empty, PageTitle } from '@/components/viz/Cards';

const FILTERS = ['all', 'active', 'review', 'blocked', 'completed'] as const;

export default function Campaigns() {
  const { campaigns, tasks, search, openDialog, brandProgrammes } = useStore();
  const [, navigate] = useLocation();
  const p = new URLSearchParams(useSearch());
  const filter = (FILTERS as readonly string[]).includes(p.get('filter') ?? '') ? p.get('filter')! : 'active';
  const owner = p.get('owner') ?? 'all';
  const due = p.get('due') ?? 'all';
  const programme = p.get('programme') ?? 'all';
  const sort = p.get('sort') ?? 'due';
  const attn = p.get('attention') === '1';
  const q = search.trim().toLowerCase();
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(p);
    if ((v === 'all' && k !== 'filter') || (k === 'sort' && v === 'due') || !v) n.delete(k); else n.set(k, v);
    const s = n.toString();
    navigate(`/campaigns${s ? `?${s}` : ''}`, { replace: true });
  };
  const owners = Array.from(new Set(campaigns.map((c) => c.owner))).sort();
  const sig = useMemo(() => new Map(campaigns.map((c) => [c.id, campaignSignals(c, tasks)])), [campaigns, tasks]);
  const counts = (f: string) => campaigns.filter((c) => f === 'all' ||
    (f === 'active' ? c.status !== 'Complete' : sig.get(c.id)?.category === f)).length;
  const rows = useMemo(() => campaigns.filter((c) => {
    const s = sig.get(c.id);
    return matchCampaign(c, tasks, q) && (filter === 'all' ||
      (filter === 'active' ? c.status !== 'Complete' : s?.category === filter)) && (owner === 'all' || c.owner === owner)
      && (due === 'all' || (due === 'overdue' ? campaignOverdue(c) : campaignDueSoon(c))) && (!attn || s?.attention) && (programme === 'all' || c.programmeId === programme);
  }).sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title) : sort === 'status' ? STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status)
    : sort === 'progress' ? (sig.get(b.id)?.progress ?? 0) - (sig.get(a.id)?.progress ?? 0) : a.dueDate.localeCompare(b.dueDate)), [campaigns, tasks, q, filter, owner, due, sort, attn, sig, programme]);
  const clear = () => navigate('/campaigns', { replace: true });
  return (
    <>
      <PageTitle title="Collaborations" sub={`${campaigns.length} creator collaborations, ${counts('blocked')} blocked.`}
        actions={<button className="btn primary lg" onClick={() => openDialog({ type: 'campaign' })} data-testid="button-create-campaign"><Plus size={16} />New collaboration</button>} />
      <div className="filters">
        <div className="chips" role="tablist" aria-label="Campaign state">
          {FILTERS.map((f) => <button key={f} role="tab" aria-selected={filter === f} className={`chip ${filter === f ? 'on' : ''}`} onClick={() => set('filter', f)} data-testid={`filter-${f}`}>{f[0].toUpperCase() + f.slice(1)}<span>{counts(f)}</span></button>)}
          {attn && <button className="chip on" onClick={() => set('attention', '')}>Needs action ×</button>}
        </div>
        <div className="selects">
          <select aria-label="Filter by campaign" value={programme} onChange={(e) => set('programme', e.target.value)}><option value="all">All campaigns</option>{brandProgrammes.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
          <select aria-label="Filter by owner" value={owner} onChange={(e) => set('owner', e.target.value)}><option value="all">All owners</option>{owners.map((o) => <option key={o}>{o}</option>)}</select>
          <select aria-label="Filter by due date" value={due} onChange={(e) => set('due', e.target.value)}><option value="all">Any due date</option><option value="overdue">Overdue</option><option value="soon">Due in 7 days</option></select>
          <select aria-label="Sort campaigns" value={sort} onChange={(e) => set('sort', e.target.value)}><option value="due">Sort: due date</option><option value="name">Sort: name</option><option value="status">Sort: status</option><option value="progress">Sort: progress</option></select>
        </div>
      </div>
      {rows.length ? <div className="cgrid" key={`${filter}${owner}${due}${sort}${programme}`}>{rows.map((c, i) => <CampaignCard key={c.id} c={c} i={i} />)}</div>
        : <Empty title="No collaborations match">Adjust the search or filters, or <button className="textlink" onClick={clear}>clear all filters</button>.</Empty>}
    </>
  );
}
