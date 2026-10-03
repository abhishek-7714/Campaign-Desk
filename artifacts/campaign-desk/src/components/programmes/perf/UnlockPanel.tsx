import { Camera, Check, Instagram, Link2, Lock, Send } from 'lucide-react';
import { SourceBadge } from '@/components/shared';
import type { GridRow } from '@/domain/performance';
import { useStore } from '@/state/store';
import { CopyButton } from './cells';
import { firstName } from './model';

/**
 * Explains why reach, saves and shares are locked and offers the three ways to unlock them.
 * Used in the post drawer and in the grid's "Unlock" drawer.
 */
export default function UnlockPanel({ row, readOnly = false, onConnectInstagram }: { row: GridRow; readOnly?: boolean; onConnectInstagram: () => void }) {
  const { requestInsights, setPostCollab, integrations, programmeById, notify } = useStore();
  const post = row.primary;
  const programme = programmeById(row.collab.programmeId ?? '');
  const name = firstName(row.creator.name);
  const live = row.status === 'Live' && !!post;
  const invite = `Hi ${name}, could you connect your Instagram professional account in nano.club? We need reach, saves and shares for your Reel in ${programme?.name ?? 'our campaign'}. Once you connect, they show up for us automatically and you never need to send screenshots again.`;

  let igReason = '';
  if (!row.brandCanUnlock) igReason = !post?.isCollab
    ? 'Works only for Collab posts, where the creator adds your account as a partner. This post is not marked as a Collab post.'
    : integrations.instagram ? 'Your Instagram is connected already.' : 'Not available for this post.';

  return (
    <div className="pf-unlock">
      <div className="pf-unlock-why">
        <Lock size={16} />
        <p><b>Why these are locked.</b> Reach, saves and shares are private. Instagram shows them only to the creator, so they cannot be read from the public post page. Views, likes and comments are public, so those are already collected.</p>
      </div>
      {readOnly && <p className="muted fine">Not unlocked yet. Only people with access to the workspace can request them.</p>}
      {!readOnly && (
        <ol className="pf-opts">
          <li className="pf-opt">
            <span className="pf-opt-ico t-blue"><Camera size={17} /></span>
            <div className="pf-opt-body">
              <b>Ask the creator for a screenshot</b>
              <p>{name} sends a screenshot of the post insights. The numbers are read from it and {name} confirms them.</p>
              {post?.insightRequested
                ? <span className="pill t-green"><Check size={12} />Requested</span>
                : <button type="button" className="btn small" disabled={!live} onClick={() => post && requestInsights(post.id)}><Send size={13} />Ask for screenshot</button>}
              {!live && <small className="muted">Available once the post is live.</small>}
            </div>
          </li>
          <li className={`pf-opt ${igReason ? 'off' : ''}`}>
            <span className="pf-opt-ico t-purple"><Instagram size={17} /></span>
            <div className="pf-opt-body">
              <b>Connect your Instagram</b>
              <p>For Collab posts, your connected brand account can read reach, saves and shares directly. Source shows as <SourceBadge source="brand-connected" />.</p>
              <button type="button" className="btn small" disabled={!!igReason || !live} onClick={onConnectInstagram}><Instagram size={13} />Connect Instagram</button>
              {igReason && <small className="muted">{igReason}</small>}
              {!post?.isCollab && live && post && <button type="button" className="link-btn" onClick={() => setPostCollab(post.id, true)}>Mark this as a Collab post</button>}
            </div>
          </li>
          <li className="pf-opt">
            <span className="pf-opt-ico t-green"><Link2 size={17} /></span>
            <div className="pf-opt-body">
              <b>Ask the creator to connect their account</b>
              <p>Once {name} connects, every post shows reach, saves and shares on its own. Copy a short message to send.</p>
              <CopyButton text={invite} label={`Copy invite message for ${row.creator.name}`} className="pf-copy-btn" onCopied={() => notify('Invite message copied')}>Copy invite message</CopyButton>
            </div>
          </li>
        </ol>
      )}
    </div>
  );
}
