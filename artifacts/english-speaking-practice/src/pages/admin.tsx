import { useCallback, useEffect, useState } from 'react';
import { Link } from 'wouter';
import {
  Activity, ArrowLeft, BookOpen, Check, CreditCard, FileText, Loader2,
  RefreshCw, Save, Settings, ShieldCheck, Users, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const api = (path: string) => `${basePath}/api${path}`;

type Overview = {
  counts: Record<string, number>;
  services: Record<string, boolean>;
};
type UserRow = {
  id: string;
  clerk_user_id: string | null;
  email: string | null;
  created_at: string;
  plan: string;
  status: string;
  provider: string | null;
  selected_plan: string | null;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  provider_subscription_id: string | null;
  text_messages: number;
  voice_seconds: number;
};
type LegalContent = {
  title: string;
  description: string;
  sections: Array<{ heading: string; body: string }>;
};
type SupportContent = {
  email: string;
  whatsappDisplay: string;
  whatsappNumber: string;
  announcement: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(api(path), {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

function date(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—';
}

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'content', label: 'Legal', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;
type Tab = typeof tabs[number]['id'];

export function Admin() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [tab, setTab] = useState<Tab>('dashboard');
  const [error, setError] = useState('');

  useEffect(() => {
    request<{ email: string }>('/admin/me')
      .then((data) => { setAuthorized(true); setOwnerEmail(data.email); })
      .catch((err) => { setAuthorized(false); setError(err.message); });
  }, []);

  if (authorized === null) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>;
  }
  if (!authorized) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background p-5">
        <div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto text-primary" size={42} />
          <h1 className="mt-5 font-serif text-3xl">Owner access required</h1>
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
          <p className="mt-2 text-sm text-muted-foreground">Sign in with the verified owner email: hello@rllora.com</p>
          <Button asChild className="mt-6 w-full"><Link href="/sign-in">Sign in as owner</Link></Button>
          <Button asChild variant="ghost" className="mt-2 w-full"><Link href="/home">Return to app</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-muted/30">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><ShieldCheck size={20} /></div>
            <div><h1 className="font-semibold">Rllora AI Admin</h1><p className="text-xs text-muted-foreground">{ownerEmail} · Owner</p></div>
          </div>
          <Button asChild variant="outline" size="sm"><Link href="/home"><ArrowLeft size={15} /> App</Link></Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 md:grid-cols-[210px_1fr] md:px-8 md:py-8">
        <nav className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible">
          {tabs.map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${tab === item.id ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-secondary'}`}>
              <item.icon size={17} /> {item.label}
            </button>
          ))}
        </nav>
        <main className="min-w-0">
          {tab === 'dashboard' && <Dashboard />}
          {tab === 'users' && <UsersPanel />}
          {tab === 'billing' && <BillingPanel />}
          {tab === 'content' && <ContentPanel />}
          {tab === 'settings' && <SettingsPanel />}
        </main>
      </div>
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return <div className="mb-6"><h2 className="font-serif text-3xl">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>;
}

function Dashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { request<Overview>('/admin/overview').then(setData).catch((err) => setError(err.message)); }, []);
  if (error) return <ErrorCard message={error} />;
  if (!data) return <Loading />;
  const metrics = [
    ['Total profiles', data.counts.users],
    ['Signed-in users', data.counts.signedInUsers],
    ['Active subscriptions', data.counts.activeSubscriptions],
    ['Active trials', data.counts.activeTrials],
    ['Pending payments', data.counts.pendingPayments],
    ['Billing events (30d)', data.counts.billingEvents30Days],
  ];
  return (
    <>
      <SectionHeading title="Dashboard" description="Users, subscriptions, and service readiness at a glance." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map(([label, value]) => <div key={label} className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>)}
      </div>
      <div className="mt-6 rounded-2xl border bg-card p-5">
        <h3 className="font-semibold">Service status</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Object.entries(data.services).map(([name, ready]) => (
            <div key={name} className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
              <span className="text-sm capitalize">{name.replace(/([A-Z])/g, ' $1')}</span>
              <span className={`flex items-center gap-1 text-xs font-medium ${ready ? 'text-emerald-700' : 'text-amber-700'}`}>{ready ? <Check size={15} /> : <XCircle size={15} />}{ready ? 'Configured' : 'Setup needed'}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function UsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    setLoading(true); setError('');
    request<{ users: UserRow[] }>(`/admin/users?search=${encodeURIComponent(search)}`)
      .then((data) => setUsers(data.users)).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [search]);
  useEffect(load, [load]);
  const grant = async (user: UserRow) => {
    const raw = window.prompt('How many days of Premium access?', '30');
    if (!raw) return;
    try { await request(`/admin/users/${user.id}/manual-trial`, { method: 'POST', body: JSON.stringify({ days: Number(raw) }) }); load(); }
    catch (err) { window.alert(err instanceof Error ? err.message : 'Update failed'); }
  };
  const revoke = async (user: UserRow) => {
    if (!window.confirm('Revoke manually granted Premium access?')) return;
    try { await request(`/admin/users/${user.id}/manual-trial`, { method: 'DELETE' }); load(); }
    catch (err) { window.alert(err instanceof Error ? err.message : 'Update failed'); }
  };
  return (
    <>
      <SectionHeading title="Users" description="Review accounts, activity, and manually grant trial access." />
      <div className="mb-4 flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} placeholder="Search user or Clerk ID" className="min-w-0 flex-1 rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary" />
        <Button variant="outline" onClick={load}><RefreshCw size={16} /></Button>
      </div>
      {error && <ErrorCard message={error} />}
      {loading ? <Loading /> : (
        <div className="space-y-3">
          {users.map((user) => {
            const providerBacked = Boolean(user.provider_subscription_id || user.provider);
            const premium = user.plan === 'premium' && ['active', 'trialing', 'cancel_pending'].includes(user.status);
            return (
              <article key={user.id} className="rounded-2xl border bg-card p-4 md:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold">{user.email || (user.clerk_user_id ? 'Signed-in user' : 'Guest profile')}</p><span className={`rounded-full px-2 py-0.5 text-[11px] ${premium ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{premium ? `${user.status} Premium` : 'Free'}</span></div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{user.id}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Joined {date(user.created_at)}</span><span>{user.text_messages} messages</span><span>{Math.round(user.voice_seconds / 60)} voice min</span>
                      {user.provider && <span className="capitalize">{user.provider} · {user.selected_plan || 'plan'}</span>}
                      {user.trial_ends_at && <span>Trial ends {date(user.trial_ends_at)}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {!providerBacked && <Button size="sm" variant="outline" onClick={() => grant(user)}>Grant trial</Button>}
                    {!providerBacked && premium && <Button size="sm" variant="destructive" onClick={() => revoke(user)}>Revoke</Button>}
                  </div>
                </div>
              </article>
            );
          })}
          {!users.length && <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">No users found.</div>}
        </div>
      )}
    </>
  );
}

function BillingPanel() {
  const [data, setData] = useState<{ subscriptions: any[]; events: any[] } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { request<any>('/admin/billing').then(setData).catch((err) => setError(err.message)); }, []);
  if (error) return <ErrorCard message={error} />;
  if (!data) return <Loading />;
  return (
    <>
      <SectionHeading title="Billing" description="Provider subscriptions, pending payments, and verified webhook events." />
      <div className="rounded-2xl border bg-card p-5">
        <h3 className="font-semibold">Subscriptions and trials</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="pb-3">User</th><th>Provider</th><th>Plan</th><th>Status</th><th>Access until</th><th>Subscription ID</th></tr></thead>
            <tbody>{data.subscriptions.map((item) => <tr key={`${item.user_id}-${item.provider_subscription_id || item.status}`} className="border-t"><td className="py-3 font-mono text-xs">{item.user_id.slice(0, 10)}…</td><td className="capitalize">{item.provider || 'manual'}</td><td>{item.selected_plan || item.plan}</td><td>{item.status}</td><td>{date(item.trial_ends_at || item.current_period_ends_at)}</td><td className="max-w-[180px] truncate text-xs">{item.provider_subscription_id || item.pending_payment_id || '—'}</td></tr>)}</tbody>
          </table>
          {!data.subscriptions.length && <p className="py-6 text-center text-sm text-muted-foreground">No subscriptions or trials yet.</p>}
        </div>
      </div>
      <div className="mt-5 rounded-2xl border bg-card p-5">
        <h3 className="font-semibold">Recent billing events</h3>
        <div className="mt-4 space-y-2">{data.events.map((event) => <div key={event.id} className="flex flex-col justify-between gap-1 rounded-xl bg-muted/50 px-4 py-3 text-sm sm:flex-row"><span><span className="font-medium capitalize">{event.provider}</span> · {event.event_type}</span><span className="text-xs text-muted-foreground">{date(event.processed_at)}</span></div>)}</div>
        {!data.events.length && <p className="py-6 text-center text-sm text-muted-foreground">No billing webhook events yet.</p>}
      </div>
    </>
  );
}

function ContentPanel() {
  const [settings, setSettings] = useState<any>(null);
  const [document, setDocument] = useState<'privacy' | 'terms'>('privacy');
  const [saving, setSaving] = useState(false);
  const load = () => request<any>('/admin/settings').then(setSettings);
  useEffect(() => { load().catch(() => undefined); }, []);
  if (!settings) return <Loading />;
  const content: LegalContent = settings[document].value;
  const update = (next: LegalContent) => setSettings({ ...settings, [document]: { ...settings[document], value: next } });
  const save = async () => {
    setSaving(true);
    try { const result = await request(`/admin/settings/legal/${document}`, { method: 'PUT', body: JSON.stringify({ value: content }) }); setSettings({ ...settings, [document]: result }); }
    catch (err) { window.alert(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(false); }
  };
  return (
    <>
      <SectionHeading title="Legal content" description="Edit the public Privacy Policy and Terms of Service." />
      <div className="mb-4 flex gap-2">{(['privacy', 'terms'] as const).map((item) => <Button key={item} variant={document === item ? 'default' : 'outline'} onClick={() => setDocument(item)} className="capitalize">{item}</Button>)}</div>
      <div className="space-y-4 rounded-2xl border bg-card p-4 md:p-6">
        <Field label="Page title" value={content.title} onChange={(value) => update({ ...content, title: value })} />
        <Field label="Description" value={content.description} onChange={(value) => update({ ...content, description: value })} />
        {content.sections.map((section, index) => (
          <div key={index} className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase text-muted-foreground">Section {index + 1}</p>{content.sections.length > 1 && <button className="text-xs text-destructive" onClick={() => update({ ...content, sections: content.sections.filter((_, i) => i !== index) })}>Remove</button>}</div>
            <div className="mt-3 space-y-3">
              <Field label="Heading" value={section.heading} onChange={(value) => update({ ...content, sections: content.sections.map((item, i) => i === index ? { ...item, heading: value } : item) })} />
              <Field label="Body" multiline value={section.body} onChange={(value) => update({ ...content, sections: content.sections.map((item, i) => i === index ? { ...item, body: value } : item) })} />
            </div>
          </div>
        ))}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={() => update({ ...content, sections: [...content.sections, { heading: `Section ${content.sections.length + 1}`, body: '' }] })}>Add section</Button>
          <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Save {document}</Button>
        </div>
      </div>
    </>
  );
}

function SettingsPanel() {
  const [value, setValue] = useState<SupportContent | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { request<any>('/admin/settings').then((data) => setValue(data.support.value)); }, []);
  if (!value) return <Loading />;
  const save = async () => {
    setSaving(true);
    try { const result: any = await request('/admin/settings/support', { method: 'PUT', body: JSON.stringify({ value }) }); setValue(result.value); }
    catch (err) { window.alert(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(false); }
  };
  return (
    <>
      <SectionHeading title="App settings" description="Manage public support contacts and an optional announcement." />
      <div className="space-y-4 rounded-2xl border bg-card p-4 md:p-6">
        <Field label="Support email" value={value.email} onChange={(email) => setValue({ ...value, email })} />
        <Field label="WhatsApp display number" value={value.whatsappDisplay} onChange={(whatsappDisplay) => setValue({ ...value, whatsappDisplay })} />
        <Field label="WhatsApp link number (digits only)" value={value.whatsappNumber} onChange={(whatsappNumber) => setValue({ ...value, whatsappNumber })} />
        <Field label="Public announcement (optional)" multiline value={value.announcement} onChange={(announcement) => setValue({ ...value, announcement })} />
        <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">Secrets, API keys, authentication providers, and payment credentials are intentionally excluded from this panel. Their configured status is shown on the Dashboard.</p>
        <Button onClick={save} disabled={saving} className="w-full sm:w-auto">{saving ? <Loader2 className="animate-spin" /> : <Save />} Save settings</Button>
      </div>
    </>
  );
}

function Field({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  const className = "mt-1.5 w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";
  return <label className="block text-sm font-medium">{label}{multiline ? <textarea rows={5} className={className} value={value} onChange={(e) => onChange(e.target.value)} /> : <input className={className} value={value} onChange={(e) => onChange(e.target.value)} />}</label>;
}
function Loading() { return <div className="flex items-center justify-center rounded-2xl border bg-card p-12"><Loader2 className="animate-spin text-primary" /></div>; }
function ErrorCard({ message }: { message: string }) { return <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">{message}</div>; }