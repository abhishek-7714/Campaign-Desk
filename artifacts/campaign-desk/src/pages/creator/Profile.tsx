import { useState } from 'react';
import { CheckCircle2, Instagram } from 'lucide-react';
import { CITIES, LANGUAGES, NICHES, type Creator } from '@/domain/types';
import { deliveryTone } from '@/domain/performance';
import { fmtINR, fmtPct } from '@/domain/money';
import { PageTitle } from '@/components/viz/Cards';
import { SelectField, TextAreaField, TextField } from '@/components/ui-bits';
import { Meter } from '@/components/shared';
import { ConnectInstagramDialog } from '@/components/integrations';
import { useStore } from '@/state/store';
import { ProfilePreview } from '@/components/creator/ProfilePreview';
import '@/styles/creator.css';

const RESPONSE = ['Under 2 hours', 'Same day', 'Within 2 days'];
const BIO_MAX = 240;

interface Draft { bio: string; rate: string; niches: string[]; languages: string[]; city: string; openToBarter: boolean; responseTime: string }
const toDraft = (c: Creator): Draft => ({ bio: c.bio, rate: String(c.rate), niches: [...c.niches], languages: [...c.languages], city: c.city, openToBarter: c.openToBarter, responseTime: c.responseTime });
const same = (a: Draft, b: Draft) => JSON.stringify({ ...a, niches: [...a.niches].sort(), languages: [...a.languages].sort() }) === JSON.stringify({ ...b, niches: [...b.niches].sort(), languages: [...b.languages].sort() });

function Multi({ label, options, value, onChange, error }: { label: string; options: readonly string[]; value: string[]; onChange: (v: string[]) => void; error?: string }) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div className="form-row" role="group" aria-label={label}>
      <span className="form-label">{label}</span>
      <div className="tags cr-multi">
        {options.map((o) => <button type="button" key={o} className={`pill-check ${value.includes(o) ? 'on' : ''}`} aria-pressed={value.includes(o)} onClick={() => toggle(o)}>{o}</button>)}
      </div>
      {error && <small className="error-text" role="alert">{error}</small>}
    </div>
  );
}

function ProfileForm({ creator }: { creator: Creator }) {
  const { updateCreator } = useStore();
  const saved = toDraft(creator);
  const [d, setD] = useState<Draft>(saved);
  const [touched, setTouched] = useState(false);
  const dirty = !same(d, saved);
  const rate = Math.round(Number(d.rate));

  const errors = {
    bio: d.bio.trim().length < 10 ? 'Write at least a sentence so brands know what you make.' : d.bio.length > BIO_MAX ? `Keep it under ${BIO_MAX} characters.` : '',
    rate: !d.rate.trim() || !Number.isFinite(rate) || rate < 500 ? 'Enter your rate in rupees, ₹500 or more.' : rate > 1000000 ? 'That looks too high. Check the amount.' : '',
    niches: d.niches.length ? '' : 'Pick at least one niche.',
    languages: d.languages.length ? '' : 'Pick at least one language.',
  };
  const invalid = Object.values(errors).some(Boolean);
  const show = (k: keyof typeof errors) => (touched ? errors[k] : '');

  const save = () => {
    setTouched(true);
    if (invalid) return;
    updateCreator(creator.id, {
      bio: d.bio.trim(), rate, niches: d.niches as Creator['niches'], languages: d.languages, city: d.city, openToBarter: d.openToBarter, responseTime: d.responseTime,
    }, 'Profile saved');
    setTouched(false);
  };
  const cities: readonly string[] = (CITIES as readonly string[]).includes(d.city) ? CITIES : [d.city, ...CITIES];
  const response = RESPONSE.includes(d.responseTime) ? RESPONSE : [d.responseTime, ...RESPONSE];

  return (
    <>
      <form className="card cr-form-card" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
        <div className="card-head"><div><h3>Your profile</h3><p className="muted">This is what brands read before they invite you.</p></div></div>
        <div className="cr-fields-col">
          <TextAreaField label="Bio" rows={4} value={d.bio} error={show('bio')} hint={`${d.bio.length} of ${BIO_MAX} characters`} onChange={(e) => setD({ ...d, bio: e.target.value })} />
          <TextField label="Rate per Reel (₹)" type="number" inputMode="numeric" min={0} step={500} value={d.rate} error={show('rate')}
            hint="The fee you usually ask for one Reel. Brands see it on your profile." onChange={(e) => setD({ ...d, rate: e.target.value })} />
          <Multi label="Niches" options={NICHES} value={d.niches} error={show('niches')} onChange={(niches) => setD({ ...d, niches })} />
          <Multi label="Languages you post in" options={LANGUAGES} value={d.languages} error={show('languages')} onChange={(languages) => setD({ ...d, languages })} />
          <div className="cr-two">
            <SelectField label="City" value={d.city} options={cities} onChange={(e) => setD({ ...d, city: e.target.value })} />
            <SelectField label="How fast you reply" value={d.responseTime} options={response} onChange={(e) => setD({ ...d, responseTime: e.target.value })} />
          </div>
          <label className="cr-toggle">
            <input type="checkbox" role="switch" checked={d.openToBarter} onChange={(e) => setD({ ...d, openToBarter: e.target.checked })} />
            <span className="cr-track" aria-hidden="true"><i /></span>
            <span><b>Open to barter</b><small>Say yes if you would work for product instead of a fee, on small deals.</small></span>
          </label>
        </div>
        <div className="cr-form-foot">
          <button type="submit" className="btn primary" disabled={!dirty}>Save changes</button>
          {dirty ? <button type="button" className="btn" onClick={() => { setD(saved); setTouched(false); }}>Discard</button> : <small className="muted">Everything is saved.</small>}
        </div>
      </form>
      <ProfileSide creator={creator} preview={{ ...creator, bio: d.bio, rate: Number.isFinite(rate) && rate > 0 ? rate : creator.rate, niches: d.niches as Creator['niches'], city: d.city }} />
    </>
  );
}

