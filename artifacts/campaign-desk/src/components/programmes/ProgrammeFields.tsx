import { useId, useRef, useState } from 'react';
import { NICHES, TIERS, type Niche, type Programme, type Tier } from '@/domain/types';
import { addDays } from '@/domain/helpers';
import { fmtINR } from '@/domain/money';
import { SelectField, TextAreaField, TextField } from '@/components/ui-bits';
import type { NewProgrammeInput } from '@/state/store';
import { DELIVERABLE_OPTIONS, suggestFeeRange } from './programmeUtils';
import '@/styles/programmes.css';

/** Form state for creating or editing a Campaign. Numbers are kept as text while typing. */
export interface ProgrammeForm {
  name: string; product: string; objective: string; brief: string; deliverable: string;
  niches: Niche[]; tiers: Tier[];
  budget: string; ratePer1000: string; slots: string;
  startDate: string; endDate: string; applyBy: string;
  feeMin: string; feeMax: string;
}
type Errors = Partial<Record<keyof ProgrammeForm, string>>;

const DEFAULT_RATE = 120;

function blank(): ProgrammeForm {
  const fee = suggestFeeRange(['Nano', 'Micro'], DEFAULT_RATE);
  return {
    name: '', product: '', objective: '', brief: '', deliverable: DELIVERABLE_OPTIONS[0],
    niches: [], tiers: ['Nano', 'Micro'],
    budget: '', ratePer1000: String(DEFAULT_RATE), slots: '10',
    startDate: addDays(14), endDate: addDays(35), applyBy: addDays(7),
    feeMin: String(fee?.min ?? ''), feeMax: String(fee?.max ?? ''),
  };
}

const fromProgramme = (p: Programme): ProgrammeForm => ({
  name: p.name, product: p.product, objective: p.objective, brief: p.brief, deliverable: p.deliverable,
  niches: p.niches, tiers: p.tiers,
  budget: String(p.budget), ratePer1000: String(p.ratePer1000), slots: String(p.slots),
  startDate: p.startDate, endDate: p.endDate, applyBy: p.applyBy,
  feeMin: String(p.feeMin), feeMax: String(p.feeMax),
});

export interface ProgrammeFormApi {
  form: ProgrammeForm;
  errors: Errors;
  update: (patch: Partial<ProgrammeForm>) => void;
  /** Validates. Returns the values ready for the store, or null (and shows inline errors). */
  submit: () => NewProgrammeInput | null;
}

export function useProgrammeForm(initial?: Programme): ProgrammeFormApi {
  const [form, setForm] = useState<ProgrammeForm>(() => (initial ? fromProgramme(initial) : blank()));
  const [errors, setErrors] = useState<Errors>({});
  // Once the brand edits the fee range by hand, stop overwriting it with suggestions.
  const feeTouched = useRef(!!initial);

  const update = (patch: Partial<ProgrammeForm>) => {
    if ('feeMin' in patch || 'feeMax' in patch) feeTouched.current = true;
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (!feeTouched.current && ('tiers' in patch || 'ratePer1000' in patch)) {
        const r = suggestFeeRange(next.tiers, Number(next.ratePer1000));
        if (r) { next.feeMin = String(r.min); next.feeMax = String(r.max); }
      }
      return next;
    });
    setErrors((prev) => {
      const keys = Object.keys(patch) as (keyof ProgrammeForm)[];
      if (!keys.some((k) => prev[k])) return prev;
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });
  };

  const submit = (): NewProgrammeInput | null => {
    const e: Errors = {};
    const budget = Number(form.budget);
    const rate = Number(form.ratePer1000);
    const slots = Number(form.slots);
    const feeMin = Number(form.feeMin);
    const feeMax = Number(form.feeMax);
    if (!form.name.trim()) e.name = 'Give the campaign a name.';
    if (!form.product.trim()) e.product = 'Say which product this is for.';
    if (!form.objective.trim()) e.objective = 'Write the goal in one line.';
    if (!form.brief.trim()) e.brief = 'Add a short brief so creators know what to make.';
    if (!form.niches.length) e.niches = 'Pick at least one niche.';
    if (!form.tiers.length) e.tiers = 'Pick at least one creator size.';
    if (!(budget > 0)) e.budget = 'Enter a budget in rupees.';
    if (!(rate > 0)) e.ratePer1000 = 'Enter a rate per 1,000 views.';
    if (!Number.isInteger(slots) || slots < 1) e.slots = 'Enter a whole number of creators, 1 or more.';
    if (!form.startDate) e.startDate = 'Choose a start date.';
    if (!form.endDate) e.endDate = 'Choose an end date.';
    else if (form.startDate && form.endDate < form.startDate) e.endDate = 'End date cannot be before the start date.';
    if (!form.applyBy) e.applyBy = 'Choose an apply-by date.';
    else if (form.startDate && form.applyBy > form.startDate) e.applyBy = 'Apply-by date should be on or before the start date.';
    if (!(feeMin > 0)) e.feeMin = 'Enter the lowest fee you would pay.';
    if (!(feeMax > 0)) e.feeMax = 'Enter the highest fee you would pay.';
    else if (feeMin > 0 && feeMax < feeMin) e.feeMax = 'Highest fee must be at least the lowest fee.';
    setErrors(e);
    if (Object.keys(e).length) return null;
    return {
      name: form.name.trim(), product: form.product.trim(), objective: form.objective.trim(), brief: form.brief.trim(),
      niches: form.niches, tiers: form.tiers, budget, ratePer1000: rate, startDate: form.startDate, endDate: form.endDate,
      applyBy: form.applyBy, slots, deliverable: form.deliverable, feeMin, feeMax,
    };
  };

  return { form, errors, update, submit };
}

