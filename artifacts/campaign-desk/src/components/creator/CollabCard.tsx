import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, ReceiptText, Tag } from 'lucide-react';
import { PAYMENT_STATUSES, type Campaign } from '@/domain/types';
import { fmtDate } from '@/domain/helpers';
import { latest, postStatus } from '@/domain/performance';
import { fmtFull } from '@/domain/money';
import { Badge } from '@/components/ui-bits';
import { SourceBadge } from '@/components/shared';
import { useStore } from '@/state/store';
import { PostRow } from './PostRow';
import '@/styles/creator.css';

const PAY_LABEL: Record<string, string> = {
  'Not Invoiced': 'Not invoiced', 'Invoice Submitted': 'Invoice sent', 'Invoice Accepted': 'Invoice accepted', Processing: 'Processing', Paid: 'Paid',
};

function CodeBox({ code }: { code: string }) {
  const { notify } = useStore();
  const [copied, setCopied] = useState(false);
  const t = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(t.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.clearTimeout(t.current);
      t.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      notify('Could not copy. Select the code and copy it by hand.', 'error');
    }
  };
  return (
    <span className="cr-code">
      <code>{code}</code>
      <button className="icon-flat" onClick={copy} aria-label={copied ? 'Code copied' : `Copy discount code ${code}`}>{copied ? <Check size={15} /> : <Copy size={15} />}</button>
    </span>
  );
}

export function CollabCard({ c }: { c: Campaign }) {
  const { posts, actingCreator: me, now, updateCampaign } = useStore();
  const complete = c.status === 'Complete';
  const [open, setOpen] = useState(!complete);
  const mine = posts.filter((p) => p.collaborationId === c.id).sort((a, b) => Number(a.type === 'Story') - Number(b.type === 'Story'));
  const primary = mine.find((p) => p.type !== 'Story');
  const primaryStatus = primary ? postStatus(primary, now) : 'Planned';
  const posted = primaryStatus === 'Live' || primaryStatus === 'Fetching';
  const snap = primary && primaryStatus === 'Live' ? latest(primary) : undefined;
  const orders = snap && c.convRate ? Math.round(snap.views * c.convRate) : null;
  const payIdx = PAYMENT_STATUSES.indexOf(c.paymentStatus);
  const a = c.agreement;
  const terms: [string, string][] = [
    ['Deliverables', a.deliverables], ['Fee', a.fee], ['Usage rights', a.usageRights], ['Payment terms', a.paymentTerms],
    ['Content deadline', fmtDate(a.contentDeadline)], ['Publication date', fmtDate(a.publicationDate)],
  ];
  const needsYou = mine.filter((p) => p.insightRequested && !p.insights).length;

  return (
    <article className={`card cr-collab ${complete ? 'is-complete' : ''}`} aria-label={c.title}>
      <header className="cr-collab-head">
        <div>
          <span className="eyebrow">{c.brand} · {c.issueKey}</span>
          <h3>{c.title}</h3>
        </div>
        <div className="cr-collab-right">
          {needsYou > 0 && <span className="pill t-peach">{needsYou} request{needsYou === 1 ? '' : 's'} from the brand</span>}
          <Badge value={c.status} />
          <b className="cr-collab-fee">{a.fee}</b>
          {complete && (
            <button className="icon-flat" aria-expanded={open} aria-label={`${open ? 'Hide' : 'Show'} details for ${c.title}`} onClick={() => setOpen(!open)}>
              <ChevronDown size={18} style={{ transform: open ? 'rotate(180deg)' : undefined }} />
            </button>
          )}
        </div>
      </header>

      {open && (
        <div className="cr-collab-body">
          <section aria-label="Terms">
            <span className="eyebrow">Your agreement</span>
            <div className="terms cr-terms">
              {terms.map(([k, v]) => <div key={k} className="term"><span>{k}</span><b>{v || 'Not set yet'}</b></div>)}
            </div>
          </section>

          {a.talkingPoints && (
            <section aria-label="Talking points" className="cr-talk">
              <span className="eyebrow">Mention in your post</span>
              <p>{a.talkingPoints}</p>
            </section>
          )}

          <section aria-label="Your posts">
            <span className="eyebrow">Your posts</span>
            <ul className="cr-posts">
              {mine.map((p) => <PostRow key={p.id} post={p} creator={me} brand={c.brand} />)}
              {!mine.length && <li className="muted">No posts are set up for this collaboration yet.</li>}
            </ul>
          </section>

          <div className="cr-money">
            {c.code && (
              <section aria-label="Discount code" className="cr-codebox">
                <span className="eyebrow"><Tag size={12} /> Your discount code</span>
                <CodeBox code={c.code} />
                <p className="muted">Share this in your post and Story. When your audience uses it at checkout, the brand can see the sales you brought in.</p>
                {orders !== null && <p className="cr-orders"><b>{fmtFull(orders)}</b> orders so far with your code <SourceBadge source="sample" compact /></p>}
              </section>
            )}

            <section aria-label="Payment" className="cr-pay">
              <span className="eyebrow"><ReceiptText size={12} /> Payment</span>
              <ol className="cr-pay-steps" aria-label={`Payment status: ${PAY_LABEL[c.paymentStatus]}`}>
                {PAYMENT_STATUSES.map((s, i) => (
                  <li key={s} className={i < payIdx ? 'done' : i === payIdx ? 'now' : ''} aria-current={i === payIdx ? 'step' : undefined}><i>{i <= payIdx ? <Check size={11} /> : null}</i><span>{PAY_LABEL[s]}</span></li>
                ))}
              </ol>
              {a.paymentTerms && <p className="muted">Terms: {a.paymentTerms}.</p>}
              {c.paymentStatus === 'Not Invoiced' && (posted
                ? <button className="btn primary small" onClick={() => updateCampaign(c.id, { invoiceStatus: 'Submitted', paymentStatus: 'Invoice Submitted', closeout: { ...c.closeout, invoiceSubmitted: true } }, 'Invoice submitted')}>Submit invoice</button>
                : <p className="muted">You can submit your invoice once your {primary?.type ?? 'Reel'} is live.</p>)}
            </section>
          </div>
        </div>
      )}
    </article>
  );
}
