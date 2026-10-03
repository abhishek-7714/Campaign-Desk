import type { Campaign, Task } from './types';
import { campaignOverdue, fmtDate, gapFields, awaitingReview, todayISO } from './helpers';
import { campaignSignals } from './analytics';
import { taskOverdue } from './helpers';
import type { Tone } from './format';

export interface AttentionItem { campaign: Campaign; label: string; desc: string; tone: Tone; cta: string; href: string; due: string; rank: number }

export function attentionItems(campaigns: Campaign[], tasks: Task[]): AttentionItem[] {
  const out: AttentionItem[] = [];
  for (const c of campaigns) {
    if (!campaignSignals(c, tasks).attention) continue;
    const related = tasks.filter((task) => task.campaignId === c.id);
    const gaps = gapFields(c.agreement);
    const base = `/campaigns/${c.id}`;
    const due = c.dueDate === todayISO() ? 'Due today' : campaignOverdue(c) ? 'Overdue' : c.dueDate ? `Due ${fmtDate(c.dueDate)}` : '';
    const hasBlocker = !!c.blocker.trim() && !/^none$/i.test(c.blocker.trim());
    const urgent = c.priority === 'Urgent' || c.priority === 'High';
    const mk = (label: string, desc: string, tone: Tone, cta: string, tab: string, rank: number) => out.push({ campaign: c, label, desc, tone, cta, href: `${base}?tab=${tab}`, due, rank });
    if (gaps.length && c.status !== 'Planning') mk('Terms to confirm', `${gaps.length} unresolved: ${gaps.slice(0, 3).map((g) => g.label).join(', ')}.`, urgent ? 'coral' : 'yellow', 'Resolve', 'agreement', urgent ? 0 : 1);
    else if (c.status === 'Payment Pending' && c.paymentStatus !== 'Paid') mk('Payment pending', c.nextAction || 'Record the invoice and payment status.', campaignOverdue(c) ? 'coral' : 'yellow', 'Review', 'closeout', 2);
    else if (c.status === 'Changes Requested' || related.some((task) => task.status === 'Blocked')) mk(c.status === 'Changes Requested' ? 'Changes requested' : 'Blocked task', c.blocker || c.nextAction || 'Resolve the blocked task to continue.', 'coral', 'Resolve', 'tasks', 1);
    else if (awaitingReview(c)) mk('Awaiting review', c.nextAction || 'Review the submitted work and record your decision.', 'purple', 'Review', 'tasks', 3);
    else if (hasBlocker) mk('Blocked', c.blocker, 'coral', 'Resolve', 'overview', 1);
    else if (related.some(taskOverdue)) mk('Overdue tasks', c.nextAction || 'Review outstanding tasks and update their status.', 'coral', 'Resolve', 'tasks', 2);
    else if (campaignOverdue(c)) mk('Past due date', `${c.title} was due ${fmtDate(c.dueDate)}. ${c.nextAction}`, 'coral', 'Resolve', 'overview', 2);
  }
  return out.sort((a, b) => a.rank - b.rank);
}
