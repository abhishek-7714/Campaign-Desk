import { useMemo } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartFrame, ZeroState, useReducedMotion } from '@/components/viz/Charts';
import { shortDate } from '@/domain/format';
import { deliveryTone, type GridRow } from '@/domain/performance';
import { fmtFull, fmtINR, fmtINRShort, fmtNum } from '@/domain/money';
import { cumulativeViews, snapshotSeries } from './model';

const TIP = { borderRadius: 12, border: '1px solid #dfe6e9', fontSize: 12, boxShadow: '0 8px 24px rgba(16,34,43,.12)' };
const TICK = { fontSize: 11, fill: '#5b6d77' };
export const TONE_FILL = { green: '#2f9a63', yellow: '#d49a12', coral: '#e0594a', neutral: '#8a9ba3' } as const;

/** Total public views of every live Reel, by date. */
export function ViewsOverTime({ rows }: { rows: GridRow[] }) {
  const reduced = useReducedMotion();
  const data = useMemo(() => cumulativeViews(rows), [rows]);
  const liveN = rows.filter((r) => r.status === 'Live').length;
  const first = data[0]; const last = data[data.length - 1];
  const summary = last ? `Public views across ${liveN} live posts grew from ${fmtFull(first.views)} on ${shortDate(first.date)} to ${fmtFull(last.views)} on ${shortDate(last.date)}.` : 'No posts are live yet, so there are no views to chart.';
  return (
    <ChartFrame title="Views over time" sub="Public views of all live posts, added together" summary={summary}>
      {data.length < 2 ? <ZeroState>Views will chart here once posts are live.</ZeroState> : (
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs><linearGradient id="pf-views-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b23c00" stopOpacity={0.28} /><stop offset="1" stopColor="#b23c00" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="#e2e9ec" vertical={false} />
              <XAxis dataKey="date" tick={TICK} tickLine={false} axisLine={false} tickFormatter={shortDate} minTickGap={28} />
              <YAxis tick={TICK} tickLine={false} axisLine={false} width={48} domain={[0, 'auto']} tickFormatter={(v: number) => fmtNum(v)} />
              <Tooltip contentStyle={TIP} labelFormatter={(l) => shortDate(String(l))} formatter={(v: number) => [fmtFull(v), 'Public views']} />
              <Area type="monotone" dataKey="views" name="Public views" stroke="#b23c00" strokeWidth={2.5} fill="url(#pf-views-g)" isAnimationActive={!reduced} animationDuration={350} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartFrame>
  );
}

/** Share of paid-for views each creator delivered. Top 12, with a line at 100%. */
export function DeliveryBars({ rows }: { rows: GridRow[] }) {
  const reduced = useReducedMotion();
  const all = useMemo(() => rows.filter((r) => r.deliveryPct !== null).sort((a, b) => (b.deliveryPct ?? 0) - (a.deliveryPct ?? 0)), [rows]);
  const data = useMemo(() => all.slice(0, 12).map((r) => ({
    name: r.creator.name, pct: Math.round(r.deliveryPct ?? 0), fill: TONE_FILL[deliveryTone(r.deliveryPct)],
  })), [all]);
  const n = (t: string) => all.filter((r) => deliveryTone(r.deliveryPct) === t).length;
  const top = all[0]; const bottom = all[all.length - 1];
  const summary = all.length
    ? `${n('green')} creators at or above 100% of expected views, ${n('yellow')} between 70% and 99%, ${n('coral')} under 70%. Highest: ${top.creator.name} at ${Math.round(top.deliveryPct ?? 0)}%. Lowest: ${bottom.creator.name} at ${Math.round(bottom.deliveryPct ?? 0)}%.${all.length > 12 ? ' The chart shows the top 12.' : ''}`
    : 'No live posts yet, so delivery cannot be charted.';
  const max = Math.max(120, Math.ceil(Math.max(...data.map((d) => d.pct), 0) / 20) * 20);
  return (
    <ChartFrame title="Delivery by creator" sub="Views delivered as a share of views paid for" summary={summary}>
      {!data.length ? <ZeroState>Delivery will chart here once posts are live.</ZeroState> : (
        <div style={{ height: Math.max(180, data.length * 26 + 36) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, left: 4, bottom: 0 }} barCategoryGap={5}>
              <CartesianGrid stroke="#e2e9ec" horizontal={false} />
              <XAxis type="number" domain={[0, max]} tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={104} tick={TICK} tickLine={false} axisLine={false} tickFormatter={(s: string) => (s.length > 15 ? `${s.slice(0, 14)}…` : s)} interval={0} />
              <Tooltip contentStyle={TIP} cursor={{ fill: '#eaf0f2' }} formatter={(v: number) => [`${v}%`, 'Delivered']} />
              <ReferenceLine x={100} stroke="#10222b" strokeDasharray="4 3" label={{ value: '100% paid for', position: 'insideTopRight', fontSize: 10, fill: '#44585f' }} />
              <Bar dataKey="pct" name="Delivered" radius={[0, 6, 6, 0]} barSize={16} isAnimationActive={!reduced} animationDuration={350}>
                {data.map((d) => <Cell key={d.name} fill={d.fill} />)}
                <LabelList dataKey="pct" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fill: '#44585f' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartFrame>
  );
}

/** One post's daily public views, for the drawer. */
export function PostViewsChart({ row }: { row: GridRow }) {
  const reduced = useReducedMotion();
  const data = useMemo(() => snapshotSeries(row.primary), [row.primary]);
  if (data.length < 2) return null;
  const last = data[data.length - 1];
  return (
    <div role="img" aria-label={`Daily public views for ${row.creator.name}. ${fmtFull(last.views)} views as of ${shortDate(last.date)}.`} style={{ height: 130 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
          <defs><linearGradient id="pf-post-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b6fe0" stopOpacity={0.3} /><stop offset="1" stopColor="#3b6fe0" stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid stroke="#e2e9ec" vertical={false} />
          <XAxis dataKey="date" tick={TICK} tickLine={false} axisLine={false} tickFormatter={shortDate} minTickGap={24} />
          <YAxis tick={TICK} tickLine={false} axisLine={false} width={40} domain={[0, 'auto']} tickFormatter={(v: number) => fmtNum(v)} />
          <Tooltip contentStyle={TIP} labelFormatter={(l) => shortDate(String(l))} formatter={(v: number) => [fmtFull(v), 'Views']} />
          <Area type="monotone" dataKey="views" stroke="#3b6fe0" strokeWidth={2} fill="url(#pf-post-g)" isAnimationActive={!reduced} animationDuration={300} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Revenue by creator, top 10. Used by the Sales tab. */
export function RevenueBars({ rows, connected }: { rows: GridRow[]; connected: boolean }) {
  const reduced = useReducedMotion();
  const data = useMemo(() => rows.filter((r) => (r.revenue ?? 0) > 0).sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0)).slice(0, 10).map((r) => ({ name: r.creator.name, revenue: r.revenue ?? 0 })), [rows]);
  const summary = data.length ? `Top ${data.length} creators by revenue. Highest: ${data[0].name} at ${fmtINR(data[0].revenue)}.` : connected ? 'No sales are attributed to creators yet.' : 'Shopify is not connected, so there is no revenue to chart.';
  return (
    <ChartFrame title="Revenue by creator" sub="Orders through codes and links, top 10" summary={summary}>
      {!data.length ? <ZeroState>{connected ? 'No attributed sales yet.' : 'Connect Shopify to see revenue by creator.'}</ZeroState> : (
        <div style={{ height: Math.max(180, data.length * 28 + 36) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 52, left: 4, bottom: 0 }} barCategoryGap={5}>
              <CartesianGrid stroke="#e2e9ec" horizontal={false} />
              <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtINRShort(v)} />
              <YAxis type="category" dataKey="name" width={104} tick={TICK} tickLine={false} axisLine={false} tickFormatter={(s: string) => (s.length > 15 ? `${s.slice(0, 14)}…` : s)} interval={0} />
              <Tooltip contentStyle={TIP} cursor={{ fill: '#eaf0f2' }} formatter={(v: number) => [fmtINR(v), 'Revenue']} />
              <Bar dataKey="revenue" name="Revenue" fill="#1593a8" radius={[0, 6, 6, 0]} barSize={16} isAnimationActive={!reduced} animationDuration={350}>
                <LabelList dataKey="revenue" position="right" formatter={(v: number) => fmtINRShort(v)} style={{ fontSize: 11, fill: '#44585f' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartFrame>
  );
}
