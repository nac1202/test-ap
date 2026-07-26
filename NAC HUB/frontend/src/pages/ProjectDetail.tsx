import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import {
  ArrowLeft,
  Clock,
  UserCheck,
  UserPlus,
  Trash2,
  Edit3,
  Loader2,
  AlertCircle,
  Send,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchProjectDetail,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  addProjectTimeline,
} from '../api/projects';
import type { ProjectDetail as IProjectDetail } from '../types/project';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  normal: { label: '正常', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  warning: { label: '注意', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  delayed: { label: '遅延', className: 'bg-rose-100 text-rose-800 border-rose-200' },
};

function renderStatusBadge(statusStr: string) {
  const config = STATUS_LABELS[statusStr] || { label: statusStr, className: 'bg-gray-100 text-gray-700 border-gray-200' };
  return (
    <span id="project-status-badge" className={`px-2.5 py-1 rounded-full text-xs font-bold border ${config.className}`}>
      {config.label}
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '未設定';
  try {
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  const [project, setProject] = useState<IProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<string>('normal');
  const [editProgress, setEditProgress] = useState(0);
  const [editEndDate, setEditEndDate] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add Member Modal State
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState('メンバー');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Timeline Form State
  const [timelineContent, setTimelineContent] = useState('');
  const [isAddingTimeline, setIsAddingTimeline] = useState(false);

  const projectId = Number(id);

  const canDelete =
    user?.is_admin === true ||
    user?.role_name === 'admin' ||
    user?.role_name === 'system_admin';

  const loadDetail = useCallback(async () => {
    if (!projectId || isNaN(projectId)) {
      setError('無効な案件IDです。');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchProjectDetail(projectId, token);
      setProject(data);
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string };
      if (errorObj.status === 401) {
        logout();
        return;
      }
      setError(errorObj.message || '案件詳細の取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, token, logout]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const openEditModal = () => {
    if (!project) return;
    setEditName(project.name);
    setEditStatus(project.status);
    setEditProgress(project.progress_rate);
    setEditEndDate(project.deadline || '');
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setIsUpdating(true);
    try {
      await updateProject(
        projectId,
        {
          name: editName.trim(),
          status: editStatus,
          progress_rate: Number(editProgress),
          deadline: editEndDate || undefined,
        },
        token
      );
      setIsEditModalOpen(false);
      await loadDetail();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      alert(errorObj.message || '更新に失敗しました。');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteProject(projectId, token);
      setIsDeleteModalOpen(false);
      navigate('/projects', { replace: true });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      alert(errorObj.message || '削除に失敗しました。');
      setIsDeleting(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberUserId || isNaN(Number(memberUserId))) return;
    setIsAddingMember(true);
    try {
      await addProjectMember(
        projectId,
        Number(memberUserId),
        memberRole,
        token
      );
      setIsAddMemberModalOpen(false);
      setMemberUserId('');
      setMemberRole('メンバー');
      await loadDetail();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      alert(errorObj.message || 'メンバーの追加に失敗しました。');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!window.confirm('このメンバーを案件から削除しますか？')) return;
    try {
      await removeProjectMember(projectId, userId, token);
      await loadDetail();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      alert(errorObj.message || 'メンバーの削除に失敗しました。');
    }
  };

  const handleAddTimeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timelineContent.trim() || isAddingTimeline) return;
    setIsAddingTimeline(true);
    try {
      await addProjectTimeline(
        projectId,
        'comment',
        timelineContent.trim(),
        token
      );
      setTimelineContent('');
      await loadDetail();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      alert(errorObj.message || 'タイムラインの投稿に失敗しました。');
    } finally {
      setIsAddingTimeline(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 min-h-[300px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">案件情報を読み込み中...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-6 sm:p-8 max-w-lg mx-auto bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4 my-6 sm:my-10">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="text-base sm:text-lg font-bold text-gray-800">エラーが発生しました</h3>
        <p className="text-xs sm:text-sm text-gray-600">{error || '案件が見つかりません。'}</p>
        <Button onClick={() => navigate('/projects')} className="bg-primary text-white font-bold min-h-[44px]">
          <ArrowLeft className="h-4 w-4 mr-2" /> 案件一覧へ戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-10">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/projects')}
          className="text-gray-500 hover:text-primary gap-1.5 p-1 text-xs sm:text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> 案件一覧に戻る
        </Button>
      </div>

      <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {renderStatusBadge(project.status)}
                <span className="text-xs text-gray-400">ID: {project.id}</span>
              </div>
              <h1 id="project-detail-name" className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight break-words">
                {project.name}
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap pt-2 md:pt-0">
              <Button
                id="btn-edit-project"
                variant="outline"
                size="sm"
                onClick={openEditModal}
                className="gap-1.5 font-bold border-gray-200 hover:bg-gray-50 text-xs sm:text-sm min-h-[40px]"
              >
                <Edit3 className="h-4 w-4 text-gray-500" /> 編集
              </Button>
              {canDelete && (
                <Button
                  id="btn-delete-project"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="gap-1.5 font-bold border-rose-200 text-rose-600 hover:bg-rose-50 text-xs sm:text-sm min-h-[40px]"
                >
                  <Trash2 className="h-4 w-4 text-rose-500" /> 削除
                </Button>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-100 space-y-3">
            <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
              <span className="text-gray-700">進捗状況</span>
              <span className="text-primary text-base font-black">{project.progress_rate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${project.progress_rate}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 pt-1">
              <div>
                <span className="block text-[10px] text-gray-400">プロデューサー</span>
                <span className="font-bold text-gray-700 truncate block">{project.producer_name || '未設定'}</span>
              </div>
              <div>
                <span className="block text-[10px] text-gray-400">完了予定日</span>
                <span className="font-bold text-gray-700 truncate block">{formatDate(project.deadline)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
        {/* Members Column */}
        <div className="md:col-span-4 space-y-4">
          <Card className="border border-gray-100 shadow-sm rounded-2xl">
            <CardHeader className="p-4 border-b border-gray-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                プロジェクトメンバー ({project.members.length})
              </CardTitle>
              <Button
                id="btn-add-member"
                size="sm"
                variant="ghost"
                onClick={() => setIsAddMemberModalOpen(true)}
                className="text-primary hover:bg-orange-50 p-1 text-xs gap-1 h-8"
              >
                <UserPlus className="h-4 w-4" /> 追加
              </Button>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              {project.members.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">メンバーがまだ割り当てられていません。</p>
              ) : (
                <div className="space-y-2">
                  {project.members.map((m) => (
                    <div
                      key={m.user_id}
                      className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                          {m.user_name?.[0] || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-800 truncate">{m.user_name || `ユーザー #${m.user_id}`}</p>
                          <p className="text-[10px] text-gray-400 truncate">{m.role || 'メンバー'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(m.user_id)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors shrink-0"
                        title="メンバーから削除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Timelines Column */}
        <div className="md:col-span-8 space-y-4">
          <Card className="border border-gray-100 shadow-sm rounded-2xl">
            <CardHeader className="p-4 border-b border-gray-100">
              <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                タイムライン・進捗記録 ({project.timelines.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <form onSubmit={handleAddTimeline} className="space-y-2">
                <Input
                  id="timeline-input"
                  type="text"
                  placeholder="本日の進捗や共有メモを投稿..."
                  value={timelineContent}
                  onChange={(e) => setTimelineContent(e.target.value)}
                  className="bg-gray-50 focus:bg-white text-xs sm:text-sm h-11"
                  disabled={isAddingTimeline}
                />
                <div className="flex justify-end">
                  <Button
                    id="btn-post-timeline"
                    type="submit"
                    size="sm"
                    className="bg-primary text-white font-bold gap-1.5 min-h-[40px]"
                    disabled={isAddingTimeline || !timelineContent.trim()}
                  >
                    {isAddingTimeline ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    投稿する
                  </Button>
                </div>
              </form>

              {project.timelines.length === 0 ? (
                <div className="py-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                  <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-medium">まだタイムライン投稿はありません</p>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {project.timelines.map((t) => (
                    <div key={t.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span className="font-bold text-gray-700 flex items-center gap-1">
                          <UserIcon className="h-3 w-3 text-primary" /> {t.user_name || '投稿者'}
                        </span>
                        <span>{formatDate(t.created_at)}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
                        {t.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="案件情報の編集">
        <form onSubmit={handleUpdate} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 block">案件名 <span className="text-red-500">*</span></label>
            <Input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 block">ステータス</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full h-11 px-3 bg-gray-50 border border-gray-300 rounded-md text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="normal">正常</option>
                <option value="warning">注意</option>
                <option value="delayed">遅延</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 block">進捗率 (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={editProgress}
                onChange={(e) => setEditProgress(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 block">完了予定日</label>
            <Input
              type="date"
              value={editEndDate}
              onChange={(e) => setEditEndDate(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} className="min-h-[44px]">
              キャンセル
            </Button>
            <Button type="submit" className="bg-primary text-white font-bold min-h-[44px]" disabled={isUpdating}>
              {isUpdating ? '保存中...' : '更新を保存'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="案件の削除確認">
        <div className="space-y-4 pt-2">
          <p className="text-sm text-gray-700 leading-relaxed">
            本当に案件「<span className="font-bold text-gray-900">{project.name}</span>」を削除しますか？<br />
            この操作は取り消せません。
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="min-h-[44px]">
              キャンセル
            </Button>
            <Button
              id="btn-confirm-delete-project"
              type="button"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-bold min-h-[44px]"
              disabled={isDeleting}
            >
              {isDeleting ? '削除中...' : '削除する'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Member Modal */}
      <Modal isOpen={isAddMemberModalOpen} onClose={() => setIsAddMemberModalOpen(false)} title="メンバーの追加">
        <form onSubmit={handleAddMember} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 block">ユーザーID <span className="text-red-500">*</span></label>
            <Input
              type="number"
              required
              placeholder="例: 2"
              value={memberUserId}
              onChange={(e) => setMemberUserId(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 block">案件内役割</label>
            <Input
              type="text"
              placeholder="例: フロントエンド担当"
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsAddMemberModalOpen(false)} className="min-h-[44px]">
              キャンセル
            </Button>
            <Button type="submit" className="bg-primary text-white font-bold min-h-[44px]" disabled={isAddingMember}>
              {isAddingMember ? '追加中...' : '追加する'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
