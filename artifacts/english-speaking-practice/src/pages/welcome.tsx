import { ArrowRight, Mic, Sparkles, BookOpen, Headphones } from 'lucide-react';
import { Link } from 'wouter';
import { useListPremiumPlans } from '@workspace/api-client-react';
import { planSavingsPercent } from '../lib/plan-savings';

const boxes = [
  { id: 'start_zero', label: 'Zero English / Start from Zero' },
  { id: 'advanced', label: 'Advanced English Coach' },
] as const;

const fallbackBoxPlans = {
  start_zero: [
    { id: 'monthly', amountPaise: 34900 },
    { id: 'quarterly', amountPaise: 89900 },
    { id: 'yearly', amountPaise: 299900, bestValue: true },
  ],
  advanced: [
    { id: 'monthly', amountPaise: 39900 },
    { id: 'quarterly', amountPaise: 99900 },
    { id: 'yearly', amountPaise: 349900, bestValue: true },
  ],
};

export function Welcome() {
  const { data } = useListPremiumPlans();
  const boxPlans = (data as any)?.boxPlans || fallbackBoxPlans;

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
              Choose your path to English fluency. Pay ₹5 once for 2 days of access to both learning boxes. Trial checkout opens after payment setup.
            </p>

            <Link href="/sign-up?redirect_url=/pricing" className="brand-gradient-button mx-auto mt-7 flex w-full max-w-xl flex-col items-center justify-center rounded-2xl px-6 py-4 shadow-lg transition-all hover:-translate-y-0.5">
              <span className="text-lg font-extrabold md:text-xl">Create Account &amp; View ₹5 Trial</span>
              <span className="mt-1 text-base font-semibold opacity-90">2 days · both learning boxes · payment currently unavailable</span>
            </Link>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Link href="/start-from-zero" className="group flex min-h-[16rem] w-full flex-col items-center justify-center rounded-3xl border-2 border-primary/20 bg-background p-6 text-center shadow-md transition-all hover:-translate-y-1 hover:border-primary hover:shadow-lg">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Headphones size={31} strokeWidth={2.5} />
              </div>
              <h2 className="mt-4 text-2xl font-extrabold">Zero English / Start from Zero</h2>
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
              <p className="mt-2 text-lg font-medium text-muted-foreground">Each box has its own subscription and prices. Choose the one that fits you best.</p>
            </div>
            <div className="space-y-7 text-left">
              {boxes.map((box) => (
                <div key={box.id}>
                  <h3 className="mb-3 text-center text-xl font-bold">{box.label}</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    {(boxPlans[box.id] || []).map((plan: any) => (
                      <div key={plan.id} className={`rounded-2xl border p-5 ${plan.bestValue ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}>
                        {plan.bestValue && <p className="mb-2 text-sm font-bold uppercase tracking-wide text-primary">Best value</p>}
                        <h3 className="text-xl font-bold capitalize">{plan.id}</h3>
                        <p className="mt-3 text-3xl font-bold">
                          ₹{(plan.amountPaise / 100).toLocaleString('en-IN')}
                          {plan.id !== 'monthly' && <span className="text-base"> · Save {planSavingsPercent(
                            boxPlans[box.id].find((item: any) => item.id === 'monthly').amountPaise,
                            plan.amountPaise,
                            plan.id === 'quarterly' ? 3 : 12
                          )}%</span>}
                        </p>
                        <p className="mt-1 text-base font-semibold text-muted-foreground">{plan.id === 'monthly' ? 'per month' : plan.id === 'quarterly' ? 'every 3 months' : 'every 12 months'}</p>
                        <p className="mt-5 text-sm font-medium text-foreground">Full Premium access to {box.label}.</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-secondary/20 bg-secondary/5 px-5 py-4 text-center text-foreground">
            <p className="text-base font-bold md:text-lg">The 2-day trial costs ₹5. It does not automatically start a subscription. Payments are not available yet.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
