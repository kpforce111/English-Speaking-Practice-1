import { Link } from 'wouter';
import { ArrowRight, Mic } from 'lucide-react';

export function Dashboard() {
  return (
    <main className="practice-page min-h-[100dvh] px-5 pb-12 pt-12 md:px-10 md:pt-18">
      <section className="mx-auto max-w-4xl">
        <div className="mb-10 max-w-xl">
          <p className="mb-3 text-base font-bold uppercase tracking-[0.14em] text-primary">Your practice space</p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Ready to practice English?</h1>
          <p className="mt-3 text-lg font-medium leading-relaxed text-muted-foreground">Speak naturally, get a gentle correction, and repeat with confidence.</p>
        </div>
        <Link href="/voice" className="group flex min-h-64 w-full flex-col items-center justify-center rounded-[2rem] border border-primary/20 bg-card p-8 text-center shadow-lg transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl md:min-h-72">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"><Mic size={38} strokeWidth={2.5} /></div>
          <h2 className="mt-6 text-2xl font-extrabold md:text-3xl">Start speaking practice</h2>
          <p className="mt-2 text-lg font-semibold text-muted-foreground">Speak → Correct → Repeat</p>
          <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-bold text-primary-foreground">Start now <ArrowRight size={19} /></span>
        </Link>
      </section>
    </main>
  );
}