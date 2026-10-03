/**
 * Small building blocks shared by the marketplace, programme, performance and creator screens.
 * Styling lives in src/styles/foundation.css.
 */
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { BadgeCheck, Lock, X } from 'lucide-react';
import type { Creator, InsightSource, Tier } from '@/domain/types';
import { initials } from '@/domain/helpers';
import type { Tone } from '@/domain/format';

/** Round avatar in the creator's colour. size: px */
export function CreatorAvatar({ creator, size = 36 }: { creator: Pick<Creator, 'name' | 'hue'>; size?: number }) {
  return (
    <span
      className="cav" aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)), background: `linear-gradient(140deg, hsl(${creator.hue} 70% 88%), hsl(${(creator.hue + 30) % 360} 65% 78%))`, color: `hsl(${creator.hue} 45% 28%)` }}
    >{initials(creator.name)}</span>
  );
}

/** Avatar + name + @handle, the standard way to show a creator in a row. */
export function CreatorCell({ creator, size = 34, sub }: { creator: Creator; size?: number; sub?: ReactNode }) {
  return (
    <span className="ccell">
      <CreatorAvatar creator={creator} size={size} />
      <span className="ccell-t">
        <b>{creator.name}{creator.verified && <BadgeCheck size={13} className="verified" aria-label="Verified" />}</b>
        <small>{sub ?? `@${creator.handle}`}</small>
      </span>
    </span>
  );
}

const TIER_TONE: Record<Tier, Tone> = { Nano: 'mint', Micro: 'blue', Mid: 'purple' };
export function TierBadge({ tier }: { tier: Tier }) {
  return <span className={`pill t-${TIER_TONE[tier]}`} title={tier === 'Nano' ? 'Under 10K followers' : tier === 'Micro' ? '10K to 100K followers' : '100K to 500K followers'}>{tier}</span>;
}

/* ---------------------------- data provenance ---------------------------- */

export type SourceKind = 'public' | 'estimated' | InsightSource | 'locked' | 'sample';

const SRC: Record<SourceKind, { label: string; cls: string; title: string }> = {
  public: { label: 'Public', cls: 'public', title: 'Collected from the public post page.' },
  estimated: { label: 'Estimated', cls: 'est', title: 'Estimated from public numbers. Not a measured figure.' },
  'creator-screenshot': { label: 'Creator-confirmed', cls: 'confirmed', title: 'Read from a screenshot the creator sent, then confirmed.' },
  'creator-connected': { label: 'Creator-connected', cls: 'confirmed', title: 'Pulled from the creator’s connected Instagram account.' },
  'brand-connected': { label: 'Brand-connected', cls: 'brand', title: 'Pulled from your connected Instagram account. Works for Collab posts.' },
  locked: { label: 'Private', cls: 'locked', title: 'Reach, saves and shares are private to the creator. Ask them to connect or send a screenshot.' },
  sample: { label: 'Sample', cls: 'est', title: 'Sample data for this prototype.' },
};

/** Small label that says where a number came from. */
export function SourceBadge({ source, compact = false }: { source: SourceKind; compact?: boolean }) {
  const s = SRC[source];
  return <span className={`src ${s.cls}`} title={s.title}>{source === 'locked' && <Lock size={10} />}{compact ? s.label.split('-')[0] : s.label}</span>;
}

/** One-line key to the source badges. */
export function SourceLegend() {
  const items: SourceKind[] = ['public', 'creator-screenshot', 'brand-connected', 'locked'];
  return (
    <div className="src-legend" aria-label="Where numbers come from">
      <span className="eyebrow">Where numbers come from</span>
      {items.map((k) => <span key={k} className="src-legend-item"><SourceBadge source={k} /><small>{SRC[k].title}</small></span>)}
    </div>
  );
}

/* ------------------------------- layout bits ------------------------------- */

/** Compact stat: label, big value, optional sub-line. tone colours the tile. */
export function Stat({ label, value, sub, tone = 'neutral', badge }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; badge?: ReactNode }) {
  return (
    <div className={`stat t-${tone}`}>
      <span className="stat-k">{label}{badge}</span>
      <b>{value}</b>
      {sub && <small>{sub}</small>}
    </div>
  );
}

/** Thin horizontal meter, 0-100. */
export function Meter({ value, tone = 'blue', label }: { value: number; tone?: Tone; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return <div className={`meter t-${tone}`} role="img" aria-label={label ?? `${Math.round(v)} percent`}><span style={{ width: `${v}%` }} /></div>;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Right-hand slide-over panel. Closes on Escape or backdrop click. */
export function Drawer({ title, subtitle, onClose, children, footer, width = 520 }: {
  title: ReactNode; subtitle?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); return; }
      if (e.key !== 'Tab' || !ref.current) return;
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const a = items[0]; const z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', key);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = prevOverflow; prev?.focus?.(); };
  }, []);
  return (
    <div className="drawer-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby={id} ref={ref} tabIndex={-1} style={{ width: `min(${width}px, 100vw)` }}>
        <header className="drawer-head">
          <div><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button className="icon-flat" aria-label="Close panel" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="drawer-body">{children}</div>
        {footer && <footer className="drawer-foot">{footer}</footer>}
      </aside>
    </div>
  );
}

/** A "this is not real yet" note, used on mocked integrations. */
export function PrototypeNote({ children }: { children: ReactNode }) {
  return <p className="proto-note">{children}</p>;
}

/** Segmented control. */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: readonly { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="chips" role="tablist" aria-label={label}>
      {options.map((o) => <button key={o.value} role="tab" aria-selected={value === o.value} className={`chip ${value === o.value ? 'on' : ''}`} onClick={() => onChange(o.value)}>{o.label}</button>)}
    </div>
  );
}
