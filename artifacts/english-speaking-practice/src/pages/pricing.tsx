import { useState, useEffect } from 'react';
import { useListPremiumPlans, useListPaymentOptions, useCreatePremiumCheckout, useGetCurrentSubscription, useCancelCurrentSubscription } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Sparkles, Check, Loader2, AlertCircle, ShieldCheck, Globe, LogOut } from 'lucide-react';

const FEATURES = [
  'Expanded text chat limits',
  '15 minutes of premium voice practice daily',
  'Real-world roleplay scenarios',
  'Guided 10-15 min daily lessons',
  'Detailed pronunciation feedback',
  'Advanced grammar corrections',
  'Weekly progress reports',
];

export function Pricing() {
  const [selectedCountry, setSelectedCountry] = useState<string>('IN');

  useEffect(() => {
    try {
      const isIndia = Intl.DateTimeFormat().resolvedOptions().timeZone.includes('Kolkata') || navigator.language.includes('IN');
      if (!isIndia) setSelectedCountry('OTHER');
    } catch {
      // Ignore
    }
  }, []);

  const { data: plansData, isLoading: loadingPlans } = useListPremiumPlans();
  const { data: paymentOptionsData, isLoading: loadingOptions } = useListPaymentOptions({ country: selectedCountry });
  const { data: subData, isLoading: loadingSub } = useGetCurrentSubscription();
  const checkout = useCreatePremiumCheckout();
  const cancelSub = useCancelCurrentSubscription();
  const queryClient = useQueryClient();

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'quarterly' | 'yearly'>('yearly');
  const [selectedProvider, setSelectedProvider] = useState<'stripe' | 'razorpay' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const plans = (plansData as any)?.plans || [];
  const paymentOptions = (paymentOptionsData as any)?.options || [];

  const trialText = (plansData as any)?.trial || "₹5 for 2-Day Premium Trial — Get full Premium access for 2 days for ₹5. You can cancel anytime during the trial, or continue with Premium after.";

  const subscription = subData as any;
  const isSubscribed = subscription && ['active', 'trialing', 'cancel_pending'].includes(subscription.status);

  const handleCheckout = () => {
    if (!selectedProvider || !selectedPlan) {
      setError('Please select a payment method.');
      return;
    }
    
    setError(null);
    checkout.mutate({ data: { plan: selectedPlan, provider: selectedProvider } } as any, {
      onSuccess: (data: any) => {
        if (data && data.checkoutUrl) {
           window.location.href = data.checkoutUrl;
        } else {
           setError('Checkout redirect failed: Provider integration not fully configured.');
        }
      },
      onError: (err: any) => {
        // preserve the honest 503 config errors from backend
        setError(err.message || 'An error occurred during checkout setup.');
      }
    });
  };

  const handleCancel = () => {
    setError(null);
    cancelSub.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/session'] });
        queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
        setShowCancelConfirm(false);
      },
      onError: (err: any) => {
        setError(err.message || 'An error occurred while cancelling your subscription.');
      }
    });
  };

  return (
    <div className="flex min-h-full flex-col px-4 py-8 md:px-10 max-w-5xl mx-auto w-full">
      <div className="text-center mb-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/20 text-accent-foreground mb-6">
          <Sparkles size={28} />
        </div>
        <h1 className="font-serif text-4xl font-medium tracking-tight mb-4">Rllora Pro</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          {trialText}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Features & Plans */}
        <div className="flex flex-col gap-8">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-4">Select a plan</h3>
            <div className="space-y-3">
              {plans.map((plan: any) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative flex w-full flex-col justify-center rounded-2xl border p-4 transition-all ${
                    selectedPlan === plan.id 
                      ? 'border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary))]' 
                      : 'border-border bg-transparent hover:bg-muted/50'
                  }`}
                >
                  {plan.bestValue && (
                    <span className="absolute -top-3 left-4 rounded-full bg-accent px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground shadow-sm">
                      Best Value
                    </span>
                  )}
                  <div className="flex items-center gap-3 w-full">
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      selectedPlan === plan.id ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'
                    }`}>
                      {selectedPlan === plan.id && <Check size={12} />}
                    </div>
                    <span className="font-medium text-left text-sm">{plan.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-4">What's included</h3>
            <ul className="space-y-3">
              {FEATURES.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                    <Check size={10} strokeWidth={3} />
                  </div>
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Payment */}
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sticky top-6">
            {loadingSub ? (
              <div className="flex justify-center p-8">
                <Loader2 size={32} className="animate-spin text-primary" />
              </div>
            ) : isSubscribed ? (
              <div>
                <h3 className="font-semibold text-lg mb-6">Manage Subscription</h3>
                <div className="rounded-2xl bg-secondary/50 p-5 mb-6">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                    <span className="text-sm font-medium text-muted-foreground">Current Plan</span>
                    <span className="font-semibold capitalize text-foreground">{subscription.plan || 'Premium'}</span>
                  </div>
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                    <span className="text-sm font-medium text-muted-foreground">Status</span>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${subscription.cancelPending ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <span className="font-medium text-sm text-foreground capitalize">
                        {subscription.cancelPending ? 'Cancels at Period End' : subscription.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      {subscription.status === 'trialing' ? 'Trial Ends' : 'Renews On'}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {new Date(subscription.status === 'trialing' ? subscription.trialEndsAt : subscription.currentPeriodEndsAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {subscription.cancelPending ? (
                  <div className="rounded-xl bg-amber-500/10 p-4 text-center">
                    <p className="text-sm text-amber-700 font-medium">Your subscription is scheduled to cancel.</p>
                    <p className="text-xs text-amber-600 mt-1">You will retain access until the current period ends.</p>
                  </div>
                ) : showCancelConfirm ? (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 animate-in slide-in-from-top-2">
                    <h4 className="font-medium text-destructive mb-2">Cancel subscription?</h4>
                    <p className="text-sm text-destructive/80 mb-4">
                      Are you sure you want to cancel? You will keep premium access until the end of your current period.
                    </p>
                    
                    {error && (
                      <div className="mb-4 flex items-start gap-2 rounded-xl bg-destructive/20 px-4 py-3 text-sm text-destructive">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <p>{error}</p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowCancelConfirm(false)}
                        disabled={cancelSub.isPending}
                        className="flex-1 rounded-xl bg-background px-4 py-2.5 text-sm font-medium text-foreground border border-border hover:bg-secondary transition-colors disabled:opacity-50"
                      >
                        Keep It
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={cancelSub.isPending}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground shadow-sm hover:bg-destructive/90 transition-colors disabled:opacity-50"
                      >
                        {cancelSub.isPending ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                        Confirm Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    Cancel Renewal
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Payment Method</h3>
                  <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-1.5 border border-border">
                    <Globe size={14} className="text-muted-foreground" />
                    <select
                      value={selectedCountry}
                      onChange={(e) => {
                        setSelectedCountry(e.target.value);
                        setSelectedProvider(null);
                      }}
                      className="bg-transparent text-xs font-medium text-foreground outline-none cursor-pointer"
                    >
                      <option value="IN">India</option>
                      <option value="AE">Gulf / Middle East</option>
                      <option value="EU">Europe</option>
                      <option value="OTHER">Other Region</option>
                    </select>
                  </div>
                </div>
                
                {loadingOptions || loadingPlans ? (
                  <div className="flex justify-center p-4">
                    <Loader2 size={24} className="animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-3 mb-8">
                    {paymentOptions.map((opt: any) => (
                      <button
                        key={opt.id}
                        onClick={() => setSelectedProvider(opt.provider)}
                        className={`flex w-full items-center justify-between rounded-2xl border p-4 transition-all ${
                          selectedProvider === opt.provider 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border bg-transparent hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-4 w-4 shrink-0 rounded-full border ${
                            selectedProvider === opt.provider ? 'border-[4px] border-primary' : 'border-muted-foreground/40'
                          }`} />
                          <div className="text-left">
                            <p className="font-medium text-sm">{opt.label}</p>
                            {!opt.available && (
                              <p className="text-[10px] text-destructive mt-0.5">Currently unavailable</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="border-t border-border pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Today's total</span>
                    <span className="font-serif text-2xl font-medium">₹5</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-6">
                    After your trial, you will be charged the {selectedPlan} rate. Cancel anytime.
                  </p>

                  {error && (
                    <div className="mb-6 flex items-start gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleCheckout}
                    disabled={checkout.isPending || !selectedProvider}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-sm font-semibold text-primary-foreground shadow-[0_4px_14px_hsl(var(--primary)/.25)] hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkout.isPending && <Loader2 size={16} className="animate-spin" />}
                    Start Trial for ₹5
                  </button>
                  
                  <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
                    <ShieldCheck size={14} /> Secure, encrypted checkout
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
