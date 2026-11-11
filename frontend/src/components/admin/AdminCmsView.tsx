import React, { useState, useEffect, useRef } from 'react';
import { Company, ContentModule, InterviewReport } from '@/types';
import { fetchAdminCompaniesApi, fetchModerationReportsApi, fetchPendingPaymentsApi, fetchSupportRequestsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { ContentBuilder } from '@/components/admin/ContentBuilder';
import { CompanyHubManager } from '@/components/admin/CompanyHubManager';
import { SectionPackEditor } from '@/components/admin/SectionPackEditor';
import { CouponsManager } from '@/components/admin/CouponsManager';
import { OverviewTab } from '@/components/admin/OverviewTab';
import { OrdersTab } from '@/components/admin/OrdersTab';
import { UsersTab } from '@/components/admin/UsersTab';
import { ReportsTab } from '@/components/admin/ReportsTab';
import { OffersTab } from '@/components/admin/OffersTab';
import { GuaranteeTab } from '@/components/admin/GuaranteeTab';
import { RecruitersTab } from '@/components/admin/RecruitersTab';
import { ExperimentsTab } from '@/components/admin/ExperimentsTab';
import { ThreeTStatusTab } from '@/components/admin/ThreeTStatusTab';
import { CodingPracticeTab } from '@/components/admin/CodingPracticeTab';
import { ClientErrorsTab } from '@/components/admin/ClientErrorsTab';
import { StoreAdminTab } from '@/components/admin/StoreAdminTab';
import { CoinsAdminTab } from '@/components/admin/CoinsAdminTab';
import { FestivalTab } from '@/components/admin/FestivalTab';
import { AnalyticsTab } from '@/components/admin/AnalyticsTab';
import { SettingsTab } from '@/components/admin/SettingsTab';
import { PaymentVerificationsTab } from '@/components/admin/PaymentVerificationsTab';
import { DropsTab } from '@/components/admin/DropsTab';
import { NotificationsTab } from '@/components/admin/NotificationsTab';
import BroadcastTab from '@/components/admin/BroadcastTab';
import { SkillTestTab } from '@/components/admin/SkillTestTab';
import { EmailTab } from '@/components/admin/EmailTab';
import { DrivesTab } from '@/components/admin/DrivesTab';
import { SupportInboxTab } from '@/components/admin/SupportInboxTab';
import { MessageLogTab } from '@/components/admin/MessageLogTab';
import {
  BookOpen, Building2, BarChart3, ClipboardList, FileText, Layers, LayoutDashboard,
  LogOut, Mail, RefreshCw, Settings2, ShoppingBag, Ticket, Users, ExternalLink, Wallet,
GraduationCap, Award, Zap, BellRing, Send, BrainCircuit, Newspaper, BadgeCheck, Briefcase, FlaskConical, ShieldCheck, ListChecks, Inbox, ScrollText, Sparkles, Code2, Bug, Gift, Coins } from 'lucide-react';
import { AdminCoursesTab } from '@/components/admin/course/AdminCoursesTab';
import { AdminCertificatesTab } from '@/components/admin/course/AdminCertificatesTab';
import { AdminXpTab } from '@/components/admin/course/AdminXpTab';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { AccountMenu } from '@/components/layout/AccountMenu';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

type TabId = 'overview' | 'orders' | 'payments' | 'users' | 'analytics' | 'hub' | 'content' | 'pack' | 'drops' | 'coupons' | 'courses' | 'certificates' | 'xp' | 'skilltest' | 'drives' | 'reports' | 'offers' | 'guarantee' | 'recruiters' | 'experiments' | 'threet' | 'festival' | 'emails' | 'notifications' | 'broadcast' | 'settings' | 'support' | 'messagelog' | 'coding' | 'errors' | 'store' | 'coins';
type SectionId = 'home' | 'students' | 'sales' | 'content' | 'practice' | 'messaging' | 'settings';

/**
 * Seven sections instead of 27 loose tabs (PROFESSIONAL_PLATFORM_PLAN §9).
 * The sidebar lists sections; the open section's pages are the sub-tabs under
 * the header. Retired in the same pass: Hero Posters (nothing rendered them)
 * and the old Study Plan (replaced by the Train · Test · Track prep plan).
 */
const SECTIONS: { id: SectionId; label: string; icon: any; hint: string }[] = [
  { id: 'home', label: 'Home', icon: LayoutDashboard, hint: 'Today’s numbers and what needs you' },
  { id: 'students', label: 'Students', icon: Users, hint: 'Accounts, certificates, XP, claims' },
  { id: 'sales', label: 'Sales', icon: Wallet, hint: 'Orders, payments, coupons' },
  { id: 'content', label: 'Content', icon: BookOpen, hint: 'Companies, courses, tests, feed' },
  { id: 'practice', label: 'Practice', icon: ClipboardList, hint: 'Coding practice, mock drives, reports, offers, recruiters' },
  { id: 'messaging', label: 'Messaging', icon: Mail, hint: 'Support, email, notifications' },
  { id: 'settings', label: 'Settings', icon: Settings2, hint: 'Site settings and experiments' },
];

const NAV: { id: TabId; label: string; icon: any; section: SectionId }[] = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, section: 'home' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, section: 'home' },
  { id: 'users', label: 'Users & access', icon: Users, section: 'students' },
  { id: 'certificates', label: 'Certificates', icon: Award, section: 'students' },
  { id: 'xp', label: 'XP ledger', icon: Zap, section: 'students' },
  { id: 'guarantee', label: 'Guarantee claims', icon: ShieldCheck, section: 'students' },
  { id: 'orders', label: 'Orders', icon: ShoppingBag, section: 'sales' },
  { id: 'payments', label: 'Payment verify', icon: Wallet, section: 'sales' },
  { id: 'coupons', label: 'Coupons & pricing', icon: Ticket, section: 'sales' },
  { id: 'festival', label: 'Diwali sale', icon: Sparkles, section: 'sales' },
  { id: 'hub', label: 'Companies', icon: Building2, section: 'content' },
  { id: 'threet', label: '3T status', icon: ListChecks, section: 'content' },
  { id: 'content', label: 'Company content', icon: BookOpen, section: 'content' },
  { id: 'pack', label: 'Pack editor', icon: Layers, section: 'content' },
  { id: 'courses', label: 'Courses', icon: GraduationCap, section: 'content' },
  { id: 'skilltest', label: 'Skill tests', icon: BrainCircuit, section: 'content' },
  { id: 'drops', label: 'Drops', icon: Newspaper, section: 'content' },
  { id: 'coding', label: 'Coding practice', icon: Code2, section: 'practice' },
  { id: 'coins', label: 'TiE Coins', icon: Coins, section: 'practice' },
  { id: 'store', label: 'Rewards & store', icon: Gift, section: 'practice' },
  { id: 'drives', label: 'Mock drives', icon: ClipboardList, section: 'practice' },
  { id: 'reports', label: 'Candidate reports', icon: FileText, section: 'practice' },
  { id: 'offers', label: 'Offer wall', icon: BadgeCheck, section: 'practice' },
  { id: 'recruiters', label: 'Recruiters', icon: Briefcase, section: 'practice' },
  { id: 'support', label: 'Support inbox', icon: Inbox, section: 'messaging' },
  { id: 'emails', label: 'Email', icon: Mail, section: 'messaging' },
  { id: 'notifications', label: 'App notifications', icon: BellRing, section: 'messaging' },
  { id: 'broadcast', label: 'Broadcast', icon: Send, section: 'messaging' },
  { id: 'messagelog', label: 'Message log', icon: ScrollText, section: 'messaging' },
  { id: 'settings', label: 'Site settings', icon: Settings2, section: 'settings' },
  { id: 'experiments', label: 'Experiments', icon: FlaskConical, section: 'settings' },
  { id: 'errors', label: 'Site errors', icon: Bug, section: 'settings' },
];

