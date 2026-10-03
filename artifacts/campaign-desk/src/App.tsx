import { type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { StoreProvider } from '@/state/store';
import { Shell } from '@/components/layout/Shell';
import '@/redesign.css';
import Home from '@/pages/Home';
import Campaigns from '@/pages/Campaigns';
import MyWork from '@/pages/MyWork';
import BoardPage from '@/pages/BoardPage';
import Agreements from '@/pages/Agreements';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import CampaignDetail from '@/components/campaigns/CampaignDetail';

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return (
    <Shell>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/campaigns" component={Campaigns} />
          <Route path="/campaigns/:id">{(p) => <CampaignDetail id={p.id} />}</Route>
          <Route path="/my-work" component={MyWork} />
          <Route path="/board" component={BoardPage} />
          <Route path="/agreements" component={Agreements} />
          <Route path="/reports" component={Reports} />
          <Route path="/settings" component={Settings} />
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
