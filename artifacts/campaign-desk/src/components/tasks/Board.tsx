import { useState } from 'react';
import { Link } from 'wouter';
import { CalendarDays, GripVertical } from 'lucide-react';
import { TASK_STATUSES, type Task, type TaskStatus } from '@/domain/types';
import { fmtDate, taskOverdue } from '@/domain/helpers';
import { priorityTone, taskTone } from '@/domain/format';
import { Person, Pill } from '@/components/viz/Cards';
import { useStore } from '@/state/store';

export function Board({ tasks }: { tasks: Task[] }) {
  const { campaignById, updateTask, openDialog } = useStore();
  const [over, setOver] = useState<TaskStatus | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  return (
    <div className="kanban">
      {TASK_STATUSES.map((status) => {
        const col = tasks.filter((t) => t.status === status);
        const late = col.filter(taskOverdue).length;
        const share = tasks.length ? (col.length / tasks.length) * 100 : 0;
        return (
          <section key={status} className={`kcol t-${taskTone(status)} ${over === status ? 'drop' : ''}`} aria-label={`${status} column`}
            onDragOver={(e) => { e.preventDefault(); setOver(status); }} onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault(); setOver(null); setDrag(null);
              const id = e.dataTransfer.getData('text/plain');
              const t = tasks.find((x) => x.id === id);
              if (t && t.status !== status) updateTask(id, { status }, `moved to ${status}`);
            }}>
            <div className="khead">
              <div><h2>{status}</h2><span>{late ? `${late} overdue` : 'on schedule'}</span></div>
              <b>{col.length}</b>
              <div className="kmeter" aria-hidden="true"><span style={{ transform: `scaleX(${share / 100})` }} /></div>
            </div>
            <div className="kcards">
              {col.map((t, i) => {
                const c = campaignById(t.campaignId);
                const od = taskOverdue(t);
                return (
                  <article key={t.id} className={`kcard u-${t.priority.toLowerCase()} ${od ? 'is-late' : ''} ${drag === t.id ? 'dragging' : ''}`} draggable data-testid={`card-task-${t.id}`}
                    style={{ ['--tilt' as string]: `${i % 2 ? 0.25 : -0.25}deg` }}
                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', t.id); setDrag(t.id); }} onDragEnd={() => { setDrag(null); setOver(null); }}>
                    <div className="kcard-top"><GripVertical size={14} aria-hidden="true" /><Pill tone={priorityTone(t.priority)}>{t.priority}</Pill></div>
                    <button type="button" className="ktitle" onClick={() => openDialog({ type: 'task', task: t })}>{t.title}</button>
                    {c && <Link href={`/campaigns/${c.id}?tab=tasks`} className="tcard-camp">{c.title}</Link>}
                    <div className="kcard-meta"><Person name={t.assignee.split(' ')[0]} /><span className={od ? 'due-chip bad' : 'due-chip'}><CalendarDays size={12} />{fmtDate(t.dueDate)}</span></div>
                    <select className="kmove" aria-label={`Move ${t.key}`} value={t.status} onChange={(e) => updateTask(t.id, { status: e.target.value as TaskStatus }, `moved to ${e.target.value}`)}>
                      {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </article>
                );
              })}
              {!col.length && <div className="kempty">Drop a card here</div>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
