import { useState } from 'react';
import { Send } from 'lucide-react';
import type { Application, Creator, Programme } from '@/domain/types';
import { fmtDate } from '@/domain/helpers';
import { fmtINR, fmtNum } from '@/domain/money';
import { Pill } from '@/components/viz/Cards';
import { TextAreaField, TextField } from '@/components/ui-bits';
import { useStore } from '@/state/store';
import { AcceptedNote, InvitationActions } from './InvitationActions';
import { countdown, firstName, isLive, needsAnswer, plainDeliverable } from './helpers';
import '@/styles/creator.css';

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function template(creator: Creator, p: Programme) {
  const niches = creator.niches.join(' and ').toLowerCase();
  const cities = creator.audience.topCities.slice(0, 2).join(' and ');
  return `Hi ${p.brand} team, I am ${firstName(creator.name)}, a ${niches} creator from ${creator.city}. I would love to make ${plainDeliverable(p.deliverable).toLowerCase()} for ${p.name}. My Reels average about ${fmtNum(creator.avgViews)} views and my audience is mostly in ${cities}. I can share a first idea for the Reel if you are interested.`;
}

/** What the creator sees about an application that already exists. */
function CurrentStatus({ app, programme }: { app: Application; programme: Programme }) {
  const lines: Record<string, string> = {
    Applied: `You applied at ${fmtINR(app.fee)}. The brand has not replied yet.`,
    Shortlisted: `${programme.brand} shortlisted you. They may message you about the fee next.`,
    Negotiating: `You countered at ${fmtINR(app.fee)}. Waiting for ${programme.brand} to reply.`,
  };
  if (app.status === 'Accepted') return <AcceptedNote programme={programme} />;
  if (needsAnswer(app)) {
    return (
      <div className="cr-apply-state">
        <Pill tone="purple">{app.status === 'Invited' ? 'You are invited' : 'The brand sent a new offer'}</Pill>
        <div className="cr-fee"><span>Fee on the table</span><b>{fmtINR(app.fee)}</b></div>
        <InvitationActions app={app} programme={programme} />
      </div>
    );
  }
  return (
    <div className="cr-apply-state">
      <Pill tone={app.status === 'Shortlisted' ? 'blue' : 'yellow'}>{app.status === 'Applied' ? 'Application sent' : app.status === 'Shortlisted' ? 'Shortlisted' : 'In talks'}</Pill>
      <p>{lines[app.status]}</p>
    </div>
  );
}

export function ApplyPanel({ creator, programme, suggested }: { creator: Creator; programme: Programme; suggested: number }) {
  const { applications, applyToProgramme } = useStore();
  const mine = applications.filter((a) => a.creatorId === creator.id && a.programmeId === programme.id);
  const live = mine.find(isLive);
  const earlier = !live ? mine[0] : undefined;
  const left = countdown(programme.applyBy);

  const [fee, setFee] = useState(String(clamp(creator.rate, programme.feeMin, programme.feeMax)));
  const [message, setMessage] = useState(() => template(creator, programme));
  const [error, setError] = useState('');

  const send = () => {
    const n = Math.round(Number(fee));
    if (!fee.trim() || !Number.isFinite(n) || n <= 0) { setError('Enter your quote in rupees.'); return; }
    if (message.trim().length < 10) { setError('Add a short message so the brand knows who you are.'); return; }
    setError('');
    applyToProgramme({ programmeId: programme.id, creatorId: creator.id, fee: n, message: message.trim() });
  };
  const n = Number(fee);
  const range = Number.isFinite(n) && n > 0 && (n < programme.feeMin || n > programme.feeMax)
    ? `${fmtINR(n)} is outside the brand's range of ${fmtINR(programme.feeMin)} to ${fmtINR(programme.feeMax)}. You can still send it, they may counter.` : '';

  return (
    <aside className="card cr-apply" id="cr-apply" aria-labelledby="cr-apply-h">
      <h2 id="cr-apply-h">{live ? 'Your application' : 'Apply to this campaign'}</h2>
      {live ? (
        <>
          <CurrentStatus app={live} programme={programme} />
          {live.notes.length > 0 && (
            <ul className="cr-notes" aria-label="Messages so far">
              {live.notes.map((x, i) => (
                <li key={i}><small>{x.by === 'creator' ? 'You' : programme.brand} · {fmtDate(x.at.slice(0, 10))}</small><p>{x.text}</p></li>
              ))}
            </ul>
          )}
        </>
      ) : left.over || programme.status !== 'Open call' ? (
        <p className="muted">This campaign is no longer taking applications. Have a look at other open campaigns on your home page.</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); send(); }} noValidate className="cr-form">
          {earlier && <p className="proto-note">Your earlier application was {earlier.status === 'Rejected' ? 'not selected' : 'declined'}. You can send a new one.</p>}
          <TextField label="Your quote for this campaign (₹)" type="number" inputMode="numeric" min={0} step={500} value={fee}
            hint={`Brand range: ${fmtINR(programme.feeMin)} to ${fmtINR(programme.feeMax)}`} onChange={(e) => { setFee(e.target.value); setError(''); }} />
          <button type="button" className="link-btn cr-suggest" onClick={() => { setFee(String(suggested)); setError(''); }}>Use the suggested fee, {fmtINR(suggested)}</button>
          {range && <small className="cr-warn">{range}</small>}
          <TextAreaField label="Message to the brand" rows={7} value={message} onChange={(e) => { setMessage(e.target.value); setError(''); }} />
          {error && <small className="error-text" role="alert">{error}</small>}
          <button type="submit" className="btn primary lg"><Send size={15} />Send application</button>
          <small className="muted">{left.text}. You can see the reply on your home page.</small>
        </form>
      )}
    </aside>
  );
}
