import { useState } from 'react';
import { Link } from 'wouter';
import { AlertCircle, Check, CheckCircle2, ExternalLink, Film, Image as ImageIcon, Instagram, Send, Smartphone } from 'lucide-react';
import type { Creator, Post } from '@/domain/types';
import { fmtDate } from '@/domain/helpers';
import { latest, parseInstagramLink, postStatus, shortLink } from '@/domain/performance';
import { fmtNum } from '@/domain/money';
import { SourceBadge } from '@/components/shared';
import { useStore } from '@/state/store';
import { InsightNumbers, StoryInsightsFlow } from './StoryInsights';
import '@/styles/creator.css';

const ICON = { Reel: Film, Post: ImageIcon, Story: Smartphone } as const;

/** Paste-the-link form for a Reel or feed post that is not live yet. */
function LinkForm({ post }: { post: Post }) {
  const { addPostLink } = useStore();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    if (!url.trim()) { setError(`Paste the link to your ${post.type}.`); return; }
    const { kind } = parseInstagramLink(url);
    if (kind === 'Story') { setError('That is a Story link. Paste the link to your Reel or post instead.'); return; }
    if (kind !== 'Reel' && kind !== 'Post') { setError('That does not look like an Instagram Reel or post link. In Instagram, tap Share, then Copy link.'); return; }
    setError('');
    addPostLink(post.id, url.trim());
  };
  return (
    <form className="cr-link" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
      <label>Post it, then paste the link
        <span className="cr-link-row">
          <input type="url" inputMode="url" placeholder="https://www.instagram.com/reel/…" value={url} aria-invalid={!!error}
            onChange={(e) => { setUrl(e.target.value); setError(''); }} />
          <button type="submit" className="btn primary small"><Send size={13} />Submit link</button>
        </span>
      </label>
      {error && <small className="error-text" role="alert">{error}</small>}
    </form>
  );
}

export function PostRow({ post, creator, brand }: { post: Post; creator: Creator; brand: string }) {
  const { now, markStoryPosted } = useStore();
  const status = postStatus(post, now);
  const isStory = post.type === 'Story';
  const posted = status === 'Live' || status === 'Fetching';
  const Icon = ICON[post.type];
  const late = status === 'Late' || status === 'Missed';
  const snap = latest(post);

  return (
    <li className={`cr-post ${posted ? 'done' : ''} ${late ? 'late' : ''}`}>
      <div className="cr-post-head">
        <span className="cr-post-ico" aria-hidden="true">{posted ? <CheckCircle2 size={18} /> : <Icon size={18} />}</span>
        <div className="cr-post-t">
          <b>{post.type === 'Story' ? 'Instagram Story' : post.type === 'Reel' ? 'Instagram Reel' : 'Feed post'}</b>
          <small>
            {posted ? (post.postedAt ? `Posted ${fmtDate(post.postedAt)}` : 'Posted')
              : late ? <span className="cr-late"><AlertCircle size={12} />Late, it was due {fmtDate(post.plannedDate)}</span>
                : `Due ${fmtDate(post.plannedDate)}`}
          </small>
        </div>
      </div>

      {/* Reel or post, not posted yet */}
      {!isStory && !posted && <LinkForm post={post} />}

      {/* Reel or post, live */}
      {!isStory && posted && (
        <div className="cr-post-body">
          <a href={post.url} target="_blank" rel="noopener noreferrer" className="cr-url">{shortLink(post.url)}<ExternalLink size={12} aria-hidden="true" /></a>
          <div className="cr-numbers">
            <span className="eyebrow">Public numbers the brand sees</span>
            {status === 'Fetching' || !snap ? <p className="muted">Collecting your public numbers…</p> : (
              <div className="cr-nums">
                <div><b>{fmtNum(snap.views)}</b><span>Views</span></div>
                <div><b>{fmtNum(snap.likes)}</b><span>Likes</span></div>
                <div><b>{fmtNum(snap.comments)}</b><span>Comments</span></div>
                <SourceBadge source="public" />
              </div>
            )}
          </div>
          {post.insights ? (
            <div className="cr-numbers"><span className="eyebrow">Your private numbers, shared with the brand</span><InsightNumbers insights={post.insights} story={false} /></div>
          ) : !creator.instagramConnected && (
            <p className="cr-nudge"><Instagram size={14} />Connect Instagram so brands see your reach without screenshots. <Link href="/creator/profile" className="textlink">Connect on your profile</Link></p>
          )}
        </div>
      )}

      {/* Story, not posted */}
      {isStory && !posted && (
        <div className="cr-post-body">
          <button className="btn small" onClick={() => markStoryPosted(post.id)}><Check size={13} />Mark as posted</button>
        </div>
      )}

      {/* Story, posted */}
      {isStory && posted && (
        <div className="cr-post-body">
          {post.insights ? <InsightNumbers insights={post.insights} story />
            : post.insightRequested ? <StoryInsightsFlow post={post} creator={creator} brand={brand} />
              : <p className="muted">Story posted. Story views are private, so the brand only sees numbers if they ask and you send them.</p>}
        </div>
      )}
    </li>
  );
}
