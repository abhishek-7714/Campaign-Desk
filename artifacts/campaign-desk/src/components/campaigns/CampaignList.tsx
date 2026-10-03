import { useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowDownUp, Plus, SlidersHorizontal } from 'lucide-react';
import { STATUSES } from '@/domain/types';
import { awaitingReview, campaignDueSoon, campaignOverdue, fmtDate, missingTerms } from '@/domain/helpers';
import { matchCampaign } from '@/domain/search';
import { Avatar, Badge, EmptyState, PriorityLabel } from '@/components/ui-bits';
import { PageHeader } from '@/components/layout/Shell';
import { useStore } from '@/state/store';

export default function CampaignList() {
  const { campaigns, tasks, search, openDialog } = useStore();
  const [, navigate] = useLocation();
  const [status, setStatus] = useState('all');
  const [owner, setOwner] = useState('all');
  const [due, setDue] = useState('all');
  const [sort, setSort] = useState('due');
  const q = search.trim().toLowerCase();
  const owners = Array.from(new Set(campaigns.map((c) => c.owner))).sort();

  const rows = useMemo(() => {
    const list = campaigns.filter((c) =>
      matchCampaign(c, tasks, q) && (status === 'all' || c.status === status) && (owner === 'all' || c.owner === owner) &&
      (due === 'all' || (due === 'overdue' ? campaignOverdue(c) : campaignDueSoon(c))));
    return [...list].sort((a, b) =>
      sort === 'name' ? a.title.localeCompare(b.title) : sort === 'status' ? STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) : a.dueDate.localeCompare(b.dueDate));
  }, [campaigns, tasks, q, status, owner, due, sort]);

  const filtered = status !== 'all' || owner !== 'all' || due !== 'all' || !!q;
  const clear = () => { setStatus('all'); setOwner('all'); setDue('all'); };

  return (
    <>
      <PageHeader title="Campaigns" subtitle="Scope, owners and closeout for every creator campaign."
        actions={<button className="button primary" onClick={() => openDialog({ type: 'campaign' })} data-testid="button-create-campaign"><Plus />Create campaign</button>} />
      <p className="summary-line" data-testid="text-summary">
        {campaigns.length} campaigns · {campaigns.filter(awaitingReview).length} awaiting review · {campaigns.filter(campaignOverdue).length} overdue
      </p>
      <div className="toolbar">
        <div className="toolbar-left">
          <SlidersHorizontal size={14} color="#77818d" aria-hidden="true" />
          <select aria-label="Filter by status" className="compact-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select aria-label="Filter by owner" className="compact-select" value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="all">All owners</option>{owners.map((o) => <option key={o}>{o}</option>)}
          </select>
          <select aria-label="Filter by due date" className="compact-select" value={due} onChange={(e) => setDue(e.target.value)}>
            <option value="all">Any due date</option><option value="overdue">Overdue</option><option value="soon">Due in 7 days</option>
          </select>
          {filtered && <button className="button ghost" onClick={clear}>Clear filters</button>}
        </div>
        <div className="toolbar-right">
          <ArrowDownUp size={13} color="#77818d" aria-hidden="true" />
          <select aria-label="Sort campaigns" className="compact-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="due">Sort: due date</option><option value="name">Sort: campaign name</option><option value="status">Sort: status</option>
          </select>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Key</th><th>Campaign</th><th>Creator</th><th>Brand owner</th><th>Status</th><th>Priority</th><th>Due date</th><th>Terms</th><th>Next action</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="clickable" data-testid={`row-campaign-${c.id}`} onClick={() => navigate(`/campaigns/${c.id}`)}>
                <td><Link href={`/campaigns/${c.id}`} className="issue-key link" onClick={(e) => e.stopPropagation()}>{c.issueKey}</Link></td>
                <td><Link href={`/campaigns/${c.id}`} className="issue-title link" onClick={(e) => e.stopPropagation()}>{c.title}</Link><span className="issue-brand">{c.brand}</span></td>
                <td><div className="creator-cell"><Avatar name={c.creator} />{c.creator}</div></td>
                <td><div className="creator-cell"><Avatar name={c.owner} />{c.owner}</div></td>
                <td><Badge value={c.status} /></td>
                <td><PriorityLabel value={c.priority} /></td>
                <td><span className={campaignOverdue(c) ? 'due overdue' : 'due'}>{fmtDate(c.dueDate)}</span>{campaignOverdue(c) && <span className="due overdue" style={{ marginLeft: 6, fontSize: 10 }}>Overdue</span>}</td>
                <td>{missingTerms(c) ? <span className="missing">{missingTerms(c)} to resolve</span> : <span className="confirmed">Complete</span>}</td>
                <td><span className="next-action">{c.nextAction || '—'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState title="No campaigns match">Adjust the search or filters, or create a new campaign.</EmptyState>}
      </div>
    </>
  );
}
