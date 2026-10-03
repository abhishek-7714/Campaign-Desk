import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowUpRight, Clock, Search } from 'lucide-react';
import { APPLICATION_COLUMNS, type Application, type ApplicationStatus, type Programme } from '@/domain/types';
import type { Tone } from '@/domain/format';
import { deliveryTone, suggestedFee, type GridRow } from '@/domain/performance';
import { fmtINR, fmtPct } from '@/domain/money';
import { Modal, TextField } from '@/components/ui-bits';
import { CreatorCell, Meter, TierBadge } from '@/components/shared';
import { useStore } from '@/state/store';
import { plural } from './programmeUtils';
import '@/styles/programmes.css';

const COLUMN_TONE: Record<(typeof APPLICATION_COLUMNS)[number], Tone> = { Applied: 'blue', Shortlisted: 'purple', Invited: 'peach', Negotiating: 'yellow', Accepted: 'green' };
const COLUMN_HINT: Record<(typeof APPLICATION_COLUMNS)[number], string> = {
  Applied: 'Creators who applied to your open call', Shortlisted: 'Creators you are keeping an eye on', Invited: 'Waiting for the creator to reply',
  Negotiating: 'Fee is being agreed', Accepted: 'These creators have a collaboration',
};
const ROW_TONE = { Live: 'green', Fetching: 'blue', Planned: 'neutral', Late: 'yellow', Missed: 'coral' } as const;

function CounterModal({ app, programme, onClose }: { app: Application; programme: Programme; onClose: () => void }) {
  const { creatorById, respondApplication } = useStore();
  const creator = creatorById(app.creatorId);
  const [fee, setFee] = useState(String(app.fee));
  const [error, setError] = useState('');
  if (!creator) return null;
  const suggested = suggestedFee(creator, programme).fee;
  const submit = () => {
    const n = Number(fee);
    if (!(n > 0)) { setError('Enter the fee you want to offer, in rupees.'); return; }
    respondApplication(app.id, 'counter', 'brand', { fee: Math.round(n) });
    onClose();
  };
  return (
    <Modal title={`Counter ${creator.name}`} onClose={onClose} onSubmit={submit} submitLabel="Send counter-offer">
      <div className="pg-form">
        <p className="pg-lead">Their fee on the table is <b>{fmtINR(app.fee)}</b>. Their usual ask for one Reel is {fmtINR(creator.rate)}. At your plan rate the fee would be about {fmtINR(suggested)}.</p>
        <TextField label="Your offer (₹) *" type="number" inputMode="numeric" min={0} step={500} value={fee} error={error}
          onChange={(e) => { setFee(e.target.value); setError(''); }} />
      </div>
    </Modal>
  );
}

function PipelineCard({ app, programme, row, full, onCounter }: { app: Application; programme: Programme; row?: GridRow; full: boolean; onCounter: () => void }) {
  const { creatorById, respondApplication } = useStore();
  const creator = creatorById(app.creatorId);
  if (!creator) return null;
  const act = (a: 'shortlist' | 'accept' | 'reject') => respondApplication(app.id, a, 'brand');
  const first = creator.name.split(' ')[0];
  const accept = (label: string) => (
    <button className="btn small primary" disabled={full} title={full ? 'All slots are filled' : undefined}
      aria-label={`${label} ${creator.name}`} onClick={() => act('accept')}>{label}</button>
  );
  const reject = <button className="btn small danger" aria-label={`Reject ${creator.name}`} onClick={() => act('reject')}>Reject</button>;
  const waiting = <span className="pg-wait"><Clock size={12} />Waiting for {first}</span>;

  let actions: ReactNode;
  if (app.status === 'Applied') {
    actions = <>
      <button className="btn small" aria-label={`Shortlist ${creator.name}`} onClick={() => act('shortlist')}>Shortlist</button>
      {accept('Accept')}{reject}
    </>;
  } else if (app.status === 'Shortlisted') {
    actions = <>{accept('Accept')}{reject}</>;
  } else if (app.status === 'Invited') {
    actions = waiting;
  } else if (app.status === 'Negotiating') {
    actions = app.lastMoveBy === 'creator' ? <>
      {accept(`Accept at ${fmtINR(app.fee)}`)}
      <button className="btn small" aria-label={`Counter ${creator.name}`} onClick={onCounter}>Counter</button>
      {reject}
    </> : waiting;
  } else {
    actions = <>
      {app.collaborationId && <Link href={`/campaigns/${app.collaborationId}`} className="btn small">Open collaboration<ArrowUpRight size={13} /></Link>}
      {programme.status === 'Live' && row && (
        row.deliveryPct !== null
          ? <span className={`dchip t-${deliveryTone(row.deliveryPct)}`} title="Views delivered vs paid for">{fmtPct(row.deliveryPct)} delivered</span>
          : <span className={`dchip t-${ROW_TONE[row.status]}`}>{row.status}</span>
      )}
    </>;
  }

  return (
    <article className="pg-pcard" data-testid={`card-application-${app.id}`}>
      <div className="pg-pcard-top">
        <Link href={`/marketplace/${creator.id}`} className="pg-clink"><CreatorCell creator={creator} size={30} /></Link>
        <TierBadge tier={creator.tier} />
      </div>
      <div className="pg-pcard-fee">
        <span><b>{fmtINR(app.fee)}</b> on the table</span>
        <small>Their ask {fmtINR(creator.rate)}</small>
        <span className="tag">{app.origin === 'creator' ? 'Applied' : 'You invited'}</span>
      </div>
      {app.message && app.status !== 'Accepted' && <p className="pg-msg" title={app.message}>{app.message}</p>}
      <div className="pg-pcard-actions">{actions}</div>
    </article>
  );
}

