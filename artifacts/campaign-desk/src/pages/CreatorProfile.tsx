import { useState } from 'react';
import { Link, useSearch } from 'wouter';
import { ArrowLeft, BadgeCheck, Heart, Play, Send } from 'lucide-react';
import { useStore } from '@/state/store';
import { CreatorAvatar, Meter, Stat, TierBadge } from '@/components/shared';
import { Bar, Empty, Pill } from '@/components/viz/Cards';
import InviteDialog from '@/components/marketplace/InviteDialog';
import { isInvitable } from '@/components/marketplace/helpers';
import { deliveryTone, expectedViewsFor, suggestedFee, type GridRow } from '@/domain/performance';
import { fmtFull, fmtINR, fmtNum, fmtPct } from '@/domain/money';
import '@/styles/marketplace.css';

const toneOf = (n: number): 'green' | 'yellow' | 'coral' => (n >= 90 ? 'green' : n >= 75 ? 'yellow' : 'coral');
// Weights for ranking the top cities. The data holds the order, not the exact shares.
const CITY_WEIGHTS = [100, 62, 41, 28, 20];

export default function CreatorProfilePage({ id }: { id: string }) {
  const { creatorById, brandProgrammes, gridRows, shortlist, toggleShortlist } = useStore();
  const from = new URLSearchParams(useSearch()).get('from');
  const backHref = `/marketplace${from ? `?${from}` : ''}`;
  const creator = creatorById(id);
  const options = brandProgrammes.filter(isInvitable);
  const [progId, setProgId] = useState('');
  const [inviting, setInviting] = useState(false);

  if (!creator) {
    return (
      <div className="mp-notfound">
        <Empty title="We could not find this creator">
          The link may be old, or the creator is no longer listed. <Link href="/marketplace" className="textlink">Back to the marketplace</Link>
        </Empty>
      </div>
    );
  }

  const saved = shortlist.includes(creator.id);
  const history: { rows: GridRow[]; programmeName: string; programmeId: string }[] = brandProgrammes
    .map((p) => ({ programmeId: p.id, programmeName: p.name, rows: gridRows(p.id).filter((r) => r.creator.id === creator.id) }))
    .filter((h) => h.rows.length);
  const flat = history.flatMap((h) => h.rows.map((row) => ({ row, programmeId: h.programmeId, programmeName: h.programmeName })));

  const feeProgramme = options.find((p) => p.id === progId) ?? options[0];
  const sug = feeProgramme ? suggestedFee(creator, feeProgramme) : null;
  const diff = sug ? creator.rate - sug.fee : 0;
  const a = creator.audience;
  const cities = creator.audience.topCities.slice(0, 5);

  return (
    <>
      <Link href={backHref} className="mp-back"><ArrowLeft size={15} />Back to marketplace</Link>

      <section className="card mp-head">
        <CreatorAvatar creator={creator} size={84} />
        <div className="mp-head-body">
          <h1>{creator.name}{creator.verified && <BadgeCheck size={20} className="verified" aria-label="Verified" />}</h1>
          <p className="muted">@{creator.handle} · {creator.city} · {creator.languages.join(', ')}</p>
          <p className="mp-bio">{creator.bio}</p>
          <div className="tags">
            <TierBadge tier={creator.tier} />
            {creator.niches.map((n) => <span key={n} className="tag">{n}</span>)}
            {creator.openToBarter && <span className="tag">Open to barter</span>}
          </div>
        </div>
        <div className="mp-head-actions">
          <button type="button" className="btn primary" onClick={() => setInviting(true)}><Send size={14} />Invite to campaign</button>
          <button type="button" className={`btn ${saved ? 'soft t-coral' : ''}`} aria-pressed={saved} onClick={() => toggleShortlist(creator.id)}>
            <Heart size={14} fill={saved ? 'currentColor' : 'none'} />{saved ? 'Shortlisted' : 'Shortlist'}
          </button>
        </div>
      </section>

      <div className="stats mp-stats-row">
        <Stat label="Followers" value={fmtNum(creator.followers)} tone="blue" />
        <Stat label="Avg views" value={fmtNum(creator.avgViews)} sub="Last 10 Reels" tone="purple" />
        <Stat label="Engagement" value={fmtPct(creator.engagementRate, 1)} sub="Of views" tone="peach" />
        <Stat label="On-time rate" value={fmtPct(creator.onTimeRate)} tone={creator.onTimeRate >= 85 ? 'green' : 'yellow'} />
        <Stat label="Views delivered" value={fmtPct(creator.deliveredPct)} sub="Of views paid for" tone={deliveryTone(creator.deliveredPct)} />
        <Stat label="Rate per Reel" value={fmtINR(creator.rate)} tone="mint" />
        <Stat label="Responds" value={creator.responseTime} tone="neutral" />
      </div>

      <div className="mp-cols">
        <section className="card mp-panel mp-span">
          <header className="card-head"><div><h3>Your history with this creator</h3><p className="muted">Collaborations in your programmes.</p></div></header>
          {flat.length === 0 ? (
            <Empty title="You have not worked with this creator yet">An invite is the way to start. Their track record on nano.club is shown alongside.</Empty>
          ) : (
            <div className="dt-wrap">
              <table className="dt">
                <thead><tr><th>Programme</th><th>Status</th><th className="num">Fee</th><th className="num">Views vs expected</th><th>Delivery</th><th className="num">Per 1,000 views</th><th>Timing</th></tr></thead>
                <tbody>
                  {flat.map(({ row, programmeId, programmeName }) => (
                    <tr key={row.collab.id}>
                      <td><Link href={`/programmes/${programmeId}`} className="textlink">{programmeName}</Link></td>
                      <td><span className="pill t-neutral">{row.status}</span></td>
                      <td className="num">{fmtINR(row.fee)}</td>
                      <td className="num">{row.views === null ? <span className="muted-cell">Not live yet</span> : `${fmtNum(row.views)} of ${fmtNum(row.expectedViews)}`}</td>
                      <td>{row.deliveryPct === null ? <span className="muted-cell">No data</span> : <span className={`dchip t-${deliveryTone(row.deliveryPct)}`}>{Math.round(row.deliveryPct)}%</span>}</td>
                      <td className="num">{row.costPer1000 === null ? <span className="muted-cell">No data</span> : fmtINR(row.costPer1000)}</td>
                      <td>{row.postedOnTime === null ? <span className="muted-cell">Not posted</span> : row.postedOnTime ? 'On time' : 'Late'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card mp-panel">
          <header className="card-head"><div><h3>What a fair fee looks like</h3><p className="muted">Priced on views, not followers.</p></div></header>
          {!feeProgramme || !sug ? (
            <p className="mp-note">You have no open or live programme. <Link href="/programmes" className="textlink">Open Programmes</Link> to set a plan rate.</p>
          ) : (
            <div className="mp-fee">
              <label className="field-inline">Programme
                <select aria-label="Programme for the fee estimate" value={feeProgramme.id} onChange={(e) => setProgId(e.target.value)}>
                  {options.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <div className="mp-formula-row" aria-label="Fee formula">
                <div><small>Expected views</small><b>{fmtFull(expectedViewsFor(creator))}</b></div>
                <span aria-hidden="true">×</span>
                <div><small>Per 1,000 views</small><b>{fmtINR(feeProgramme.ratePer1000)}</b></div>
                <span aria-hidden="true">=</span>
                <div className="mp-fee-total"><small>Suggested fee</small><b>{fmtINR(sug.fee)}</b></div>
              </div>
              <div className={`mp-ask t-${diff <= 0 ? 'green' : diff <= sug.fee * 0.15 ? 'yellow' : 'coral'}`}>
                <span>Their ask is <b>{fmtINR(creator.rate)}</b></span>
                <Pill tone={diff <= 0 ? 'green' : diff <= sug.fee * 0.15 ? 'yellow' : 'coral'} dot={false}>
                  {diff === 0 ? 'Same as plan' : diff < 0 ? `${fmtINR(-diff)} under plan` : `${fmtINR(diff)} over plan`}
                </Pill>
              </div>
              <small className="muted">Expected views are 90% of average views, rounded to the nearest 500.</small>
            </div>
          )}
        </section>

        <section className="card mp-panel">
          <header className="card-head"><div><h3>Track record on nano.club</h3><p className="muted">{creator.campaignsOnPlatform} campaign{creator.campaignsOnPlatform === 1 ? '' : 's'} so far.</p></div></header>
          <div className="mp-meters">
            <div><div className="mp-meter-l"><span>Published on time</span><b>{fmtPct(creator.onTimeRate)}</b></div><Meter value={creator.onTimeRate} tone={toneOf(creator.onTimeRate)} label={`On-time rate ${creator.onTimeRate} percent`} /></div>
            <div><div className="mp-meter-l"><span>Views delivered vs paid for</span><b>{fmtPct(creator.deliveredPct)}</b></div><Meter value={creator.deliveredPct} tone={deliveryTone(creator.deliveredPct) === 'neutral' ? 'blue' : deliveryTone(creator.deliveredPct)} label={`Delivered ${creator.deliveredPct} percent of expected views`} /></div>
          </div>
          {creator.past.length > 0 && (
            <ul className="mp-past">
              {creator.past.map((w, i) => (
                <li key={`${w.brand}-${i}`}>
                  <span><b>{w.brand}</b><small>{w.title} · {w.month}</small></span>
                  <span className={`dchip t-${deliveryTone(w.deliveredPct)}`}>{w.deliveredPct}%</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card mp-panel">
          <header className="card-head"><div><h3>Audience</h3></div></header>
          <div className="mp-bars">
            {([['Female', a.female, 'purple'], ['Age 18-24', a.age18to24, 'blue'], ['Age 25-34', a.age25to34, 'mint']] as const).map(([label, v, tone]) => (
              <div key={label} className="mp-bar-row"><span>{label}</span><Bar value={v} tone={tone} label={`${label} ${v} percent`} /><b>{fmtPct(v)}</b></div>
            ))}
          </div>
          <h4 className="eyebrow mp-sub">Top cities</h4>
          <div className="mp-bars">
            {cities.map((c, i) => (
              <div key={c} className="mp-bar-row"><span>{c}</span><Bar value={CITY_WEIGHTS[i] ?? 15} tone="peach" label={`${c}, rank ${i + 1}`} /><b className="muted">#{i + 1}</b></div>
            ))}
          </div>
        </section>

        <section className="card mp-panel">
          <header className="card-head"><div><h3>Recent content</h3><p className="muted">Views on the last {Math.min(6, creator.samples.length)} Reels.</p></div></header>
          <div className="mp-tiles">
            {creator.samples.slice(0, 6).map((v, i) => (
              <div key={i} className="mp-tile" style={{ background: `linear-gradient(150deg, hsl(${creator.hue} 70% 90%), hsl(${(creator.hue + 28 + i * 6) % 360} 62% 78%))`, color: `hsl(${creator.hue} 45% 24%)` }}>
                <span className="mp-tile-l"><Play size={11} fill="currentColor" />Reel</span>
                <b>{fmtNum(v)}</b>
                <small>views</small>
              </div>
            ))}
          </div>
        </section>
      </div>

      {inviting && <InviteDialog creator={creator} defaultProgrammeId={feeProgramme?.id} onClose={() => setInviting(false)} />}
    </>
  );
}
