import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import {
  ArrowLeft,
  Clock,
  MessageCircle,
  FileText,
  Link as LinkIcon,
  Star,
  FolderKanban,
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
import type { ProjectDetail as IProjectDetail, ProjectStatus } from '../types/project';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  normal: { label: '正常', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  warning: { label: '注意', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  delayed: { label: '遅延', className: 'bg-rose-100 text-rose-800 border-rose-200' },
};

function renderStatusBadge(statusStr: string) {
  const config = STATUS_LABELS[statusStr] || { label: statusStr, className: 'bg-gray-100 text-gray-700' };
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

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('ja-JP')} ${d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return dateStr;
  }
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user, logout } = useAuth();

  const [project, setProject] = useState<IProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [is404, setIs404] = useState<boolean>(false);

  // Edit Modal
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editStatus, setEditStatus] = useState<ProjectStatus>('normal');
  const [editProgress, setEditProgress] = useState<number>(0);
  const [editDeadline, setEditDeadline] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Add Member Modal
  const [isMemberModalOpen, setIsMemberModalOpen] = useState<boolean>(false);
  const [memberUserId, setMemberUserId] = useState<string>('');
  const [memberRole, setMemberRole] = useState<string>('member');
  const [memberError, setMemberError] = useState<string>('');

  // Add Timeline Input
  const [newTimelineContent, setNewTimelineContent] = useState<string>('');
  const [isPostingTimeline, setIsPostingTimeline] = useState<boolean>(false);

  // Delete Modal
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Admin Role Check (semantic check using is_admin or role_name)
  const isAdmin = user?.is_admin === true || user?.role_name === 'admin' || user?.role_name === 'system_admin';

  const loadProject = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError('');
    setIs404(false);
    try {
      const data = await fetchProjectDetail(id, token);
      setProject(data);
      setEditName(data.name);
      setEditStatus(data.status as ProjectStatus);
      setEditProgress(data.progress_rate);
      setEditDeadline(data.deadline ? data.deadline.split('T')[0] : '');
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string };
      if (errorObj.status === 401) {
        logout();
        return;
      }
      if (errorObj.status === 404) {
        setIs404(true);
        setError('指定された案件が存在しないか、アクセス権限がありません。');
      } else {
        setError(errorObj.message || '案件詳細の取得に失敗しました。');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, token, logout]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !project) return;
    setIsSaving(true);
    try {
      await updateProject(
        id,
        {
          name: editName.trim(),
          status: editStatus,
          progress_rate: Number(editProgress),
          deadline: editDeadline ? new Date(editDeadline).toISOString() : null,
        },
        token
      );
      setIsEditOpen(false);
      loadProject();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      alert(errorObj.message || '更新に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await deleteProject(id, token);
      navigate('/projects');
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      alert(errorObj.message || '案件の削除に失敗しました。');
      setIsDeleting(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !memberUserId.trim()) return;
    setMemberError('');
    try {
      await addProjectMember(id, Number(memberUserId.trim()), memberRole, token);
      setIsMemberModalOpen(false);
      setMemberUserId('');
      loadProject();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setMemberError(errorObj.message || 'メンバーの追加に失敗しました。');
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!id) return;
    if (!confirm('このメンバーを案件から外しますか？')) return;
    try {
      await removeProjectMember(id, userId, token);
      loadProject();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      alert(errorObj.message || 'メンバーの削除に失敗しました。');
    }
  };

  const handlePostTimeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newTimelineContent.trim()) return;
    setIsPostingTimeline(true);
    try {
      await addProjectTimeline(id, 'note', newTimelineContent.trim(), token);
      setNewTimelineContent('');
      loadProject();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      alert(errorObj.message || 'タイムラインの投稿に失敗しました。');
    } finally {
      setIsPostingTimeline(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">案件詳細を読み込み中...</p>
      </div>
    );
  }

  if (is404 || error || !project) {
    return (
      <div className="space-y-6">
        <Button id="btn-back-projects-404" variant="ghost" size="sm" onClick={() => navigate('/projects')} className="flex items-center gap-2 text-gray-600">
          <ArrowLeft className="h-4 w-4" /> 案件一覧へ戻る
        </Button>
        <Card className="border-rose-200 bg-rose-50/20 py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-rose-500 mb-3" />
            <h3 id="error-title" className="text-lg font-bold text-gray-800 mb-1">{is404 ? '案件が見つかりませんでした' : 'エラーが発生しました'}</h3>
            <p className="text-sm text-gray-600 mb-6">{error || '指定された案件にアクセスできません。'}</p>
            <Button id="btn-return-projects" onClick={() => navigate('/projects')} className="bg-primary text-white font-bold">
              案件一覧に戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button id="btn-back-projects" variant="ghost" size="sm" onClick={() => navigate('/projects')} className="p-2 rounded-full hover:bg-gray-200">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 id="project-title" className="text-2xl font-black text-gray-800">{project.name}</h2>
          {renderStatusBadge(project.status)}
        </div>

        <div className="flex items-center gap-2">
          <Button id="btn-edit-project" variant="outline" size="sm" onClick={() => setIsEditOpen(true)} className="flex items-center gap-1 cursor-pointer">
            <Edit3 className="h-4 w-4" /> 編集
          </Button>

          {isAdmin && (
            <Button
              id="btn-delete-project"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteOpen(true)}
              className="flex items-center gap-1 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" /> 削除
            </Button>
          )}

          <Button variant="ghost" size="sm" className="text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50">
            <Star className="h-5 w-5 fill-current" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Info & Members */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info Card */}
          <Card>
            <CardHeader className="border-b py-4 bg-gray-50/50">
              <CardTitle className="text-base font-bold text-gray-800">基本情報</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-1">プロデューサー</p>
                  <p id="producer-name" className="font-bold text-gray-800 flex items-center gap-1.5">
                    <UserIcon className="h-4 w-4 text-primary" />
                    {project.producer_name || '未設定'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">期日</p>
                  <p id="project-deadline" className="font-bold text-gray-800">{formatDate(project.deadline)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">作成日</p>
                  <p id="project-created-at" className="font-bold text-gray-800">{formatDate(project.created_at)}</p>
                </div>

                <div className="col-span-2 sm:col-span-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500">進捗状況</p>
                    <p id="project-progress-rate" className="text-xs font-bold text-primary">{project.progress_rate}%</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-primary h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, project.progress_rate))}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Members Card */}
          <Card>
            <CardHeader className="border-b py-4 bg-gray-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" /> 案件メンバー ({project.members.length}名)
              </CardTitle>
              <Button id="btn-open-add-member" size="sm" variant="outline" onClick={() => setIsMemberModalOpen(true)} className="h-8 text-xs flex items-center gap-1 cursor-pointer">
                <UserPlus className="h-3.5 w-3.5" /> メンバー追加
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {project.members.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">メンバーがまだ割り当てられていません。</p>
              ) : (
                <div id="members-list" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {project.members.map((m) => (
                    <div
                      key={m.user_id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-xs hover:border-orange-200 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-primary flex items-center justify-center font-bold text-xs">
                          {m.user_name ? m.user_name.charAt(0) : 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{m.user_name || `ユーザー ID: ${m.user_id}`}</p>
                          <p className="text-xs text-gray-400">役割: {m.role}</p>
                        </div>
                      </div>
                      <Button
                        id={`btn-remove-member-${m.user_id}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(m.user_id)}
                        className="h-7 w-7 p-0 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-full cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connected Resources Links (UI Preserved) */}
          <Card>
            <CardHeader className="border-b py-4 bg-gray-50/50">
              <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-primary" /> 連携リソース
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-3">
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="flex items-center gap-2 px-3.5 py-2 border rounded-md hover:bg-gray-50 font-bold text-xs text-[#4A154B] bg-purple-50/30"
                >
                  <MessageCircle className="h-4 w-4" /> Slackチャンネル (未接続)
                </a>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="flex items-center gap-2 px-3.5 py-2 border rounded-md hover:bg-gray-50 font-bold text-xs text-blue-600 bg-blue-50/30"
                >
                  <FileText className="h-4 w-4" /> NotePM マニュアル (未接続)
                </a>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="flex items-center gap-2 px-3.5 py-2 border rounded-md hover:bg-gray-50 font-bold text-xs text-emerald-600 bg-emerald-50/30"
                >
                  <FolderKanban className="h-4 w-4" /> Google Drive (未接続)
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Timeline & Post */}
        <div className="space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader className="border-b py-4 bg-gray-50/50">
              <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" /> タイムライン
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-1 flex flex-col justify-between">
              {/* Timeline Form */}
              <form onSubmit={handlePostTimeline} className="mb-6 space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="timeline-input"
                    value={newTimelineContent}
                    onChange={(e) => setNewTimelineContent(e.target.value)}
                    placeholder="進捗メモ・連絡を投稿..."
                    className="text-xs bg-white border-gray-300"
                  />
                  <Button
                    id="btn-post-timeline"
                    type="submit"
                    disabled={isPostingTimeline || !newTimelineContent.trim()}
                    size="sm"
                    className="bg-primary hover:bg-orange-600 text-white whitespace-nowrap cursor-pointer"
                  >
                    {isPostingTimeline ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </form>

              {/* Timeline List */}
              {project.timelines.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">タイムライン履歴はありません。</p>
              ) : (
                <div id="timelines-list" className="relative border-l-2 border-orange-100 ml-3 space-y-5 pb-2">
                  {project.timelines.map((t) => (
                    <div key={t.id} className="relative pl-5">
                      <div className="absolute w-2.5 h-2.5 bg-primary rounded-full -left-[6px] top-1.5 ring-4 ring-white"></div>
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-0.5">
                        <span className="font-bold text-gray-600">{t.user_name || 'システム'}</span>
                        <span>{formatDateTime(t.created_at)}</span>
                      </div>
                      <p className="text-xs font-bold text-gray-800">{t.event_type}</p>
                      {t.content && <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-1 border border-gray-100">{t.content}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Project Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="案件情報の編集">
        <form onSubmit={handleUpdateProject} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">案件名</label>
            <Input id="edit-project-name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">ステータス</label>
              <select
                id="edit-project-status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="normal">正常 (normal)</option>
                <option value="warning">注意 (warning)</option>
                <option value="delayed">遅延 (delayed)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">進捗率 (%)</label>
              <Input
                id="edit-project-progress"
                type="number"
                min="0"
                max="100"
                value={editProgress}
                onChange={(e) => setEditProgress(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">期日</label>
            <Input id="edit-project-deadline" type="date" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              キャンセル
            </Button>
            <Button id="btn-save-edit-project" type="submit" disabled={isSaving} className="bg-primary text-white font-bold cursor-pointer">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              保存する
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal isOpen={isMemberModalOpen} onClose={() => setIsMemberModalOpen(false)} title="メンバーの追加">
        <form onSubmit={handleAddMember} className="space-y-4 pt-2">
          {memberError && (
            <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-xs font-bold">
              {memberError}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">ユーザー ID</label>
            <Input
              id="member-user-id-input"
              type="number"
              value={memberUserId}
              onChange={(e) => setMemberUserId(e.target.value)}
              placeholder="配属するユーザーのID (例: 2)"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">役割 (Role)</label>
            <Input
              id="member-role-input"
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value)}
              placeholder="例: developer, designer, member"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsMemberModalOpen(false)}>
              キャンセル
            </Button>
            <Button id="btn-submit-add-member" type="submit" className="bg-primary text-white font-bold cursor-pointer">
              追加
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Project Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="案件の削除">
        <div className="space-y-4 pt-2">
          <p className="text-sm text-gray-700">
            案件「<span className="font-bold text-rose-600">{project.name}</span>」を削除してもよろしいですか？
          </p>
          <p className="text-xs text-gray-500">この操作は取り消せません。関連するメンバーおよびタイムラインデータも削除されます。</p>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>
              キャンセル
            </Button>
            <Button
              id="btn-confirm-delete-project"
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteProject}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              削除する
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
