import { Check, Lock } from 'lucide-react';
import type { Campaign } from '@/domain/types';
import { WORKFLOW_STAGES, nextStatus, stageIndex, transitionBlockers } from '@/domain/helpers';

export default function WorkflowProgress({ campaign, compact = false }: { campaign: Campaign; compact?: boolean }) {
  const cur = stageIndex(campaign.status);
  const complete = campaign.status === 'Complete';
  const next = nextStatus(campaign.status);
  const blockers = next ? transitionBlockers(campaign, next) : [];
  const blockedStage = next && blockers.length ? stageIndex(next) : -1;

  return (
    <div className="workflow" data-testid="workflow-progress">
      <ol className="wf-steps" aria-label="Campaign workflow">
        {WORKFLOW_STAGES.map((label, i) => {
          const state = complete || i < cur ? 'done' : i === cur ? 'current' : 'pending';
          const blocked = blockedStage === i && i !== cur;
          return (
            <li key={label} className={`wf-step ${state} ${blocked ? 'blocked' : ''}`} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="wf-dot">{state === 'done' ? <Check size={11} /> : blocked ? <Lock size={10} /> : i + 1}</span>
              <span className="wf-label">{label}</span>
              <span className="wf-state">{blocked ? 'Blocked' : state === 'done' ? 'Done' : state === 'current' ? 'Current' : 'Pending'}</span>
            </li>
          );
        })}
      </ol>
      {!compact && (
        <div className="wf-notes">
          <div><strong>Current status:</strong> {campaign.status}{campaign.blocker ? ` · Blocker: ${campaign.blocker}` : ''}</div>
          {next ? (
            blockers.length ? (
              <div className="wf-blocked" role="status">
                <strong>Move to {next} is blocked:</strong>
                <ul>{blockers.map((b) => <li key={b}>{b}</li>)}</ul>
              </div>
            ) : <div className="confirmed">Ready to move to {next}.</div>
          ) : <div className="confirmed">Campaign is complete.</div>}
        </div>
      )}
    </div>
  );
}
