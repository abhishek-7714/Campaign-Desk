import { useEffect, useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { Plus } from 'lucide-react';
import { PRIORITIES, STATUSES, type Campaign, type Priority, type Status } from '@/domain/types';
import { campaignOverdue, fmtDate, missingTerms } from '@/domain/helpers';
import { matchTask } from '@/domain/search';
import { Avatar, Badge, TextField } from '@/components/ui-bits';
import { PageHeader } from '@/components/layout/Shell';
import { TaskTable } from '@/components/tasks/TaskTable';
import { useStore } from '@/state/store';
import WorkflowProgress from './WorkflowProgress';
import AgreementTab from './AgreementTab';
import CloseoutTab from './CloseoutTab';
import ActivityList from './ActivityTab';

const TABS = ['Overview', 'Workflow', 'Agreement', 'Tasks', 'Activity', 'Closeout'] as const;
type Tab = (typeof TABS)[number];

function PropertiesPanel({ c }: { c: Campaign }) {
  const { updateCampaign, notify } = useStore();
  const [owner, setOwner] = useState(c.owner);
  const [creator, setCreator] = useState(c.creator);
  const [due, setDue] = useState(c.dueDate);
  useEffect(() => { setOwner(c.owner); setCreator(c.creator); setDue(c.dueDate); }, [c.owner, c.creator, c.dueDate]);

  const commit = (field: 'owner' | 'creator' | 'dueDate', value: string, label: string) => {
    const v = value.trim();
    if (!v) { notify(`${label} cannot be empty.`, 'error'); setOwner(c.owner); setCreator(c.creator); setDue(c.dueDate); return; }
    if (v === c[field]) return;
    updateCampaign(c.id, { [field]: v }, `${label} changed from ${c[field] || 'none'} to ${v}`);
  };
  return (
    <aside className="panel" aria-label="Properties">
      <div className="panel-head"><h3 className="section-title">Properties</h3></div>
      <div className="panel-body form-stack">
        <TextField label="Brand owner" value={owner} onChange={(e) => setOwner(e.target.value)} onBlur={() => commit('owner', owner, 'Brand owner')} />
        <TextField label="Creator" value={creator} onChange={(e) => setCreator(e.target.value)} onBlur={() => commit('creator', creator, 'Creator')} />
        <TextField label="Due date" type="date" value={due} onChange={(e) => { setDue(e.target.value); if (e.target.value) commit('dueDate', e.target.value, 'Due date'); }} />
        <div className="form-field">
          <label htmlFor="prop-priority">Priority</label>
          <select id="prop-priority" value={c.priority} onChange={(e) => updateCampaign(c.id, { priority: e.target.value as Priority }, `Priority changed from ${c.priority} to ${e.target.value}`)}>
            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="side-fact"><span>Brand</span><strong>{c.brand}</strong></div>
        <div className="side-fact"><span>Publication date</span><strong>{fmtDate(c.publicationDate)}</strong></div>
        <div className="side-fact"><span>Terms</span><strong className={missingTerms(c) ? 'missing' : 'confirmed'}>{missingTerms(c) ? `${missingTerms(c)} to resolve` : 'Complete'}</strong></div>
      </div>
    </aside>
  );
}

function Overview({ c }: { c: Campaign }) {
  const { updateCampaign, notify } = useStore();
  const [blocker, setBlocker] = useState(c.blocker);
  const [next, setNext] = useState(c.nextAction);
  const dirty = blocker !== c.blocker || next !== c.nextAction;
  const save = () => {
    if (!next.trim()) { notify('Next action is required so the campaign always has an owner action.', 'error'); return; }
    const notes: string[] = [];
    if (blocker !== c.blocker) notes.push(blocker ? `Blocker set: ${blocker}` : 'Blocker cleared');
    if (next !== c.nextAction) notes.push(`Next action set: ${next}`);
    updateCampaign(c.id, { blocker: blocker.trim(), nextAction: next.trim() }, notes.join('; '));
  };
  const F = ({ l, children }: { l: string; children: string }) => <div className="field"><label>{l}</label><div className="field-value">{children || '—'}</div></div>;
  return (
    <div className="stack">
      <div className="panel">
        <div className="panel-head"><h3 className="section-title">Campaign brief</h3></div>
        <div className="panel-body field-grid">
          <div className="field full"><label>Brief</label><div className="field-value">{c.brief || '—'}</div></div>
          <F l="Objective">{c.objective}</F>
          <F l="Target audience">{c.audience}</F>
          <F l="Required deliverables">{c.agreement.deliverables}</F>
          <F l="Publication date">{c.agreement.publicationDate ? fmtDate(c.agreement.publicationDate) : ''}</F>
        </div>
      </div>
      <form className="panel" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="panel-head"><h3 className="section-title">Blocker and next action</h3></div>
        <div className="panel-body form-grid">
          <TextField label="Current blocker" placeholder="None" value={blocker} onChange={(e) => setBlocker(e.target.value)} />
          <TextField label="Next action *" value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        <div className="modal-foot"><button type="submit" className="button primary" disabled={!dirty}>Save</button></div>
      </form>
    </div>
  );
}

export default function CampaignDetail({ id }: { id: string }) {
  const { campaignById, tasks, transitionStatus, updateCampaign, notify, openDialog, search } = useStore();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(useSearch());
  const c = campaignById(id);
  const initial = TABS.find((t) => t.toLowerCase() === params.get('tab')) ?? 'Overview';
  const [tab, setTab] = useState<Tab>(initial);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [reasons, setReasons] = useState<string[]>([]);
  useEffect(() => { setTab(initial); setReasons([]); }, [id, initial]);

  if (!c) {
    return <><PageHeader title="Campaign not found" subtitle="It may have been removed or the link is wrong." /><Link className="button" href="/">Back to campaigns</Link></>;
  }
  const q = search.trim().toLowerCase();
  const cTasks = tasks.filter((t) => t.campaignId === c.id);
  const shown = cTasks.filter((t) => matchTask(t, `${c.issueKey} ${c.title}`, q));

  const saveTitle = () => {
    const v = title.trim();
    if (!v) { notify('Campaign title is required.', 'error'); return; }
    if (v !== c.title) updateCampaign(c.id, { title: v }, `Title changed from "${c.title}" to "${v}"`);
    setEditing(false);
  };
  const changeStatus = (to: Status) => {
    const r = transitionStatus(c.id, to);
    setReasons(r);
    if (r.length) { setTab('Workflow'); notify(`Cannot move to ${to}: ${r[0]}`, 'error'); }
  };

  return (
    <>
      <div className="detail-top">
        <div style={{ minWidth: 0 }}>
          <div className="detail-meta"><Link href={`/campaigns/${c.id}`} className="issue-key link">{c.issueKey}</Link><Badge value={c.status} />{campaignOverdue(c) && <span className="due overdue">Overdue</span>}</div>
          {editing ? (
            <form onSubmit={(e) => { e.preventDefault(); saveTitle(); }} className="title-edit">
              <input aria-label="Campaign title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); }} />
              <button className="button primary" type="submit">Save</button><button className="button" type="button" onClick={() => setEditing(false)}>Cancel</button>
            </form>
          ) : (
            <h1 className="detail-title"><button className="title-btn" title="Click to edit title" onClick={() => { setTitle(c.title); setEditing(true); }} data-testid="button-edit-title">{c.title}</button></h1>
          )}
          <div className="detail-meta"><Avatar name={c.owner} />{c.owner}<span>·</span>{c.creator}<span>·</span>{c.brand}</div>
        </div>
        <div className="detail-actions">
          <div className="status-ctl">
            <label htmlFor="status-transition">Status</label>
            <select id="status-transition" className="compact-select" value={c.status} onChange={(e) => changeStatus(e.target.value as Status)} data-testid="select-status">
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <button className="button primary" onClick={() => openDialog({ type: 'task', campaignId: c.id })}><Plus />Add task</button>
        </div>
      </div>
      <WorkflowProgress campaign={c} compact />
      {reasons.length > 0 && <div className="inline-warning" role="alert">Transition blocked: {reasons.join(' ')}</div>}
      <div className="tabs" role="tablist">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); navigate(`/campaigns/${c.id}?tab=${t.toLowerCase()}`, { replace: true }); }}>{t}{t === 'Tasks' ? ` (${cTasks.length})` : ''}</button>)}
      </div>
      <div className="detail-grid">
        <div className="stack" style={{ minWidth: 0 }} role="tabpanel">
          {tab === 'Overview' && <><Overview key={`${c.blocker}|${c.nextAction}`} c={c} /><ActivityList campaignId={c.id} limit={4} /></>}
          {tab === 'Workflow' && <div className="panel"><div className="panel-head"><h3 className="section-title">Workflow</h3></div><div className="panel-body"><WorkflowProgress campaign={c} /></div></div>}
          {tab === 'Agreement' && <AgreementTab key={JSON.stringify(c.agreement)} campaign={c} />}
          {tab === 'Tasks' && <><div className="count-label">{q ? `${shown.length} of ${cTasks.length} tasks match "${search}"` : `${cTasks.length} tasks`}</div><TaskTable tasks={shown} showCampaign={false} emptyText={q ? 'No tasks match the search.' : 'No tasks yet. Add the first one.'} /></>}
          {tab === 'Activity' && <ActivityList campaignId={c.id} />}
          {tab === 'Closeout' && <CloseoutTab key={JSON.stringify([c.closeout, c.publicationUrl, c.paymentStatus])} campaign={c} />}
        </div>
        <PropertiesPanel c={c} />
      </div>
    </>
  );
}
