import { type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { StoreProvider, useStore } from '@/state/store';
import { Shell } from '@/components/layout/Shell';
import '@/redesign.css';
import '@/styles/foundation.css';
import Home from '@/pages/Home';
import Campaigns from '@/pages/Campaigns';
import MyWork from '@/pages/MyWork';
import BoardPage from '@/pages/BoardPage';
import Agreements from '@/pages/Agreements';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import CampaignDetail from '@/components/campaigns/CampaignDetail';
import Programmes from '@/pages/Programmes';
import ProgrammeDetail from '@/pages/ProgrammeDetail';
import Marketplace from '@/pages/Marketplace';
import Compare from '@/pages/Compare';
import CreatorProfilePage from '@/pages/CreatorProfile';
import SharedReport from '@/pages/SharedReport';
import Opportunities from '@/pages/creator/Opportunities';
import OpportunityDetail from '@/pages/creator/OpportunityDetail';
import CreatorWork from '@/pages/creator/MyWork';
import CreatorProfileEdit from '@/pages/creator/Profile';
import Landing from '@/pages/Landing';
// Loaded last so the theme wins over per-screen stylesheets.
import '@/styles/nano-theme.css';

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  const [loc] = useLocation();
  const { role, signedIn } = useStore();

  // Read-only report page: no sidebar, no editing.
  if (loc.startsWith('/share/')) {
    return (
      <div className="app-shell share-shell">
        <RoutedErrorBoundary>
          <Switch>
            <Route path="/share/:id">{(p) => <SharedReport id={p.id} />}</Route>
            <Route component={NotFound} />
          </Switch>
        </RoutedErrorBoundary>
      </div>
    );
  }

  // Not logged in: the landing page with the two demo logins.
  if (!signedIn) return <Landing />;

  // Each role only sees its own screens.
  if (role === 'creator' && !loc.startsWith('/creator')) return <Redirect to="/creator" />;
  if (role === 'brand' && loc.startsWith('/creator')) return <Redirect to="/" />;

  return (
    <Shell>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/programmes" component={Programmes} />
          <Route path="/programmes/:id">{(p) => <ProgrammeDetail id={p.id} />}</Route>
          <Route path="/marketplace" component={Marketplace} />
          <Route path="/marketplace/compare" component={Compare} />
          <Route path="/marketplace/:id">{(p) => <CreatorProfilePage id={p.id} />}</Route>
          <Route path="/campaigns" component={Campaigns} />
          <Route path="/campaigns/:id">{(p) => <CampaignDetail id={p.id} />}</Route>
          <Route path="/my-work" component={MyWork} />
          <Route path="/board" component={BoardPage} />
          <Route path="/agreements" component={Agreements} />
          <Route path="/reports" component={Reports} />
          <Route path="/settings" component={Settings} />
          <Route path="/creator" component={Opportunities} />
          <Route path="/creator/opportunities/:id">{(p) => <OpportunityDetail id={p.id} />}</Route>
          <Route path="/creator/work" component={CreatorWork} />
          <Route path="/creator/profile" component={CreatorProfileEdit} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </Shell>
  );
}

function App() {
  return (
    <StoreProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
    </StoreProvider>
  );
}

export default App;
