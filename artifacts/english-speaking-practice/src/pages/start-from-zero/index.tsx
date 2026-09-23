import { Link, Redirect } from 'wouter';
import { Play, RotateCcw, CheckCircle2, Headphones, Star } from 'lucide-react';
import { useGetBeginnerOverview, getGetBeginnerOverviewQueryKey, useGetCurrentSubscription, getGetCurrentSubscriptionQueryKey } from '@workspace/api-client-react';
import { TrialAccessPanel } from '@/components/trial-access-panel';

export function StartFromZeroHome() {
  const { data: subData, isLoading: isLoadingSub, isError: isSubError, error: subError } = useGetCurrentSubscription({ query: {
    queryKey: getGetCurrentSubscriptionQueryKey(),
    retry: (failureCount, err) => {
      if ((err as any)?.status === 401) return false;
      return failureCount < 3;
    }
  }});

  const subscriptions = (subData as any)?.subscriptions || [];
  const startZeroSub = subscriptions.find((sub: any) => sub.boxId === 'start_zero');
  const hasAccess = startZeroSub && ['active', 'trialing', 'cancel_pending'].includes(startZeroSub.status);

  const { data: overview, isLoading, isError, error } = useGetBeginnerOverview({ query: { 
    queryKey: getGetBeginnerOverviewQueryKey(),
    enabled: hasAccess,
    retry: false
  }});

  if (isLoadingSub || (hasAccess && isLoading)) {
    return (
      <main className="practice-page min-h-[100dvh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="font-bold">Loading your practice / Aapka practice load ho raha hai...</p>
        </div>
      </main>
    );
  }

  if (isSubError || isError) {
    const status = (subError as any)?.status || (error as any)?.status;
    if (status === 401 || status === 402) {
      return (
        <main className="practice-page min-h-[100dvh] flex items-center justify-center px-5 md:px-10">
          <TrialAccessPanel boxName="Zero English / Start from Zero" />
        </main>
      );
    }
    
    return (
      <main className="practice-page min-h-[100dvh] flex items-center justify-center px-5 md:px-10">
        <div className="text-center">
          <h2 className="text-xl font-bold text-destructive">Failed to load practice</h2>
          <p className="mt-2 text-muted-foreground">{((subError || error) as any)?.message || 'Please try again later.'}</p>
        </div>
      </main>
    );
  }

  if (!hasAccess) {
    return (
      <main className="practice-page min-h-[100dvh] flex items-center justify-center px-5 md:px-10">
        <TrialAccessPanel boxName="Zero English / Start from Zero" />
      </main>
    );
  }

  if (!overview) return null;

  if (!overview.profile?.assessmentCompleted) {
    return <Redirect to="/start-from-zero/assessment" />;
  }

  const { profile, summary } = overview;
  const levelDisplay = profile.level === 'level_1' ? 'Level 1' : 'Level 0';
  const levelText = profile.level === 'level_1' ? 'Basic Sentences' : 'Starting from Zero';
  const isPracticeDoneToday = Boolean(profile?.sessionsCompleted && profile.sessionsCompleted > 0); // We don't have completedToday. Actually we can just show the stats without hiding the CTA, or if sessionsCompleted > 0 maybe they want to practice again. Let's just always show the "Ready for Today's Practice" if they want to practice more, but for now we'll just check if wordsLearned > 0 or sentencesPracticed > 0 to show stats.

  return (
    <main className="practice-page min-h-[100dvh] px-5 pb-12 pt-8 md:px-10 md:pt-12">
      <section className="mx-auto max-w-2xl">
        <header className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
            <Star size={16} /> {levelDisplay} • {levelText}
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Zero English Practice</h1>
          <p className="mt-3 text-base font-medium text-muted-foreground">
            Rozana practice karein aur English bolna seekhein.
          </p>
        </header>

        {(summary?.wordsLearned > 0 || summary?.sentencesPracticed > 0) && (
          <div className="mb-8 rounded-3xl border-2 border-emerald-500/20 bg-emerald-500/5 p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <CheckCircle2 size={32} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-extrabold text-foreground">Practice Progress</h2>
            <p className="mt-2 text-base font-medium text-muted-foreground">
              Aapki aaj ki mehnat.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm font-bold text-foreground">
              <div className="rounded-xl bg-card px-4 py-3 shadow-sm border border-border">
                <span className="block text-xl text-primary">{String(summary?.wordsLearned || 0)}</span>
                <span className="text-muted-foreground">Words</span>
              </div>
              <div className="rounded-xl bg-card px-4 py-3 shadow-sm border border-border">
                <span className="block text-xl text-primary">{String(summary?.sentencesPracticed || 0)}</span>
                <span className="text-muted-foreground">Sentences</span>
              </div>
              <div className="rounded-xl bg-card px-4 py-3 shadow-sm border border-border">
                <span className="block text-xl text-primary">{String(summary?.pronunciationMistakes || 0)}</span>
                <span className="text-muted-foreground">Mistakes</span>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8 rounded-3xl border-2 border-primary/20 bg-card p-6 shadow-lg text-center md:p-10">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Headphones size={36} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-extrabold md:text-3xl">Ready for Today's Practice?</h2>
          <p className="mt-3 text-base font-medium text-muted-foreground">
            Sunenge, samjhenge, aur bolenge. Sirf 15-30 minute.
          </p>
          
          <Link href="/start-from-zero/practice" className="mx-auto mt-8 flex w-full max-w-sm items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-4 text-lg font-bold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5 hover:shadow-xl active:scale-95">
            <Play fill="currentColor" size={20} />
            START TODAY'S PRACTICE
          </Link>
        </div>

        {overview.revision && overview.revision.length > 0 && (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Revision Bank</h3>
                <p className="text-sm font-medium text-muted-foreground">Pichli galtiyan sudharein</p>
              </div>
            </div>
            
            <Link href="/start-from-zero/practice?mode=revision" className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-border bg-secondary/5 px-4 py-3 font-bold text-foreground transition-colors hover:bg-secondary/10 hover:border-secondary/30">
              Practice {overview.revision.length} Weak Items
            </Link>
          </div>
        )}

      </section>
    </main>
  );
}
