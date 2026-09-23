import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Home, LogIn, Menu, Settings, Sparkles, X, Headphones, BookOpen } from 'lucide-react';
import { Show, useUser } from '@clerk/react';
import { useGetPracticeSession } from '@workspace/api-client-react';
import rlloraLogo from '@assets/IMG-20260917-WA0002_1789621084381.jpg';

const navItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/start-from-zero', label: 'Zero English', icon: Headphones },
  { href: '/advanced', label: 'Advanced Coach', icon: BookOpen },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { data: sessionData } = useGetPracticeSession();
  const { user } = useUser();
  const isPremium = (sessionData as any)?.plan === 'premium';
  const close = () => setIsOpen(false);

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border/70 bg-card/95 px-4 backdrop-blur md:px-7">
        <Link href="/home" className="flex items-center gap-3" aria-label="Go to Rllora home">
          <img src={rlloraLogo} alt="" className="h-12 w-12 rounded-xl object-cover shadow-sm" />
          <div className="leading-tight"><p className="text-lg font-bold">Rllora AI</p><p className="text-sm font-semibold text-muted-foreground">Speak · Learn · Grow</p></div>
        </Link>
        <button type="button" onClick={() => setIsOpen(true)} aria-label="Open navigation menu" className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-secondary">
          <Menu size={24} />
        </button>
      </header>

      {isOpen && (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Close navigation menu" onClick={close} className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" />
          <aside className="relative flex h-full w-[min(21rem,88vw)] flex-col border-r border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-5">
              <Link href="/home" onClick={close} className="flex items-center gap-3">
                <img src={rlloraLogo} alt="Rllora AI logo" className="h-12 w-12 rounded-xl object-cover" />
                <div><p className="text-lg font-bold">Rllora AI</p><p className="text-sm font-semibold text-muted-foreground">Speak · Learn · Grow</p></div>
              </Link>
              <button type="button" onClick={close} aria-label="Close navigation menu" className="rounded-xl p-3 hover:bg-secondary"><X size={22} /></button>
            </div>
            <nav className="mt-6 space-y-2">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={close} className={`flex items-center gap-4 rounded-2xl px-4 py-3.5 text-lg font-bold transition-colors ${location === href ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary'}`}>
                  <Icon size={21} /> {label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto space-y-3 border-t border-border pt-5">
              <Show when="signed-in"><Link href="/settings" onClick={close} className="flex items-center gap-4 rounded-2xl px-4 py-3 text-base font-bold hover:bg-secondary"><Settings size={20} /> {user?.firstName || 'Settings'}</Link></Show>
              <Show when="signed-out"><Link href="/sign-in" onClick={close} className="flex items-center gap-4 rounded-2xl px-4 py-3 text-base font-bold hover:bg-secondary"><LogIn size={20} /> Sign in to sync</Link></Show>
              {!isPremium && <><Show when="signed-in"><Link href="/pricing" onClick={close} className="brand-gradient-button flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-base font-bold"><Sparkles size={18} /> ₹5 · 2-Day Trial</Link></Show><Show when="signed-out"><Link href="/sign-up?redirect_url=/pricing" onClick={close} className="brand-gradient-button flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-base font-bold"><Sparkles size={18} /> ₹5 · 2-Day Trial</Link></Show></>}
              <div className="flex flex-wrap gap-x-4 gap-y-2 px-2 pt-2 text-sm font-semibold text-muted-foreground"><Link href="/about" onClick={close}>About</Link><Link href="/privacy" onClick={close}>Privacy</Link><Link href="/terms" onClick={close}>Terms</Link><Link href="/refund" onClick={close}>Refunds</Link><Link href="/support" onClick={close}>Support</Link></div>
            </div>
          </aside>
        </div>
      )}
      {children}
    </div>
  );
}