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

/**
 * A "collaboration": one creator working on one programme (or a standalone deal).
 * The app calls these "Collaborations" in the UI; the type keeps its original name.
 */
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
  /** Link to the programme (umbrella campaign) and the creator record. */
  programmeId?: string;
  creatorId?: string;
  /** Discount code handed to the creator, and sample sales behaviour. */
  code?: string;
  /** Orders per view (sample data). Orders = latest views x convRate. */
  convRate?: number;
  /** Average order value in rupees (sample data). */
  aov?: number;
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

/* ------------------------------------------------------------------ */
/* Marketplace and performance model                                   */
/* ------------------------------------------------------------------ */

export const NICHES = ['Fitness', 'Food', 'Health & wellness', 'Lifestyle', 'Student life', 'Parenting', 'Fashion', 'Travel', 'Comedy', 'Tech'] as const;
export type Niche = (typeof NICHES)[number];

export const TIERS = ['Nano', 'Micro', 'Mid'] as const;
export type Tier = (typeof TIERS)[number];

export const LANGUAGES = ['English', 'Hindi', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Gujarati', 'Punjabi'] as const;
export type Language = (typeof LANGUAGES)[number];

export const CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Chandigarh'] as const;

export interface PastWork { brand: string; title: string; month: string; deliveredPct: number }

export interface Creator {
  id: string;
  name: string;
  handle: string; // without @
  city: string;
  languages: string[];
  niches: Niche[];
  tier: Tier;
  followers: number;
  /** Average views on the last 10 reels (what fees are priced on). */
  avgViews: number;
  /** Engagement as a percent of views. */
  engagementRate: number;
  /** Percent of deliverables published by the agreed date, across campaigns on the platform. */
  onTimeRate: number;
  /** Average percent of expected views delivered, across campaigns on the platform. */
  deliveredPct: number;
  /** Asking rate for one Reel, in rupees. */
  rate: number;
  openToBarter: boolean;
  bio: string;
  audience: { female: number; age18to24: number; age25to34: number; topCities: string[] };
  /** Sample content tiles: view counts of recent posts. */
  samples: number[];
  /** Decorative avatar colour (hue, 0-360). */
  hue: number;
  verified: boolean;
  /** Creator has linked their Instagram professional account to nano.club. */
  instagramConnected: boolean;
  campaignsOnPlatform: number;
  responseTime: string;
  past: PastWork[];
}

export type ProgrammeStatus = 'Draft' | 'Open call' | 'Live' | 'Completed';

export interface Programme {
  id: string;
  name: string;
  brand: string;
  objective: string;
  brief: string;
  product: string;
  niches: Niche[];
  tiers: Tier[];
  cities: string[];
  status: ProgrammeStatus;
  budget: number;
  /** Plan rate: rupees per 1,000 expected views. Fees are suggested from this. */
  ratePer1000: number;
  startDate: string;
  endDate: string;
  applyBy: string;
  slots: number;
  deliverable: string; // e.g. "1 Reel + 1 Story"
  feeMin: number;
  feeMax: number;
  codePrefix: string;
  createdAt: string;
}

export type ApplicationStatus = 'Applied' | 'Shortlisted' | 'Invited' | 'Negotiating' | 'Accepted' | 'Declined' | 'Rejected';
export const APPLICATION_COLUMNS = ['Applied', 'Shortlisted', 'Invited', 'Negotiating', 'Accepted'] as const;

export interface ApplicationNote { at: string; by: 'brand' | 'creator'; text: string }

export interface Application {
  id: string;
  programmeId: string;
  creatorId: string;
  /** Who started it: a creator applying to an open call, or a brand inviting from the marketplace. */
  origin: 'creator' | 'brand';
  status: ApplicationStatus;
  /** The fee currently on the table, in rupees. */
  fee: number;
  /** Whose move it is, for Negotiating items. */
  lastMoveBy: 'brand' | 'creator';
  message: string;
  updatedAt: string;
  /** Collaboration (Campaign) created once accepted. */
  collaborationId?: string;
  notes: ApplicationNote[];
}
export type ApplicationAction = 'shortlist' | 'reject' | 'accept' | 'decline' | 'counter';

export type PostType = 'Reel' | 'Post' | 'Story';
export type InsightSource = 'creator-screenshot' | 'creator-connected' | 'brand-connected';

export interface Snapshot { day: number; views: number; likes: number; comments: number }

export interface PostInsights {
  reach: number;
  saves: number;
  shares: number;
  /** Stories only: views are not public, so they arrive with the insights. */
  views?: number;
  replies?: number;
  source: InsightSource;
  at: string; // ISO timestamp
}

export interface Post {
  id: string;
  programmeId: string;
  collaborationId: string;
  creatorId: string;
  type: PostType;
  /** Public link. Empty until the creator or brand supplies it. Stories have none. */
  url: string;
  plannedDate: string; // ISO date
  postedAt: string; // ISO date, empty until posted
  /** Views the brand paid for. Set on the Reel only. */
  expectedViews: number;
  /** Public numbers collected by the (simulated) scraper, oldest first. */
  snapshots: Snapshot[];
  lastRefreshed: string; // ISO timestamp
  /** While in the future, the row shows a "fetching" state. Epoch ms. */
  fetchingUntil: number;
  /** Private numbers: reach, saves, shares. Only present when confirmed. */
  insights?: PostInsights;
  insightRequested: boolean;
  /** Posted as an Instagram Collab post, so the brand's own account can read the insights. */
  isCollab: boolean;
  /** Multiplier on expected views used by the sample-data simulator. */
  factor: number;
}

export interface Integrations { shopify: boolean; instagram: boolean }
export type Role = 'brand' | 'creator';

export interface Persisted {
  version: 3;
  workspaceName: string;
  role: Role;
  actingCreatorId: string;
  shortlist: string[];
  integrations: Integrations;
  creators: Creator[];
  programmes: Programme[];
  applications: Application[];
  posts: Post[];
  campaigns: Campaign[];
  tasks: Task[];
  activity: ActivityEvent[];
}
