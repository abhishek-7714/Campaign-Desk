import { useMemo, useState } from 'react';
import { CheckCircle2, Download, Lock, ShoppingBag } from 'lucide-react';
import { CreatorCell, Meter, Stat } from '@/components/shared';
import { ConnectShopifyDialog } from '@/components/integrations';
import { slug } from '@/domain/helpers';
import { downloadText, summarize } from '@/domain/performance';
import { fmtFull, fmtINR, fmtINRShort, fmtNum, fmtPct } from '@/domain/money';
import { useStore } from '@/state/store';
import '@/styles/performance.css';
import { RevenueBars } from './perf/Charts';
import { CopyButton } from './perf/cells';
import { csvCell, shortTracking, trackingLink } from './perf/model';

const dash = <span className="muted-cell">-</span>;

export default function SalesTab({ programmeId, readOnly = false }: { programmeId: string; readOnly?: boolean }) {
  const { programmeById, gridRows, integrations, setIntegration, workspaceName, notify } = useStore();
  const programme = programmeById(programmeId);
  const rows = useMemo(() => gridRows(programmeId), [gridRows, programmeId]);
  const [connect, setConnect] = useState(false);
  const on = integrations.shopify;
  const sum = useMemo(() => (programme ? summarize(rows, programme) : null), [rows, programme]);

  const sorted = useMemo(() => (on ? [...rows].sort((a, b) => (b.revenue ?? -1) - (a.revenue ?? -1)) : rows), [rows, on]);
  const totals = useMemo(() => ({
    clicks: rows.reduce((a, r) => a + (r.clicks ?? 0), 0),
    orders: rows.reduce((a, r) => a + (r.orders ?? 0), 0),
    revenue: rows.reduce((a, r) => a + (r.revenue ?? 0), 0),
  }), [rows]);

  if (!programme || !sum) return <div className="empty-card"><strong>Campaign not found</strong><p>This campaign may have been removed.</p></div>;

  const link = (code: string, handle: string) => trackingLink(code, programme, handle);
  const store = `${workspaceName.replace(/[^A-Za-z0-9]+/g, '').toLowerCase()}.myshopify.com`;
  const download = () => {
    const head = ['Creator', 'Handle', 'Discount code', 'Tracking link'];
    const lines = rows.map((r) => [r.creator.name, `@${r.creator.handle}`, r.code, r.code ? link(r.code, r.creator.handle) : ''].map(csvCell).join(','));
    downloadText(`${slug(programme.name)}-codes.csv`, [head.join(','), ...lines].join('\n'));
  };
  const lockedCell = <span className="pf-locked-cell" title="Connect Shopify to see this"><Lock size={12} />Locked</span>;
  const conv = on && totals.clicks ? (totals.orders / totals.clicks) * 100 : null;

  return (
    <div className="pf">
      <section className={`pf-shop ${on ? 't-green' : 't-neutral'}`} aria-label="Shopify connection">
        <span className="pf-shop-ico"><ShoppingBag size={20} /></span>
        <div className="pf-shop-main">
          {on ? (
            <>
              <b>Shopify connected <CheckCircle2 size={14} style={{ verticalAlign: '-2px' }} /></b>
              <span>{store}. Sample data for this prototype: no real store is connected.</span>
            </>
          ) : (
            <>
              <b>Shopify is not connected</b>
              <span>Connect your store to see clicks, orders, revenue and return on spend for each creator&apos;s code and link.</span>
            </>
          )}
        </div>
        {!readOnly && (on
          ? <button type="button" className="link-btn" onClick={() => setIntegration('shopify', false)}>Disconnect</button>
          : <button type="button" className="btn primary" onClick={() => setConnect(true)}><ShoppingBag size={15} />Connect Shopify</button>)}
      </section>

      <div className="stats pf-stats">
        <Stat label="Orders" tone="mint" value={on ? fmtFull(sum.orders ?? 0) : '-'} sub={on ? 'through creator codes and links' : 'Needs Shopify'} />
        <Stat label="Revenue" tone="purple" value={on ? fmtINRShort(sum.revenue ?? 0) : '-'} sub={on ? fmtINR(sum.revenue ?? 0) : 'Needs Shopify'} />
        <Stat label="Return on spend" tone={sum.roas === null ? 'neutral' : sum.roas >= 1 ? 'green' : 'yellow'} value={sum.roas === null ? '-' : `${sum.roas.toFixed(1)}x`} sub="revenue per rupee of fees, live posts" />
        <Stat label="Link clicks" tone="blue" value={on ? fmtNum(totals.clicks) : '-'} sub={conv === null ? 'Needs Shopify' : `${fmtPct(conv, 1)} of clicks became orders`} />
      </div>

      <RevenueBars rows={rows} connected={on} />

      <section className="card" aria-label="Codes and links">
        <div className="pf-codes-head">
          <div><h3>Codes and links</h3><p className="muted fine">Each creator has one discount code and one tracking link.</p></div>
          <button type="button" className="btn" onClick={download}><Download size={15} />Download codes (CSV)</button>
        </div>
        <div className="dt-wrap pf-wrap" role="region" aria-label="Codes and links, scrolls sideways" tabIndex={0} style={{ ['--dt-max' as string]: '70vh' }}>
          <table className="dt pf-table pf-codes">
            <thead>
              <tr>
                <th scope="col" className="sticky-col">Creator</th>
                <th scope="col">Discount code</th>
                <th scope="col">Tracking link</th>
                <th scope="col" className="num">Clicks</th>
                <th scope="col" className="num">Orders</th>
                <th scope="col" className="num">Revenue</th>
                <th scope="col" className="num">Return on spend</th>
                <th scope="col" className="num">Share of revenue</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const share = on && totals.revenue && r.revenue !== null ? (r.revenue / totals.revenue) * 100 : null;
                const url = r.code ? link(r.code, r.creator.handle) : '';
                return (
                  <tr key={r.collab.id}>
                    <td className="sticky-col"><CreatorCell creator={r.creator} /></td>
                    <td>{r.code ? <CopyButton text={r.code} label={`Copy code ${r.code}`} onCopied={() => notify(`Code ${r.code} copied`)}><code>{r.code}</code></CopyButton> : dash}</td>
                    <td>{url ? <span className="pf-link"><code title={url}>{shortTracking(r.code)}</code><CopyButton text={url} label={`Copy tracking link for ${r.creator.name}`} onCopied={() => notify('Tracking link copied')} /></span> : dash}</td>
                    <td className="num">{on ? (r.clicks === null ? dash : fmtFull(r.clicks)) : lockedCell}</td>
                    <td className="num">{on ? (r.orders === null ? dash : fmtFull(r.orders)) : lockedCell}</td>
                    <td className="num">{on ? (r.revenue === null ? dash : fmtINR(r.revenue)) : lockedCell}</td>
                    <td className="num">{on ? (r.roas === null ? dash : `${r.roas.toFixed(1)}x`) : lockedCell}</td>
                    <td className="num">{on ? (share === null ? dash : <span className="pf-share"><Meter value={share} tone="purple" label={`${Math.round(share)} percent of revenue`} />{fmtPct(share)}</span>) : lockedCell}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="sticky-col">Total</td><td /><td />
                <td className="num">{on ? fmtFull(totals.clicks) : dash}</td>
                <td className="num">{on ? fmtFull(totals.orders) : dash}</td>
                <td className="num">{on ? fmtINR(totals.revenue) : dash}</td>
                <td className="num">{sum.roas === null ? dash : `${sum.roas.toFixed(1)}x`}</td>
                <td className="num">{on ? '100%' : dash}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {!on && !readOnly && <p className="pf-sales-note" style={{ marginTop: 12 }}>Sales columns are locked. <button type="button" className="link-btn" onClick={() => setConnect(true)}>Connect Shopify</button> to fill them in.</p>}
      </section>

      <p className="pf-sales-note">Orders from Blinkit, Amazon and stores are not attributed to creators. Codes and links only track your own website.</p>
      {connect && <ConnectShopifyDialog onClose={() => setConnect(false)} />}
    </div>
  );
}
