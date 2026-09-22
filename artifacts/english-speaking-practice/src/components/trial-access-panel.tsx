import { Link } from 'wouter';
import { Sparkles, Loader2, Play } from 'lucide-react';
import { useAuth } from '@clerk/react';
import { useStartSharedTrial, getGetPracticeSessionQueryKey, getGetCurrentSubscriptionQueryKey, getGetBeginnerOverviewQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useLocation } from 'wouter';

export function TrialAccessPanel({ boxName = "this learning box", onTrialStarted }: { boxName?: string, onTrialStarted?: () => void }) {
  const { isSignedIn } = useAuth();
  const startTrial = useStartSharedTrial();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  const handleStartTrial = () => {
    setError(null);
    startTrial.mutate(undefined, {
      onSuccess: () => {
        // Invalidate all access queries
        queryClient.invalidateQueries({ queryKey: getGetPracticeSessionQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCurrentSubscriptionQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetBeginnerOverviewQueryKey() });
        if (onTrialStarted) {
          onTrialStarted();
        } else {
          // just reload the page basically, invalidation should re-render
        }
      },
      onError: (err: any) => {
        setError(err.message || 'An error occurred while starting your trial.');
      }
    });
  };

  return (
    <div className="mx-auto max-w-lg w-full">
      <div className="rounded-[2rem] border-2 border-primary/20 bg-card p-8 shadow-xl text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles size={36} strokeWidth={2.5} />
        </div>
        
        <h2 className="text-2xl font-extrabold md:text-3xl">Access Required</h2>
        <p className="mt-4 text-base font-medium text-muted-foreground leading-relaxed">
          You need an active subscription or a free trial to access {boxName}.
        </p>

        {error && (
          <div className="mt-6 rounded-xl bg-destructive/10 p-4 text-sm font-medium text-destructive">
            {error}
          </div>
        )}

        <div className="mt-8 space-y-4">
          {isSignedIn ? (
            <button
              onClick={handleStartTrial}
              disabled={startTrial.isPending}
              className="brand-gradient-button flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-lg font-bold shadow-lg transition-transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {startTrial.isPending ? <Loader2 size={20} className="animate-spin" /> : <Play fill="currentColor" size={20} />}
              Start Free 2-Day Trial
            </button>
          ) : (
            <div className="space-y-4">
              <Link href={`/sign-up?redirect_url=${encodeURIComponent(window.location.pathname)}`} className="brand-gradient-button flex w-full items-center justify-center rounded-2xl px-6 py-4 text-lg font-bold shadow-lg transition-transform hover:-translate-y-0.5 active:scale-95">
                Create Account for Free Trial
              </Link>
              <Link href={`/sign-in?redirect_url=${encodeURIComponent(window.location.pathname)}`} className="flex w-full items-center justify-center rounded-2xl border-2 border-border bg-card px-6 py-3.5 text-base font-bold text-foreground transition-colors hover:bg-secondary">
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
