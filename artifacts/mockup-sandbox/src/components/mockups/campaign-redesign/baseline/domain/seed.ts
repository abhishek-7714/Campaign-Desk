import type { ActivityEvent, Agreement, Campaign, Closeout, Persisted, Task } from './types';
import { addDays, emptyAgreement } from './helpers';

const noCloseout: Closeout = {
  contentApproved: false, publicationConfirmed: false, urlRecorded: false,
  invoiceSubmitted: false, invoiceAccepted: false, paymentRecorded: false,
};

function agreement(over: Partial<Agreement>): Agreement {
  return { ...emptyAgreement(), ...over };
}

function campaign(c: Omit<Campaign, 'deliverables' | 'publicationDate' | 'closeout' | 'invoiceStatus' | 'paymentStatus' | 'publicationUrl'> & Partial<Campaign>): Campaign {
  return {
    publicationUrl: '', invoiceStatus: 'Not submitted', paymentStatus: 'Not Invoiced', closeout: { ...noCloseout },
    deliverables: c.agreement.deliverables, publicationDate: c.agreement.publicationDate, ...c,
  };
}

const ME = 'Abhishek Jain';

export function buildSeed(): Persisted {
  const campaigns: Campaign[] = [
    campaign({
      id: 'c101', issueKey: 'CMP-101', title: 'Monsoon Edit', brand: 'Monsoon & Co.', creator: 'Aanya Deshmukh',
      owner: ME, status: 'In Review', priority: 'High', dueDate: '2026-10-12',
      brief: 'A tactile, everyday monsoon wardrobe edit: practical layers, considered details and a lived-in city point of view. One hero Reel supported by three Stories showing fabric, fit and rain-ready styling.',
      objective: 'Introduce the monsoon capsule and drive qualified product discovery.',
      audience: 'Urban India, 22-34, style-conscious professionals',
      blocker: 'Brand review of first-cut Reel',
      nextAction: 'Brand owner reviews first cut and consolidates feedback.',
      agreement: agreement({
        deliverables: '1 Reel + 3 Stories', fee: '₹27,000', usageRights: 'Organic only', paidUsageRights: 'Not applicable',
        exclusivity: 'No category exclusivity', revisions: '1 revision round', contentDeadline: '2026-10-05',
        publicationDate: '2026-10-12', paymentTerms: 'Net 30 from invoice (invoice raised after publication)',
        talkingPoints: 'Rain-ready layers; breathable fabrics in humid weather; mention the #MonsoonEdit capsule',
      }),
      closeout: { ...noCloseout },
    }),
    campaign({
      id: 'c102', issueKey: 'CMP-102', title: 'Festive Skin Launch', brand: 'Monsoon & Co. x Serein', creator: 'Ishita Kapoor',
      owner: 'Meera Nair', status: 'Terms to Confirm', priority: 'Urgent', dueDate: addDays(-2),
      brief: 'Launch film for a festive skincare set, focused on a realistic evening routine.',
      objective: 'Build launch awareness ahead of the festive gifting window.',
      audience: 'Skincare shoppers, 20-35', blocker: 'Fee and exclusivity not agreed with creator',
      nextAction: 'Owner confirms fee, paid usage and exclusivity with creator manager.',
      agreement: agreement({
        deliverables: '1 Reel + 4 Stories', fee: '', usageRights: 'Organic only', paidUsageRights: 'To be confirmed',
        exclusivity: 'To be confirmed', revisions: '2 revision rounds', contentDeadline: addDays(10),
        publicationDate: addDays(21), paymentTerms: '', talkingPoints: 'Gentle formulation; evening routine; gifting set contents',
      }),
    }),
    campaign({
      id: 'c103', issueKey: 'CMP-103', title: 'Everyday Essentials', brand: 'Monsoon & Co.', creator: 'Rhea Menon',
      owner: 'Kabir Rao', status: 'Draft Submitted', priority: 'Medium', dueDate: addDays(5),
      brief: 'A wardrobe-staples carousel and Reel on building a week of outfits from six pieces.',
      objective: 'Drive repeat purchase of core range.', audience: 'Working professionals, 24-38',
      blocker: '', nextAction: 'Brand owner starts review of submitted draft.',
      agreement: agreement({
        deliverables: '1 Reel + 2 Stories', fee: '₹18,500', usageRights: 'Organic, 90 days', paidUsageRights: 'Not applicable',
        exclusivity: 'None', revisions: '2 revision rounds', contentDeadline: addDays(-1), publicationDate: addDays(12),
        paymentTerms: 'Net 15 from invoice', talkingPoints: 'Six-piece capsule; mix-and-match; care instructions',
      }),
    }),
    campaign({
      id: 'c104', issueKey: 'CMP-104', title: 'Campus Style Stories', brand: 'Monsoon & Co.', creator: 'Devika Rao',
      owner: 'Rohan Mehta', status: 'Changes Requested', priority: 'High', dueDate: addDays(-1),
      brief: 'Three-part Story series on campus outfits for the new semester.',
      objective: 'Reach student audience ahead of back-to-college sales.', audience: 'College students, 18-23',
      blocker: 'Music licence for audio track unresolved', nextAction: 'Creator swaps audio and resubmits revised draft.',
      agreement: agreement({
        deliverables: '1 Reel + 3 Stories', fee: '₹21,000', usageRights: 'Organic only', paidUsageRights: 'Not applicable',
        exclusivity: 'None', revisions: '1 revision round', contentDeadline: addDays(-6), publicationDate: addDays(7),
        paymentTerms: 'Net 30 from invoice', talkingPoints: 'Campus-ready fits; student discount code',
      }),
    }),
    campaign({
      id: 'c105', issueKey: 'CMP-105', title: 'Weekend Café Reel', brand: 'Monsoon & Co.', creator: 'Arjun Bhat',
      owner: ME, status: 'Payment Pending', priority: 'Low', dueDate: addDays(-12),
      brief: 'A relaxed weekend café outing styled in the linen range.', objective: 'Show off-duty versatility of linen separates.',
      audience: 'Urban millennials, 25-40', blocker: '', nextAction: 'Finance to confirm payment after invoice acceptance.',
      agreement: agreement({
        deliverables: '1 Reel', fee: '₹14,000', usageRights: 'Organic only', paidUsageRights: 'Not applicable',
        exclusivity: 'None', revisions: '1 revision round', contentDeadline: addDays(-30), publicationDate: addDays(-16),
        paymentTerms: 'Net 30 from invoice', talkingPoints: 'Linen texture; weekend styling',
      }),
      publicationUrl: 'https://www.instagram.com/reel/example-weekend-cafe/', invoiceStatus: 'Accepted', paymentStatus: 'Processing',
      closeout: { contentApproved: true, publicationConfirmed: true, urlRecorded: true, invoiceSubmitted: true, invoiceAccepted: true, paymentRecorded: true },
    }),
    campaign({
      id: 'c106', issueKey: 'CMP-106', title: 'Heritage Weave Capsule', brand: 'Monsoon & Co.', creator: 'Kavya Iyer',
      owner: 'Meera Nair', status: 'Planning', priority: 'Low', dueDate: addDays(35),
      brief: 'Early planning for a handloom-focused capsule.', objective: 'Define scope and shortlist deliverables.',
      audience: 'Craft-aware shoppers, 28-45', blocker: '', nextAction: 'Owner drafts scope and requests terms from creator.',
      agreement: agreement({ deliverables: 'To be confirmed' }),
    }),
  ];

  const t = (n: number, campaignId: string, title: string, assignee: string, due: string, priority: Task['priority'], status: Task['status']): Task => ({
    id: `t${n}`, key: `TSK-${n}`, campaignId, title, assignee, dueDate: due, priority, status, completed: status === 'Done',
  });
  const tasks: Task[] = [
    t(1, 'c101', 'Confirm usage rights', ME, addDays(-20), 'High', 'Done'),
    t(2, 'c101', 'Approve campaign brief', 'Rohan Mehta', addDays(-14), 'High', 'Done'),
    t(3, 'c101', 'Submit first-cut Reel', 'Aanya Deshmukh', addDays(-3), 'High', 'Done'),
    t(4, 'c101', 'Consolidate brand feedback', ME, addDays(0), 'High', 'In Review'),
    t(5, 'c101', 'Review revised draft', 'Rohan Mehta', addDays(6), 'Medium', 'To Do'),
    t(6, 'c101', 'Confirm invoice details', 'Neha Kulkarni', '2026-10-14', 'Medium', 'To Do'),
    t(7, 'c101', 'Record publication URL', 'Aanya Deshmukh', '2026-10-13', 'Medium', 'To Do'),
    t(8, 'c101', 'Confirm payment received', 'Neha Kulkarni', '2026-11-13', 'Low', 'To Do'),
    t(9, 'c102', 'Confirm usage rights', ME, addDays(-2), 'Urgent', 'To Do'),
    t(10, 'c102', 'Agree fee with creator manager', 'Meera Nair', addDays(1), 'High', 'In Progress'),
    t(11, 'c103', 'Review submitted draft', 'Kabir Rao', addDays(2), 'Medium', 'In Review'),
    t(12, 'c103', 'Confirm invoice details', 'Neha Kulkarni', addDays(9), 'Low', 'To Do'),
    t(13, 'c104', 'Resolve music licence', 'Rohan Mehta', addDays(-1), 'High', 'Blocked'),
    t(14, 'c104', 'Review revised draft', ME, addDays(1), 'High', 'In Review'),
    t(15, 'c105', 'Record publication URL', 'Arjun Bhat', addDays(-16), 'Medium', 'Done'),
    t(16, 'c105', 'Confirm payment received', 'Neha Kulkarni', addDays(-4), 'High', 'In Progress'),
    t(17, 'c106', 'Approve campaign brief', ME, addDays(3), 'Medium', 'To Do'),
  ];

  const ago = (days: number, h = 10) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(h, 15, 0, 0);
    return d.toISOString();
  };
  const ev = (n: number, campaignId: string, actor: string, message: string, days: number, h?: number): ActivityEvent => ({
    id: `a${n}`, campaignId, actor, message, timestamp: ago(days, h), example: true,
  });
  const activity: ActivityEvent[] = [
    ev(1, 'c101', 'Rohan Mehta', 'Review requested on first-cut Reel', 2, 16),
    ev(2, 'c101', 'Aanya Deshmukh', 'Draft submitted: first-cut Reel', 3, 11),
    ev(3, 'c101', ME, 'Brief confirmed', 14, 12),
    ev(4, 'c101', ME, 'Terms updated: usage rights set to Organic only', 20, 15),
    ev(5, 'c102', 'Meera Nair', 'Status changed from Planning to Terms to Confirm', 6),
    ev(6, 'c103', 'Rhea Menon', 'Draft submitted', 1, 17),
    ev(7, 'c104', 'Rohan Mehta', 'Changes requested: swap audio track', 3, 14),
    ev(8, 'c105', 'Arjun Bhat', 'Publication URL recorded', 16, 9),
    ev(9, 'c105', ME, 'Invoice recorded as accepted', 8, 13),
  ];

  return { version: 2, workspaceName: 'Monsoon & Co.', campaigns, tasks, activity };
}
