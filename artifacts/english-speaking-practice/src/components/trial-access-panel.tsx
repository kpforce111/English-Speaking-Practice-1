import { Link } from 'wouter';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@clerk/react';

export function TrialAccessPanel({ boxName = "this learning box" }: { boxName?: string }) {
  const { isSignedIn } = useAuth();

  return (
    <div className="mx-auto max-w-lg w-full">
      <div className="rounded-[2rem] border-2 border-primary/20 bg-card p-8 shadow-xl text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles size={36} strokeWidth={2.5} />
        </div>
        
        <h2 className="text-2xl font-extrabold md:text-3xl">Access Required</h2>
        <p className="mt-4 text-base font-medium text-muted-foreground leading-relaxed">
           You need an active subscription or the ₹5 two-day trial to access {boxName}.
        </p>

        <p className="mt-3 text-sm text-muted-foreground">Trial checkout is temporarily unavailable while PhonePe approval is pending.</p>

        <div className="mt-8 space-y-4">
          {isSignedIn ? (
            <Link href="/pricing" className="brand-gradient-button flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-lg font-bold shadow-lg">
              View ₹5 Trial &amp; Plans
            </Link>
          ) : (
            <div className="space-y-4">
              <Link href={`/sign-up?redirect_url=${encodeURIComponent(window.location.pathname)}`} className="brand-gradient-button flex w-full items-center justify-center rounded-2xl px-6 py-4 text-lg font-bold shadow-lg transition-transform hover:-translate-y-0.5 active:scale-95">
                 Create Account to View ₹5 Trial
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
