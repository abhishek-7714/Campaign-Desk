/**
 * Fictional creator directory for the prototype. Names, handles and numbers are invented.
 * The first seven creators are hand-written because the demo story depends on them; the
 * rest are generated with a fixed seed so the directory is identical on every load.
 */
import type { Creator, Language, Niche, PastWork, Tier } from './types';
import { hash, mulberry32 } from './performance';
import { roundTo } from './money';

/** The creator the "Creator" view acts as. */
export const ACTING_CREATOR_ID = 'cr01';

const OTHER_BRANDS = ['Serein Skin', 'Trailhead Gear', 'Notebook Club', 'Brewlab Coffee', 'Kisan Kitchen', 'Fitnest', 'Glow Naturals', 'Urban Loom'];
const PAST_TITLES = ['Launch seeding', 'Festive set', 'Summer drop', 'Always-on creators', 'New flavour push', 'Back-to-work edit'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

const CITY_LANGS: Record<string, Language[]> = {
  Mumbai: ['English', 'Hindi', 'Marathi'], Delhi: ['English', 'Hindi', 'Punjabi'], Bengaluru: ['English', 'Kannada', 'Hindi'],
  Pune: ['English', 'Hindi', 'Marathi'], Hyderabad: ['English', 'Telugu', 'Hindi'], Chennai: ['English', 'Tamil'],
  Kolkata: ['English', 'Bengali', 'Hindi'], Ahmedabad: ['English', 'Gujarati', 'Hindi'], Jaipur: ['English', 'Hindi'], Chandigarh: ['English', 'Punjabi', 'Hindi'],
};
const CITY_POOL = ['Mumbai', 'Mumbai', 'Delhi', 'Delhi', 'Bengaluru', 'Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Chandigarh'];

const FIRST = ['Aditi', 'Aarav', 'Ishaan', 'Meher', 'Tanvi', 'Karan', 'Sneha', 'Vihaan', 'Riya', 'Aryan', 'Pooja', 'Dev', 'Nisha', 'Samar', 'Kritika', 'Yash', 'Shreya', 'Harsh', 'Divya', 'Nikhil',
  'Pranav', 'Simran', 'Tara', 'Varun', 'Zoya', 'Arnav', 'Bhavna', 'Chirag', 'Esha', 'Farhan', 'Gauri', 'Hitesh', 'Ira', 'Jatin', 'Kiara', 'Lakshya', 'Mansi', 'Naman', 'Oviya', 'Parth'];
const LAST = ['Sharma', 'Verma', 'Iyer', 'Nair', 'Reddy', 'Gupta', 'Joshi', 'Mehta', 'Kulkarni', 'Singh', 'Bose', 'Das', 'Patel', 'Shah', 'Khanna', 'Menon', 'Pillai', 'Chopra', 'Saxena', 'Bhatt'];

const SUFFIX: Record<Niche, string[]> = {
  Fitness: ['.fit', 'moves', '.lifts', 'trains'], Food: ['.eats', '.bites', 'cooks', '.kitchen'], 'Health & wellness': ['.wellness', '.healthy', 'nourish'],
  Lifestyle: ['.daily', 'lifestyle', '.diaries'], 'Student life': ['.campus', 'studentlife', '.uni'], Parenting: ['.momlife', 'parenting', '.parents'],
  Fashion: ['.style', 'wears', '.fits'], Travel: ['.wanders', 'travels', '.trips'], Comedy: ['.lol', 'jokes', '.skits'], Tech: ['.tech', 'gadgets', '.byte'],
};
const BIO: Record<Niche, string> = {
  Fitness: 'Simple home workouts and honest protein reviews.', Food: 'Quick Indian breakfasts and easy meal prep for busy people.',
  'Health & wellness': 'Balanced eating, sleep and small habits that stick.', Lifestyle: 'Daily routines, desk setups and realistic city life.',
  'Student life': 'Hostel hacks, study routines and budget meals.', Parenting: 'Lunchbox ideas and school-run survival for working parents.',
  Fashion: 'Everyday outfits that cost less than they look.', Travel: 'Weekend getaways and packing lists that work.', Comedy: 'Relatable skits about work, family and food.', Tech: 'Gadget reviews without the jargon.',
};

interface Seedling {
  id: string; name: string; handle: string; city: string; niches: Niche[]; tier: Tier; followers: number; avgViews: number; er: number;
  onTime: number; delivered: number; rate: number; bio: string; connected: boolean; languages?: Language[]; campaigns: number; barter?: boolean; verified?: boolean;
}

const FEATURED: Seedling[] = [
  { id: 'cr01', name: 'Ananya Rao', handle: 'ananya.eats', city: 'Pune', niches: ['Food', 'Health & wellness'], tier: 'Micro', followers: 42300, avgViews: 38000, er: 6.4, onTime: 94, delivered: 108, rate: 6500,
    bio: 'Quick Indian breakfasts and protein-friendly meal prep. Pune. Hindi and English.', connected: false, languages: ['English', 'Hindi', 'Marathi'], campaigns: 4, verified: true },
  { id: 'cr02', name: 'Rohan Malhotra', handle: 'rohan.lifts', city: 'Delhi', niches: ['Fitness'], tier: 'Mid', followers: 212000, avgViews: 140000, er: 4.1, onTime: 88, delivered: 96, rate: 24000,
    bio: 'Strength coach. Gym routines, macros and supplement honesty.', connected: true, campaigns: 9, verified: true },
  { id: 'cr03', name: 'Ishita Kapoor', handle: 'ishita.style', city: 'Mumbai', niches: ['Fashion', 'Lifestyle'], tier: 'Micro', followers: 61800, avgViews: 52000, er: 5.2, onTime: 61, delivered: 72, rate: 8500,
    bio: 'Everyday styling and honest hauls. Often busy, always worth the wait.', connected: false, campaigns: 6 },
  { id: 'cr04', name: 'Rhea Menon', handle: 'rhea.cooks', city: 'Bengaluru', niches: ['Food', 'Lifestyle'], tier: 'Micro', followers: 38400, avgViews: 29000, er: 7.1, onTime: 91, delivered: 118, rate: 5000,
    bio: 'Weeknight dinners and lunchbox ideas.', connected: true, campaigns: 5 },
  { id: 'cr05', name: 'Devika Rao', handle: 'devika.campus', city: 'Chennai', niches: ['Student life', 'Lifestyle'], tier: 'Nano', followers: 8900, avgViews: 11500, er: 9.4, onTime: 82, delivered: 124, rate: 1800,
    bio: 'Hostel hacks and study routines.', connected: false, campaigns: 3, barter: true },
  { id: 'cr06', name: 'Arjun Bhat', handle: 'arjun.lol', city: 'Mumbai', niches: ['Comedy'], tier: 'Micro', followers: 74500, avgViews: 88000, er: 5.8, onTime: 79, delivered: 131, rate: 9500,
    bio: 'Office and family skits. Brands love the comments.', connected: true, campaigns: 7, verified: true },
  { id: 'cr07', name: 'Kavya Iyer', handle: 'kavya.daily', city: 'Chennai', niches: ['Lifestyle', 'Fashion'], tier: 'Micro', followers: 29600, avgViews: 21000, er: 6.9, onTime: 90, delivered: 99, rate: 4000,
    bio: 'Handloom, home and slow mornings.', connected: false, campaigns: 3 },
];

function pick<T>(rng: () => number, a: readonly T[]): T { return a[Math.floor(rng() * a.length)]; }

function build(s: Seedling, rng: () => number): Creator {
  const topCities = [s.city, ...CITY_POOL.filter((c) => c !== s.city)].filter((c, i, a) => a.indexOf(c) === i);
  const past: PastWork[] = Array.from({ length: s.campaigns >= 3 ? 3 : 2 }, (_, i) => ({
    brand: OTHER_BRANDS[(hash(s.id) + i * 3) % OTHER_BRANDS.length],
    title: PAST_TITLES[(hash(s.id) + i) % PAST_TITLES.length],
    month: `${MONTHS[(hash(s.id) + i * 2) % MONTHS.length]} 2026`,
    deliveredPct: Math.max(35, Math.round(s.delivered + (rng() - 0.5) * 30)),
  }));
  return {
    id: s.id, name: s.name, handle: s.handle, city: s.city, languages: s.languages ?? CITY_LANGS[s.city] ?? ['English', 'Hindi'],
    niches: s.niches, tier: s.tier, followers: s.followers, avgViews: s.avgViews, engagementRate: s.er, onTimeRate: s.onTime, deliveredPct: s.delivered,
    rate: s.rate, openToBarter: s.barter ?? (s.tier === 'Nano' ? rng() < 0.7 : s.tier === 'Micro' ? rng() < 0.35 : rng() < 0.1),
    bio: s.bio,
    audience: {
      female: Math.round(34 + rng() * 46), age18to24: Math.round(22 + rng() * 34), age25to34: Math.round(28 + rng() * 22),
      topCities: topCities.slice(0, 3),
    },
    samples: Array.from({ length: 6 }, () => Math.round(s.avgViews * (0.4 + rng() * 1.5))),
    hue: hash(s.name) % 360,
    verified: s.verified ?? (s.tier === 'Mid' ? rng() < 0.6 : s.tier === 'Micro' ? rng() < 0.25 : rng() < 0.08),
    instagramConnected: s.connected,
    campaignsOnPlatform: s.campaigns,
    responseTime: rng() < 0.45 ? 'Under 2 hours' : rng() < 0.7 ? 'Same day' : 'Within 2 days',
    past,
  };
}

export function buildCreators(): Creator[] {
  const rng = mulberry32(20261003);
  const used = new Set(FEATURED.map((f) => f.handle));
  const usedNames = new Set(FEATURED.map((f) => f.name));
  const seeds: Seedling[] = [...FEATURED];
  const plan: Tier[] = [
    ...Array<Tier>(14).fill('Nano'), ...Array<Tier>(19).fill('Micro'), ...Array<Tier>(8).fill('Mid'),
  ];
  // Shuffle the tier plan so the directory does not read in blocks.
  for (let i = plan.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [plan[i], plan[j]] = [plan[j], plan[i]]; }

  plan.forEach((tier, i) => {
    let name = '';
    for (let guard = 0; guard < 50; guard += 1) {
      name = `${pick(rng, FIRST)} ${pick(rng, LAST)}`;
      if (!usedNames.has(name)) break;
    }
    usedNames.add(name);
    const niche = pick(rng, ['Fitness', 'Food', 'Food', 'Health & wellness', 'Lifestyle', 'Student life', 'Parenting', 'Fashion', 'Travel', 'Comedy', 'Tech'] as Niche[]);
    const second = rng() < 0.45 ? pick(rng, ['Lifestyle', 'Food', 'Health & wellness', 'Fitness'] as Niche[]) : null;
    const niches = second && second !== niche ? [niche, second] : [niche];
    const city = pick(rng, CITY_POOL);
    const base = name.split(' ')[0].toLowerCase();
    let handle = `${base}${pick(rng, SUFFIX[niche])}`;
    if (used.has(handle)) handle = `${base}${pick(rng, SUFFIX[niche])}${i + 1}`;
    used.add(handle);

    let followers: number; let avgViews: number; let er: number;
    if (tier === 'Nano') { followers = Math.round(2000 + rng() * 7900); avgViews = Math.round(followers * (0.8 + rng() * 1.7)); er = 7 + rng() * 5; }
    else if (tier === 'Micro') { followers = Math.round(10500 + rng() * 84000); avgViews = Math.round(followers * (0.4 + rng())); er = 4.5 + rng() * 3.5; }
    else { followers = Math.round(110000 + rng() * 370000); avgViews = Math.round(followers * (0.25 + rng() * 0.45)); er = 2.8 + rng() * 2.7; }
    avgViews = Math.round(avgViews / 100) * 100;
    const rate = Math.max(600, roundTo(((avgViews * 0.9) / 1000) * (70 + rng() * 70), 500));
    const onTime = Math.round(55 + Math.pow(rng(), 0.55) * 43);
    const delivered = Math.round(58 + rng() * 76);

    seeds.push({
      id: `cr${String(seeds.length + 1).padStart(2, '0')}`, name, handle, city, niches, tier, followers, avgViews, er: Math.round(er * 10) / 10,
      onTime, delivered, rate, bio: BIO[niche], connected: rng() < 0.38, campaigns: 1 + Math.floor(rng() * 11),
    });
  });
  return seeds.map((s) => build(s, rng));
}
