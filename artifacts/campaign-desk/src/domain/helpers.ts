import type { Agreement, Campaign, Status, Task } from './types';
import { STATUSES } from './types';

export const CURRENT_USER = 'Meera Nair';
export const STORAGE_KEY = 'nano-club:v3';

const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());
export const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const fmtDate = (iso: string) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const initials = (name: string) =>
  name.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export const campaignDone = (c: Campaign) => c.status === 'Complete';
export const campaignOverdue = (c: Campaign) => !campaignDone(c) && !!c.dueDate && c.dueDate < todayISO();
export const campaignDueSoon = (c: Campaign) =>
  !campaignDone(c) && !!c.dueDate && c.dueDate >= todayISO() && c.dueDate <= addDays(7);
export const awaitingReview = (c: Campaign) => c.status === 'In Review' || c.status === 'Draft Submitted';
export const taskOverdue = (t: Task) => !t.completed && t.status !== 'Done' && !!t.dueDate && t.dueDate < todayISO();

export interface AgreementField {
  key: keyof Agreement;
  label: string;
  kind: 'text' | 'textarea' | 'date';
  hint: string;
}
export const AGREEMENT_FIELDS: AgreementField[] = [
  { key: 'deliverables', label: 'Deliverables', kind: 'text', hint: 'e.g. 1 Reel + 3 Stories' },
  { key: 'fee', label: 'Fee', kind: 'text', hint: 'e.g. ₹27,000' },
  { key: 'usageRights', label: 'Organic usage rights', kind: 'text', hint: 'e.g. Organic only' },
  { key: 'paidUsageRights', label: 'Paid usage rights', kind: 'text', hint: 'Type "Not applicable" if none' },
  { key: 'exclusivity', label: 'Exclusivity', kind: 'text', hint: 'Category and duration, or "None"' },
  { key: 'revisions', label: 'Included revision rounds', kind: 'text', hint: 'e.g. 1 revision round' },
  { key: 'contentDeadline', label: 'Content deadline', kind: 'date', hint: 'Creator delivery date' },
  { key: 'publicationDate', label: 'Publication date', kind: 'date', hint: 'Agreed go-live date' },
  { key: 'paymentTerms', label: 'Payment terms and invoice trigger', kind: 'text', hint: 'e.g. Net 30 from invoice' },
  { key: 'talkingPoints', label: 'Required talking points', kind: 'textarea', hint: 'Messages the creator must cover' },
];

export const isGap = (v: string) => !v.trim() || /^to be confirmed$/i.test(v.trim());
export const gapFields = (a: Agreement) => AGREEMENT_FIELDS.filter((f) => isGap(a[f.key]));
export const missingTerms = (c: Campaign) => gapFields(c.agreement).length;

export const emptyAgreement = (): Agreement => ({
  deliverables: '', fee: '', usageRights: '', paidUsageRights: '', exclusivity: '', revisions: '',
  contentDeadline: '', publicationDate: '', paymentTerms: '', talkingPoints: '',
});

export const WORKFLOW_STAGES = ['Terms', 'Brief', 'Draft', 'Review', 'Revisions', 'Approved', 'Published', 'Payment'] as const;
const STAGE_OF: Record<Status, number> = {
  Planning: 0, 'Terms to Confirm': 0, 'Brief Ready': 1, 'Draft Submitted': 2, 'In Review': 3,
  'Changes Requested': 4, Approved: 5, Published: 6, 'Payment Pending': 7, Complete: 7,
};
export const stageIndex = (s: Status) => STAGE_OF[s];

/** Returns reasons a transition is blocked. Empty array means allowed. */
export function transitionBlockers(c: Campaign, to: Status): string[] {
  const reasons: string[] = [];
  if (to === c.status) return reasons;
  const leavesTerms = stageIndex(to) > 0;
  const gaps = gapFields(c.agreement);
  if (leavesTerms && gaps.length) {
    reasons.push(`Agreement incomplete (${gaps.length}): ${gaps.map((g) => g.label).join(', ')}.`);
  }
  if (['Published', 'Payment Pending', 'Complete'].includes(to) && !c.closeout.contentApproved) {
    reasons.push('Content must be marked approved in Closeout.');
  }
  if (['Payment Pending', 'Complete'].includes(to) && !c.closeout.publicationConfirmed) {
    reasons.push('Publication must be confirmed in Closeout.');
  }
  if (to === 'Complete' && c.paymentStatus !== 'Paid') {
    reasons.push('Payment status must be recorded as Paid before closing the campaign.');
  }
  return reasons;
}
export const nextStatus = (s: Status): Status | null => STATUSES[STATUSES.indexOf(s) + 1] ?? null;

export const validUrl = (v: string) => {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};
