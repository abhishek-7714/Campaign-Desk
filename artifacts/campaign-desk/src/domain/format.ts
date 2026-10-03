export const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (m < 60 * 24) return `${Math.round(m / 60)}h ago`;
  const d = Math.round(m / 1440);
  return d === 1 ? 'Yesterday' : `${d} days ago`;
};
export const shortDate = (d: string) => {
  const x = new Date(`${d}T12:00:00`);
  return Number.isNaN(x.getTime()) ? d : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
export type Tone = 'blue' | 'purple' | 'yellow' | 'coral' | 'green' | 'mint' | 'peach' | 'indigo' | 'neutral';
export const categoryTone = (c: string): Tone => ({ active: 'blue', review: 'purple', blocked: 'coral', completed: 'green' } as Record<string, Tone>)[c] ?? 'neutral';
export const categoryLabel = (c: string) => ({ active: 'Active', review: 'In review', blocked: 'Blocked', completed: 'Completed' } as Record<string, string>)[c] ?? c;
export const taskTone = (s: string): Tone => ({ 'To Do': 'yellow', 'In Progress': 'blue', 'In Review': 'purple', Blocked: 'coral', Done: 'green' } as Record<string, Tone>)[s] ?? 'neutral';
export const priorityTone = (p: string): Tone => ({ Urgent: 'coral', High: 'peach', Medium: 'yellow', Low: 'neutral' } as Record<string, Tone>)[p] ?? 'neutral';
