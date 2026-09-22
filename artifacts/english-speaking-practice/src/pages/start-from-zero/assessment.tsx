import { useState } from 'react';
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
  const [isListening, setIsListening] = useState(false);
  const [heardText, setHeardText] = useState('');
  
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

  const advance = (changes: Partial<typeof scores>) => {
    const nextScores = { ...scores, ...changes };
    setScores(nextScores);
    setError(null);
    if (testStep < 2) setTestStep((current) => current + 1);
    else submitFinal(nextScores);
  };

  const speak = (text: string) => {
    window.speechSynthesis?.cancel();
    window.speechSynthesis?.speak(new SpeechSynthesisUtterance(text));
  };

  const recordPhrase = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice recognition is not available in this browser. You can skip this voice task.');
      return;
    }
    setError(null);
    setHeardText('');
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      setError('Microphone could not hear you. Please try again or skip.');
    };
    recognition.onresult = (event: any) => {
      const transcript = String(event.results?.[0]?.[0]?.transcript || '').toLowerCase().trim();
      setHeardText(transcript);
      const expected = ['i', 'want', 'water'];
      const matched = expected.filter((word) => transcript.split(/\s+/).includes(word)).length;
      const score = matched / expected.length;
      advance({ repeating: score, pronunciation: score });
    };
    recognition.start();
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
              <button onClick={() => speak('Apple')} className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg" aria-label="Play the word Apple">
                <Play fill="currentColor" size={30} />
              </button>
              <h2 className="text-2xl font-bold">Listen and choose</h2>
              <p className="mt-2 text-base text-muted-foreground">Kaunsa picture “Apple” hai?</p>
              
              <div className="mt-8 grid w-full grid-cols-2 gap-4">
                <button onClick={() => advance({ wordRecognition: 1, listening: 1 })} className="flex h-24 items-center justify-center rounded-2xl border-2 border-border bg-card text-5xl hover:border-primary">
                  🍎
                </button>
                <button onClick={() => advance({ wordRecognition: 0, listening: 0 })} className="flex h-24 items-center justify-center rounded-2xl border-2 border-border bg-card text-5xl hover:border-primary">
                  🏠
                </button>
              </div>
            </div>
          )}

          {testStep === 1 && (
            <div className="reveal flex flex-col items-center w-full">
              <div className="mb-6 rounded-[2rem] bg-secondary/10 p-8 text-center text-secondary">
                <h3 className="text-3xl font-extrabold tracking-widest">A B C D</h3>
              </div>
              <h2 className="text-2xl font-bold">Choose the next letter</h2>
              <p className="mt-2 text-base text-muted-foreground">D ke baad kya aata hai?</p>
              
              <div className="mt-8 flex gap-4">
                <button onClick={() => advance({ alphabetRecognition: 1, sentenceUnderstanding: 1 })} className="flex h-16 w-32 items-center justify-center rounded-2xl border-2 border-border bg-card text-2xl font-bold hover:border-primary">
                  E
                </button>
                <button onClick={() => advance({ alphabetRecognition: 0, sentenceUnderstanding: 0 })} className="flex h-16 w-32 items-center justify-center rounded-2xl border-2 border-border bg-card text-2xl font-bold hover:border-primary">
                  G
                </button>
              </div>
            </div>
          )}

          {testStep === 2 && (
            <div className="reveal flex flex-col items-center w-full">
              <button onClick={() => speak('I want water')} className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-lg" aria-label="Play I want water">
                <Play fill="currentColor" size={24} />
              </button>
              <div className="mb-6 text-center"><h3 className="text-2xl font-bold text-foreground">“I want water”</h3></div>
              <h2 className="text-2xl font-bold">Repeat After Me</h2>
              <p className="mt-2 text-base text-muted-foreground">{isListening ? 'Sun raha hoon… boliye.' : 'Mic dabayein aur sentence boliye.'}</p>
              {heardText && <p className="mt-3 rounded-xl bg-secondary/10 px-4 py-2 text-sm">Heard: {heardText}</p>}
              
              <div className="mt-8 flex flex-col items-center gap-3">
                <button disabled={submitAssessment.isPending || isListening} onClick={recordPhrase} className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg disabled:opacity-50">
                  {submitAssessment.isPending || isListening ? <Loader2 size={24} className="animate-spin" /> : <Mic size={30} />}
                </button>
                <button disabled={submitAssessment.isPending || isListening} onClick={() => advance({ repeating: 0, pronunciation: 0 })} className="text-sm font-bold text-muted-foreground underline disabled:opacity-50">
                  Skip voice task
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
