import type { Campaign, Task } from './types';

export const matchCampaign = (c: Campaign, tasks: Task[], q: string) =>
  !q || [c.issueKey, c.title, c.brand, c.creator, c.owner, c.status, c.nextAction, ...tasks.filter((t) => t.campaignId === c.id).map((t) => `${t.key} ${t.title}`)]
    .join(' ').toLowerCase().includes(q);

export const matchTask = (t: Task, campaignLabel: string, q: string) =>
  !q || `${t.key} ${t.title} ${t.assignee} ${t.status} ${campaignLabel}`.toLowerCase().includes(q);
