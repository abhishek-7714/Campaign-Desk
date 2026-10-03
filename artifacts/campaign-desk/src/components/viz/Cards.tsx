import { useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { CalendarDays, Check, ChevronDown, Pencil } from 'lucide-react';
import { PRIORITIES, TASK_STATUSES, type Campaign, type Priority, type Task, type TaskStatus } from '@/domain/types';
import { CURRENT_USER, campaignOverdue, fmtDate, taskOverdue, todayISO, initials } from '@/domain/helpers';
import { campaignSignals } from '@/domain/analytics';
import { categoryLabel, categoryTone, priorityTone, taskTone, type Tone } from '@/domain/format';
import { useStore } from '@/state/store';

export function Pill({ tone, children, dot = true }: { tone: Tone; children: ReactNode; dot?: boolean }) {
  return <span className={`pill t-${tone}`}>{dot && <i />}{children}</span>;
}

export function Bar({ value, tone = 'blue', label }: { value: number; tone?: Tone; label?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={`bar t-${tone}`} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? 'Progress'}>
      <span style={{ transform: `scaleX(${v / 100})` }} />
    </div>
  );
}

export function Person({ name }: { name: string }) {
  return <span className="person"><b aria-hidden="true">{initials(name)}</b>{name}</span>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty-card"><div className="empty-art" aria-hidden="true"><i /><i /><i /></div><strong>{title}</strong>{children && <p>{children}</p>}</div>;
}

export function CampaignCard({ c, i = 0 }: { c: Campaign; i?: number }) {
  const { tasks } = useStore();
  const s = campaignSignals(c, tasks);
  const overdue = campaignOverdue(c);
  const tone = categoryTone(s.category);
  const variant = s.category === 'completed' ? 'done' : overdue || s.category === 'blocked' ? 'urgent' : s.attention ? 'attn' : 'ok';
  return (
    <article className={`ccard v-${variant} t-${tone}`} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }} data-testid={`card-campaign-${c.id}`}>
      <div className="ccard-top">
        <Pill tone={tone}>{categoryLabel(s.category)}</Pill>
        <Pill tone={priorityTone(c.priority)} dot={false}>{c.priority}</Pill>
      </div>
      <h3><Link href={`/campaigns/${c.id}`} className="stretch">{c.title}</Link></h3>
      <p className="muted">{c.status} · {c.issueKey}</p>
      <span className="eyebrow">Collaboration</span>
      <div className="ccard-people"><Person name={c.creator} /><span className="muted">for {c.owner}</span></div>
      <div className="ccard-prog"><Bar value={s.progress} tone={tone} label={`${c.title} progress`} /><b>{Math.round(s.progress)}%</b></div>
      <div className="ccard-foot">
        <span className={overdue ? 'due-chip bad' : 'due-chip'}><CalendarDays size={13} />{fmtDate(c.dueDate)}{overdue && ' · overdue'}</span>
        <span className={s.attention ? 'attn-note' : 'ok-note'}>{s.attention ? `${s.attentionCount} need${s.attentionCount === 1 ? 's' : ''} attention` : 'On track'}</span>
      </div>
    </article>
  );
}

export function TaskCard({ t, showCampaign = true }: { t: Task; showCampaign?: boolean }) {
  const { campaignById, updateTask, people, openDialog } = useStore();
  const [open, setOpen] = useState(false);
  const c = campaignById(t.campaignId);
  const od = taskOverdue(t);
  const today = t.dueDate === todayISO() && !t.completed;
  const act = t.completed
    ? { label: 'Reopen', run: () => updateTask(t.id, { completed: false }, 'reopened') }
    : t.status === 'In Review' && t.assignee === CURRENT_USER
      ? { label: 'Approve', run: () => updateTask(t.id, { completed: true }, 'completed') }
      : { label: 'Mark done', run: () => updateTask(t.id, { completed: true }, 'completed') };
  return (
    <article className={`tcard t-${od ? 'coral' : taskTone(t.status)} ${t.completed ? 'is-done' : ''} ${od ? 'is-late' : ''}`} data-testid={`card-task-${t.id}`}>
      <div className="tcard-row">
        <input className="check" type="checkbox" checked={t.completed} aria-label={`Mark ${t.key} complete`}
          onChange={(e) => updateTask(t.id, { completed: e.target.checked }, e.target.checked ? 'completed' : 'reopened')} />
        <div className="tcard-main">
          <h4>{t.title}</h4>
          {showCampaign && c && <Link href={`/campaigns/${c.id}?tab=tasks`} className="tcard-camp">{c.title}</Link>}
        </div>
        <button className="icon-flat" aria-label={`Edit ${t.key}`} onClick={() => openDialog({ type: 'task', task: t })}><Pencil size={14} /></button>
      </div>
      <div className="tcard-pills">
        <Pill tone={taskTone(t.status)}>{t.status}</Pill>
        <Pill tone={priorityTone(t.priority)} dot={false}>{t.priority}</Pill>
        <span className={od ? 'due-chip bad' : today ? 'due-chip warn' : 'due-chip'}><CalendarDays size={13} />{od ? 'Overdue · ' : today ? 'Today · ' : ''}{fmtDate(t.dueDate)}</span>
      </div>
      <div className="tcard-actions">
        <button className="btn soft" onClick={act.run}><Check size={14} />{act.label}</button>
        <Person name={t.assignee} />
        <button className="icon-flat expand" aria-expanded={open} aria-label={`${open ? 'Hide' : 'Show'} controls for ${t.key}`} onClick={() => setOpen(!open)}><ChevronDown size={15} style={{ transform: open ? 'rotate(180deg)' : undefined }} /></button>
      </div>
      {open && (
        <div className="tcard-edit">
          <label>Status
            <select aria-label={`Status for ${t.key}`} value={t.status} onChange={(e) => updateTask(t.id, { status: e.target.value as TaskStatus }, `moved to ${e.target.value}`)}>
              {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select></label>
          <label>Priority
            <select aria-label={`Priority for ${t.key}`} value={t.priority} onChange={(e) => updateTask(t.id, { priority: e.target.value as Priority }, `priority set to ${e.target.value}`)}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select></label>
          <label>Due
            <input type="date" aria-label={`Due date for ${t.key}`} value={t.dueDate} onChange={(e) => e.target.value && updateTask(t.id, { dueDate: e.target.value }, `due date set to ${e.target.value}`)} /></label>
          <label>Assignee
            <select aria-label={`Assignee for ${t.key}`} value={t.assignee} onChange={(e) => updateTask(t.id, { assignee: e.target.value }, `reassigned to ${e.target.value}`)}>
              {Array.from(new Set([...people, t.assignee])).map((p) => <option key={p}>{p}</option>)}
            </select></label>
        </div>
      )}
    </article>
  );
}

export function PageTitle({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <header className="ptitle">
      <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
      {actions && <div className="ptitle-actions">{actions}</div>}
    </header>
  );
}
