import { Link } from 'wouter';
import { parseINR, fmtINR } from '@/domain/money';
import { postStatus } from '@/domain/performance';
import { Empty, PageTitle } from '@/components/viz/Cards';
import { Stat } from '@/components/shared';
import { useStore } from '@/state/store';
import { CollabCard } from '@/components/creator/CollabCard';
import '@/styles/creator.css';

/** Fee as a number. Barter deals have no rupee fee. */
const feeOf = (fee: string) => (/barter/i.test(fee) ? 0 : parseINR(fee));

export default function CreatorWork() {
  const { actingCreator: me, campaigns, posts, now } = useStore();
  const mine = campaigns.filter((c) => c.creatorId === me.id);
  const active = mine.filter((c) => c.status !== 'Complete');
  const completed = mine.filter((c) => c.status === 'Complete');
  const myPosts = posts.filter((p) => p.creatorId === me.id);
  const isPosted = (p: (typeof posts)[number]) => ['Live', 'Fetching'].includes(postStatus(p, now));

  const earned = mine.filter((c) => c.paymentStatus === 'Paid').reduce((a, c) => a + feeOf(c.agreement.fee), 0);
  const pending = mine.filter((c) => c.paymentStatus !== 'Paid' && myPosts.some((p) => p.collaborationId === c.id && p.type !== 'Story' && isPosted(p)))
    .reduce((a, c) => a + feeOf(c.agreement.fee), 0);
  const live = myPosts.filter(isPosted).length;
  const asks = myPosts.filter((p) => p.insightRequested && !p.insights).length;

  if (!mine.length) {
    return (
      <div className="cr-page">
        <PageTitle title="My work" sub="Your posts, discount codes and payments, in one place." />
        <Empty title="No collaborations yet">When a brand accepts you, or you accept an invitation, the work shows up here. <Link href="/creator" className="textlink">See opportunities</Link></Empty>
      </div>
    );
  }

  return (
    <div className="cr-page">
      <PageTitle title="My work" sub="Your posts, discount codes and payments, in one place." />
      <div className="stats cr-stats">
        <Stat label="Earned so far" value={fmtINR(earned)} sub="Paid out to you" tone="green" />
        <Stat label="Pending payment" value={fmtINR(pending)} sub="Posted, not paid yet" tone="yellow" />
        <Stat label="Posts live" value={live} sub="Reels, posts and Stories" tone="blue" />
        <Stat label="Brand requests waiting" value={asks} sub={asks ? 'Open the card to answer' : 'Nothing waiting on you'} tone={asks ? 'peach' : 'neutral'} />
      </div>

      <section className="mt" aria-labelledby="cr-active">
        <div className="sec-head"><h2 id="cr-active">Active</h2><span className="muted">{active.length}</span></div>
        {active.length ? <div className="cr-stack">{active.map((c) => <CollabCard key={c.id} c={c} />)}</div>
          : <Empty title="Nothing active right now">Open campaigns are on your <Link href="/creator" className="textlink">home page</Link>.</Empty>}
      </section>

      {completed.length > 0 && (
        <section className="mt" aria-labelledby="cr-done">
          <div className="sec-head"><h2 id="cr-done">Completed</h2><span className="muted">{completed.length}</span></div>
          <div className="cr-stack">{completed.map((c) => <CollabCard key={c.id} c={c} />)}</div>
        </section>
      )}
    </div>
  );
}
