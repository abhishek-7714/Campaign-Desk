import { useEffect, useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { Check, Circle, Plus } from 'lucide-react';
import { PRIORITIES, STATUSES, type Campaign, type Priority, type Status } from '@/domain/types';
import { campaignOverdue, fmtDate, isGap, missingTerms } from '@/domain/helpers';
import { campaignSignals } from '@/domain/analytics';
import { categoryLabel, categoryTone, priorityTone } from '@/domain/format';
import { matchTask } from '@/domain/search';
import { Avatar, Badge, TextField } from '@/components/ui-bits';
import { PageHeader } from '@/components/layout/Shell';
import { Bar, Empty, Pill, TaskCard } from '@/components/viz/Cards';
import { useStore } from '@/state/store';
import { Stat, SourceBadge } from '@/components/shared';
import { deliveryTone } from '@/domain/performance';
import { fmtINR, fmtNum, fmtPct } from '@/domain/money';
import WorkflowProgress from './WorkflowProgress';
import AgreementTab from './AgreementTab';
import CloseoutTab from './CloseoutTab';
import ActivityList from './ActivityTab';

const TABS = ['Overview', 'Workflow', 'Agreement', 'Tasks', 'Performance', 'Activity', 'Closeout'] as const;
type Tab = (typeof TABS)[number];

function PropertiesPanel({ c }: { c: Campaign }) {
  const { updateCampaign, notify, programmeById } = useStore();
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
        {c.programmeId && <div className="side-fact"><span>Campaign</span><strong><Link href={`/programmes/${c.programmeId}?tab=performance`} className="textlink">{programmeById(c.programmeId)?.name ?? 'Open campaign'}</Link></strong></div>}
        {c.creatorId && <div className="side-fact"><span>Profile</span><strong><Link href={`/marketplace/${c.creatorId}`} className="textlink">View creator</Link></strong></div>}
        {c.code && <div className="side-fact"><span>Discount code</span><strong className="mono">{c.code}</strong></div>}
        <div className="side-fact"><span>Publication date</span><strong>{fmtDate(c.publicationDate)}</strong></div>
        <div className="side-fact"><span>Terms</span><strong className={missingTerms(c) ? 'missing' : 'confirmed'}>{missingTerms(c) ? `${missingTerms(c)} to resolve` : 'Complete'}</strong></div>
      </div>
    </aside>
  );
}

const PRI = { Urgent: 0, High: 1, Medium: 2, Low: 3 } as const;
const CLOSEOUT: [keyof Campaign['closeout'], string][] = [
  ['contentApproved', 'Content approved'], ['publicationConfirmed', 'Publication confirmed'], ['urlRecorded', 'Publication URL recorded'],
  ['invoiceSubmitted', 'Invoice submitted'], ['invoiceAccepted', 'Invoice accepted'], ['paymentRecorded', 'Payment recorded'],
];

function Health({ c }: { c: Campaign }) {
  const { tasks } = useStore();
  const s = campaignSignals(c, tasks);
  const tone = categoryTone(s.category);
  return (
    <section className={`card health t-${tone}`} aria-label="Campaign health">
      <div className="card-head"><h3>Campaign health</h3><Pill tone={tone}>{categoryLabel(s.category)}</Pill></div>
      <div className="health-main"><b>{Math.round(s.progress)}%</b><span className="muted">{s.doneTasks} of {s.totalTasks} tasks complete</span></div>
      <Bar value={s.progress} tone={tone} label="Campaign task progress" />
      <p className={s.attention ? 'attn-note' : 'ok-note'}>{s.attention ? `${s.attentionCount} item${s.attentionCount === 1 ? '' : 's'} need attention` : 'No open issues'}{s.missing.length ? ` · missing: ${s.missing.slice(0, 3).join(', ')}` : ''}</p>
    </section>
  );
}

