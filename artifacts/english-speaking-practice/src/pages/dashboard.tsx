import { Link } from 'wouter';
import { ArrowRight, BookOpen, Headphones } from 'lucide-react';

export function Dashboard() {
  return (
    <main className="practice-page min-h-[100dvh] px-5 pb-12 pt-12 md:px-10 md:pt-18">
      <section className="mx-auto max-w-4xl text-center">
        <div className="mb-10">
          <p className="mb-3 text-base font-bold uppercase tracking-[0.14em] text-primary">Your practice space</p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Choose Your Learning Box</h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg font-medium leading-relaxed text-muted-foreground">
            Continue where you left off. Choose your path to practice today.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 text-left">
          <Link href="/start-from-zero" className="group flex flex-col justify-between min-h-[18rem] rounded-[2rem] border-2 border-primary/20 bg-card p-8 shadow-lg transition-all hover:-translate-y-1 hover:border-primary hover:shadow-xl">
            <div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Headphones size={32} strokeWidth={2.5} />
              </div>
              <h2 className="mt-6 text-2xl font-extrabold md:text-3xl">0 English / Start from Zero</h2>
              <p className="mt-3 text-base font-medium leading-relaxed text-muted-foreground">
                Audio-first practice for beginners. Listen, understand, speak, and improve.
              </p>
            </div>
            <span className="mt-8 inline-flex items-center gap-2 font-bold text-primary">
              Start Today's Practice <ArrowRight size={19} />
            </span>
          </Link>

          <Link href="/advanced" className="group flex flex-col justify-between min-h-[18rem] rounded-[2rem] border-2 border-secondary/20 bg-card p-8 shadow-lg transition-all hover:-translate-y-1 hover:border-secondary hover:shadow-xl">
            <div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                <BookOpen size={32} strokeWidth={2.5} />
              </div>
              <h2 className="mt-6 text-2xl font-extrabold md:text-3xl">Advanced English Coach</h2>
              <p className="mt-3 text-base font-medium leading-relaxed text-muted-foreground">
                Text-supported speaking, roleplays, translation, and grammar corrections.
              </p>
            </div>
            <span className="mt-8 inline-flex items-center gap-2 font-bold text-secondary">
              Open Advanced Coach <ArrowRight size={19} />
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
