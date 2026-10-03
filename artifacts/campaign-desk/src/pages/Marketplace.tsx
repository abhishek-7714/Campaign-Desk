import { useMemo, useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { GitCompare, Heart, Send } from 'lucide-react';
import type { Creator } from '@/domain/types';
import { useStore } from '@/state/store';
import { Empty, PageTitle } from '@/components/viz/Cards';
import { Segmented } from '@/components/shared';
import CreatorCard from '@/components/marketplace/CreatorCard';
import FilterBar, { EMPTY_FILTERS, hasActiveFilters, type Filters } from '@/components/marketplace/Filters';
import InviteDialog from '@/components/marketplace/InviteDialog';
import BulkInviteDialog from '@/components/marketplace/BulkInviteDialog';
import { isInvitable, matchScore, rateInBucket, useCreatorLinks } from '@/components/marketplace/helpers';
import '@/styles/marketplace.css';

const MAX_COMPARE = 4;
const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);

export default function Marketplace() {
  const { creators, brandProgrammes, shortlist, toggleShortlist } = useStore();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const linksFor = useCreatorLinks();
  const [inviting, setInviting] = useState<Creator | null>(null);
  const [bulk, setBulk] = useState(false);

  /* ---- state that lives in the URL, so filters survive a visit to a profile ---- */
  const f: Filters = {
    q: params.get('q') ?? '',
    niches: list(params.get('niche')),
    tiers: list(params.get('tier')),
    city: params.get('city') ?? 'any',
    lang: params.get('lang') ?? 'any',
    rate: params.get('rate') ?? 'any',
    ontime: params.get('ontime') ?? '0',
    barter: params.get('barter') === '1',
    sort: params.get('sort') ?? 'match',
  };
  const tab = params.get('tab') === 'shortlist' ? 'shortlist' : 'discover';
  const compareIds = list(params.get('cmp')).filter((id) => creators.some((c) => c.id === id)).slice(0, MAX_COMPARE);

  const write = (patch: Record<string, string | null>) => {
    const n = new URLSearchParams(search);
    for (const [k, v] of Object.entries(patch)) { if (!v) n.delete(k); else n.set(k, v); }
    const s = n.toString();
    navigate(`/marketplace${s ? `?${s}` : ''}`, { replace: true });
  };
  const setFilters = (p: Partial<Filters>) => {
    const out: Record<string, string | null> = {};
    if ('q' in p) out.q = p.q || null;
    if ('niches' in p) out.niche = p.niches!.join(',') || null;
    if ('tiers' in p) out.tier = p.tiers!.join(',') || null;
    if ('city' in p) out.city = p.city === 'any' ? null : p.city!;
    if ('lang' in p) out.lang = p.lang === 'any' ? null : p.lang!;
    if ('rate' in p) out.rate = p.rate === 'any' ? null : p.rate!;
    if ('ontime' in p) out.ontime = p.ontime === '0' ? null : p.ontime!;
    if ('barter' in p) out.barter = p.barter ? '1' : null;
    if ('sort' in p) out.sort = p.sort === 'match' ? null : p.sort!;
    write(out);
  };
  const clearFilters = () => write({ q: null, niche: null, tier: null, city: null, lang: null, rate: null, ontime: null, barter: null, sort: null });
  const toggleCompare = (id: string) => write({ cmp: (compareIds.includes(id) ? compareIds.filter((x) => x !== id) : [...compareIds, id]).join(',') || null });

  /* ---- programme used for match scores ---- */
  const matchable = brandProgrammes.filter(isInvitable);
  const defaultProg = matchable.find((p) => p.status === 'Open call') ?? matchable.find((p) => p.status === 'Live');
  const progParam = params.get('prog');
  const programme = progParam === 'none' ? undefined : matchable.find((p) => p.id === progParam) ?? defaultProg;
  const score = (c: Creator) => (programme ? matchScore(c, programme) : null);

  /* ---- filtering and sorting ---- */
  const q = f.q.trim().toLowerCase();
  const sorted = (rows: Creator[]) => {
    const s = (c: Creator) => score(c) ?? 0;
    const delivery = (c: Creator) => c.deliveredPct * 1000 + c.onTimeRate;
    return [...rows].sort((a, b) => {
      switch (f.sort) {
        case 'delivery': return delivery(b) - delivery(a);
        case 'rate': return a.rate - b.rate;
        case 'followers': return b.followers - a.followers;
        case 'engagement': return b.engagementRate - a.engagementRate;
        default: return programme ? s(b) - s(a) || delivery(b) - delivery(a) : delivery(b) - delivery(a);
      }
    });
  };
  const results = useMemo(() => {
    const minOnTime = Number(f.ontime);
    const rows = creators.filter((c) =>
      (!q || [c.name, c.handle, c.city, ...c.niches].some((x) => x.toLowerCase().includes(q)))
      && (!f.niches.length || c.niches.some((n) => f.niches.includes(n)))
      && (!f.tiers.length || f.tiers.includes(c.tier))
      && (f.city === 'any' || c.city === f.city)
      && (f.lang === 'any' || c.languages.includes(f.lang))
      && rateInBucket(c.rate, f.rate)
      && c.onTimeRate >= minOnTime
      && (!f.barter || c.openToBarter));
    return sorted(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creators, search, programme?.id]);

  const shortlisted = useMemo(() => sorted(creators.filter((c) => shortlist.includes(c.id))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [creators, shortlist, f.sort, programme?.id]);

  const shown = tab === 'shortlist' ? shortlisted : results;
  const profileHref = (id: string) => `/marketplace/${id}${search ? `?from=${encodeURIComponent(search)}` : ''}`;
  const compareHref = `/marketplace/compare?ids=${compareIds.join(',')}`;

  return (
    <>
      <PageTitle title="Marketplace" sub={`${creators.length} creators. Filter, compare and invite them to a campaign.`} />

      <div className="mp-tabs">
        <Segmented label="Marketplace view" value={tab} onChange={(v) => write({ tab: v === 'shortlist' ? 'shortlist' : null })}
          options={[{ value: 'discover', label: 'Discover' }, { value: 'shortlist', label: <>Shortlist <span>{shortlist.length}</span></> }]} />
        <label className="field-inline mp-match-for">Matching for
          <select aria-label="Programme used for match scores" value={programme?.id ?? 'none'} onChange={(e) => write({ prog: e.target.value })}>
            {matchable.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.status})</option>)}
            <option value="none">No programme</option>
          </select>
        </label>
      </div>

      {tab === 'discover' && <FilterBar f={f} set={setFilters} />}

      <div className="toolbar mp-count">
        <span className="muted" role="status" aria-live="polite">
          {tab === 'discover'
            ? `${results.length} of ${creators.length} creators`
            : `${shortlisted.length} shortlisted`}
          {tab === 'discover' && hasActiveFilters(f) && <> · <button type="button" className="link-btn" onClick={clearFilters}>Clear filters</button></>}
        </span>
        {tab === 'shortlist' && shortlisted.length > 0 && (
          <button type="button" className="btn small" onClick={() => setBulk(true)}><Send size={13} />Invite all to…</button>
        )}
      </div>

      {shown.length ? (
        <div className="mp-grid">
          {shown.map((c) => (
            <CreatorCard key={c.id} creator={c} links={linksFor(c.id)} match={score(c)} href={profileHref(c.id)}
              shortlisted={shortlist.includes(c.id)} onToggleShortlist={() => toggleShortlist(c.id)}
              compared={compareIds.includes(c.id)} compareDisabled={compareIds.length >= MAX_COMPARE} onToggleCompare={() => toggleCompare(c.id)}
              onInvite={() => setInviting(c)} />
          ))}
        </div>
      ) : tab === 'shortlist' ? (
        <Empty title="Your shortlist is empty">
          Tap the heart <Heart size={13} style={{ verticalAlign: '-2px' }} aria-hidden="true" /> on any creator to save them here, then invite the whole list to a campaign in one go.{' '}
          <button type="button" className="textlink" onClick={() => write({ tab: null })}>Browse creators</button>
        </Empty>
      ) : (
        <Empty title="No creators match these filters">
          Try fewer filters or a wider rate range. <button type="button" className="textlink" onClick={clearFilters}>Clear filters</button>
        </Empty>
      )}

      {compareIds.length > 0 && (
        <div className="mp-cmpbar" role="region" aria-label="Compare selection">
          <GitCompare size={16} aria-hidden="true" />
          {compareIds.length >= 2
            ? <Link href={compareHref} className="btn small primary">Compare {compareIds.length} creators</Link>
            : <span className="mp-cmpbar-hint">Pick one more creator to compare</span>}
          <button type="button" className="link-btn" onClick={() => write({ cmp: null })}>Clear</button>
        </div>
      )}

      {inviting && <InviteDialog creator={inviting} defaultProgrammeId={programme?.id} onClose={() => setInviting(null)} />}
      {bulk && <BulkInviteDialog creators={shortlisted} onClose={() => setBulk(false)} />}
    </>
  );
}
