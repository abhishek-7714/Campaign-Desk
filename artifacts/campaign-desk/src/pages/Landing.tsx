import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, Lock } from 'lucide-react';
import { useStore } from '@/state/store';
import { Logo } from '@/components/Logo';
import { CreatorAvatar, CreatorCell, SourceBadge, Stat, TierBadge } from '@/components/shared';
import { deliveryTone, summarize } from '@/domain/performance';
import { fmtINR, fmtINRShort, fmtNum, fmtPct } from '@/domain/money';
import type { Role } from '@/domain/types';
import '@/styles/landing.css';

const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });

export default function Landing() {
  const { signIn, workspaceName, actingCreator, brandProgrammes, gridRows } = useStore();
  const [, navigate] = useLocation();
  const live = brandProgrammes.find((p) => p.status === 'Live') ?? brandProgrammes[0];
  const rows = useMemo(() => (live ? gridRows(live.id) : []), [live, gridRows]);
  const sum = live ? summarize(rows, live) : null;
  const sample = useMemo(() => rows.filter((r) => r.status === 'Live' && r.deliveryPct !== null).sort((a, b) => (b.deliveryPct ?? 0) - (a.deliveryPct ?? 0)), [rows]);
  const shown = [...sample.slice(0, 3), ...sample.slice(-2)];

  const enter = (r: Role) => { signIn(r); navigate(r === 'creator' ? '/creator' : '/'); window.scrollTo({ top: 0 }); };

  return (
    <div className="app-shell ln">
      <header className="ln-nav">
        <div className="ln-wrap ln-nav-in">
          <Logo size={34} />
          <button className="btn" onClick={() => goTo('demo')}>Log in</button>
        </div>
      </header>

      <main>
        <div className="ln-band">
        <section className="ln-hero ln-wrap" aria-labelledby="ln-h1">
          <div className="ln-hero-copy">
            <h1 id="ln-h1">See what every creator post <span>delivered.</span></h1>
            <p className="ln-lead">Find nano and micro creators, run campaigns, and check each post against the views you paid for.</p>
          </div>

          <section className="ln-login" id="demo" aria-labelledby="ln-login-h">
            <h2 id="ln-login-h">Log in to the demo</h2>
            <p className="ln-login-sub">Two demo accounts. Pick one to look around. No password needed.</p>

            <div className="ln-acct">
              <span className="ln-brand-tile" aria-hidden="true">{workspaceName.slice(0, 1)}</span>
              <div className="ln-acct-t">
                <b>Meera Nair</b>
                <span>Brand · {workspaceName}</span>
                <code>meera@riseoats.demo</code>
              </div>
              <button className="btn primary" onClick={() => enter('brand')} data-testid="login-brand">Log in</button>
              <p>See campaign results, browse creators and review applicants.</p>
            </div>

            <div className="ln-acct">
              <CreatorAvatar creator={actingCreator} size={48} />
              <div className="ln-acct-t">
                <b>{actingCreator.name}</b>
                <span>Creator · @{actingCreator.handle}</span>
                <code>ananya@ananya.demo</code>
              </div>
              <button className="btn solid" onClick={() => enter('creator')} data-testid="login-creator">Log in</button>
              <p>See invitations and open campaigns, then submit posts and track payment.</p>
            </div>

            <p className="ln-proto">Prototype. All numbers are sample data.</p>
          </section>
        </section>
        </div>

        <section className="ln-sec ln-wrap" id="product" aria-labelledby="ln-product-h">
          <h2 id="ln-product-h" className="ln-h2">One screen shows what you paid for and what arrived.</h2>
          <div className="ln-product">
            <div className="ln-glimpse" role="img" aria-label="Preview of a campaign performance table built from sample data">
              {live && sum && (
                <>
                  <div className="ln-glimpse-head">
                    <div><b>{live.name}</b><span>{sum.creators} creators · {fmtINRShort(sum.spend)} spent</span></div>
                    <span className="pill t-blue"><i />Live</span>
                  </div>
                  <div className="ln-glimpse-stats">
                    <Stat label="Views delivered" value={sum.deliveryPct === null ? '-' : fmtPct(sum.deliveryPct)} sub={`${fmtNum(sum.views)} of ${fmtNum(sum.expectedViews)}`} tone={deliveryTone(sum.deliveryPct) === 'green' ? 'green' : 'yellow'} />
                    <Stat label="Cost per 1,000 views" value={sum.costPer1000 ? fmtINR(sum.costPer1000) : '-'} sub={`plan ${fmtINR(live.ratePer1000)}`} tone="peach" />
                    <Stat label="Sales via codes" value={sum.revenue !== null ? fmtINRShort(sum.revenue) : '-'} sub={sum.roas !== null ? `${sum.roas.toFixed(1)}x return` : undefined} tone="mint" />
                  </div>
                  <div className="dt-wrap ln-table">
                    <table className="dt">
                      <thead><tr><th>Creator</th><th className="num">Views</th><th className="num">Delivery</th><th className="num ln-hide-sm">Cost / 1,000</th><th className="ln-hide-sm">Reach</th></tr></thead>
                      <tbody>
                        {shown.map((r) => (
                          <tr key={r.collab.id}>
                            <td><CreatorCell creator={r.creator} size={30} sub={<TierBadge tier={r.creator.tier} />} /></td>
                            <td className="num">{fmtNum(r.views ?? 0)}</td>
                            <td className="num"><span className={`dchip t-${deliveryTone(r.deliveryPct)}`}>{fmtPct(r.deliveryPct ?? 0)}</span></td>
                            <td className="num ln-hide-sm">{r.costPer1000 ? fmtINR(r.costPer1000) : '-'}</td>
                            <td className="ln-hide-sm">{r.locked ? <SourceBadge source="locked" compact /> : <SourceBadge source={r.insightSource ?? 'creator-screenshot'} compact />}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="ln-glimpse-note">Sample data from the demo account.</p>
                </>
              )}
            </div>

            <ul className="ln-points">
              <li><h3>Paid versus delivered</h3><p>Each row compares views with the views you priced in, and shows the cost per 1,000.</p></li>
              <li><h3>A source on every number</h3><p>Public numbers come from the post page. Private ones stay locked until the creator shares them.</p></li>
              <li><h3>Sales from codes</h3><p>Every creator gets a discount code and a tracking link, so orders trace back to a post.</p></li>
            </ul>
          </div>
        </section>

        <section className="ln-sec ln-wrap" id="how" aria-labelledby="ln-sides-h">
          <h2 id="ln-sides-h" className="ln-h2">Built for both sides of the deal.</h2>
          <div className="ln-sides">
            <article className="ln-side ln-side-brand">
              <h3>Brands</h3>
              <ul>
                <li>Browse creators and compare them side by side.</li>
                <li>Invite with a fee worked out from your plan rate.</li>
                <li>Add post links and see results the same day.</li>
              </ul>
            </article>
            <article className="ln-side ln-side-creator">
              <h3>Creators</h3>
              <ul>
                <li>See invitations and open campaigns in one place.</li>
                <li>Know what to post and by when.</li>
                <li>Submit links, share story numbers and track payment.</li>
              </ul>
            </article>
          </div>
          <p className="ln-lock"><Lock size={15} aria-hidden="true" />Reach, saves and shares are private to creators, so nano.club shows them as locked until they arrive.</p>
        </section>
      </main>

      <footer className="ln-foot">
        <div className="ln-wrap ln-foot-in">
          <div>
            <Logo size={34} />
            <p>Small creators. Real numbers.</p>
          </div>
          <div className="ln-foot-cta">
            <button className="btn primary lg" onClick={() => goTo('demo')}>Log in<ArrowRight size={16} /></button>
            <small>Prototype with sample data. Nothing is collected from Instagram or Shopify.</small>
          </div>
        </div>
      </footer>
    </div>
  );
}
