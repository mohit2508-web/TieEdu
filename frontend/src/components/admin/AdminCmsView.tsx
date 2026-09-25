import React, { useState, useEffect } from 'react';
import { Company, ContentModule, InterviewReport } from '@/types';
import { fetchAdminCompaniesApi, fetchModerationReportsApi, fetchPendingPaymentsApi } from '@/lib/api';
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
import { AnalyticsTab } from '@/components/admin/AnalyticsTab';
import { SettingsTab } from '@/components/admin/SettingsTab';
import { PaymentVerificationsTab } from '@/components/admin/PaymentVerificationsTab';
import {
  BookOpen, Building2, BarChart3, FileText, Layers, LayoutDashboard,
  LogOut, RefreshCw, Settings2, ShoppingBag, Ticket, Users, ExternalLink, Wallet
} from 'lucide-react';

type TabId = 'overview' | 'orders' | 'payments' | 'users' | 'analytics' | 'hub' | 'content' | 'pack' | 'coupons' | 'reports' | 'settings';

const NAV: { id: TabId; label: string; icon: any; group: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'Commerce & Health' },
  { id: 'orders', label: 'Orders', icon: ShoppingBag, group: 'Commerce & Health' },
  { id: 'payments', label: 'Payment Verify', icon: Wallet, group: 'Commerce & Health' },
  { id: 'users', label: 'Users & Access', icon: Users, group: 'Commerce & Health' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, group: 'Commerce & Health' },
  { id: 'hub', label: 'Company Hub', icon: Building2, group: 'Content & Vault' },
  { id: 'content', label: 'Content Builder', icon: BookOpen, group: 'Content & Vault' },
  { id: 'pack', label: 'Pack Editor', icon: Layers, group: 'Content & Vault' },
  { id: 'coupons', label: 'Coupons & Pricing', icon: Ticket, group: 'Content & Vault' },
  { id: 'reports', label: 'Candidate Reports', icon: FileText, group: 'Engagement' },
  { id: 'settings', label: 'Settings', icon: Settings2, group: 'System' },
];

export const AdminCmsView: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [companiesList, setCompaniesList] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('comp-1');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [packModule, setPackModule] = useState<ContentModule | null>(null);
  const [reports, setReports] = useState<InterviewReport[]>([]);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
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
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

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
    if (id === 'hub') return companiesList.length;
    if (id === 'reports') return pendingReports.length;
    if (id === 'payments') return pendingPaymentsCount;
    return null;
  };

  const groups = Array.from(new Set(NAV.map((n) => n.group)));

  const navButtons = (small: boolean) => (
    <>
      {groups.map((g) => (
        <div key={g} className={small ? 'contents' : 'mb-2'}>
          {!small && (
            <p className="px-3 pt-4 pb-1.5 text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">{g}</p>
          )}
          <div className={small ? 'flex gap-1.5' : ''}>
            {NAV.filter((n) => n.group === g).map((t) => {
              const Icon = t.icon;
              const badge = badgeFor(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all text-left whitespace-nowrap ${
                    activeTab === t.id
                      ? 'bg-[#1F3A5F] text-white shadow-sm'
                      : 'text-gray-600 hover:bg-[#F3F2EE] hover:text-[#10151C]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${activeTab === t.id ? 'text-[#B45309]' : 'text-[#0284C7]'}`} />
                  <span className="flex-1">{t.label}</span>
                  {badge !== null && badge > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === t.id ? 'bg-amber-400/20 text-amber-300' : 'bg-[#1F3A5F] text-white'}`}>{badge}</span>
                  )}
                </button>
              );
            })}
          </div>
          {!small && g === 'Engagement' && null}
        </div>
      ))}
    </>
  );

  const tabTitle = NAV.find((n) => n.id === activeTab)?.label || 'Admin';

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex font-sans">
      {/* Sidebar (lg+) */}
      <aside className="hidden lg:flex w-[250px] shrink-0 flex-col border-r border-[#E9E7E1] bg-white">
        <div className="p-5 border-b border-[#EDEDEB]">
          <p className="text-[10px] font-mono font-bold text-[#0284C7] uppercase tracking-[0.2em]">TieEdu</p>
          <h1 className="text-lg font-extrabold text-[#10151C] tracking-tight">Admin Control Plane</h1>
          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-[#FBF1E1] text-[#B7791F] text-[10px] font-bold font-mono">OWNER BACKOFFICE</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3">{navButtons(false)}</nav>
        <div className="p-4 border-t border-[#EDEDEB] space-y-3">
          <div className="flex items-center gap-2.5 px-1">
            <span className="w-8 h-8 rounded-full bg-[#1F3A5F] text-white flex items-center justify-center text-xs font-bold uppercase">
              {(user?.name || 'A').slice(0, 1)}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#10151C] truncate">{user?.name || 'Admin'}</p>
              <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <Link href="/" className="block px-3 py-2 rounded-xl text-xs font-bold text-[#0284C7] hover:bg-[#E8F4FB] flex items-center gap-2">
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
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-[#E9E7E1] px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-bold text-gray-400 uppercase">TieEdu / Admin / {tabTitle}</p>
              <h2 className="text-base font-extrabold text-[#10151C] truncate">{tabTitle}</h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href="/" target="_blank" rel="noreferrer" className="hidden sm:inline-flex px-3 py-2 rounded-xl text-xs font-bold text-[#0284C7] border border-[#B8E3F7] bg-white hover:bg-[#E8F4FB] items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> Student site
              </a>
              <button
                onClick={loadData}
                className="inline-flex px-3.5 py-2 bg-[#1F3A5F] hover:bg-[#2b4d75] text-white rounded-xl text-xs font-bold items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Sync store
              </button>
            </div>
          </div>
          {/* Mobile horizontal nav */}
          <nav className="lg:hidden overflow-x-auto pb-2 -mx-4 px-4">
            <div className="flex gap-1.5">{navButtons(true)}</div>
          </nav>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
          <div className="max-w-[1700px] mx-auto">
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
                      className="p-2.5 bg-[#FAFAF9] border border-gray-200 rounded-xl text-xs font-bold font-mono text-[#1F3A5F] focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                    >
                      {(companiesList || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold font-mono text-gray-500 uppercase">Module:</span>
                    <select
                      value={selectedModule?.id || ''}
                      onChange={(e) => setSelectedModuleId(e.target.value)}
                      className="p-2.5 bg-[#FAFAF9] border border-gray-200 rounded-xl text-xs font-bold font-mono text-[#1F3A5F] focus:outline-none focus:ring-2 focus:ring-[#0284C7] min-w-[260px]"
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

            {/* TAB: COUPONS */}
            {activeTab === 'coupons' && <CouponsManager />}

            {/* TAB: CANDIDATE REPORTS */}
            {activeTab === 'reports' && <ReportsTab companies={companiesList} onChanged={loadData} />}

            {/* TAB: SETTINGS */}
            {activeTab === 'settings' && <SettingsTab />}
          </div>
        </main>
      </div>
    </div>
  );
};