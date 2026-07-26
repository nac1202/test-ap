import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { cn } from '../../lib/utils';
import { 
  AlertTriangle, LogOut, Search, Bell, HelpCircle, KeyRound, ChevronDown, Menu, X 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function MockLayout() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const hamburgerBtnRef = useRef<HTMLButtonElement>(null);

  const isAdmin = user?.role_id === 1;

  const displayName = user
    ? `${user.last_name || ''} ${user.first_name || ''}`.trim() || user.email
    : 'ゲスト';
  const initials = user
    ? (user.last_name?.[0] || user.email[0]).toUpperCase()
    : 'U';

  // Automatically close mobile drawer and user menu on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  // Close user dropdown menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle drawer body scroll lock and Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileDrawerOpen) {
        closeMobileDrawer();
      }
    };
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileDrawerOpen]);

  const closeMobileDrawer = () => {
    setMobileDrawerOpen(false);
    hamburgerBtnRef.current?.focus();
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    setMobileDrawerOpen(false);
    try {
      if (token) {
        await fetch('http://localhost:8000/api/v1/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Proceed with local logout
    }
    logout();
    navigate('/login', { replace: true });
  };

  const handleChangePassword = () => {
    setMenuOpen(false);
    setMobileDrawerOpen(false);
    navigate('/change-password');
  };

  const isChatPage = location.pathname === '/chat';

  return (
    <div className="h-[100dvh] w-full bg-[#f8f9fa] flex flex-col font-sans overflow-hidden">
      {/* System Admin Banner (Shrink-0, Normal Flex Flow, Always Top) */}
      {isAdmin && (
        <div className="bg-red-500 text-white text-[11px] sm:text-xs font-bold px-3 py-1 flex items-center justify-center gap-1.5 z-[40] shrink-0 shadow-sm h-6 sm:h-7">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">SYSTEM MODE - 管理者権限でログイン中</span>
        </div>
      )}

      {/* Main Container Wrapper */}
      <div className="flex flex-1 min-h-0 w-full min-w-0 overflow-hidden">
        {/* Desktop Sidebar (lg screens only: >= 1024px) */}
        <aside className="hidden lg:block h-full shrink-0 w-64 z-20">
          <Sidebar />
        </aside>

        {/* Mobile / Tablet Navigation Drawer (< 1024px) */}
        {mobileDrawerOpen && (
          <div className="lg:hidden fixed inset-0 z-[60] flex" role="dialog" aria-modal="true" aria-label="ナビゲーションメニュー">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={closeMobileDrawer}
              aria-hidden="true"
            />
            {/* Drawer Content */}
            <div className="relative w-64 max-w-[80vw] h-full bg-white shadow-2xl flex flex-col z-[70] animate-in slide-in-from-left duration-200">
              <div className="absolute right-2 top-3 z-30">
                <button
                  onClick={closeMobileDrawer}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="メニューを閉じる"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <Sidebar onCloseMobileMenu={closeMobileDrawer} />
            </div>
          </div>
        )}
        
        {/* Right Section Wrapper (Header + Main) */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 w-full overflow-x-hidden">
          {/* Common Mobile/Desktop Header (Shrink-0, Always Visible, z-[50] > banner z-[40]) */}
          <header className="relative h-16 flex items-center justify-between border-b bg-white px-3 sm:px-6 shadow-sm shrink-0 z-[50] gap-2">
            {/* Left: Hamburger button (lg:hidden) & Search Input */}
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 max-w-xl">
              <button
                ref={hamburgerBtnRef}
                onClick={() => setMobileDrawerOpen(true)}
                className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                aria-label="ナビゲーションメニューを開く"
                aria-expanded={mobileDrawerOpen}
              >
                <Menu className="h-6 w-6" />
              </button>

              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="検索..." 
                  className="w-full pl-8 sm:pl-10 pr-3 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 rounded-full text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all truncate"
                />
              </div>
            </div>
            
            {/* Right Controls */}
            <div className="flex items-center gap-1 sm:gap-3 shrink-0">
              <button 
                onClick={() => navigate('/notifications')}
                className="relative p-2 text-gray-500 hover:text-primary transition-colors rounded-full hover:bg-gray-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="通知"
                aria-label="通知センター"
              >
                <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">12</span>
              </button>

              <button 
                onClick={() => navigate('/hotbiz')}
                className="text-gray-500 hover:text-primary transition-colors hidden md:flex p-2 rounded-full hover:bg-gray-50 min-h-[44px] min-w-[44px] items-center justify-center"
                title="ヘルプ・HotBiz"
                aria-label="HotBizリンク"
              >
                <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>

              {/* User Menu */}
              <div className="relative border-l border-gray-200 pl-2 sm:pl-3" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 cursor-pointer hover:opacity-80 transition-opacity rounded-lg p-1 hover:bg-gray-50 min-h-[44px]"
                  type="button"
                  id="user-menu-button"
                  aria-expanded={menuOpen}
                  aria-label="ユーザーメニュー"
                >
                  <div className="text-right hidden md:block">
                    <p className="text-xs sm:text-sm font-bold text-gray-800 leading-none truncate max-w-[120px]">{displayName}</p>
                    <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">{isAdmin ? '管理者' : 'ユーザー'}</p>
                  </div>
                  <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs sm:text-sm font-bold text-primary border border-primary/20 shrink-0">
                    {initials}
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform hidden sm:block", menuOpen && "rotate-180")} />
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-white shadow-xl ring-1 ring-gray-900/10 py-1 z-[100] animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={handleChangePassword}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]"
                        id="menu-change-password"
                      >
                        <KeyRound className="h-4 w-4 text-gray-400 shrink-0" />
                        パスワード変更
                      </button>
                    </div>
                    <div className="border-t border-gray-100 py-1">
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors min-h-[44px]"
                        id="menu-logout"
                      >
                        <LogOut className="h-4 w-4 shrink-0" />
                        ログアウト
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          {isChatPage ? (
            /* Chat page: no padding, no max-width constraint, overflow-hidden */
            <main className="flex-1 min-h-0 min-w-0 w-full flex flex-col overflow-hidden">
              <Outlet />
            </main>
          ) : (
            /* Normal pages: padded, scrollable */
            <main className="flex-1 min-h-0 min-w-0 w-full overflow-y-auto overflow-x-hidden bg-[#f8f9fa]">
              <div className="max-w-[1200px] mx-auto w-full min-w-0 p-3 sm:p-6 md:p-8">
                <Outlet />
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}

