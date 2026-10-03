import { useState, type ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import type { Programme } from '@/domain/types';
import { fmtDate } from '@/domain/helpers';
import { fmtINR } from '@/domain/money';
import { useStore } from '@/state/store';
import { ProgrammeFields, planRateHelp, useProgrammeForm } from './ProgrammeFields';
import '@/styles/programmes.css';

function Editor({ programme: p, onDone }: { programme: Programme; onDone: () => void }) {
  const { updateProgramme } = useStore();
  const api = useProgrammeForm(p);
  const save = () => {
    const input = api.submit();
    if (!input) return;
    updateProgramme(p.id, input, 'Campaign updated');
    onDone();
  };
  return (
    <form className="card" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
      <div className="card-head"><h3>Edit campaign</h3></div>
      <ProgrammeFields api={api} />
      <div className="row-actions pg-form-foot">
        <button type="submit" className="btn primary">Save changes</button>
        <button type="button" className="btn" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}

const Row = ({ k, children }: { k: string; children: ReactNode }) => <><dt>{k}</dt><dd>{children}</dd></>;
const Tags = ({ items }: { items: readonly string[] }) => <span className="tags">{items.map((t) => <span key={t} className="tag">{t}</span>)}</span>;

export default function ProgrammeBrief({ programme: p }: { programme: Programme }) {
  const [editing, setEditing] = useState(false);
  if (editing) return <Editor programme={p} onDone={() => setEditing(false)} />;
  return (
    <div className="grid-2 wide-left pg-brief">
      <section className="card" aria-label="Brief">
        <div className="card-head">
          <h3>Brief for creators</h3>
          <button className="btn small" onClick={() => setEditing(true)}><Pencil size={13} />Edit</button>
        </div>
        <p className="pg-brief-text">{p.brief || 'No brief yet.'}</p>
        <span className="eyebrow">Objective</span>
        <p className="pg-brief-obj">{p.objective || 'Not set.'}</p>
      </section>
      <section className="card" aria-label="Details">
        <div className="card-head"><h3>Details</h3></div>
        <dl className="pg-dl">
          <Row k="Product">{p.product}</Row>
          <Row k="Deliverable">{p.deliverable}</Row>
          <Row k="Niches"><Tags items={p.niches} /></Row>
          <Row k="Creator sizes"><Tags items={p.tiers} /></Row>
          <Row k="Creators needed">{p.slots}</Row>
          <Row k="Apply by">{fmtDate(p.applyBy)}</Row>
          <Row k="Starts">{fmtDate(p.startDate)}</Row>
          <Row k="Ends">{fmtDate(p.endDate)}</Row>
          <Row k="Budget">{fmtINR(p.budget)}</Row>
          <Row k="Plan rate">{fmtINR(p.ratePer1000)} per 1,000 views</Row>
          <Row k="Fee range">{fmtINR(p.feeMin)} to {fmtINR(p.feeMax)}</Row>
        </dl>
        <p className="pg-note">{planRateHelp(p.ratePer1000)}</p>
      </section>
    </div>
  );
}
