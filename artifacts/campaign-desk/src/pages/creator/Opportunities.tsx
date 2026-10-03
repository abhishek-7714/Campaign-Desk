import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, CalendarDays, Clock, Package, Users } from 'lucide-react';
import { NICHES, type Application, type ApplicationStatus, type Programme } from '@/domain/types';
import { fmtINR } from '@/domain/money';
import { shortDate, type Tone } from '@/domain/format';
import { Empty, PageTitle, Pill } from '@/components/viz/Cards';
import { useStore } from '@/state/store';
import { FitBadge } from '@/components/creator/FitBadge';
import { AcceptedNote, InvitationActions } from '@/components/creator/InvitationActions';
import { countdown, firstName, fitScore, isLive, needsAnswer, plainDeliverable } from '@/components/creator/helpers';
import '@/styles/creator.css';

function InvitationCard({ app, programme, accepted, onAccepted }: { app: Application; programme: Programme; accepted: boolean; onAccepted: () => void }) {
  const counter = app.status === 'Negotiating';
  return (
    <article className="cr-card cr-invite t-purple" aria-label={`Invitation from ${programme.brand}`}>
      <div className="cr-card-top">
        <span className="eyebrow">{programme.brand}</span>
        <Pill tone={accepted ? 'green' : 'purple'}>{accepted ? 'Accepted' : counter ? 'New offer from the brand' : 'Invitation'}</Pill>
      </div>
      <h3><Link href={`/creator/opportunities/${programme.id}`}>{programme.name}</Link></h3>
      <p className="muted">{programme.product}</p>
      <div className="cr-fee"><span>Fee on the table</span><b>{fmtINR(app.fee)}</b></div>
      {app.message && <blockquote className="cr-quote">{app.message}</blockquote>}
      <dl className="cr-facts">
        <div><dt><Package size={14} />Deliverable</dt><dd>{programme.deliverable}</dd></div>
        <div><dt><CalendarDays size={14} />Dates</dt><dd>{shortDate(programme.startDate)} to {shortDate(programme.endDate)}</dd></div>
      </dl>
      {accepted ? <AcceptedNote programme={programme} /> : <InvitationActions app={app} programme={programme} onAccepted={onAccepted} />}
    </article>
  );
}

const STATUS_CHIP = (a: Application): { tone: Tone; label: string } => {
  const map: Record<ApplicationStatus, { tone: Tone; label: string }> = {
    Applied: { tone: 'yellow', label: 'Applied, waiting for the brand' },
    Shortlisted: { tone: 'blue', label: 'Shortlisted' },
    Invited: { tone: 'purple', label: 'Invited' },
    Negotiating: a.lastMoveBy === 'creator' ? { tone: 'yellow', label: 'Waiting for the brand to reply' } : { tone: 'purple', label: 'Brand replied' },
    Accepted: { tone: 'green', label: 'Accepted' },
    Rejected: { tone: 'neutral', label: 'Not selected' },
    Declined: { tone: 'neutral', label: 'Declined' },
  };
  return map[a.status];
};

function ApplicationRow({ app, programme }: { app: Application; programme: Programme }) {
  const chip = STATUS_CHIP(app);
  return (
    <li className="cr-app">
      <div className="cr-app-main">
        <b>{programme.name}</b>
        <small>{programme.brand}</small>
      </div>
      <Pill tone={chip.tone}>{chip.label}</Pill>
      <span className="cr-app-fee">{fmtINR(app.fee)}</span>
      <Link href={app.status === 'Accepted' ? '/creator/work' : `/creator/opportunities/${programme.id}`} className="textlink">
        {app.status === 'Accepted' ? 'Open My work' : 'View'}<ArrowRight size={14} />
      </Link>
    </li>
  );
}

function OpportunityCard({ programme, score, i }: { programme: Programme; score: number; i: number }) {
  const left = countdown(programme.applyBy);
  return (
    <article className="cr-card cr-opp" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
      <div className="cr-card-top">
        <span className="eyebrow">{programme.brand}</span>
        <FitBadge score={score} />
      </div>
      <h3>{programme.name}</h3>
      <p className="muted">{programme.product}</p>
      <div className="cr-fee"><span>Fee range</span><b>{fmtINR(programme.feeMin)} to {fmtINR(programme.feeMax)}</b></div>
      <dl className="cr-facts">
        <div><dt><Package size={14} />Deliverable</dt><dd>{programme.deliverable}</dd></div>
        <div><dt><Users size={14} />Slots</dt><dd>{programme.slots} creators</dd></div>
      </dl>
      <div className="cr-card-foot">
        <span className={`cr-days ${left.urgent ? 'urgent' : ''}`}><Clock size={13} />{left.text}</span>
        <Link href={`/creator/opportunities/${programme.id}`} className="btn small primary">View and apply<ArrowRight size={13} /></Link>
      </div>
    </article>
  );
}

