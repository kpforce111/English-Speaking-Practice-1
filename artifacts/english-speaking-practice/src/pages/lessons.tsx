import { useListDailyLessons, useRecordLessonAttempt } from '@workspace/api-client-react';
import { PremiumGate } from '@/components/premium-gate';
import { GraduationCap, Clock, CheckCircle2, PlayCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function Lessons() {
  return (
    <PremiumGate featureName="Guided Lessons">
      <LessonsList />
    </PremiumGate>
  );
}

function LessonsList() {
  const { data, isLoading, error } = useListDailyLessons();
  const lessons = (data as any)?.lessons || [];
  
  const [activeLesson, setActiveLesson] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col px-4 py-8 md:px-10 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <GraduationCap size={20} />
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">Daily Lessons</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-lg">
          Structured 10-15 minute modules focusing on grammar, pronunciation, and vocabulary.
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center p-10">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-destructive/10 p-6 text-center text-destructive">
          <p>Failed to load lessons.</p>
        </div>
      )}

      {!isLoading && !error && lessons.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-muted-foreground">No lessons available yet.</p>
        </div>
      )}

      {activeLesson ? (
        <LessonPlayer lesson={lessons.find((l: any) => l.id === activeLesson)} onBack={() => setActiveLesson(null)} />
      ) : (
        <div className="space-y-4">
          {lessons.map((lesson: any) => (
            <div 
              key={lesson.id} 
              className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-3">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${
                    lesson.level === 'Beginner' ? 'bg-emerald-500/10 text-emerald-600' :
                    lesson.level === 'Intermediate' ? 'bg-amber-500/10 text-amber-600' :
                    'bg-rose-500/10 text-rose-600'
                  }`}>
                    {lesson.level}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                    <Clock size={14} /> {lesson.durationMinutes} min
                  </span>
                </div>
                <h3 className="font-semibold text-xl mb-1">{lesson.title}</h3>
                <p className="text-sm text-muted-foreground">{lesson.topic}</p>
              </div>
              
              <div className="shrink-0 flex items-center justify-end">
                {lesson.completed ? (
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-500/10 px-4 py-2 rounded-xl text-sm font-semibold">
                    <CheckCircle2 size={18} /> Completed
                  </div>
                ) : (
                  <button 
                    onClick={() => setActiveLesson(lesson.id)}
                    className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
                  >
                    <PlayCircle size={18} /> Start Lesson
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LessonPlayer({ lesson, onBack }: { lesson: any, onBack: () => void }) {
  const attempt = useRecordLessonAttempt();
  const [completed, setCompleted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [step, setStep] = useState(0);

  if (!lesson) return null;

  const steps = [
    { type: 'intro', content: `Today we'll focus on ${lesson.topic}.` },
    ...(lesson.objectives || []).map((obj: string) => ({ type: 'objective', content: obj })),
    { type: 'practice', content: `Please say a sentence using the new vocabulary from ${lesson.topic}.` }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      finishLesson();
    }
  };

  const finishLesson = () => {
    attempt.mutate({ lessonId: lesson.id, data: { minutes: lesson.durationMinutes || 10 } }, {
      onSuccess: (data) => {
        setResult(data);
        setCompleted(true);
      }
    });
  };

  if (completed) {
    return (
      <div className="rounded-3xl border border-border bg-card p-10 text-center animate-in zoom-in-95">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="font-serif text-3xl font-medium mb-4">Lesson Complete!</h2>
        <p className="text-muted-foreground mb-8">Score: {result?.score || 100}%</p>
        <p className="text-sm mb-8 max-w-md mx-auto">{result?.feedback || 'Great job completing this lesson.'}</p>
        <button 
          onClick={onBack}
          className="rounded-xl bg-secondary px-6 py-3 text-sm font-semibold text-secondary-foreground hover:bg-muted"
        >
          Return to Lessons
        </button>
      </div>
    );
  }

  const currentStep = steps[step];

  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border p-4 bg-muted/30 flex items-center justify-between">
        <span className="font-medium text-sm">{lesson.title}</span>
        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
      
      <div className="p-10 min-h-[300px] flex flex-col items-center justify-center text-center">
        <h3 className="text-xl font-medium mb-4">
          {currentStep.type === 'intro' ? 'Introduction' : 
           currentStep.type === 'objective' ? 'Learning Objective' : 'Practice'}
        </h3>
        <p className="text-muted-foreground max-w-md mb-8">
          {currentStep.content}
        </p>
        
        <button 
          onClick={handleNext}
          disabled={attempt.isPending}
          className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
        >
          {attempt.isPending ? <Loader2 size={16} className="animate-spin" /> : 
           step < steps.length - 1 ? 'Next' : 'Complete Lesson'}
        </button>
        
        <div className="mt-8 flex items-center gap-2">
          {steps.map((_, i) => (
            <div key={i} className={`h-2 rounded-full ${i <= step ? 'bg-primary w-6' : 'bg-muted w-2'} transition-all`} />
          ))}
        </div>
      </div>
    </div>
  );
}
