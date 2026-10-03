import { Link } from 'wouter';
import { ArrowLeft, Info } from 'lucide-react';
import PerformanceTab from '@/components/programmes/PerformanceTab';
import { fmtDate, todayISO } from '@/domain/helpers';
import { useStore } from '@/state/store';
import { Logo } from '@/components/Logo';
import '@/styles/performance.css';

/** Read-only report for one campaign. Shown without the sidebar, so it has its own header and footer. */
export default function SharedReport({ id }: { id: string }) {
  const { programmeById, workspaceName } = useStore();
  const programme = programmeById(id);

  if (!programme) {
    return (
      <main className="pf-share-page">
        <div className="pf-notfound">
          <Logo size={36} />
          <h1>This report was not found</h1>
          <p className="muted">The link may be wrong, or the campaign was removed. This prototype keeps its sample data in your browser, so a report link only opens in the browser where it was made.</p>
          <Link href="/" className="btn primary"><ArrowLeft size={15} />Back to workspace</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="pf-share-page">
      <header className="pf-share-head">
        <div>
          <div className="pf-share-brand"><Logo size={30} /></div>
          <h1>{programme.name}</h1>
          <p>Report for {workspaceName}</p>
        </div>
        <div className="pf-share-meta">Generated {fmtDate(todayISO())}<br />Read only</div>
      </header>
      <div className="pf-banner" role="note"><Info size={16} aria-hidden="true" />Prototype: this report reads sample data stored in your browser, so shared links only work in this browser.</div>
      <PerformanceTab programmeId={id} readOnly />
      <footer className="pf-share-foot">
        <span>Made with nano.club. Numbers are sample data for this prototype.</span>
        <Link href="/"><ArrowLeft size={13} style={{ verticalAlign: '-2px' }} /> Back to workspace</Link>
      </footer>
    </main>
  );
}
