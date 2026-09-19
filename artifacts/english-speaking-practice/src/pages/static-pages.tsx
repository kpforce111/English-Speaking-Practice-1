import { Shield, FileText, Info, HelpCircle, Mail, MessageCircle } from 'lucide-react';
import { Link } from 'wouter';

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
  return (
    <PageContainer>
      <PageHeader 
        title="Privacy Policy" 
        icon={Shield} 
        description="How we handle your data, voice recordings, and AI interactions." 
      />
      <div className="prose prose-sm prose-gray dark:prose-invert max-w-none">
        <h3>1. Information We Collect</h3>
        <p>We collect basic account information and practice data (sentences spoken, minutes, active days) to provide the service and track your progress.</p>
        
        <h3>2. Audio and AI Processing</h3>
        <p>When you use our voice practice or roleplay features, your audio and text inputs are processed by our AI partners (including OpenAI and Replit integrations) to generate responses, transcripts, and feedback. <strong>Audio recordings are processed transiently and are not stored permanently by us.</strong> Transcripts of your conversations are saved to allow you to review your practice history and receive progress reports.</p>
        
        <h3>3. Data Retention</h3>
        <p>Your practice history is retained as long as your account is active. You may request account deletion at any time via the Support page, which will permanently remove your transcripts and progress data.</p>
        
        <h3>4. Subscriptions and Payments</h3>
        <p>We use third-party payment processors (Stripe and Razorpay). We do not store your full credit card number or UPI details on our servers.</p>
      </div>
    </PageContainer>
  );
}

export function Terms() {
  return (
    <PageContainer>
      <PageHeader 
        title="Terms of Service" 
        icon={FileText} 
        description="Rules and guidelines for using Rllora AI."
      />
      <div className="prose prose-sm prose-gray dark:prose-invert max-w-none">
        <h3>1. Acceptance of Terms</h3>
        <p>By using Rllora AI, you agree to these terms. If you do not agree, do not use the app.</p>
        
        <h3>2. Subscriptions, Auto-Renewal, and Cancellation</h3>
        <p>Premium features require an active subscription. <strong>Subscriptions automatically renew</strong> at the end of each billing period (monthly, quarterly, or yearly) unless canceled. You may cancel your subscription at any time through your account settings or by contacting support. Cancellation stops future charges but does not refund past periods.</p>
        
        <h3>3. Acceptable Use</h3>
        <p>You agree to use the AI practice tools for language learning purposes only. Do not attempt to bypass rate limits or misuse the AI models to generate prohibited content.</p>
        
        <h3>4. Disclaimers</h3>
        <p>Rllora AI is an educational tool. <strong>It does not provide medical, legal, or emergency advice.</strong> Roleplay scenarios (e.g., "Doctor") are for language practice only.</p>
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
  return (
    <PageContainer>
      <PageHeader 
        title="Support" 
        icon={HelpCircle} 
        description="Need help with your account, billing, or practice?" 
      />
      
      <div className="mx-auto grid max-w-xl gap-4 sm:grid-cols-2">
        <a href="mailto:hello@rllora.com" className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm transition-colors hover:border-primary/40 hover:bg-secondary/40">
          <Mail className="mx-auto text-primary" size={24} />
          <h2 className="mt-4 font-semibold">Email support</h2>
          <p className="mt-2 text-sm text-muted-foreground">hello@rllora.com</p>
        </a>
        <a href="https://wa.me/918850551703" target="_blank" rel="noreferrer" className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm transition-colors hover:border-primary/40 hover:bg-secondary/40">
          <MessageCircle className="mx-auto text-primary" size={24} />
          <h2 className="mt-4 font-semibold">WhatsApp support</h2>
          <p className="mt-2 text-sm text-muted-foreground">+91 8850551703</p>
        </a>
        <p className="text-center text-xs text-muted-foreground sm:col-span-2">
          For billing changes, you can also manage your subscription from the <Link href="/pricing" className="underline">Pricing page</Link>.
        </p>
      </div>
    </PageContainer>
  );
}
