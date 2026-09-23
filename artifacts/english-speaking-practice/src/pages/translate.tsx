import { useState, FormEvent } from 'react';
import { useTranslatePracticeText } from '@workspace/api-client-react';
import { PremiumGate } from '@/components/premium-gate';
import { Languages, ArrowRightLeft, Copy, Check, Loader2 } from 'lucide-react';

export function Translate() {
  return (
    <PremiumGate productId="advanced" featureName="Translation">
      <TranslateTool />
    </PremiumGate>
  );
}

function TranslateTool() {
  const [sourceText, setSourceText] = useState('');
  const [direction, setDirection] = useState<'to_english' | 'to_roman'>('to_english');
  const [result, setResult] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  
  const translate = useTranslatePracticeText();

  const handleTranslate = (e: FormEvent) => {
    e.preventDefault();
    if (!sourceText.trim() || translate.isPending) return;
    setResult(null);
    setNotes('');
    setError('');
    
    translate.mutate(
      { data: { text: sourceText.trim(), direction: direction === 'to_english' ? 'roman-hindi-to-english' : 'english-to-roman-hindi' } },
      {
        onSuccess: (res) => {
          if (!res.translation?.trim()) { setError('No translation was returned. Please try again.'); return; }
          setResult(res.translation);
          setNotes(res.notes || '');
        },
        onError: (err) => setError(err.message || 'Translation failed. Please try again.'),
      }
    );
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const swapDirection = () => {
    setDirection(prev => prev === 'to_english' ? 'to_roman' : 'to_english');
    if (result) {
      setSourceText(result);
      setResult(null);
      setNotes('');
      setError('');
    }
  };

  return (
    <div className="flex h-full flex-col px-4 py-8 md:px-10 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Languages size={20} />
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">Translate</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-md">
          Instantly translate between Roman Hindi/Urdu and clear, natural English.
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden flex flex-col md:flex-row">
        {/* Source */}
        <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {direction === 'to_english' ? 'Roman Hindi / Urdu' : 'English'}
            </span>
          </div>
          <form id="translate-form" onSubmit={handleTranslate} className="flex-1 flex flex-col">
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Type something..."
              className="flex-1 resize-none bg-transparent text-lg outline-none placeholder:text-muted-foreground/40 min-h-[150px]"
            />
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={!sourceText.trim() || translate.isPending}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {translate.isPending && <Loader2 size={16} className="animate-spin" />}
                Translate
              </button>
            </div>
          </form>
        </div>

        {/* Swap Button (Mobile) */}
        <div className="flex justify-center -my-4 md:hidden relative z-10">
          <button 
            onClick={swapDirection}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-sm border border-border"
          >
            <ArrowRightLeft size={14} className="rotate-90" />
          </button>
        </div>

        {/* Swap Button (Desktop) */}
        <div className="hidden md:flex flex-col justify-center -mx-4 relative z-10">
          <button 
            onClick={swapDirection}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-sm border border-border hover:bg-muted"
          >
            <ArrowRightLeft size={14} />
          </button>
        </div>

        {/* Target */}
        <div className="flex-1 flex flex-col p-5 bg-muted/20">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              {direction === 'to_english' ? 'English' : 'Roman Hindi / Urdu'}
            </span>
            {result && (
              <button 
                onClick={copyToClipboard}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            )}
          </div>
          <div className="flex-1">
            {translate.isPending ? (
              <div className="h-full flex items-center justify-center text-muted-foreground/50">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : error ? (
              <p role="alert" className="text-sm text-destructive">{error}</p>
            ) : result ? (
              <div><p className="text-lg text-foreground whitespace-pre-wrap">{result}</p>{notes && <p className="mt-3 text-sm text-muted-foreground">{notes}</p>}</div>
            ) : (
              <p className="text-lg text-muted-foreground/40 italic">Translation will appear here...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
