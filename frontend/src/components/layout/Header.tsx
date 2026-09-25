import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Search, Flame, ShoppingBag, Command, ChevronDown, LogOut, UserRound, ShieldCheck, Menu, X, LayoutGrid, GraduationCap, CalendarRange, Tag } from 'lucide-react';
import { TieEduLogo } from '@/components/common/TieEduLogo';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenSearch: () => void;
  onOpenLeaderboard: () => void;
}

const NAV_LINKS = [
  { href: '/', label: 'Vaults', Icon: LayoutGrid },
  { href: '/compare', label: 'Compare', Icon: GraduationCap },
  { href: '/interview-course', label: 'Free Course', Icon: CalendarRange },
  { href: '/study-plan', label: 'Study Plan', Icon: Tag },
  { href: '/#pricing', label: 'Pricing', Icon: Tag },
];

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  onOpenCart,
  onOpenSearch,
  onOpenLeaderboard,
}) => {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    setDrawerOpen(false);
    await logout();
    router.push('/');
  };

  const isAdmin = user?.role === 'admin';

  const openDrawerNav = (fn?: () => void) => {
    setDrawerOpen(false);
    fn?.();
  };

  return (
    <header className="sticky top-0 z-40 glass-surface">
      <div className="w-full max-w-[1700px] mx-auto px-3 sm:px-8 lg:px-12 h-16 flex items-center justify-between">

        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group" aria-label="TieEdu home">
            <TieEduLogo size="sm" showTagline={true} />
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-[13px] font-semibold text-[#3E4754]">
            {NAV_LINKS.map(l => (
              <Link key={l.href} href={l.href} className="px-3 py-2 rounded-lg hover:bg-black/[0.04] hover:text-[#10151C] transition-colors">{l.label}</Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <Link
              href="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 chip hover:border-[#0E2A44] hover:text-[#0E2A44]"
              title="Admin console"
            >
              <ShieldCheck className="w-4 h-4 text-[#0E2A44]" />
              <span className="font-bold">Admin</span>
            </Link>
          )}

          <button
            onClick={onOpenSearch}
            className="hidden sm:flex items-center gap-2 bg-white/70 border border-[#E9E7E1] hover:border-[#D6D2C8] text-[--text-muted] hover:text-[#3E4754] pl-3 pr-2 py-2 rounded-xl text-[13px] transition-all shadow-xs focus-ring"
          >
            <Search className="w-4 h-4" />
            <span className="font-medium">Search</span>
            <span className="hidden lg:inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded-md bg-black/[0.05] text-[11px] font-bold text-[--text-muted]">
              <Command className="w-3 h-3" />K
            </span>
          </button>

          <button
            onClick={onOpenSearch}
            className="sm:hidden w-10 h-10 flex items-center justify-center text-[#3E4754] hover:bg-black/[0.04] rounded-xl transition-colors focus-ring"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenLeaderboard}
            className="hidden sm:inline-flex w-10 h-10 sm:w-auto sm:h-auto items-center justify-center gap-2 chip hover:border-[#E8A33D] hover:text-[#C77B12]" title="Daily streak leaderboard"
          >
            <Flame className="w-4 h-4 text-[#B45309] fill-[#E8A33D]" />
            <span className="font-bold hidden sm:inline">Leaderboard</span>
          </button>

          <button
            onClick={onOpenCart}
            className="relative w-10 h-10 flex items-center justify-center text-[#3E4754] hover:text-[#10151C] hover:bg-black/[0.04] rounded-xl transition-colors focus-ring"
            aria-label="Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#E8A33D] text-[#241A06] text-[10px] font-bold min-w-4 h-4 px-0.5 rounded-full flex items-center justify-center shadow-sm stat-num">
                {cartCount}
              </span>
            )}
          </button>

          {!loading && user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 sm:gap-2 pl-1 pr-1.5 sm:pr-2 py-1 rounded-xl border border-[#E9E7E1] bg-white/70 hover:border-[#D6D2C8] transition-colors focus-ring"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-7 h-7 rounded-lg object-cover" />
                ) : (
                  <span className="w-7 h-7 rounded-lg bg-[#0284C7] text-white flex items-center justify-center text-[13px] font-extrabold uppercase">
                    {user.name.charAt(0)}
                  </span>
                )}
                <span className="hidden lg:block text-[13px] font-bold text-[#10151C] max-w-[140px] truncate">
                  {user.name.split(' ')[0]}
                </span>
                <ChevronDown className={`hidden sm:inline w-3.5 h-3.5 text-[--text-muted] transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-64 vault-card p-2 shadow-raised animate-fade-in" role="menu">
                  <div className="px-3 py-2.5 border-b border-[#E9E7E1]">
                    <p className="text-[13px] font-bold text-[#10151C] truncate">{user.name}</p>
                    <p className="text-[11px] text-[--text-muted] truncate">{user.email}</p>
                    <span className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${
                      isAdmin ? 'bg-[#0E2A44] text-[#E8A33D]' : 'bg-[#E8F4FB] text-[#0271B5]'
                    }`}>
                      {isAdmin ? 'Platform Admin' : 'Student'}
                    </span>
                  </div>

                  <div className="py-1.5">
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-semibold text-[#3E4754] hover:bg-[#F3F2EE] rounded-lg"
                      >
                        <ShieldCheck className="w-4 h-4 text-[#0E2A44]" /> Admin console
                      </Link>
                    )}
                    <Link
                      href="/account"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-semibold text-[#3E4754] hover:bg-[#F3F2EE] rounded-lg"
                    >
                      <UserRound className="w-4 h-4 text-[#0284C7]" /> My account
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-semibold text-[#C1442D] hover:bg-[#FDEDE9] rounded-lg"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && !user && (
            <Link
              href="/login"
              className="hidden md:inline-flex btn btn-primary px-4 py-2 text-[13px] focus-ring"
            >
              Sign in
            </Link>
          )}

          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden w-10 h-10 flex items-center justify-center text-[#3E4754] hover:bg-black/[0.04] rounded-xl transition-colors focus-ring"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

      </div>

      {/* ===== Mobile Drawer ===== */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setDrawerOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[82%] max-w-[340px] bg-white shadow-2xl flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between px-5 h-16 border-b border-[#E9E7E1]">
              <TieEduLogo size="sm" showTagline={false} />
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 text-[#3E4754] hover:bg-black/[0.05] rounded-xl transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <nav className="space-y-1">
                {NAV_LINKS.map(l => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => openDrawerNav()}
                    className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-[15px] font-bold text-[#3E4754] hover:bg-[#F3F2EE] hover:text-[#10151C] transition-colors"
                  >
                    <l.Icon className="w-4 h-4 text-[#0284C7]" />
                    {l.label}
                  </Link>
                ))}
              </nav>

              <div className="space-y-1 pt-3 border-t border-[#E9E7E1]">
                <button
                  onClick={() => openDrawerNav(() => onOpenSearch())}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-[15px] font-bold text-[#3E4754] hover:bg-[#F3F2EE] transition-colors text-left"
                >
                  <Search className="w-4 h-4 text-[#0284C7]" /> Search
                </button>
                <button
                  onClick={() => openDrawerNav(() => onOpenLeaderboard())}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-[15px] font-bold text-[#3E4754] hover:bg-[#F3F2EE] transition-colors text-left"
                >
                  <Flame className="w-4 h-4 text-[#B45309]" /> Leaderboard
                </button>
                <button
                  onClick={() => openDrawerNav(() => onOpenCart())}
                  className="w-full relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-[15px] font-bold text-[#3E4754] hover:bg-[#F3F2EE] transition-colors text-left"
                >
                  <ShoppingBag className="w-4 h-4 text-[#0284C7]" /> Cart
                  {cartCount > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[#E8A33D] text-[#241A06] text-[11px] font-bold">
                      {cartCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="pt-3 border-t border-[#E9E7E1] space-y-1">
                {user ? (
                  <>
                    <div className="px-3.5 py-3">
                      <div className="flex items-center gap-2.5">
                        {user.avatar ? (
                          <img src={user.avatar} alt="" className="w-9 h-9 rounded-lg object-cover" />
                        ) : (
                          <span className="w-9 h-9 rounded-lg bg-[#0284C7] text-white flex items-center justify-center text-[15px] font-extrabold uppercase">
                            {user.name.charAt(0)}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold text-[#10151C] truncate">{user.name}</p>
                          <p className="text-[11px] text-[--text-muted] truncate">{user.email}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${
                        isAdmin ? 'bg-[#0E2A44] text-[#E8A33D]' : 'bg-[#E8F4FB] text-[#0271B5]'
                      }`}>
                        {isAdmin ? 'Platform Admin' : 'Student'}
                      </span>
                    </div>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => openDrawerNav()}
                        className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-[15px] font-bold text-[#3E4754] hover:bg-[#F3F2EE] transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-[#0E2A44]" /> Admin console
                      </Link>
                    )}
                    <Link
                      href="/account"
                      onClick={() => openDrawerNav()}
                      className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-[15px] font-bold text-[#3E4754] hover:bg-[#F3F2EE] transition-colors"
                    >
                      <UserRound className="w-4 h-4 text-[#0284C7]" /> My account
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-[15px] font-bold text-[#C1442D] hover:bg-[#FDEDE9] transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => openDrawerNav()}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-[15px] font-bold transition-colors"
                  >
                    Sign in / Create account
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};