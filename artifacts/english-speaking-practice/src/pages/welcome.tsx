import { ArrowRight, Mic, Sparkles, BookOpen, Headphones } from 'lucide-react';
import { Link } from 'wouter';
import { useListPremiumPlans } from '@workspace/api-client-react';

const fallbackPlans = [
  { id: 'monthly', label: 'Monthly', price: '₹349', detail: 'per month' },
  { id: 'quarterly', label: 'Quarterly', price: '₹899', detail: 'every 3 months · Save 14%' },
  { id: 'yearly', label: 'Yearly', price: '₹2,999', detail: 'every 12 months · Save 37%' },
];

function planInfo(plan: { id: string; label?: string }) {
  if (plan.id === 'monthly') return { ...plan, label: 'Monthly', price: '₹349', detail: 'per month' };
  if (plan.id === 'quarterly') return { ...plan, label: 'Quarterly', price: '₹899', detail: 'every 3 months · Save 14%' };
  return { ...plan, label: 'Yearly', price: '₹2,999', detail: 'every 12 months · Save 37%', bestValue: true };
}

export function Welcome() {
  const { data } = useListPremiumPlans();
  const plans = ((data as any)?.plans?.length ? (data as any).plans.map(planInfo) : fallbackPlans);

  return (
    <main className="practice-page min-h-[100dvh] px-5 py-8 md:px-10 md:py-12">
      <section className="mx-auto max-w-5xl">
        <div className="rounded-[2rem] border border-border/70 bg-card p-6 shadow-xl md:p-10">
          <div className="text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
              <Sparkles size={17} /> Start with confidence
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Welcome to Rllora AI English Speaking!</h1>
            <p className="mt-4 text-lg text-muted-foreground md:text-xl">
              Choose your path to English fluency. Your free trial gives you access to both learning boxes for 2 days.
            </p>

            <Link href="/sign-up?redirect_url=/pricing" className="mx-auto mt-7 flex w-full max-w-xl flex-col items-center justify-center rounded-2xl bg-primary px-6 py-4 text-primary-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl">
              <span className="text-lg font-extrabold md:text-xl">Create Account &amp; Start Free Trial</span>
              <span className="mt-1 text-base font-semibold opacity-90">Get both learning boxes for 2 days</span>
            </Link>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Link href="/start-from-zero" className="group flex min-h-[16rem] w-full flex-col items-center justify-center rounded-3xl border-2 border-primary/20 bg-background p-6 text-center shadow-md transition-all hover:-translate-y-1 hover:border-primary hover:shadow-lg">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Headphones size={31} strokeWidth={2.5} />
              </div>
              <h2 className="mt-4 text-2xl font-extrabold">0 English / Start from Zero</h2>
              <p className="mt-2 text-base font-medium text-muted-foreground">Audio-first speaking and listening. Perfect for beginners who cannot read much English.</p>
              <span className="mt-5 inline-flex items-center gap-2 font-bold text-primary">Explore Beginners <ArrowRight size={18} /></span>
            </Link>

            <Link href="/advanced" className="group flex min-h-[16rem] w-full flex-col items-center justify-center rounded-3xl border-2 border-secondary/20 bg-background p-6 text-center shadow-md transition-all hover:-translate-y-1 hover:border-secondary hover:shadow-lg">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                <BookOpen size={31} strokeWidth={2.5} />
              </div>
              <h2 className="mt-4 text-2xl font-extrabold">Advanced English Coach</h2>
              <p className="mt-2 text-base font-medium text-muted-foreground">Text-supported speaking, real-world roleplays, translations, and deep corrections.</p>
              <span className="mt-5 inline-flex items-center gap-2 font-bold text-secondary">Explore Advanced <ArrowRight size={18} /></span>
            </Link>
          </div>

          <div className="mt-12 border-t border-border pt-8 text-center">
            <div className="mb-8">
              <h2 className="text-2xl font-bold">What happens after your 2-day trial?</h2>
              <p className="mt-2 text-lg font-medium text-muted-foreground">Each box has its own subscription. Choose the one that fits you best.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3 text-left">
              {plans.map((plan: any) => (
                <div key={plan.id} className={`rounded-2xl border p-5 ${plan.bestValue ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}>
                  {plan.bestValue && <p className="mb-2 text-sm font-bold uppercase tracking-wide text-primary">Best value</p>}
                  <h3 className="text-xl font-bold">{plan.label}</h3>
                  <p className="mt-3 text-3xl font-bold">{plan.price}</p>
                  <p className="mt-1 text-base font-semibold text-muted-foreground">{plan.detail}</p>
                  <p className="mt-5 text-sm font-medium text-foreground">Full Premium access to your chosen learning box.</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-center text-amber-950 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-200">
            <p className="min-w-max text-base font-bold md:text-lg">If not satisfied, cancel before trial ends to avoid auto-payment.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
