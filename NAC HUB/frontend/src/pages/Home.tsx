import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  Calendar, FolderKanban, Bell, CheckCircle2, ArrowRight,
  UserCheck, Plus, AlertTriangle, CloudRain, Sun, Clock
} from 'lucide-react';
import { Input } from '../components/ui/Input';

export default function Home() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* ROW 1 */}
        {/* Nakkun Hero (8/12) */}
        <div className="md:col-span-8 bg-white border border-gray-100 rounded-[20px] p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex gap-6 relative z-10">
            <div className="w-32 shrink-0">
              <img src="/nakkun.png" alt="なっくん" className="w-full h-auto object-contain drop-shadow-md" />
            </div>
            <div className="flex-1 pt-2">
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">
                おはようございます、菊地さん！
              </h2>
              <p className="text-primary font-bold mt-1 text-sm flex items-center gap-1">
                <Sun className="h-4 w-4" /> なっくんが今日のポイントをお知らせします <Sun className="h-4 w-4" />
              </p>
              
              <div className="flex gap-4 mt-6">
                <div className="flex-1 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-500 text-xs font-bold mb-1">
                    <Calendar className="h-4 w-4 text-orange-400" /> 今日は会議が
                  </div>
                  <p className="text-gray-800"><span className="text-2xl font-black">2</span><span className="text-sm font-bold ml-1">件</span></p>
                  <p className="text-gray-500 text-[10px] mt-1">入っています</p>
                </div>
                <div className="w-px bg-gray-100" />
                <div className="flex-1 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-500 text-xs font-bold mb-1">
                    <FolderKanban className="h-4 w-4 text-yellow-400" /> 昨日更新された案件は
                  </div>
                  <p className="text-gray-800"><span className="text-2xl font-black">3</span><span className="text-sm font-bold ml-1">件</span></p>
                  <p className="text-gray-500 text-[10px] mt-1">あります</p>
                </div>
                <div className="w-px bg-gray-100" />
                <div className="flex-1 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-500 text-xs font-bold mb-1">
                    <Bell className="h-4 w-4 text-orange-500" /> 未読のお知らせが
                  </div>
                  <p className="text-gray-800"><span className="text-2xl font-black">5</span><span className="text-sm font-bold ml-1">件</span></p>
                  <p className="text-gray-500 text-[10px] mt-1">あります</p>
                </div>
                <div className="w-px bg-gray-100" />
                <div className="flex-1 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-500 text-xs font-bold mb-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" /> 期限が近いタスクが
                  </div>
                  <p className="text-gray-800"><span className="text-2xl font-black">4</span><span className="text-sm font-bold ml-1">件</span></p>
                  <p className="text-gray-500 text-[10px] mt-1">あります</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 relative z-10">
            <div className="relative flex items-center">
              <Input 
                className="w-full pl-4 pr-12 py-5 text-sm rounded-xl border-gray-200 bg-gray-50 focus-visible:ring-primary/20" 
                placeholder="なっくんに何でも聞いてください..." 
              />
              <div className="absolute right-2">
                <Button className="h-8 w-8 p-0 rounded-lg bg-primary hover:bg-primary-dark shadow-sm flex items-center justify-center">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access (4/12) */}
        <div className="md:col-span-4 bg-white border border-gray-100 rounded-[20px] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-gray-600"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </span>
            <h3 className="font-bold text-gray-800">クイックアクセス</h3>
          </div>
          
          <div className="grid grid-cols-4 gap-3 items-center">
            <div className="flex flex-col items-center gap-2 cursor-pointer group">
              <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center group-hover:border-primary/50 group-hover:shadow transition-all">
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-black text-xl">H</div>
              </div>
              <span className="text-[10px] font-bold text-gray-600 group-hover:text-primary transition-colors">HotBiz</span>
            </div>
            <div className="flex flex-col items-center gap-2 cursor-pointer group">
              <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center group-hover:border-primary/50 group-hover:shadow transition-all">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-black text-xl">S</div>
              </div>
              <span className="text-[10px] font-bold text-gray-600 group-hover:text-primary transition-colors">Slack</span>
            </div>
            <div className="flex flex-col items-center gap-2 cursor-pointer group">
              <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center group-hover:border-primary/50 group-hover:shadow transition-all">
                <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white font-black text-xl">N</div>
              </div>
              <span className="text-[10px] font-bold text-gray-600 group-hover:text-primary transition-colors">NotePM</span>
            </div>
            <div className="flex flex-col items-center gap-2 cursor-pointer group">
              <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center group-hover:border-primary/50 group-hover:shadow transition-all">
                <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white font-black text-xl">G</div>
              </div>
              <span className="text-[10px] font-bold text-gray-600 group-hover:text-primary transition-colors">Google Drive</span>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
             <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50">
               <ArrowRight className="h-4 w-4 text-gray-500" />
             </button>
          </div>
        </div>

        {/* ROW 2 */}
        {/* Attendance (4/12) */}
        <div className="md:col-span-4 bg-white border border-gray-100 rounded-[20px] p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <UserCheck className="h-5 w-5 text-blue-500" />
            <h3 className="font-bold text-gray-800">今日の出勤状況</h3>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-2">
             <div className="bg-green-50 rounded-xl p-3 flex flex-col justify-center items-center">
               <p className="text-[10px] font-bold text-green-600 mb-1">出勤</p>
               <p className="text-xl font-black text-gray-800">36<span className="text-xs ml-0.5">名</span></p>
               <p className="text-[10px] text-gray-500 mt-0.5">(72%)</p>
             </div>
             <div className="bg-yellow-50 rounded-xl p-3 flex flex-col justify-center items-center">
               <p className="text-[10px] font-bold text-yellow-600 mb-1">在宅</p>
               <p className="text-xl font-black text-gray-800">8<span className="text-xs ml-0.5">名</span></p>
               <p className="text-[10px] text-gray-500 mt-0.5">(16%)</p>
             </div>
             <div className="bg-red-50 rounded-xl p-3 flex flex-col justify-center items-center">
               <p className="text-[10px] font-bold text-red-600 mb-1">休暇</p>
               <p className="text-xl font-black text-gray-800">4<span className="text-xs ml-0.5">名</span></p>
               <p className="text-[10px] text-gray-500 mt-0.5">(8%)</p>
             </div>
          </div>
          <div className="flex justify-between items-center mt-4">
             <span className="text-[11px] font-bold text-gray-500">全体 50名</span>
             <span className="text-[11px] text-gray-400 flex items-center gap-1">最終更新: 09:00 <Clock className="h-3 w-3" /></span>
          </div>
        </div>

        {/* Schedule (4/12) */}
        <div className="md:col-span-4 bg-white border border-gray-100 rounded-[20px] p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <h3 className="font-bold text-gray-800">今日の予定</h3>
            </div>
            <span className="text-[11px] font-bold text-gray-500 cursor-pointer hover:text-primary">すべて見る</span>
          </div>
          <div className="space-y-4 flex-1">
             <div className="flex gap-3">
                <div className="w-1 rounded-full bg-blue-500" />
                <div className="w-20 shrink-0">
                  <p className="text-xs font-bold text-gray-600">09:30 - 10:30</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">定例ミーティング</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">会議室A</p>
                </div>
             </div>
             <div className="flex gap-3">
                <div className="w-1 rounded-full bg-green-500" />
                <div className="w-20 shrink-0">
                  <p className="text-xs font-bold text-gray-600">11:00 - 12:00</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">営業戦略会議</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">会議室B</p>
                </div>
             </div>
             <div className="flex gap-3">
                <div className="w-1 rounded-full bg-orange-400" />
                <div className="w-20 shrink-0">
                  <p className="text-xs font-bold text-gray-600">14:00 - 15:30</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">プロジェクトレビュー</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">会議室C</p>
                </div>
             </div>
          </div>
        </div>

        {/* Tasks (4/12) */}
        <div className="md:col-span-4 bg-white border border-gray-100 rounded-[20px] p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <h3 className="font-bold text-gray-800">今日やること</h3>
            </div>
            <span className="text-[11px] font-bold text-gray-500 cursor-pointer hover:text-primary">すべて見る</span>
          </div>
          <div className="space-y-4 flex-1">
             <div className="flex items-center gap-3">
               <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
               <span className="text-sm font-bold text-gray-800 flex-1">A社 見積書作成</span>
               <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">重要</span>
               <span className="text-[11px] font-bold text-red-500 ml-2">今日まで</span>
             </div>
             <div className="flex items-center gap-3">
               <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
               <span className="text-sm font-bold text-gray-800 flex-1">企画書レビュー</span>
               <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">優先</span>
               <span className="text-[11px] font-bold text-red-500 ml-2">今日まで</span>
             </div>
             <div className="flex items-center gap-3">
               <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
               <span className="text-sm font-bold text-gray-800 flex-1">経費申請の確認</span>
               <span className="text-[11px] text-gray-400 ml-2">明日まで</span>
             </div>
          </div>
          <div className="mt-4">
            <button className="flex items-center gap-1 text-primary text-xs font-bold hover:underline">
               <Plus className="h-4 w-4" /> タスクを追加
            </button>
          </div>
        </div>

        {/* ROW 3 */}
        {/* Recent Projects (4/12) */}
        <div className="md:col-span-4 bg-white border border-gray-100 rounded-[20px] p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-purple-500" />
              <h3 className="font-bold text-gray-800">最近開いた案件</h3>
            </div>
            <span className="text-[11px] font-bold text-gray-500 cursor-pointer hover:text-primary">すべて見る</span>
          </div>
          <div className="space-y-4">
             <div className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                   <FolderKanban className="h-4 w-4 text-blue-500" />
                   <span className="text-sm font-bold text-gray-800 group-hover:text-primary transition-colors">A社 新規プロジェクト</span>
                </div>
                <div className="flex items-center gap-3">
                   <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded w-12 text-center">進行中</span>
                   <span className="text-xs font-bold text-gray-800 w-8 text-right">70%</span>
                   <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-primary transition-colors" />
                </div>
             </div>
             <div className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                   <FolderKanban className="h-4 w-4 text-blue-500" />
                   <span className="text-sm font-bold text-gray-800 group-hover:text-primary transition-colors">社内ポータル刷新</span>
                </div>
                <div className="flex items-center gap-3">
                   <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded w-12 text-center">進行中</span>
                   <span className="text-xs font-bold text-gray-800 w-8 text-right">40%</span>
                   <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-primary transition-colors" />
                </div>
             </div>
             <div className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                   <FolderKanban className="h-4 w-4 text-blue-500" />
                   <span className="text-sm font-bold text-gray-800 group-hover:text-primary transition-colors">B社 システム開発</span>
                </div>
                <div className="flex items-center gap-3">
                   <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded w-12 text-center">要確認</span>
                   <span className="text-xs font-bold text-gray-800 w-8 text-right">20%</span>
                   <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-primary transition-colors" />
                </div>
             </div>
          </div>
        </div>

        {/* Notices (4/12) */}
        <div className="md:col-span-4 bg-white border border-gray-100 rounded-[20px] p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h3 className="font-bold text-gray-800">重要なお知らせ</h3>
            </div>
            <span className="text-[11px] font-bold text-gray-500 cursor-pointer hover:text-primary">すべて見る</span>
          </div>
          <div className="space-y-4">
             <div className="flex gap-3">
               <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded shrink-0 h-fit mt-0.5">重要</span>
               <div>
                  <p className="text-sm font-bold text-gray-800 hover:text-primary cursor-pointer">社内システムメンテナンスのお知らせ</p>
                  <p className="text-[11px] text-gray-400 mt-1">06/25 10:30</p>
               </div>
             </div>
             <div className="flex gap-3">
               <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded shrink-0 h-fit mt-0.5">重要</span>
               <div>
                  <p className="text-sm font-bold text-gray-800 hover:text-primary cursor-pointer">新オフィス移転に関するご案内</p>
                  <p className="text-[11px] text-gray-400 mt-1">06/24 16:20</p>
               </div>
             </div>
             <div className="flex gap-3">
               <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded shrink-0 h-fit mt-0.5">重要</span>
               <div>
                  <p className="text-sm font-bold text-gray-800 hover:text-primary cursor-pointer">セキュリティ研修の実施について</p>
                  <p className="text-[11px] text-gray-400 mt-1">06/24 09:15</p>
               </div>
             </div>
          </div>
        </div>

        {/* Notifications (4/12) */}
        <div className="md:col-span-4 bg-white border border-gray-100 rounded-[20px] p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-gray-800" />
              <h3 className="font-bold text-gray-800">通知</h3>
            </div>
            <span className="text-[11px] font-bold text-gray-500 cursor-pointer hover:text-primary">すべて見る</span>
          </div>
          <div className="space-y-4">
             <div className="flex gap-3 relative">
               <div className="absolute top-1.5 -right-1 w-1.5 h-1.5 bg-primary rounded-full" />
               <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                  <div className="text-[10px] font-black text-gray-600">Sl</div>
               </div>
               <div>
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-bold text-gray-800">Slack</span>
                     <span className="text-[10px] text-gray-400">5分前</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">#project-a</p>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">田中さんが新しいメッセージを投稿しました</p>
               </div>
             </div>
             <div className="flex gap-3">
               <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center shrink-0">
                  <FolderKanban className="h-4 w-4 text-blue-500" />
               </div>
               <div className="flex-1">
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-bold text-gray-800">案件管理</span>
                     <span className="text-[10px] text-gray-400">1時間前</span>
                  </div>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">A社 新規プロジェクトが更新されました</p>
               </div>
             </div>
             <div className="flex gap-3">
               <div className="w-8 h-8 rounded bg-yellow-50 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-yellow-600"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
               </div>
               <div className="flex-1">
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-bold text-gray-800">ワークフロー</span>
                     <span className="text-[10px] text-gray-400">2時間前</span>
                  </div>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">経費精算の承認依頼が届いています</p>
               </div>
             </div>
          </div>
        </div>

        {/* ROW 4 */}
        {/* Project Status (3/12) */}
        <div className="md:col-span-3 bg-white border border-gray-100 rounded-[20px] p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 text-sm">今月の案件状況</h3>
            <span className="text-[10px] font-bold text-gray-500 cursor-pointer hover:text-primary">すべて見る</span>
          </div>
          <div className="flex items-center gap-4 flex-1">
             <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full">
                  <path className="text-gray-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-primary" strokeWidth="4" strokeDasharray="58, 100" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-yellow-400" strokeWidth="4" strokeDasharray="25, 100" strokeDashoffset="-58" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-green-400" strokeWidth="4" strokeDasharray="17, 100" strokeDashoffset="-83" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <span className="text-[10px] text-gray-500 font-bold leading-none">合計</span>
                   <span className="text-sm font-black text-gray-800 leading-none mt-1">24件</span>
                </div>
             </div>
             <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between text-[11px]">
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary" /> <span className="text-gray-600">進行中</span></div>
                   <span className="font-bold">14件 <span className="text-gray-400 font-normal">(58%)</span></span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-400" /> <span className="text-gray-600">要確認</span></div>
                   <span className="font-bold">6件 <span className="text-gray-400 font-normal">(25%)</span></span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-400" /> <span className="text-gray-600">完了</span></div>
                   <span className="font-bold">4件 <span className="text-gray-400 font-normal">(17%)</span></span>
                </div>
             </div>
          </div>
        </div>

        {/* Task Progress (3/12) */}
        <div className="md:col-span-3 bg-white border border-gray-100 rounded-[20px] p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 text-sm">タスク進捗</h3>
            <span className="text-[10px] font-bold text-gray-500 cursor-pointer hover:text-primary">すべて見る</span>
          </div>
          <div className="flex items-end gap-6 flex-1">
             <div>
                <p className="text-3xl font-black text-primary leading-none">65%</p>
                <p className="text-xs text-gray-500 font-bold mt-1">完了率</p>
                <div className="h-2 w-full bg-gray-100 rounded-full mt-3 overflow-hidden flex">
                   <div className="h-full bg-primary w-[65%]" />
                </div>
             </div>
             <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between text-[11px]">
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500" /> <span className="text-gray-600">完了</span></div>
                   <span className="font-bold text-gray-800">13件</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary" /> <span className="text-gray-600">進行中</span></div>
                   <span className="font-bold text-gray-800">7件</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-400" /> <span className="text-gray-600">未着手</span></div>
                   <span className="font-bold text-gray-800">5件</span>
                </div>
             </div>
          </div>
        </div>

        {/* Nakkun Hint (3/12) */}
        <div className="md:col-span-3 bg-white border border-gray-100 rounded-[20px] p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Sun className="h-4 w-4 text-orange-400" />
            <h3 className="font-bold text-gray-800 text-sm">なっくんからのヒント</h3>
          </div>
          <div className="flex gap-4 flex-1">
             <div className="w-12 h-12 shrink-0">
               <img src="/nakkun.png" alt="なっくん" className="w-full h-full object-contain drop-shadow-sm" />
             </div>
             <div>
                <p className="text-xs font-bold text-gray-700 leading-snug">
                   A社プロジェクトの資料がNotePMで更新されています。確認してみましょう！
                </p>
                <button className="mt-3 text-[10px] font-bold text-primary border border-primary/30 px-3 py-1 rounded-full hover:bg-primary/5">
                   詳細を確認
                </button>
             </div>
          </div>
        </div>

        {/* Weather (3/12) */}
        <div className="md:col-span-3 bg-white border border-gray-100 rounded-[20px] p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-gray-800 text-sm mb-4">今日の天気 (東京)</h3>
          <div className="flex items-center justify-between flex-1">
             <div className="flex flex-col items-center">
                <CloudRain className="h-10 w-10 text-blue-400 mb-1" />
             </div>
             <div>
                <div className="flex items-end gap-2 mb-1">
                   <span className="text-3xl font-black text-gray-800 leading-none">24℃</span>
                   <span className="text-[11px] font-bold text-gray-500 pb-0.5">くもりのち雨</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-2">
                   <span>降水確率 60%</span>
                   <span>湿度 70%</span>
                </div>
                <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                   <span>明日</span>
                   <Sun className="h-3 w-3 text-orange-400 mx-1" />
                   <span className="font-bold text-gray-700">26℃/20℃</span>
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
