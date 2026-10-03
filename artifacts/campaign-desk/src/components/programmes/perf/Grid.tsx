import { useMemo, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { CreatorCell, Meter, TierBadge } from '@/components/shared';
import { deliveryTone, summarize, type GridRow } from '@/domain/performance';
import type { Programme } from '@/domain/types';
import { fmtFull, fmtINR, fmtINRShort, fmtNum, fmtPct } from '@/domain/money';
import {
  AddLinkInline, CopyButton, FeeCell, PostLinkIcon, PrivateCell, Shimmer, Sparkline, StatusChip, StoriesChip,
} from './cells';
import { PRIVATE_COLS, sortRows, type ColKey, type SortDir, type SortKey } from './model';
import { useStore } from '@/state/store';

interface Col {
  id: string;
  label: string;
  sort?: SortKey;
  num?: boolean;
  show: boolean;
  cell: (r: GridRow) => ReactNode;
  foot?: ReactNode;
}

const dash = <span className="muted-cell">-</span>;
const INTERACTIVE = 'button,a,input,select,textarea,label,form';

export default function Grid({ rows, programme, cols, readOnly, onOpen, onUnlock }: {
  rows: GridRow[]; programme: Programme; cols: Set<ColKey>; readOnly: boolean;
  onOpen: (collabId: string) => void; onUnlock: (collabId: string) => void;
}) {
  const { notify } = useStore();
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'delivery', dir: 'desc' });
  const sorted = useMemo(() => sortRows(rows, sort.key, sort.dir), [rows, sort]);
  const sum = useMemo(() => summarize(rows, programme), [rows, programme]);
  const live = useMemo(() => rows.filter((r) => r.status === 'Live'), [rows]);
  const plan = programme.ratePer1000;
  const firstPrivate = PRIVATE_COLS.find((k) => cols.has(k));
  const sumOf = (f: (r: GridRow) => number | null) => live.reduce((a, r) => a + (f(r) ?? 0), 0);
  const hasSales = sum.orders !== null;

  const columns: Col[] = [
    {
      id: 'creator', label: 'Creator', sort: 'creator', show: true,
      cell: (r) => <span className="cell-flex"><CreatorCell creator={r.creator} /><TierBadge tier={r.creator.tier} /></span>,
      foot: <>Total, {live.length} live post{live.length === 1 ? '' : 's'}</>,
    },
    { id: 'status', label: 'Status', sort: 'status', show: true, cell: (r) => <StatusChip row={r} /> },
    { id: 'fee', label: 'Fee', sort: 'fee', num: true, show: true, cell: (r) => <FeeCell row={r} />, foot: fmtINR(sumOf((r) => r.fee)) },
    { id: 'expected', label: 'Expected views', sort: 'expected', num: true, show: true, cell: (r) => (r.expectedViews ? <span title={fmtFull(r.expectedViews)}>{fmtNum(r.expectedViews)}</span> : dash), foot: fmtNum(sum.expectedViews) },
    {
      id: 'views', label: 'Views', sort: 'views', num: true, show: cols.has('views'),
      cell: (r) => {
        if (r.status === 'Fetching') return <Shimmer w={64} />;
        if (r.status === 'Live') return <span className="cell-flex pf-end"><Sparkline row={r} /><b title={fmtFull(r.views ?? 0)}>{fmtNum(r.views ?? 0)}</b></span>;
        if (!readOnly && r.primary) return <AddLinkInline postId={r.primary.id} label={`Instagram link for ${r.creator.name}`} />;
        return dash;
      },
      foot: fmtNum(sum.views),
    },
    {
      id: 'delivery', label: 'Delivery', sort: 'delivery', num: true, show: true,
      cell: (r) => {
        if (r.status === 'Fetching') return <Shimmer w={56} />;
        if (r.deliveryPct === null) return dash;
        const tone = deliveryTone(r.deliveryPct);
        return (
          <span className="pf-deliv">
            <span className={`dchip t-${tone}`} title={`${fmtFull(r.views ?? 0)} of ${fmtFull(r.expectedViews)} expected views`}>{fmtPct(r.deliveryPct)}</span>
            <Meter value={Math.min(100, r.deliveryPct)} tone={tone} label={`${Math.round(r.deliveryPct)} percent of expected views delivered`} />
          </span>
        );
      },
      foot: sum.deliveryPct === null ? dash : <span className={`dchip t-${deliveryTone(sum.deliveryPct)}`}>{fmtPct(sum.deliveryPct)}</span>,
    },
    {
      id: 'cpm', label: 'Cost per 1,000', sort: 'cpm', num: true, show: true,
      cell: (r) => {
        if (r.status === 'Fetching') return <Shimmer w={52} />;
        if (r.costPer1000 === null || !r.fee) return <span className="muted-cell" title={r.fee ? undefined : 'No fee to compare'}>-</span>;
        return <span className={r.costPer1000 <= plan ? 'pf-good' : 'pf-warn'} title={`Plan is ${fmtINR(plan)} per 1,000 views`}>{fmtINR(r.costPer1000)}</span>;
      },
      foot: sum.costPer1000 === null ? dash : <span className={sum.costPer1000 <= plan ? 'pf-good' : 'pf-warn'}>{fmtINR(sum.costPer1000)}</span>,
    },
    { id: 'likes', label: 'Likes', sort: 'likes', num: true, show: cols.has('likes'), cell: (r) => (r.status === 'Fetching' ? <Shimmer /> : r.likes === null ? dash : fmtNum(r.likes)), foot: fmtNum(sumOf((r) => r.likes)) },
    { id: 'comments', label: 'Comments', sort: 'comments', num: true, show: cols.has('comments'), cell: (r) => (r.status === 'Fetching' ? <Shimmer /> : r.comments === null ? dash : fmtNum(r.comments)), foot: fmtNum(sumOf((r) => r.comments)) },
    { id: 'engagement', label: 'Engagement', sort: 'engagement', num: true, show: cols.has('engagement'), cell: (r) => (r.status === 'Fetching' ? <Shimmer /> : r.engagement === null ? dash : fmtPct(r.engagement, 1)) },
    ...(['reach', 'saves', 'shares'] as const).map((k): Col => ({
      id: k, label: k[0].toUpperCase() + k.slice(1), sort: k, num: true, show: cols.has(k),
      cell: (r) => <PrivateCell row={r} field={k} showUnlock={!readOnly && firstPrivate === k} onUnlock={() => onUnlock(r.collab.id)} />,
    })),
    { id: 'stories', label: 'Stories', sort: 'stories', show: true, cell: (r) => <StoriesChip row={r} /> },
    { id: 'orders', label: 'Orders', sort: 'orders', num: true, show: cols.has('orders'), cell: (r) => (r.orders === null ? dash : fmtFull(r.orders)), foot: hasSales ? fmtFull(sum.orders ?? 0) : dash },
    { id: 'revenue', label: 'Revenue', sort: 'revenue', num: true, show: cols.has('revenue'), cell: (r) => (r.revenue === null ? dash : <span title={fmtINR(r.revenue)}>{fmtINRShort(r.revenue)}</span>), foot: hasSales ? fmtINRShort(sum.revenue ?? 0) : dash },
    { id: 'roas', label: 'Return on spend', sort: 'roas', num: true, show: cols.has('roas'), cell: (r) => (r.roas === null ? dash : `${r.roas.toFixed(1)}x`), foot: sum.roas === null ? dash : `${sum.roas.toFixed(1)}x` },
    {
      id: 'code', label: 'Code', sort: 'code', show: cols.has('code'),
      cell: (r) => (r.code ? <CopyButton text={r.code} label={`Copy code ${r.code}`} onCopied={() => notify(`Code ${r.code} copied`)}><code>{r.code}</code></CopyButton> : dash),
    },
    { id: 'link', label: 'Link', show: cols.has('link'), cell: (r) => <PostLinkIcon row={r} /> },
  ];
  const shown = columns.filter((c) => c.show);

  const clickSort = (k: SortKey) => setSort((s) => (s.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: k === 'creator' || k === 'code' || k === 'status' ? 'asc' : 'desc' }));
  const rowClick = (e: MouseEvent<HTMLTableRowElement>, id: string) => { if (!(e.target as HTMLElement).closest(INTERACTIVE)) onOpen(id); };
  const rowKey = (e: KeyboardEvent<HTMLTableRowElement>, id: string) => { if (e.key === 'Enter' && e.target === e.currentTarget) { e.preventDefault(); onOpen(id); } };

  if (!rows.length) return <div className="empty-card pf-empty"><strong>No creators match</strong><p>Change the search or filters to see more rows.</p></div>;

  return (
    <div className="dt-wrap pf-wrap" style={{ ['--dt-max' as string]: '70vh' }} tabIndex={0} role="region" aria-label="Performance table, scrolls sideways">
      <table className="dt pf-table" aria-label="Campaign performance by creator">
        <thead>
          <tr>
            {shown.map((c, i) => {
              const active = c.sort && sort.key === c.sort;
              return (
                <th key={c.id} scope="col" className={`${c.num ? 'num' : ''} ${i === 0 ? 'sticky-col' : ''}`} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : c.sort ? 'none' : undefined}>
                  {c.sort ? (
                    <button type="button" onClick={() => clickSort(c.sort as SortKey)} title={`Sort by ${c.label.toLowerCase()}`}>
                      {c.label}
                      {active ? (sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ChevronsUpDown size={11} className="pf-sort-idle" />}
                    </button>
                  ) : c.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.collab.id} className="is-clickable pf-row" tabIndex={0} onClick={(e) => rowClick(e, r.collab.id)} onKeyDown={(e) => rowKey(e, r.collab.id)}>
              {shown.map((c, i) => <td key={c.id} className={`${c.num ? 'num' : ''} ${i === 0 ? 'sticky-col' : ''}`}>{c.cell(r)}</td>)}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            {shown.map((c, i) => <td key={c.id} className={`${c.num ? 'num' : ''} ${i === 0 ? 'sticky-col' : ''}`}>{c.foot ?? null}</td>)}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
