import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/Shell';
import { TaskTable } from '@/components/tasks/TaskTable';
import { Board } from '@/components/tasks/Board';
import { Badge, EmptyState, TextField } from '@/components/ui-bits';
import { AGREEMENT_FIELDS, CURRENT_USER, fmtDate, gapFields, isGap, missingTerms, taskOverdue, todayISO } from '@/domain/helpers';
import { matchTask } from '@/domain/search';
import { STORAGE_KEY } from '@/domain/helpers';
import { TASK_STATUSES } from '@/domain/types';
import { useStore } from '@/state/store';

function useFilteredTasks() {
  const { tasks, campaignById, search } = useStore();
  const q = search.trim().toLowerCase();
  return { q, tasks: tasks.filter((t) => { const c = campaignById(t.campaignId); return matchTask(t, c ? `${c.issueKey} ${c.title}` : '', q); }) };
}

export function MyWorkPage() {
  const { campaigns, openDialog } = useStore();
  const { tasks, q } = useFilteredTasks();
  const [view, setView] = useState<'assigned' | 'today' | 'overdue' | 'review'>('assigned');
  const [status, setStatus] = useState('all');
  const [campaign, setCampaign] = useState('all');
  const mine = tasks.filter((t) => t.assignee === CURRENT_USER);
  const open = (t: typeof mine[number]) => !t.completed;
  const views = {
    assigned: mine.filter(open),
    today: mine.filter((t) => open(t) && t.dueDate === todayISO()),
    overdue: mine.filter(taskOverdue),
    review: mine.filter((t) => t.status === 'In Review'),
  };
  const labels = { assigned: 'Assigned to me', today: 'Due today', overdue: 'Overdue', review: 'Awaiting my review' } as const;
  const rows = views[view].filter((t) => (status === 'all' || t.status === status) && (campaign === 'all' || t.campaignId === campaign));
  return (
    <>
      <PageHeader title="My work" subtitle={`Open tasks assigned to ${CURRENT_USER}.`}
        actions={<button className="button primary" onClick={() => openDialog({ type: 'task' })}><Plus />Create task</button>} />
      <div className="seg" role="tablist" aria-label="Work queue">
        {(Object.keys(labels) as (keyof typeof labels)[]).map((k) => (
          <button key={k} role="tab" aria-selected={view === k} className={view === k ? 'active' : ''} onClick={() => setView(k)} data-testid={`filter-${k}`}>{labels[k]} <span>{views[k].length}</span></button>
        ))}
      </div>
      <div className="toolbar" style={{ borderRadius: '6px 6px 0 0' }}>
        <div className="toolbar-left">
          <select className="compact-select" aria-label="Filter by task status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>{TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="compact-select" aria-label="Filter by campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)}>
            <option value="all">All campaigns</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.issueKey} {c.title}</option>)}
          </select>
          <span className="count-label">{rows.length} tasks{q ? ' (search applied)' : ''}</span>
        </div>
      </div>
      <TaskTable tasks={rows} emptyText={`Nothing in "${labels[view]}" for these filters.`} />
    </>
  );
}

export function BoardPage() {
  const { openDialog } = useStore();
  const { tasks, q } = useFilteredTasks();
  return (
    <>
      <PageHeader title="Board" subtitle={`Drag cards between columns or use the status menu. ${q ? 'Search filter applied.' : ''}`}
        actions={<button className="button primary" onClick={() => openDialog({ type: 'task' })}><Plus />Create task</button>} />
      <Board tasks={tasks} />
    </>
  );
}

