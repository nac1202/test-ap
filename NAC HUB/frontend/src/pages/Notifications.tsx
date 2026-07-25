import React from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Bell, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';

export default function Notifications() {
  const notifications = [
    { id: 1, icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-100', title: 'Slack通知', desc: 'A社案件チャンネルでメンションされました', time: '10分前' },
    { id: 2, icon: RefreshCw, color: 'text-green-500', bg: 'bg-green-100', title: '案件更新', desc: '「社内ポータル刷新」のステータスが変更されました', time: '1時間前' },
    { id: 3, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100', title: 'システムエラー', desc: '勤怠システムとの同期に失敗しました', time: '昨日' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" /> 通知センター
        </h2>
        <button className="text-sm font-bold text-primary hover:underline">すべて既読にする</button>
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (
          <Card key={n.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-start gap-4">
              <div className={`p-2 rounded-full ${n.bg}`}>
                <n.icon className={`h-5 w-5 ${n.color}`} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">{n.title}</p>
                <p className="text-sm text-gray-600 mt-1">{n.desc}</p>
              </div>
              <p className="text-xs text-text-muted">{n.time}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
