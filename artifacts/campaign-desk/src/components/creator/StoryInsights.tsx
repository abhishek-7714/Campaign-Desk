import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Link } from 'wouter';
import { Check, ImagePlus, Loader2, Timer } from 'lucide-react';
import type { Creator, Post, PostInsights } from '@/domain/types';
import { readScreenshotMock } from '@/domain/performance';
import { fmtNum } from '@/domain/money';
import { PrototypeNote, SourceBadge } from '@/components/shared';
import { useStore } from '@/state/store';
import '@/styles/creator.css';

/** Confirmed numbers for a post, with where they came from. */
export function InsightNumbers({ insights, story }: { insights: PostInsights; story: boolean }) {
  const items: [string, number | undefined][] = story
    ? [['Views', insights.views], ['Reach', insights.reach], ['Saves', insights.saves], ['Shares', insights.shares], ['Replies', insights.replies]]
    : [['Reach', insights.reach], ['Saves', insights.saves], ['Shares', insights.shares]];
  return (
    <div className="cr-insights">
      <div className="cr-nums">
        {items.filter(([, v]) => v !== undefined).map(([k, v]) => <div key={k}><b>{fmtNum(v as number)}</b><span>{k}</span></div>)}
      </div>
      <SourceBadge source={insights.source} />
    </div>
  );
}

const FIELDS = [['views', 'Views'], ['reach', 'Reach'], ['saves', 'Saves'], ['shares', 'Shares'], ['replies', 'Replies']] as const;
type Key = (typeof FIELDS)[number][0];

/** Screenshot flow: pick an image, a short "reading" step, then editable numbers to confirm. Nothing is uploaded. */
export function StoryInsightsFlow({ post, creator, brand }: { post: Post; creator: Creator; brand: string }) {
  const { confirmInsights } = useStore();
  const [phase, setPhase] = useState<'pick' | 'reading' | 'edit'>('pick');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState('');
  const [vals, setVals] = useState<Record<Key, string>>({ views: '', reach: '', saves: '', shares: '', replies: '' });
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Choose an image file, like a screenshot saved to your phone.'); return; }
    setError('');
    setFileName(f.name);
    setPreview(URL.createObjectURL(f));
    setPhase('reading');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const r = readScreenshotMock(post, creator);
      setVals({ views: String(r.views ?? ''), reach: String(r.reach), saves: String(r.saves), shares: String(r.shares), replies: String(r.replies ?? '') });
      setPhase('edit');
    }, 1200);
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); };

  const confirm = () => {
    const n = {} as Record<Key, number>;
    for (const [k, label] of FIELDS) {
      const v = Number(vals[k]);
      if (vals[k].trim() === '' || !Number.isFinite(v) || v < 0) { setError(`${label} should be a number, 0 or more.`); return; }
      n[k] = Math.round(v);
    }
    setError('');
    confirmInsights(post.id, n);
  };

  return (
    <div className="cr-ask" role="group" aria-label={`${brand} asked for your Story insights`}>
      <div className="cr-ask-head">
        <b>{brand} asked for your story insights</b>
        <span className="cr-24"><Timer size={13} />Story numbers disappear after 24 hours, so send them soon.</span>
      </div>

      {phase === 'pick' && (
        <>
          <label className={`cr-drop ${drag ? 'drag' : ''}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}>
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            <ImagePlus size={22} />
            <b>Add a screenshot of your Story insights</b>
            <small>Open the Story in Instagram, swipe up to see insights, take a screenshot. Drop it here or tap to choose.</small>
          </label>
          {error && <small className="error-text" role="alert">{error}</small>}
          <Link href="/creator/profile" className="textlink">Skip the screenshot, no problem if you connect Instagram</Link>
        </>
      )}

      {phase === 'reading' && (
        <div className="cr-reading" role="status"><Loader2 size={16} className="spin" />Reading your screenshot…</div>
      )}

      {phase === 'edit' && (
        <div className="cr-edit">
          <div className="cr-edit-top">
            {preview && <img src={preview} alt="Your selected screenshot" className="cr-shot" />}
            <div><b>{fileName}</b><p className="muted">Check these match your screenshot. Fix anything that is off before you send.</p></div>
          </div>
          <div className="cr-fields">
            {FIELDS.map(([k, label]) => (
              <label key={k}>{label}
                <input type="number" inputMode="numeric" min={0} value={vals[k]} onChange={(e) => { setVals({ ...vals, [k]: e.target.value }); setError(''); }} />
              </label>
            ))}
          </div>
          {error && <small className="error-text" role="alert">{error}</small>}
          <div className="cr-actions">
            <button className="btn primary" onClick={confirm}><Check size={15} />Confirm and send</button>
            <button className="btn" onClick={() => { setPhase('pick'); setPreview(''); }}>Choose a different screenshot</button>
          </div>
        </div>
      )}
      <PrototypeNote>Prototype: the screenshot is not uploaded or read. These numbers are sample values.</PrototypeNote>
    </div>
  );
}
