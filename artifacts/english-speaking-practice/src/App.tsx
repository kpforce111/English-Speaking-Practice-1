import { ReactNode, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, Show, SignIn, SignUp, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

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
import { Settings } from '@/pages/settings';
import { Admin } from '@/pages/admin';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: { logoPlacement: 'inside' as const, logoLinkUrl: basePath || '/', logoImageUrl: `${window.location.origin}${basePath}/logo.svg` },
  variables: { colorPrimary: '#7c3aed', colorForeground: '#342b46', colorMutedForeground: '#756b82', colorDanger: '#dc3f52', colorBackground: '#ffffff', colorInput: '#f4f0fa', colorInputForeground: '#342b46', colorNeutral: '#ddd4e8', fontFamily: 'DM Sans, sans-serif', borderRadius: '1rem' },
  elements: { rootBox: 'w-full flex justify-center', cardBox: 'bg-white rounded-2xl w-[440px] max-w-full overflow-hidden border border-border', card: '!shadow-none !border-0 !bg-transparent !rounded-none', footer: '!shadow-none !border-0 !bg-transparent !rounded-none', headerTitle: 'text-foreground', headerSubtitle: 'text-muted-foreground', socialButtonsBlockButtonText: 'text-foreground', formFieldLabel: 'text-foreground', footerActionLink: 'text-primary', footerActionText: 'text-muted-foreground', dividerText: 'text-muted-foreground', identityPreviewEditButton: 'text-primary', formFieldSuccessText: 'text-emerald-700', alertText: 'text-destructive', logoBox: 'h-12', logoImage: 'h-12 w-auto', socialButtonsBlockButton: 'border-border', formButtonPrimary: 'bg-primary text-primary-foreground', formFieldInput: 'bg-secondary text-foreground border-border', footerAction: 'bg-transparent', dividerLine: 'bg-border', alert: 'border-destructive/30', otpCodeFieldInput: 'border-border', formFieldRow: 'text-foreground', main: 'text-foreground' },
};

function AuthCacheInvalidator() {
  const { addListener } = useClerk();
  const previous = useRef<string | null | undefined>(undefined);
  useEffect(() => addListener(({ user }) => {
    const id = user?.id ?? null;
    if (previous.current !== undefined && previous.current !== id) queryClient.clear();
    previous.current = id;
  }), [addListener]);
  return null;
}

function SignInPage() { return <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>; }
function SignUpPage() { return <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>; }
function SettingsPage() { return <><Show when="signed-in"><Settings /></Show><Show when="signed-out"><Redirect to="/sign-in" /></Show></>; }

function Router() {
  return (
    <RoutedErrorBoundary>
        <Switch>
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/admin" component={Admin} />
          <Route>
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
          <Route path="/settings" component={SettingsPage} />
          
          <Route path="/privacy" component={Privacy} />
          <Route path="/terms" component={Terms} />
          <Route path="/about" component={About} />
          <Route path="/support" component={Support} />
          
          <Route component={NotFound} />
          </Switch>
          </Layout>
          </Route>
        </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{ signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to restore Premium and your progress' } }, signUp: { start: { title: 'Create your Rllora account', subtitle: 'Keep your learning on every device' } } }} routerPush={(to) => setLocation(stripBase(to))} routerReplace={(to) => setLocation(stripBase(to), { replace: true })}>
    <QueryClientProvider client={queryClient}>
      <AuthCacheInvalidator />
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