const isTab = (v: string): v is TabId => NAV.some((n) => n.id === v);

export const AdminCmsView: React.FC = () => {
  const { user, logout } = useAuth();
  // Deep links: #tab=payments opens that page. Read during the first render
  // (the admin only ever renders on the client, after the auth check) so the
  // URL-writing effect below can never overwrite the link before it is read.
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window === 'undefined') return 'overview';
    const fromHash = new URLSearchParams(window.location.hash.slice(1)).get('tab') || '';
    return isTab(fromHash) ? fromHash : 'overview';
  });
  const [companiesList, setCompaniesList] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('comp-1');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [packModule, setPackModule] = useState<ContentModule | null>(null);
  const [reports, setReports] = useState<InterviewReport[]>([]);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [openSupportCount, setOpenSupportCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const comps = await fetchAdminCompaniesApi();
      if (comps && comps.length > 0) {
        setCompaniesList(comps);
        if (!comps.find((c) => c.id === selectedCompanyId)) {
          setSelectedCompanyId(comps[0].id);
        }
        const mods = comps.find((c) => c.id === selectedCompanyId)?.modules || (comps[0]?.modules || []);
        if (mods.length > 0) {
          setSelectedModuleId((prev) => (prev && mods.find((m) => m.id === prev) ? prev : mods[0].id));
        } else {
          setSelectedModuleId('');
        }
      }
    } catch {}
    try {
      const data = await fetchModerationReportsApi();
      setReports(data);
    } catch {}
    try {
      const data = await fetchPendingPaymentsApi();
      setPendingPaymentsCount((data.pending || []).length);
    } catch {}
    try {
      const data = await fetchSupportRequestsApi();
      setOpenSupportCount(data.requests.filter((r) => r.status === 'open').length);
    } catch {}
    setIsLoading(false);
  };

  // `loadData` reads the auth token, so it must be in a dependency or a refresh
  // triggered while the session was still loading would silently render the
  // signed-out view. A ref keeps the identity stable so this does not re-run in
  // a loop while the token is still resolving.
  const loadDataRef = useRef(loadData);
  useEffect(() => { loadDataRef.current = loadData; });
  useEffect(() => {
    loadDataRef.current();
  }, []);

  // The hash follows the admin around, so a refresh or a shared link lands on
  // the same page.
  useEffect(() => {
    window.history.replaceState(window.history.state, '', `#tab=${activeTab}`);
  }, [activeTab]);

  const selectedCompany = companiesList.find((c) => c.id === selectedCompanyId) || companiesList[0];
  const modules = selectedCompany?.modules || [];
  const selectedModule = modules.find((m) => m.id === selectedModuleId) || modules[0] || null;

  const handlePackOpen = (mod: ContentModule) => {
    setPackModule(mod);
    setSelectedModuleId(mod.id);
    setActiveTab('pack');
  };

  const pendingReports = reports.filter((r) => r.status === 'pending_review');

  const signOut = async () => {
    await logout();
    window.location.href = '/admin/login';
  };

  const badgeFor = (id: TabId) => {
    if (id === 'reports') return pendingReports.length;
    if (id === 'payments') return pendingPaymentsCount;
    if (id === 'support') return openSupportCount;
    return null;
  };
  const sectionBadge = (sid: SectionId) =>
    NAV.filter((n) => n.section === sid).reduce((sum, n) => sum + (badgeFor(n.id) || 0), 0);

  const active = NAV.find((n) => n.id === activeTab) || NAV[0];
  const activeSection = SECTIONS.find((sct) => sct.id === active.section) || SECTIONS[0];
  const sectionTabs = NAV.filter((n) => n.section === active.section);
  // Re-opening a section returns to the page you last had open in it.
  const lastInSection = useRef<Partial<Record<SectionId, TabId>>>({});
  useEffect(() => { lastInSection.current[active.section] = active.id; }, [active]);
  const openSection = (sid: SectionId) =>
    setActiveTab(lastInSection.current[sid] || NAV.find((n) => n.section === sid)!.id);

  const sectionButtons = (small: boolean) =>
    SECTIONS.map((sct) => {
      const Icon = sct.icon;
      const on = sct.id === active.section;
      const badge = sectionBadge(sct.id);
      return (
        <button
          key={sct.id}
          type="button"
          onClick={() => openSection(sct.id)}
          aria-current={on ? 'page' : undefined}
          className={`${small ? 'shrink-0' : 'w-full'} flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all text-left whitespace-nowrap ${
            on ? 'bg-brand-ink text-white shadow-sm' : 'text-gray-600 hover:bg-surface-hover hover:text-heading'
          }`}
        >
          <Icon className={`w-4 h-4 shrink-0 ${on ? 'text-amber-deep' : 'text-link'}`} />
          <span className="flex-1">
            {sct.label}
            {!small && <span className={`block text-xs font-medium ${on ? 'text-white/60' : 'text-gray-400'}`}>{sct.hint}</span>}
          </span>
          {badge > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${on ? 'bg-amber-400/20 text-amber-300' : 'bg-brand-ink text-white'}`}>{badge}</span>
          )}
        </button>
      );
    });

  const tabTitle = active.label;

  return (
    <div className="min-h-screen bg-app-warm flex font-sans">
      {/* Sidebar (lg+) */}
      <aside className="hidden lg:flex w-[250px] shrink-0 flex-col border-r border-line bg-white">
        <div className="p-5 border-b border-line">
          <p className="text-xs font-mono font-bold text-link uppercase tracking-[0.2em]">TiEEdu</p>
          <h1 className="text-lg font-extrabold text-heading tracking-tight">Admin Control Plane</h1>
          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-warning-soft text-amber-deep text-xs font-bold font-mono">OWNER BACKOFFICE</span>
        </div>
        <nav aria-label="Admin sections" className="flex-1 overflow-y-auto px-3 py-3 space-y-1">{sectionButtons(false)}</nav>
        <div className="p-4 border-t border-line space-y-3">
          <div className="flex items-center gap-2.5 px-1">
            <span className="w-8 h-8 rounded-full bg-brand-ink text-white flex items-center justify-center text-xs font-bold uppercase">
              {(user?.name || 'A').slice(0, 1)}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-heading truncate">{user?.name || 'Admin'}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <Link href="/" className="block px-3 py-2 rounded-xl text-xs font-bold text-link hover:bg-signal-soft flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5" /> View student site
          </Link>
          <button onClick={signOut} className="w-full px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-line px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="min-w-0">
              <p className="text-xs font-mono font-bold text-gray-400 uppercase">Admin / {activeSection.label} / {tabTitle}</p>
              <h2 className="text-base font-extrabold text-heading truncate">{tabTitle}</h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/*
                Identity and notifications, which this header had none of.

                `/admin/*` is excluded from the whole shell in `AppShell` - no site
                header, no tab bar - so before this the only thing an admin could
                see up top was a breadcrumb and "Sync store". On a phone that
                meant no way to tell who was signed in, and no notification bell
                at all. Both are the shared components rather than local copies,
                and the search field is deliberately absent: search does not
                belong in a CMS chrome, and the shell's search overlay is not
                mounted on this route anyway.
              */}
              <NotificationBell />
              <AccountMenu />
              <a href="/" target="_blank" rel="noreferrer" className="hidden sm:inline-flex px-3 py-2 rounded-xl text-xs font-bold text-link border border-signal/30 bg-white hover:bg-signal-soft items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> Student site
              </a>
              <button
                onClick={loadData}
                className="inline-flex px-3.5 py-2 bg-brand-ink hover:bg-brand-ink text-white rounded-xl text-xs font-bold items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Sync store
              </button>
            </div>
          </div>
          {/* Sections, on small screens (the sidebar takes over from lg). */}
          <nav aria-label="Admin sections" className="lg:hidden overflow-x-auto pb-2 -mx-4 px-4">
            <div className="flex gap-1.5">{sectionButtons(true)}</div>
          </nav>
          {/* The open section's pages. */}
          {sectionTabs.length > 1 && (
            <nav aria-label={`${activeSection.label} pages`} className="overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex gap-1.5">
                {sectionTabs.map((t) => {
                  const Icon = t.icon;
                  const on = t.id === activeTab;
                  const badge = badgeFor(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                      aria-current={on ? 'page' : undefined}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                        on ? 'bg-brand-ink text-white' : 'border border-line bg-white text-gray-600 hover:text-heading'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" /> {t.label}
                      {badge !== null && badge > 0 && <span className={`rounded-full px-1.5 text-xs ${on ? 'bg-white/20' : 'bg-brand-ink text-white'}`}>{badge}</span>}
                    </button>
                  );
                })}
              </div>
            </nav>
          )}
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
          <div className="max-w-[1700px] mx-auto">
          {/* One broken tab must not take the whole console down (PRACTICE_POLISH_PLAN.md §3.2). */}
          <ErrorBoundary area={`admin-${activeTab}`} resetKey={activeTab}>
            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && <OverviewTab companiesCount={companiesList.length} pendingReportsCount={pendingReports.length} />}

            {/* TAB: ORDERS */}
            {activeTab === 'orders' && <OrdersTab />}

            {/* TAB: PAYMENT VERIFY */}
            {activeTab === 'payments' && <PaymentVerificationsTab />}

            {/* TAB: USERS & ACCESS */}
            {activeTab === 'users' && <UsersTab companies={companiesList} />}

            {/* TAB: ANALYTICS */}
            {activeTab === 'analytics' && <AnalyticsTab companies={companiesList} />}

            {/* TAB: DROPS — the vertical career feed */}
            {activeTab === 'drops' && <DropsTab />}

            {/* TAB: COMPANY HUB */}
            {activeTab === 'hub' && (
              <CompanyHubManager
                companies={companiesList}
                onRefresh={loadData}
                onSelect={(id) => {
                  setSelectedCompanyId(id);
                  setActiveTab('content');
                }}
              />
            )}

            {/* TAB: CONTENT BUILDER */}
            {activeTab === 'content' && (
              <ContentBuilder
                companies={companiesList}
                selectedCompanyId={selectedCompanyId}
                onSelectCompany={(id) => {
                  setSelectedCompanyId(id);
                  const mods = companiesList.find((c) => c.id === id)?.modules || [];
                  setSelectedModuleId(mods.length ? mods[0].id : '');
                }}
                onEditModule={handlePackOpen}
                onRefresh={loadData}
              />
            )}

            {/* TAB: PACK EDITOR */}
            {activeTab === 'pack' && (
              <div className="space-y-5">
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold font-mono text-gray-500 uppercase">Company:</span>
                    <select
                      value={selectedCompany?.id || ''}
                      onChange={(e) => {
                        const cid = e.target.value;
                        setSelectedCompanyId(cid);
                        const mods = companiesList.find((c) => c.id === cid)?.modules || [];
                        setSelectedModuleId(mods.length ? mods[0].id : '');
                      }}
                      className="p-2.5 bg-app-warm border border-gray-200 rounded-xl text-xs font-bold font-mono text-brand-ink focus:outline-none focus:ring-2 focus:ring-signal"
                    >
                      {(companiesList || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold font-mono text-gray-500 uppercase">Module:</span>
                    <select
                      value={selectedModule?.id || ''}
                      onChange={(e) => setSelectedModuleId(e.target.value)}
                      className="p-2.5 bg-app-warm border border-gray-200 rounded-xl text-xs font-bold font-mono text-brand-ink focus:outline-none focus:ring-2 focus:ring-signal min-w-[260px]"
                    >
                      {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                    </select>
                  </div>
                </div>

                {selectedModule && selectedCompany ? (
                  <SectionPackEditor module={selectedModule} companyName={selectedCompany.name} onSaved={loadData} />
                ) : (
                  <div className="p-12 text-center bg-white border border-gray-200 rounded-3xl text-sm text-gray-400 italic">
                    No module selected — create a module first in Content Builder.
                  </div>
                )}
              </div>
            )}


        {activeTab === 'courses' && <AdminCoursesTab />}

        {activeTab === 'certificates' && <AdminCertificatesTab />}

        {activeTab === 'xp' && <AdminXpTab />}

        {activeTab === 'skilltest' && <SkillTestTab />}

        {activeTab === 'drives' && <DrivesTab />}

      {activeTab === 'coupons' && <CouponsManager />}

            {/* TAB: CANDIDATE REPORTS */}
            {activeTab === 'reports' && <ReportsTab companies={companiesList} onChanged={loadData} />}
            {activeTab === 'offers' && <OffersTab />}
            {activeTab === 'guarantee' && <GuaranteeTab />}
            {activeTab === 'recruiters' && <RecruitersTab />}
            {activeTab === 'experiments' && <ExperimentsTab />}
            {activeTab === 'threet' && <ThreeTStatusTab companies={companiesList} />}
            {activeTab === 'coding' && <CodingPracticeTab />}
            {activeTab === 'coins' && <CoinsAdminTab />}
            {activeTab === 'store' && <StoreAdminTab />}
            {activeTab === 'festival' && <FestivalTab />}

            {/* TAB: EMAIL MARKETING — leads, campaigns, templates */}
            {activeTab === 'emails' && <EmailTab />}
            {activeTab === 'support' && <SupportInboxTab />}
            {activeTab === 'messagelog' && <MessageLogTab />}

{/* TAB: NOTIFICATIONS */}
      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'broadcast' && <BroadcastTab />}

      {/* TAB: SETTINGS */}
      {activeTab === 'settings' && <SettingsTab />}
      {activeTab === 'errors' && <ClientErrorsTab />}
          </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};