/**
 * Fictional measurement dataset for the visual prototype.
 * These readings are not collected from social platforms or reconstructed from
 * the editable operational store. Keep "Demo data" attribution visible in UI.
 */
const observations = [
  { date: '2026-09-22', reach: 1000, engagements: 122, sent: 50, responded: 30, turnaroundDays: 4.8 },
  { date: '2026-09-23', reach: 1000, engagements: 138, sent: 50, responded: 32, turnaroundDays: 4.5 },
  { date: '2026-09-24', reach: 1000, engagements: 131, sent: 50, responded: 31, turnaroundDays: 4.6 },
  { date: '2026-09-25', reach: 1000, engagements: 157, sent: 50, responded: 35, turnaroundDays: 4.2 },
  { date: '2026-09-26', reach: 1000, engagements: 145, sent: 50, responded: 34, turnaroundDays: 4.0 },
  { date: '2026-09-27', reach: 1000, engagements: 163, sent: 50, responded: 37, turnaroundDays: 3.9 },
  { date: '2026-09-28', reach: 1000, engagements: 172, sent: 50, responded: 38, turnaroundDays: 3.7 },
  { date: '2026-09-29', reach: 1000, engagements: 159, sent: 50, responded: 36, turnaroundDays: 3.8 },
  { date: '2026-09-30', reach: 1000, engagements: 176, sent: 50, responded: 39, turnaroundDays: 3.5 },
  { date: '2026-10-01', reach: 1000, engagements: 169, sent: 50, responded: 38, turnaroundDays: 3.4 },
  { date: '2026-10-02', reach: 1000, engagements: 179, sent: 50, responded: 40, turnaroundDays: 3.3 },
  { date: '2026-10-03', reach: 1000, engagements: 184, sent: 50, responded: 41, turnaroundDays: 3.2 },
] as const;

export const DEMO_ENGAGEMENT = observations.map((reading) => ({
  date: reading.date,
  engagementRate: (reading.engagements / reading.reach) * 100,
  responseRate: (reading.responded / reading.sent) * 100,
}));

export const DEMO_OVERDUE = [
  { date: '2026-09-22', overdue: 7 }, { date: '2026-09-23', overdue: 6 },
  { date: '2026-09-24', overdue: 8 }, { date: '2026-09-25', overdue: 6 },
  { date: '2026-09-26', overdue: 5 }, { date: '2026-09-27', overdue: 6 },
  { date: '2026-09-28', overdue: 4 }, { date: '2026-09-29', overdue: 5 },
  { date: '2026-09-30', overdue: 4 }, { date: '2026-10-01', overdue: 3 },
  { date: '2026-10-02', overdue: 4 }, { date: '2026-10-03', overdue: 3 },
];

const latest = observations[observations.length - 1];
export const DEMO_METRICS = {
  engagementRate: (latest.engagements / latest.reach) * 100,
  responseRate: (latest.responded / latest.sent) * 100,
  averageTurnaround: latest.turnaroundDays,
};