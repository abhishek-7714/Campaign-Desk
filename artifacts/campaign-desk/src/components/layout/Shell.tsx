import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Activity, AlertTriangle, Bell, BriefcaseBusiness, ChevronRight, ChevronsUpDown, FileCheck2, Home, Inbox, LayoutGrid, ListTodo, Megaphone, Plus, Search, Settings, Store, UserRound,
} from 'lucide-react';
import { useStore } from '@/state/store';
import { CURRENT_USER } from '@/domain/helpers';
import { FEEDBACK_URL } from '@/domain/config';
import type { Role } from '@/domain/types';
import { Avatar, Badge } from '@/components/ui-bits';
import { CreatorAvatar } from '@/components/shared';
import { Logo } from '@/components/Logo';
import { CampaignDialog, TaskDialog } from './Dialogs';

const BRAND_NAV = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/programmes', label: 'Campaigns', icon: Megaphone },
  { href: '/marketplace', label: 'Marketplace', icon: Store },
  { href: '/campaigns', label: 'Collaborations', icon: BriefcaseBusiness },
  { href: '/my-work', label: 'My Work', icon: ListTodo },
  { href: '/board', label: 'Board', icon: LayoutGrid },
  { href: '/agreements', label: 'Agreements', icon: FileCheck2 },
  { href: '/reports', label: 'Reports', icon: Activity },
  { href: '/settings', label: 'Settings', icon: Settings },
];
const CREATOR_NAV = [
  { href: '/creator', label: 'Opportunities', icon: Inbox },
  { href: '/creator/work', label: 'My work', icon: ListTodo },
  { href: '/creator/profile', label: 'My profile', icon: UserRound },
];

function isActive(href: string, loc: string) {
  if (href === '/') return loc === '/';
  if (href === '/creator') return loc === '/creator' || loc.startsWith('/creator/opportunities');
  return loc === href || loc.startsWith(`${href}/`);
}

function useCrumbs(): { label: string; href?: string }[] {
  const [loc] = useLocation();
  const { campaignById, programmeById, creatorById } = useStore();
  let m = loc.match(/^\/campaigns\/([^/]+)/);
  if (m) return [{ label: 'Collaborations', href: '/campaigns' }, { label: campaignById(m[1])?.issueKey ?? 'Not found' }];
  m = loc.match(/^\/programmes\/([^/]+)/);
  if (m) return [{ label: 'Campaigns', href: '/programmes' }, { label: programmeById(m[1])?.name ?? 'Not found' }];
  if (loc === '/marketplace/compare') return [{ label: 'Marketplace', href: '/marketplace' }, { label: 'Compare' }];
  m = loc.match(/^\/marketplace\/([^/]+)/);
  if (m) return [{ label: 'Marketplace', href: '/marketplace' }, { label: creatorById(m[1])?.name ?? 'Not found' }];
  m = loc.match(/^\/creator\/opportunities\/([^/]+)/);
  if (m) return [{ label: 'Opportunities', href: '/creator' }, { label: programmeById(m[1])?.name ?? 'Not found' }];
  const item = [...BRAND_NAV, ...CREATOR_NAV].find((n) => n.href === loc);
  return [{ label: item?.label ?? 'Not found' }];
}

function SearchBox() {
  const { search, setSearch, campaigns, tasks, creators, brandProgrammes, role } = useStore();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const q = search.trim().toLowerCase();
  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  if (role === 'creator') return <div className="top-search" />;
  const cs = q ? campaigns.filter((c) => `${c.issueKey} ${c.title} ${c.creator} ${c.owner} ${c.brand}`.toLowerCase().includes(q)).slice(0, 4) : [];
  const ts = q ? tasks.filter((t) => `${t.key} ${t.title} ${t.assignee}`.toLowerCase().includes(q)).slice(0, 4) : [];
  const ps = q ? brandProgrammes.filter((p) => `${p.name} ${p.product}`.toLowerCase().includes(q)).slice(0, 3) : [];
  const cr = q ? creators.filter((c) => `${c.name} ${c.handle} ${c.city} ${c.niches.join(' ')}`.toLowerCase().includes(q)).slice(0, 5) : [];
  const none = !cs.length && !ts.length && !ps.length && !cr.length;
  return (
    <div className="top-search" ref={wrap}>
      <Search aria-hidden="true" />
      <input data-testid="input-global-search" type="search" value={search} aria-label="Search campaigns, creators and tasks"
        onChange={(e) => { setSearch(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); (e.target as HTMLInputElement).blur(); } }}
        placeholder="Search campaigns, creators and tasks" />
      {open && q && (
        <div className="search-results" role="listbox" aria-label="Search results">
          {ps.length > 0 && <div className="sr-head">Campaigns ({ps.length})</div>}
          {ps.map((p) => <Link key={p.id} href={`/programmes/${p.id}`} className="sr-item" onClick={() => setOpen(false)}><span>{p.name}</span><Badge value={p.status} /></Link>)}
          {cr.length > 0 && <div className="sr-head">Creators ({cr.length})</div>}
          {cr.map((c) => <Link key={c.id} href={`/marketplace/${c.id}`} className="sr-item" onClick={() => setOpen(false)}><span className="issue-key">@{c.handle}</span><span>{c.name}</span><Badge value={c.tier} /></Link>)}
          {cs.length > 0 && <div className="sr-head">Collaborations ({cs.length})</div>}
          {cs.map((c) => <Link key={c.id} href={`/campaigns/${c.id}`} className="sr-item" onClick={() => setOpen(false)}><span className="issue-key">{c.issueKey}</span><span>{c.title}</span><Badge value={c.status} /></Link>)}
          {ts.length > 0 && <div className="sr-head">Tasks ({ts.length})</div>}
          {ts.map((t) => <Link key={t.id} href={`/campaigns/${t.campaignId}?tab=tasks`} className="sr-item" onClick={() => setOpen(false)}><span className="issue-key">{t.key}</span><span>{t.title}</span><Badge value={t.status} /></Link>)}
          {none && <div className="sr-empty">No matches. Lists on this page are filtered by the same query.</div>}
        </div>
      )}
    </div>
  );
}

