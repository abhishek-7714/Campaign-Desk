import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import type { Creator, Programme } from '@/domain/types';
import { Modal, SelectField, TextAreaField, TextField } from '@/components/ui-bits';
import { suggestedFee } from '@/domain/performance';
import { fmtFull, fmtINR } from '@/domain/money';
import { useStore } from '@/state/store';
import { isActiveApp, isInvitable } from './helpers';
import '@/styles/marketplace.css';

const firstName = (c: Creator) => c.name.split(' ')[0];

function defaultMessage(c: Creator, p: Programme | undefined, brand: string) {
  if (!p) return '';
  return `Hi ${firstName(c)}, we are ${brand} and we are running ${p.name} (${p.deliverable}). Your content looks like a good fit for it. Have a look at the brief and let us know if you would like to work together.`;
}

export default function InviteDialog({ creator, onClose, defaultProgrammeId }: { creator: Creator; onClose: () => void; defaultProgrammeId?: string }) {
  const { brandProgrammes, applications, inviteCreator, workspaceName } = useStore();
  const options = brandProgrammes.filter(isInvitable);
  const [programmeId, setProgrammeId] = useState(() => (options.find((p) => p.id === defaultProgrammeId) ?? options[0])?.id ?? '');
  const programme = options.find((p) => p.id === programmeId);
  const suggestion = programme ? suggestedFee(creator, programme) : null;
  const [fee, setFee] = useState(() => String(suggestion?.fee ?? ''));
  const [message, setMessage] = useState(() => defaultMessage(creator, programme, workspaceName));
  const [messageEdited, setMessageEdited] = useState(false);
  const [tried, setTried] = useState(false);

  // Pick up the new suggested fee (and message, if untouched) when the campaign changes.
  useEffect(() => {
    if (!programme) return;
    setFee(String(suggestedFee(creator, programme).fee));
    if (!messageEdited) setMessage(defaultMessage(creator, programme, workspaceName));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programmeId]);

  const existing = programme ? applications.find((a) => a.programmeId === programme.id && a.creatorId === creator.id && isActiveApp(a)) : undefined;
  const feeNum = Number(fee);
  const feeError = tried && !(feeNum > 0) ? 'Enter a fee above zero.' : undefined;
  const gap = feeNum > 0 ? (feeNum - creator.rate) / creator.rate : 0;
  const blocked = !programme || !!existing;

  const submit = () => {
    setTried(true);
    if (blocked || !(feeNum > 0)) return;
    inviteCreator({ programmeId: programmeId, creatorId: creator.id, fee: Math.round(feeNum), message: message.trim() });
    onClose();
  };

  return (
    <Modal title={`Invite ${creator.name}`} onClose={onClose} onSubmit={submit} submitLabel="Send invite">
      <div className={`mp-invite ${blocked ? 'is-blocked' : ''}`}>
        {options.length === 0 ? (
          <p className="mp-note">
            You have no programme that is open or live yet. <Link href="/programmes" className="textlink" onClick={onClose}>Create or publish one in Programmes</Link>, then come back to invite creators.
          </p>
        ) : (
          <>
            <SelectField label="Campaign" value={programmeId} onChange={(e) => setProgrammeId(e.target.value)}
              options={options.map((p) => ({ value: p.id, label: `${p.name} (${p.status})` }))} />
            {existing && (
              <p className="mp-note warn" role="status">
                {creator.name.split(' ')[0]} is already in this programme ({existing.status.toLowerCase()}). Manage it from <Link href={`/programmes/${programmeId}`} className="textlink" onClick={onClose}>the programme page</Link>.
              </p>
            )}
            <div>
              <TextField label="Fee (₹)" type="number" min={0} step={500} inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} error={feeError} />
              {suggestion && programme && (
                <p className="mp-formula">{fmtFull(suggestion.expectedViews)} expected views at {fmtINR(programme.ratePer1000)} per 1,000 views = {fmtINR(suggestion.fee)}</p>
              )}
              {gap > 0.25 && <p className="mp-helper up">This is {Math.round(gap * 100)}% above the creator&apos;s ask of {fmtINR(creator.rate)}. It will probably be accepted quickly, but you may be overpaying.</p>}
              {gap < -0.25 && <p className="mp-helper down">This is {Math.round(-gap * 100)}% below the creator&apos;s ask of {fmtINR(creator.rate)}. Expect a counter-offer.</p>}
            </div>
            <TextAreaField label="Message" rows={5} value={message} onChange={(e) => { setMessage(e.target.value); setMessageEdited(true); }} />
          </>
        )}
      </div>
    </Modal>
  );
}
