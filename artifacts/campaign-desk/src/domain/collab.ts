import type { Campaign, Creator, Post, PostType, Programme, Status } from './types';
import { addDays, emptyAgreement, todayISO } from './helpers';
import { fmtINR, roundTo } from './money';
import { daysBetween, deliveryFactorFor, rngFor } from './performance';

const noCloseout = {
  contentApproved: false, publicationConfirmed: false, urlRecorded: false,
  invoiceSubmitted: false, invoiceAccepted: false, paymentRecorded: false,
};

/** "1 Reel + 2 Stories" -> [{Reel,1},{Story,2}] */
export function parseDeliverables(s: string): { type: PostType; n: number }[] {
  const out: { type: PostType; n: number }[] = [];
  const re = /(\d+)\s*(reels?|stories|story|posts?|carousels?)/gi;
  let m: RegExpExecArray | null = re.exec(s);
  while (m) {
    const w = m[2].toLowerCase();
    out.push({ type: w.startsWith('reel') ? 'Reel' : w.startsWith('stor') ? 'Story' : 'Post', n: Number(m[1]) });
    m = re.exec(s);
  }
  return out.length ? out : [{ type: 'Reel', n: 1 }];
}

export const codeFor = (programme: Pick<Programme, 'codePrefix'>, creator: Pick<Creator, 'name'>) =>
  `${programme.codePrefix}-${creator.name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '')}10`;

export interface CollabInput {
  programme: Programme;
  creator: Creator;
  fee: number;
  number: number;
  owner: string;
  status?: Status;
  /** Planned publish date of the Reel. Defaults to a few days after the programme starts. */
  reelPlanned?: string;
}

/** Builds the collaboration record and its planned post slots. Nothing is posted yet. */
export function makeCollaboration(i: CollabInput): { campaign: Campaign; posts: Post[] } {
  const { programme: p, creator: c, fee } = i;
  const id = `col-${p.id}-${c.id}`;
  const rng = rngFor(`collab:${id}`);
  const reelPlanned = i.reelPlanned ?? addDays(Math.max(3, daysBetween(todayISO(), p.startDate) + 3 + Math.floor(rng() * 6)));
  const reelOffset = daysBetween(todayISO(), reelPlanned);
  const status: Status = i.status ?? 'Brief Ready';
  const agreement = {
    ...emptyAgreement(),
    deliverables: p.deliverable, fee: fmtINR(fee), usageRights: 'Organic only', paidUsageRights: 'Not applicable',
    exclusivity: 'No category exclusivity', revisions: '1 revision round', contentDeadline: addDays(reelOffset - 3),
    publicationDate: reelPlanned, paymentTerms: 'Net 15 from publication', talkingPoints: p.brief.split('.')[0] + '.',
  };
  const campaign: Campaign = {
    id, issueKey: `CMP-${i.number}`, title: `${p.name} · ${c.name.split(' ')[0]}`, brand: p.brand, creator: c.name, owner: i.owner,
    status, priority: 'Medium', dueDate: reelPlanned, brief: p.brief, objective: p.objective, deliverables: p.deliverable,
    audience: 'Fitness-curious urban shoppers, 20-35', publicationDate: reelPlanned, blocker: '',
    nextAction: status === 'Brief Ready' ? 'Share the product kit and discount code with the creator.' : 'Review progress with the creator.',
    agreement, publicationUrl: '', invoiceStatus: 'Not submitted', paymentStatus: 'Not Invoiced', closeout: { ...noCloseout },
    programmeId: p.id, creatorId: c.id, code: codeFor(p, c),
    convRate: Math.round((0.0001 + Math.pow(rng(), 1.6) * 0.0007) * 1e6) / 1e6,
    aov: roundTo(599 + rng() * 300, 10),
  };

  const posts: Post[] = [];
  const expected = Math.max(500, roundTo((fee / p.ratePer1000) * 1000, 500));
  for (const d of parseDeliverables(p.deliverable)) {
    for (let n = 0; n < d.n; n += 1) {
      const type = d.type;
      const isPrimary = type !== 'Story' && !posts.some((x) => x.type !== 'Story');
      posts.push({
        id: `po-${id}-${type[0].toLowerCase()}${n}`, programmeId: p.id, collaborationId: id, creatorId: c.id, type,
        url: '', plannedDate: type === 'Story' ? addDays(reelOffset + 1) : reelPlanned,
        postedAt: '', expectedViews: isPrimary ? expected : 0, snapshots: [], lastRefreshed: '', fetchingUntil: 0,
        insightRequested: false, isCollab: rng() < 0.3, factor: deliveryFactorFor(c, `${id}:${type}${n}`),
      });
    }
  }
  return { campaign, posts };
}
