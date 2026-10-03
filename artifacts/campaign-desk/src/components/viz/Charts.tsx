import { useEffect, useState, type ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { shortDate } from '@/domain/format';

export function useReducedMotion() {
  const [r, setR] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const h = () => setR(m.matches);
    m.addEventListener('change', h);
    return () => m.removeEventListener('change', h);
  }, []);
  return r;
}

export function ChartFrame({ title, sub, demo, summary, children, className = '' }: { title: string; sub?: string; demo?: boolean; summary: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card chart-frame ${className}`} aria-label={title}>
      <div className="card-head">
        <div><h3>{title}</h3>{sub && <p className="muted">{sub}</p>}</div>
        {demo && <span className="demo-tag">Demo data</span>}
      </div>
      <div role="img" aria-label={`${title}. ${summary}`}>{children}</div>
      <p className="sr-only">{summary}</p>
    </section>
  );
}

export function ZeroState({ children }: { children: ReactNode }) {
  return <div className="chart-zero">{children}</div>;
}

const tip = { borderRadius: 12, border: '1px solid #ece6da', fontSize: 12, boxShadow: '0 8px 24px rgba(40,30,80,.12)' };
const tick = { fontSize: 11, fill: '#7a7694' };

export interface Series { key: string; label: string; color: string }

export function TrendChart({ data, series, unit = '', area = false, height = 240 }: { data: Record<string, number | string>[]; series: Series[]; unit?: string; area?: boolean; height?: number }) {
  const reduced = useReducedMotion();
  const zero = !data.length || data.every((d) => series.every((s) => !Number(d[s.key])));
  if (zero) return <ZeroState>No values recorded in this range.</ZeroState>;
  const common = { data, margin: { top: 8, right: 8, left: 0, bottom: 0 } };
  const axes = [
    <CartesianGrid key="grid" stroke="#efe9de" vertical={false} />,
    <XAxis key="dates" dataKey="date" tick={tick} tickLine={false} axisLine={false} tickFormatter={shortDate} minTickGap={24} />,
    <YAxis key="values" tick={tick} tickLine={false} axisLine={false} unit={unit} width={50} allowDecimals={unit === '%'} domain={[0, 'auto']} />,
    <Tooltip key="tooltip" contentStyle={tip} labelFormatter={(l) => shortDate(String(l))} formatter={(v: number, n: string) => [`${v}${unit}`, n]} />,
    <Legend key="legend" iconType="circle" wrapperStyle={{ fontSize: 12 }} />,
  ];
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {area ? (
          <AreaChart {...common}>
            <defs>{series.map((s) => <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={s.color} stopOpacity={0.28} /><stop offset="1" stopColor={s.color} stopOpacity={0} /></linearGradient>)}</defs>
            {axes}
            {series.map((s) => <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2.5} fill={`url(#g-${s.key})`} isAnimationActive={!reduced} animationDuration={350} />)}
          </AreaChart>
        ) : (
          <LineChart {...common}>
            {axes}
            {series.map((s) => <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={!reduced} animationDuration={350} />)}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function Spark({ data, k, color }: { data: Record<string, number | string>[]; k: string; color: string }) {
  const reduced = useReducedMotion();
  if (!data.length) return null;
  return (
    <div className="spark" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <Area type="monotone" dataKey={k} stroke={color} strokeWidth={2} fill={color} fillOpacity={0.14} isAnimationActive={!reduced} animationDuration={350} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({ data, centre }: { data: { name: string; value: number; color: string }[]; centre: string }) {
  const reduced = useReducedMotion();
  const total = data.reduce((a, d) => a + d.value, 0);
  if (!total) return <ZeroState>No campaigns to chart yet.</ZeroState>;
  return (
    <div className="donut">
      <div className="donut-chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={3} cornerRadius={6} stroke="none" isAnimationActive={!reduced} animationDuration={350} animationBegin={0}>
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip contentStyle={tip} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-centre"><b>{total}</b><span>{centre}</span></div>
      </div>
      <ul className="legend">{data.map((d) => <li key={d.name}><i style={{ background: d.color }} />{d.name}<b>{d.value}</b></li>)}</ul>
    </div>
  );
}

export function Bars({ data, series, height = 240 }: { data: Record<string, number | string>[]; series: Series[]; height?: number }) {
  const reduced = useReducedMotion();
  if (!data.length || data.every((d) => series.every((s) => !Number(d[s.key])))) return <ZeroState>No open tasks assigned.</ZeroState>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={4}>
          <CartesianGrid stroke="#efe9de" vertical={false} />
          <XAxis dataKey="name" tick={tick} tickLine={false} axisLine={false} tickFormatter={(n: string) => n.split(' ')[0]} />
          <YAxis tick={tick} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={tip} cursor={{ fill: '#f4efe6' }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          {series.map((s) => <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[6, 6, 0, 0]} maxBarSize={28} isAnimationActive={!reduced} animationDuration={350} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
