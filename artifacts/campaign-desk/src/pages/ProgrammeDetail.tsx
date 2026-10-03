import { useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { ArrowLeft, CalendarDays, Share2 } from 'lucide-react';
import { fmtDate } from '@/domain/helpers';
import { Pill, PageTitle } from '@/components/viz/Cards';
import { useStore } from '@/state/store';
import CreatorsPipeline from '@/components/programmes/CreatorsPipeline';
import ProgrammeOverview from '@/components/programmes/ProgrammeOverview';
import ProgrammeBrief from '@/components/programmes/ProgrammeBrief';
import PerformanceTab from '@/components/programmes/PerformanceTab';
import SalesTab from '@/components/programmes/SalesTab';
import { STATUS_TONE, shareUrl } from '@/components/programmes/programmeUtils';
import '@/styles/programmes.css';

const TABS = ['Overview', 'Creators', 'Performance', 'Sales', 'Brief'] as const;
type Tab = (typeof TABS)[number];

export default function ProgrammeDetail({ id }: { id: string }) {
  const { brandProgrammes, applications, setProgrammeStatus, notify } = useStore();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(useSearch());
  const tab: Tab = TABS.find((t) => t.toLowerCase() === params.get('tab')) ?? 'Overview';
  const [confirmEnd, setConfirmEnd] = useState(false);
  // Only campaigns owned by this workspace are shown here.
  const p = brandProgrammes.find((x) => x.id === id);

  if (!p) {
    return (
      <>
        <PageTitle title="Campaign not found" sub="It may have been removed, or the link is wrong." />
        <Link className="btn" href="/programmes"><ArrowLeft size={14} />Back to campaigns</Link>
      </>
    );
  }

  const mine = applications.filter((a) => a.programmeId === p.id);
  const accepted = mine.filter((a) => a.status === 'Accepted').length;
  const inPipeline = mine.filter((a) => a.status !== 'Declined' && a.status !== 'Rejected').length;

  const share = async () => {
    const url = shareUrl(p.id);
    try {
      if (!navigator.clipboard) throw new Error('no clipboard');
      await navigator.clipboard.writeText(url);
      notify('Report link copied');
    } catch {
      notify(`Copy this report link: ${url}`);
    }
  };

  return (
    <>
      <Link href="/programmes" className="pg-back"><ArrowLeft size={14} />Campaigns</Link>
      <div className="detail-top">
        <div style={{ minWidth: 0 }}>
          <div className="detail-meta pg-meta"><Pill tone={STATUS_TONE[p.status]}>{p.status}</Pill><span>{p.product}</span></div>
          <h1 className="detail-title">{p.name}</h1>
          <div className="detail-meta pg-meta"><CalendarDays size={14} />{fmtDate(p.startDate)} to {fmtDate(p.endDate)}</div>
        </div>
        <div className="detail-actions pg-actions">
          {p.status === 'Draft' && <button className="btn primary" onClick={() => setProgrammeStatus(p.id, 'Open call')}>Publish to marketplace</button>}
          {p.status === 'Open call' && (
            <span className="pg-action-hint">
              <button className="btn primary" disabled={accepted === 0} aria-describedby={accepted === 0 ? 'pg-start-hint' : undefined} onClick={() => setProgrammeStatus(p.id, 'Live')}>Start campaign</button>
              {accepted === 0 && <small id="pg-start-hint">Accept at least one creator first.</small>}
            </span>
          )}
          {p.status === 'Live' && !confirmEnd && <button className="btn primary" onClick={() => setConfirmEnd(true)}>Mark completed</button>}
          {p.status === 'Live' && confirmEnd && (
            <span className="pg-confirm" role="group" aria-label="Confirm marking completed">
              <small>Mark as completed?</small>
              <button className="btn primary small" onClick={() => { setProgrammeStatus(p.id, 'Completed'); setConfirmEnd(false); }}>Yes, complete</button>
              <button className="btn small" onClick={() => setConfirmEnd(false)}>Not yet</button>
            </span>
          )}
          <button className="btn" onClick={share}><Share2 size={14} />Share report</button>
        </div>
      </div>

      <div className="tabs pg-tabs" role="tablist" aria-label="Campaign sections">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`tab ${tab === t ? 'active' : ''}`}
            onClick={() => navigate(`/programmes/${p.id}?tab=${t.toLowerCase()}`, { replace: true })}>
            {t}{t === 'Creators' && inPipeline ? ` (${inPipeline})` : ''}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label={tab}>
        {tab === 'Overview' && <ProgrammeOverview programme={p} />}
        {tab === 'Creators' && <CreatorsPipeline programme={p} />}
        {tab === 'Performance' && <PerformanceTab programmeId={p.id} />}
        {tab === 'Sales' && <SalesTab programmeId={p.id} />}
        {tab === 'Brief' && <ProgrammeBrief programme={p} />}
      </div>
    </>
  );
}
