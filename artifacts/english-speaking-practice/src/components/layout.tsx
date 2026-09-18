import { Link, useLocation } from 'wouter';
import { 
  MessageCircle, 
  Mic, 
  Languages, 
  Users, 
  GraduationCap, 
  BarChart2, 
  Sparkles,
  Menu,
  X,
  Settings,
  LogIn
} from 'lucide-react';
import { useState } from 'react';
import { useGetPracticeSession } from '@workspace/api-client-react';
import { Show, useUser } from '@clerk/react';

const NAV_ITEMS = [
  { href: '/', label: 'Chat', icon: MessageCircle },
  { href: '/voice', label: 'Voice', icon: Mic },
  { href: '/translate', label: 'Translate', icon: Languages },
  { href: '/roleplays', label: 'Roleplays', icon: Users },
  { href: '/lessons', label: 'Lessons', icon: GraduationCap },
  { href: '/progress', label: 'Progress', icon: BarChart2 },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: sessionData } = useGetPracticeSession();
  const isPremium = (sessionData as any)?.plan === 'premium';
  const { user } = useUser();

  return (
    <div className="flex min-h-[100dvh] w-full flex-col md:flex-row bg-background">
      {/* Mobile Header */}
      <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-border/70 px-4 md:hidden bg-card z-30">
        <div className="flex items-center gap-2">
          <div className="brand-mark h-8 w-8 rounded-lg shadow-none">
            <MessageCircle size={16} strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-foreground tracking-tight">Rllora</span>
        </div>
        <div className="flex items-center gap-2">
          {!isPremium && (
            <Link href="/pricing" className="flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1.5 text-xs font-semibold text-accent-foreground">
              <Sparkles size={12} /> Pro
            </Link>
          )}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-[60px] z-20 bg-background md:hidden">
          <nav className="flex flex-col p-4 gap-2">
            {NAV_ITEMS.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  location === item.href 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-border/50" />
            <Show when="signed-in"><Link href="/settings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium"><Settings size={18} />Settings</Link></Show>
            <Show when="signed-out"><Link href="/sign-in" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium"><LogIn size={18} />Sign in to sync</Link></Show>
            <Link 
              href="/pricing" 
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-accent-foreground bg-accent/10"
            >
              <Sparkles size={18} />
              Upgrade to Premium
            </Link>
            <div className="mt-4 flex gap-4 px-4 text-xs text-muted-foreground/60">
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/support">Support</Link>
            </div>
          </nav>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-border/50 bg-card px-5 py-6 md:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="brand-mark h-9 w-9">
            <MessageCircle size={18} strokeWidth={2.5} />
          </div>
          <span className="font-serif text-xl tracking-tight">Rllora</span>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1.5">
          {NAV_ITEMS.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                location === item.href 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
              }`}
            >
              <item.icon size={18} className={location === item.href ? 'text-primary' : 'text-muted-foreground'} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <Show when="signed-in">
            <Link href="/settings" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary"><Settings size={18} /><span className="truncate">{user?.firstName || 'Settings'}</span></Link>
          </Show>
          <Show when="signed-out">
            <Link href="/sign-in" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-primary hover:bg-secondary"><LogIn size={18} />Sign in to sync</Link>
          </Show>
          {!isPremium && (
            <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
              <p className="text-xs font-semibold text-accent-foreground uppercase tracking-wider">Premium</p>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Unlock voice conversations, roleplays, and lessons.
              </p>
              <Link 
                href="/pricing" 
                className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-accent text-accent-foreground px-3 py-2 text-xs font-semibold shadow-sm hover:brightness-110 transition-all"
              >
                <Sparkles size={14} /> Upgrade
              </Link>
            </div>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1 px-2 text-[10px] text-muted-foreground/50">
            <Link href="/about" className="hover:text-muted-foreground">About</Link>
            <Link href="/privacy" className="hover:text-muted-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-muted-foreground">Terms</Link>
            <Link href="/support" className="hover:text-muted-foreground">Support</Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex min-w-0 flex-1 flex-col relative z-0">
        {children}
      </main>
    </div>
  );
}
