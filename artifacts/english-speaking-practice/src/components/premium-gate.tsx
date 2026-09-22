import { useGetCurrentSubscription } from '@workspace/api-client-react';
import { TrialAccessPanel } from '@/components/trial-access-panel';

export function PremiumGate({ children, featureName, productId }: { children: React.ReactNode, featureName?: string, productId: 'advanced' | 'start_zero' }) {
  const { data: subData, isLoading, isError, error } = useGetCurrentSubscription({ query: {
    retry: (failureCount, err) => {
      if ((err as any)?.status === 401) return false;
      return failureCount < 3;
    }
  }});
  
  if (isLoading) {
    return (
      <div className="flex h-full min-h-[50vh] flex-col items-center justify-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const subscriptions = (subData as any)?.subscriptions || [];
  const activeSub = subscriptions.find((sub: any) => sub.boxId === productId);
  const hasAccess = activeSub && ['active', 'trialing', 'cancel_pending'].includes(activeSub.status);

  if (!hasAccess || (isError && (error as any)?.status === 401)) {
    return (
      <div className="flex h-full min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <TrialAccessPanel boxName={featureName || (productId === 'advanced' ? "Advanced English Coach" : "0 English / Start from Zero")} />
      </div>
    );
  }

  return <>{children}</>;
}
