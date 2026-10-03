/**
 * Sample workspace. Everything here is fictional: a protein-oats brand ("Rise Oats Co.")
 * running a 30-creator launch, with sample view counts that look like a real campaign
 * ten days in. See `performance.ts` for how the numbers are generated.
 */
import type { ActivityEvent, Application, ApplicationStatus, Campaign, Creator, Persisted, Post, Programme, Status, Task } from './types';
import { addDays, CURRENT_USER, todayISO } from './helpers';
import { ACTING_CREATOR_ID, buildCreators } from './creators';
import { makeCollaboration } from './collab';
import { daysBetween, insightsFromConnection, rngFor, simulateSnapshots, suggestedFee } from './performance';
import { parseINR, roundTo } from './money';

export const BRAND = 'Rise Oats Co.';
const ME = CURRENT_USER;

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600e3).toISOString();
const reelId = (key: string) => {
  const r = rngFor(`url:${key}`);
  const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_';
  return `C${Array.from({ length: 10 }, () => a[Math.floor(r() * a.length)]).join('')}`;
};

function programmes(): Programme[] {
  return [
    {
      id: 'p1', name: 'Choco Peanut Launch', brand: BRAND, status: 'Live',
      objective: 'Launch the Choco Peanut flavour and drive first purchases on the website.',
      brief: 'Show Choco Peanut protein oats as a two-minute breakfast that tastes like dessert. One Reel in your own style plus one Story with your discount code. Mention 20g protein per serving, no added sugar and the launch code.',
      product: 'Choco Peanut Protein Oats, 6-pack', niches: ['Fitness', 'Food', 'Health & wellness', 'Lifestyle'], tiers: ['Nano', 'Micro', 'Mid'], cities: [],
      budget: 250000, ratePer1000: 130, startDate: addDays(-15), endDate: addDays(12), applyBy: addDays(-20), slots: 30,
      deliverable: '1 Reel + 1 Story', feeMin: 1500, feeMax: 28000, codePrefix: 'RISE', createdAt: addDays(-34),
    },
    {
      id: 'p2', name: 'Breakfast Bowl Series', brand: BRAND, status: 'Open call',
      objective: 'Build a library of simple breakfast ideas using Rise oats, for always-on content and paid reuse.',
      brief: 'Make a three-ingredient breakfast bowl on Rise oats and show it start to finish in one Reel. Keep it real: your kitchen, your pace. We provide the product kit and a discount code for your audience.',
      product: 'Rise Protein Oats, Classic and Choco Peanut', niches: ['Food', 'Health & wellness', 'Parenting', 'Student life'], tiers: ['Nano', 'Micro'], cities: [],
      budget: 90000, ratePer1000: 110, startDate: addDays(14), endDate: addDays(40), applyBy: addDays(9), slots: 12,
      deliverable: '1 Reel', feeMin: 2000, feeMax: 9000, codePrefix: 'BOWL', createdAt: addDays(-3),
    },
    {
      id: 'p3', name: 'Summer Shred Seeding', brand: BRAND, status: 'Completed',
      objective: 'Seed the high-protein range with fitness creators ahead of summer.',
      brief: 'Product seeding with one Reel per creator, focused on post-workout breakfasts.',
      product: 'Rise Protein Oats, Classic', niches: ['Fitness', 'Food'], tiers: ['Micro', 'Mid'], cities: [],
      budget: 80000, ratePer1000: 120, startDate: addDays(-120), endDate: addDays(-85), applyBy: addDays(-128), slots: 10,
      deliverable: '1 Reel', feeMin: 3000, feeMax: 20000, codePrefix: 'SHRED', createdAt: addDays(-135),
    },
    {
      id: 'x1', name: 'Festive Glow Set', brand: 'Serein Skin', status: 'Open call',
      objective: 'Awareness for the festive gifting set.', brief: 'A realistic evening skincare routine using the gifting set. One Reel and two Stories. No before-and-after claims.',
      product: 'Festive Glow Gift Set', niches: ['Lifestyle', 'Fashion'], tiers: ['Micro', 'Mid'], cities: [],
      budget: 200000, ratePer1000: 150, startDate: addDays(20), endDate: addDays(45), applyBy: addDays(12), slots: 15,
      deliverable: '1 Reel + 2 Stories', feeMin: 6000, feeMax: 30000, codePrefix: 'GLOW', createdAt: addDays(-2),
    },
    {
      id: 'x2', name: 'Trail Season Launch', brand: 'Trailhead Gear', status: 'Open call',
      objective: 'Show the new daypack on real weekend trips.', brief: 'Take the Trailhead 24L daypack on a real outing and show what fits. One Reel, shot outdoors.',
      product: 'Trailhead 24L Daypack', niches: ['Travel', 'Fitness', 'Lifestyle'], tiers: ['Nano', 'Micro'], cities: [],
      budget: 120000, ratePer1000: 120, startDate: addDays(10), endDate: addDays(35), applyBy: addDays(6), slots: 10,
      deliverable: '1 Reel', feeMin: 2500, feeMax: 12000, codePrefix: 'TRAIL', createdAt: addDays(-5),
    },
    {
      id: 'x3', name: 'Back-to-College Bundle', brand: 'Notebook Club', status: 'Open call',
      objective: 'Reach students ahead of the new semester.', brief: 'Show your study setup using the bundle. One Reel and one Story with the student discount code.',
      product: 'Notebook Club Student Bundle', niches: ['Student life', 'Lifestyle'], tiers: ['Nano', 'Micro'], cities: [],
      budget: 60000, ratePer1000: 90, startDate: addDays(8), endDate: addDays(30), applyBy: addDays(5), slots: 20,
      deliverable: '1 Reel + 1 Story', feeMin: 1000, feeMax: 6000, codePrefix: 'STUDY', createdAt: addDays(-1),
    },
  ];
}

