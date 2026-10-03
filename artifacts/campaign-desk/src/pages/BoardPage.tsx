import { Plus } from 'lucide-react';
import { matchTask } from '@/domain/search';
import { useStore } from '@/state/store';
import { Board } from '@/components/tasks/Board';
import { PageTitle } from '@/components/viz/Cards';

export default function BoardPage() {
  const { tasks, campaignById, search, openDialog } = useStore();
  const q = search.trim().toLowerCase();
  const shown = tasks.filter((t) => matchTask(t, campaignById(t.campaignId)?.title ?? '', q));
  return (
    <>
      <PageTitle title="Board" sub={`Drag cards between columns, or use the Move menu on each card.${q ? ' Search filter applied.' : ''}`}
        actions={<button className="btn primary lg" onClick={() => openDialog({ type: 'task' })}><Plus size={16} />New task</button>} />
      <Board tasks={shown} />
    </>
  );
}
