import { useMemo } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Plus, Store } from 'lucide-react';
import { useStore } from '@/state/store';
import { campaignOverdue, CURRENT_USER } from '@/domain/helpers';
import { campaignSignals, dashboardSummary } from '@/domain/analytics';
import { attentionItems } from '@/domain/attention';
import { ago, type Tone } from '@/domain/format';
import { deliveryTone, programmeInsights, summarize } from '@/domain/performance';
import { fmtINR, fmtINRShort, fmtNum, fmtPct } from '@/domain/money';
import { CampaignCard, Empty, PageTitle, Pill } from '@/components/viz/Cards';
import { Meter, Stat } from '@/components/shared';

const DOT: Record<string, string> = { good: '#2f9a63', warn: '#d49a12', bad: '#e0594a', info: '#3b6fe0' };

export default function Home() {
  const { campaigns, tasks, activity, campaignById, brandProgrammes, applications, gridRows } = useStore();
  const ops = dashboardSummary(campaigns, tasks);
  const live = brandProgrammes.find((p) => p.status === 'Live') ?? brandProgrammes.find((p) => p.status === 'Completed') ?? brandProgrammes[0];
  const rows = useMemo(() => (live ? gridRows(live.id) : []), [live, gridRows]);
  const sum = live ? summarize(rows, live) : null;
  const insights = live ? programmeInsights(rows, live).slice(0, 4) : [];
  const behind = rows.filter((r) => r.status === 'Late' || r.status === 'Missed');

  const ids = new Set(brandProgrammes.map((p) => p.id));
  const waiting = applications.filter((a) => ids.has(a.programmeId) && (a.status === 'Applied' || a.status === 'Shortlisted' || (a.status === 'Negotiating' && a.lastMoveBy === 'creator')));
  const open = brandProgrammes.filter((p) => p.status === 'Open call');
  const waitingProg = open.find((p) => waiting.some((a) => a.programmeId === p.id)) ?? open[0];

  const attention = useMemo(() => attentionItems(campaigns, tasks).slice(0, 3), [campaigns, tasks]);
  const activeCollabs = useMemo(() => campaigns.filter((c) => c.status !== 'Complete')
    .map((c) => ({ c, s: campaignSignals(c, tasks) }))
    .sort((a, b) => Number(b.s.attention) - Number(a.s.attention) || a.c.dueDate.localeCompare(b.c.dueDate)).slice(0, 4), [campaigns, tasks]);
  const recent = activity.slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 6);

  const perfHref = live ? `/programmes/${live.id}?tab=performance` : '/programmes';
  const tones: Record<string, Tone> = { green: 'green', yellow: 'yellow', coral: 'coral', neutral: 'neutral' };
  const tiles = [
    { k: 'Views delivered', v: sum?.deliveryPct != null ? fmtPct(sum.deliveryPct) : '-', tone: tones[deliveryTone(sum?.deliveryPct ?? null)] as Tone, href: perfHref, note: 'of the views you paid for' },
    { k: 'Late or missed', v: behind.length, tone: 'coral' as Tone, href: perfHref, note: 'deliverables to chase' },
    { k: 'Applications waiting', v: waiting.length, tone: 'purple' as Tone, href: waitingProg ? `/programmes/${waitingProg.id}?tab=creators` : '/programmes', note: 'need your decision' },
    { k: 'Collaborations need action', v: ops.needsAction, tone: 'yellow' as Tone, href: '/campaigns?attention=1', note: 'terms, reviews, payments' },
  ];

  return (
    <>
      <PageTitle title={`Good morning, ${CURRENT_USER.split(' ')[0]}.`} sub="Here is how your creator campaigns are doing."
        actions={<>
          <Link href="/marketplace" className="btn lg"><Store size={16} />Find creators</Link>
          <Link href="/programmes?new=1" className="btn primary lg" data-testid="button-new-campaign"><Plus size={16} />New campaign</Link>
        </>} />

      <div className="tiles">
        {tiles.map((t, i) => (
          <Link key={t.k} href={t.href} className={`tile t-${t.tone}`} style={{ animationDelay: `${i * 50}ms` }} data-testid={`tile-${t.k.toLowerCase().replace(/ /g, '-')}`}>
            <span className="tile-k">{t.k}</span><b>{t.v}</b><span className="tile-n">{t.note}<ArrowRight size={14} /></span>
          </Link>
        ))}
      </div>

      {live && sum && (
        <div className="grid-2 mt wide-left">
          <section className="card" aria-label={`${live.name} performance`}>
            <div className="card-head">
              <div><span className="eyebrow">{live.status === 'Live' ? 'Live campaign' : 'Latest campaign'}</span><h3 style={{ fontSize: 22, marginTop: 4 }}>{live.name}</h3>
                <p className="muted">{sum.creators} creators · {fmtINRShort(sum.spend)} of {fmtINRShort(live.budget)} budget</p></div>
              <Link href={perfHref} className="btn solid">Open performance<ArrowRight size={14} /></Link>
            </div>
            <div className="stats two">
              <Stat label="Views delivered" value={`${fmtNum(sum.views)}`} sub={`of ${fmtNum(sum.expectedViews)} paid for`} tone={tones[deliveryTone(sum.deliveryPct)]} />
              <Stat label="Cost per 1,000 views" value={sum.costPer1000 ? fmtINR(sum.costPer1000) : '-'} sub={`plan ${fmtINR(live.ratePer1000)}`} tone={sum.costPer1000 && sum.costPer1000 <= live.ratePer1000 ? 'green' : 'yellow'} />
              <Stat label="Posts live" value={`${sum.live} of ${sum.creators}`} sub={`${sum.late + sum.missed} late or missed`} tone="blue" />
              <Stat label="Sales via codes" value={sum.revenue !== null ? fmtINRShort(sum.revenue) : '-'} sub={sum.roas !== null ? `${sum.roas.toFixed(1)}x return on spend` : 'Connect Shopify'} tone="mint" />
            </div>
            <div style={{ marginTop: 16 }}><Meter value={(sum.spend / live.budget) * 100} tone="blue" label="Budget committed" /><small className="muted">Budget committed {fmtPct((sum.spend / live.budget) * 100)}</small></div>
          </section>
          <section className="card" aria-label="What stands out">
            <div className="card-head"><div><h3>What stands out</h3><p className="muted">Worked out from the numbers on this campaign</p></div></div>
            {insights.length ? (
              <ul className="home-insights">{insights.map((i) => <li key={i.text}><i style={{ background: DOT[i.tone] }} />{i.text}</li>)}</ul>
            ) : <Empty title="Nothing to report yet">Add post links to see how creators are doing.</Empty>}
          </section>
        </div>
      )}

      <section className="mt" aria-label="Needs your attention">
        <div className="sec-head"><h2>Needs your attention</h2></div>
        <div className="attn-grid">
          {behind.slice(0, 2).map((r, i) => (
            <article key={r.collab.id} className="acard t-coral" style={{ animationDelay: `${i * 50}ms` }}>
              <span className="eyebrow">{live?.name}</span>
              <h3>{r.status === 'Missed' ? 'Missed deliverable' : 'Post is late'}</h3>
              <p>{r.creator.name} has not posted the Reel{r.primary?.plannedDate ? ` that was due ${new Date(`${r.primary.plannedDate}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}. Fee {r.fee ? fmtINR(r.fee) : 'to be agreed'}.</p>
              <div className="acard-foot"><Pill tone="coral">{r.status}</Pill><Link href={perfHref} className="btn solid">Follow up<ArrowRight size={14} /></Link></div>
            </article>
          ))}
          {waiting.length > 0 && waitingProg && (
            <article className="acard t-purple">
              <span className="eyebrow">{waitingProg.name}</span>
              <h3>{waiting.length} creator{waiting.length === 1 ? '' : 's'} waiting on you</h3>
              <p>Applications and counter-offers are waiting for a reply. Creators move on if they wait too long.</p>
              <div className="acard-foot"><Pill tone="purple">{waitingProg.slots} slots</Pill><Link href={`/programmes/${waitingProg.id}?tab=creators`} className="btn solid">Review<ArrowRight size={14} /></Link></div>
            </article>
          )}
          {sum && sum.storiesAwaiting > 0 && (
            <article className="acard t-yellow">
              <span className="eyebrow">{live?.name}</span>
              <h3>{sum.storiesAwaiting} stories need screenshots</h3>
              <p>Story views are private to the creator and disappear after 24 hours. Ask for a screenshot to see the numbers.</p>
              <div className="acard-foot"><Pill tone="yellow">Private data</Pill><Link href={perfHref} className="btn solid">Request<ArrowRight size={14} /></Link></div>
            </article>
          )}
          {attention.map((a, i) => (
            <article key={a.campaign.id} className={`acard t-${a.tone}`} style={{ animationDelay: `${i * 50}ms` }} data-testid={`card-attention-${a.campaign.id}`}>
              <span className="eyebrow">{a.campaign.title}</span>
              <h3>{a.label}</h3>
              <p>{a.desc}</p>
              <div className="acard-foot">
                {a.due ? <Pill tone={a.tone}>{a.due}</Pill> : <span />}
                <Link href={a.href} className="btn solid">{a.cta}<ArrowRight size={14} /></Link>
              </div>
            </article>
          ))}
        </div>
        {!behind.length && !waiting.length && !attention.length && <Empty title="Nothing needs you right now">Every campaign is on track.</Empty>}
      </section>

      <section className="mt" aria-label="Active collaborations">
        <div className="sec-head"><h2>Active collaborations</h2><Link href="/campaigns" className="textlink">All collaborations<ArrowRight size={14} /></Link></div>
        {activeCollabs.length ? <div className="cgrid">{activeCollabs.map(({ c }, i) => <CampaignCard key={c.id} c={c} i={i} />)}</div> : <Empty title="No open collaborations">Invite a creator from the marketplace to start one.</Empty>}
        {activeCollabs.some(({ c }) => campaignOverdue(c)) && <p className="muted fine">Overdue collaborations are outlined in coral.</p>}
      </section>

      <section className="card mt" aria-label="Recent activity">
        <div className="card-head"><div><h3>Recent activity</h3><p className="muted">Newest first</p></div></div>
        {recent.length ? (
          <ol className="feed">
            {recent.map((a) => (
              <li key={a.id}><i /><div><span className="feed-t">{ago(a.timestamp)}{a.example && ' · example history'}</span>
                <p><b>{a.actor}</b> {a.message}</p>
                {campaignById(a.campaignId) && <Link href={`/campaigns/${a.campaignId}?tab=activity`} className="textlink">{campaignById(a.campaignId)?.title}</Link>}</div></li>
            ))}
          </ol>
        ) : <Empty title="No activity yet">Changes you make will appear here.</Empty>}
      </section>
    </>
  );
}

