import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { cn } from '../../lib/utils';
import { AlertTriangle, LogOut, Search, Bell, HelpCircle, KeyRound, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function MockLayout() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role_id === 1;

  const displayName = user
    ? `${user.last_name || ''} ${user.first_name || ''}`.trim() || user.email
    : 'ゲスト';
  const initials = user
    ? (user.last_name?.[0] || user.email[0]).toUpperCase()
    : 'U';

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      if (token) {
        await fetch('http://localhost:8000/api/v1/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Proceed with local logout even if API fails
    }
    logout();
    navigate('/login', { replace: true });
  };

  const handleChangePassword = () => {
    setMenuOpen(false);
    navigate('/change-password');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans">
      {/* System Admin Banner */}
      {isAdmin && (
        <div className="bg-red-500 text-white text-xs font-bold px-4 py-1 flex items-center justify-center gap-2 z-50 fixed top-0 w-full">
          <AlertTriangle className="h-4 w-4" />
          SYSTEM MODE - 管理者としてログインしています
        </div>
      )}

      <div className={cn("flex flex-1 h-screen overflow-hidden", isAdmin ? "pt-6" : "")}>
        {/* Sidebar */}
        <Sidebar />
        
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className="h-16 flex items-center justify-between border-b bg-white px-6 shadow-sm shrink-0 z-10">
            <div className="flex-1 max-w-2xl">
              <div className="relative flex items-center">
                <Search className="absolute left-3 text-gray-400 h-5 w-5" />
                <input 
                  type="text" 
                  placeholder="社員・案件・Slack・NotePM・ドライブなど、すべてを検索..." 
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-5 ml-4">
              <div className="relative cursor-pointer hover:text-primary transition-colors text-gray-500">
                <Bell className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">12</span>
              </div>
              <div className="cursor-pointer hover:text-primary transition-colors text-gray-500 hidden sm:block">
                <HelpCircle className="h-6 w-6" />
              </div>

              {/* User Menu */}
              <div className="relative border-l pl-5 ml-2" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity rounded-lg px-2 py-1 hover:bg-gray-50"
                  type="button"
                  id="user-menu-button"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-gray-800 leading-none">{displayName}</p>
                    <p className="text-[11px] text-gray-500 mt-1">{isAdmin ? '管理者' : 'ユーザー'}</p>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary border border-primary/20">
                    {initials}
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", menuOpen && "rotate-180")} />
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-white shadow-lg ring-1 ring-gray-900/10 py-1 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-900">{displayName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={handleChangePassword}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        id="menu-change-password"
                      >
                        <KeyRound className="h-4 w-4 text-gray-400" />
                        パスワード変更
                      </button>
                    </div>
                    <div className="border-t border-gray-100 py-1">
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        id="menu-logout"
                      >
                        <LogOut className="h-4 w-4" />
                        ログアウト
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto p-8 bg-[#f8f9fa]">
            <div className="max-w-[1200px] mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

