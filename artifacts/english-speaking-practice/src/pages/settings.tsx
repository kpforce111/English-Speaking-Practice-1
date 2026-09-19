import { useClerk, useUser } from '@clerk/react';
import { Download, LogOut, Mail, MessageCircle, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export function Settings() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const [deleting, setDeleting] = useState(false);

  const exportData = async () => {
    const response = await fetch(`${basePath}/api/account/export`);
    if (!response.ok) throw new Error('Could not export account data');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rllora-account-data.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const deleteAccount = async () => {
    if (!window.confirm('Permanently delete your account, Premium link, progress, lessons, quotas, and reports? This cannot be undone.')) return;
    setDeleting(true);
    const response = await fetch(`${basePath}/api/account`, { method: 'DELETE' });
    if (response.ok) {
      window.location.assign(basePath || '/');
      return;
    }
    setDeleting(false);
    window.alert('Account deletion could not be completed. Please try again.');
  };

  return (
    <div className="practice-page p-5 md:p-10">
      <div className="page-content mx-auto max-w-2xl">
        <h1 className="font-serif text-3xl">Account settings</h1>
        <p className="mt-2 text-muted-foreground">Your Premium access and learning history follow this account on every device.</p>
        <section className="mt-8 rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-primary" />
            <div><p className="font-semibold">{user?.fullName || 'Rllora learner'}</p><p className="text-sm text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p></div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button variant="outline" onClick={exportData}><Download /> Export my data</Button>
            <Button variant="outline" onClick={() => signOut({ redirectUrl: basePath || '/' })}><LogOut /> Sign out</Button>
          </div>
        </section>
        <section className="mt-6 rounded-2xl border bg-card p-6">
          <h2 className="font-semibold">Help and support</h2>
          <p className="mt-2 text-sm text-muted-foreground">Contact the Rllora AI team for account, billing, or learning support.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Button variant="outline" asChild>
              <a href="mailto:hello@rllora.com"><Mail /> hello@rllora.com</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="https://wa.me/918850551703" target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp support</a>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">WhatsApp: +91 8850551703</p>
        </section>
        <section className="mt-6 rounded-2xl border border-destructive/25 bg-card p-6">
          <h2 className="font-semibold">Delete account</h2>
          <p className="mt-2 text-sm text-muted-foreground">Permanently removes your profile and all stored learning data. Cancel an active subscription first to stop future provider charges.</p>
          <Button className="mt-4" variant="destructive" disabled={deleting} onClick={deleteAccount}><Trash2 /> {deleting ? 'Deleting…' : 'Delete my account'}</Button>
        </section>
        <Button variant="ghost" className="mt-6" onClick={() => setLocation('/')}>Back to practice</Button>
      </div>
    </div>
  );
}