import { useState, useRef, useEffect, FormEvent } from 'react';
import { useRoute, Link } from 'wouter';
import { useListRoleplayScenarios, useSendRoleplayMessage } from '@workspace/api-client-react';
import { PremiumGate } from '@/components/premium-gate';
import { ArrowLeft, SendHorizontal, Loader2, Sparkles } from 'lucide-react';

function stripEmojis(str: string) {
  return str.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').replace(/\uFE0F/g, '');
}

export function RoleplayScenario() {
  const [, params] = useRoute('/roleplays/:scenario');
  const scenarioId = params?.scenario;

  if (!scenarioId) return null;

  return (
    <PremiumGate productId="advanced" featureName="Roleplay Scenarios">
      <ScenarioChat scenarioId={scenarioId} />
    </PremiumGate>
  );
}

function ScenarioChat({ scenarioId }: { scenarioId: string }) {
  const { data: scenariosData, isLoading, error } = useListRoleplayScenarios();
  const scenarios = (scenariosData as any)?.scenarios || (Array.isArray(scenariosData) ? scenariosData : null);
  const scenario = scenarios?.find((s: any) => s.id === scenarioId);
  const sendMessage = useSendRoleplayMessage();
  
  const [draft, setDraft] = useState('');
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const scrollAnchor = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (scenario?.messages && !initialized.current) {
      setLocalMessages(scenario.messages);
      initialized.current = true;
    } else if (scenario && !initialized.current && localMessages.length === 0) {
       // if no messages, we at least mark as initialized
       initialized.current = true;
    }
  }, [scenario]);

  useEffect(() => {
    scrollAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [localMessages, sendMessage.isPending]);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !scenario) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-destructive mb-4">Could not load this scenario.</p>
        <Link href="/roleplays" className="text-primary hover:underline">Return to Scenarios</Link>
      </div>
    );
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sendMessage.isPending) return;
    
    setLocalMessages(prev => [...prev, { role: 'user', content: text }]);
    setDraft('');

    sendMessage.mutate({ scenario: scenarioId, data: { message: text } }, {
      onSuccess: (data: any) => {
        setLocalMessages(prev => [
          ...prev, 
          { role: 'assistant', content: stripEmojis(data.reply || data.assistantTranscript || 'No reply'), correction: data.correction }
        ]);
      }
    });
  };

  return (
    <div className="flex h-full flex-col max-w-4xl mx-auto w-full">
      <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-border/70 px-4 md:px-10">
        <div className="flex items-center gap-4">
          <Link href="/roleplays" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{scenario.title}</h1>
            <p className="text-xs text-muted-foreground">{scenario.setting} • {scenario.difficulty}</p>
          </div>
        </div>
      </header>

      <div className="chat-scroll flex-1 overflow-y-auto px-4 py-6 md:px-10">
        <div className="mx-auto max-w-[660px] space-y-6">
          <div className="rounded-2xl bg-secondary/50 p-4 text-center text-sm text-secondary-foreground">
            {scenario.description}
          </div>

          {localMessages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div key={idx} className={`flex items-end gap-2.5 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                {!isUser && (
                  <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-secondary text-secondary-foreground">
                    <Sparkles size={13} />
                  </div>
                )}
                <div className={`max-w-[82%] md:max-w-[72%] ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`rounded-[1.15rem] px-4 py-3 text-[14px] leading-6 md:px-5 ${
                      isUser
                        ? 'rounded-br-md bg-primary text-primary-foreground shadow-[0_7px_17px_hsl(var(--primary)/.17)]'
                        : 'rounded-bl-md border border-border/75 bg-card text-foreground'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {!isUser && msg.correction && (
                    <div className="mt-2 rounded-xl bg-secondary/10 border border-secondary/20 p-3 text-xs text-secondary">
                      <strong className="block mb-1">Correction:</strong>
                      {msg.correction}
                    </div>
                  )}
                  <p className={`mt-1.5 px-1 text-[10px] uppercase tracking-[0.11em] text-muted-foreground/55 ${isUser ? 'text-right' : 'text-left'}`}>
                    {isUser ? 'You' : 'Partner'}
                  </p>
                </div>
              </div>
            );
          })}

          {sendMessage.isPending && (
            <div className="flex items-end gap-2.5">
              <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-secondary text-secondary-foreground">
                <Sparkles size={13} />
              </div>
              <div className="rounded-[1.15rem] rounded-bl-md border border-border/75 bg-background px-5 py-4">
                <div className="flex items-center gap-1.5">
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" />
                </div>
              </div>
            </div>
          )}
          <div ref={scrollAnchor} />
        </div>
      </div>

      <div className="composer-shadow border-t border-border/60 bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-7 md:pb-6">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-[660px] items-end gap-2 rounded-2xl border border-input bg-background p-2 transition-colors focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Type your response..."
            rows={1}
            maxLength={1000}
            className="max-h-28 min-h-[42px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground/65"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sendMessage.isPending}
            className="soft-button mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_4px_10px_hsl(var(--primary)/.2)] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SendHorizontal size={17} />
          </button>
        </form>
      </div>
    </div>
  );
}
