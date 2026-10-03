import { useState } from 'react';
import { Link } from 'wouter';
import { Ban } from 'lucide-react';
import { TASK_STATUSES, type Task, type TaskStatus } from '@/domain/types';
import { taskOverdue, fmtDate } from '@/domain/helpers';
import { Avatar, PriorityLabel } from '@/components/ui-bits';
import { useStore } from '@/state/store';

export function Board({ tasks }: { tasks: Task[] }) {
  const { campaignById, updateTask, openDialog } = useStore();
  const [over, setOver] = useState<TaskStatus | null>(null);
  return (
    <div className="board-grid board5">
      {TASK_STATUSES.map((status) => {
        const col = tasks.filter((t) => t.status === status);
        return (
          <section key={status} className={`board-column ${over === status ? 'drop' : ''}`} aria-label={`${status} column`}
            onDragOver={(e) => { e.preventDefault(); setOver(status); }} onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault(); setOver(null);
              const id = e.dataTransfer.getData('text/plain');
              const t = tasks.find((x) => x.id === id);
              if (t && t.status !== status) updateTask(id, { status }, `moved to ${status}`);
            }}>
            <div className="board-head">{status}<span>{col.length}</span></div>
            <div className="board-cards">
              {col.map((t) => {
                const c = campaignById(t.campaignId);
                return (
                  <article key={t.id} className={`board-card ${t.status === 'Blocked' ? 'blocked' : ''}`} draggable data-testid={`card-task-${t.id}`}
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}>
                    <div className="board-card-foot"><span className="issue-key">{t.key}</span>{t.status === 'Blocked' && <span className="blocked-tag"><Ban size={10} />Blocked</span>}</div>
                    <button type="button" className="board-card-title linklike" onClick={() => openDialog({ type: 'task', task: t })}>{t.title}</button>
                    {c && <Link href={`/campaigns/${c.id}`} className="link" style={{ fontSize: 10 }}>{c.issueKey} {c.title}</Link>}
                    <div className="board-card-foot" style={{ marginTop: 8 }}>
                      <span className="creator-cell"><Avatar name={t.assignee} />{t.assignee.split(' ')[0]}</span>
                      <span className={taskOverdue(t) ? 'due overdue' : ''}>{fmtDate(t.dueDate)}</span>
                    </div>
                    <div className="board-card-foot" style={{ marginTop: 8 }}>
                      <PriorityLabel value={t.priority} />
                      <select className="compact-select" aria-label={`Move ${t.key}`} value={t.status}
                        onChange={(e) => updateTask(t.id, { status: e.target.value as TaskStatus }, `moved to ${e.target.value}`)}>
                        {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </article>
                );
              })}
              {!col.length && <div className="empty-state" style={{ padding: '22px 8px' }}>No tasks in {status}.</div>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