export function AgreementsPage() {
  const { campaigns, search, tasks } = useStore();
  const [filter, setFilter] = useState('all');
  const q = search.trim().toLowerCase();
  const rows = useMemo(() => campaigns.filter((c) => {
    const match = !q || `${c.issueKey} ${c.title} ${c.creator}`.toLowerCase().includes(q);
    return match && (filter === 'all' || (filter === 'missing' ? missingTerms(c) > 0 : missingTerms(c) === 0));
  }), [campaigns, q, filter, tasks]);
  const cols = AGREEMENT_FIELDS;
  return (
    <>
      <PageHeader title="Agreements" subtitle="Missing and to-be-confirmed terms are highlighted. Open a campaign to edit them." />
      <div className="toolbar">
        <div className="toolbar-left">
          <select className="compact-select" aria-label="Filter agreements" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All agreements</option><option value="missing">Missing terms</option><option value="complete">Complete</option>
          </select>
          <span className="count-label">{campaigns.filter((c) => missingTerms(c) > 0).length} of {campaigns.length} campaigns have unresolved terms</span>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table" style={{ minWidth: 1500 }}>
          <thead><tr><th>Campaign</th>{cols.map((f) => <th key={f.key}>{f.label}</th>)}<th>Unresolved</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/campaigns/${c.id}?tab=agreement`} className="issue-title link"><span className="issue-key">{c.issueKey}</span> {c.title}</Link><span className="issue-brand">{c.creator}</span></td>
                {cols.map((f) => {
                  const v = c.agreement[f.key];
                  return <td key={f.key} className={isGap(v) ? 'gap-cell' : ''}>{isGap(v) ? <span className="missing">{v.trim() ? 'To be confirmed' : 'Missing'}</span> : f.kind === 'date' ? fmtDate(v) : <span className="clamp">{v}</span>}</td>;
                })}
                <td>{gapFields(c.agreement).length ? <span className="missing">{gapFields(c.agreement).length}</span> : <span className="confirmed">None</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState title="No agreements match" />}
      </div>
    </>
  );
}

export function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" subtitle="Reporting is not part of this prototype." />
      <div className="page-card" style={{ maxWidth: 720 }}>
        <h3 className="section-title">Where to look instead</h3>
        <p className="report-note">Reports will focus on the three hypotheses this prototype tests: explicit terms, shared ownership and single-view closeout. Until then, use the working views below. No metrics are calculated here.</p>
        <ul className="report-links">
          <li><Link className="link" href="/agreements">Agreements</Link> shows which terms are missing or to be confirmed.</li>
          <li><Link className="link" href="/my-work">My work</Link> shows overdue and review tasks per owner.</li>
          <li><Link className="link" href="/">Campaigns</Link> lists status, owners and overdue counts.</li>
        </ul>
      </div>
    </>
  );
}

export function SettingsPage() {
  const { workspaceName, setWorkspaceName, notify, resetSample } = useStore();
  const [name, setName] = useState(workspaceName);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const save = () => {
    if (!name.trim()) { setError('Workspace name is required.'); return; }
    setError(''); setWorkspaceName(name.trim()); notify('Workspace name saved');
  };
  return (
    <>
      <PageHeader title="Workspace settings" subtitle="Settings stored in this browser only." />
      <div className="page-card" style={{ maxWidth: 680 }}>
        <form noValidate onSubmit={(e) => { e.preventDefault(); save(); }} className="settings-section">
          <div style={{ flex: 1 }}><TextField label="Workspace name" value={name} error={error} onChange={(e) => setName(e.target.value)} /></div>
          <button className="button primary" type="submit" disabled={name.trim() === workspaceName}>Save</button>
        </form>
        <div className="settings-section"><div><strong>Current user</strong><small>Fixed for this prototype; there is no sign-in.</small></div><span>{CURRENT_USER}</span></div>
        <div className="settings-section"><div><strong>Browser storage</strong><small>Data is kept under <code>{STORAGE_KEY}</code> in this browser. Nothing is sent to a server.</small></div><Badge value="Local only" /></div>
        <div className="settings-section">
          <div><strong>Reset sample data</strong><small>Discards all local edits and restores the seeded campaigns, tasks and example history.</small></div>
          {confirm
            ? <div className="detail-actions"><button className="button danger" onClick={() => { resetSample(); setConfirm(false); }}>Confirm reset</button><button className="button" onClick={() => setConfirm(false)}>Cancel</button></div>
            : <button className="button danger" onClick={() => setConfirm(true)}>Reset data</button>}
        </div>
      </div>
    </>
  );
}
