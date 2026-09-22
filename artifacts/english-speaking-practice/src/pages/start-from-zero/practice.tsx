import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Mic, Play, ArrowRight, CheckCircle2, Headphones, XCircle, X, Loader2, AlertCircle } from 'lucide-react';
import { useRecordBeginnerPractice, getGetBeginnerOverviewQueryKey, useGetBeginnerOverview } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { PremiumGate } from '@/components/premium-gate';

export function StartFromZeroPractice() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const mode = searchParams.get('mode') === 'revision' ? 'revision' : 'lesson';
  
  const { data: overview, isLoading: isOverviewLoading } = useGetBeginnerOverview();
  const queryClient = useQueryClient();
  const recordPractice = useRecordBeginnerPractice();
  
  const [stepIndex, setStepIndex] = useState(0);
  const [showFeedback, setShowFeedback] = useState<'success' | 'fail' | null>(null);

  const practiceItems = mode === 'revision' ? overview?.revision : overview?.lesson?.items;
  const items = Array.isArray(practiceItems) ? practiceItems : [];
  
  const currentItem = items[stepIndex];
  const isFinished = items.length > 0 && stepIndex >= items.length;

  const handleAction = async (correct: boolean) => {
    if (showFeedback || !currentItem) return;
    
    // Attempt mutation and wait for it
    recordPractice.mutate({
      data: {
        itemId: currentItem.id,
        kind: currentItem.kind,
        correct,
        pronunciationScore: correct ? 85 : 45
      }
    }, {
      onSuccess: () => {
        setShowFeedback(correct ? 'success' : 'fail');
        setTimeout(() => {
          setShowFeedback(null);
          if (stepIndex + 1 >= items.length) {
            queryClient.invalidateQueries({ queryKey: getGetBeginnerOverviewQueryKey() });
            setLocation('/start-from-zero');
          } else {
            setStepIndex(s => s + 1);
          }
        }, 1200);
      }
    });
  };

  if (isOverviewLoading) {
    return (
      <main className="practice-page flex min-h-[100dvh] items-center justify-center p-5">
        <div className="flex flex-col items-center text-primary">
          <Loader2 size={40} className="animate-spin mb-4" />
          <p className="font-bold">Loading Practice...</p>
        </div>
      </main>
    );
  }

  if (!items || items.length === 0) {
    return (
      <main className="practice-page flex min-h-[100dvh] items-center justify-center p-5">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10 text-secondary">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2">No Items Found</h2>
          <p className="text-muted-foreground mb-6">There are no practice items available for this mode right now.</p>
          <button onClick={() => setLocation('/start-from-zero')} className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">
            Go Back
          </button>
        </div>
      </main>
    );
  }

  if (isFinished) {
    return (
      <main className="practice-page flex min-h-[100dvh] items-center justify-center p-5">
        <div className="text-center text-primary">
          <Loader2 size={48} className="mx-auto animate-spin mb-4" />
          <p className="font-bold text-lg">Finishing up...</p>
        </div>
      </main>
    );
  }

  return (
    <PremiumGate productId="start_zero" featureName="Beginner Practice">
    <main className="practice-page min-h-[100dvh] flex flex-col px-5 py-8 md:px-10">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {/* Header / Progress */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => setLocation('/start-from-zero')} disabled={recordPractice.isPending || showFeedback !== null} className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed">
            <X size={16} /> Quit
          </button>
          <div className="flex gap-1.5 flex-1 mx-6">
            {items.map((_, i) => (
              <div key={i} className={`h-2 flex-1 rounded-full ${i < stepIndex ? 'bg-emerald-500' : i === stepIndex ? 'bg-primary' : 'bg-primary/20'}`} />
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center relative">
          {showFeedback === 'success' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in zoom-in duration-300 text-emerald-500">
              <CheckCircle2 size={100} />
              <h2 className="mt-4 text-3xl font-extrabold text-emerald-600">Sahi! / Correct!</h2>
            </div>
          )}
          {showFeedback === 'fail' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in zoom-in duration-300 text-secondary">
              <XCircle size={100} />
              <h2 className="mt-4 text-3xl font-extrabold text-secondary">Try Again Later</h2>
            </div>
          )}

          <div className="reveal w-full">
            <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-[2rem] bg-secondary/10 text-6xl shadow-inner mb-8 text-secondary">
              {currentItem.picture?.icon || '📝'}
            </div>

            {String(currentItem.kind) === 'listening' && (
              <>
                <h2 className="text-2xl font-bold text-foreground mb-2">Listen & Learn</h2>
                <p className="text-muted-foreground font-medium mb-8">Sunein aur samjhein.</p>
                <div className="flex justify-center mb-10">
                  <button className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_30px_hsl(var(--primary)/.3)] hover:scale-105 transition-transform">
                    <Play fill="currentColor" size={32} />
                  </button>
                </div>
              </>
            )}

            {(String(currentItem.kind) === 'word' || String(currentItem.kind) === 'sentence' || String(currentItem.kind) === 'pronunciation' || String(currentItem.kind) === 'conversation') && (
              <>
                <h2 className="text-3xl font-extrabold text-foreground mb-2">{currentItem.english}</h2>
                <p className="text-lg text-muted-foreground font-medium mb-8">({currentItem.meaning})</p>
                <div className="flex justify-center gap-6 mb-10">
                  <button className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-lg hover:scale-105 transition-transform">
                    <Play fill="currentColor" size={24} />
                  </button>
                  <button className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_30px_hsl(var(--primary)/.3)] hover:scale-105 transition-transform breathe">
                    <Mic size={32} />
                  </button>
                </div>
              </>
            )}
            
            {recordPractice.isError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>{recordPractice.error?.message || 'Failed to save progress. Please try again.'}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8 pb-4 border-t border-border/50 pt-6">
          <p className="col-span-2 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Debug Actions</p>
          <button 
            onClick={() => handleAction(false)} 
            disabled={recordPractice.isPending || showFeedback !== null}
            className="flex items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 py-3 font-bold text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {recordPractice.isPending && !showFeedback ? <Loader2 size={16} className="animate-spin" /> : null}
            Simulate Fail
          </button>
          <button 
            onClick={() => handleAction(true)} 
            disabled={recordPractice.isPending || showFeedback !== null}
            className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 py-3 font-bold text-emerald-600 hover:bg-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {recordPractice.isPending && !showFeedback ? <Loader2 size={16} className="animate-spin" /> : null}
            Simulate Success
          </button>
        </div>
      </div>
    </main>
    </PremiumGate>
  );
}
