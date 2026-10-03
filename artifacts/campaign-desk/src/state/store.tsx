import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type {
  Agreement, Application, ApplicationAction, Campaign, Closeout, Creator, Integrations, Niche, PaymentStatus, Persisted, Post, PostInsights,
  Priority, Programme, ProgrammeStatus, Role, Status, Task, TaskStatus, Tier,
} from '@/domain/types';
import { CURRENT_USER, STORAGE_KEY, AGREEMENT_FIELDS, addDays, todayISO, transitionBlockers } from '@/domain/helpers';
import { buildSeed } from '@/domain/seed';
import { makeCollaboration } from '@/domain/collab';
import { buildGridRows, bumpSnapshots, insightsFromConnection, rngFor, simulateSnapshots, type GridRow } from '@/domain/performance';
import { fmtINR } from '@/domain/money';

interface LoadResult { data: Persisted; error: string | null; blocked: boolean }

function load(): LoadResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { data: buildSeed(), error: null, blocked: false };
    const parsed = JSON.parse(raw) as Persisted;
    if (parsed?.version !== 3 || !Array.isArray(parsed.campaigns) || !Array.isArray(parsed.posts) || !Array.isArray(parsed.creators)) throw new Error('Saved data has an unexpected format.');
    return { data: { ...parsed, signedIn: parsed.signedIn === true }, error: null, blocked: false };
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
export interface NewProgrammeInput {
  name: string; objective: string; brief: string; product: string; niches: Niche[]; tiers: Tier[]; budget: number; ratePer1000: number;
  startDate: string; endDate: string; applyBy: string; slots: number; deliverable: string; feeMin: number; feeMax: number;
}
export interface OfferInput { programmeId: string; creatorId: string; fee: number; message: string }

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

  /* ---- marketplace and performance ---- */
  signedIn: boolean;
  /** Demo login: no password check, just picks which account to view. */
  signIn: (r: Role) => void;
  signOut: () => void;
  role: Role;
  setRole: (r: Role) => void;
  /** Epoch ms, refreshed when a "fetching" row finishes. Use it when deciding what to display. */
  now: number;
  actingCreatorId: string;
  /** The creator the Creator view acts as. */
  actingCreator: Creator;
  creators: Creator[];
  programmes: Programme[];
  /** Programmes owned by this workspace (the Brand view). */
  brandProgrammes: Programme[];
  applications: Application[];
  posts: Post[];
  shortlist: string[];
  integrations: Integrations;
  creatorById: (id: string) => Creator | undefined;
  programmeById: (id: string) => Programme | undefined;
  /** One row per collaboration in the programme, with all derived metrics. */
  gridRows: (programmeId: string) => GridRow[];
  toggleShortlist: (creatorId: string) => void;
  updateCreator: (id: string, patch: Partial<Creator>, message?: string) => void;
  connectCreatorInstagram: (creatorId: string) => void;
  setIntegration: (key: keyof Integrations, on: boolean) => void;

  createProgramme: (i: NewProgrammeInput) => string;
  updateProgramme: (id: string, patch: Partial<Programme>, message?: string) => void;
  setProgrammeStatus: (id: string, status: ProgrammeStatus) => void;

  applyToProgramme: (i: OfferInput) => void;
  inviteCreator: (i: OfferInput) => void;
  respondApplication: (appId: string, action: ApplicationAction, by: 'brand' | 'creator', opts?: { fee?: number; note?: string }) => void;

  addPostLink: (postId: string, url: string) => void;
  bulkAddLinks: (rows: { postId: string; url: string }[]) => void;
  removePostLink: (postId: string) => void;
  markStoryPosted: (postId: string) => void;
  refreshProgramme: (programmeId: string) => void;
  requestInsights: (postId: string) => void;
  confirmInsights: (postId: string, v: { reach: number; saves: number; shares: number; views?: number; replies?: number }) => void;
  setPostCollab: (postId: string, isCollab: boolean) => void;
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
  const [now, setNow] = useState(() => Date.now());

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

  // Re-render once when the soonest "fetching" row is due to finish.
  useEffect(() => {
    const t0 = Date.now();
    const next = data.posts.reduce((m, p) => (p.fetchingUntil > t0 && p.fetchingUntil < m ? p.fetchingUntil : m), Infinity);
    setNow(t0);
    if (!Number.isFinite(next)) return undefined;
    const t = window.setTimeout(() => setNow(Date.now()), next - t0 + 40);
    return () => window.clearTimeout(t);
  }, [data.posts]);

  const notify = useCallback((message: string, kind: 'success' | 'error' = 'success') => setToast({ id: Date.now(), message, kind }), []);

  const store = useMemo<Store>(() => {
    const actor = (): string => (data.role === 'creator' ? data.creators.find((c) => c.id === data.actingCreatorId)?.name ?? 'Creator' : CURRENT_USER);
    const event = (campaignId: string, message: string) => ({
      id: crypto.randomUUID(), campaignId, actor: actor(), message, timestamp: new Date().toISOString(),
    });
    const patchCampaign = (prev: Persisted, id: string, patch: Partial<Campaign>, message?: string): Persisted => ({
      ...prev,
      campaigns: prev.campaigns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      activity: message ? [event(id, message), ...prev.activity] : prev.activity,
    });
    const find = (id: string) => data.campaigns.find((c) => c.id === id);
    const creatorById = (id: string) => data.creators.find((c) => c.id === id);
    const programmeById = (id: string) => data.programmes.find((p) => p.id === id);
    const patchPost = (prev: Persisted, id: string, patch: Partial<Post>): Persisted => ({ ...prev, posts: prev.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
    const acting = data.creators.find((c) => c.id === data.actingCreatorId) ?? data.creators[0];

    /** Mark a post as published and start the (simulated) collection of its public numbers. */
    const publishPost = (prev: Persisted, postId: string, url: string, stagger = 0): Persisted => {
      const post = prev.posts.find((p) => p.id === postId);
      if (!post) return prev;
      const creator = prev.creators.find((c) => c.id === post.creatorId);
      if (!creator) return prev;
      const r = rngFor(`publish:${postId}:${url}`);
      const daysLive = 2 + Math.floor(r() * 4);
      const postedAt = addDays(-daysLive);
      const snaps = simulateSnapshots(`snap:${postId}:${url}`, post.expectedViews, post.factor, creator.engagementRate, daysLive);
      const next = patchPost(prev, postId, { url: url.trim(), postedAt, snapshots: snaps, lastRefreshed: new Date().toISOString(), fetchingUntil: Date.now() + 1700 + stagger });
      const col = next.campaigns.find((c) => c.id === post.collaborationId);
      if (!col || post.type === 'Story') return next;
      let out = patchCampaign(next, col.id, { publicationUrl: url.trim(), closeout: { ...col.closeout, urlRecorded: true } }, `Publication link added: ${url.trim().replace(/^https?:\/\/(www\.)?/, '')}`);
      const cur = out.campaigns.find((c) => c.id === col.id)!;
      if (cur.status === 'Approved' && transitionBlockers(cur, 'Published').length === 0) out = patchCampaign(out, col.id, { status: 'Published' }, 'Status changed from Approved to Published');
      return out;
    };

    const newCollab = (prev: Persisted, app: Application): { next: Persisted; collabId: string } => {
      const programme = prev.programmes.find((p) => p.id === app.programmeId);
      const creator = prev.creators.find((c) => c.id === app.creatorId);
      if (!programme || !creator) return { next: prev, collabId: '' };
      const exists = prev.campaigns.find((c) => c.programmeId === programme.id && c.creatorId === creator.id);
      if (exists) return { next: prev, collabId: exists.id };
      const n = Math.max(100, ...prev.campaigns.map((c) => Number(c.issueKey.replace('CMP-', '')) || 0)) + 1;
      const { campaign, posts } = makeCollaboration({ programme, creator, fee: app.fee, number: n, owner: CURRENT_USER });
      const tn = Math.max(0, ...prev.tasks.map((t) => Number(t.key.replace('TSK-', '')) || 0));
      const mk = (i: number, title: string, assignee: string, due: string, pr: Priority): Task => ({
        id: `t${Date.now()}${i}`, key: `TSK-${tn + i}`, campaignId: campaign.id, title, assignee, dueDate: due, priority: pr, status: 'To Do', completed: false,
      });
      const newTasks = [
        mk(1, 'Share brief and product kit', CURRENT_USER, addDays(2), 'Medium'),
        mk(2, 'Send discount code and tracking link', CURRENT_USER, addDays(3), 'Medium'),
      ];
      return {
        collabId: campaign.id,
        next: {
          ...prev, campaigns: [campaign, ...prev.campaigns], posts: [...prev.posts, ...posts], tasks: [...newTasks, ...prev.tasks],
          activity: [{ id: crypto.randomUUID(), campaignId: campaign.id, actor: actor(), message: `Collaboration created at ${fmtINR(app.fee)}`, timestamp: new Date().toISOString() }, ...prev.activity],
        },
      };
    };

    return {
      workspaceName: data.workspaceName,
      campaigns: data.campaigns,
      tasks: data.tasks,
      activity: data.activity,
      storageError,
      writesBlocked,
      startFresh: () => { setWritesBlocked(false); setStorageError(null); notify('Started a fresh workspace from sample data'); },
      resetSample: () => { setData((p) => ({ ...buildSeed(), signedIn: p.signedIn, role: p.role })); notify('Workspace reset to sample data'); },
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
        setData((p) => ({ ...p, campaigns: [campaign, ...p.campaigns], activity: [event(id, 'Collaboration created'), ...p.activity] }));
        notify(`CMP-${n} created`);
        return id;
      },
      updateCampaign: (id, patch, message) => {
        setData((p) => patchCampaign(p, id, patch, message));
        if (message) notify(message);
      },
      transitionStatus: (id, to) => {
        const c = find(id);
        if (!c) return ['Collaboration not found.'];
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

      /* ------------------------- marketplace and performance ------------------------- */

      signedIn: data.signedIn,
      signIn: (r) => setData((p) => ({ ...p, signedIn: true, role: r })),
      signOut: () => setData((p) => ({ ...p, signedIn: false })),
      role: data.role,
      setRole: (r) => setData((p) => ({ ...p, role: r })),
      now,
      actingCreatorId: data.actingCreatorId,
      actingCreator: acting,
      creators: data.creators,
      programmes: data.programmes,
      brandProgrammes: data.programmes.filter((p) => p.brand === data.workspaceName),
      applications: data.applications,
      posts: data.posts,
      shortlist: data.shortlist,
      integrations: data.integrations,
      creatorById,
      programmeById,
      gridRows: (programmeId) => buildGridRows(programmeId, { campaigns: data.campaigns, posts: data.posts, creators: data.creators, integrations: data.integrations }, now),

      toggleShortlist: (creatorId) => {
        const on = data.shortlist.includes(creatorId);
        setData((p) => ({ ...p, shortlist: on ? p.shortlist.filter((x) => x !== creatorId) : [...p.shortlist, creatorId] }));
        notify(on ? 'Removed from shortlist' : 'Added to shortlist');
      },
      updateCreator: (id, patch, message) => {
        setData((p) => ({ ...p, creators: p.creators.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
        if (message) notify(message);
      },
      connectCreatorInstagram: (creatorId) => {
        setData((p) => {
          const creator = p.creators.find((c) => c.id === creatorId);
          if (!creator) return p;
          const updated = { ...creator, instagramConnected: true };
          return {
            ...p,
            creators: p.creators.map((c) => (c.id === creatorId ? updated : c)),
            posts: p.posts.map((post) => {
              const live = post.type === 'Story' ? !!post.postedAt : !!post.url;
              return post.creatorId === creatorId && live && !post.insights ? { ...post, insights: insightsFromConnection(post, updated, 'creator-connected'), insightRequested: false } : post;
            }),
          };
        });
        notify('Instagram connected. Reach, saves and shares now flow in automatically.');
      },
      setIntegration: (key, on) => {
        setData((p) => {
          const integrations = { ...p.integrations, [key]: on };
          if (key !== 'instagram') return { ...p, integrations };
          return {
            ...p, integrations,
            posts: p.posts.map((post) => {
              const live = post.type === 'Story' ? !!post.postedAt : !!post.url;
              const creator = p.creators.find((c) => c.id === post.creatorId);
              if (on && post.isCollab && live && !post.insights && creator) return { ...post, insights: insightsFromConnection(post, creator, 'brand-connected') };
              if (!on && post.insights?.source === 'brand-connected') return { ...post, insights: undefined };
              return post;
            }),
          };
        });
        notify(key === 'shopify' ? (on ? 'Shopify connected (sample data)' : 'Shopify disconnected') : on ? 'Instagram connected. Reach now shows for collab posts.' : 'Instagram disconnected');
      },

      createProgramme: (i) => {
        const id = `p${Date.now()}`;
        const programme: Programme = {
          id, brand: data.workspaceName, status: 'Draft', cities: [], codePrefix: i.name.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'CODE',
          createdAt: todayISO(), ...i,
        };
        setData((p) => ({ ...p, programmes: [programme, ...p.programmes] }));
        notify(`${i.name} created as a draft`);
        return id;
      },
      updateProgramme: (id, patch, message) => {
        setData((p) => ({ ...p, programmes: p.programmes.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
        if (message) notify(message);
      },
      setProgrammeStatus: (id, status) => {
        setData((p) => ({ ...p, programmes: p.programmes.map((x) => (x.id === id ? { ...x, status } : x)) }));
        notify(status === 'Open call' ? 'Published to the marketplace. Creators can now apply.' : `Campaign marked ${status.toLowerCase()}`);
      },

      applyToProgramme: (i) => {
        setData((p) => {
          const existing = p.applications.find((a) => a.programmeId === i.programmeId && a.creatorId === i.creatorId && !['Declined', 'Rejected'].includes(a.status));
          const note = { at: new Date().toISOString(), by: 'creator' as const, text: i.message };
          if (existing) return { ...p, applications: p.applications.map((a) => (a.id === existing.id ? { ...a, fee: i.fee, message: i.message, updatedAt: note.at, notes: [...a.notes, note] } : a)) };
          const app: Application = {
            id: `app-${crypto.randomUUID()}`, programmeId: i.programmeId, creatorId: i.creatorId, origin: 'creator', status: 'Applied', fee: i.fee,
            lastMoveBy: 'creator', message: i.message, updatedAt: note.at, notes: [note],
          };
          return { ...p, applications: [app, ...p.applications] };
        });
        notify('Application sent');
      },
      inviteCreator: (i) => {
        setData((p) => {
          const existing = p.applications.find((a) => a.programmeId === i.programmeId && a.creatorId === i.creatorId && !['Declined', 'Rejected'].includes(a.status));
          const note = { at: new Date().toISOString(), by: 'brand' as const, text: i.message };
          if (existing) return p;
          const app: Application = {
            id: `app-${crypto.randomUUID()}`, programmeId: i.programmeId, creatorId: i.creatorId, origin: 'brand', status: 'Invited', fee: i.fee,
            lastMoveBy: 'brand', message: i.message, updatedAt: note.at, notes: [note],
          };
          return { ...p, applications: [app, ...p.applications] };
        });
        const already = data.applications.some((a) => a.programmeId === i.programmeId && a.creatorId === i.creatorId && !['Declined', 'Rejected'].includes(a.status));
        notify(already ? 'This creator is already in the pipeline for that programme.' : 'Invitation sent', already ? 'error' : 'success');
      },
      respondApplication: (appId, action, by, opts) => {
        const app = data.applications.find((a) => a.id === appId);
        if (!app) return;
        const at = new Date().toISOString();
        const fee = opts?.fee ?? app.fee;
        const noteText = opts?.note ?? ({ shortlist: 'Shortlisted', reject: 'Not moving forward', accept: `Accepted at ${fmtINR(fee)}`, decline: 'Declined the invitation', counter: `Countered at ${fmtINR(fee)}` } as const)[action];
        const status = ({ shortlist: 'Shortlisted', reject: 'Rejected', accept: 'Accepted', decline: 'Declined', counter: 'Negotiating' } as const)[action];
        setData((p) => {
          let next: Persisted = {
            ...p,
            applications: p.applications.map((a) => (a.id === appId
              ? { ...a, status, fee, lastMoveBy: by, updatedAt: at, notes: [...a.notes, { at, by, text: noteText }] } : a)),
          };
          if (action === 'accept') {
            const updated = next.applications.find((a) => a.id === appId)!;
            const prog = next.programmes.find((x) => x.id === updated.programmeId);
            if (prog && prog.brand === next.workspaceName) {
              const made = newCollab(next, updated);
              next = { ...made.next, applications: made.next.applications.map((a) => (a.id === appId ? { ...a, collaborationId: made.collabId } : a)) };
            }
          }
          return next;
        });
        const who = creatorById(app.creatorId)?.name.split(' ')[0] ?? 'Creator';
        notify(({
          shortlist: `${who} shortlisted`, reject: `${who} declined from the pipeline`, accept: by === 'brand' ? `${who} accepted. Collaboration created.` : 'Accepted. The brand will share the brief and kit.',
          decline: 'Invitation declined', counter: by === 'brand' ? `Counter-offer sent to ${who}` : 'Counter-offer sent',
        } as const)[action]);
      },

      addPostLink: (postId, url) => {
        setData((p) => publishPost(p, postId, url));
        notify('Link added. Collecting public numbers (sample data).');
      },
      bulkAddLinks: (rows) => {
        setData((p) => rows.reduce((acc, r, i) => publishPost(acc, r.postId, r.url, i * 160), p));
        notify(`${rows.length} link${rows.length === 1 ? '' : 's'} added. Collecting public numbers (sample data).`);
      },
      removePostLink: (postId) => {
        setData((p) => patchPost(p, postId, { url: '', postedAt: '', snapshots: [], lastRefreshed: '', fetchingUntil: 0, insights: undefined }));
        notify('Link removed');
      },
      markStoryPosted: (postId) => {
        setData((p) => patchPost(p, postId, { postedAt: todayISO() }));
        notify('Story marked as posted');
      },
      refreshProgramme: (programmeId) => {
        setData((p) => ({
          ...p,
          posts: p.posts.map((post) => (post.programmeId === programmeId && post.url
            ? { ...post, snapshots: bumpSnapshots(post.snapshots, post.id), lastRefreshed: new Date().toISOString() } : post)),
        }));
        notify('Public numbers refreshed (sample data)');
      },
      requestInsights: (postId) => {
        const post = data.posts.find((x) => x.id === postId);
        setData((p) => {
          const next = patchPost(p, postId, { insightRequested: true });
          const col = post && p.campaigns.find((c) => c.id === post.collaborationId);
          return col ? { ...next, activity: [event(col.id, `Insights requested for ${post!.type}`), ...next.activity] } : next;
        });
        notify('Request sent to the creator');
      },
      confirmInsights: (postId, v) => {
        const post = data.posts.find((x) => x.id === postId);
        const insights: PostInsights = { ...v, source: 'creator-screenshot', at: new Date().toISOString() };
        setData((p) => {
          const next = patchPost(p, postId, { insights, insightRequested: false });
          const col = post && p.campaigns.find((c) => c.id === post.collaborationId);
          return col ? { ...next, activity: [event(col.id, `Insights confirmed for ${post!.type} from a screenshot`), ...next.activity] } : next;
        });
        notify('Numbers confirmed. They now show as creator-confirmed.');
      },
      setPostCollab: (postId, isCollab) => {
        setData((p) => {
          const post = p.posts.find((x) => x.id === postId);
          const creator = post && p.creators.find((c) => c.id === post.creatorId);
          let next = patchPost(p, postId, { isCollab });
          if (post && creator && p.integrations.instagram) {
            const live = post.type === 'Story' ? !!post.postedAt : !!post.url;
            if (isCollab && live && !post.insights) next = patchPost(next, postId, { insights: insightsFromConnection(post, creator, 'brand-connected') });
            if (!isCollab && post.insights?.source === 'brand-connected') next = patchPost(next, postId, { insights: undefined });
          }
          return next;
        });
        notify(isCollab ? 'Marked as an Instagram Collab post' : 'Collab flag removed');
      },
    };
  }, [data, storageError, writesBlocked, search, toast, dialog, notify, now]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
