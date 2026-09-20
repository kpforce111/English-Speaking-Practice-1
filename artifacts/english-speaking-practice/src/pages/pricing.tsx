import { useState, useEffect } from 'react';
import { useListPremiumPlans, useListPaymentOptions, useCreatePremiumCheckout, useGetCurrentSubscription, useCancelCurrentSubscription } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Sparkles, Check, Loader2, AlertCircle, ShieldCheck, Globe, LogOut } from 'lucide-react';

type RazorpayCheckoutData = {
  keyId: string;
  trialOrderId: string;
  trialAmountPaise: number;
};

type RazorpayInstance = { open: () => void; on: (event: string, handler: (response: unknown) => void) => void };
type RazorpayOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  handler: () => void;
  modal: { ondismiss: () => void };
  theme: { color: string };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const loadRazorpay = (): Promise<void> => {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Razorpay checkout could not be loaded.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Razorpay checkout could not be loaded.'));
    document.head.appendChild(script);
  });
};

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

  const trialText = (plansData as any)?.trial || "Create your account for just ₹5 and get a 2-day free trial.";

  const subscription = subData as any;
  const isSubscribed = subscription && ['active', 'trialing', 'cancel_pending'].includes(subscription.status);

  const handleCheckout = () => {
    if (!selectedProvider || !selectedPlan) {
      setError('Please select a payment method.');
      return;
    }
    
    setError(null);
     checkout.mutate({ plan: selectedPlan, provider: selectedProvider, country: selectedCountry }, {
      onSuccess: (data: any) => {
         if (selectedProvider === 'stripe' && data?.checkoutUrl) {
           window.location.href = data.checkoutUrl;
           return;
         }
         if (selectedProvider !== 'razorpay') {
           setError('Checkout redirect failed: Provider integration not fully configured.');
           return;
         }
         const razorpayData = data as RazorpayCheckoutData;
         if (!razorpayData?.keyId || !razorpayData.trialOrderId || razorpayData.trialAmountPaise !== 500) {
           setError('Razorpay checkout did not return valid payment details.');
           return;
         }
         loadRazorpay().then(() => {
           if (!window.Razorpay) throw new Error('Razorpay checkout is unavailable.');
           const razorpay = new window.Razorpay({
             key: razorpayData.keyId,
             order_id: razorpayData.trialOrderId,
             amount: 500,
             currency: 'INR',
             name: 'Rllora AI',
             description: '₹5 2-Day Premium Trial',
             handler: () => {
               setError('Payment submitted. Premium access will appear after Razorpay confirms the payment.');
               queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
             },
             modal: {
               ondismiss: () => setError('Payment was cancelled. No Premium access was granted.'),
             },
             theme: { color: '#7a3fc5' },
           });
           razorpay.on('payment.failed', () => {
             setError('Payment failed. No Premium access was granted. Please try again or use another payment method.');
           });
           razorpay.open();
         }).catch((err: Error) => setError(err.message || 'Unable to open Razorpay checkout.'));
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
        <h1 className="text-[18px] md:text-[20px] font-semibold tracking-tight mb-4">Rllora Pro</h1>
        <p className="text-[15px] leading-[1.6] text-muted-foreground max-w-md mx-auto">
          {trialText}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Features & Plans */}
        <div className="flex flex-col gap-8">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="font-semibold text-[16px] mb-4">Select a plan</h3>
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
                    <span className="absolute -top-3 left-4 rounded-full bg-accent px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent-foreground shadow-sm">
                      Best Value
                    </span>
                  )}
                  <div className="flex items-center gap-3 w-full">
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      selectedPlan === plan.id ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'
                    }`}>
                      {selectedPlan === plan.id && <Check size={12} />}
                    </div>
                    <span className="font-medium text-left text-[14px]">{plan.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="font-semibold text-[16px] mb-4">What's included</h3>
            <ul className="space-y-3">
              {FEATURES.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-[14px] font-medium text-foreground">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span>{feature}</span>
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
                <h3 className="font-semibold text-[16px] mb-6">Manage Subscription</h3>
                <div className="rounded-2xl bg-secondary/50 p-5 mb-6">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                    <span className="text-[14px] font-medium text-muted-foreground">Current Plan</span>
                    <span className="font-semibold capitalize text-[14px] text-foreground">{subscription.plan || 'Premium'}</span>
                  </div>
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                    <span className="text-[14px] font-medium text-muted-foreground">Status</span>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${subscription.cancelPending ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <span className="font-medium text-[14px] text-foreground capitalize">
                        {subscription.cancelPending ? 'Cancels at Period End' : subscription.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-medium text-muted-foreground">
                      {subscription.status === 'trialing' ? 'Trial Ends' : 'Renews On'}
                    </span>
                    <span className="text-[14px] font-medium text-foreground">
                      {new Date(subscription.status === 'trialing' ? subscription.trialEndsAt : subscription.currentPeriodEndsAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {subscription.cancelPending ? (
                  <div className="rounded-xl bg-amber-500/10 p-4 text-center">
                    <p className="text-[14px] text-amber-700 font-medium">Your subscription is scheduled to cancel.</p>
                    <p className="text-[13px] text-amber-600 mt-1">You will retain access until the current period ends.</p>
                  </div>
                ) : showCancelConfirm ? (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 animate-in slide-in-from-top-2">
                    <h4 className="font-medium text-[15px] text-destructive mb-2">Cancel subscription?</h4>
                    <p className="text-[14px] text-destructive/80 mb-4">
                      Are you sure you want to cancel? You will keep premium access until the end of your current period.
                    </p>
                    
                    {error && (
                      <div className="mb-4 flex items-start gap-2 rounded-xl bg-destructive/20 px-4 py-3 text-[14px] text-destructive">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <p>{error}</p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowCancelConfirm(false)}
                        disabled={cancelSub.isPending}
                        className="flex-1 rounded-xl bg-background px-4 py-2.5 text-[14px] font-medium text-foreground border border-border hover:bg-secondary transition-colors disabled:opacity-50"
                      >
                        Keep It
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={cancelSub.isPending}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-[14px] font-medium text-destructive-foreground shadow-sm hover:bg-destructive/90 transition-colors disabled:opacity-50"
                      >
                        {cancelSub.isPending ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                        Confirm Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-[14px] font-medium text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    Cancel Renewal
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[16px]">Payment Method</h3>
                  <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-1.5 border border-border">
                    <Globe size={14} className="text-muted-foreground" />
                    <select
                      value={selectedCountry}
                      onChange={(e) => {
                        setSelectedCountry(e.target.value);
                        setSelectedProvider(null);
                      }}
                      className="bg-transparent text-[13px] font-medium text-foreground outline-none cursor-pointer"
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
                            <p className="font-medium text-[14px]">{opt.label}</p>
                            {!opt.available && (
                              <p className="text-[11px] text-destructive mt-0.5">Currently unavailable</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="border-t border-border pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[14px] font-medium text-muted-foreground">Today's total</span>
                    <span className="font-semibold text-2xl">₹5</span>
                  </div>
                  <p className="text-[13px] text-muted-foreground mb-6">
                    After your 2-day trial, you will be charged the monthly rate. Cancel anytime.
                  </p>

                  {error && (
                    <div className="mb-6 flex items-start gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-[14px] text-destructive">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleCheckout}
                    disabled={checkout.isPending || !selectedProvider}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-[15px] font-medium text-primary-foreground shadow-[0_4px_14px_hsl(var(--primary)/.25)] hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkout.isPending && <Loader2 size={16} className="animate-spin" />}
                    Start 2-Day Free Trial – ₹5
                  </button>
                  
                  <div className="mt-4 flex items-center justify-center gap-1.5 text-[13px] font-medium text-muted-foreground/60">
                    <ShieldCheck size={16} /> Secure, encrypted checkout
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
