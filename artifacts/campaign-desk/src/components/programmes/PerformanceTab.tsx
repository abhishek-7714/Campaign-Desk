import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Instagram, Loader2, Lock, Plus, RefreshCw, Search, Send, ShoppingBag } from 'lucide-react';
import { SourceLegend, Stat } from '@/components/shared';
import { ConnectInstagramDialog, ConnectShopifyDialog } from '@/components/integrations';
import { ago } from '@/domain/format';
import { slug } from '@/domain/helpers';
import { deliveryTone, downloadText, gridToCSV, programmeInsights, summarize } from '@/domain/performance';
import { fmtINR, fmtINRShort, fmtNum, fmtPct } from '@/domain/money';
import { TIERS, type Tier } from '@/domain/types';
import { useStore } from '@/state/store';
import '@/styles/performance.css';
import AddLinksDialog from './perf/AddLinksDialog';
import { DeliveryBars, ViewsOverTime } from './perf/Charts';
import ColumnPicker from './perf/ColumnPicker';
import Grid from './perf/Grid';
import PostDrawer, { UnlockDrawer } from './perf/PostDrawer';
import StoriesPanel from './perf/StoriesPanel';
import { DEFAULT_COLS, SALES_COLS, fmtMillions, matchesStatus, type ColKey, type StatusFilter } from './perf/model';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'live', label: 'Live' }, { key: 'late', label: 'Late' }, { key: 'missed', label: 'Missed' },
  { key: 'planned', label: 'Planned' }, { key: 'under', label: 'Under 70%' }, { key: 'over', label: 'Over 100%' },
];
const DOT = { good: 't-green', warn: 't-yellow', bad: 't-coral', info: 't-blue' } as const;

