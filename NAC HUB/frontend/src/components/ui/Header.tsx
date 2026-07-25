import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { LogOut, User, KeyRound, ChevronDown } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export function Header({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = user
    ? `${user.last_name || ""} ${user.first_name || ""}`.trim() || user.email
    : "ゲスト";
  const initials = user
    ? (user.last_name?.[0] || user.email[0]).toUpperCase()
    : "U";

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      if (token) {
        await fetch("http://localhost:8000/api/v1/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Proceed with local logout even if API fails
    }
    logout();
    navigate("/login", { replace: true });
  };

  const handleChangePassword = () => {
    setMenuOpen(false);
    navigate("/change-password");
  };

  return (
    <header className={cn("sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-surface px-6 shadow-sm", className)} {...props}>
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-primary">NAC HUB</h1>
      </div>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer rounded-lg px-3 py-2 hover:bg-gray-50"
          type="button"
          id="user-menu-button"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs text-text-muted mt-1">
              {user?.role_id === 1 ? "管理者" : "ユーザー"}
            </p>
          </div>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
            {initials}
          </div>
          <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", menuOpen && "rotate-180")} />
        </button>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-white shadow-lg ring-1 ring-gray-900/10 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
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
    </header>
  );
}
