import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Agreement, Campaign, Closeout, PaymentStatus, Persisted, Priority, Status, Task, TaskStatus } from '@/domain/types';
import { CURRENT_USER, STORAGE_KEY, AGREEMENT_FIELDS, transitionBlockers } from '@/domain/helpers';
import { buildSeed } from '@/domain/seed';

interface LoadResult { data: Persisted; error: string | null; blocked: boolean }

function load(): LoadResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { data: buildSeed(), error: null, blocked: false };
    const parsed = JSON.parse(raw) as Persisted;
    if (parsed?.version !== 2 || !Array.isArray(parsed.campaigns) || !Array.isArray(parsed.tasks)) throw new Error('Saved data has an unexpected format.');
    return { data: parsed, error: null, blocked: false };
  } catch (e) {
    return {
      data: buildSeed(),
      error: `Saved workspace data could not be read (${e instanceof Error ? e.message : 'unknown error'}). Showing sample data; your stored data has not been overwritten.`,
      blocked: true,
    };
  }
}

export interface ToastState { id: number; message: string; kind: 'success' | 'error' }
export type DialogState =
  | { type: 'campaign' }
  | { type: 'task'; campaignId?: string; task?: Task }
  | null;

export interface NewCampaignInput { title: string; creator: string; owner: string; dueDate: string; priority: Priority; brief: string }
export interface NewTaskInput { campaignId: string; title: string; assignee: string; dueDate: string; priority: Priority; status: TaskStatus }

