import { BarChart2, GraduationCap, Languages, MessageCircle, Mic, Sparkles, Users } from 'lucide-react';
import { Link } from 'wouter';
import { useListPremiumPlans } from '@workspace/api-client-react';

const fallbackPlans = [
  { id: 'monthly', label: 'Monthly', price: '₹399', detail: 'per month' },
  { id: 'quarterly', label: 'Quarterly', price: '₹999', detail: 'every 3 months · Save 17%' },
  { id: 'yearly', label: 'Yearly', price: '₹2,999', detail: 'every 12 months · Save 37%' },
];

const features = [
  { href: '/chat', label: 'Chat', description: 'Talk with Mira', icon: MessageCircle },
  { href: '/voice', label: 'Voice', description: 'Speak naturally', icon: Mic },
  { href: '/translate', label: 'Translate', description: 'Understand clearly', icon: Languages },
  { href: '/roleplays', label: 'Roleplays', description: 'Practice real life', icon: Users },
  { href: '/lessons', label: 'Lessons', description: 'Build every day', icon: GraduationCap },
  { href: '/progress', label: 'Progress', description: 'See your growth', icon: BarChart2 },
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
    <main className="practice-page min-h-[100dvh] px-5 py-8 md:px-10 md:py-12">
      <section className="mx-auto max-w-5xl">
        <div className="rounded-[2rem] border border-border/70 bg-card p-6 shadow-xl md:p-10">
          <div className="text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary"><Sparkles size={17} /> Start with confidence</div>
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Welcome to Rllora AI English Speaking!</h1>
            <Link href="/sign-up?redirect_url=/pricing" className="mx-auto mt-7 flex w-full max-w-xl flex-col items-center justify-center rounded-2xl bg-purple-600 px-6 py-4 text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-purple-700">
              <span className="text-lg font-extrabold md:text-xl">Create Account &amp; Start Free Trial – ₹5</span>
              <span className="mt-1 text-base font-semibold text-purple-100">Get full access for 2 days</span>
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5">
            {features.map(({ href, label, description, icon: Icon }) => (
              <Link key={href} href={href} className="flex min-h-44 flex-col items-center justify-center rounded-3xl border border-border bg-background p-5 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-md">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                  <Icon size={31} strokeWidth={2.5} />
                </div>
                <h2 className="mt-4 text-xl font-extrabold md:text-2xl">{label}</h2>
                <p className="mt-1 text-base font-semibold text-muted-foreground md:text-lg">{description}</p>
              </Link>
            ))}
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
          <div className="mt-8 overflow-x-auto rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-center text-amber-950">
            <p className="min-w-max text-base font-bold md:text-lg">If not satisfied, cancel it to avoid auto-payment.</p>
          </div>
        </div>
      </section>
    </main>
  );
}