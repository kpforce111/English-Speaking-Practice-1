import { Link } from 'wouter';
import { MessageCircle, Mic, Languages, Users, GraduationCap, BarChart2, ArrowRight } from 'lucide-react';
import { useGetCurrentSubscription, getGetCurrentSubscriptionQueryKey } from '@workspace/api-client-react';
import { TrialAccessPanel } from '@/components/trial-access-panel';

const advancedFeatures = [
  { href: '/voice', label: 'Voice Practice', icon: Mic, desc: 'Real-time spoken conversation with gentle corrections.' },
  { href: '/chat', label: 'Chat Practice', icon: MessageCircle, desc: 'Text-based conversation to improve your writing.' },
  { href: '/roleplays', label: 'Roleplays', icon: Users, desc: 'Practice real-world scenarios like interviews or ordering food.' },
  { href: '/translate', label: 'Translate & Correct', icon: Languages, desc: 'Translate text or get immediate grammatical corrections.' },
  { href: '/lessons', label: 'Daily Lessons', icon: GraduationCap, desc: 'Guided lessons tailored to your skill level.' },
  { href: '/progress', label: 'My Progress', icon: BarChart2, desc: 'Track your vocabulary, fluency, and weekly growth.' },
];

export function AdvancedHub() {
  const { data: subData, isLoading, isError, error } = useGetCurrentSubscription({ query: { 
    queryKey: getGetCurrentSubscriptionQueryKey(),
    retry: (failureCount, err) => {
      if ((err as any)?.status === 401) return false;
      return failureCount < 3;
    }
  }});

  if (isLoading) {
    return (
      <main className="practice-page min-h-[100dvh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
          <p className="font-bold">Loading your coach...</p>
        </div>
      </main>
    );
  }

  if (isError) {
    const status = (error as any)?.status;
    if (status === 401) {
      return (
        <main className="practice-page min-h-[100dvh] flex items-center justify-center px-5 md:px-10">
          <TrialAccessPanel boxName="Advanced English Coach" />
        </main>
      );
    }

    return (
      <main className="practice-page min-h-[100dvh] flex items-center justify-center px-5 md:px-10">
        <div className="text-center">
          <h2 className="text-xl font-bold text-destructive">Failed to load coach</h2>
          <p className="mt-2 text-muted-foreground">{error?.message || 'Please try again later.'}</p>
        </div>
      </main>
    );
  }

  const subscriptions = (subData as any)?.subscriptions || [];
  const advSub = subscriptions.find((sub: any) => sub.boxId === 'advanced');
  const hasAccess = advSub && ['active', 'trialing', 'cancel_pending'].includes(advSub.status);

  if (!hasAccess) {
    return (
      <main className="practice-page min-h-[100dvh] flex items-center justify-center px-5 md:px-10">
        <TrialAccessPanel boxName="Advanced English Coach" />
      </main>
    );
  }

  return (
    <main className="practice-page min-h-[100dvh] px-5 pb-12 pt-12 md:px-10 md:pt-18">
      <section className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <p className="mb-3 text-base font-bold uppercase tracking-[0.14em] text-secondary">Advanced English Coach</p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Welcome to Your Coach</h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg font-medium leading-relaxed text-muted-foreground">
            Complete your daily lessons, engage in free-flowing conversations, or practice specific roleplays to hone your fluency.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {advancedFeatures.map((feat) => (
            <Link key={feat.href} href={feat.href} className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-secondary/40 hover:shadow-md">
              <div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                  <feat.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-foreground">{feat.label}</h3>
                <p className="mt-2 text-sm font-medium text-muted-foreground leading-relaxed">
                  {feat.desc}
                </p>
              </div>
              <div className="mt-6 flex items-center text-sm font-bold text-secondary">
                Open <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
