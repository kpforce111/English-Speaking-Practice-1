import { Link } from 'wouter';
import { useListRoleplayScenarios } from '@workspace/api-client-react';
import { PremiumGate } from '@/components/premium-gate';
import { Users, Briefcase, ShoppingBag, Plane, Stethoscope, Headphones, Coffee, ArrowRight } from 'lucide-react';

const ICONS: Record<string, React.ElementType> = {
  'job interview': Briefcase,
  'office': Briefcase,
  'shopping': ShoppingBag,
  'travel': Plane,
  'doctor': Stethoscope,
  'customer service': Headphones,
  'bpo': Headphones,
  'daily life': Coffee,
};

export function Roleplays() {
  return (
    <PremiumGate featureName="Roleplays">
      <RoleplaysList />
    </PremiumGate>
  );
}

function RoleplaysList() {
  const { data: scenariosData, isLoading, error } = useListRoleplayScenarios();
  const scenarios = (scenariosData as any)?.scenarios || (Array.isArray(scenariosData) ? scenariosData : null);

  return (
    <div className="flex h-full flex-col px-4 py-8 md:px-10 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users size={20} />
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">Real-World Scenarios</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-lg">
          Practice speaking in common situations. Choose a scenario below to start a conversation.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-40 rounded-3xl border border-border bg-muted/30 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-destructive/10 p-6 text-center text-destructive">
          <p>Failed to load scenarios.</p>
        </div>
      )}

      {scenarios && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((scenario: any) => {
            const Icon = ICONS[scenario.setting?.toLowerCase()] || Users;
            return (
              <Link 
                key={scenario.id} 
                href={`/roleplays/${scenario.id}`}
                className="group flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                      <Icon size={18} />
                    </div>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${
                      scenario.difficulty === 'Beginner' ? 'bg-emerald-500/10 text-emerald-600' :
                      scenario.difficulty === 'Intermediate' ? 'bg-amber-500/10 text-amber-600' :
                      'bg-rose-500/10 text-rose-600'
                    }`}>
                      {scenario.difficulty}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{scenario.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{scenario.description}</p>
                </div>
                <div className="mt-6 flex items-center text-sm font-semibold text-primary opacity-80 group-hover:opacity-100 transition-opacity">
                  Start practice <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
