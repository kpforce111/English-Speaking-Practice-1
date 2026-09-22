import { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { Mic, Play, ArrowRight, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useSubmitBeginnerAssessment, BeginnerAssessmentInputLanguage } from '@workspace/api-client-react';
import { PremiumGate } from '@/components/premium-gate';

const LANGUAGES = [
  { id: 'hindi' as const, label: 'Hindi (हिंदी)', roman: 'Hindi' },
  { id: 'roman_hindi' as const, label: 'Hinglish (Roman Hindi)', roman: 'Hinglish' },
  { id: 'urdu' as const, label: 'Urdu (اردो)', roman: 'Urdu' },
];

export function StartFromZeroAssessment() {
  const [, setLocation] = useLocation();
  const submitAssessment = useSubmitBeginnerAssessment();
  const [step, setStep] = useState<'language' | 'test'>('language');
  const [language, setLanguage] = useState<BeginnerAssessmentInputLanguage>('roman_hindi');
  
  const [testStep, setTestStep] = useState(0);
  const [scores, setScores] = useState({
    wordRecognition: 0,
    listening: 0,
    repeating: 0,
    pronunciation: 0,
    sentenceUnderstanding: 0,
    alphabetRecognition: 0,
  });
  const [error, setError] = useState<string | null>(null);
  
  const handleStartTest = () => {
    setStep('test');
    setTestStep(0);
  };

  const submitFinal = (finalScores: typeof scores) => {
    setError(null);
    submitAssessment.mutate({
      data: {
        language,
        ...finalScores
      }
    }, {
      onSuccess: () => {
        setLocation('/start-from-zero');
      },
      onError: (err: any) => {
        setError(err.message || 'Failed to save assessment. Please try again.');
        setTestStep(2); // keep them on the last step to retry
      }
    });
  };

  const handleChoice = (good: boolean) => {
    let newScores = { ...scores };
    
    if (testStep === 0) {
      newScores.wordRecognition = good ? 1.0 : 0.3;
      newScores.listening = good ? 0.9 : 0.2;
    } else if (testStep === 1) {
      newScores.alphabetRecognition = good ? 1.0 : 0.4;
      newScores.pronunciation = good ? 0.8 : 0.3;
    } else if (testStep === 2) {
      newScores.sentenceUnderstanding = good ? 0.9 : 0.3;
      newScores.repeating = good ? 0.85 : 0.2;
    }

    setScores(newScores);

    if (testStep < 2) {
      setTestStep(t => t + 1);
    } else {
      submitFinal(newScores);
    }
  };

  if (step === 'language') {
    return (
      <PremiumGate productId="start_zero" featureName="Beginner Assessment">
      <main className="practice-page min-h-[100dvh] flex flex-col px-5 py-12 md:px-10">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Aapki Bhasha?</h1>
            <p className="mt-2 text-base font-medium text-muted-foreground">Select your instruction language</p>
          </div>
          
          <div className="space-y-4 mb-10">
            {LANGUAGES.map(lang => (
              <button
                key={lang.id}
                onClick={() => setLanguage(lang.id)}
                className={`flex w-full items-center justify-between rounded-2xl border-2 p-5 text-left transition-all ${
                  language === lang.id ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <div>
                  <div className="text-xl font-bold text-foreground">{lang.label}</div>
                  <div className="mt-1 text-sm font-medium text-muted-foreground">{lang.roman}</div>
                </div>
                {language === lang.id && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={handleStartTest}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-lg font-bold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
          >
            Start Short Test <ArrowRight size={20} />
          </button>
        </div>
      </main>
      </PremiumGate>
    );
  }

  return (
    <PremiumGate productId="start_zero" featureName="Beginner Assessment">
    <main className="practice-page min-h-[100dvh] flex flex-col px-5 py-12 md:px-10">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {/* Progress bar */}
        <div className="mb-8 flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className={`h-2 flex-1 rounded-full ${i <= testStep ? 'bg-primary' : 'bg-primary/20'}`} />
          ))}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          {error && (
            <div className="mb-6 flex items-start gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {testStep === 0 && (
            <div className="reveal flex flex-col items-center w-full">
              <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-[2rem] bg-secondary/10 text-secondary text-xl font-bold p-4 break-words">
                Apple
              </div>
              <h2 className="text-2xl font-bold">Listen & Tap</h2>
              <p className="mt-2 text-base text-muted-foreground">Sunein aur sahi picture chunein.</p>
              
              <div className="mt-8 flex gap-4">
                <button onClick={() => handleChoice(true)} className="flex h-16 w-32 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/30 hover:bg-emerald-500/20">
                  Tap Right
                </button>
                <button onClick={() => handleChoice(false)} className="flex h-16 w-32 items-center justify-center rounded-2xl bg-destructive/10 text-destructive font-bold border border-destructive/30 hover:bg-destructive/20">
                  Tap Wrong
                </button>
              </div>
            </div>
          )}

          {testStep === 1 && (
            <div className="reveal flex flex-col items-center w-full">
              <div className="mb-6 rounded-[2rem] bg-secondary/10 p-8 text-center text-secondary">
                <h3 className="text-3xl font-extrabold tracking-widest">A B C D</h3>
              </div>
              <h2 className="text-2xl font-bold">Read Aloud</h2>
              <p className="mt-2 text-base text-muted-foreground">Mic dabayein aur padhein.</p>
              
              <div className="mt-8 flex gap-4">
                <button onClick={() => handleChoice(true)} className="flex h-16 w-32 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/30 hover:bg-emerald-500/20">
                  Read Good
                </button>
                <button onClick={() => handleChoice(false)} className="flex h-16 w-32 items-center justify-center rounded-2xl bg-destructive/10 text-destructive font-bold border border-destructive/30 hover:bg-destructive/20">
                  Read Bad
                </button>
              </div>
            </div>
          )}

          {testStep === 2 && (
            <div className="reveal flex flex-col items-center w-full">
              <div className="mb-6 text-center">
                <h3 className="text-2xl font-bold text-foreground">"I want water"</h3>
              </div>
              <h2 className="text-2xl font-bold">Repeat After Me</h2>
              <p className="mt-2 text-base text-muted-foreground">Mere baad dohraayein.</p>
              
              <div className="mt-8 flex gap-4">
                <button disabled={submitAssessment.isPending} onClick={() => handleChoice(true)} className="flex h-16 w-32 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/30 hover:bg-emerald-500/20 disabled:opacity-50">
                  {submitAssessment.isPending ? <Loader2 size={20} className="animate-spin" /> : 'Repeat Good'}
                </button>
                <button disabled={submitAssessment.isPending} onClick={() => handleChoice(false)} className="flex h-16 w-32 items-center justify-center rounded-2xl bg-destructive/10 text-destructive font-bold border border-destructive/30 hover:bg-destructive/20 disabled:opacity-50">
                  {submitAssessment.isPending ? <Loader2 size={20} className="animate-spin" /> : 'Repeat Bad'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
    </PremiumGate>
  );
}
