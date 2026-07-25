import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ClipboardList, Plus } from 'lucide-react';

export default function Notices() {
  const notices = [
    { id: 1, title: '夏季休業のお知らせ', date: '2026-07-01', author: '総務部', isNew: true },
    { id: 2, title: '【重要】セキュリティ研修の受講について', date: '2026-06-25', author: '情シス', isNew: false },
    { id: 3, title: '第3四半期 キックオフミーティング開催場所', date: '2026-06-20', author: '経営企画', isNew: false },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" /> お知らせ一覧
        </h2>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> 新規投稿
        </Button>
      </div>

      <div className="space-y-4">
        {notices.map((notice) => (
          <Card key={notice.id} className="cursor-pointer hover:border-primary transition-colors">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 text-center">
                  <p className="text-xs text-text-muted">{notice.date}</p>
                </div>
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    {notice.title}
                    {notice.isNew && <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded font-bold">NEW</span>}
                  </h3>
                  <p className="text-sm text-text-muted mt-1">{notice.author}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
