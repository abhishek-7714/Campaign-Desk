import { useMemo, useState } from 'react';
import { ChevronDown, Clock, Send } from 'lucide-react';
import { CreatorCell } from '@/components/shared';
import { shortDate } from '@/domain/format';
import type { GridRow, StoryInfo } from '@/domain/performance';
import { fmtNum } from '@/domain/money';
import { useStore } from '@/state/store';

type Item = { row: GridRow; story: StoryInfo };

function State({ s }: { s: StoryInfo }) {
  if (s.confirmed) return <span className="pill t-green"><i />Confirmed</span>;
  if (s.awaitingScreenshot) return s.post.insightRequested ? <span className="pill t-blue"><i />Requested</span> : <span className="pill t-yellow"><i />Awaiting screenshot</span>;
  if (s.status === 'Late') return <span className="pill t-coral"><i />Late</span>;
  if (s.status === 'Missed') return <span className="pill pf-missed"><i />Missed</span>;
  return <span className="pill t-neutral">Planned</span>;
}

export const storyDate = (s: StoryInfo) =>
  s.status === 'Live' ? `Posted ${shortDate(s.post.postedAt)}` : s.post.plannedDate ? `${s.status === 'Planned' ? 'Planned for' : 'Was due'} ${shortDate(s.post.plannedDate)}` : '';

export default function StoriesPanel({ rows, readOnly }: { rows: GridRow[]; readOnly: boolean }) {
  const { requestInsights, notify } = useStore();
  const [open, setOpen] = useState(true);
  const items = useMemo<Item[]>(() => {
    const order = (s: StoryInfo) => (s.awaitingScreenshot ? 0 : s.confirmed ? 2 : 1);
    return rows.flatMap((row) => row.stories.map((story) => ({ row, story }))).sort((a, b) => order(a.story) - order(b.story) || a.row.creator.name.localeCompare(b.row.creator.name));
  }, [rows]);
  const awaiting = items.filter((i) => i.story.awaitingScreenshot);
  const todo = awaiting.filter((i) => !i.story.post.insightRequested);
  if (!items.length) return null;

  const requestAll = () => { todo.forEach((i) => requestInsights(i.story.post.id)); notify(`Requested screenshots from ${todo.length} creator${todo.length === 1 ? '' : 's'}`); };

  return (
    <section className="card pf-stories" aria-label="Stories">
      <div className="pf-stories-head">
        <button type="button" className="pf-collapse" aria-expanded={open} aria-controls="pf-stories-body" onClick={() => setOpen((o) => !o)}>
          <ChevronDown size={18} className={open ? 'open' : ''} />
          <h3>Stories</h3>
          <span className={`pill ${awaiting.length ? 't-yellow' : 't-green'}`}>{awaiting.length ? `${awaiting.length} awaiting screenshot${awaiting.length === 1 ? '' : 's'}` : 'None waiting'}</span>
        </button>
        {!readOnly && todo.length > 0 && <button type="button" className="btn small" onClick={requestAll}><Send size={13} />Request all ({todo.length})</button>}
      </div>
      {open && (
        <div id="pf-stories-body">
          <p className="pf-note"><Clock size={14} />Story numbers disappear after 24 hours. Instagram keeps story views private to the creator, so they cannot be collected from a public page. A creator screenshot is the only source.</p>
          <ul className="pf-story-list">
            {items.map(({ row, story }) => (
              <li key={story.post.id} className="pf-story">
                <CreatorCell creator={row.creator} size={30} />
                <span className="pf-story-date">{storyDate(story)}</span>
                <State s={story} />
                <span className="pf-story-num">
                  {story.confirmed && story.post.insights ? <>{story.views !== null && <b>{fmtNum(story.views)} views</b>}<small>{fmtNum(story.post.insights.reach)} reach</small></> : null}
                </span>
                <span className="pf-story-act">
                  {!readOnly && story.awaitingScreenshot && !story.post.insightRequested && <button type="button" className="btn small" onClick={() => requestInsights(story.post.id)} aria-label={`Request a story screenshot from ${row.creator.name}`}>Request screenshot</button>}
                  {!readOnly && story.awaitingScreenshot && story.post.insightRequested && <button type="button" className="btn small" disabled>Requested</button>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
