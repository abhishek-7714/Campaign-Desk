import { useState } from 'react';
import { Save } from 'lucide-react';
import type { Agreement, Campaign } from '@/domain/types';
import { AGREEMENT_FIELDS, gapFields, isGap } from '@/domain/helpers';
import { TextAreaField, TextField } from '@/components/ui-bits';
import { useStore } from '@/state/store';

export default function AgreementTab({ campaign }: { campaign: Campaign }) {
  const { saveAgreement } = useStore();
  const [draft, setDraft] = useState<Agreement>(campaign.agreement);
  const dirty = AGREEMENT_FIELDS.some((f) => draft[f.key] !== campaign.agreement[f.key]);
  const gaps = gapFields(draft);
  return (
    <form className="panel" noValidate onSubmit={(e) => { e.preventDefault(); saveAgreement(campaign.id, draft); }} data-testid="form-agreement">
      <div className="panel-head">
        <h3 className="section-title">Agreement terms</h3>
        <span className={gaps.length ? 'missing' : 'confirmed'}>{gaps.length ? `${gaps.length} terms missing or to be confirmed` : 'All terms confirmed'}</span>
      </div>
      <div className="panel-body">
        {gaps.length > 0 && (
          <div className="inline-warning" role="status">
            Incomplete: {gaps.map((g) => g.label).join(', ')}. The campaign cannot move past Terms to Confirm until these are resolved.
          </div>
        )}
        <div className="form-grid">
          {AGREEMENT_FIELDS.map((f) => {
            const common = {
              label: f.label, hint: f.hint, gap: isGap(draft[f.key]), value: draft[f.key], wide: f.kind === 'textarea',
              error: isGap(draft[f.key]) ? (draft[f.key].trim() ? 'To be confirmed' : 'Missing') : undefined,
            };
            return f.kind === 'textarea'
              ? <TextAreaField key={f.key} {...common} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
              : <TextField key={f.key} {...common} type={f.kind === 'date' ? 'date' : 'text'} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />;
          })}
        </div>
      </div>
      <div className="modal-foot">
        <span className="count-label" style={{ marginRight: 'auto' }}>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
        <button type="button" className="button" disabled={!dirty} onClick={() => setDraft(campaign.agreement)}>Discard</button>
        <button type="submit" className="button primary" disabled={!dirty} data-testid="button-save-agreement"><Save />Save agreement</button>
      </div>
    </form>
  );
}
