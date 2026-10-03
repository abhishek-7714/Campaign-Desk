import { useState } from 'react';
import { useLocation } from 'wouter';
import { Modal, SelectField, TextAreaField, TextField } from '@/components/ui-bits';
import { PRIORITIES, TASK_STATUSES, type Priority, type Task, type TaskStatus } from '@/domain/types';
import { CURRENT_USER } from '@/domain/helpers';
import { useStore } from '@/state/store';

export function CampaignDialog({ onClose }: { onClose: () => void }) {
  const { createCampaign } = useStore();
  const [, navigate] = useLocation();
  const [v, setV] = useState({ title: '', creator: '', owner: CURRENT_USER, dueDate: '', priority: 'Medium' as Priority, brief: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = () => {
    const e: Record<string, string> = {};
    if (!v.title.trim()) e.title = 'Collaboration title is required.';
    if (!v.creator.trim()) e.creator = 'Creator is required.';
    if (!v.owner.trim()) e.owner = 'Brand owner is required.';
    if (!v.dueDate) e.dueDate = 'Due date is required.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const id = createCampaign({ ...v, title: v.title.trim(), creator: v.creator.trim(), owner: v.owner.trim() });
    onClose();
    navigate(`/campaigns/${id}`);
  };
  return (
    <Modal title="Create collaboration" onClose={onClose} onSubmit={submit} submitLabel="Create collaboration">
      <div className="form-grid">
        <TextField wide label="Collaboration title *" value={v.title} error={errors.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
        <TextField label="Creator *" value={v.creator} error={errors.creator} onChange={(e) => setV({ ...v, creator: e.target.value })} />
        <TextField label="Brand owner *" value={v.owner} error={errors.owner} onChange={(e) => setV({ ...v, owner: e.target.value })} />
        <TextField label="Due date *" type="date" value={v.dueDate} error={errors.dueDate} onChange={(e) => setV({ ...v, dueDate: e.target.value })} />
        <SelectField label="Priority" value={v.priority} options={PRIORITIES} onChange={(e) => setV({ ...v, priority: e.target.value as Priority })} />
        <TextAreaField wide label="Brief (optional)" value={v.brief} onChange={(e) => setV({ ...v, brief: e.target.value })} />
      </div>
      <p className="count-label" style={{ marginTop: 10 }}>New collaborations start in Planning with an empty agreement; incomplete terms are flagged until confirmed.</p>
    </Modal>
  );
}

export function TaskDialog({ campaignId, task, onClose }: { campaignId?: string; task?: Task; onClose: () => void }) {
  const { campaigns, createTask, updateTask, people } = useStore();
  const [v, setV] = useState({
    campaignId: task?.campaignId ?? campaignId ?? campaigns[0]?.id ?? '',
    title: task?.title ?? '', assignee: task?.assignee ?? CURRENT_USER, dueDate: task?.dueDate ?? '',
    priority: (task?.priority ?? 'Medium') as Priority, status: (task?.status ?? 'To Do') as TaskStatus,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = () => {
    const e: Record<string, string> = {};
    if (!v.title.trim()) e.title = 'Task title is required.';
    if (!v.assignee.trim()) e.assignee = 'Assignee is required.';
    if (!v.dueDate) e.dueDate = 'Due date is required.';
    if (!v.campaignId) e.campaignId = 'Choose a campaign.';
    setErrors(e);
    if (Object.keys(e).length) return;
    if (task) updateTask(task.id, { ...v, title: v.title.trim(), assignee: v.assignee.trim() }, 'details saved');
    else createTask({ ...v, title: v.title.trim(), assignee: v.assignee.trim() });
    onClose();
  };
  return (
    <Modal title={task ? `Edit ${task.key}` : 'Create task'} onClose={onClose} onSubmit={submit} submitLabel={task ? 'Save task' : 'Create task'}>
      <div className="form-grid">
        <TextField wide label="Task title *" value={v.title} error={errors.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
        <SelectField label="Campaign *" value={v.campaignId} error={errors.campaignId} options={campaigns.map((c) => ({ value: c.id, label: `${c.issueKey} ${c.title}` }))} onChange={(e) => setV({ ...v, campaignId: e.target.value })} />
        <TextField label="Assignee *" list="people-list" value={v.assignee} error={errors.assignee} onChange={(e) => setV({ ...v, assignee: e.target.value })} />
        <datalist id="people-list">{people.map((p) => <option key={p} value={p} />)}</datalist>
        <TextField label="Due date *" type="date" value={v.dueDate} error={errors.dueDate} onChange={(e) => setV({ ...v, dueDate: e.target.value })} />
        <SelectField label="Priority" value={v.priority} options={PRIORITIES} onChange={(e) => setV({ ...v, priority: e.target.value as Priority })} />
        <SelectField label="Status" value={v.status} options={TASK_STATUSES} onChange={(e) => setV({ ...v, status: e.target.value as TaskStatus })} />
      </div>
    </Modal>
  );
}
