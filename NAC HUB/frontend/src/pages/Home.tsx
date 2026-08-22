import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Calendar, FolderKanban, Bell, CheckCircle2, ArrowRight,
  UserCheck, AlertTriangle, Sun, Moon, Sunset, Clock, Loader2, AlertCircle, RefreshCw, MessageSquare
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchDashboardData } from '../api/dashboard';
import type { DashboardData } from '../types/dashboard';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  normal: { label: '正常', className: 'bg-emerald-100 text-emerald-800' },
  warning: { label: '注意', className: 'bg-amber-100 text-amber-800' },
  delayed: { label: '遅延', className: 'bg-rose-100 text-rose-800' },
};

function renderStatusBadge(statusStr: string) {
  const config = STATUS_LABELS[statusStr] || { label: statusStr, className: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${config.className}`}>
      {config.label}
    </span>
  );
}

function getTimeGreeting(): { greeting: string; icon: React.ReactNode } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return { greeting: 'おはようございます', icon: <Sun className="h-4 w-4 text-orange-400 shrink-0" /> };
  } else if (hour >= 12 && hour < 18) {
    return { greeting: 'こんにちは', icon: <Sunset className="h-4 w-4 text-amber-500 shrink-0" /> };
  } else {
    return { greeting: 'こんばんは', icon: <Moon className="h-4 w-4 text-indigo-400 shrink-0" /> };
  }
}

export default function Home() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [nakkunQuery, setNakkunQuery] = useState<string>('');

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetchDashboardData(token);
      setData(res);
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string };
      if (errorObj.status === 401) {
        logout();
        return;
      }
      setError(errorObj.message || 'ダッシュボードの読み込みに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleNakkunSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nakkunQuery.trim()) {
      navigate('/chat', { state: { initialQuestion: nakkunQuery.trim() } });
    } else {
      navigate('/chat');
    }
  };

  const displayName = user
    ? (user.last_name || user.first_name ? `${user.last_name || ''} ${user.first_name || ''}`.trim() : user.email)
    : 'ゲスト';

  const greetingInfo = getTimeGreeting();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 min-h-[300px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">ダッシュボードを読み込み中...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 sm:p-8 max-w-lg mx-auto bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4 my-6 sm:my-10">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="text-base sm:text-lg font-bold text-gray-800">ダッシュボードの表示エラー</h3>
        <p className="text-xs sm:text-sm text-gray-600">{error || 'データの取得に失敗しました。'}</p>
        <Button id="btn-reload-dashboard" onClick={loadDashboard} className="bg-primary text-white font-bold min-h-[44px]">
          <RefreshCw className="h-4 w-4 mr-2" /> 再読み込み
        </Button>
      </div>
    );
  }

  const { project_summary, recent_projects, notices, tasks } = data;

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
        
        {/* Nakkun Hero */}
        <div className="md:col-span-8 bg-white border border-gray-100 rounded-2xl sm:rounded-[20px] p-4 sm:p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 relative z-10">
            <div className="w-20 sm:w-28 shrink-0 mx-auto sm:mx-0">
              <img src="/nakkun.png" alt="なっくん" className="w-full h-auto object-contain drop-shadow-md" />
            </div>
            <div className="flex-1 pt-1 text-center sm:text-left min-w-0">
              <h2 className="text-xl sm:text-2xl font-black text-gray-800 tracking-tight truncate">
                {greetingInfo.greeting}、{displayName}さん！
              </h2>
              <p className="text-primary font-bold mt-1 text-xs sm:text-sm flex items-center justify-center sm:justify-start gap-1">
                {greetingInfo.icon} <span className="truncate">なっくんが現在のプロジェクト状況をお知らせします</span>
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-4 sm:mt-6 bg-gray-50/80 p-3 sm:p-4 rounded-xl border border-gray-100">
                <div className="text-center cursor-pointer hover:opacity-80 transition-opacity p-1" onClick={() => navigate('/projects')}>
                  <div className="flex items-center justify-center gap-1 text-gray-500 text-[11px] sm:text-xs font-bold mb-0.5">
                    <FolderKanban className="h-3.5 w-3.5 text-orange-500 shrink-0" /> <span className="truncate">全案件</span>
                  </div>
                  <p className="text-gray-800"><span className="text-xl sm:text-2xl font-black">{project_summary.total}</span><span className="text-xs font-bold ml-0.5">件</span></p>
                  <p className="text-gray-500 text-[10px] mt-0.5">管理中</p>
                </div>

                <div className="text-center cursor-pointer hover:opacity-80 transition-opacity p-1" onClick={() => navigate('/projects')}>
                  <div className="flex items-center justify-center gap-1 text-gray-500 text-[11px] sm:text-xs font-bold mb-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> <span className="truncate">正常</span>
                  </div>
                  <p className="text-gray-800"><span className="text-xl sm:text-2xl font-black text-emerald-600">{project_summary.normal}</span><span className="text-xs font-bold ml-0.5">件</span></p>
                  <p className="text-gray-500 text-[10px] mt-0.5">順調です</p>
                </div>

                <div className="text-center cursor-pointer hover:opacity-80 transition-opacity p-1" onClick={() => navigate('/projects')}>
                  <div className="flex items-center justify-center gap-1 text-gray-500 text-[11px] sm:text-xs font-bold mb-0.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" /> <span className="truncate">要注意</span>
                  </div>
                  <p className="text-gray-800"><span className="text-xl sm:text-2xl font-black text-amber-600">{project_summary.warning + project_summary.delayed}</span><span className="text-xs font-bold ml-0.5">件</span></p>
                  <p className="text-gray-500 text-[10px] mt-0.5">注意・遅延</p>
                </div>

                <div className="text-center cursor-pointer hover:opacity-80 transition-opacity p-1" onClick={() => navigate('/projects')}>
                  <div className="flex items-center justify-center gap-1 text-gray-500 text-[11px] sm:text-xs font-bold mb-0.5">
                    <Clock className="h-3.5 w-3.5 text-rose-500 shrink-0" /> <span className="truncate">近日期限</span>
                  </div>
                  <p className="text-gray-800"><span className="text-xl sm:text-2xl font-black text-rose-600">{project_summary.due_soon}</span><span className="text-xs font-bold ml-0.5">件</span></p>
                  <p className="text-gray-500 text-[10px] mt-0.5">7日以内</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleNakkunSubmit} className="mt-4 sm:mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-2 relative z-10">
            <Input 
              id="nakkun-home-input"
              type="text" 
              placeholder="なっくに業務や案件について質問する..." 
              className="flex-1 bg-gray-50 focus:bg-white text-xs sm:text-sm h-11"
              value={nakkunQuery}
              onChange={(e) => setNakkunQuery(e.target.value)}
            />
            <Button id="btn-nakkun-home-send" type="submit" className="bg-primary hover:bg-orange-600 text-white font-bold h-11 px-5 shrink-0 flex items-center justify-center gap-2">
              <MessageSquare className="h-4 w-4" /> 質問する
            </Button>
          </form>
        </div>

        {/* Attendance Widget */}
        <div className="md:col-span-4 bg-white border border-gray-100 rounded-2xl sm:rounded-[20px] p-4 sm:p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-gray-800 text-sm sm:text-base">出勤状況・天気</h3>
              </div>
              <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">連携準備中</span>
            </div>
            
            <div className="space-y-3">
              <div className="p-3 bg-orange-50/50 rounded-xl border border-orange-100">
                <p className="text-xs font-bold text-orange-900 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-orange-500" /> 出勤管理システム連携準備中
                </p>
                <p className="text-[11px] text-gray-500 mt-1">外部打刻システムとの自動連携機能を開発しています。</p>
              </div>

              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Sun className="h-4 w-4 text-amber-500" /> 天気情報は未接続です
                </p>
                <p className="text-[11px] text-gray-500 mt-1">拠点地域の天気予報APIを順次接続いたします。</p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">HotBiz 予定表</span>
            <Button variant="ghost" size="sm" onClick={() => navigate('/hotbiz')} className="text-primary font-bold hover:bg-orange-50 p-1.5 h-8">
              リンク集へ <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>

      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Recent Projects Card */}
        <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-[20px] p-4 sm:p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-gray-800 text-sm sm:text-base">最近閲覧した案件</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="text-xs text-primary font-bold p-1 h-7">
                全件見る <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>

            {recent_projects.length === 0 ? (
              <div className="py-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                <FolderKanban className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500 font-medium">最近閲覧した案件はありません</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recent_projects.map((proj) => (
                  <div 
                    key={proj.id}
                    onClick={() => navigate(`/projects/${proj.id}`)}
                    className="p-3 bg-gray-50 hover:bg-orange-50/50 border border-gray-100 rounded-xl cursor-pointer transition-colors flex items-center justify-between group"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2 mb-1">
                        {renderStatusBadge(proj.status)}
                        <span className="text-xs font-bold text-gray-800 group-hover:text-primary transition-colors truncate">
                          {proj.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-500">
                        <span>進捗: {proj.progress_rate}%</span>
                        {proj.deadline && <span>期日: {proj.deadline}</span>}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-primary transition-colors shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notifications Card */}
        <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-[20px] p-4 sm:p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-gray-800 text-sm sm:text-base">全社お知らせ一覧</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/notices')} className="text-xs text-primary font-bold p-1 h-7">
                すべて見る <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>

            {notices.length === 0 ? (
              <div className="py-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500 font-medium">現在、お知らせはありません</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {notices.map((n) => (
                  <div key={n.id} className="p-3 bg-gray-50 border border-gray-100 rounded-xl cursor-pointer hover:bg-orange-50/50 transition-colors" onClick={() => navigate('/notices')}>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                      <span>{n.created_at ? new Date(n.created_at).toLocaleDateString() : '本日'}</span>
                      {n.is_important && <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full text-[10px]">重要</span>}
                    </div>
                    <p className="text-xs font-bold text-gray-800 leading-snug break-words">{n.title}</p>
                    {n.content && <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 break-words">{n.content}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tasks Card */}
        <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-[20px] p-4 sm:p-5 shadow-sm flex flex-col justify-between md:col-span-2 lg:col-span-1">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-gray-800 text-sm sm:text-base">タスク・ワークフロー</h3>
              </div>
              <span className="text-xs text-gray-400 font-bold">{tasks.length}件</span>
            </div>

            {tasks.length === 0 ? (
              <div className="py-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500 font-medium">現在表示できるタスクはありません</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {tasks.map((t) => (
                  <div key={t.id} className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-gray-800 truncate">{t.title}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{t.due_date ? `期日: ${t.due_date}` : '未設定'}</p>
                    </div>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold shrink-0">
                      {t.status || '処理中'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
