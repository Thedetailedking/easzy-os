import Link from "next/link";

export default function SettingsHub() {
  return (
    <main className="md:ml-64 pt-20 pb-24 md:pt-16 md:pb-8 min-h-screen bg-surface-subtle px-gutter-mobile md:px-gutter-desktop">
      <div className="max-w-container-max mx-auto space-y-8 md:space-y-10">
        
        {/* Page Header */}
        <section className="mb-6 md:mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="space-y-2">
            <h2 className="text-headline-lg font-headline-lg text-on-surface">
              Settings & Preferences
            </h2>
            <p className="text-body-md font-body-md text-secondary max-w-2xl">
              Manage your account, billing, notifications, and AI profiles from one central hub.
            </p>
          </div>
        </section>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Voice & Profile Config */}
          <Link href="/settings/profile" className="bg-surface-main border border-border-subtle rounded-xl p-6 hover:border-primary transition-colors hover:shadow-xl hover:-translate-y-[2px] duration-300 group cursor-pointer block">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-[24px]">manage_accounts</span>
            </div>
            <h3 className="text-headline-md font-headline-md mb-2">Voice & Profile Configuration</h3>
            <p className="text-body-sm text-secondary">Set up your Core Identity, Voice Dynamics, Training Data, and manage your AI Personas.</p>
          </Link>

          {/* Account & Billing */}
          <div className="bg-surface-main border border-border-subtle rounded-xl p-6 hover:border-border-hover transition-colors opacity-70 cursor-not-allowed">
            <div className="w-12 h-12 bg-surface-variant rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-secondary text-[24px]">credit_card</span>
            </div>
            <h3 className="text-headline-md font-headline-md mb-2">Account & Billing</h3>
            <p className="text-body-sm text-secondary">Manage your subscription, payment methods, and billing history.</p>
            <span className="mt-4 inline-block text-[10px] font-jetbrains-mono bg-surface-variant text-secondary px-2 py-1 rounded">COMING SOON</span>
          </div>

          {/* Notifications */}
          <div className="bg-surface-main border border-border-subtle rounded-xl p-6 hover:border-border-hover transition-colors opacity-70 cursor-not-allowed">
            <div className="w-12 h-12 bg-surface-variant rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-secondary text-[24px]">notifications</span>
            </div>
            <h3 className="text-headline-md font-headline-md mb-2">Notifications</h3>
            <p className="text-body-sm text-secondary">Configure email and push notification preferences for drafts and schedules.</p>
            <span className="mt-4 inline-block text-[10px] font-jetbrains-mono bg-surface-variant text-secondary px-2 py-1 rounded">COMING SOON</span>
          </div>
          
          {/* Integrations */}
          <div className="bg-surface-main border border-border-subtle rounded-xl p-6 hover:border-border-hover transition-colors opacity-70 cursor-not-allowed">
            <div className="w-12 h-12 bg-surface-variant rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-secondary text-[24px]">cable</span>
            </div>
            <h3 className="text-headline-md font-headline-md mb-2">Integrations</h3>
            <p className="text-body-sm text-secondary">Connect your social media accounts for automatic publishing.</p>
            <span className="mt-4 inline-block text-[10px] font-jetbrains-mono bg-surface-variant text-secondary px-2 py-1 rounded">COMING SOON</span>
          </div>
        </div>

      </div>
    </main>
  );
}
