import { useState } from 'react';
import { Link } from 'wouter';
import type { Creator } from '@/domain/types';
import { Modal, SelectField } from '@/components/ui-bits';
import { suggestedFee } from '@/domain/performance';
import { fmtINR } from '@/domain/money';
import { useStore } from '@/state/store';
import { isActiveApp, isInvitable } from './helpers';
import '@/styles/marketplace.css';

/** Invite every shortlisted creator to one programme at each creator's suggested fee. */
export default function BulkInviteDialog({ creators, onClose }: { creators: Creator[]; onClose: () => void }) {
  const { brandProgrammes, applications, inviteCreator, workspaceName } = useStore();
  const options = brandProgrammes.filter(isInvitable);
  const [programmeId, setProgrammeId] = useState(options[0]?.id ?? '');
  const programme = options.find((p) => p.id === programmeId);
  const rows = creators.map((c) => ({
    creator: c,
    fee: programme ? suggestedFee(c, programme).fee : 0,
    already: !!programme && applications.some((a) => a.programmeId === programme.id && a.creatorId === c.id && isActiveApp(a)),
  }));
  const toSend = rows.filter((r) => !r.already);

  const submit = () => {
    if (!programme || !toSend.length) return;
    // Invitation ids come from the clock, so space the calls out by a few milliseconds.
    toSend.forEach((r, i) => window.setTimeout(() => inviteCreator({
      programmeId: programme.id, creatorId: r.creator.id, fee: r.fee,
      message: `Hi ${r.creator.name.split(' ')[0]}, we are ${workspaceName} and we are running ${programme.name} (${programme.deliverable}). Your content looks like a good fit for it. Have a look at the brief and let us know if you would like to work together.`,
    }), i * 6));
    onClose();
  };

  return (
    <Modal title={`Invite ${creators.length} shortlisted creator${creators.length === 1 ? '' : 's'}`} onClose={onClose} onSubmit={submit} submitLabel={toSend.length ? `Send ${toSend.length} invite${toSend.length === 1 ? '' : 's'}` : 'Send invites'}>
      <div className="mp-invite">
        {options.length === 0 ? (
          <p className="mp-note">You have no programme that is open or live yet. <Link href="/programmes" className="textlink" onClick={onClose}>Create or publish one in Programmes</Link> first.</p>
        ) : (
          <>
            <SelectField label="Campaign" value={programmeId} onChange={(e) => setProgrammeId(e.target.value)} options={options.map((p) => ({ value: p.id, label: `${p.name} (${p.status})` }))} />
            <p className="mp-formula">Each creator gets the plan fee for their reach: expected views at {programme ? fmtINR(programme.ratePer1000) : 'the plan rate'} per 1,000 views.</p>
            <ul className="mp-bulk-list">
              {rows.map((r) => (
                <li key={r.creator.id}>
                  <span>{r.creator.name}</span>
                  {r.already ? <small>Already in this programme</small> : <b>{fmtINR(r.fee)}</b>}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Modal>
  );
}