function ProfileSide({ creator, preview }: { creator: Creator; preview: Creator }) {
  const [connect, setConnect] = useState(false);
  return (
    <div className="cr-side-col">
      <section className="card" aria-labelledby="cr-ig">
        <div className="card-head"><h3 id="cr-ig">Connect Instagram</h3>{creator.instagramConnected && <span className="pill t-green"><i />Connected</span>}</div>
        {creator.instagramConnected ? (
          <div className="cr-connected">
            <CheckCircle2 size={20} />
            <div>
              <b>@{creator.handle} is connected</b>
              <p>Brands now see your reach, saves and shares on every post, with no screenshots from you. This prototype has no disconnect button, so it stays connected.</p>
            </div>
          </div>
        ) : (
          <>
            <p className="cr-body">Reach, saves and shares are private, so brands can only see them if you send a screenshot each time. Connect once and they show up on their own, on every Reel and Story.</p>
            <ul className="cr-bullets">
              <li>No more screenshots when a brand asks for numbers</li>
              <li>Brands trust numbers that come straight from Instagram</li>
              <li>We never post or message on your behalf</li>
            </ul>
            <button className="btn primary" onClick={() => setConnect(true)}><Instagram size={15} />Connect Instagram</button>
          </>
        )}
        {connect && <ConnectInstagramDialog who="creator" onClose={() => setConnect(false)} />}
      </section>

      <section className="card" aria-labelledby="cr-track">
        <div className="card-head"><h3 id="cr-track">Your track record</h3></div>
        <div className="cr-record">
          <div><div className="cr-track-k"><span>Posted on time</span><b>{fmtPct(creator.onTimeRate)}</b></div><Meter value={creator.onTimeRate} tone={creator.onTimeRate >= 85 ? 'green' : creator.onTimeRate >= 70 ? 'yellow' : 'coral'} label={`${creator.onTimeRate} percent posted on time`} /></div>
          <div><div className="cr-track-k"><span>Views delivered</span><b>{fmtPct(creator.deliveredPct)}</b></div><Meter value={creator.deliveredPct} tone={deliveryTone(creator.deliveredPct)} label={`${creator.deliveredPct} percent of expected views delivered`} /></div>
          <p className="muted cr-small">Views delivered compares what your posts got with the views the brand paid for. Over 100% means you beat it. You have done {creator.campaignsOnPlatform} campaign{creator.campaignsOnPlatform === 1 ? '' : 's'} here.</p>
        </div>
      </section>

      <section className="card" aria-labelledby="cr-see">
        <div className="card-head"><div><h3 id="cr-see">How brands see you</h3><p className="muted">Updates as you edit. Your rate shows as {fmtINR(preview.rate)}.</p></div></div>
        <ProfilePreview creator={preview} />
      </section>
    </div>
  );
}

export default function CreatorProfileEdit() {
  const { actingCreator } = useStore();
  return (
    <div className="cr-page">
      <PageTitle title="My profile" sub="Keep this up to date so brands can find and trust you." />
      <div className="cr-profile">
        {/* Keyed so the form restarts if the acting creator changes. */}
        <ProfileForm key={actingCreator.id} creator={actingCreator} />
      </div>
    </div>
  );
}