function Deliverables({ c }: { c: Campaign }) {
  const { tasks } = useStore();
  const mine = tasks.filter((t) => t.campaignId === c.id);
  const items = c.agreement.deliverables.split(/\+|,|&|\band\b/i).map((x) => x.trim()).filter(Boolean);
  return (
    <section className="card" aria-label="Deliverables">
      <div className="card-head"><h3>Deliverables</h3><Link href={`/campaigns/${c.id}?tab=agreement`} className="textlink">Edit terms</Link></div>
      {items.length ? (
        <ul className="dlist">
          {items.map((it) => {
            const noun = (it.split(/\s+/).pop() ?? '').toLowerCase().replace(/s$/, '');
            const linked = noun.length > 2 ? mine.filter((t) => t.title.toLowerCase().includes(noun)) : [];
            const state = !linked.length ? 'none' : linked.every((t) => t.completed) ? 'done' : 'open';
            return (
              <li key={it} className={`d-${state}`}>
                <span className="d-ico">{state === 'done' ? <Check size={13} /> : <Circle size={9} />}</span>
                <div><b>{it}</b><small>{state === 'none' ? 'No linked task' : `${linked.length} linked task${linked.length === 1 ? '' : 's'}: ${linked.map((t) => t.key).join(', ')} · ${state === 'done' ? 'all done' : 'in progress'}`}</small></div>
              </li>
            );
          })}
        </ul>
      ) : <p className="muted">Deliverables are not set yet. Add them in the agreement.</p>}
      <div className="closeout-mini"><span className="eyebrow">Closeout checklist</span>
        {CLOSEOUT.map(([k, l]) => <span key={k} className={c.closeout[k] ? 'co on' : 'co'}>{c.closeout[k] ? <Check size={12} /> : <Circle size={8} />}{l}</span>)}
      </div>
      <p className="muted fine">Deliverable links are matched by task title; completing one task never marks a deliverable approved. Approval is recorded in Closeout.</p>
    </section>
  );
}

function TermsSummary({ c }: { c: Campaign }) {
  const rows: [string, string][] = [['Fee', c.agreement.fee], ['Organic usage', c.agreement.usageRights], ['Paid usage', c.agreement.paidUsageRights], ['Exclusivity', c.agreement.exclusivity], ['Revisions', c.agreement.revisions], ['Payment terms', c.agreement.paymentTerms]];
  return (
    <section className="card" aria-label="Terms">
      <div className="card-head"><h3>Terms</h3><Link href={`/campaigns/${c.id}?tab=agreement`} className="textlink">{missingTerms(c) ? 'Resolve terms' : 'Open agreement'}</Link></div>
      <div className="terms">{rows.map(([k, v]) => <div key={k} className={isGap(v) ? 'term gap' : 'term'}><span>{k}</span><b>{isGap(v) ? (v.trim() ? 'To be confirmed' : 'Missing') : v}</b></div>)}</div>
    </section>
  );
}