interface Store {
  workspaceName: string;
  campaigns: Campaign[];
  tasks: Task[];
  activity: Persisted['activity'];
  storageError: string | null;
  writesBlocked: boolean;
  startFresh: () => void;
  resetSample: () => void;
  setWorkspaceName: (name: string) => void;
  search: string;
  setSearch: (s: string) => void;
  toast: ToastState | null;
  notify: (message: string, kind?: 'success' | 'error') => void;
  dialog: DialogState;
  openDialog: (d: DialogState) => void;
  createCampaign: (i: NewCampaignInput) => string;
  updateCampaign: (id: string, patch: Partial<Campaign>, message?: string) => void;
  transitionStatus: (id: string, to: Status) => string[];
  saveAgreement: (id: string, a: Agreement) => void;
  saveCloseout: (id: string, v: { closeout: Closeout; publicationUrl: string; paymentStatus: PaymentStatus }) => void;
  createTask: (i: NewTaskInput) => void;
  updateTask: (id: string, patch: Partial<Task>, label?: string) => void;
  campaignById: (id: string) => Campaign | undefined;
  people: string[];
}

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used within StoreProvider');
  return v;
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = useRef<LoadResult | undefined>(undefined);
  if (!initial.current) initial.current = load();
  const [data, setData] = useState<Persisted>(initial.current.data);
  const [storageError, setStorageError] = useState<string | null>(initial.current.error);
  const [writesBlocked, setWritesBlocked] = useState(initial.current.blocked);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [dialog, openDialog] = useState<DialogState>(null);

  useEffect(() => {
    if (writesBlocked) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      setStorageError(`Changes could not be saved to this browser (${e instanceof Error ? e.message : 'storage unavailable'}). They will be lost on refresh.`);
    }
  }, [data, writesBlocked]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const notify = useCallback((message: string, kind: 'success' | 'error' = 'success') => setToast({ id: Date.now(), message, kind }), []);

  const event = (campaignId: string, message: string) => ({
    id: crypto.randomUUID(), campaignId, actor: CURRENT_USER, message, timestamp: new Date().toISOString(),
  });

  const store = useMemo<Store>(() => {
    const patchCampaign = (prev: Persisted, id: string, patch: Partial<Campaign>, message?: string): Persisted => ({
      ...prev,
      campaigns: prev.campaigns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      activity: message ? [event(id, message), ...prev.activity] : prev.activity,
    });
    const find = (id: string) => data.campaigns.find((c) => c.id === id);

    return {
      workspaceName: data.workspaceName,
      campaigns: data.campaigns,
      tasks: data.tasks,
      activity: data.activity,
      storageError,
      writesBlocked,
      startFresh: () => { setWritesBlocked(false); setStorageError(null); notify('Started a fresh workspace from sample data'); },
      resetSample: () => { setData(buildSeed()); notify('Workspace reset to sample data'); },
      setWorkspaceName: (name) => setData((p) => ({ ...p, workspaceName: name })),
      search, setSearch, toast, notify, dialog, openDialog,
      campaignById: find,
      people: Array.from(new Set([...data.tasks.map((t) => t.assignee), ...data.campaigns.map((c) => c.owner), CURRENT_USER])).filter(Boolean).sort(),
      createCampaign: (i) => {
        const n = Math.max(100, ...data.campaigns.map((c) => Number(c.issueKey.replace('CMP-', '')) || 0)) + 1;
        const id = `c${Date.now()}`;
        const agreement = { deliverables: '', fee: '', usageRights: '', paidUsageRights: '', exclusivity: '', revisions: '', contentDeadline: '', publicationDate: '', paymentTerms: '', talkingPoints: '' };
        const campaign: Campaign = {
          id, issueKey: `CMP-${n}`, title: i.title, brand: data.workspaceName, creator: i.creator, owner: i.owner,
          status: 'Planning', priority: i.priority, dueDate: i.dueDate, brief: i.brief, objective: '', deliverables: '', audience: '',
          publicationDate: '', blocker: '', nextAction: 'Confirm agreement terms with the creator.', agreement, publicationUrl: '',
          invoiceStatus: 'Not submitted', paymentStatus: 'Not Invoiced',
          closeout: { contentApproved: false, publicationConfirmed: false, urlRecorded: false, invoiceSubmitted: false, invoiceAccepted: false, paymentRecorded: false },
        };
        setData((p) => ({ ...p, campaigns: [campaign, ...p.campaigns], activity: [event(id, 'Campaign created'), ...p.activity] }));
        notify(`CMP-${n} created`);
        return id;
      },
      updateCampaign: (id, patch, message) => {
        setData((p) => patchCampaign(p, id, patch, message));
        if (message) notify(message);
      },
      transitionStatus: (id, to) => {
        const c = find(id);
        if (!c) return ['Campaign not found.'];
        const reasons = transitionBlockers(c, to);
        if (reasons.length) return reasons;
        setData((p) => patchCampaign(p, id, { status: to }, `Status changed from ${c.status} to ${to}`));
        notify(`Status changed to ${to}`);
        return [];
      },
      saveAgreement: (id, a) => {
        const c = find(id);
        if (!c) return;
        const changed = AGREEMENT_FIELDS.filter((f) => c.agreement[f.key] !== a[f.key]).map((f) => f.label);
        setData((p) => patchCampaign(p, id, { agreement: a, deliverables: a.deliverables, publicationDate: a.publicationDate },
          `Agreement updated${changed.length ? `: ${changed.join(', ')}` : ''}`));
        notify('Agreement saved');
      },
      saveCloseout: (id, v) => {
        const c = find(id);
        if (!c) return;
        const notes: string[] = [];
        if (v.publicationUrl !== c.publicationUrl) notes.push(v.publicationUrl ? `Publication URL recorded: ${v.publicationUrl}` : 'Publication URL cleared');
        if (v.closeout.publicationConfirmed !== c.closeout.publicationConfirmed) notes.push(`Publication ${v.closeout.publicationConfirmed ? 'confirmed' : 'confirmation removed'}`);
        if (v.closeout.contentApproved !== c.closeout.contentApproved) notes.push(`Content ${v.closeout.contentApproved ? 'marked approved' : 'approval removed'}`);
        if (v.closeout.invoiceSubmitted !== c.closeout.invoiceSubmitted || v.closeout.invoiceAccepted !== c.closeout.invoiceAccepted) {
          notes.push(`Invoice recorded as ${v.closeout.invoiceAccepted ? 'accepted' : v.closeout.invoiceSubmitted ? 'submitted' : 'not submitted'}`);
        }
        if (v.paymentStatus !== c.paymentStatus) notes.push(`Payment status changed from ${c.paymentStatus} to ${v.paymentStatus}`);
        const invoiceStatus = v.closeout.invoiceAccepted ? 'Accepted' : v.closeout.invoiceSubmitted ? 'Submitted' : 'Not submitted';
        const message = notes.length ? `Closeout updated: ${notes.join('; ')}` : 'Closeout saved (no changes)';
        // Payment and closeout tracking never changes the campaign workflow status.
        setData((p) => patchCampaign(p, id, { closeout: v.closeout, publicationUrl: v.publicationUrl, paymentStatus: v.paymentStatus, invoiceStatus }, message));
        notify('Closeout saved');
      },
      createTask: (i) => {
        const n = Math.max(0, ...data.tasks.map((t) => Number(t.key.replace('TSK-', '')) || 0)) + 1;
        const task: Task = { id: `t${Date.now()}`, key: `TSK-${n}`, ...i, completed: i.status === 'Done' };
        setData((p) => ({ ...p, tasks: [task, ...p.tasks], activity: [event(i.campaignId, `Task ${task.key} added: ${i.title}`), ...p.activity] }));
        notify(`${task.key} added`);
      },
      updateTask: (id, patch, label) => {
        const t = data.tasks.find((x) => x.id === id);
        if (!t) return;
        const next: Task = { ...t, ...patch };
        if (patch.status !== undefined) next.completed = patch.status === 'Done';
        else if (patch.completed !== undefined) next.status = patch.completed ? 'Done' : t.status === 'Done' ? 'In Progress' : t.status;
        const message = label ?? 'updated';
        setData((p) => ({
          ...p,
          tasks: p.tasks.map((x) => (x.id === id ? next : x)),
          activity: [event(t.campaignId, `Task ${t.key} ${message}`), ...p.activity],
        }));
        notify(`${t.key} ${message}`);
      },
    };
  }, [data, storageError, writesBlocked, search, toast, dialog, notify]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
