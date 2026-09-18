import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

import { Layout } from '@/components/layout';
import { Home } from '@/pages/home';
import { Voice } from '@/pages/voice';
import { Translate } from '@/pages/translate';
import { Roleplays } from '@/pages/roleplays';
import { RoleplayScenario } from '@/pages/roleplay-scenario';
import { Lessons } from '@/pages/lessons';
import { Progress } from '@/pages/progress';
import { Pricing } from '@/pages/pricing';
import { Privacy, Terms, About, Support } from '@/pages/static-pages';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function Router() {
  return (
    <RoutedErrorBoundary>
      <Layout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/voice" component={Voice} />
          <Route path="/translate" component={Translate} />
          <Route path="/roleplays" component={Roleplays} />
          <Route path="/roleplays/:scenario" component={RoleplayScenario} />
          <Route path="/lessons" component={Lessons} />
          <Route path="/progress" component={Progress} />
          <Route path="/pricing" component={Pricing} />
          
          <Route path="/privacy" component={Privacy} />
          <Route path="/terms" component={Terms} />
          <Route path="/about" component={About} />
          <Route path="/support" component={Support} />
          
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
