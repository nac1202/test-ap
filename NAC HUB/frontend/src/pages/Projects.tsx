import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Plus, Search, FolderKanban, Loader2, AlertCircle, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchProjects, createProject } from '../api/projects';
import type { Project, ProjectStatus } from '../types/project';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  normal: { label: '正常', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  warning: { label: '注意', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  delayed: { label: '遅延', className: 'bg-rose-100 text-rose-800 border-rose-200' },
};

function renderStatusBadge(statusStr: string) {
  const config = STATUS_LABELS[statusStr] || { label: statusStr, className: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${config.className}`}>
      {config.label}
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '未設定';
  try {
    return new Date(dateStr).toLocaleDateString('ja-JP');
  } catch {
    return dateStr;
  }
}

export default function Projects() {
  const navigate = useNavigate();
  const { token, logout } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newStatus, setNewStatus] = useState<ProjectStatus>('normal');
  const [newProgress, setNewProgress] = useState<number>(0);
  const [newDeadline, setNewDeadline] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string>('');

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetchProjects(
        {
          status: statusFilter,
          search: activeSearch,
          page,
          size: pageSize,
        },
        token
      );
      setProjects(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string };
      if (errorObj.status === 401) {
        logout();
        return;
      }
      setError(errorObj.message || '案件データの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, [token, statusFilter, activeSearch, page, pageSize, logout]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput);
    setPage(1);
  };

  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      setModalError('案件名を入力してください。');
      return;
    }
    setIsSubmitting(true);
    setModalError('');
    try {
      await createProject(
        {
          name: newProjectName.trim(),
          status: newStatus,
          progress_rate: Number(newProgress),
          deadline: newDeadline ? new Date(newDeadline).toISOString() : null,
        },
        token
      );
      setIsModalOpen(false);
      setNewProjectName('');
      setNewProgress(0);
      setNewDeadline('');
      setNewStatus('normal');
      loadProjects();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setModalError(errorObj.message || '案件の作成に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-primary" /> 案件一覧
          </h2>
          <p className="text-sm text-gray-500 mt-1">全 {total} 件のプロジェクト</p>
        </div>
        <Button
          id="btn-new-project"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary hover:bg-orange-600 text-white font-bold shadow-md cursor-pointer"
        >
          <Plus className="h-4 w-4" /> 新規案件
        </Button>
      </div>

      {/* Main Card */}
      <Card className="border shadow-sm">
        <CardHeader className="py-4 px-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b bg-gray-50/50">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm flex items-center gap-2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                id="search-input"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 bg-white border-gray-300 focus:border-primary"
                placeholder="案件名で検索 (Enterで検索)..."
              />
            </div>
            <Button id="btn-search" type="submit" variant="secondary" size="sm" className="whitespace-nowrap cursor-pointer">
              検索
            </Button>
          </form>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="all">すべてのステータス</option>
              <option value="normal">正常</option>
              <option value="warning">注意</option>
              <option value="delayed">遅延</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Loading state */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm font-medium">案件データを読み込み中...</p>
            </div>
          ) : error ? (
            /* Error state */
            <div className="flex flex-col items-center justify-center py-12 text-rose-600 bg-rose-50/30">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p className="font-bold">{error}</p>
              <Button variant="ghost" size="sm" onClick={loadProjects} className="mt-3 underline text-sm">
                再読み込み
              </Button>
            </div>
          ) : projects.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FolderKanban className="h-12 w-12 stroke-1 mb-3 text-gray-300" />
              <p className="font-bold text-gray-600">
                {activeSearch || statusFilter !== 'all' ? '条件に一致する案件がありません' : '表示できる案件がありません'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {activeSearch || statusFilter !== 'all' ? '検索条件を変更してください。' : '新しい案件を作成して開始しましょう。'}
              </p>
            </div>
          ) : (
            /* Table Data */
            <Table id="projects-table">
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  <TableHead className="font-bold">案件名</TableHead>
                  <TableHead className="font-bold">プロデューサー</TableHead>
                  <TableHead className="font-bold">ステータス</TableHead>
                  <TableHead className="font-bold w-48">進捗率</TableHead>
                  <TableHead className="font-bold">期日</TableHead>
                  <TableHead className="font-bold text-center">メンバー</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow
                    key={p.id}
                    id={`project-row-${p.id}`}
                    className="cursor-pointer hover:bg-orange-50/40 transition-colors"
                    onClick={() => navigate(`/projects/${p.id}`)}
                  >
                    <TableCell className="font-bold text-gray-900">{p.name}</TableCell>
                    <TableCell className="text-gray-600">{p.producer_name || '未割り当て'}</TableCell>
                    <TableCell>{renderStatusBadge(p.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(100, Math.max(0, p.progress_rate))}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-gray-600 w-9 text-right">{p.progress_rate}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{formatDate(p.deadline)}</TableCell>
                    <TableCell className="text-center font-medium text-sm text-gray-600">{p.member_count}名</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        id={`btn-detail-${p.id}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/projects/${p.id}`)}
                        className="text-primary hover:text-orange-700 hover:bg-orange-100/50"
                      >
                        詳細
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {!isLoading && total > 0 && (
            <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50/50">
              <p className="text-xs text-gray-500">
                {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} / {total} 件
              </p>
              <div className="flex items-center gap-2">
                <Button
                  id="btn-prev-page"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="h-8 w-8 p-0 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-bold text-gray-700">
                  {page} / {totalPages}
                </span>
                <Button
                  id="btn-next-page"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 w-8 p-0 cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Project Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="新規案件作成">
        <form onSubmit={handleCreateProject} className="space-y-4 pt-2">
          {modalError && (
            <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-xs font-bold">
              {modalError}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              案件名 <span className="text-rose-500">*</span>
            </label>
            <Input
              id="new-project-name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="例: コマースサイトリニューアル"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">ステータス</label>
              <select
                id="new-project-status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as ProjectStatus)}
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
                id="new-project-progress"
                type="number"
                min="0"
                max="100"
                value={newProgress}
                onChange={(e) => setNewProgress(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">期日</label>
            <Input
              id="new-project-deadline"
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              キャンセル
            </Button>
            <Button
              id="btn-submit-project"
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-orange-600 text-white font-bold"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              作成する
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
