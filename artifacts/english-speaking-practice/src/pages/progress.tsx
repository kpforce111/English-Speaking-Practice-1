import { useGetPracticeProgress, useGetWeeklyPracticeReport } from '@workspace/api-client-react';
import { PremiumGate } from '@/components/premium-gate';
import { BarChart2, Flame, MessageSquare, Clock, Trophy, TrendingUp, Loader2, Award, Target } from 'lucide-react';

export function Progress() {
  return (
    <PremiumGate featureName="Detailed Progress">
      <ProgressDashboard />
    </PremiumGate>
  );
}

function ProgressDashboard() {
  const { data: progressData, isLoading: progressLoading } = useGetPracticeProgress();
  const { data: weeklyData, isLoading: weeklyLoading } = useGetWeeklyPracticeReport();

  const progress = (progressData as any) || {
    sentencesSpoken: 0,
    practiceMinutes: 0,
    activeDays: 0,
    correctionCount: 0
  };

  const isLoading = progressLoading || weeklyLoading;

  const weekly = weeklyData as any;

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col px-4 py-8 md:px-10 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BarChart2 size={20} />
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">Your Progress</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Track your journey to fluency. Every sentence counts.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard 
          icon={<MessageSquare className="text-blue-500" />} 
          label="Sentences" 
          value={progress.sentencesSpoken || 0} 
          bg="bg-blue-500/10"
        />
        <StatCard 
          icon={<Clock className="text-purple-500" />} 
          label="Minutes" 
          value={progress.practiceMinutes || 0} 
          bg="bg-purple-500/10"
        />
        <StatCard 
          icon={<Flame className="text-orange-500" />} 
          label="Active Days" 
          value={progress.activeDays || 0} 
          bg="bg-orange-500/10"
        />
        <StatCard 
          icon={<Trophy className="text-emerald-500" />} 
          label="Corrections" 
          value={progress.correctionCount || 0} 
          bg="bg-emerald-500/10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={18} className="text-primary" />
            <h2 className="font-semibold text-lg">Weekly Report</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Trend</p>
              <p className="text-lg">{weekly?.trend || "No trend data available yet."}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Summary</p>
              <p className="text-sm leading-relaxed">
                {weekly?.summary || "Keep practicing to generate your first weekly summary."}
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/10 p-4">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Award size={14} /> Strengths
                </p>
                <ul className="space-y-2">
                  {(weekly?.strengths || []).length > 0 ? weekly!.strengths.map((item: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">•</span> {item}
                    </li>
                  )) : <li className="text-sm text-muted-foreground">Not enough data to determine strengths.</li>}
                </ul>
              </div>
              
              <div className="rounded-2xl bg-amber-500/5 border border-amber-500/10 p-4">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Target size={14} /> Focus Areas
                </p>
                <ul className="space-y-2">
                  {(weekly?.focusAreas || []).length > 0 ? weekly!.focusAreas.map((item: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span> {item}
                    </li>
                  )) : <li className="text-sm text-muted-foreground">Not enough data to determine focus areas.</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-sidebar text-sidebar-foreground p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="font-serif text-2xl font-medium mb-4 text-sidebar-primary">Fluency Tip</h2>
            <p className="text-sm leading-relaxed text-sidebar-foreground/80 mb-6">
              Don't worry about speaking fast. Speaking clearly at a normal pace sounds more fluent than rushing and stumbling.
            </p>
          </div>
          <div className="rounded-2xl bg-sidebar-accent/50 p-4">
            <p className="text-xs text-sidebar-foreground/60 mb-1">Current Goal</p>
            <p className="text-sm font-semibold">Practice for 15 minutes today</p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-sidebar-foreground/10">
              <div className="h-full bg-sidebar-primary rounded-full" style={{ width: '45%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode, label: string, value: number, bg: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
        {icon}
      </div>
      <div>
        <p className="text-3xl font-serif text-foreground">{value}</p>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
      </div>
    </div>
  );
}