export default function Opportunities() {
  const { actingCreator: me, applications, programmes, programmeById } = useStore();
  const [justAccepted, setJustAccepted] = useState<string[]>([]);
  const [view, setView] = useState<'all' | 'best'>('all');
  const [niche, setNiche] = useState('');

  const mine = applications.filter((a) => a.creatorId === me.id);
  const invitations = mine.filter((a) => needsAnswer(a) || justAccepted.includes(a.id));
  const invitationIds = new Set(invitations.map((a) => a.id));
  const inProgress = mine.filter((a) => !invitationIds.has(a.id) && isLive(a) && !(a.status === 'Accepted' && programmeById(a.programmeId)?.status === 'Completed'));
  const closed = mine.filter((a) => !isLive(a));
  const liveProgrammeIds = new Set(mine.filter(isLive).map((a) => a.programmeId));

  const open = programmes
    .filter((p) => p.status === 'Open call' && !liveProgrammeIds.has(p.id))
    .map((p) => ({ p, fit: fitScore(me, p).score }))
    .sort((a, b) => b.fit - a.fit);
  const shown = open.filter(({ p, fit }) => (view === 'all' || fit >= 70) && (!niche || (p.niches as readonly string[]).includes(niche)));

  return (
    <div className="cr-page">
      <PageTitle title={`Good morning, ${firstName(me.name)}.`} sub="Campaigns from brands looking for creators like you." />

      {invitations.length > 0 && (
        <section aria-labelledby="cr-inv">
          <div className="sec-head"><h2 id="cr-inv">Invitations for you</h2><span className="muted">{invitations.filter((a) => !justAccepted.includes(a.id)).length} waiting for your answer</span></div>
          <div className="cgrid cr-grid">
            {invitations.map((a) => {
              const p = programmeById(a.programmeId);
              return p ? <InvitationCard key={a.id} app={a} programme={p} accepted={a.status === 'Accepted'} onAccepted={() => setJustAccepted((x) => [...x, a.id])} /> : null;
            })}
          </div>
        </section>
      )}

      {inProgress.length > 0 && (
        <section className="mt" aria-labelledby="cr-apps">
          <div className="sec-head"><h2 id="cr-apps">Your applications</h2></div>
          <ul className="cr-applist card">
            {inProgress.map((a) => { const p = programmeById(a.programmeId); return p ? <ApplicationRow key={a.id} app={a} programme={p} /> : null; })}
          </ul>
        </section>
      )}
      {closed.length > 0 && (
        <p className="cr-foot muted">
          Not going ahead: {closed.map((a, i) => {
            const p = programmeById(a.programmeId);
            return <span key={a.id}>{i > 0 && ', '}{p ? `${p.name} (${p.brand}, ${a.status === 'Rejected' ? 'not selected' : 'you declined'})` : 'Unknown campaign'}</span>;
          })}.
        </p>
      )}

      <section className="mt" aria-labelledby="cr-open">
        <div className="sec-head"><h2 id="cr-open">Open opportunities</h2><span className="muted">{shown.length} open to apply</span></div>
        <div className="toolbar">
          <div className="chips" role="group" aria-label="Show">
            <button className={`chip ${view === 'all' ? 'on' : ''}`} aria-pressed={view === 'all'} onClick={() => setView('all')}>All</button>
            <button className={`chip ${view === 'best' ? 'on' : ''}`} aria-pressed={view === 'best'} onClick={() => setView('best')}>Best fit</button>
          </div>
          <label className="field-inline">Niche
            <select value={niche} onChange={(e) => setNiche(e.target.value)} aria-label="Filter by niche">
              <option value="">All niches</option>
              {NICHES.map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>
        </div>
        {shown.length ? (
          <div className="cgrid cr-grid">{shown.map(({ p, fit }, i) => <OpportunityCard key={p.id} programme={p} score={fit} i={i} />)}</div>
        ) : (
          <Empty title={open.length ? 'Nothing matches these filters' : 'No open campaigns right now'}>
            {open.length ? 'Try All, or pick a different niche.' : 'New campaigns from brands show up here. Check back soon.'}
          </Empty>
        )}
      </section>
    </div>
  );
}
