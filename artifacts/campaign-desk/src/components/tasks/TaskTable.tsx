import { Link } from 'wouter';
import { Pencil } from 'lucide-react';
import { PRIORITIES, TASK_STATUSES, type Priority, type Task, type TaskStatus } from '@/domain/types';
import { taskOverdue } from '@/domain/helpers';
import { Avatar, EmptyState } from '@/components/ui-bits';
import { useStore } from '@/state/store';

export function TaskTable({ tasks, showCampaign = true, emptyText = 'No tasks match.' }: { tasks: Task[]; showCampaign?: boolean; emptyText?: string }) {
  const { campaignById, updateTask, people, openDialog } = useStore();
  return (
    <div className="table-wrap" style={{ borderRadius: 6 }}>
      <table className="data-table" style={{ minWidth: 900 }}>
        <thead>
          <tr>
            <th aria-label="Complete" style={{ width: 28 }} />
            <th>Key</th><th>Task</th>{showCampaign && <th>Campaign</th>}<th>Assignee</th><th>Status</th><th>Due date</th><th>Priority</th><th aria-label="Edit" />
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
            const c = campaignById(t.campaignId);
            return (
              <tr key={t.id} className={t.completed ? 'row-done' : ''} data-testid={`row-task-${t.id}`}>
                <td><input className="check" type="checkbox" checked={t.completed} aria-label={`Mark ${t.key} complete`}
                  onChange={(e) => updateTask(t.id, { completed: e.target.checked }, e.target.checked ? 'completed' : 'reopened')} /></td>
                <td><span className="issue-key">{t.key}</span></td>
                <td><span className="task-name">{t.title}</span></td>
                {showCampaign && <td>{c ? <Link href={`/campaigns/${c.id}`} className="link"><span className="issue-key">{c.issueKey}</span> {c.title}</Link> : '—'}</td>}
                <td>
                  <div className="creator-cell"><Avatar name={t.assignee} />
                    <select className="compact-select bare" aria-label={`Assignee for ${t.key}`} value={t.assignee}
                      onChange={(e) => updateTask(t.id, { assignee: e.target.value }, `reassigned to ${e.target.value}`)}>
                      {Array.from(new Set([...people, t.assignee])).map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </td>
                <td>
                  <select className={`compact-select lozenge s-${t.status.toLowerCase().replace(' ', '-')}`} aria-label={`Status for ${t.key}`} value={t.status}
                    onChange={(e) => updateTask(t.id, { status: e.target.value as TaskStatus }, `moved to ${e.target.value}`)}>
                    {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td>
                  <input type="date" className={`compact-select ${taskOverdue(t) ? 'overdue-input' : ''}`} aria-label={`Due date for ${t.key}`} value={t.dueDate}
                    onChange={(e) => e.target.value && updateTask(t.id, { dueDate: e.target.value }, `due date set to ${e.target.value}`)} />
                  {taskOverdue(t) && <span className="due overdue" style={{ marginLeft: 6, fontSize: 10 }}>Overdue</span>}
                </td>
                <td>
                  <select className="compact-select bare" aria-label={`Priority for ${t.key}`} value={t.priority}
                    onChange={(e) => updateTask(t.id, { priority: e.target.value as Priority }, `priority set to ${e.target.value}`)}>
                    {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </td>
                <td><button className="button ghost icon-btn" aria-label={`Edit ${t.key}`} onClick={() => openDialog({ type: 'task', task: t })}><Pencil /></button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!tasks.length && <EmptyState title="Nothing to show">{emptyText}</EmptyState>}
    </div>
  );
}
