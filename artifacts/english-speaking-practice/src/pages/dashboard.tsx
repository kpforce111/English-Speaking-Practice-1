import { Link } from 'wouter';
import { BarChart2, GraduationCap, Languages, MessageCircle, Mic, Users } from 'lucide-react';

const options = [
  { href: '/chat', label: 'Chat', description: 'Talk with Mira', icon: MessageCircle, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  { href: '/voice', label: 'Voice', description: 'Speak naturally', icon: Mic, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { href: '/translate', label: 'Translate', description: 'Understand clearly', icon: Languages, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  { href: '/roleplays', label: 'Roleplays', description: 'Practice real life', icon: Users, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  { href: '/lessons', label: 'Lessons', description: 'Build every day', icon: GraduationCap, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  { href: '/progress', label: 'Progress', description: 'See your growth', icon: BarChart2, color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' },
];

export function Dashboard() {
  return (
    <main className="practice-page min-h-[100dvh] px-5 pb-12 pt-12 md:px-10 md:pt-18">
      <section className="mx-auto max-w-4xl">
        <div className="mb-10 max-w-xl">
          <p className="mb-3 text-base font-bold uppercase tracking-[0.14em] text-primary">Your practice space</p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Choose how you want to grow today.</h1>
          <p className="mt-3 text-lg font-medium leading-relaxed text-muted-foreground">Start a conversation, improve your pronunciation, or build confidence for real-life English.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
          {options.map(({ href, label, description, icon: Icon, color }) => (
            <Link key={href} href={href} className="group flex min-h-48 flex-col rounded-3xl border border-border/70 bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-lg md:min-h-56 md:p-7">
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${color}`}><Icon size={30} strokeWidth={2.35} /></div>
              <div className="mt-auto pt-6">
                <h2 className="text-xl font-bold">{label}</h2>
                <p className="mt-1 text-base font-medium text-muted-foreground">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}