function PriorityTasks({ c }: { c: Campaign }) {
  const { tasks } = useStore();
  const top = tasks.filter((t) => t.campaignId === c.id && !t.completed).sort((a, b) => PRI[a.priority] - PRI[b.priority] || a.dueDate.localeCompare(b.dueDate)).slice(0, 3);
  return (
    <section aria-label="Priority tasks">
      <div className="sec-head"><h2>Priority tasks</h2><Link href={`/campaigns/${c.id}?tab=tasks`} className="textlink">All tasks</Link></div>
      {top.length ? <div className="wgroup-list">{top.map((t) => <TaskCard key={t.id} t={t} showCampaign={false} />)}</div> : <Empty title="No open tasks">Add a task to start tracking work.</Empty>}
    </section>
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
  const F = ({ l, children }: { l: string; children: string }) => <div className="field"><label>{l}</label><div className="field-value">{children || '-'}</div></div>;
  return (
    <div className="stack">
      <Health c={c} />
      <Deliverables c={c} />
      <TermsSummary c={c} />
      <PriorityTasks c={c} />
      <div className="panel">
        <div className="panel-head"><h3 className="section-title">Campaign brief</h3></div>
        <div className="panel-body field-grid">
          <div className="field full"><label>Brief</label><div className="field-value">{c.brief || '-'}</div></div>
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

function CollabPerformance({ c }: { c: Campaign }) {
  const { gridRows } = useStore();
  const row = c.programmeId ? gridRows(c.programmeId).find((r) => r.collab.id === c.id) : undefined;
  if (!c.programmeId || !row) return <Empty title="No campaign data">This collaboration is not part of a campaign, so there are no post numbers to show.</Empty>;
  const live = row.status === 'Live';
  return (
    <div className="stack">
      <div className="stats">
        <Stat label="Views" value={live && row.views !== null ? fmtNum(row.views) : '-'} sub={row.expectedViews ? `of ${fmtNum(row.expectedViews)} paid for` : undefined} tone={live ? deliveryTone(row.deliveryPct) : 'neutral'} badge={live ? <SourceBadge source="public" compact /> : undefined} />
        <Stat label="Delivery" value={row.deliveryPct === null ? '-' : fmtPct(row.deliveryPct)} sub="views vs views paid for" tone={deliveryTone(row.deliveryPct)} />
        <Stat label="Cost per 1,000 views" value={row.costPer1000 ? fmtINR(row.costPer1000) : '-'} sub={row.fee ? `fee ${fmtINR(row.fee)}` : 'fee to be agreed'} tone="peach" />
        <Stat label="Sales via code" value={row.revenue !== null ? fmtINR(row.revenue) : '-'} sub={row.orders !== null ? `${row.orders} orders${row.roas !== null ? `, ${row.roas.toFixed(1)}x return` : ''}` : 'Connect Shopify'} tone="mint" />
      </div>
      <div className="panel"><div className="panel-body">
        <p style={{ margin: 0 }}>{live ? `The Reel is live${row.postedOnTime === false ? ' and was posted late' : ' and went up on schedule'}.` : row.status === 'Late' || row.status === 'Missed' ? 'The Reel has not been posted yet.' : 'The Reel is planned and not posted yet.'} {row.locked && live ? 'Reach, saves and shares are private to the creator until they send a screenshot or connect Instagram.' : ''}</p>
        <p style={{ margin: '12px 0 0' }}><Link href={`/programmes/${c.programmeId}?tab=performance`} className="textlink">Open the campaign performance grid</Link></p>
      </div></div>
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
    return <><PageHeader title="Collaboration not found" subtitle="It may have been removed or the link is wrong." /><Link className="button" href="/campaigns">Back to collaborations</Link></>;
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
          <div className="detail-meta"><Avatar name={c.owner} />{c.owner}<span>·</span>{c.creator}<span>·</span>Due {fmtDate(c.dueDate)}<span>·</span><Pill tone={priorityTone(c.priority)} dot={false}>{c.priority}</Pill></div>
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
          {tab === 'Tasks' && <><div className="count-label">{q ? `${shown.length} of ${cTasks.length} tasks match "${search}"` : `${cTasks.length} tasks`}</div>{shown.length ? <div className="wgroup-list two">{shown.map((t) => <TaskCard key={t.id} t={t} showCampaign={false} />)}</div> : <Empty title="Nothing to show">{q ? 'No tasks match the search.' : 'No tasks yet. Add the first one.'}</Empty>}</>}
          {tab === 'Performance' && <CollabPerformance c={c} />}
          {tab === 'Activity' && <ActivityList campaignId={c.id} />}
          {tab === 'Closeout' && <CloseoutTab key={JSON.stringify([c.closeout, c.publicationUrl, c.paymentStatus])} campaign={c} />}
        </div>
        <PropertiesPanel c={c} />
      </div>
    </>
  );
}
