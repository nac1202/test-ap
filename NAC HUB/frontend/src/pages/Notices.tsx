import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ClipboardList, Calendar, Bell, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Notice {
  id: number;
  title: string;
  body: string;
  category: string;
  is_important: boolean;
  created_at: string;
}

export default function Notices() {
  const { token, user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotices = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/notices?limit=50', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotices(data.items || []);
      } else {
        throw new Error('お知らせの取得に失敗しました');
      }
    } catch (err) {
      setError('お知らせデータの読み込み中にエラーが発生しました');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const isAdmin = user?.role_id === 1;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">お知らせを読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-lg mx-auto bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4 my-10">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <p className="text-sm text-gray-600">{error}</p>
        <Button onClick={fetchNotices} className="bg-primary text-white">再読み込み</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-800 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary shrink-0" />
            全社お知らせ一覧
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">社内の重要連絡事項、アナウンスメントを閲覧できます。</p>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" className="shrink-0 self-start sm:self-auto border-primary text-primary hover:bg-primary/5 h-9" onClick={() => alert('機能準備中')}>
            + 新規作成
          </Button>
        )}
      </div>

      {notices.length === 0 ? (
        <div className="py-16 text-center bg-white border border-gray-100 rounded-2xl shadow-sm">
          <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-gray-800 font-bold mb-1">お知らせはありません</h3>
          <p className="text-sm text-gray-500">現在、公開されている全社お知らせはありません。</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {notices.map((n) => (
            <Card key={n.id} className="border border-gray-100 shadow-sm rounded-xl sm:rounded-2xl overflow-hidden hover:border-primary/30 transition-colors">
              <CardContent className="p-4 sm:p-5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/10 text-primary font-bold px-2.5 py-0.5 rounded-full text-[11px]">
                      {n.category}
                    </span>
                    {n.is_important && (
                      <span className="bg-red-100 text-red-700 font-bold px-2.5 py-0.5 rounded-full text-[11px] flex items-center gap-1">
                        <Bell className="h-3 w-3" /> 重要
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400 flex items-center gap-1 text-[11px]">
                    <Calendar className="h-3.5 w-3.5" /> {new Date(n.created_at).toLocaleDateString()}
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
      )}
    </div>
  );
}
