import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { ExternalLink, Send, Trash2 } from 'lucide-react';
import { Drawer, Meter, SourceBadge, TierBadge } from '@/components/shared';
import { fmtDate } from '@/domain/helpers';
import { deliveryTone, shortLink, type GridRow } from '@/domain/performance';
import { fmtFull, fmtINR, fmtPct } from '@/domain/money';
import { useStore } from '@/state/store';
import { AddLinkInline, CopyButton, FeeCell, StatusChip } from './cells';
import { PostViewsChart } from './Charts';
import { storyDate } from './StoriesPanel';
import UnlockPanel from './UnlockPanel';
import { isHttp } from './model';

const Block = ({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) => (
  <section className="pf-block"><div className="pf-block-head"><h3>{title}</h3>{note}</div>{children}</section>
);
const Num = ({ k, v, src }: { k: string; v: ReactNode; src?: ReactNode }) => (
  <div className="pf-num"><span>{k}</span><b>{v}</b>{src}</div>
);
const dash = <span className="muted-cell">-</span>;

/** Unlock options in their own drawer, opened from the grid's "Unlock" buttons. */
export function UnlockDrawer({ row, readOnly, onClose, onConnectInstagram }: { row: GridRow; readOnly: boolean; onClose: () => void; onConnectInstagram: () => void }) {
  return (
    <Drawer title="Unlock reach, saves and shares" subtitle={`${row.creator.name} · @${row.creator.handle}`} onClose={onClose} width={480}>
      <UnlockPanel row={row} readOnly={readOnly} onConnectInstagram={onConnectInstagram} />
    </Drawer>
  );
}

export default function PostDrawer({ row, readOnly, plan, onClose, onConnectInstagram }: { row: GridRow; readOnly: boolean; plan: number; onClose: () => void; onConnectInstagram: () => void }) {
  const { removePostLink, setPostCollab, requestInsights } = useStore();
  const p = row.primary;
  const live = row.status === 'Live';
  const url = p?.url ?? '';
  const tone = deliveryTone(row.deliveryPct);
  const sales = row.orders !== null;

  return (
    <Drawer
      title={row.creator.name}
      subtitle={<span className="cell-flex">@{row.creator.handle}<TierBadge tier={row.creator.tier} /></span>}
      onClose={onClose} width={560}
    >
      <div className="pf-drawer">
        <Block title="Collaboration">
          <div className="pf-kv">
            <span>Status</span><span><StatusChip row={row} /></span>
            <span>Fee</span><b><FeeCell row={row} /></b>
            <span>Deliverable</span><b>{row.collab.agreement.deliverables || row.collab.deliverables || '-'}</b>
          </div>
          {!readOnly && <Link href={`/campaigns/${row.collab.id}`} className="textlink">Open collaboration {row.collab.issueKey}</Link>}
        </Block>

        <Block title={p?.type === 'Post' ? 'Post details' : 'Reel details'}>
          {url ? (
            <>
              <div className="pf-linkbar">
                <code title={url}>{shortLink(url)}</code>
                <CopyButton text={url} label="Copy post link" />
                {isHttp(url) && <a className="pf-ext" href={url} target="_blank" rel="noopener noreferrer" aria-label="Open post on Instagram (new tab)"><ExternalLink size={14} /></a>}
                {!readOnly && p && <button type="button" className="pf-copy" aria-label="Remove post link" title="Remove link" onClick={() => removePostLink(p.id)}><Trash2 size={13} /></button>}
              </div>
              <div className="pf-kv">
                <span>Posted</span><b>{p?.postedAt ? fmtDate(p.postedAt) : '-'}{row.daysLive !== null && <small className="muted"> · {row.daysLive} day{row.daysLive === 1 ? '' : 's'} ago</small>}</b>
                <span>Against plan</span>
                <b>{row.postedOnTime === null ? '-' : row.postedOnTime ? <span className="pf-good">On time</span> : <span className="pf-warn">Late, planned for {fmtDate(p?.plannedDate ?? '')}</span>}</b>
              </div>
            </>
          ) : (
            <>
              <p className="muted fine">{p?.plannedDate ? `Planned for ${fmtDate(p.plannedDate)}. ` : ''}No link yet, so there are no numbers to show.</p>
              {!readOnly && p && <AddLinkInline postId={p.id} label={`Instagram link for ${row.creator.name}`} />}
            </>
          )}
        </Block>

        {row.status === 'Fetching' && <p className="pf-note"><span className="dt-skel" style={{ width: 40 }} />Collecting public numbers from the post page. This takes a moment.</p>}

        {live && (
          <Block title="Public numbers" note={<SourceBadge source="public" />}>
            <div className="pf-nums">
              <Num k="Views" v={fmtFull(row.views ?? 0)} />
              <Num k="Likes" v={row.likes === null ? dash : fmtFull(row.likes)} />
              <Num k="Comments" v={row.comments === null ? dash : fmtFull(row.comments)} />
              <Num k="Engagement" v={row.engagement === null ? dash : fmtPct(row.engagement, 1)} />
            </div>
            <PostViewsChart row={row} />
            <div className="pf-kv">
              <span>Delivery</span>
              <span className="pf-deliv-wide">{row.deliveryPct !== null && <span className={`dchip t-${tone}`}>{fmtPct(row.deliveryPct)}</span>}<small className="muted">{fmtFull(row.views ?? 0)} of {fmtFull(row.expectedViews)} expected</small></span>
              <span /><span>{row.deliveryPct !== null && <Meter value={Math.min(100, row.deliveryPct)} tone={tone} label={`${Math.round(row.deliveryPct)} percent of expected views delivered`} />}</span>
              <span>Cost per 1,000 views</span>
              <b>{row.costPer1000 !== null && row.fee ? <><span className={row.costPer1000 <= plan ? 'pf-good' : 'pf-warn'}>{fmtINR(row.costPer1000)}</span><small className="muted"> · plan {fmtINR(plan)}</small></> : '-'}</b>
            </div>
          </Block>
        )}

        {live && (
          <Block title="Private numbers" note={row.locked ? <SourceBadge source="locked" /> : row.insightSource ? <SourceBadge source={row.insightSource} /> : null}>
            {row.locked ? (
              <UnlockPanel row={row} readOnly={readOnly} onConnectInstagram={onConnectInstagram} />
            ) : (
              <div className="pf-nums three">
                <Num k="Reach" v={fmtFull(row.reach ?? 0)} />
                <Num k="Saves" v={fmtFull(row.saves ?? 0)} />
                <Num k="Shares" v={fmtFull(row.shares ?? 0)} />
              </div>
            )}
          </Block>
        )}

        {p && live && (
          <Block title="Collab post">
            <label className={`pf-switch ${readOnly ? 'is-disabled' : ''}`}>
              <input type="checkbox" checked={p.isCollab} disabled={readOnly} onChange={(e) => setPostCollab(p.id, e.target.checked)} />
              <span>Posted as an Instagram Collab post</span>
            </label>
            <p className="muted fine">Collab posts share their insights with your Instagram account, so reach shows once your account is connected.</p>
          </Block>
        )}

        {row.stories.length > 0 && (
          <Block title="Stories" note={<span className="muted fine">Numbers disappear after 24 hours</span>}>
            <ul className="pf-story-list compact">
              {row.stories.map((s) => (
                <li key={s.post.id} className="pf-story">
                  <span className="pf-story-date">{storyDate(s)}</span>
                  <span className="pf-story-state">
                    {s.confirmed && s.post.insights ? <span className="pill t-green"><i />Confirmed</span>
                      : s.awaitingScreenshot ? <span className="pill t-yellow"><i />Awaiting screenshot</span>
                        : s.status === 'Late' ? <span className="pill t-coral"><i />Late</span>
                          : s.status === 'Missed' ? <span className="pill pf-missed"><i />Missed</span> : <span className="pill t-neutral">Planned</span>}
                  </span>
                  {s.confirmed && s.post.insights && (
                    <span className="pf-story-stats">{s.views !== null && <span>{fmtFull(s.views)} views</span>}<span>{fmtFull(s.post.insights.reach)} reach</span><span>{fmtFull(s.post.insights.saves)} saves</span><span>{fmtFull(s.post.insights.shares)} shares</span></span>
                  )}
                  {!readOnly && s.awaitingScreenshot && (
                    s.post.insightRequested
                      ? <button type="button" className="btn small" disabled>Requested</button>
                      : <button type="button" className="btn small" onClick={() => requestInsights(s.post.id)}><Send size={13} />Request screenshot</button>
                  )}
                </li>
              ))}
            </ul>
          </Block>
        )}

        {(sales || row.code) && (
          <Block title="Sales" note={sales ? <span className="muted fine">From Shopify, sample data</span> : undefined}>
            <div className="pf-kv">
              <span>Discount code</span><b>{row.code ? <CopyButton text={row.code} label={`Copy code ${row.code}`}><code>{row.code}</code></CopyButton> : '-'}</b>
              {sales ? (
                <>
                  <span>Link clicks</span><b>{row.clicks === null ? '-' : fmtFull(row.clicks)}</b>
                  <span>Orders</span><b>{fmtFull(row.orders ?? 0)}</b>
                  <span>Revenue</span><b>{fmtINR(row.revenue ?? 0)}</b>
                  <span>Return on spend</span><b>{row.roas === null ? '-' : `${row.roas.toFixed(1)}x`}</b>
                </>
              ) : <><span>Orders and revenue</span><span className="muted">Connect Shopify to see them</span></>}
            </div>
          </Block>
        )}
      </div>
    </Drawer>
  );
}
