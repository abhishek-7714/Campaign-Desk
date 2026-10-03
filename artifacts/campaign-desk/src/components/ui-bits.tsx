import { useEffect, useId, useRef, type FormEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { slug } from '@/domain/helpers';

export function Badge({ value }: { value: string }) {
  return <span className={`status ${slug(value)}`}>{value}</span>;
}

export function PriorityLabel({ value }: { value: string }) {
  return <span className={`priority ${value.toLowerCase()}`}>{value}</span>;
}

export function Avatar({ name }: { name: string }) {
  return <span className="avatar" aria-hidden="true">{name.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase()}</span>;
}

interface FieldBase { label: string; error?: string; hint?: string; wide?: boolean; gap?: boolean }

export function TextField({ label, error, hint, wide, gap, ...rest }: FieldBase & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={`form-field ${wide ? 'wide' : ''} ${gap ? 'is-gap' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-e` : undefined} {...rest} />
      {hint && !error && <small className="hint">{hint}</small>}
      {error && <small id={`${id}-e`} className="error-text">{error}</small>}
    </div>
  );
}

export function TextAreaField({ label, error, hint, wide, gap, ...rest }: FieldBase & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className={`form-field ${wide ? 'wide' : ''} ${gap ? 'is-gap' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <textarea id={id} aria-invalid={!!error} {...rest} />
      {hint && !error && <small className="hint">{hint}</small>}
      {error && <small className="error-text">{error}</small>}
    </div>
  );
}

export function SelectField({ label, error, wide, options, ...rest }: FieldBase & { options: readonly string[] | { value: string; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className={`form-field ${wide ? 'wide' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <select id={id} {...rest}>
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value;
          const l = typeof o === 'string' ? o : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
      {error && <small className="error-text">{error}</small>}
    </div>
  );
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Modal({ title, onClose, onSubmit, submitLabel, children }: {
  title: string; onClose: () => void; onSubmit: () => void; submitLabel: string; children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('input,select,textarea');
    (first ?? ref.current?.querySelector<HTMLElement>(FOCUSABLE))?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); return; }
      if (e.key !== 'Tab' || !ref.current) return;
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const a = items[0];
      const z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, []);

  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit(); };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <form onSubmit={submit} noValidate>
          <div className="modal-head">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="button ghost" aria-label="Close dialog" onClick={onClose}><X /></button>
          </div>
          <div className="modal-content">{children}</div>
          <div className="modal-foot">
            <button type="button" className="button" onClick={onClose}>Cancel</button>
            <button type="submit" className="button primary">{submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty-state"><strong>{title}</strong>{children}</div>;
}
