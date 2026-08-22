import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Bell, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Notification {
  id: number;
  title: string;
  content?: string;
  category: string;
  is_read: boolean;
  created_at: string;
}

export default function Notifications() {
  const { token } = useAuth();
  const { refreshUnreadCount } = useOutletContext<{ refreshUnreadCount: () => void }>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/notifications?limit=50', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.items || []);
      } else {
        throw new Error('通知の取得に失敗しました');
      }
    } catch (err) {
      setError('通知データの読み込み中にエラーが発生しました');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        refreshUnreadCount();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        refreshUnreadCount();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">通知を読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-lg mx-auto bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4 my-10">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <p className="text-sm text-gray-600">{error}</p>
        <Button onClick={fetchNotifications} className="bg-primary text-white">再読み込み</Button>
      </div>
    );
  }

  const hasUnread = notifications.some(n => !n.is_read);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-800 flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary shrink-0" />
            通知センター
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">あなた宛ての通知や更新アラートを確認できます。</p>
        </div>
        {hasUnread && (
          <Button onClick={markAllAsRead} variant="outline" size="sm" className="shrink-0 self-start sm:self-auto border-primary text-primary hover:bg-primary/5 h-9">
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> 全て既読にする
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="py-16 text-center bg-white border border-gray-100 rounded-2xl shadow-sm">
          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-gray-800 font-bold mb-1">新しい通知はありません</h3>
          <p className="text-sm text-gray-500">現在あなた宛ての通知はありません。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card 
              key={n.id} 
              className={`border shadow-sm rounded-xl sm:rounded-2xl transition-colors cursor-pointer ${n.is_read ? 'bg-white border-gray-100' : 'bg-orange-50/30 border-orange-100'}`}
              onClick={() => !n.is_read && markAsRead(n.id)}
            >
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${n.is_read ? 'bg-gray-100 text-gray-400' : 'bg-primary/10 text-primary'}`}>
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-bold text-gray-800 break-words">{n.title}</p>
                    {n.content && <p className="text-[11px] sm:text-xs text-gray-600 mt-1 whitespace-pre-wrap break-words">{n.content}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                </div>
                {n.is_read ? (
                  <span className="text-[10px] text-gray-400 shrink-0 font-medium">既読</span>
                ) : (
                  <span className="text-[10px] bg-primary text-white font-bold px-2 py-0.5 rounded-full shrink-0">未読</span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
