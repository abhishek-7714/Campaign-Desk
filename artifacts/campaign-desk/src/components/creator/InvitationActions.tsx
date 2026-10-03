import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'wouter';
import { ArrowRight, Check, PartyPopper, Reply, X } from 'lucide-react';
import type { Application, Programme } from '@/domain/types';
import { fmtINR } from '@/domain/money';
import { Modal, TextAreaField, TextField } from '@/components/ui-bits';
import { useStore } from '@/state/store';
import '@/styles/creator.css';

/** Counter-offer dialog: a fee and an optional note. */
function CounterModal({ app, programme, onClose }: { app: Application; programme: Programme; onClose: () => void }) {
  const { respondApplication } = useStore();
  const [fee, setFee] = useState(String(app.fee));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    const n = Math.round(Number(fee));
    if (!fee.trim() || !Number.isFinite(n) || n <= 0) { setError('Enter the fee you want, in rupees.'); return; }
    respondApplication(app.id, 'counter', 'creator', { fee: n, note: note.trim() || undefined });
    onClose();
  };
  return (
    <Modal title="Counter with your fee" onClose={onClose} onSubmit={submit} submitLabel="Send counter">
      <div className="cr-counter">
        <p className="muted">{programme.brand} offered {fmtINR(app.fee)}. Tell them the fee that works for you and they can accept or come back to you.</p>
        <TextField label="Your fee (₹)" type="number" inputMode="numeric" min={0} step={500} value={fee} error={error}
          hint={`Their range for this campaign is ${fmtINR(programme.feeMin)} to ${fmtINR(programme.feeMax)}.`}
          onChange={(e) => { setFee(e.target.value); setError(''); }} />
        <TextAreaField label="Note (optional)" value={note} rows={3} placeholder="For example: I would add a second Story if the fee can move."
          onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  );
}

/** Accept, counter and decline buttons for an invitation (or a brand counter-offer). */
export function InvitationActions({ app, programme, onAccepted }: { app: Application; programme: Programme; onAccepted?: () => void }) {
  const { respondApplication } = useStore();
  const [counter, setCounter] = useState(false);
  return (
    <div className="cr-actions">
      <button className="btn primary" onClick={() => { respondApplication(app.id, 'accept', 'creator'); onAccepted?.(); }}>
        <Check size={15} />Accept {fmtINR(app.fee)}
      </button>
      <button className="btn" onClick={() => setCounter(true)}><Reply size={15} />Counter</button>
      <button className="btn danger" onClick={() => respondApplication(app.id, 'decline', 'creator')}><X size={15} />Decline</button>
      {/* Portaled so a hover transform on the card never traps the fixed-position dialog. */}
      {counter && createPortal(<CounterModal app={app} programme={programme} onClose={() => setCounter(false)} />, document.querySelector('.app-shell') ?? document.body)}
    </div>
  );
}

/** Friendly state shown right after accepting. */
export function AcceptedNote({ programme }: { programme: Programme }) {
  const { workspaceName } = useStore();
  // The sample workspace only creates a collaboration for its own brand's programmes.
  const inWork = programme.brand === workspaceName;
  return (
    <div className="cr-accepted" role="status">
      <span className="cr-accepted-ico"><PartyPopper size={20} /></span>
      <div>
        <b>You are in. Nice work.</b>
        <p>{programme.brand} will share the brief and product kit.{inWork ? ' Your posts, discount code and payment steps now show up in My work.' : ' Once they set it up, it will show up in My work.'}</p>
        <Link href="/creator/work" className="textlink">Go to My work<ArrowRight size={14} /></Link>
      </div>
    </div>
  );
}
