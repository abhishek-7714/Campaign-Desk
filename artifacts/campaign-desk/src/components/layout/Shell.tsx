import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Activity, AlertTriangle, Bell, BriefcaseBusiness, ChevronRight, FileCheck2, LayoutGrid, ListTodo, Plus, Search, Settings } from 'lucide-react';
import { useStore } from '@/state/store';
import { CURRENT_USER } from '@/domain/helpers';
import { Avatar, Badge } from '@/components/ui-bits';
import { CampaignDialog, TaskDialog } from './Dialogs';

const NAV = [
  { href: '/', label: 'Campaigns', icon: BriefcaseBusiness },
  { href: '/my-work', label: 'My work', icon: ListTodo },
  { href: '/board', label: 'Board', icon: LayoutGrid },
  { href: '/agreements', label: 'Agreements', icon: FileCheck2 },
  { href: '/reports', label: 'Reports', icon: Activity },
  { href: '/settings', label: 'Workspace settings', icon: Settings },
];

function useCrumbs(): { label: string; href?: string }[] {
  const [loc] = useLocation();
  const { campaignById } = useStore();
  const m = loc.match(/^\/campaigns\/([^/]+)/);
  if (m) return [{ label: 'Campaigns', href: '/' }, { label: campaignById(m[1])?.issueKey ?? 'Not found' }];
  const item = NAV.find((n) => n.href === loc);
  return [{ label: item?.label ?? 'Not found' }];
}

function SearchBox() {
  const { search, setSearch, campaigns, tasks } = useStore();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const q = search.trim().toLowerCase();
  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const cs = q ? campaigns.filter((c) => `${c.issueKey} ${c.title} ${c.creator} ${c.owner} ${c.brand}`.toLowerCase().includes(q)).slice(0, 5) : [];
  const ts = q ? tasks.filter((t) => `${t.key} ${t.title} ${t.assignee}`.toLowerCase().includes(q)).slice(0, 6) : [];
  return (
    <div className="top-search" ref={wrap}>
      <Search aria-hidden="true" />
      <input data-testid="input-global-search" type="search" value={search} aria-label="Search campaigns and tasks"
        onChange={(e) => { setSearch(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); (e.target as HTMLInputElement).blur(); } }}
        placeholder="Search campaigns and tasks" />
      {open && q && (
        <div className="search-results" role="listbox" aria-label="Search results">
          <div className="sr-head">Campaigns ({cs.length})</div>
          {cs.map((c) => <Link key={c.id} href={`/campaigns/${c.id}`} className="sr-item" onClick={() => setOpen(false)}><span className="issue-key">{c.issueKey}</span><span>{c.title}</span><Badge value={c.status} /></Link>)}
          <div className="sr-head">Tasks ({ts.length})</div>
          {ts.map((t) => <Link key={t.id} href={`/campaigns/${t.campaignId}?tab=tasks`} className="sr-item" onClick={() => setOpen(false)}><span className="issue-key">{t.key}</span><span>{t.title}</span><Badge value={t.status} /></Link>)}
          {!cs.length && !ts.length && <div className="sr-empty">No matches. Lists on this page are filtered by the same query.</div>}
        </div>
      )}
    </div>
  );
}

function CreateMenu() {
  const { openDialog } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [open]);
  return (
    <div className="menu-wrap" ref={ref}>
      <button className="button primary" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} data-testid="button-create"><Plus />Create</button>
      {open && (
        <div className="menu" role="menu">
          <button role="menuitem" onClick={() => { setOpen(false); openDialog({ type: 'campaign' }); }} data-testid="menu-create-campaign">Campaign</button>
          <button role="menuitem" onClick={() => { setOpen(false); openDialog({ type: 'task' }); }} data-testid="menu-create-task">Task</button>
        </div>
      )}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const { workspaceName, dialog, openDialog, toast, storageError, writesBlocked, startFresh, notify } = useStore();
  const crumbs = useCrumbs();
  const close = () => openDialog(null);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/"><span className="brand-mark">CD</span>Campaign Desk</Link>
        <div className="workspace-label"><label htmlFor="ws-switch">Workspace</label></div>
        <div className="ws-switch-wrap">
          <select id="ws-switch" className="ws-switch" aria-label="Workspace" value="main" onChange={() => undefined}>
            <option value="main">{workspaceName}</option>
          </select>
        </div>
        <nav className="nav-list" aria-label="Primary">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.href === '/' ? loc === '/' || loc.startsWith('/campaigns') : loc === item.href;
            return <Link key={item.href} href={item.href} className={`nav-link ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}><Icon />{item.label}</Link>;
          })}
        </nav>
        <div className="side-footer"><Avatar name={CURRENT_USER} /><span>{CURRENT_USER}</span></div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <nav className="crumbs" aria-label="Breadcrumb">
            <span>{workspaceName}</span>
            {crumbs.map((c) => (
              <span className="crumb" key={c.label}><ChevronRight size={12} />{c.href ? <Link href={c.href}>{c.label}</Link> : <strong>{c.label}</strong>}</span>
            ))}
          </nav>
          <SearchBox />
          <div className="top-right">
            <CreateMenu />
            <button className="button ghost icon-btn" aria-label="Notifications" onClick={() => notify('No notifications. Campaign Desk does not send notifications in this prototype.')}><Bell /></button>
            <Avatar name={CURRENT_USER} />
            <span className="user-name">{CURRENT_USER}</span>
          </div>
        </header>
        {storageError && (
          <div className="banner" role="alert">
            <AlertTriangle size={15} /><span>{storageError}</span>
            {writesBlocked && <button className="button" onClick={startFresh}>Start fresh and overwrite</button>}
          </div>
        )}
        <main className="content">{children}</main>
      </div>
      {dialog?.type === 'campaign' && <CampaignDialog onClose={close} />}
      {dialog?.type === 'task' && <TaskDialog campaignId={dialog.campaignId} task={dialog.task} onClose={close} />}
      {toast && <div className={`toast ${toast.kind}`} role="status" aria-live="polite">{toast.message}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="page-heading">
      <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      {actions && <div className="detail-actions">{actions}</div>}
    </div>
  );
}
