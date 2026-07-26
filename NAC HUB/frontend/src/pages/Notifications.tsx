import React from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Bell } from 'lucide-react';

export default function Notifications() {
  const notifications = [
    { id: 1, title: '案件「新システム開発」の進捗が更新されました', time: '10分前', isRead: false },
    { id: 2, title: '新しいタイムライン投稿があります', time: '1時間前', isRead: false },
    { id: 3, title: '【リマインド】週次進捗報告の入力期限です', time: '3時間前', isRead: true },
    { id: 4, title: 'パスワード変更が正常に完了しました', time: '昨日', isRead: true },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-800 flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary shrink-0" />
            通知センター
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">あなた宛ての通知や更新アラートを確認できます。</p>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (
          <Card key={n.id} className={`border border-gray-100 shadow-sm rounded-xl sm:rounded-2xl transition-colors ${n.isRead ? 'bg-white' : 'bg-orange-50/30 border-orange-100'}`}>
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${n.isRead ? 'bg-gray-100 text-gray-400' : 'bg-primary/10 text-primary'}`}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-bold text-gray-800 break-words">{n.title}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{n.time}</p>
                </div>
              </div>
              {n.isRead ? (
                <span className="text-[10px] text-gray-400 shrink-0 font-medium">既読</span>
              ) : (
                <span className="text-[10px] bg-primary text-white font-bold px-2 py-0.5 rounded-full shrink-0">未読</span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
