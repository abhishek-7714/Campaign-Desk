import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Check, Copy, ExternalLink, Lock } from 'lucide-react';
import { SourceBadge } from '@/components/shared';
import { shortDate } from '@/domain/format';
import { parseInstagramLink, type GridRow } from '@/domain/performance';
import { fmtFull, fmtINR, fmtNum } from '@/domain/money';
import { useStore } from '@/state/store';
import { copyText, isHttp, normUrl, snapshotSeries } from './model';

/* ------------------------------ small pieces ------------------------------ */

export function StatusChip({ row }: { row: GridRow }) {
  const planned = row.primary?.plannedDate ? shortDate(row.primary.plannedDate) : '';
  switch (row.status) {
    case 'Live': return <span className="pill t-green"><i />Live</span>;
    case 'Fetching': return <span className="dt-skel" style={{ width: 70 }} role="status" aria-label="Fetching public numbers" />;
    case 'Planned': return <span className="pill t-neutral">Planned{planned && ` · ${planned}`}</span>;
    case 'Late': return <span className="pill t-coral"><i />Late{planned && ` · was due ${planned}`}</span>;
    default: return <span className="pill pf-missed"><i />Missed{planned && ` · was due ${planned}`}</span>;
  }
}

export function FeeCell({ row }: { row: GridRow }) {
  if (/^barter/i.test(row.collab.agreement.fee.trim())) return <span className="muted-cell" title={row.collab.agreement.fee}>Barter</span>;
  if (!row.fee) return <span className="muted-cell">To be agreed</span>;
  return <>{fmtINR(row.fee)}</>;
}

/** Tiny line of a post's daily views. Plain SVG: cheap enough for every row. */
export function Sparkline({ row, w = 56, h = 18 }: { row: GridRow; w?: number; h?: number }) {
  const pts = snapshotSeries(row.primary).map((p) => p.views);
  if (pts.length < 2) return null;
  const max = Math.max(...pts, 1);
  const d = pts.map((v, i) => `${((i / (pts.length - 1)) * (w - 2) + 1).toFixed(1)},${(h - 1 - (v / max) * (h - 3)).toFixed(1)}`).join(' ');
  return (
    <svg className="pf-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function LockChip({ title = 'Private to the creator until unlocked' }: { title?: string }) {
  return <span className="pf-lock" title={title}><Lock size={11} />Locked</span>;
}

export function Shimmer({ w = 48 }: { w?: number }) {
  return <span className="dt-skel" style={{ width: w }} aria-hidden="true" />;
}

/** Copy button with a short "copied" confirmation that does not depend on the app toast. */
export function CopyButton({ text, label, children, onCopied, className = '' }: { text: string; label: string; children?: ReactNode; onCopied?: () => void; className?: string }) {
  const [done, setDone] = useState(false);
  const t = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(t.current), []);
  const click = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(await copyText(text))) return;
    setDone(true);
    onCopied?.();
    window.clearTimeout(t.current);
    t.current = window.setTimeout(() => setDone(false), 1400);
  };
  return (
    <button type="button" className={`pf-copy ${done ? 'done' : ''} ${className}`} onClick={click} aria-label={label} title={label}>
      {children}{done ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

export function PostLinkIcon({ row }: { row: GridRow }) {
  const url = row.primary?.url ?? '';
  if (!url || !isHttp(url)) return <span className="muted-cell">-</span>;
  return (
    <a className="pf-ext" href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${row.creator.name}'s post on Instagram (new tab)`} title="Open on Instagram">
      <ExternalLink size={15} />
    </a>
  );
}

/* --------------------------------- add link --------------------------------- */

/** Paste one link for one post. Validates the link kind and rejects Stories and duplicates. */
export function AddLinkInline({ postId, label, onDone }: { postId: string; label: string; onDone?: () => void }) {
  const { addPostLink, posts } = useStore();
  const [v, setV] = useState('');
  const [err, setErr] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = v.trim();
    if (!url) { setErr('Paste a Reel or Post link.'); return; }
    const k = parseInstagramLink(url).kind;
    if (k === 'Story') { setErr('Stories cannot be linked. Ask for a screenshot instead.'); return; }
    if (k === null) { setErr('That is not an Instagram Reel or Post link.'); return; }
    const dup = posts.find((p) => p.url && p.id !== postId && normUrl(p.url) === normUrl(url));
    if (dup) { setErr('This link is already added to another collaboration.'); return; }
    addPostLink(postId, /^https?:\/\//i.test(url) ? url : `https://${url}`);
    setV(''); setErr('');
    onDone?.();
  };
  return (
    <form className="pf-addlink" onSubmit={submit} onClick={(e) => e.stopPropagation()} noValidate>
      <div className="pf-addlink-row">
        <input value={v} onChange={(e) => { setV(e.target.value); setErr(''); }} placeholder="Paste Reel link" aria-label={label} aria-invalid={!!err} />
        <button type="submit" className="btn small">Add link</button>
      </div>
      {err && <small className="pf-err" role="alert">{err}</small>}
    </form>
  );
}

/* ----------------------------- private numbers ----------------------------- */

export function PrivateCell({ row, field, showUnlock, onUnlock }: { row: GridRow; field: 'reach' | 'saves' | 'shares'; showUnlock: boolean; onUnlock?: () => void }) {
  if (row.status === 'Fetching') return <Shimmer />;
  if (row.status !== 'Live') return <span className="muted-cell">-</span>;
  const v = row[field];
  if (v === null || row.locked) {
    return (
      <span className="cell-flex pf-end">
        <LockChip />
        {showUnlock && onUnlock && <button type="button" className="link-btn" onClick={(e) => { e.stopPropagation(); onUnlock(); }} aria-label={`Unlock reach, saves and shares for ${row.creator.name}`}>Unlock</button>}
      </span>
    );
  }
  return (
    <span className="cell-flex pf-end">
      <span title={fmtFull(v)}>{fmtNum(v)}</span>
      {row.insightSource && <SourceBadge source={row.insightSource} compact />}
    </span>
  );
}

/* --------------------------------- stories --------------------------------- */

export function StoriesChip({ row }: { row: GridRow }) {
  const s = row.stories;
  if (!s.length) return <span className="muted-cell">-</span>;
  const awaiting = s.filter((x) => x.awaitingScreenshot).length;
  const confirmed = s.filter((x) => x.confirmed).length;
  const posted = s.filter((x) => x.status === 'Live').length;
  if (!posted) return <span className="pill t-neutral">Not posted</span>;
  return (
    <span className="cell-flex">
      {awaiting > 0 && <span className="pill t-yellow"><i />{awaiting === posted ? `${awaiting} posted, awaiting screenshot` : `${awaiting} awaiting screenshot`}</span>}
      {confirmed > 0 && <span className="pill t-green"><i />{confirmed} confirmed</span>}
    </span>
  );
}
