import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSendChatMessage, type ChatMessage } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Info,
  Lightbulb,
  RotateCcw,
  SendHorizontal,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import { useGetPracticeSession } from '@workspace/api-client-react';
import { PremiumGate } from '@/components/premium-gate';

const STORAGE_KEY = 'english-speaking-practice-session';

function stripEmojis(str: string) {
  return str.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').replace(/\uFE0F/g, '');
}

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

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>(getSavedMessages);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const scrollAnchor = useRef<HTMLDivElement>(null);
  const sendChatMessage = useSendChatMessage();
  const queryClient = useQueryClient();
  const { data: sessionData } = useGetPracticeSession();
  
  const plan = (sessionData as any)?.plan || 'free';
  const isPremium = plan === 'premium';
  
  const usage = (sessionData as any)?.usage?.textMessages || 0;
  const limit = (sessionData as any)?.limits?.textMessages || (isPremium ? 100 : 10);
  const remaining = Math.max(0, limit - usage);

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
    const historyForRequest = (isRetry ? messages.slice(0, -1) : messages).slice(-8);
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
            { role: 'assistant', content: stripEmojis(response.reply) },
          ]);
          queryClient.invalidateQueries({ queryKey: ['/api/session'] });
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
    <PremiumGate productId="advanced" featureName="Chat Practice">
    <div className="practice-page flex min-h-[100dvh] w-full bg-background relative">
      <div className="mx-auto flex w-full max-w-[900px] flex-1 flex-col px-4 pb-5 pt-10 md:px-10 md:pb-8 md:pt-14 relative z-10">
        <header className="flex shrink-0 items-center justify-between border-b border-border/70 py-4 mb-6">
          <div>
            <h1 className="text-[18px] md:text-[20px] font-semibold tracking-tight">Chat with Mira</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">Practice English for free with Mira — anytime, anywhere.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="md:hidden flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md text-[13px] text-muted-foreground mr-1">
              <Check size={14} /> {remaining} left
            </div>
            <button
              type="button"
              onClick={() => setShowGuide((visible) => !visible)}
              aria-label="Open practice guide"
              className={`soft-button flex h-9 w-9 items-center justify-center rounded-full ${showGuide ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'}`}
            >
              {showGuide ? <X size={18} /> : <Info size={18} />}
            </button>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col">
          {showGuide && (
            <div className="reveal absolute right-0 top-0 z-20 w-[min(310px,calc(100vw-32px))] rounded-2xl border border-border bg-card p-5 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[15px] font-semibold">How this space works</p>
                  <p className="mt-1 text-[13px] leading-[1.6] text-muted-foreground">There is no perfect answer here.</p>
                </div>
                <Lightbulb size={18} className="text-primary" />
              </div>
              <ul className="mt-4 space-y-3 text-[13px] leading-[1.6] text-muted-foreground">
                <li className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />Write naturally, even if the sentence is short.</li>
                <li className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />Mira keeps replies brief so you have room to speak.</li>
                <li className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />Your conversation stays on this device.</li>
              </ul>
            </div>
          )}

          {!isPremium && (
            <div className="mb-4 flex w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-3 text-[13px] text-muted-foreground/70">
              <span className="uppercase tracking-widest text-[11px] font-semibold opacity-60">Advertisement</span>
            </div>
          )}

          <div className="reveal reveal-delay-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.45rem] border border-border/80 bg-card shadow-[0_8px_30px_hsl(264_40%_45%_/_0.04)]">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-4 md:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-[16px] font-semibold">A conversation with Mira</p>
                  <p className="text-[13px] text-muted-foreground">Warm, short, and on your side.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden mr-2 text-[13px] text-muted-foreground md:flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
                  <Check size={14} /> {remaining} messages remaining today
                </div>
                <button
                  type="button"
                  onClick={handleFreshStart}
                  aria-label="Clear conversation"
                  className="soft-button flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="chat-scroll min-h-[250px] flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-9">
              <div className="mx-auto max-w-[660px] space-y-6">
                {messages.map((message, index) => {
                  const showAd = !isPremium && index === 0;
                  return (
                    <div key={`${message.role}-${index}`} className="space-y-6">
                      <MessageBubble message={message} index={index} />
                      {showAd && (
                        <div className="flex w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-4 text-[13px] text-muted-foreground/70 my-8">
                          <span className="uppercase tracking-widest text-[11px] font-semibold opacity-60">Advertisement</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {sendChatMessage.isPending && <TypingIndicator />}

                {error && (
                  <div className="message-in ml-0 flex max-w-[480px] flex-col items-start gap-2">
                    <div className="rounded-2xl rounded-bl-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-[14px] leading-[1.6] text-destructive">
                      {error}
                    </div>
                    <button
                      type="button"
                      onClick={retryLast}
                      className="soft-button flex items-center gap-1.5 text-[14px] font-semibold text-primary hover:text-primary/75"
                    >
                      <RotateCcw size={15} /> Try again
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
                      className="soft-button rounded-full border border-border bg-background px-4 py-2 text-[14px] font-medium text-muted-foreground hover:border-primary/35 hover:bg-secondary hover:text-secondary-foreground"
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
                  aria-label="Your message"
                  placeholder="Write a sentence to Mira..."
                  rows={1}
                  maxLength={2000}
                  className="max-h-28 min-h-[46px] flex-1 resize-none bg-transparent px-3 py-3 text-[15px] md:text-[16px] leading-[1.6] text-foreground outline-none placeholder:text-muted-foreground/65"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sendChatMessage.isPending}
                  aria-label="Send message"
                  className="soft-button mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_4px_10px_hsl(var(--primary)/.2)] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <SendHorizontal size={18} />
                </button>
              </form>
              <p className="mx-auto mt-2.5 flex max-w-[660px] items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground/65">
                <span>Press Enter to send</span><span className="text-border">•</span><span>Shift + Enter for a new line</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </PremiumGate>
  );
}

function MessageBubble({ message, index }: { message: ChatMessage; index: number }) {
  const isUser = message.role === 'user';
  return (
    <div className={`message-in flex items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'}`} style={{ animationDelay: `${Math.min(index * 35, 220)}ms` }}>
      {!isUser && (
        <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
          <Sparkles size={15} />
        </div>
      )}
      <div className={`max-w-[85%] md:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-5 py-3.5 text-[16px] leading-[1.6] ${
            isUser
              ? 'rounded-br-sm bg-primary text-primary-foreground shadow-[0_7px_17px_hsl(var(--primary)/.17)]'
              : 'rounded-bl-sm border border-border/75 bg-card text-foreground'
          }`}
        >
          {message.content}
        </div>
        <p className={`mt-2 px-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60 ${isUser ? 'text-right' : 'text-left'}`}>
          {isUser ? 'You' : 'Mira'}
        </p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="message-in flex items-end gap-3">
      <div className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
        <Sparkles size={15} />
      </div>
      <div className="rounded-2xl rounded-bl-sm border border-border/75 bg-background px-6 py-5">
        <div className="flex items-center gap-1.5" aria-label="Mira is typing">
          <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
          <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
          <span className="typing-dot h-2 w-2 rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
