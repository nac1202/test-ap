import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { ExternalLink, Clock, Calendar, CheckSquare, FileText } from 'lucide-react';

export default function HotBiz() {
  const links = [
    { id: 1, title: 'タイムカード', icon: Clock, desc: '出退勤の打刻を行います', color: 'text-blue-500' },
    { id: 2, title: '予定表', icon: Calendar, desc: 'HotBizの予定表を開きます', color: 'text-orange-500' },
    { id: 3, title: '設備予約', icon: CheckSquare, desc: '会議室や社用車の予約', color: 'text-green-500' },
    { id: 4, title: 'ワークフロー', icon: FileText, desc: '各種申請や稟議の提出', color: 'text-purple-500' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <ExternalLink className="h-6 w-6 text-primary" /> HotBiz リンク集
          </h2>
          <p className="text-text-muted mt-1">以下のボタンからHotBizの各機能へ直接アクセスできます。</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {links.map(link => (
          <Card key={link.id} className="cursor-pointer hover:border-primary hover:shadow-md transition-all group">
            <CardContent className="p-6 flex items-center gap-6">
              <div className={`p-4 rounded-full bg-gray-50 group-hover:bg-primary/10 transition-colors`}>
                <link.icon className={`h-8 w-8 ${link.color}`} />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                  {link.title}
                  <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-primary transition-colors" />
                </h3>
                <p className="text-sm text-text-muted">{link.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
