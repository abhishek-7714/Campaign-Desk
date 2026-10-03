import { useState } from 'react';
import { Plus } from 'lucide-react';
import { CURRENT_USER, taskOverdue, todayISO } from '@/domain/helpers';
import { matchTask } from '@/domain/search';
import { TASK_STATUSES } from '@/domain/types';
import { useStore } from '@/state/store';
import { Empty, PageTitle, TaskCard } from '@/components/viz/Cards';

export default function MyWork() {
  const { tasks, campaigns, campaignById, search, openDialog } = useStore();
  const [status, setStatus] = useState('all');
  const [campaign, setCampaign] = useState('all');
  const q = search.trim().toLowerCase();
  const today = todayISO();
  const mine = tasks.filter((t) => t.assignee === CURRENT_USER && !t.completed && (status === 'all' || t.status === status) && (campaign === 'all' || t.campaignId === campaign)
    && matchTask(t, campaignById(t.campaignId)?.title ?? '', q));
  const groups = [
    { k: 'Due today', tone: 'blue', items: mine.filter((t) => t.dueDate === today), empty: 'Nothing due today.' },
    { k: 'Overdue', tone: 'coral', items: mine.filter(taskOverdue), empty: 'Nothing overdue. Nice.' },
    { k: 'Awaiting my review', tone: 'purple', items: mine.filter((t) => t.status === 'In Review'), empty: 'No reviews waiting on you.' },
    { k: 'Upcoming', tone: 'mint', items: mine.filter((t) => t.dueDate > today && t.status !== 'In Review'), empty: 'No upcoming tasks.' },
  ];
  return (
    <>
      <PageTitle title="My work" sub={`Open tasks assigned to ${CURRENT_USER}.`} actions={<button className="btn primary lg" onClick={() => openDialog({ type: 'task' })}><Plus size={16} />New task</button>} />
      <div className="filters"><div className="selects">
        <select aria-label="Filter by task status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option>{TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        <select aria-label="Filter by collaboration" value={campaign} onChange={(e) => setCampaign(e.target.value)}><option value="all">All collaborations</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
      </div></div>
      <div className="work-groups">
        {groups.map((g) => (
          <section key={g.k} className={`wgroup t-${g.tone}`} aria-label={g.k} data-testid={`group-${g.k.toLowerCase().replace(/ /g, '-')}`}>
            <div className="wgroup-head"><h2>{g.k}</h2><b>{g.items.length}</b></div>
            {g.items.length ? <div className="wgroup-list">{g.items.map((t) => <TaskCard key={t.id} t={t} />)}</div> : <Empty title={g.empty} />}
          </section>
        ))}
      </div>
    </>
  );
}