function CreateMenu() {
  const { openDialog } = useStore();
  const [, navigate] = useLocation();
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
      <button className="button primary" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} data-testid="button-create"><Plus />New</button>
      {open && (
        <div className="menu" role="menu">
          <button role="menuitem" onClick={() => { setOpen(false); navigate('/programmes?new=1'); }} data-testid="menu-create-programme">Campaign</button>
          <button role="menuitem" onClick={() => { setOpen(false); openDialog({ type: 'campaign' }); }} data-testid="menu-create-campaign">Collaboration</button>
          <button role="menuitem" onClick={() => { setOpen(false); openDialog({ type: 'task' }); }} data-testid="menu-create-task">Task</button>
        </div>
      )}
    </div>
  );
}

function PrototypeRibbon() {
  const { resetSample } = useStore();
  return (
    <div className="proto-ribbon" role="note">
      <span><b>Prototype.</b> All numbers are sample data. Nothing is collected from Instagram, Shopify or any creator.</span>
      <button onClick={() => { if (window.confirm('Reset the workspace to the original sample data? Your changes will be lost.')) resetSample(); }}>Reset sample data</button>
      {FEEDBACK_URL && <a href={FEEDBACK_URL} target="_blank" rel="noreferrer">Give feedback</a>}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [loc, navigate] = useLocation();
  const { workspaceName, dialog, openDialog, toast, storageError, writesBlocked, startFresh, notify, role, setRole, actingCreator } = useStore();
  const crumbs = useCrumbs();
  const close = () => openDialog(null);
  const nav = role === 'creator' ? CREATOR_NAV : BRAND_NAV;
  const switchRole = (r: Role) => { if (r === role) return; setRole(r); navigate(r === 'creator' ? '/creator' : '/'); };
  const you = role === 'creator' ? actingCreator.name : CURRENT_USER;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href={role === 'creator' ? '/creator' : '/'} aria-label="nano.club home"><Logo /></Link>
        <p className="brand-tag">Small creators. Real numbers.</p>
        <div className="role-switch" role="group" aria-label="View as">
          <button className={role === 'brand' ? 'on' : ''} aria-pressed={role === 'brand'} onClick={() => switchRole('brand')} data-testid="role-brand">Brand</button>
          <button className={role === 'creator' ? 'on' : ''} aria-pressed={role === 'creator'} onClick={() => switchRole('creator')} data-testid="role-creator">Creator</button>
        </div>
        <p className="role-hint">{role === 'brand' ? `Viewing as ${workspaceName}` : `Viewing as @${actingCreator.handle}`}</p>
        {role === 'brand' ? (
          <div className="ws-switch-wrap">
            <span className="ws-mark" aria-hidden="true">{workspaceName.slice(0, 1).toUpperCase()}</span>
            <select id="ws-switch" className="ws-switch" aria-label="Workspace" value="main" onChange={() => undefined}>
              <option value="main">{workspaceName}</option>
            </select>
            <ChevronsUpDown size={14} aria-hidden="true" />
          </div>
        ) : (
          <div className="ws-switch-wrap"><CreatorAvatar creator={actingCreator} size={26} /><span className="ws-switch" style={{ fontWeight: 600 }}>@{actingCreator.handle}</span></div>
        )}
        <nav className="nav-list" aria-label="Primary">
          {nav.filter((n) => n.href !== '/settings').map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, loc);
            return <Link key={item.href} href={item.href} className={`nav-link ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}><Icon />{item.label}</Link>;
          })}
        </nav>
        <div className="side-footer">{role === 'creator' ? <CreatorAvatar creator={actingCreator} size={28} /> : <Avatar name={you} />}<span>{you}</span>
          {role === 'brand' && <Link href="/settings" className={`settings-link ${loc === '/settings' ? 'active' : ''}`} aria-label="Settings" title="Settings"><Settings size={15} /></Link>}</div>
      </aside>
      <div className="main-area">
        <PrototypeRibbon />
        <header className="topbar">
          <nav className="crumbs" aria-label="Breadcrumb">
            <span>{role === 'creator' ? actingCreator.name : workspaceName}</span>
            {crumbs.map((c) => (
              <span className="crumb" key={c.label}><ChevronRight size={12} />{c.href ? <Link href={c.href}>{c.label}</Link> : <strong>{c.label}</strong>}</span>
            ))}
          </nav>
          <SearchBox />
          <div className="top-right">
            {role === 'brand' && <CreateMenu />}
            <button className="button ghost icon-btn" aria-label="Notifications" onClick={() => notify('No notifications. nano.club does not send notifications in this prototype.')}><Bell /></button>
            {role === 'creator' ? <CreatorAvatar creator={actingCreator} size={28} /> : <Avatar name={you} />}
            <span className="user-name">{you}</span>
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
