export const STATUSES = [
  'Planning', 'Terms to Confirm', 'Brief Ready', 'Draft Submitted', 'In Review',
  'Changes Requested', 'Approved', 'Published', 'Payment Pending', 'Complete',
] as const;
export type Status = (typeof STATUSES)[number];

export const TASK_STATUSES = ['To Do', 'In Progress', 'In Review', 'Blocked', 'Done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PAYMENT_STATUSES = ['Not Invoiced', 'Invoice Submitted', 'Invoice Accepted', 'Processing', 'Paid'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface Agreement {
  deliverables: string;
  fee: string;
  usageRights: string; // organic usage rights
  paidUsageRights: string; // "Not applicable" is a valid explicit answer
  exclusivity: string;
  revisions: string;
  contentDeadline: string; // ISO date
  publicationDate: string; // ISO date
  paymentTerms: string; // payment terms + invoice trigger
  talkingPoints: string;
}

export interface Closeout {
  contentApproved: boolean;
  publicationConfirmed: boolean;
  urlRecorded: boolean;
  invoiceSubmitted: boolean;
  invoiceAccepted: boolean;
  paymentRecorded: boolean;
}

export interface Campaign {
  id: string;
  issueKey: string;
  title: string;
  brand: string;
  creator: string;
  owner: string;
  status: Status;
  priority: Priority;
  dueDate: string;
  brief: string;
  objective: string;
  deliverables: string;
  audience: string;
  publicationDate: string;
  blocker: string;
  nextAction: string;
  agreement: Agreement;
  publicationUrl: string;
  invoiceStatus: 'Not submitted' | 'Submitted' | 'Accepted';
  paymentStatus: PaymentStatus;
  closeout: Closeout;
}

export interface Task {
  id: string;
  key: string;
  campaignId: string;
  title: string;
  assignee: string;
  dueDate: string;
  priority: Priority;
  status: TaskStatus;
  completed: boolean;
}

export interface ActivityEvent {
  id: string;
  campaignId: string;
  actor: string;
  message: string;
  timestamp: string;
  example?: boolean;
}

export interface Persisted {
  version: 2;
  workspaceName: string;
  campaigns: Campaign[];
  tasks: Task[];
  activity: ActivityEvent[];
}
