import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ClipboardList, Calendar, Bell, Loader2, AlertCircle, Edit2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Notice {
  id: number;
  title: string;
  body: string;
  category: string;
  is_important: boolean;
  is_active: boolean;
  created_at: string;
}

export default function Notices() {
  const { token, user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    category: '全般',
    is_important: false,
    is_active: true,
  });

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

  const handleOpenCreateModal = () => {
    setEditingNotice(null);
    setFormData({
      title: '',
      body: '',
      category: '全般',
      is_important: false,
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (notice: Notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      body: notice.body,
      category: notice.category,
      is_important: notice.is_important,
      is_active: notice.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const url = editingNotice 
        ? `http://localhost:8000/api/v1/notices/${editingNotice.id}`
        : 'http://localhost:8000/api/v1/notices';
      
      const method = editingNotice ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        throw new Error('保存に失敗しました');
      }

      setIsModalOpen(false);
      fetchNotices();
    } catch (err) {
      console.error(err);
      alert('保存中にエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

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
          <Button variant="outline" size="sm" className="shrink-0 self-start sm:self-auto border-primary text-primary hover:bg-primary/5 h-9" onClick={handleOpenCreateModal}>
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
            <Card key={n.id} className={`border border-gray-100 shadow-sm rounded-xl sm:rounded-2xl overflow-hidden hover:border-primary/30 transition-colors ${!n.is_active ? 'opacity-60' : ''}`}>
              <CardContent className="p-4 sm:p-5 space-y-2 relative">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pr-10">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/10 text-primary font-bold px-2.5 py-0.5 rounded-full text-[11px]">
                      {n.category}
                    </span>
                    {n.is_important && (
                      <span className="bg-red-100 text-red-700 font-bold px-2.5 py-0.5 rounded-full text-[11px] flex items-center gap-1">
                        <Bell className="h-3 w-3" /> 重要
                      </span>
                    )}
                    {!n.is_active && isAdmin && (
                      <span className="bg-gray-100 text-gray-600 font-bold px-2.5 py-0.5 rounded-full text-[11px]">
                        非公開
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400 flex items-center gap-1 text-[11px]">
                    <Calendar className="h-3.5 w-3.5" /> {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </div>

                {isAdmin && (
                  <button 
                    onClick={() => handleOpenEditModal(n)}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                    title="編集"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}

                <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug break-words pr-8">
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingNotice ? "お知らせの編集" : "お知らせの新規作成"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">タイトル <span className="text-red-500">*</span></label>
            <Input 
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              required
              placeholder="お知らせのタイトル"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">カテゴリ <span className="text-red-500">*</span></label>
            <select 
              className="flex h-11 md:h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
              required
            >
              <option value="全般">全般</option>
              <option value="システム">システム</option>
              <option value="メンテナンス">メンテナンス</option>
              <option value="重要">重要</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">本文 <span className="text-red-500">*</span></label>
            <textarea 
              className="flex w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-base md:text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[120px] resize-y"
              value={formData.body}
              onChange={e => setFormData({...formData, body: e.target.value})}
              required
              placeholder="お知らせの内容を入力してください..."
            />
          </div>

          <div className="flex gap-6 pt-2 pb-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input 
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                checked={formData.is_important}
                onChange={e => setFormData({...formData, is_important: e.target.checked})}
              />
              重要なお知らせとしてマーク
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input 
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                checked={formData.is_active}
                onChange={e => setFormData({...formData, is_active: e.target.checked})}
              />
              公開する
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 保存中...</>
              ) : '保存する'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
