import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Calendar, FolderKanban, Bell, CheckCircle2, ArrowRight,
  UserCheck, Plus, AlertTriangle, Sun, Moon, Sunset, Clock, Loader2, AlertCircle, RefreshCw, MessageSquare
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
    return { greeting: 'おはようございます', icon: <Sun className="h-4 w-4 text-orange-400" /> };
  } else if (hour >= 12 && hour < 18) {
    return { greeting: 'こんにちは', icon: <Sunset className="h-4 w-4 text-amber-500" /> };
  } else {
    return { greeting: 'こんばんは', icon: <Moon className="h-4 w-4 text-indigo-400" /> };
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
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">ダッシュボードを読み込み中...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-lg mx-auto bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4 my-10">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-gray-800">ダッシュボードの表示エラー</h3>
        <p className="text-sm text-gray-600">{error || 'データの取得に失敗しました。'}</p>
        <Button id="btn-reload-dashboard" onClick={loadDashboard} className="bg-primary text-white font-bold">
          <RefreshCw className="h-4 w-4 mr-2" /> 再読み込み
        </Button>
      </div>
    );
  }

  const { project_summary, recent_projects, notifications, tasks } = data;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* ROW 1 */}
        {/* Nakkun Hero (8/12) */}
        <div className="md:col-span-8 bg-white border border-gray-100 rounded-[20px] p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex gap-6 relative z-10">
            <div className="w-28 shrink-0">
              <img src="/nakkun.png" alt="なっくん" className="w-full h-auto object-contain drop-shadow-md" />
            </div>
            <div className="flex-1 pt-1">
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">
                {greetingInfo.greeting}、{displayName}さん！
              </h2>
              <p className="text-primary font-bold mt-1 text-sm flex items-center gap-1">
                {greetingInfo.icon} なっくんが現在のプロジェクト状況をお知らせします {greetingInfo.icon}
              </p>
              
              <div className="flex gap-4 mt-6">
                <div className="flex-1 text-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/projects')}>
                  <div className="flex items-center justify-center gap-1.5 text-gray-500 text-xs font-bold mb-1">
                    <FolderKanban className="h-4 w-4 text-orange-500" /> 全案件
                  </div>
                  <p className="text-gray-800"><span className="text-2xl font-black">{project_summary.total}</span><span className="text-sm font-bold ml-1">件</span></p>
                  <p className="text-gray-500 text-[10px] mt-1">管理中</p>
                </div>
                <div className="w-px bg-gray-100" />
                <div className="flex-1 text-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/projects')}>
                  <div className="flex items-center justify-center gap-1.5 text-gray-500 text-xs font-bold mb-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> 正常
                  </div>
                  <p className="text-gray-800"><span className="text-2xl font-black text-emerald-600">{project_summary.normal}</span><span className="text-sm font-bold ml-1">件</span></p>
                  <p className="text-gray-500 text-[10px] mt-1">順調です</p>
                </div>
                <div className="w-px bg-gray-100" />
                <div className="flex-1 text-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/projects')}>
                  <div className="flex items-center justify-center gap-1.5 text-gray-500 text-xs font-bold mb-1">
                    <AlertTriangle className="h-4 w-4 text-amber-500" /> 要注意
                  </div>
                  <p className="text-gray-800"><span className="text-2xl font-black text-amber-600">{project_summary.warning + project_summary.delayed}</span><span className="text-sm font-bold ml-1">件</span></p>
                  <p className="text-gray-500 text-[10px] mt-1">注意・遅延</p>
                </div>
                <div className="w-px bg-gray-100" />
                <div className="flex-1 text-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/projects')}>
                  <div className="flex items-center justify-center gap-1.5 text-gray-500 text-xs font-bold mb-1">
                    <Clock className="h-4 w-4 text-rose-500" /> 7日以内期日
                  </div>
                  <p className="text-gray-800"><span className="text-2xl font-black text-rose-600">{project_summary.due_soon}</span><span className="text-sm font-bold ml-1">件</span></p>
                  <p className="text-gray-500 text-[10px] mt-1">近日期限</p>
                </div>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleNakkunSubmit} className="mt-6 relative z-10">
            <div className="relative flex items-center">
              <Input 
                id="nakkun-home-input"
                value={nakkunQuery}
                onChange={(e) => setNakkunQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-5 text-sm rounded-xl border-gray-200 bg-gray-50 focus-visible:ring-primary/20" 
                placeholder="なっくに案件や作業について相談する..." 
              />
              <div className="absolute right-2">
                <Button id="btn-nakkun-home-send" type="submit" className="h-8 w-8 p-0 rounded-lg bg-primary hover:bg-orange-600 shadow-sm flex items-center justify-center cursor-pointer">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Quick Access (4/12) */}
        <div className="md:col-span-4 bg-white border border-gray-100 rounded-[20px] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-gray-600"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              </span>
              <h3 className="font-bold text-gray-800">クイックアクセス</h3>
            </div>
            
            <div className="grid grid-cols-4 gap-3 items-center">
              <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => navigate('/hotbiz')}>
                <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center group-hover:border-primary/50 group-hover:shadow transition-all">
                  <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-black text-xl">H</div>
                </div>
                <span className="text-[10px] font-bold text-gray-600 group-hover:text-primary transition-colors">HotBiz</span>
              </div>
              <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => alert('Slackプラグインは未接続です。')}>
                <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center group-hover:border-primary/50 group-hover:shadow transition-all">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-black text-xl">S</div>
                </div>
                <span className="text-[10px] font-bold text-gray-600 group-hover:text-primary transition-colors">Slack</span>
              </div>
              <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => alert('NotePMプラグインは未接続です。')}>
                <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center group-hover:border-primary/50 group-hover:shadow transition-all">
                  <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white font-black text-xl">N</div>
                </div>
                <span className="text-[10px] font-bold text-gray-600 group-hover:text-primary transition-colors">NotePM</span>
              </div>
              <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => alert('Google Driveプラグインは未接続です。')}>
                <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center group-hover:border-primary/50 group-hover:shadow transition-all">
                  <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white font-black text-xl">G</div>
                </div>
                <span className="text-[10px] font-bold text-gray-600 group-hover:text-primary transition-colors">Google Drive</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t flex justify-between items-center">
            <span className="text-[10px] text-gray-400">プラグイン連携状態: 4サービス準備中</span>
            <Button id="btn-chat-nav" variant="ghost" size="sm" onClick={() => navigate('/chat')} className="text-xs text-primary font-bold flex items-center gap-1 cursor-pointer">
              なっくん(AI) <MessageSquare className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* ROW 2 */}
        {/* Attendance (4/12) - Explicit Unconnected */}
        <div className="md:col-span-4 bg-white border border-gray-100 rounded-[20px] p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="h-5 w-5 text-blue-500" />
            <h3 className="font-bold text-gray-800">今日の出勤状況</h3>
          </div>
          <div className="py-6 text-center border rounded-xl bg-gray-50/50">
            <p className="text-xs font-bold text-gray-500">出勤管理システム連携準備中</p>
            <p className="text-[10px] text-gray-400 mt-1">実データ接続後に表示されます</p>
          </div>
          <div className="flex justify-between items-center mt-3 text-[11px] text-gray-400">
             <span>ステータス: 未接続</span>
             <span className="flex items-center gap-1">最終確認: - <Clock className="h-3 w-3" /></span>
          </div>
        </div>

        {/* Schedule / HotBiz (4/12) - Explicit Unconnected */}
        <div className="md:col-span-4 bg-white border border-gray-100 rounded-[20px] p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <h3 className="font-bold text-gray-800">今日の予定 (HotBiz)</h3>
            </div>
            <span className="text-[11px] font-bold text-primary cursor-pointer hover:underline" onClick={() => navigate('/hotbiz')}>HotBizを開く</span>
          </div>
          <div className="py-6 text-center border rounded-xl bg-gray-50/50">
            <p className="text-xs font-bold text-gray-500">HotBiz予定表は連携準備中です</p>
            <p className="text-[10px] text-gray-400 mt-1">外部スケジューラー未接続</p>
          </div>
          <div className="mt-3 text-right">
            <Button size="sm" variant="outline" onClick={() => navigate('/hotbiz')} className="text-xs h-7">
              HotBizリンク集へ
            </Button>
          </div>
        </div>

        {/* Tasks (4/12) - Real Data from DB */}
        <div className="md:col-span-4 bg-white border border-gray-100 rounded-[20px] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <h3 className="font-bold text-gray-800">タスク / ワークフロー</h3>
              </div>
              <span className="text-[11px] font-bold text-gray-400">{tasks.length}件</span>
            </div>
            {tasks.length === 0 ? (
              <div className="py-6 text-center text-gray-400 border border-dashed rounded-xl">
                <p className="text-xs font-bold text-gray-500">現在表示できるタスクはありません</p>
                <p className="text-[10px] text-gray-400 mt-1">未完了のワークフローはありません</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg text-xs">
                    <span className="font-bold text-gray-800 flex-1 truncate">{t.title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="w-full text-xs text-gray-500 hover:text-primary">
              案件タスクを確認
            </Button>
          </div>
        </div>

        {/* ROW 3 */}
        {/* Recent Projects (6/12) - Real Data from DB */}
        <div className="md:col-span-6 bg-white border border-gray-100 rounded-[20px] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-purple-500" />
                <h3 className="font-bold text-gray-800">最近閲覧した案件</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="text-[11px] font-bold text-primary p-0">
                すべて見る
              </Button>
            </div>

            {recent_projects.length === 0 ? (
              <div className="py-8 text-center border border-dashed rounded-xl text-gray-400">
                <FolderKanban className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-xs font-bold text-gray-500">最近閲覧した案件はありません</p>
                <p className="text-[10px] text-gray-400 mt-1">案件一覧から案件を選択して閲覧してください。</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recent_projects.map((rp) => (
                  <div
                    key={rp.id}
                    id={`recent-project-${rp.id}`}
                    onClick={() => navigate(`/projects/${rp.id}`)}
                    className="flex items-center justify-between p-3 border rounded-xl hover:border-orange-200 hover:bg-orange-50/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <FolderKanban className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold text-gray-800 group-hover:text-primary transition-colors">
                        {rp.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {renderStatusBadge(rp.status)}
                      <span className="text-xs font-bold text-gray-600 w-9 text-right">{rp.progress_rate}%</span>
                      <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notifications (6/12) - Real Data from DB */}
        <div className="md:col-span-6 bg-white border border-gray-100 rounded-[20px] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-orange-500" />
                <h3 className="font-bold text-gray-800">重要なお知らせ</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/notifications')} className="text-[11px] font-bold text-primary p-0">
                通知一覧へ
              </Button>
            </div>

            {notifications.length === 0 ? (
              <div className="py-8 text-center border border-dashed rounded-xl text-gray-400">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-xs font-bold text-gray-500">現在、重要なお知らせはありません</p>
                <p className="text-[10px] text-gray-400 mt-1">新しい通知が届くとここに表示されます。</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 border rounded-xl bg-gray-50/50">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-gray-800">{n.title}</span>
                      <span className="text-[10px] text-gray-400">{new Date(n.created_at).toLocaleDateString('ja-JP')}</span>
                    </div>
                    {n.content && <p className="text-xs text-gray-500">{n.content}</p>}
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
