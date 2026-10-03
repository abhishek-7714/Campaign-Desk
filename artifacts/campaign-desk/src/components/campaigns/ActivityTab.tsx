import { Badge } from '@/components/ui-bits';
import { fmtDateTime } from '@/domain/helpers';
import { useStore } from '@/state/store';

export default function ActivityList({ campaignId, limit }: { campaignId: string; limit?: number }) {
  const { activity } = useStore();
  const items = activity.filter((a) => a.campaignId === campaignId).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
  return (
    <div className="panel timeline-panel">
      <div className="panel-head"><h3 className="section-title">Activity</h3><span className="count-label">Newest first</span></div>
      <div className="panel-body">
        {items.map((a) => (
          <div className="activity-item tl" key={a.id}>
            <span className="activity-dot" />
            <div>
              <strong>{a.actor}</strong> {a.message} {a.example && <Badge value="Example history" />}
              <div className="activity-time">{fmtDateTime(a.timestamp)}</div>
            </div>
          </div>
        ))}
        {!items.length && <div className="empty-state">No activity recorded yet.</div>}
      </div>
    </div>
  );
}