export default function CreatorsPipeline({ programme: p }: { programme: Programme }) {
  const { applications, gridRows, creatorById, setProgrammeStatus } = useStore();
  const [counter, setCounter] = useState<Application | null>(null);
  const mine = useMemo(() => applications.filter((a) => a.programmeId === p.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [applications, p.id]);
  const rowByCollab = useMemo(() => new Map(gridRows(p.id).map((r) => [r.collab.id, r])), [gridRows, p.id]);
  const accepted = mine.filter((a) => a.status === 'Accepted').length;
  const closed = mine.filter((a) => a.status === 'Declined' || a.status === 'Rejected');
  const full = accepted >= p.slots;
  const by = (s: ApplicationStatus) => mine.filter((a) => a.status === s);

  return (
    <div className="stack">
      {p.status === 'Draft' && (
        <div className="pg-banner t-yellow" role="note">
          <div>
            <b>This campaign is a draft.</b>
            <p>Publishing makes it visible to creators on the marketplace, and they can start applying. You can still invite creators yourself before you publish.</p>
          </div>
          <button className="btn primary" onClick={() => setProgrammeStatus(p.id, 'Open call')}>Publish to marketplace</button>
        </div>
      )}

      <section className="card pg-slots" aria-label="Slots">
        <div className="pg-slots-main">
          <div>
            <b>{accepted} of {p.slots} slots filled</b>
            <small>{full ? 'All slots are filled. Raise the number of creators in the Brief tab to accept more.' : `${plural(p.slots - accepted, 'creator')} still needed.`}</small>
          </div>
          <Link href="/marketplace" className="btn"><Search size={14} />Find creators</Link>
        </div>
        <Meter value={p.slots ? (accepted / p.slots) * 100 : 0} tone="green" label={`${accepted} of ${p.slots} slots filled`} />
      </section>

      <div className="pg-board">
        {APPLICATION_COLUMNS.map((col) => {
          const items = by(col);
          return (
            <section key={col} className={`pg-col t-${COLUMN_TONE[col]}`} aria-label={`${col}, ${plural(items.length, 'creator')}`}>
              <header className="pg-col-head">
                <div><h3>{col}</h3><small>{COLUMN_HINT[col]}</small></div>
                <b>{items.length}</b>
              </header>
              <div className="pg-col-body">
                {items.length ? items.map((a) => (
                  <PipelineCard key={a.id} app={a} programme={p} full={full} row={a.collaborationId ? rowByCollab.get(a.collaborationId) : undefined} onCounter={() => setCounter(a)} />
                )) : <p className="pg-col-empty">{col === 'Accepted' ? 'Accepted creators appear here with their collaboration.' : 'Nobody here yet.'}</p>}
              </div>
            </section>
          );
        })}
      </div>

      <details className="card pg-closed">
        <summary>Declined and rejected ({closed.length})</summary>
        {closed.length ? (
          <ul>
            {closed.map((a) => {
              const c = creatorById(a.creatorId);
              return c && (
                <li key={a.id}>
                  <Link href={`/marketplace/${c.id}`} className="pg-clink"><CreatorCell creator={c} size={28} /></Link>
                  <span className="tag">{a.status === 'Declined' ? 'Declined by creator' : 'Rejected by you'}</span>
                  <small className="muted">{fmtINR(a.fee)}</small>
                </li>
              );
            })}
          </ul>
        ) : <p className="muted">Nobody has been declined or rejected.</p>}
      </details>

      {counter && <CounterModal app={counter} programme={p} onClose={() => setCounter(null)} />}
    </div>
  );
}
