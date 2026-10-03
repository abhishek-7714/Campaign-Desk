import type { Campaign, Task } from './types';
import {
  awaitingReview, campaignDone, campaignOverdue, CURRENT_USER,
  gapFields, taskOverdue, todayISO,
} from './helpers';

export type HealthCategory = 'active' | 'review' | 'blocked' | 'completed';

/** Current operational signals, calculated from saved records, not sample KPIs. */
export function campaignSignals(campaign: Campaign, tasks: readonly Task[]) {
  const related = tasks.filter((task) => task.campaignId === campaign.id);
  const doneTasks = related.filter((task) => task.completed || task.status === 'Done').length;
  const missing = gapFields(campaign.agreement).map((field) => field.label);
  const completed = campaignDone(campaign);
  const blockedTasks = related.some((task) => task.status === 'Blocked');
  const unresolvedTerms = campaign.status !== 'Planning' && missing.length > 0;
  const blocked = blockedTasks || unresolvedTerms ||
    (!!campaign.blocker && !awaitingReview(campaign) && campaign.status !== 'Planning');
  const category: HealthCategory = completed ? 'completed' :
    blocked ? 'blocked' : awaitingReview(campaign) ? 'review' : 'active';
  const immediateTasks = related.filter((task) => taskOverdue(task) || task.status === 'Blocked' ||
    (!task.completed && task.status === 'In Review' && task.assignee === CURRENT_USER &&
      !!task.dueDate && task.dueDate <= todayISO()));
  const attention = !completed && (campaignOverdue(campaign) || immediateTasks.length > 0 ||
    unresolvedTerms || !!campaign.blocker || campaign.status === 'Changes Requested' ||
    campaign.status === 'Payment Pending');
  const attentionCount = attention
    ? Math.max(1, immediateTasks.length + (unresolvedTerms ? missing.length : 0)) : 0;

  return {
    progress: related.length ? Math.round((doneTasks / related.length) * 100) : completed ? 100 : 0,
    category, attention, attentionCount, overdue: campaignOverdue(campaign),
    missing, doneTasks, totalTasks: related.length,
  };
}

function percent(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 1000) / 10 : 0;
}

export function dashboardSummary(campaigns: readonly Campaign[], tasks: readonly Task[]) {
  const complete = campaigns.filter(campaignDone).length;
  return {
    active: campaigns.length - complete,
    overdue: campaigns.filter(campaignOverdue).length,
    review: campaigns.filter((campaign) => !campaignDone(campaign) && awaitingReview(campaign)).length,
    needsAction: campaigns.filter((campaign) => campaignSignals(campaign, tasks).attention).length,
    completionRate: percent(complete, campaigns.length),
    taskCompletionRate: percent(tasks.filter((task) => task.completed || task.status === 'Done').length, tasks.length),
  };
}

export function campaignHealth(campaigns: readonly Campaign[], tasks: readonly Task[]) {
  const groups: { name: string; category: HealthCategory; color: string }[] = [
    { name: 'Active', category: 'active', color: '#ff6a2b' },
    { name: 'In review', category: 'review', color: '#1593a8' },
    { name: 'Blocked', category: 'blocked', color: '#e5484d' },
    { name: 'Completed', category: 'completed', color: '#2fa46b' },
  ];
  return groups.map(({ name, category, color }) => ({
    name, color,
    value: campaigns.filter((campaign) => campaignSignals(campaign, tasks).category === category).length,
  }));
}

export function workloadByOwner(tasks: readonly Task[]) {
  const owners = new Map<string, { name: string; open: number; overdue: number }>();
  tasks.forEach((task) => {
    if (task.completed || task.status === 'Done') return;
    const name = task.assignee || 'Unassigned';
    const owner = owners.get(name) ?? { name, open: 0, overdue: 0 };
    owner.open += 1;
    if (taskOverdue(task)) owner.overdue += 1;
    owners.set(name, owner);
  });
  return [...owners.values()].sort((a, b) => b.open - a.open || a.name.localeCompare(b.name));
}

export function attentionAreas(campaigns: readonly Campaign[], tasks: readonly Task[]) {
  const active = campaigns.filter((campaign) => !campaignDone(campaign));
  const activeIds = new Set(active.map((campaign) => campaign.id));
  const openTasks = tasks.filter((task) => activeIds.has(task.campaignId) && !task.completed && task.status !== 'Done');
  return [
    {
      name: 'Unresolved terms', count: active.reduce((sum, campaign) => sum + gapFields(campaign.agreement).length, 0),
      description: 'Missing or unconfirmed agreement fields, including planning campaigns.',
      href: '/agreements',
    },
    {
      name: 'Overdue tasks', count: openTasks.filter(taskOverdue).length,
      description: 'Open tasks with a due date before today.', href: '/my-work',
    },
    {
      name: 'Awaiting review', count: openTasks.filter((task) => task.status === 'In Review').length,
      description: 'Tasks waiting for a reviewer decision.', href: '/board',
    },
    {
      name: 'Payment follow-up', count: active.filter((campaign) => campaign.status === 'Payment Pending' && campaign.paymentStatus !== 'Paid').length,
      description: 'Payment-pending campaigns not yet recorded as paid.', href: '/campaigns',
    },
    {
      name: 'Blocked tasks', count: openTasks.filter((task) => task.status === 'Blocked').length,
      description: 'Tasks explicitly marked Blocked.', href: '/board',
    },
  ].sort((a, b) => b.count - a.count);
}

/** Deterministic observations, not AI-generated or externally verified claims. */
export function derivedInsights(campaigns: readonly Campaign[], tasks: readonly Task[]) {
  const areas = attentionAreas(campaigns, tasks);
  const top = areas.find((area) => area.count > 0);
  const owners = workloadByOwner(tasks);
  const busiest = owners[0];
  const insights = top
    ? [`${top.name} is the largest attention area: ${top.count} ${top.name === 'Unresolved terms' ? 'fields' : 'items'} to resolve.`]
    : ['No unresolved attention areas in the current workspace.'];
  if (busiest) {
    const ties = owners.filter((owner) => owner.open === busiest.open);
    insights.push(ties.length > 1
      ? `${ties.length} owners share the largest workload, with ${busiest.open} open tasks each.`
      : `${busiest.name} has the largest workload, with ${busiest.open} open ${busiest.open === 1 ? 'task' : 'tasks'}.`);
  }
  return insights;
}