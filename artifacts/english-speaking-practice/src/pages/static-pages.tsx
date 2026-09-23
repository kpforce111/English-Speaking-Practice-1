import { useEffect, useState } from 'react';
import { Shield, FileText, Info, HelpCircle, Mail, MessageCircle, ReceiptIndianRupee } from 'lucide-react';
import { Link } from 'wouter';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

type LegalContent = {
  title: string;
  description: string;
  sections: Array<{ heading: string; body: string }>;
};

function useManagedContent<T>(path: string, fallback: T) {
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    fetch(`${basePath}/api/content/${path}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setValue(data.value))
      .catch(() => undefined);
  }, [path]);
  return value;
}

const privacyFallback: LegalContent = {
  title: 'Privacy Policy',
  description: 'How we handle your data, voice recordings, and AI interactions.',
  sections: [
    { heading: '1. Information We Collect', body: 'We collect basic account information and practice data (sentences spoken, minutes, active days) to provide the service and track your progress.' },
    { heading: '2. Audio and AI Processing', body: 'When you use our voice practice or roleplay features, your audio and text inputs are processed by our AI partners (including OpenAI and Replit integrations) to generate responses, transcripts, and feedback. Audio recordings are processed transiently and are not stored permanently by us. Transcripts of your conversations are saved to allow you to review your practice history and receive progress reports.' },
    { heading: '3. Data Retention', body: 'Your practice history is retained as long as your account is active. You may request account deletion at any time via the Support page, which will permanently remove your transcripts and progress data.' },
    { heading: '4. Subscriptions and Payments', body: 'Payments are temporarily paused while PhonePe merchant approval and integration are completed. We do not store full card numbers or UPI credentials on our servers.' },
  ],
};

const termsFallback: LegalContent = {
  title: 'Terms of Service',
  description: 'Rules and guidelines for using Rllora AI.',
  sections: [
    { heading: '1. Acceptance of Terms', body: 'By using Rllora AI, you agree to these terms. If you do not agree, do not use the app.' },
    { heading: '2. Subscriptions, Auto-Renewal, and Cancellation', body: 'Premium features require an active subscription. Subscriptions automatically renew at the end of each billing period (monthly, quarterly, or yearly) unless canceled. You may cancel your subscription at any time through your account settings or by contacting support. Cancellation stops future charges but does not refund past periods.' },
    { heading: '3. Acceptable Use', body: 'You agree to use the AI practice tools for language learning purposes only. Do not attempt to bypass rate limits or misuse the AI models to generate prohibited content.' },
    { heading: '4. Disclaimers', body: 'Rllora AI is an educational tool. It does not provide medical, legal, or emergency advice. Roleplay scenarios are for language practice only.' },
  ],
};

const refundFallback: LegalContent = {
  title: 'Refund Policy',
  description: 'How cancellations, paid trials, and subscription charges are handled.',
  sections: [
    { heading: '1. Subscription Cancellation', body: 'You may cancel your subscription at any time through your account settings or by contacting Support. Cancellation stops the subscription from renewing at the end of your current billing period. You will continue to have access to Premium features until that paid period ends.' },
    { heading: '2. Two-Day Trial', body: 'The two-day trial costs ₹5 and, once payment checkout is available and payment is confirmed, unlocks both learning boxes. Trial checkout is currently unavailable. After it ends, you may explicitly choose and subscribe to either learning box; there is no automatic subscription.' },
    { heading: '3. Monthly, Quarterly, and Yearly Plans', body: 'Charges for monthly, quarterly, and yearly plans are non-refundable once a billing period has started. If you cancel after a renewal or initial subscription charge, no full or partial refund, credit, or prorated refund will be issued for the unused portion of that billing period. Your Premium access will remain available until the end of the paid period.' },
    { heading: '4. Billing Problems and Exceptional Reviews', body: 'If you believe you were charged more than once, charged after a timely cancellation, or charged without authorization, contact us through the Support page as soon as possible. We will review verified billing errors and may issue a refund where appropriate. Nothing in this policy limits any refund rights required by applicable law.' },
    { heading: '5. How to Request a Review', body: 'Submit your request through the Rllora AI Support page with the account used for the purchase, the charge date, the plan, and a brief explanation. Do not include your full card number, UPI PIN, password, or other sensitive payment credentials.' },
  ],
};

function PageHeader({ title, icon: Icon, description }: { title: string, icon: any, description: string }) {
  return (
    <div className="mb-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground mb-6">
        <Icon size={24} />
      </div>
      <h1 className="font-serif text-3xl font-medium tracking-tight mb-3">{title}</h1>
      <p className="text-muted-foreground max-w-md mx-auto">{description}</p>
    </div>
  );
}

function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col px-4 py-12 md:px-10 max-w-3xl mx-auto w-full">
      {children}
    </div>
  );
}

export function Privacy() {
  const content = useManagedContent<LegalContent>('legal/privacy', privacyFallback);
  return (
    <PageContainer>
      <PageHeader 
        title={content.title}
        icon={Shield} 
        description={content.description}
      />
      <div className="prose prose-sm prose-gray dark:prose-invert max-w-none">
        {content.sections.map((section) => <section key={section.heading}><h3>{section.heading}</h3><p>{section.body}</p></section>)}
      </div>
    </PageContainer>
  );
}

export function Terms() {
  const content = useManagedContent<LegalContent>('legal/terms', termsFallback);
  return (
    <PageContainer>
      <PageHeader 
        title={content.title}
        icon={FileText} 
        description={content.description}
      />
      <div className="prose prose-sm prose-gray dark:prose-invert max-w-none">
        {content.sections.map((section) => <section key={section.heading}><h3>{section.heading}</h3><p>{section.body}</p></section>)}
      </div>
    </PageContainer>
  );
}

export function Refund() {
  const content = useManagedContent<LegalContent>('legal/refund', refundFallback);
  return (
    <PageContainer>
      <PageHeader
        title={content.title}
        icon={ReceiptIndianRupee}
        description={content.description}
      />
      <div className="prose prose-sm prose-gray dark:prose-invert max-w-none">
        {content.sections.map((section) => <section key={section.heading}><h3>{section.heading}</h3><p>{section.body}</p></section>)}
      </div>
    </PageContainer>
  );
}

export function About() {
  return (
    <PageContainer>
      <PageHeader 
        title="About Rllora AI"
        icon={Info} 
        description="Our mission to make spoken English natural and confident." 
      />
      <div className="prose prose-sm prose-gray dark:prose-invert max-w-none text-center mx-auto">
        <p className="lead text-lg">For many, English is a second language learned from textbooks, not conversation. We built Rllora AI to change that.</p>
        <p>Rllora AI is designed for learners who think in Roman Hindi or Urdu but want to speak English without hesitating or translating in their heads. By practicing a little every day in a pressure-free environment with Rllora AI, fluency starts to feel natural.</p>
        <p>We focus on what matters: clear feedback, real-world scenarios, and consistent daily habits.</p>
        <div className="mt-12 flex justify-center">
          <Link href="/pricing" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90">
            Start Your Journey
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}

export function Support() {
  const support = useManagedContent('support', {
    email: 'hello@rllora.com',
    whatsappDisplay: '+91 8850551703',
    whatsappNumber: '918850551703',
    announcement: '',
  });
  return (
    <PageContainer>
      <PageHeader 
        title="Support" 
        icon={HelpCircle} 
        description="Need help with your account, billing, or practice?" 
      />
      
      <div className="mx-auto grid max-w-xl gap-4 sm:grid-cols-2">
        {support.announcement && <p className="rounded-xl bg-primary/10 p-3 text-center text-sm text-primary sm:col-span-2">{support.announcement}</p>}
        <a href={`mailto:${support.email}`} className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm transition-colors hover:border-primary/40 hover:bg-secondary/40">
          <Mail className="mx-auto text-primary" size={24} />
          <h2 className="mt-4 font-semibold">Email support</h2>
          <p className="mt-2 text-sm text-muted-foreground">{support.email}</p>
        </a>
        <a href={`https://wa.me/${support.whatsappNumber}`} target="_blank" rel="noreferrer" className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm transition-colors hover:border-primary/40 hover:bg-secondary/40">
          <MessageCircle className="mx-auto text-primary" size={24} />
          <h2 className="mt-4 font-semibold">WhatsApp support</h2>
          <p className="mt-2 text-sm text-muted-foreground">{support.whatsappDisplay}</p>
        </a>
        <p className="text-center text-xs text-muted-foreground sm:col-span-2">
          For billing changes, you can also manage your subscription from the <Link href="/pricing" className="underline">Pricing page</Link>.
        </p>
      </div>
    </PageContainer>
  );
}