/** Plain-language example for the plan rate, using the rate typed so far. */
export const planRateHelp = (rate: number) => {
  const r = rate > 0 ? rate : DEFAULT_RATE;
  return `Fees are suggested from this. If you expect 50,000 views and plan ${fmtINR(r)} per 1,000, the fee is ${fmtINR(r * 50)}.`;
};

function PillGroup<T extends string>({ label, items, value, onChange, error }: { label: string; items: readonly T[]; value: readonly T[]; onChange: (v: T[]) => void; error?: string }) {
  const id = useId();
  const toggle = (it: T) => onChange(value.includes(it) ? value.filter((x) => x !== it) : [...value, it]);
  return (
    <div className="form-field wide">
      <span className="pg-label" id={id}>{label}</span>
      <div className="pg-pills" role="group" aria-labelledby={id}>
        {items.map((it) => (
          <button key={it} type="button" className={`pill-check ${value.includes(it) ? 'on' : ''}`} aria-pressed={value.includes(it)} onClick={() => toggle(it)}>{it}</button>
        ))}
      </div>
      {error && <small className="error-text">{error}</small>}
    </div>
  );
}

export function ProgrammeFields({ api }: { api: ProgrammeFormApi }) {
  const { form: f, errors: e, update } = api;
  const rate = Number(f.ratePer1000);
  const budget = Number(f.budget);
  const deliverables: readonly string[] = DELIVERABLE_OPTIONS.includes(f.deliverable as (typeof DELIVERABLE_OPTIONS)[number]) ? DELIVERABLE_OPTIONS : [f.deliverable, ...DELIVERABLE_OPTIONS];
  return (
    <div className="form-grid pg-form">
      <h3 className="pg-sec">The campaign</h3>
      <TextField wide label="Campaign name *" placeholder="e.g. Choco Peanut Launch" value={f.name} error={e.name} onChange={(ev) => update({ name: ev.target.value })} />
      <TextField label="Product *" placeholder="e.g. Choco Peanut Protein Oats, 6-pack" value={f.product} error={e.product} onChange={(ev) => update({ product: ev.target.value })} />
      <SelectField label="What each creator makes" value={f.deliverable} options={deliverables} onChange={(ev) => update({ deliverable: ev.target.value })} />
      <TextField wide label="Objective *" placeholder="e.g. Get first purchases of the new flavour on our website" value={f.objective} error={e.objective} onChange={(ev) => update({ objective: ev.target.value })} />
      <TextAreaField
        wide rows={5} label="Brief for creators *" value={f.brief} error={e.brief} onChange={(ev) => update({ brief: ev.target.value })}
        placeholder={'What should the Reel show? What must they say (price, offer, claims)? What should they avoid? Where do you want them to send people?'}
        hint="Plain words work best. Creators read this before they apply."
      />

      <h3 className="pg-sec">Who you want</h3>
      <PillGroup label="Niches *" items={NICHES} value={f.niches} error={e.niches} onChange={(niches) => update({ niches })} />
      <PillGroup label="Creator sizes *" items={TIERS} value={f.tiers} error={e.tiers} onChange={(tiers) => update({ tiers })} />
      <TextField label="Creators needed *" type="number" inputMode="numeric" min={1} step={1} value={f.slots} error={e.slots} onChange={(ev) => update({ slots: ev.target.value })} />

      <h3 className="pg-sec">Money</h3>
      <TextField label="Total budget (₹) *" type="number" inputMode="numeric" min={0} step={1000} placeholder="250000" value={f.budget} error={e.budget}
        hint={budget > 0 ? fmtINR(budget) : undefined} onChange={(ev) => update({ budget: ev.target.value })} />
      <TextField label="Plan rate (₹ per 1,000 views) *" type="number" inputMode="numeric" min={1} step={5} value={f.ratePer1000} error={e.ratePer1000}
        hint={planRateHelp(rate)} onChange={(ev) => update({ ratePer1000: ev.target.value })} />
      <TextField label="Lowest fee (₹) *" type="number" inputMode="numeric" min={0} step={500} value={f.feeMin} error={e.feeMin} onChange={(ev) => update({ feeMin: ev.target.value })} />
      <TextField label="Highest fee (₹) *" type="number" inputMode="numeric" min={0} step={500} value={f.feeMax} error={e.feeMax} onChange={(ev) => update({ feeMax: ev.target.value })} />
      <p className="pg-note">The fee range starts as a suggestion from your plan rate and creator sizes. Change it if you want.</p>

      <h3 className="pg-sec">Dates</h3>
      <TextField label="Apply by *" type="date" value={f.applyBy} error={e.applyBy} onChange={(ev) => update({ applyBy: ev.target.value })} />
      <TextField label="Start date *" type="date" value={f.startDate} error={e.startDate} onChange={(ev) => update({ startDate: ev.target.value })} />
      <TextField label="End date *" type="date" value={f.endDate} error={e.endDate} onChange={(ev) => update({ endDate: ev.target.value })} />
    </div>
  );
}
