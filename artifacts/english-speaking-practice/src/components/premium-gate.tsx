import { Link } from 'wouter';
import { Lock, Sparkles } from 'lucide-react';
import { useGetPracticeSession } from '@workspace/api-client-react';
import { useUser } from '@clerk/react';

export function PremiumGate({ children, featureName = "This feature" }: { children: React.ReactNode, featureName?: string }) {
  const { data: sessionData, isLoading } = useGetPracticeSession();
  const { user, isLoaded } = useUser();
  
  // Cast for untyped generated schema
  const plan = (sessionData as any)?.plan || 'free';
  const isPremium = plan === 'premium';

  if (isLoading || !isLoaded) {
    return (
      <div className="flex h-full min-h-[50vh] flex-col items-center justify-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-accent/10 text-accent-foreground shadow-sm">
        <Lock size={32} strokeWidth={2} />
      </div>
      <h2 className="mb-2 text-[18px] md:text-[20px] font-semibold tracking-tight text-foreground">{featureName} is Premium</h2>
      <p className="mb-8 max-w-md text-[15px] leading-[1.6] text-muted-foreground">
        Upgrade to Rllora Pro to unlock 15 minutes of premium voice practice daily, real-world roleplays, guided lessons, and detailed pronunciation feedback.
      </p>
      <Link
        href={user ? "/pricing" : "/sign-up?redirect_url=/pricing"}
        className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-[14px] font-medium text-accent-foreground shadow-md transition-all hover:scale-[1.02] active:scale-95"
      >
        <Sparkles size={18} />
        Start Free 2-Day Trial
      </Link>
    </div>
  );
}
