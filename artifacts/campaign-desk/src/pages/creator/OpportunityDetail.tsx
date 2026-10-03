import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Check, Clock, Eye, Minus, Package, Target } from 'lucide-react';
import { fmtDate } from '@/domain/helpers';
import { suggestedFee } from '@/domain/performance';
import { fmtINR, fmtNum } from '@/domain/money';
import { Empty, PageTitle } from '@/components/viz/Cards';
import { Meter, TierBadge } from '@/components/shared';
import { useStore } from '@/state/store';
import { FitBadge } from '@/components/creator/FitBadge';
import { ApplyPanel } from '@/components/creator/ApplyPanel';
import { TIER_RANGE, countdown, fitScore, fitTone, plainDeliverable } from '@/components/creator/helpers';
import '@/styles/creator.css';

function Reason({ ok, children }: { ok: boolean; children: ReactNode }) {
  return <li className={ok ? 'ok' : 'no'}><span aria-hidden="true">{ok ? <Check size={13} /> : <Minus size={13} />}</span><span>{children}</span></li>;
}

export default function OpportunityDetail({ id }: { id: string }) {
  const { programmeById, actingCreator: me, applications } = useStore();
  const p = programmeById(id);
  const hasApp = applications.some((a) => a.programmeId === id && a.creatorId === me.id);
  const back = <Link href="/creator" className="cr-back"><ArrowLeft size={14} />Back to opportunities</Link>;

  if (!p || (p.status === 'Draft' && !hasApp)) {
    return (
      <div className="cr-page">
        {back}
        <Empty title="We could not find that campaign">It may have been taken down by the brand. <Link href="/creator" className="textlink">See open campaigns</Link></Empty>
      </div>
    );
  }

  const fit = fitScore(me, p);
  const sug = suggestedFee(me, p);
  const left = countdown(p.applyBy);
  const steps = [
    { label: 'Apply by', date: p.applyBy, note: left.text },
    { label: 'Campaign starts', date: p.startDate, note: 'Brand shares the brief and kit' },
    { label: 'Campaign ends', date: p.endDate, note: 'Posts should be live by now' },
  ];

  return (
    <div className="cr-page">
      {back}
      <PageTitle title={p.name} sub={`${p.brand} · ${p.product}`} actions={<><FitBadge score={fit.score} /><button className="btn small cr-jump" onClick={() => document.getElementById('cr-apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Go to application</button></>} />

      <div className="cr-detail">
        <div className="cr-main">
          <section className="card" aria-labelledby="cr-brief">
            <div className="card-head"><h3 id="cr-brief">The brief</h3></div>
            <p className="cr-body">{p.brief}</p>
            <div className="cr-note"><Target size={15} /><div><b>What the brand wants</b><p>{p.objective}</p></div></div>
          </section>

          <section className="card" aria-labelledby="cr-deliver">
            <div className="card-head"><h3 id="cr-deliver">What you deliver</h3></div>
            <div className="cr-deliver">
              <span className="cr-deliver-ico"><Package size={20} /></span>
              <div><b>{p.deliverable}</b><p>{plainDeliverable(p.deliverable)}, posted from your own account.</p></div>
            </div>
          </section>

          <section className="card" aria-labelledby="cr-time">
            <div className="card-head"><h3 id="cr-time">Timeline</h3></div>
            <ol className="cr-steps">
              {steps.map((s) => <li key={s.label}><i /><div><span className="eyebrow">{s.label}</span><b>{fmtDate(s.date)}</b><small>{s.note}</small></div></li>)}
            </ol>
          </section>

          <section className="card" aria-labelledby="cr-fee">
            <div className="card-head"><h3 id="cr-fee">Fee and how it is worked out</h3></div>
            <div className="cr-fee big"><span>Fee range</span><b>{fmtINR(p.feeMin)} to {fmtINR(p.feeMax)}</b></div>
            <p className="cr-body">Brands set a plan rate per 1,000 views, here {fmtINR(p.ratePer1000)}. Your suggested fee here: <b>{fmtINR(sug.fee)}</b>, based on your average views of {fmtNum(me.avgViews)}.</p>
            <p className="muted cr-small">{fmtNum(sug.expectedViews)} expected views × {fmtINR(p.ratePer1000)} per 1,000 views, rounded to the nearest ₹500. You can quote more or less. The brand sees your quote next to this number.</p>
          </section>

          <section className="card" aria-labelledby="cr-who">
            <div className="card-head"><h3 id="cr-who">Who they are looking for</h3></div>
            <dl className="cr-who">
              <div><dt>Niches</dt><dd className="tags">{p.niches.map((n) => <span key={n} className="tag">{n}</span>)}</dd></div>
              <div><dt>Creator size</dt><dd className="cr-sizes">{p.tiers.map((t) => <span key={t}><TierBadge tier={t} /> <small>{TIER_RANGE[t]}</small></span>)}</dd></div>
              <div><dt>Cities</dt><dd>{p.cities.length ? p.cities.join(', ') : 'Anywhere in India'}</dd></div>
            </dl>
          </section>

          <section className={`card cr-fit-card t-${fitTone(fit.score)}`} aria-labelledby="cr-fit">
            <div className="card-head"><h3 id="cr-fit">Your fit</h3><FitBadge score={fit.score} /></div>
            <Meter value={fit.score} tone={fitTone(fit.score)} label={`Fit ${fit.score} out of 100`} />
            <ul className="cr-reasons">
              <Reason ok={fit.nicheOk}>{fit.nicheOk ? `Niche match: you cover ${fit.matchedNiches.join(' and ')}, which they want.` : 'None of your niches are on their list.'}</Reason>
              <Reason ok={fit.tierOk}>{fit.tierOk ? `Size match: ${me.tier} creators are in their range.` : `They are looking for ${p.tiers.join(' and ')} creators, and you are ${me.tier}.`}</Reason>
              <Reason ok={fit.cityOk}>{!fit.cityRelevant ? 'City: they are open to any city.' : fit.cityOk ? `City match: ${me.city}.` : `They prefer ${p.cities.join(', ')}. You are in ${me.city}.`}</Reason>
              <Reason ok={fit.langOk}>{fit.langOk ? 'Language: you work in English or Hindi, which this brief is written in.' : 'The brief is in English or Hindi, and neither is on your profile.'}</Reason>
            </ul>
          </section>

          <section className="card" aria-labelledby="cr-perf">
            <div className="card-head"><h3 id="cr-perf">How your performance is shown</h3><Eye size={18} className="muted" /></div>
            <p className="cr-body">Once you paste your Reel link, the brand sees the public numbers on that post automatically: views, likes and comments.</p>
            <p className="cr-body">Reach, saves and shares are private to you. The brand only sees them if you send a screenshot or connect your Instagram. Story numbers work the same way, since Stories disappear after 24 hours.</p>
            <Link href="/creator/profile" className="textlink">Connect Instagram on your profile</Link>
          </section>
        </div>

        <div className="cr-side">
          <ApplyPanel creator={me} programme={p} suggested={sug.fee} />
          <p className="cr-days side"><Clock size={13} />{left.text}</p>
        </div>
      </div>
    </div>
  );
}
