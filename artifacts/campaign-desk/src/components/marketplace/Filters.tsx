import { Search } from 'lucide-react';
import { CITIES, LANGUAGES, NICHES, TIERS } from '@/domain/types';
import { ONTIME_OPTIONS, RATE_OPTIONS } from './helpers';
import '@/styles/marketplace.css';

export const SORTS = [
  { value: 'match', label: 'Best match' },
  { value: 'delivery', label: 'Best delivery history' },
  { value: 'rate', label: 'Lowest rate' },
  { value: 'followers', label: 'Most followers' },
  { value: 'engagement', label: 'Highest engagement' },
] as const;

export interface Filters {
  q: string;
  niches: string[];
  tiers: string[];
  city: string;
  lang: string;
  rate: string;
  ontime: string;
  barter: boolean;
  sort: string;
}

export const EMPTY_FILTERS: Filters = { q: '', niches: [], tiers: [], city: 'any', lang: 'any', rate: 'any', ontime: '0', barter: false, sort: 'match' };

export const hasActiveFilters = (f: Filters) =>
  !!f.q || f.niches.length > 0 || f.tiers.length > 0 || f.city !== 'any' || f.lang !== 'any' || f.rate !== 'any' || f.ontime !== '0' || f.barter;

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export default function FilterBar({ f, set }: { f: Filters; set: (patch: Partial<Filters>) => void }) {
  return (
    <section className="mp-filters card" aria-label="Filter creators">
      <div className="mp-filter-row">
        <label className="search-field mp-search">
          <Search size={15} />
          <input type="search" placeholder="Search name, handle, niche or city" aria-label="Search creators" value={f.q} onChange={(e) => set({ q: e.target.value })} />
        </label>
        <label className="field-inline">Sort
          <select aria-label="Sort creators" value={f.sort} onChange={(e) => set({ sort: e.target.value })}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      </div>

      <div className="mp-filter-block">
        <span className="form-label" id="mp-niche-l">Niche</span>
        <div className="mp-pills" role="group" aria-labelledby="mp-niche-l">
          {NICHES.map((n) => (
            <button key={n} type="button" className={`pill-check ${f.niches.includes(n) ? 'on' : ''}`} aria-pressed={f.niches.includes(n)} onClick={() => set({ niches: toggle(f.niches, n) })}>{n}</button>
          ))}
        </div>
      </div>

      <div className="mp-filter-row">
        <div className="mp-filter-block">
          <span className="form-label" id="mp-tier-l">Tier</span>
          <div className="chips" role="group" aria-labelledby="mp-tier-l">
            {TIERS.map((t) => (
              <button key={t} type="button" className={`chip ${f.tiers.includes(t) ? 'on' : ''}`} aria-pressed={f.tiers.includes(t)} onClick={() => set({ tiers: toggle(f.tiers, t) })}>{t}</button>
            ))}
          </div>
        </div>
        <div className="selects mp-selects">
          <select aria-label="City" value={f.city} onChange={(e) => set({ city: e.target.value })}>
            <option value="any">Any city</option>{CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select aria-label="Language" value={f.lang} onChange={(e) => set({ lang: e.target.value })}>
            <option value="any">Any language</option>{LANGUAGES.map((l) => <option key={l}>{l}</option>)}
          </select>
          <select aria-label="Maximum rate per Reel" value={f.rate} onChange={(e) => set({ rate: e.target.value })}>
            {RATE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.value === 'any' ? 'Any rate per Reel' : o.label}</option>)}
          </select>
          <select aria-label="Minimum on-time rate" value={f.ontime} onChange={(e) => set({ ontime: e.target.value })}>
            {ONTIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button type="button" className={`pill-check ${f.barter ? 'on' : ''}`} aria-pressed={f.barter} onClick={() => set({ barter: !f.barter })}>Open to barter</button>
        </div>
      </div>
    </section>
  );
}
