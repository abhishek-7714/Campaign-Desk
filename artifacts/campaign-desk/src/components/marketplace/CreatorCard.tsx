import { Link } from 'wouter';
import { BadgeCheck, Heart, Send } from 'lucide-react';
import type { Creator } from '@/domain/types';
import { CreatorAvatar, TierBadge } from '@/components/shared';
import { Pill } from '@/components/viz/Cards';
import { fmtINR, fmtNum, fmtPct } from '@/domain/money';
import { MATCH_HELP, matchTone, type CreatorLinks } from './helpers';
import '@/styles/marketplace.css';

/** Chips that say how this creator already relates to the workspace. */
export function StatusChips({ links, max = 2 }: { links: CreatorLinks; max?: number }) {
  const chips: { key: string; tone: 'green' | 'blue' | 'yellow'; text: string }[] = [];
  if (links.worked) {
    const d = links.worked.avgDelivery;
    chips.push({ key: 'worked', tone: 'green', text: d === null ? 'Worked with you' : `Worked with you · ${Math.round(d)}% delivered` });
  }
  for (const p of links.live) chips.push({ key: `live-${p.id}`, tone: 'blue', text: `In ${p.name}` });
  for (const { app, programme } of links.pending) {
    chips.push({ key: app.id, tone: 'yellow', text: `${app.origin === 'creator' ? 'Applied to' : 'Invited to'} ${programme.name}` });
  }
  if (!chips.length) return null;
  return (
    <div className="mp-status">
      {chips.slice(0, max).map((c) => <span key={c.key} className={`pill t-${c.tone}`} title={c.text}><span className="mp-clip">{c.text}</span></span>)}
      {chips.length > max && <span className="pill t-neutral" title={chips.slice(max).map((c) => c.text).join(', ')}>+{chips.length - max}</span>}
    </div>
  );
}

interface Props {
  creator: Creator;
  links: CreatorLinks;
  /** Match score for the selected programme, or null when none is selected. */
  match: number | null;
  shortlisted: boolean;
  onToggleShortlist: () => void;
  compared: boolean;
  compareDisabled: boolean;
  onToggleCompare: () => void;
  onInvite: () => void;
  /** Path to the profile, including any query string needed to come back to the same filters. */
  href: string;
}

export default function CreatorCard({ creator: c, links, match, shortlisted, onToggleShortlist, compared, compareDisabled, onToggleCompare, onInvite, href }: Props) {
  return (
    <article className="mp-card" data-testid={`card-creator-${c.id}`}>
      <div className="mp-card-top">
        <CreatorAvatar creator={c} size={46} />
        <div className="mp-card-id">
          <h3>
            <Link href={href} className="mp-stretch">{c.name}</Link>
            {c.verified && <BadgeCheck size={14} className="verified" aria-label="Verified" />}
          </h3>
          <small>@{c.handle} · {c.city}</small>
        </div>
        <button type="button" className={`heart-btn mp-above ${shortlisted ? 'on' : ''}`} aria-pressed={shortlisted}
          aria-label={shortlisted ? `Remove ${c.name} from shortlist` : `Add ${c.name} to shortlist`} onClick={onToggleShortlist}>
          <Heart size={18} fill={shortlisted ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="mp-card-tags">
        <TierBadge tier={c.tier} />
        {c.niches.slice(0, 2).map((n) => <span key={n} className="tag">{n}</span>)}
        {match !== null && <span className="mp-above" title={MATCH_HELP}><Pill tone={matchTone(match)} dot={false}>Match {match}</Pill></span>}
      </div>
      <dl className="mp-stats">
        <div><dt>Followers</dt><dd>{fmtNum(c.followers)}</dd></div>
        <div><dt>Avg views</dt><dd>{fmtNum(c.avgViews)}</dd></div>
        <div><dt>Engagement</dt><dd>{fmtPct(c.engagementRate, 1)}</dd></div>
        <div><dt>On time</dt><dd>{fmtPct(c.onTimeRate)}</dd></div>
      </dl>
      <StatusChips links={links} />
      <div className="mp-card-foot">
        <div className="mp-rate"><b>{fmtINR(c.rate)}</b> per Reel{c.openToBarter && <span className="tag">Barter ok</span>}</div>
        <div className="mp-card-actions mp-above">
          <label className={`mp-cmp ${compareDisabled && !compared ? 'is-off' : ''}`} title={compareDisabled && !compared ? 'You can compare up to 4 creators' : undefined}>
            <input type="checkbox" checked={compared} disabled={compareDisabled && !compared} onChange={onToggleCompare} aria-label={`Compare ${c.name}`} />
            Compare
          </label>
          <button type="button" className="btn small primary" onClick={onInvite} aria-label={`Invite ${c.name} to a campaign`}><Send size={13} />Invite</button>
        </div>
      </div>
    </article>
  );
}