export default function PerformanceTab({ programmeId, readOnly = false }: { programmeId: string; readOnly?: boolean }) {
  const store = useStore();
  const { programmeById, gridRows, integrations, refreshProgramme, requestInsights, setIntegration, notify } = store;
  const programme = programmeById(programmeId);
  const allRows = useMemo(() => gridRows(programmeId), [gridRows, programmeId]);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [size, setSize] = useState<'All' | Tier>('All');
  const [picked, setPicked] = useState<Set<ColKey>>(() => new Set(DEFAULT_COLS));
  const [openId, setOpenId] = useState<string | null>(null);
  const [unlockId, setUnlockId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'links' | 'instagram' | 'shopify' | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const cols = useMemo(() => {
    const n = new Set(picked);
    if (!integrations.shopify) SALES_COLS.forEach((k) => n.delete(k));
    return n;
  }, [picked, integrations.shopify]);

  const scoped = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/^@/, '');
    return allRows.filter((r) => (size === 'All' || r.creator.tier === size)
      && (!needle || r.creator.name.toLowerCase().includes(needle) || r.creator.handle.toLowerCase().includes(needle)));
  }, [allRows, q, size]);
  const rows = useMemo(() => scoped.filter((r) => matchesStatus(r, status)), [scoped, status]);
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.key, scoped.filter((r) => matchesStatus(r, f.key)).length])) as Record<StatusFilter, number>, [scoped]);

  const summary = useMemo(() => (programme ? summarize(allRows, programme) : null), [allRows, programme]);
  const insights = useMemo(() => (programme ? programmeInsights(allRows, programme) : []), [allRows, programme]);
  const lockedToRequest = useMemo(() => allRows.filter((r) => r.status === 'Live' && r.locked && r.primary && !r.primary.insightRequested), [allRows]);
  const lockedLive = useMemo(() => allRows.filter((r) => r.status === 'Live' && r.locked).length, [allRows]);
  const newest = useMemo(() => allRows.map((r) => r.lastRefreshed).filter(Boolean).sort().slice(-1)[0] ?? '', [allRows]);

  if (!programme || !summary) return <div className="empty-card"><strong>Campaign not found</strong><p>This campaign may have been removed.</p></div>;

  const openRow = openId ? allRows.find((r) => r.collab.id === openId) : undefined;
  const unlockRow = unlockId ? allRows.find((r) => r.collab.id === unlockId) : undefined;
  const plan = programme.ratePer1000;
  const hasShop = summary.revenue !== null;
  const refresh = () => {
    if (refreshing) return;
    setRefreshing(true); refreshProgramme(programmeId);
    timer.current = window.setTimeout(() => setRefreshing(false), 1000);
  };
  const connectIg = () => { setOpenId(null); setUnlockId(null); setDialog('instagram'); };
  const requestAll = () => {
    lockedToRequest.forEach((r) => r.primary && requestInsights(r.primary.id));
    notify(`Requested reach, saves and shares from ${lockedToRequest.length} creator${lockedToRequest.length === 1 ? '' : 's'}`);
  };
  const agoText = newest ? ago(newest) : '';
  const refreshed = agoText ? `Last refreshed ${agoText[0].toLowerCase()}${agoText.slice(1)}` : 'Not refreshed yet';

  return (
    <div className="pf">
      <div className="stats pf-stats">
        <Stat label="Views delivered" tone={deliveryTone(summary.deliveryPct)} value={summary.deliveryPct === null ? '-' : fmtPct(summary.deliveryPct)}
          sub={summary.live ? `${fmtMillions(summary.views)} of ${fmtMillions(summary.expectedViews)} views paid for` : 'No posts live yet'} />
        <Stat label="Cost per 1,000 views" tone={summary.costPer1000 === null ? 'neutral' : summary.costPer1000 <= plan ? 'green' : 'yellow'}
          value={summary.costPer1000 === null ? '-' : fmtINR(summary.costPer1000)} sub={`plan ${fmtINR(plan)}`} />
        <Stat label="Spend" tone="purple" value={fmtINRShort(summary.spend)} sub={`of ${fmtINRShort(summary.budget)} budget`} />
        <Stat label="Posts" tone="blue" value={`${summary.live} live`}
          sub={[summary.fetching ? `${summary.fetching} fetching` : '', `${summary.late} late`, `${summary.missed} missed`, `${summary.planned} planned`].filter(Boolean).join(' · ')} />
        {hasShop ? (
          <Stat label="Revenue" tone="mint" value={fmtINRShort(summary.revenue ?? 0)} sub={`${fmtNum(summary.orders ?? 0)} orders from codes and links`} />
        ) : (
          <Stat label="Revenue" tone="neutral" value="-"
            sub={readOnly ? 'Shopify not connected' : <button type="button" className="btn small" onClick={() => setDialog('shopify')}><ShoppingBag size={13} />Connect Shopify</button>} />
        )}
        <Stat label="Return on spend" tone={summary.roas === null ? 'neutral' : summary.roas >= 1 ? 'green' : 'yellow'}
          value={summary.roas === null ? '-' : `${summary.roas.toFixed(1)}x`} sub={summary.roas === null ? 'Needs Shopify' : 'revenue per rupee of fees, live posts'} />
      </div>

      <section className="card pf-insights" aria-label="Insights">
        <div className="card-head"><div><h3>What the numbers say</h3><p className="muted">Plain observations from the figures below. Sample data.</p></div></div>
        <ul>
          {insights.map((s) => <li key={s.text}><span className={`pf-dot ${DOT[s.tone]}`} aria-hidden="true" />{s.text}</li>)}
        </ul>
      </section>

      <div className="grid-2 pf-charts">
        <ViewsOverTime rows={allRows} />
        <DeliveryBars rows={allRows} />
      </div>

      <section className="pf-gridsec" aria-label="Performance by creator">
        <div className="toolbar pf-toolbar">
          <div className="toolbar-group">
            <label className="search-field"><span className="sr-only">Search creators</span><Search size={15} aria-hidden="true" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search creator or handle" /></label>
            <label className="field-inline">Size
              <select value={size} onChange={(e) => setSize(e.target.value as 'All' | Tier)}>
                <option value="All">All</option>{TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <ColumnPicker cols={picked} onChange={setPicked} salesOn={integrations.shopify} />
          </div>
          <div className="toolbar-group">
            {!readOnly && <button type="button" className="btn primary" onClick={() => setDialog('links')}><Plus size={15} />Add post links</button>}
            {!readOnly && <button type="button" className="btn" onClick={refresh} disabled={refreshing}>{refreshing ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />}Refresh now</button>}
            <span className="muted fine pf-fresh" aria-live="polite">{refreshed}</span>
            <button type="button" className="btn" onClick={() => downloadText(`${slug(programme.name)}-performance.csv`, gridToCSV(rows))}><Download size={15} />Export CSV</button>
            {!readOnly && (integrations.instagram ? (
              <span className="pf-ig"><span className="pill t-green"><i />Instagram connected</span><button type="button" className="link-btn" onClick={() => setIntegration('instagram', false)}>Disconnect</button></span>
            ) : <button type="button" className="btn" onClick={() => setDialog('instagram')}><Instagram size={15} />Connect Instagram</button>)}
          </div>
        </div>

        <div className="chips pf-chips" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" className={`chip ${status === f.key ? 'on' : ''}`} aria-pressed={status === f.key} onClick={() => setStatus(f.key)}>{f.label}<span>{counts[f.key]}</span></button>
          ))}
        </div>

        {!readOnly && lockedToRequest.length > 0 && (
          <div className="pf-lockbar">
            <Lock size={15} />
            <span>{lockedLive} live post{lockedLive === 1 ? ' has' : 's have'} locked reach, saves and shares.</span>
            <button type="button" className="btn small" onClick={requestAll}><Send size={13} />Request from all {lockedToRequest.length} locked creator{lockedToRequest.length === 1 ? '' : 's'}</button>
          </div>
        )}

        <SourceLegend />
        <Grid rows={rows} programme={programme} cols={cols} readOnly={readOnly} onOpen={setOpenId} onUnlock={setUnlockId} />
        <p className="muted fine">Delivery is views so far against the views each fee was priced on. Cost per 1,000 is fee divided by views. All numbers are sample data.</p>
      </section>

      <StoriesPanel rows={allRows} readOnly={readOnly} />

      {openRow && <PostDrawer row={openRow} readOnly={readOnly} plan={plan} onClose={() => setOpenId(null)} onConnectInstagram={connectIg} />}
      {unlockRow && !openRow && <UnlockDrawer row={unlockRow} readOnly={readOnly} onClose={() => setUnlockId(null)} onConnectInstagram={connectIg} />}
      {dialog === 'links' && <AddLinksDialog rows={allRows} onClose={() => setDialog(null)} />}
      {dialog === 'instagram' && <ConnectInstagramDialog who="brand" onClose={() => setDialog(null)} />}
      {dialog === 'shopify' && <ConnectShopifyDialog onClose={() => setDialog(null)} />}
    </div>
  );
}
