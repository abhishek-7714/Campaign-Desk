import { useId, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui-bits';
import { CreatorAvatar } from '@/components/shared';
import { parseInstagramLink, shortLink, type GridRow } from '@/domain/performance';
import { useStore } from '@/state/store';
import { normUrl } from './model';

const EXAMPLE = '@priya.fit https://www.instagram.com/reel/C9xk2AbQ1/\nhttps://www.instagram.com/rohan.eats/reel/C9xk3Dd88/\nhttps://www.instagram.com/p/C9xk4Ee99/';

interface Parsed {
  i: number;
  raw: string;
  url: string;
  kind: 'Reel' | 'Post' | null;
  /** Collaboration id chosen for this line. */
  pick: string;
  auto: boolean;
  error: string;
}

export default function AddLinksDialog({ rows, onClose }: { rows: GridRow[]; onClose: () => void }) {
  const { bulkAddLinks, posts } = useStore();
  const [text, setText] = useState('');
  const [picks, setPicks] = useState<Record<number, string>>({});
  const [tried, setTried] = useState(false);
  const taId = useId();

  const open = useMemo(() => rows.filter((r) => r.primary && !r.primary.url), [rows]);
  const byHandle = useMemo(() => new Map(rows.map((r) => [r.creator.handle.toLowerCase(), r])), [rows]);

  const parsed = useMemo<Parsed[]>(() => {
    const lines = text.split('\n').map((l, i) => ({ l: l.trim(), i })).filter((x) => x.l);
    const base = lines.map(({ l, i }) => {
      const toks = l.split(/\s+/);
      const handleTok = toks.find((t) => t.startsWith('@'))?.slice(1).toLowerCase();
      const urlTok = toks.find((t) => !t.startsWith('@')) ?? '';
      const info = parseInstagramLink(urlTok);
      const hint = handleTok ?? info.handle?.toLowerCase();
      const matched = hint ? byHandle.get(hint) : undefined;
      return { i, raw: l, url: /^https?:\/\//i.test(urlTok) ? urlTok : `https://${urlTok}`, info, matched, urlTok };
    });
    // Creators already claimed by a handle or a manual pick are not offered to unmatched lines.
    const claimed = new Set<string>();
    base.forEach((b) => { const m = picks[b.i] !== undefined ? picks[b.i] : b.matched?.collab.id; if (m) claimed.add(m); });
    const free = open.filter((r) => !claimed.has(r.collab.id));
    const seen = new Set<string>();
    const usedCreators = new Set<string>();
    return base.map((b) => {
      let error = '';
      const kind = b.info.kind === 'Reel' || b.info.kind === 'Post' ? b.info.kind : null;
      const manual = picks[b.i];
      let pick = manual !== undefined ? manual : b.matched?.collab.id ?? '';
      let auto = false;
      if (manual === undefined && !b.matched && kind) { const nx = free.shift(); if (nx) { pick = nx.collab.id; auto = true; } }
      const target = rows.find((r) => r.collab.id === pick);
      const key = normUrl(b.urlTok);
      if (b.info.kind === 'Story') error = 'Story links are not supported. Stories need a screenshot from the creator.';
      else if (!kind) error = 'Not an Instagram Reel or Post link.';
      else if (seen.has(key)) error = 'Duplicate link in this list.';
      else if (posts.some((p) => p.url && normUrl(p.url) === key)) error = 'This link is already added to a collaboration.';
      else if (!pick) error = 'Choose a creator for this link.';
      else if (target && !open.some((r) => r.collab.id === target.collab.id)) error = `${target.creator.name} already has a link. Remove it first to replace it.`;
      else if (usedCreators.has(pick)) error = 'Another line already uses this creator.';
      seen.add(key);
      if (!error && pick) usedCreators.add(pick);
      return { i: b.i, raw: b.raw, url: b.url, kind, pick, auto, error };
    });
  }, [text, picks, open, byHandle, rows, posts]);

  const good = parsed.filter((p) => !p.error && p.pick);
  const submit = () => {
    if (!good.length) { setTried(true); return; }
    bulkAddLinks(good.map((g) => ({ postId: rows.find((r) => r.collab.id === g.pick)!.primary!.id, url: g.url })));
    onClose();
  };

  return (
    <Modal title="Add post links" onClose={onClose} onSubmit={submit} submitLabel={`Add ${good.length} link${good.length === 1 ? '' : 's'}`}>
      <div className="pf-al">
        <label htmlFor={taId} className="pf-al-label">One link per line. Start a line with @handle to match a creator.</label>
        <textarea id={taId} value={text} onChange={(e) => { setText(e.target.value); setTried(false); }} placeholder={EXAMPLE} rows={5} spellCheck={false} />
        <p className="pf-al-note">Reels and posts only. Stories cannot be linked: they disappear after 24 hours and their numbers are private, so ask the creator for a screenshot instead.</p>
        {open.length === 0 && <p className="pf-err">Every creator in this campaign already has a link.</p>}
        {parsed.length > 0 && (
          <ul className="pf-al-list" aria-label="Link preview">
            {parsed.map((p) => {
              const r = rows.find((x) => x.collab.id === p.pick);
              return (
                <li key={p.i} className={p.error ? 'bad' : 'ok'}>
                  {p.error ? <AlertCircle size={16} aria-label="Problem" /> : <CheckCircle2 size={16} aria-label="Ready" />}
                  <div className="pf-al-main">
                    <span className="pf-al-url"><span className={`pill ${p.kind ? 't-blue' : 't-coral'}`}>{p.kind ?? 'Unknown'}</span><code title={p.url}>{shortLink(p.url) || p.raw}</code></span>
                    {p.error ? <small className="pf-err">{p.error}</small> : r && !p.auto && picks[p.i] === undefined ? <span className="pf-al-who"><CreatorAvatar creator={r.creator} size={20} />{r.creator.name} <small className="muted">matched by handle</small></span> : null}
                  </div>
                  {p.kind && (
                    <select aria-label={`Creator for link ${p.i + 1}`} value={p.pick} onChange={(e) => setPicks((s) => ({ ...s, [p.i]: e.target.value }))}>
                      <option value="">Choose creator…</option>
                      {rows.filter((x) => open.some((o) => o.collab.id === x.collab.id) || x.collab.id === p.pick).map((x) => <option key={x.collab.id} value={x.collab.id}>{x.creator.name} (@{x.creator.handle})</option>)}
                    </select>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {tried && !good.length && <p className="pf-err" role="alert">Nothing to add yet. Paste at least one valid Reel or Post link.</p>}
      </div>
    </Modal>
  );
}
