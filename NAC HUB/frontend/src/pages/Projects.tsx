import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Plus, Search, FolderKanban, Loader2, AlertCircle, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchProjects, createProject, fetchProducers } from '../api/projects';
import type { Project, Producer } from '../types/project';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  normal: { label: '正常', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  warning: { label: '注意', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  delayed: { label: '遅延', className: 'bg-rose-100 text-rose-800 border-rose-200' },
};

function renderStatusBadge(statusStr: string) {
  const config = STATUS_LABELS[statusStr] || { label: statusStr, className: 'bg-gray-100 text-gray-700 border-gray-200' };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${config.className}`}>
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
  const [producerFilter, setProducerFilter] = useState<string>('all');
  const [producers, setProducers] = useState<Producer[]>([]);
  const [searchInput, setSearchInput] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newStatus, setNewStatus] = useState<string>('normal');
  const [newProgress, setNewProgress] = useState<number>(0);
  const [newEndDate, setNewEndDate] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string>('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetchProjects(
        {
          page,
          size: pageSize,
          search: activeSearch || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          producer_id: producerFilter !== 'all' ? Number(producerFilter) : undefined,
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
      setError(errorObj.message || '案件一覧の取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, activeSearch, statusFilter, producerFilter, token, logout]);

  useEffect(() => {
    fetchProducers(token)
      .then(setProducers)
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchInput.trim());
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!newProjectName.trim()) {
      setCreateError('案件名を入力してください。');
      return;
    }
    setIsCreating(true);
    try {
      await createProject(
        {
          name: newProjectName.trim(),
          status: newStatus,
          progress_rate: Number(newProgress),
          deadline: newEndDate || undefined,
        },
        token
      );
      setIsModalOpen(false);
      setNewProjectName('');
      setNewStatus('normal');
      setNewProgress(0);
      setNewEndDate('');
      setPage(1);
      await loadData();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setCreateError(errorObj.message || '案件の作成に失敗しました。');
    } finally {
      setIsCreating(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-800 flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-primary shrink-0" />
            案件管理
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">進行中案件のステータス・進捗・タイムラインを管理します。</p>
        </div>
        <Button 
          id="btn-new-project"
          onClick={() => setIsModalOpen(true)} 
          className="bg-primary hover:bg-orange-600 text-white font-bold gap-2 min-h-[44px] w-full sm:w-auto justify-center"
        >
          <Plus className="h-5 w-5" /> 新規案件を作成
        </Button>
      </div>

      {/* Filter Section */}
      <Card className="border border-gray-100 shadow-sm rounded-xl sm:rounded-2xl">
        <CardContent className="p-3 sm:p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="project-search-input"
                type="text"
                placeholder="案件名で検索..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 bg-gray-50 focus:bg-white text-xs sm:text-sm h-11"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 h-11">
                <Filter className="h-4 w-4 text-gray-400 shrink-0" />
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="bg-transparent text-xs sm:text-sm font-bold text-gray-700 focus:outline-none w-full"
                >
                  <option value="all">全ステータス</option>
                  <option value="normal">正常</option>
                  <option value="warning">注意</option>
                  <option value="delayed">遅延</option>
                </select>
              </div>

              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 h-11">
                <select
                  id="producer-filter"
                  value={producerFilter}
                  onChange={(e) => { setProducerFilter(e.target.value); setPage(1); }}
                  className="bg-transparent text-xs sm:text-sm font-bold text-gray-700 focus:outline-none w-full"
                >
                  <option value="all">全プロデューサー</option>
                  {producers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <Button id="btn-submit-search" type="submit" className="bg-primary text-white font-bold h-11 px-5 shrink-0 justify-center">
                検索
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Loading & Error */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm font-medium">案件一覧を読み込み中...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center text-red-600 my-4 space-y-3">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
          <p className="text-sm font-medium">{error}</p>
          <Button variant="outline" onClick={loadData} className="gap-2 text-red-600 border-red-300">
            再読み込み
          </Button>
        </div>
      )}

      {/* Projects Table */}
      {!isLoading && !error && (
        <>
          {projects.length === 0 ? (
            <div className="py-16 text-center bg-white border border-gray-100 rounded-2xl shadow-sm space-y-3">
              <FolderKanban className="h-12 w-12 text-gray-300 mx-auto" />
              <h3 className="text-base font-bold text-gray-700">該当する案件が見つかりません</h3>
              <p className="text-xs text-gray-500">条件を変更して再度検索するか、新しい案件を作成してください。</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-xs sm:text-sm">案件名</TableHead>
                    <TableHead className="font-bold text-xs sm:text-sm">ステータス</TableHead>
                    <TableHead className="font-bold text-xs sm:text-sm hidden sm:table-cell">進捗</TableHead>
                    <TableHead className="font-bold text-xs sm:text-sm hidden md:table-cell">プロデューサー</TableHead>
                    <TableHead className="font-bold text-xs sm:text-sm hidden lg:table-cell">期日</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((proj) => (
                    <TableRow 
                      key={proj.id}
                      onClick={() => navigate(`/projects/${proj.id}`)}
                      className="cursor-pointer hover:bg-orange-50/40 transition-colors"
                      id={`project-row-${proj.id}`}
                    >
                      <TableCell className="font-bold text-xs sm:text-sm text-gray-900 py-3 sm:py-4">
                        <div className="flex flex-col">
                          <span className="truncate max-w-[200px] sm:max-w-md hover:text-primary">{proj.name}</span>
                          <span className="text-[10px] text-gray-400 sm:hidden mt-0.5">
                            進捗: {proj.progress_rate}% | {proj.producer_name || 'プロデューサー未設定'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 sm:py-4">{renderStatusBadge(proj.status)}</TableCell>
                      <TableCell className="hidden sm:table-cell py-3 sm:py-4">
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-primary h-full rounded-full transition-all" 
                              style={{ width: `${proj.progress_rate}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-gray-600 w-8">{proj.progress_rate}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs sm:text-sm text-gray-600 py-3 sm:py-4">
                        {proj.producer_name || '-'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-gray-500 py-3 sm:py-4">
                        {formatDate(proj.deadline)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 px-1 flex-wrap gap-2">
              <p className="text-xs text-gray-500 font-medium">
                全 {total} 件中 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} 件を表示
              </p>
              <div className="flex items-center gap-2">
                <Button
                  id="btn-prev-page"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="gap-1 text-xs min-h-[36px]"
                >
                  <ChevronLeft className="h-4 w-4" /> 前へ
                </Button>
                <span className="text-xs font-bold text-gray-700 px-2">{page} / {totalPages}</span>
                <Button
                  id="btn-next-page"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="gap-1 text-xs min-h-[36px]"
                >
                  次へ <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Project Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="新規案件の作成">
        <form onSubmit={handleCreateProject} className="space-y-4 pt-2">
          {createError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
              {createError}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="new-project-name" className="text-xs font-bold text-gray-700 block">案件名 <span className="text-red-500">*</span></label>
            <Input
              id="new-project-name"
              type="text"
              required
              placeholder="例: NAC HUB レスポンシブUI開発"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="new-project-status" className="text-xs font-bold text-gray-700 block">初期ステータス</label>
              <select
                id="new-project-status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full h-11 px-3 bg-gray-50 border border-gray-300 rounded-md text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="normal">正常</option>
                <option value="warning">注意</option>
                <option value="delayed">遅延</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="new-project-progress" className="text-xs font-bold text-gray-700 block">進捗率 (%)</label>
              <Input
                id="new-project-progress"
                type="number"
                min={0}
                max={100}
                value={newProgress}
                onChange={(e) => setNewProgress(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="new-project-end-date" className="text-xs font-bold text-gray-700 block">完了予定日</label>
            <Input
              id="new-project-end-date"
              type="date"
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="min-h-[44px]">
              キャンセル
            </Button>
            <Button id="btn-save-new-project" type="submit" className="bg-primary text-white font-bold min-h-[44px]" disabled={isCreating}>
              {isCreating ? '作成中...' : '登録する'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
