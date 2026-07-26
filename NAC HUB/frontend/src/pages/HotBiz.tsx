import React from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { ExternalLink, Clock, Calendar, CheckSquare, FileText } from 'lucide-react';

export default function HotBiz() {
  const links = [
    { title: 'HotBiz 予定表 / スケジュール', desc: '社内スケジュール確認・会議室予約', icon: Calendar, url: 'https://example.com/hotbiz/schedule' },
    { title: 'HotBiz タイムカード / 出退勤', desc: '毎日の出勤・退勤打刻リンク', icon: Clock, url: 'https://example.com/hotbiz/timecard' },
    { title: 'HotBiz ワークフロー / 申請', desc: '稟議・経費精算・休暇申請ポータル', icon: CheckSquare, url: 'https://example.com/hotbiz/workflow' },
    { title: 'HotBiz 回覧板・掲示板', desc: '社内通達・業務マニュアル参照', icon: FileText, url: 'https://example.com/hotbiz/bulletin' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-10">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-800 flex items-center gap-2">
          <ExternalLink className="h-6 w-6 text-primary shrink-0" />
          HotBiz 連携リンク集
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">HotBiz予定表・出勤打刻・ワークフローへのクイックアクセスリンクです。</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs sm:text-sm text-amber-800 font-medium">
        <p className="font-bold flex items-center gap-1.5 mb-1">
          <ExternalLink className="h-4 w-4 text-amber-600 shrink-0" /> HotBiz直接API本接続は準備中です
        </p>
        <p className="text-xs text-amber-700">現在はショートカットリンク集として機能します。クリックすると新しいタブで開きます。</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {links.map((link) => (
          <Card key={link.title} className="border border-gray-100 shadow-sm rounded-xl sm:rounded-2xl hover:border-primary/40 hover:shadow-md transition-all">
            <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <link.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate">{link.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-normal">{link.desc}</p>
                </div>
              </div>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                title="新しいタブで開く"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
