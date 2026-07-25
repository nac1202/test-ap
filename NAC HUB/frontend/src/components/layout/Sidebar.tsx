import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { 
  Home, 
  MessageSquare, 
  FolderKanban, 
  Bell, 
  ExternalLink,
  Users,
  Shield,
  Settings,
  Plug,
  History,
  ClipboardList,
  Network
} from 'lucide-react';

export function Sidebar() {
  const navItems = [
    { name: 'ホーム', path: '/', icon: Home, badge: null },
    { name: 'なっくん (AI)', path: '/chat', icon: MessageSquare, badge: null },
    { name: '案件管理', path: '/projects', icon: FolderKanban, badge: null },
    { name: 'お知らせ', path: '/notices', icon: ClipboardList, badge: null },
    { name: '通知センター', path: '/notifications', icon: Bell, badge: '12' },
    { name: 'HotBizリンク', path: '/hotbiz', icon: ExternalLink, badge: null },
  ];

  const settingItems = [
    { name: 'ユーザー管理', path: '/settings/users', icon: Users },
    { name: 'ロール・権限管理', path: '/settings/roles', icon: Shield },
    { name: 'システム設定', path: '/settings/system', icon: Settings },
    { name: 'プラグイン管理', path: '/settings/plugins', icon: Plug },
    { name: '監査ログ', path: '/settings/audit', icon: History },
  ];

  return (
    <div className="w-64 h-full bg-white border-r flex flex-col flex-shrink-0 relative z-20">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 shrink-0 cursor-pointer">
        <div className="flex items-center gap-2">
          <Network className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-black text-gray-800 tracking-tight">NAC HUB</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col">
        <div className="space-y-1 mb-6">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold transition-colors",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-primary"
                )
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("h-5 w-5", item.path === '/' ? "text-primary" : "")} />
                {item.name}
              </div>
              {item.badge && (
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        <div>
          <p className="px-3 text-[11px] font-bold text-gray-400 mb-2">システム管理</p>
          <div className="space-y-1">
            {settingItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-primary"
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </div>
        </div>

        {/* System Info Box */}
        <div className="mt-auto pt-6 px-3 pb-2">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs font-black text-gray-800">NAC HUB</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Ver 1.1.0</p>
            <p className="text-[10px] text-gray-500">Build 20260708</p>
            <button className="w-full mt-3 py-1.5 border border-primary/30 text-primary text-xs font-bold rounded-full hover:bg-primary/5 transition-colors">
              システム情報
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
