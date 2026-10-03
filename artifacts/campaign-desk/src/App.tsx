import { type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { StoreProvider } from '@/state/store';
import { Shell } from '@/components/layout/Shell';
import CampaignList from '@/components/campaigns/CampaignList';
import CampaignDetail from '@/components/campaigns/CampaignDetail';
import { AgreementsPage, BoardPage, MyWorkPage, ReportsPage, SettingsPage } from '@/pages/Pages';

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return (
    <Shell>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={CampaignList} />
          <Route path="/campaigns/:id">{(p) => <CampaignDetail id={p.id} />}</Route>
          <Route path="/my-work" component={MyWorkPage} />
          <Route path="/board" component={BoardPage} />
          <Route path="/agreements" component={AgreementsPage} />
          <Route path="/reports" component={ReportsPage} />
          <Route path="/settings" component={SettingsPage} />
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
