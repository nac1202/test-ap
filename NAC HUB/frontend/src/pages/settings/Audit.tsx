import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { History, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { fetchAuditLogs, fetchAuditActions } from '../../api/admin';
import type { AuditLogEntry } from '../../types/admin';

const PAGE_SIZE = 20;

function formatDate(dt: string | null): string {
  if (!dt) return '—';
  try {
    return new Date(dt).toLocaleString('ja-JP', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  } catch {
    return dt;
  }
}

// actionの日本語ラベル
const ACTION_LABELS: Record<string, string> = {
  login_success: 'ログイン成功',
  login_failed: 'ログイン失敗',
  logout: 'ログアウト',
  change_password: 'パスワード変更',
  change_password_failed: 'PW変更失敗',
  create_user: 'ユーザー作成',
  update_user: 'ユーザー更新',
  update_role: 'ロール更新',
  create_project: '案件作成',
  update_project: '案件更新',
  delete_project: '案件削除',
  create_initial_admin: '管理者初期作成',
  reset_initial_admin: '管理者パスワードリセット',
};

function actionBadge(action: string) {
  const label = ACTION_LABELS[action] ?? action;
  const isError = action.includes('failed');
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap ${isError ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
      {label}
    </span>
  );
}

export default function Audit() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [availableActions, setAvailableActions] = useState<string[]>([]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuditLogs({
        search: search || undefined,
        action: actionFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page,
        size: PAGE_SIZE,
      });
      setLogs(res.items);
      setTotal(res.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '監査ログの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [search, actionFilter, dateFrom, dateTo, page]);

  useEffect(() => {
    fetchAuditActions().then(setAvailableActions).catch(() => {});
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleActionFilter = (v: string) => { setActionFilter(v); setPage(1); };
  const handleDateFrom = (v: string) => { setDateFrom(v); setPage(1); };
  const handleDateTo = (v: string) => { setDateTo(v); setPage(1); };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-10">
      {/* ヘッダー */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-800 flex items-center gap-2">
          <History className="h-6 w-6 text-primary shrink-0" /> 監査・AI実行ログ
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
          システム操作ログです（READ ONLY）。
          {total > 0 && <span className="ml-2 font-bold text-primary">{total}件</span>}
        </p>
      </div>

      {/* フィルターバー */}
      <Card className="border border-gray-100 shadow-sm rounded-xl sm:rounded-2xl">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="audit-search"
                  className="pl-9 bg-white text-xs sm:text-sm h-11 w-full"
                  placeholder="アクションで検索..."
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                />
              </div>
              <select
                id="audit-action-filter"
                className="h-11 rounded-lg border border-gray-200 px-3 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={actionFilter}
                onChange={e => handleActionFilter(e.target.value)}
              >
                <option value="">全アクション</option>
                {availableActions.map(a => (
                  <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
                ))}
              </select>
              <Button
                id="btn-reload-audit"
                variant="ghost"
                size="sm"
                className="min-h-[44px] shrink-0"
                onClick={loadLogs}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            {/* 期間フィルター */}
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <label className="text-xs text-gray-500 shrink-0">期間:</label>
              <input
                id="audit-date-from"
                type="date"
                className="h-9 rounded-lg border border-gray-200 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={dateFrom}
                onChange={e => handleDateFrom(e.target.value)}
              />
              <span className="text-xs text-gray-400">〜</span>
              <input
                id="audit-date-to"
                type="date"
                className="h-9 rounded-lg border border-gray-200 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={dateTo}
                onChange={e => handleDateTo(e.target.value)}
              />
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
                >
                  クリア
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* ログテーブル */}
      <Card className="border border-gray-100 shadow-sm rounded-xl sm:rounded-2xl overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">読み込み中...</div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">ログが見つかりません</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-xs sm:text-sm whitespace-nowrap">日時</TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm">ユーザー</TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm">アクション</TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm">詳細</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-gray-500 text-[11px] sm:text-xs whitespace-nowrap py-3">
                      {formatDate(log.created_at)}
                    </TableCell>
                    <TableCell className="font-bold text-xs sm:text-sm py-3 whitespace-nowrap">
                      {log.user_display_name ?? 'システム'}
                      {log.user_email && (
                        <div className="text-[10px] text-gray-400 font-normal">{log.user_email}</div>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      {actionBadge(log.action)}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm text-gray-600 py-3 max-w-xs truncate">
                      {log.details_summary || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="min-h-[36px]"
          >
            前へ
          </Button>
          <span className="text-xs text-gray-500">{page} / {totalPages}</span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="min-h-[36px]"
          >
            次へ
          </Button>
        </div>
      )}
    </div>
  );
}
