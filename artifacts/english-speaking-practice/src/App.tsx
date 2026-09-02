import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSendChatMessage, type ChatMessage } from '@workspace/api-client-react';
import {
  BookOpen,
  Check,
  ChevronRight,
  Info,
  Lightbulb,
  MessageCircle,
  RotateCcw,
  SendHorizontal,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
const STORAGE_KEY = 'english-speaking-practice-session';

const firstMessage: ChatMessage = {
  role: 'assistant',
  content: 'Hi, I’m Mira. Take your time — what has been on your mind today?',
};

const starterPrompts = [
  'Tell me about your morning',
  'I want to talk about food',
  'Help me practice for work',
];

function getRequestErrorMessage(requestError: unknown): string {
  if (requestError && typeof requestError === 'object' && 'data' in requestError) {
    const data = (requestError as { data?: unknown }).data;
    if (data && typeof data === 'object' && 'error' in data) {
      const message = (data as { error?: unknown }).error;
      if (typeof message === 'string') return message;
    }
  }
  return 'I couldn’t hear that clearly. Your sentence is still here — try sending it again.';
}

function getSavedMessages(): ChatMessage[] {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return [firstMessage];
    const parsed = JSON.parse(saved) as ChatMessage[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [firstMessage];
  } catch {
    return [firstMessage];
  }
}

function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>(getSavedMessages);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const scrollAnchor = useRef<HTMLDivElement>(null);
  const sendChatMessage = useSendChatMessage();

  const practiceCount = useMemo(
    () => messages.filter((message) => message.role === 'user').length,
    [messages],
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    scrollAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sendChatMessage.isPending]);

  const sendToPartner = (message: string, isRetry = false) => {
    const trimmed = message.trim();
    if (!trimmed || sendChatMessage.isPending) return;
    setError(null);
    const historyForRequest = isRetry ? messages.slice(0, -1) : messages;
    const nextMessages = isRetry
      ? messages
      : [...messages, { role: 'user', content: trimmed } satisfies ChatMessage];

    if (!isRetry) {
      setMessages(nextMessages);
      setDraft('');
    }

    sendChatMessage.mutate(
      { data: { message: trimmed, history: historyForRequest } },
      {
        onSuccess: (response) => {
          setMessages((current) => [
            ...current,
            { role: 'assistant', content: response.reply },
          ]);
        },
        onError: (requestError) => {
          setError(getRequestErrorMessage(requestError));
        },
      },
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendToPartner(draft);
  };

  const handleFreshStart = () => {
    if (messages.length > 1 && !window.confirm('Start a fresh practice session? Your current conversation will be cleared.')) {
      return;
    }
    setMessages([firstMessage]);
    setDraft('');
    setError(null);
  };

  const retryLast = () => {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
    if (lastUserMessage) sendToPartner(lastUserMessage.content, true);
  };

  return (
    <div className="practice-page flex min-h-[100dvh] w-full">
      <aside className="page-content hidden w-[280px] shrink-0 flex-col bg-sidebar px-6 py-7 text-sidebar-foreground md:flex">
        <div className="flex items-center gap-3">
          <div className="brand-mark bg-sidebar-primary text-sidebar-primary-foreground">
            <MessageCircle size={18} strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-semibold tracking-[-0.02em] text-sidebar-foreground">Mira</p>
            <p className="text-[11px] tracking-[0.08em] text-sidebar-foreground/55">ENGLISH PARTNER</p>
          </div>
        </div>

        <div className="mt-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.17em] text-sidebar-foreground/45">Today’s practice</p>
          <div className="mt-5 flex items-end gap-3">
            <span className="font-serif text-5xl leading-none text-sidebar-primary">{practiceCount}</span>
            <span className="mb-1 text-sm text-sidebar-foreground/65">sentences<br />spoken</span>
          </div>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-sidebar-foreground/10">
            <div
              className="h-full rounded-full bg-sidebar-primary transition-[width] duration-500"
              style={{ width: `${Math.min(100, Math.max(12, practiceCount * 18))}%` }}
            />
          </div>
          <p className="mt-3 text-xs leading-5 text-sidebar-foreground/50">
            A little every day is how fluency starts to feel natural.
          </p>
        </div>

        <div className="mt-auto">
          <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/45 p-4">
            <div className="flex items-center gap-2 text-sidebar-primary">
              <Target size={16} />
              <span className="text-xs font-semibold uppercase tracking-[0.12em]">A gentle goal</span>
            </div>
            <p className="mt-3 text-sm leading-5 text-sidebar-foreground/75">
              Say one more sentence than you did yesterday.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-sidebar-foreground/45">
              <Check size={13} />
              No scores. No pressure.
            </div>
          </div>
          <button
            type="button"
            onClick={handleFreshStart}
            data-testid="button-new-session"
            className="soft-button mt-5 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <span className="flex items-center gap-2"><RotateCcw size={15} /> New session</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </aside>

      <main className="page-content flex min-w-0 flex-1 flex-col">
        <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-border/70 px-5 md:px-10">
          <div className="flex items-center gap-3 md:hidden">
            <div className="brand-mark h-9 w-9 rounded-xl">
              <MessageCircle size={16} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-semibold">Mira</p>
              <p className="text-[10px] uppercase tracking-[0.13em] text-muted-foreground">Practice partner</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Your quiet space to practice
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGuide((visible) => !visible)}
              data-testid="button-toggle-guide"
              aria-label="Open practice guide"
              className={`soft-button flex h-9 w-9 items-center justify-center rounded-full ${showGuide ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'}`}
            >
              {showGuide ? <X size={17} /> : <Info size={17} />}
            </button>
            <div className="hidden h-8 w-px bg-border md:block" />
            <span className="hidden text-xs text-muted-foreground md:inline">Session {practiceCount > 0 ? 'in progress' : 'ready'}</span>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[900px] flex-1 flex-col px-4 pb-5 md:px-10 md:pb-8">
          <div className="relative flex min-h-0 flex-1 flex-col">
            {showGuide && (
              <div className="reveal absolute right-0 top-4 z-20 w-[min(310px,calc(100vw-32px))] rounded-2xl border border-border bg-card p-5 shadow-[0_18px_50px_hsl(264_30%_25%_/_0.12)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">How this space works</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">There is no perfect answer here.</p>
                  </div>
                  <Lightbulb size={18} className="text-primary" />
                </div>
                <ul className="mt-4 space-y-3 text-xs leading-5 text-muted-foreground">
                  <li className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />Write naturally, even if the sentence is short.</li>
                  <li className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />Mira keeps replies brief so you have room to speak.</li>
                  <li className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />Your conversation stays on this device.</li>
                </ul>
              </div>
            )}

            <div className="reveal reveal-delay-1 flex items-start justify-between gap-4 pb-5 pt-7 md:pb-7 md:pt-10">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Daily speaking practice</p>
                <h1 className="mt-2 font-serif text-[clamp(2rem,5vw,3.35rem)] leading-[1.02] tracking-[-0.045em] text-foreground">
                  One sentence<br className="hidden sm:block" /> at a time.
                </h1>
              </div>
              <div className="hidden items-center gap-2 pt-2 text-xs text-muted-foreground sm:flex">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Mira is here
              </div>
            </div>

            <div className="reveal reveal-delay-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.45rem] border border-border/80 bg-card shadow-[0_16px_55px_hsl(264_40%_45%_/_0.08)]">
              <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5 md:px-7">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <Sparkles size={15} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">A conversation with Mira</p>
                    <p className="text-[11px] text-muted-foreground">Warm, short, and on your side</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleFreshStart}
                  data-testid="button-clear-session"
                  aria-label="Clear conversation"
                  className="soft-button flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="chat-scroll min-h-[250px] flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-9">
                <div className="mx-auto max-w-[660px] space-y-6">
                  {messages.map((message, index) => (
                    <MessageBubble key={`${message.role}-${index}`} message={message} index={index} />
                  ))}

                  {sendChatMessage.isPending && <TypingIndicator />}

                  {error && (
                    <div className="message-in ml-0 flex max-w-[480px] flex-col items-start gap-2">
                      <div className="rounded-2xl rounded-bl-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm leading-6 text-destructive">
                        {error}
                      </div>
                      <button
                        type="button"
                        onClick={retryLast}
                        data-testid="button-retry-message"
                        className="soft-button flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/75"
                      >
                        <RotateCcw size={13} /> Try again
                      </button>
                    </div>
                  )}
                  <div ref={scrollAnchor} />
                </div>
              </div>

              <div className="composer-shadow border-t border-border/60 bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-7 md:pb-6">
                {messages.length === 1 && (
                  <div className="mx-auto mb-4 flex max-w-[660px] flex-wrap gap-2">
                    {starterPrompts.map((prompt) => (
                      <button
                        type="button"
                        key={prompt}
                        onClick={() => sendToPartner(prompt)}
                        data-testid={`button-starter-${prompt.toLowerCase().replaceAll(' ', '-')}`}
                        className="soft-button rounded-full border border-border bg-background px-3.5 py-2 text-xs text-muted-foreground hover:border-primary/35 hover:bg-secondary hover:text-secondary-foreground"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="mx-auto flex max-w-[660px] items-end gap-2 rounded-2xl border border-input bg-background p-2 transition-colors focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    data-testid="input-message"
                    aria-label="Your message"
                    placeholder="Write a sentence to Mira..."
                    rows={1}
                    maxLength={2000}
                    className="max-h-28 min-h-[42px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground/65"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sendChatMessage.isPending}
                    data-testid="button-send-message"
                    aria-label="Send message"
                    className="soft-button mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_6px_14px_hsl(var(--primary)/.2)] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <SendHorizontal size={17} />
                  </button>
                </form>
                <p className="mx-auto mt-2.5 flex max-w-[660px] items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground/65">
                  <span>Press Enter to send</span><span className="text-border">•</span><span>Shift + Enter for a new line</span>
                </p>
              </div>
            </div>
          </div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70">
            <BookOpen size={13} /> A private place to find your words.
          </p>
        </div>
      </main>
    </div>
  );
}

function MessageBubble({ message, index }: { message: ChatMessage; index: number }) {
  const isUser = message.role === 'user';
  return (
    <div className={`message-in flex items-end gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`} style={{ animationDelay: `${Math.min(index * 35, 220)}ms` }}>
      {!isUser && (
        <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-secondary text-secondary-foreground">
          <Sparkles size={13} />
        </div>
      )}
      <div className={`max-w-[82%] md:max-w-[72%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          data-testid={`message-${message.role}-${index}`}
          className={`rounded-[1.15rem] px-4 py-3 text-[14px] leading-6 md:px-5 ${
            isUser
              ? 'rounded-br-md bg-primary text-primary-foreground shadow-[0_7px_17px_hsl(var(--primary)/.17)]'
              : 'rounded-bl-md border border-border/75 bg-card text-foreground'
          }`}
        >
          {message.content}
        </div>
        <p className={`mt-1.5 px-1 text-[10px] uppercase tracking-[0.11em] text-muted-foreground/55 ${isUser ? 'text-right' : 'text-left'}`}>
          {isUser ? 'You' : 'Mira'}
        </p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="message-in flex items-end gap-2.5" data-testid="status-typing">
      <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-secondary text-secondary-foreground">
        <Sparkles size={13} />
      </div>
      <div className="rounded-[1.15rem] rounded-bl-md border border-border/75 bg-background px-5 py-4">
        <div className="flex items-center gap-1.5" aria-label="Mira is typing">
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;