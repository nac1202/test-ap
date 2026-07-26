import React from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { ClipboardList, Calendar, Bell } from 'lucide-react';

export default function Notices() {
  const notices = [
    { id: 1, title: '【重要】システムリニューアルのお知らせ', date: '2026-07-25', category: '全社', important: true, body: 'NAC HUB が新システムとして稼働を開始いたしました。各機能のフィードバックをお寄せください。' },
    { id: 2, title: '夏季休業期間に関するご案内', date: '2026-07-20', category: '総務', important: false, body: '8月13日〜8月16日の期間は夏季休業となります。緊急のご連絡は各種エスカレーションフローをご確認ください。' },
    { id: 3, title: 'セキュリティポリシー改定の件', date: '2026-07-15', category: '情報セキュリティ', important: true, body: '強いパスワードへの変更および定期監査ルールを順次適用しております。' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-10">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-800 flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary shrink-0" />
          全社お知らせ一覧
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">社内の重要連絡事項、アナウンスメントを閲覧できます。</p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {notices.map((n) => (
          <Card key={n.id} className="border border-gray-100 shadow-sm rounded-xl sm:rounded-2xl overflow-hidden hover:border-primary/30 transition-colors">
            <CardContent className="p-4 sm:p-5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="bg-primary/10 text-primary font-bold px-2.5 py-0.5 rounded-full text-[11px]">
                    {n.category}
                  </span>
                  {n.important && (
                    <span className="bg-red-100 text-red-700 font-bold px-2.5 py-0.5 rounded-full text-[11px] flex items-center gap-1">
                      <Bell className="h-3 w-3" /> 重要
                    </span>
                  )}
                </div>
                <span className="text-gray-400 flex items-center gap-1 text-[11px]">
                  <Calendar className="h-3.5 w-3.5" /> {n.date}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug break-words">
                {n.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed whitespace-pre-wrap break-words">
                {n.body}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
