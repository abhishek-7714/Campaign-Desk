import { useEffect, useRef, useState } from 'react';
import { Columns3 } from 'lucide-react';
import { COLUMN_GROUPS, DEFAULT_COLS, SALES_COLS, type ColKey } from './model';

/** Popover with checkbox groups for the optional grid columns. */
export default function ColumnPicker({ cols, onChange, salesOn }: { cols: Set<ColKey>; onChange: (next: Set<ColKey>) => void; salesOn: boolean }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const down = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); (wrap.current?.querySelector('button') as HTMLElement | null)?.focus(); } };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [open]);
  const toggle = (k: ColKey) => { const n = new Set(cols); if (n.has(k)) n.delete(k); else n.add(k); onChange(n); };
  return (
    <div className="pf-pop" ref={wrap}>
      <button type="button" className="btn" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}><Columns3 size={15} />Columns</button>
      {open && (
        <div className="pf-pop-panel" role="group" aria-label="Choose columns">
          {COLUMN_GROUPS.map((g) => (
            <fieldset key={g.title}>
              <legend>{g.title}{g.note && <small>{g.note}</small>}</legend>
              {g.items.map((it) => {
                const off = SALES_COLS.includes(it.key) && !salesOn;
                return (
                  <label key={it.key} className={off ? 'is-disabled' : ''}>
                    <input type="checkbox" checked={cols.has(it.key)} disabled={off} onChange={() => toggle(it.key)} />
                    {it.label}{off && <small>Connect Shopify first</small>}
                  </label>
                );
              })}
            </fieldset>
          ))}
          <button type="button" className="link-btn" onClick={() => onChange(new Set(DEFAULT_COLS))}>Reset to default</button>
        </div>
      )}
    </div>
  );
}
