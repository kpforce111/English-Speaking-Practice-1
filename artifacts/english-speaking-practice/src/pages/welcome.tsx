import { Check, ChevronRight, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { useListPremiumPlans } from '@workspace/api-client-react';
import rlloraLogo from '@assets/IMG-20260917-WA0002_1789621084381.jpg';

const fallbackPlans = [
  { id: 'monthly', label: 'Monthly', price: '₹399', detail: 'per month' },
  { id: 'quarterly', label: 'Quarterly', price: '₹999', detail: 'every 3 months · Save 17%' },
  { id: 'yearly', label: 'Yearly', price: '₹2,999', detail: 'every 12 months · Save 37%' },
];

function planInfo(plan: { id: string; label?: string }) {
  if (plan.id === 'monthly') return { ...plan, label: 'Monthly', price: '₹399', detail: 'per month' };
  if (plan.id === 'quarterly') return { ...plan, label: 'Quarterly', price: '₹999', detail: 'every 3 months · Save 17%' };
  return { ...plan, label: 'Yearly', price: '₹2,999', detail: 'every 12 months · Save 37%', bestValue: true };
}

export function Welcome() {
  const { data } = useListPremiumPlans();
  const plans = ((data as any)?.plans?.length ? (data as any).plans.map(planInfo) : fallbackPlans);

  return (
    <main className="practice-page min-h-[100dvh] px-5 py-10 md:px-10 md:py-16">
      <section className="mx-auto max-w-5xl">
        <div className="mb-10 flex items-center gap-4">
          <img src={rlloraLogo} alt="Rllora AI — Speak, Learn, Grow" className="h-16 w-16 rounded-2xl object-cover shadow-lg" />
          <div><p className="text-2xl font-bold">Rllora AI</p><p className="text-base font-semibold text-muted-foreground">Speak · Learn · Grow</p></div>
        </div>
        <div className="rounded-[2rem] border border-border/70 bg-card p-6 shadow-xl md:p-10">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary"><Sparkles size={17} /> Start with confidence</div>
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Welcome to Rllora AI English Speaking!</h1>
            <p className="mt-5 text-xl font-semibold leading-relaxed">Create your account for just ₹5 and get a 2-day free trial.</p>
            <ul className="mt-7 grid gap-4 text-lg font-semibold leading-relaxed md:grid-cols-3">
              {['Full access to English speaking practice for 2 days', 'Continue your subscription if you like it', 'Cancel anytime before the trial ends if it’s not for you — no extra charges'].map((item) => (
                <li key={item} className="flex gap-3 rounded-2xl bg-secondary/55 p-4"><Check className="mt-1 shrink-0 text-primary" size={20} strokeWidth={3} /><span>{item}</span></li>
              ))}
            </ul>
          </div>
          <div className="mt-10 border-t border-border pt-8">
            <div className="mb-5"><h2 className="text-2xl font-bold">Choose what happens after your trial</h2><p className="mt-2 text-lg font-medium text-muted-foreground">Your ₹5 trial gives you Premium access for two days. If you continue, select the plan that fits you best.</p></div>
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((plan: any) => (
                <div key={plan.id} className={`rounded-2xl border p-5 ${plan.bestValue ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}>
                  {plan.bestValue && <p className="mb-2 text-sm font-bold uppercase tracking-wide text-primary">Best value</p>}
                  <h3 className="text-xl font-bold">{plan.label}</h3>
                  <p className="mt-3 text-3xl font-bold">{plan.price}</p>
                  <p className="mt-1 text-base font-semibold text-muted-foreground">{plan.detail}</p>
                  <p className="mt-5 text-base font-medium text-foreground">Full Premium access after your trial.</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/sign-up?redirect_url=/pricing" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-lg font-bold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5">Start 2-Day Free Trial – ₹5 <ChevronRight size={20} /></Link>
            <Link href="/home" className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-6 py-4 text-lg font-bold text-foreground hover:bg-secondary">Explore Rllora first</Link>
          </div>
        </div>
      </section>
    </main>
  );
}