export function buildSeed(): Persisted {
  const creators = buildCreators();
  const progs = programmes();
  const prog = (id: string) => progs.find((p) => p.id === id)!;
  const cr = (id: string) => creators.find((c) => c.id === id)!;
  const campaigns: Campaign[] = [];
  const posts: Post[] = [];
  const tasks: Task[] = [];
  const applications: Application[] = [];
  const activity: ActivityEvent[] = [];
  let issue = 100;
  let appN = 0;

  const addApp = (programmeId: string, creatorId: string, origin: 'creator' | 'brand', status: ApplicationStatus, fee: number, message: string, daysAgo: number, collaborationId?: string, lastMoveBy: 'brand' | 'creator' = origin) => {
    appN += 1;
    applications.push({
      id: `app-${appN}`, programmeId, creatorId, origin, status, fee, lastMoveBy, message, updatedAt: addDays(-daysAgo) + 'T10:00:00.000Z', collaborationId,
      notes: [{ at: addDays(-daysAgo - 1) + 'T09:00:00.000Z', by: origin, text: message }],
    });
  };

  /** Posts a Reel (and optionally a Story) so the collaboration has sample numbers. */
  const publish = (collabId: string, creator: Creator, plannedOffset: number, lateBy: number, story: 'none' | 'awaiting' | 'confirmed' | 'requested') => {
    const reel = posts.find((p) => p.collaborationId === collabId && p.type === 'Reel')!;
    const planned = addDays(plannedOffset);
    const postedAt = addDays(Math.min(-1, plannedOffset + lateBy));
    const daysLive = Math.min(30, daysBetween(postedAt, todayISO()));
    const col = campaigns.find((c) => c.id === collabId)!;
    col.dueDate = prog(col.programmeId!).endDate; col.publicationDate = planned;
    col.agreement.publicationDate = planned; col.agreement.contentDeadline = addDays(plannedOffset - 3);
    reel.plannedDate = planned;
    reel.postedAt = postedAt;
    reel.url = `https://www.instagram.com/reel/${reelId(collabId)}/`;
    reel.snapshots = simulateSnapshots(`snap:${collabId}`, reel.expectedViews, reel.factor, creator.engagementRate, daysLive);
    reel.lastRefreshed = hoursAgo(2 + (collabId.length % 3));
    if (creator.instagramConnected) reel.insights = insightsFromConnection(reel, creator, 'creator-connected');
    const st = posts.find((p) => p.collaborationId === collabId && p.type === 'Story');
    if (st) {
      st.plannedDate = addDays(plannedOffset + 1);
      if (story !== 'none') {
        st.postedAt = addDays(Math.min(-1, plannedOffset + 1 + lateBy));
        if (story === 'confirmed') st.insights = insightsFromConnection(st, creator, creator.instagramConnected ? 'creator-connected' : 'creator-screenshot');
        if (story === 'requested') st.insightRequested = true;
      }
    }
  };

  const addCollab = (programmeId: string, creatorId: string, fee: number, status: Status, owner: string) => {
    issue += 1;
    const { campaign, posts: ps } = makeCollaboration({ programme: prog(programmeId), creator: cr(creatorId), fee, number: issue, owner, status });
    campaigns.push(campaign);
    posts.push(...ps);
    return campaign;
  };
  const feeFor = (creatorId: string, programmeId: string, wobble: number) => {
    const s = suggestedFee(cr(creatorId), prog(programmeId));
    return Math.max(500, roundTo(s.fee * wobble, 500));
  };

  /* --------------------------- P1: the live launch --------------------------- */

  // Hand-written collaborations used by the story and by the collaboration screens.
  const featured: { creatorId: string; status: Status; owner: string; priority: Campaign['priority']; planned: number; late: number; story: 'none' | 'awaiting' | 'confirmed' | 'requested'; posted: boolean }[] = [
    { creatorId: 'cr01', status: 'Approved', owner: ME, priority: 'High', planned: 2, late: 0, story: 'requested', posted: false },
    { creatorId: 'cr03', status: 'Terms to Confirm', owner: 'Kabir Rao', priority: 'Urgent', planned: -2, late: 0, story: 'none', posted: false },
    { creatorId: 'cr04', status: 'Draft Submitted', owner: 'Kabir Rao', priority: 'Medium', planned: 5, late: 0, story: 'none', posted: false },
    { creatorId: 'cr05', status: 'Changes Requested', owner: 'Rohan Mehta', priority: 'High', planned: -1, late: 0, story: 'none', posted: false },
    { creatorId: 'cr06', status: 'Payment Pending', owner: ME, priority: 'Low', planned: -12, late: 0, story: 'confirmed', posted: true },
    { creatorId: 'cr07', status: 'Planning', owner: 'Kabir Rao', priority: 'Low', planned: 10, late: 0, story: 'none', posted: false },
  ];
  const fid: Record<string, string> = {};
  for (const f of featured) {
    const c = cr(f.creatorId);
    const fee = f.creatorId === 'cr03' ? 0 : feeFor(f.creatorId, 'p1', 1);
    const col = addCollab('p1', f.creatorId, fee || suggestedFee(c, prog('p1')).fee, f.status, f.owner);
    fid[f.creatorId] = col.id;
    col.priority = f.priority;
    const reel = posts.find((p) => p.collaborationId === col.id && p.type === 'Reel')!;
    const story = posts.find((p) => p.collaborationId === col.id && p.type === 'Story');
    reel.plannedDate = addDays(f.planned);
    if (story) story.plannedDate = addDays(f.planned + 1);
    col.dueDate = reel.plannedDate;
    col.publicationDate = reel.plannedDate;
    col.agreement.publicationDate = reel.plannedDate;
    col.agreement.contentDeadline = addDays(f.planned - 3);
    if (f.posted) publish(col.id, c, f.planned, f.late, f.story);
    else if (f.story === 'requested' && story) { story.postedAt = addDays(-1); story.insightRequested = true; }
  }
  const byCol = (creatorId: string) => campaigns.find((c) => c.id === fid[creatorId])!;
  // Story details that make each collaboration read like the real thing.
  Object.assign(byCol('cr01'), { blocker: '', nextAction: 'Creator posts the approved Reel and submits the link.', objective: 'Introduce Choco Peanut to breakfast-prep audiences.', audience: 'Home cooks and fitness-curious professionals, 22-34' });
  Object.assign(byCol('cr01').agreement, { talkingPoints: '20g protein per serving; no added sugar; show the 2-minute prep; mention code RISE-ANANYA10' });
  Object.assign(byCol('cr03'), { blocker: 'Fee and exclusivity not agreed with creator', nextAction: 'Owner confirms fee, paid usage and exclusivity with the creator manager.', objective: 'Reach style-led audiences with the launch.' });
  Object.assign(byCol('cr03').agreement, { fee: '', paidUsageRights: 'To be confirmed', exclusivity: 'To be confirmed', paymentTerms: '' });
  Object.assign(byCol('cr04'), { blocker: '', nextAction: 'Brand owner starts review of the submitted draft.' });
  Object.assign(byCol('cr05'), { blocker: 'Music licence for audio track unresolved', nextAction: 'Creator swaps audio and resubmits the revised draft.' });
  Object.assign(byCol('cr06'), { blocker: '', nextAction: 'Finance to confirm payment after invoice acceptance.', publicationUrl: posts.find((p) => p.collaborationId === fid.cr06 && p.type === 'Reel')?.url ?? '', invoiceStatus: 'Accepted', paymentStatus: 'Processing' });
  Object.assign(byCol('cr06').closeout, { contentApproved: true, publicationConfirmed: true, urlRecorded: true, invoiceSubmitted: true, invoiceAccepted: true, paymentRecorded: true });
  Object.assign(byCol('cr07'), { blocker: '', nextAction: 'Owner drafts scope and requests terms from the creator.' });
  byCol('cr07').agreement.deliverables = 'To be confirmed';

  // Everyone else in the launch: 1 star, then 23 more, quotas by tier so the mix looks like a real roster.
  const quota = { Mid: 5, Micro: 13, Nano: 5 } as Record<string, number>;
  const rest = creators.filter((c) => !featured.some((f) => f.creatorId === c.id) && c.id !== 'cr02');
  const picked: Creator[] = [];
  for (const c of rest) { if (quota[c.tier] > 0) { quota[c.tier] -= 1; picked.push(c); } }
  const launchOrder = [cr('cr02'), ...picked];
  const missedAt = new Set([5, 14]);
  let barterLeft = 4;
  launchOrder.forEach((c, i) => {
    const r = rngFor(`launch:${c.id}`);
    const missed = missedAt.has(i);
    const isBarter = c.tier === 'Nano' && barterLeft > 0;
    if (isBarter) barterLeft -= 1;
    const fee = feeFor(c.id, 'p1', 0.92 + r() * 0.26);
    const status: Status = missed ? 'Changes Requested' : i % 7 === 0 ? 'Payment Pending' : i % 11 === 0 ? 'Complete' : 'Published';
    const col = addCollab('p1', c.id, fee, status, i % 3 === 0 ? ME : 'Kabir Rao');
    if (isBarter) col.agreement.fee = 'Barter: product kit worth ₹1,800';
    const planned = -(3 + Math.floor(r() * 11));
    if (missed) {
      const reel = posts.find((p) => p.collaborationId === col.id && p.type === 'Reel')!;
      reel.plannedDate = addDays(-9 - (i % 2));
      const st = posts.find((p) => p.collaborationId === col.id && p.type === 'Story');
      if (st) st.plannedDate = addDays(-8);
      col.dueDate = reel.plannedDate;
      col.blocker = 'Creator has not posted and is not responding';
      col.nextAction = 'Follow up with the creator or release the slot.';
      return;
    }
    const late = r() < 0.25 ? 1 + Math.floor(r() * 3) : 0;
    const story = r() < 0.4 ? 'confirmed' : r() < 0.55 ? 'requested' : 'awaiting';
    publish(col.id, c, planned, late, story);
    if (status === 'Complete' || status === 'Payment Pending') {
      col.publicationUrl = posts.find((p) => p.collaborationId === col.id && p.type === 'Reel')!.url;
      Object.assign(col.closeout, { contentApproved: true, publicationConfirmed: true, urlRecorded: true, invoiceSubmitted: true, invoiceAccepted: true, paymentRecorded: status === 'Complete' });
      col.invoiceStatus = 'Accepted';
      col.paymentStatus = status === 'Complete' ? 'Paid' : 'Processing';
      col.nextAction = status === 'Complete' ? 'Closed.' : 'Finance to confirm payment.';
    } else {
      col.nextAction = 'Monitor performance and confirm payment after the posting window.';
    }
  });

  // Applications for the launch: every collaboration was accepted, plus a few that did not go ahead.
  campaigns.filter((c) => c.programmeId === 'p1').forEach((c, i) => {
    addApp('p1', c.creatorId!, i % 5 < 3 ? 'brand' : 'creator', 'Accepted', parseINR(c.agreement.fee) || 0, i % 5 < 3 ? 'Invited from the marketplace.' : 'Applied to the open call.', 30 - (i % 12), c.id);
  });
  const p1Ids = new Set(campaigns.filter((c) => c.programmeId === 'p1').map((c) => c.creatorId));
  const outsiders = creators.filter((c) => !p1Ids.has(c.id));
  addApp('p1', outsiders[0].id, 'creator', 'Rejected', outsiders[0].rate, 'Applied to the open call.', 26);
  addApp('p1', outsiders[1].id, 'brand', 'Declined', outsiders[1].rate, 'Invited from the marketplace.', 24);
  addApp('p1', outsiders[2].id, 'creator', 'Rejected', outsiders[2].rate, 'Applied to the open call.', 25);

  /* ----------------------- P3: finished, gives history ----------------------- */

  const p3Creators = ['cr01', 'cr02', 'cr03', 'cr04', 'cr06', ...launchOrder.slice(2, 7).map((c) => c.id)].slice(0, 10);
  p3Creators.forEach((id, i) => {
    const c = cr(id);
    const fee = feeFor(id, 'p3', 1);
    const col = addCollab('p3', id, fee, 'Complete', i % 2 ? 'Kabir Rao' : ME);
    publish(col.id, c, -100 + (i % 4), i % 4 === 3 ? 2 : 0, 'none');
    col.publicationUrl = posts.find((p) => p.collaborationId === col.id && p.type === 'Reel')!.url;
    Object.assign(col.closeout, { contentApproved: true, publicationConfirmed: true, urlRecorded: true, invoiceSubmitted: true, invoiceAccepted: true, paymentRecorded: true });
    col.invoiceStatus = 'Accepted'; col.paymentStatus = 'Paid'; col.nextAction = 'Closed.'; col.blocker = '';
    addApp('p3', id, i % 2 ? 'creator' : 'brand', 'Accepted', fee, 'Seeding collaboration.', 118, col.id);
  });

  /* -------------------- P2: open call with a live pipeline -------------------- */

  const pool = outsiders.filter((c) => c.tier !== 'Mid').slice(3);
  const p2Fee = (c: Creator) => suggestedFee(c, prog('p2')).fee;
  const apps2: [Creator, 'creator' | 'brand', ApplicationStatus, string][] = [
    [pool[0], 'creator', 'Applied', 'Big fan of the product. I make breakfast Reels every week and my audience asks for protein options.'],
    [pool[1], 'creator', 'Applied', 'I can shoot this in Hindi and English. Happy to test both flavours.'],
    [pool[2], 'creator', 'Applied', 'Hostel breakfasts are my whole niche. Students would love this.'],
    [pool[3], 'creator', 'Applied', 'Parents ask me for quick school-morning ideas all the time.'],
    [pool[4], 'creator', 'Applied', 'Open to barter plus a lower fee for a longer collaboration.'],
    [pool[5], 'creator', 'Shortlisted', 'Love the brand. Shared my last oats Reel, it did well.'],
    [pool[6], 'creator', 'Shortlisted', 'Can start next week.'],
    [pool[7], 'brand', 'Invited', 'Invited from the marketplace. Your oats Reels fit this series.'],
    [pool[8], 'creator', 'Negotiating', 'Thanks for the interest. My rate for a Reel with usage is a little higher.'],
  ];
  apps2.forEach(([c, origin, status, msg], i) => {
    if (!c) return;
    const fee = status === 'Negotiating' ? roundTo(p2Fee(c) * 1.3, 500) : p2Fee(c);
    addApp('p2', c.id, origin, status, fee, msg, 1 + (i % 6), undefined, status === 'Negotiating' ? 'creator' : origin);
  });
  // The acting creator has a pending invitation to this series.
  addApp('p2', ACTING_CREATOR_ID, 'brand', 'Invited', 5500, 'We loved your breakfast Reels. Would you make one for the Breakfast Bowl Series?', 1);

  /* ------------------------------- tasks, activity ------------------------------- */

  let tn = 0;
  const t = (collabKey: string, title: string, assignee: string, due: number | string, priority: Task['priority'], status: Task['status']) => {
    tn += 1;
    tasks.push({ id: `t${tn}`, key: `TSK-${tn}`, campaignId: fid[collabKey], title, assignee, dueDate: typeof due === 'number' ? addDays(due) : due, priority, status, completed: status === 'Done' });
  };
  t('cr01', 'Confirm usage rights', ME, -20, 'High', 'Done');
  t('cr01', 'Approve campaign brief', 'Rohan Mehta', -14, 'High', 'Done');
  t('cr01', 'Approve first-cut Reel', ME, -3, 'High', 'Done');
  t('cr01', 'Creator posts Reel and submits link', 'Ananya Rao', 2, 'High', 'In Progress');
  t('cr01', 'Collect story insights screenshot', 'Ananya Rao', 1, 'Medium', 'To Do');
  t('cr01', 'Confirm invoice details', 'Neha Kulkarni', addDays(9), 'Medium', 'To Do');
  t('cr01', 'Confirm payment received', 'Neha Kulkarni', addDays(30), 'Low', 'To Do');
  t('cr03', 'Confirm usage rights', ME, -2, 'Urgent', 'To Do');
  t('cr03', 'Agree fee with creator manager', 'Kabir Rao', 1, 'High', 'In Progress');
  t('cr04', 'Review submitted draft', 'Kabir Rao', 2, 'Medium', 'In Review');
  t('cr04', 'Confirm invoice details', 'Neha Kulkarni', 9, 'Low', 'To Do');
  t('cr05', 'Resolve music licence', 'Rohan Mehta', -1, 'High', 'Blocked');
  t('cr05', 'Review revised draft', ME, 1, 'High', 'In Review');
  t('cr06', 'Record publication URL', 'Arjun Bhat', -12, 'Medium', 'Done');
  t('cr06', 'Confirm payment received', 'Neha Kulkarni', -4, 'High', 'In Progress');
  t('cr07', 'Approve campaign brief', ME, 3, 'Medium', 'To Do');

  const ago = (days: number, h = 10) => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(h, 15, 0, 0); return d.toISOString(); };
  let an = 0;
  const ev = (key: string, actor: string, message: string, days: number, h?: number) => {
    an += 1;
    activity.push({ id: `a${an}`, campaignId: fid[key], actor, message, timestamp: ago(days, h), example: true });
  };
  ev('cr01', 'Ananya Rao', 'Draft submitted: first-cut Reel', 4, 11);
  ev('cr01', ME, 'First-cut Reel approved', 3, 16);
  ev('cr01', ME, 'Insights requested for Story 1', 1, 12);
  ev('cr01', ME, 'Terms updated: usage rights set to Organic only', 20, 15);
  ev('cr03', 'Kabir Rao', 'Status changed from Planning to Terms to Confirm', 6);
  ev('cr04', 'Rhea Menon', 'Draft submitted', 1, 17);
  ev('cr05', 'Rohan Mehta', 'Changes requested: swap audio track', 3, 14);
  ev('cr06', 'Arjun Bhat', 'Publication URL recorded', 12, 9);
  ev('cr06', ME, 'Invoice recorded as accepted', 8, 13);

  return {
    version: 3, workspaceName: BRAND, role: 'brand', actingCreatorId: ACTING_CREATOR_ID, shortlist: [pool[9]?.id, pool[10]?.id, pool[11]?.id].filter(Boolean) as string[],
    integrations: { shopify: true, instagram: false },
    creators, programmes: progs, applications, posts, campaigns, tasks, activity,
  };
}

