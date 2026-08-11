import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { History, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { fetchAuditLogs, fetchAuditActions } from '../../api/admin';
import type { AuditLogEntry } from '../../types/admin';

const PAGE_SIZE = 20;

// ─────────────────────────────────────────────────────────
// actionの日本語ラベル
// ─────────────────────────────────────────────────────────
const ACTION_LABELS: Record<string, string> = {
  login_success: 'ログイン成功',
  login_failed: 'ログイン失敗',
  logout: 'ログアウト',
  change_password: 'パスワード変更',
  change_password_failed: 'PW変更失敗',
  create_user: 'ユーザー作成',
  update_user: 'ユーザー更新',
  disable_user: 'ユーザー無効化',
  enable_user: 'ユーザー有効化',
  update_role: '利用区分変更',
  create_project: '案件作成',
  update_project: '案件更新',
  delete_project: '案件削除',
  add_project_member: 'メンバー追加',
  remove_project_member: 'メンバー削除',
  create_initial_admin: '管理者初期作成',
  reset_initial_admin: '管理者PW リセット',
  ai_chat_history_cleared: 'AIチャット履歴削除',
};

// ─────────────────────────────────────────────────────────
// detailsキーの日本語ラベル（確認された実キーを優先）
// ─────────────────────────────────────────────────────────
const DETAIL_KEY_LABELS: Record<string, string> = {
  // login / 共通
  email: 'メール',
  user_email: 'ユーザーメール',
  // create_user
  created_email: '作成ユーザーのメール',
  created_by: '作成者',
  role_id: '利用区分ID',
  // update_user
  target_user_id: '対象ユーザーID',
  target_email: '対象メール',
  updated_by: '更新者',
  // role
  old_role_id: '変更前の利用区分',
  new_role_id: '変更後の利用区分',
  // status
  status: '状態',
  old_status: '変更前の状態',
  new_status: '変更後の状態',
  // project
  project_id: '案件ID',
  name: '案件名',
  user_id: 'ユーザーID',
  changes: '変更内容',
  // project_member
  member_user_id: 'メンバーID',
  target_project_id: '対象案件ID',
  target_project_name: '対象案件名',
  // ai
  deleted_count: '削除件数',
  // login error
  reason: 'エラー詳細',
  // misc
  action: '操作',
  ip_address: 'IPアドレス',
  user_agent: '利用環境',
};


// 秘密情報キーのブロックリスト（フロントエンドでも防御的に除外）
const SECRET_KEY_PATTERNS = [
  'password', 'hash', 'token', 'secret', 'authorization',
  'database_url', 'api_key', 'oauth', 'jwt',
];

function isSecretKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SECRET_KEY_PATTERNS.some(p => lower.includes(p));
}

// ─────────────────────────────────────────────────────────
// ステータス値の日本語化（changes内・status系キー共通）
// ─────────────────────────────────────────────────────────
const STATUS_VALUE_MAP: Record<string, string> = {
  normal:   '正常',
  warning:  '注意',
  delayed:  '遅延',
  critical: '緊急',
  active:   '有効',
  inactive: '無効',
  on_hold:  '保留',
  done:     '完了',
};

function localizeStatusValue(val: string): string {
  return STATUS_VALUE_MAP[val.trim().toLowerCase()] ?? val;
}

// ─────────────────────────────────────────────────────────
// changesラベルの日本語化
// バックエンドが "ステータス: old -> new" 形式で生成する文字列の
// ラベル部分を必要に応じて補正する（既に日本語の場合はそのまま）
// ─────────────────────────────────────────────────────────
const CHANGE_LABEL_MAP: Record<string, string> = {
  'ステータス': '状態',   // バックエンドが「ステータス」で出力
  'status':     '状態',
  '進捗率':     '進捗率', // 既に日本語 → そのまま
  '名称':       '案件名',
  '期日':       '期日',
  'role_id':    '利用区分',
  'producer_id': '担当者ID',  // 内部IDのため後でフィルタ
};

// プロデューサーIDなど社内非表示にするchangesラベル
const HIDDEN_CHANGE_LABELS = new Set(['プロデューサーID', 'producer_id', 'producer id']);

// 1件のchange文字列 "ラベル: 旧値 -> 新値" を整形して返す
// 非表示対象は null を返す
function formatChangeItem(item: string): string | null {
  // パターン: "ラベル: 旧値 -> 新値"
  const arrowIdx = item.indexOf(' -> ');
  if (arrowIdx !== -1) {
    const colonIdx = item.indexOf(': ');
    if (colonIdx !== -1 && colonIdx < arrowIdx) {
      const rawLabel = item.slice(0, colonIdx).trim();
      const oldVal   = item.slice(colonIdx + 2, arrowIdx).trim();
      const newVal   = item.slice(arrowIdx + 4).trim();

      // 非表示ラベルはスキップ
      if (HIDDEN_CHANGE_LABELS.has(rawLabel.toLowerCase()) || HIDDEN_CHANGE_LABELS.has(rawLabel)) {
        return null;
      }

      const label = CHANGE_LABEL_MAP[rawLabel] ?? rawLabel;

      // 進捗率は小数点を整数表示 "45.0%" → "45%"
      const cleanVal = (v: string) => v.replace(/(\d+)\.0(%)/g, '$1$2');

      // ステータス値を日本語化
      const localizeVal = (v: string) => {
        const cleaned = cleanVal(v);
        return localizeStatusValue(cleaned);
      };

      return `${label}：${localizeVal(oldVal)} → ${localizeVal(newVal)}`;
    }
  }
  // パターン不明: そのまま表示
  return item;
}

// 値の日本語化（安全に変換できるもののみ）
function localizeValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'はい' : 'いいえ';

  // 配列（changes等）: 各項目を個別整形
  if (Array.isArray(value)) {
    const formatted = (value as unknown[])
      .map(v => formatChangeItem(String(v)))
      .filter((v): v is string => v !== null);
    return formatted.length > 0 ? formatted.join('\n') : '—';
  }

  const str = String(value);

  // reason値の日本語化（ログイン失敗等）
  if (key === 'reason') {
    const lower = str.toLowerCase();
    if (lower.includes('incorrect credentials') || lower.includes('invalid credentials')) {
      return 'メールアドレスまたはパスワードが正しくありません';
    }
    if (lower.includes('account') && lower.includes('disabled')) return 'アカウントが無効化されています';
    if (lower.includes('not found')) return 'ユーザーが見つかりません';
    return str;
  }

  // 状態系キーは日本語化
  const isStatusKey = ['status', 'old_status', 'new_status'].includes(key);
  if (isStatusKey) return localizeStatusValue(str);

  // role名も日本語化
  const isRoleKey = key.toLowerCase().includes('role') && !key.toLowerCase().includes('id');
  if (isRoleKey) {
    if (str === 'admin' || str === 'system_admin') return 'システム管理者';
    if (str === 'user') return '一般ユーザー';
  }
  // true / false 文字列
  if (str === 'true') return 'はい';
  if (str === 'false') return 'いいえ';

  return str;
}


// snake_case を読みやすく（未知キーのフォールバック）
function humanizeKey(key: string): string {
  return key.replace(/_/g, ' ');
}

// ─────────────────────────────────────────────────────────
// 内部ID表示抑制（非SE向けUI）
//
// 社内利用者にはDBの内部IDは意味が分からないため、
// 対応する名前・メール・案件名等がある場合はIDを非表示にする。
// IDのみ（対応情報なし）でもトラブル調査に不要なものは非表示。
// ─────────────────────────────────────────────────────────

// 常に非表示にするIDキー（対応する名前情報がないか、他のキーで代替可能）
const ALWAYS_HIDDEN_IDS = new Set([
  'target_user_id',  // target_email で特定可能
  'role_id',         // 数値のみで社内利用者に意味不明
  'user_id',         // add_project_memberの内部ID（表示情報なし）
  'member_user_id',  // 同上
]);

// 対応するキーが存在する場合のみ非表示にするIDキー
// key: 抑制するIDキー, value: このキーのいずれかが存在すればIDを非表示
const SUPPRESS_IF_COMPANION: Record<string, string[]> = {
  project_id: ['name', 'project_name', 'target_project_name'],
  target_project_id: ['target_project_name', 'project_name'],
};

function shouldHideId(key: string, allKeys: Set<string>): boolean {
  if (ALWAYS_HIDDEN_IDS.has(key)) return true;
  const companions = SUPPRESS_IF_COMPANION[key];
  if (companions) {
    return companions.some(c => allKeys.has(c));
  }
  return false;
}

// ─────────────────────────────────────────────────────────
// details_summary（バックエンドから "key: val / key: val" 形式）
// をパースして { key, label, value } の配列に変換
// ─────────────────────────────────────────────────────────
interface DetailItem {
  key: string;
  label: string;
  value: string;
}

function parseDetailsSummary(summary: string): DetailItem[] {
  if (!summary || summary.trim() === '') return [];

  // パス1: 全キーを収集（ID抑制判定用）
  const allKeys = new Set<string>();
  const parts = summary.split(' / ');
  for (const part of parts) {
    const colonIdx = part.indexOf(': ');
    if (colonIdx !== -1) allKeys.add(part.slice(0, colonIdx).trim());
  }

  // パス2: 表示項目を生成（ID抑制・秘密情報除外を適用）
  const items: DetailItem[] = [];
  for (const part of parts) {
    const colonIdx = part.indexOf(': ');
    if (colonIdx === -1) {
      items.push({ key: part, label: humanizeKey(part), value: '' });
      continue;
    }
    const rawKey = part.slice(0, colonIdx).trim();
    const rawVal = part.slice(colonIdx + 2).trim();

    if (isSecretKey(rawKey)) continue;
    if (rawVal === '***') continue;
    if (shouldHideId(rawKey, allKeys)) continue;

    const label = DETAIL_KEY_LABELS[rawKey] ?? humanizeKey(rawKey);
    const value = localizeValue(rawKey, rawVal);
    items.push({ key: rawKey, label, value });
  }
  return items;
}

// ─────────────────────────────────────────────────────────
// display_details（構造化dict）を使ったパース（優先使用）
// changes配列が真のJS配列として届くため、formatChangeItemが正常動作する
// ─────────────────────────────────────────────────────────
function parseDisplayDetails(displayDetails: Record<string, unknown>): DetailItem[] {
  const allKeys = new Set(Object.keys(displayDetails));
  const items: DetailItem[] = [];

  for (const [rawKey, rawVal] of Object.entries(displayDetails)) {
    if (isSecretKey(rawKey)) continue;
    if (shouldHideId(rawKey, allKeys)) continue;

    const label = DETAIL_KEY_LABELS[rawKey] ?? humanizeKey(rawKey);
    const value = localizeValue(rawKey, rawVal);
    items.push({ key: rawKey, label, value });
  }
  return items;
}

// ログ全体から表示項目を生成（display_details優先、なければdetails_summaryをフォールバック）
function parseLogDetails(log: import('../../types/admin').AuditLogEntry): DetailItem[] {
  if (log.display_details) {
    return parseDisplayDetails(log.display_details);
  }
  return parseDetailsSummary(log.details_summary);
}

// ─────────────────────────────────────────────────────────
// 詳細表示コンポーネント（カード用：縦並び）
// ─────────────────────────────────────────────────────────
function DetailsCard({ log }: { log: AuditLogEntry }) {
  const items = parseLogDetails(log);
  if (items.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      {items.map((item, i) => (
        <div key={i} className="text-[11px]">
          <span className="text-gray-400">{item.label}：</span>
          <span
            className="text-gray-700 break-words whitespace-pre-line"
            style={{ overflowWrap: 'anywhere' }}
          >
            {item.value || '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 詳細表示コンポーネント（テーブル用：1行にまとめる）
// ─────────────────────────────────────────────────────────
function DetailsTable({ log }: { log: AuditLogEntry }) {
  const items = parseLogDetails(log);
  if (items.length === 0) return <span className="text-gray-400">—</span>;
  return (
    <span className="text-xs text-gray-600 break-words" style={{ overflowWrap: 'anywhere' }}>
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span className="text-gray-300 mx-1">/</span>}
          <span className="text-gray-400">{item.label}：</span>
          <span className="text-gray-700 whitespace-pre-line">{item.value || '—'}</span>
        </span>
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────
// actionバッジ
// ─────────────────────────────────────────────────────────
function ActionBadgeTable({ action }: { action: string }) {
  const label = ACTION_LABELS[action] ?? action;
  const isError = action.includes('failed');
  const isKnown = action in ACTION_LABELS;
  return (
    <span
      className={[
        'px-2 py-0.5 rounded text-[11px] font-bold',
        isError ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700',
        isKnown ? 'whitespace-nowrap' : 'break-all',
      ].join(' ')}
    >
      {label}
    </span>
  );
}

function ActionBadgeCard({ action }: { action: string }) {
  const label = ACTION_LABELS[action] ?? action;
  const isError = action.includes('failed');
  return (
    <span
      className={[
        'inline-block px-2 py-0.5 rounded text-[11px] font-bold',
        isError ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700',
      ].join(' ')}
      style={{ overflowWrap: 'anywhere' }}
    >
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────
// 日時フォーマット
// ─────────────────────────────────────────────────────────
function formatDate(dt: string | null): string {
  if (!dt) return '—';
  try {
    return new Date(dt).toLocaleString('ja-JP', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return dt;
  }
}

// ─────────────────────────────────────────────────────────
// Audit メインコンポーネント
// ─────────────────────────────────────────────────────────
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
            {/* 行1: 検索 + 更新 */}
            <div className="flex gap-2 items-stretch">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  id="audit-search"
                  className="pl-9 bg-white text-xs sm:text-sm h-11 w-full"
                  placeholder="アクションで検索..."
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                />
              </div>
              <Button
                id="btn-reload-audit"
                variant="ghost"
                size="sm"
                className="h-11 w-11 p-0 shrink-0"
                onClick={loadLogs}
                disabled={loading}
                aria-label="更新"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            {/* 行2: アクションフィルター（全幅） */}
            <select
              id="audit-action-filter"
              className="w-full h-10 rounded-lg border border-gray-200 px-3 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={actionFilter}
              onChange={e => handleActionFilter(e.target.value)}
            >
              <option value="">全アクション</option>
              {availableActions.map(a => (
                <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
              ))}
            </select>
            {/* 行3: 期間フィルター */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-500 shrink-0">期間:</span>
              <input
                id="audit-date-from"
                type="date"
                className="flex-1 min-w-[130px] h-9 rounded-lg border border-gray-200 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={dateFrom}
                onChange={e => handleDateFrom(e.target.value)}
              />
              <span className="text-xs text-gray-400 shrink-0">〜</span>
              <input
                id="audit-date-to"
                type="date"
                className="flex-1 min-w-[130px] h-9 rounded-lg border border-gray-200 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={dateTo}
                onChange={e => handleDateTo(e.target.value)}
              />
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs shrink-0"
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

      {/* ──────────────────────────────────────────
          モバイル（sm未満）: カードリスト
          タブレット以上（sm以上）: テーブル
          ────────────────────────────────────────── */}
      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">読み込み中...</div>
      ) : logs.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">ログが見つかりません</div>
      ) : (
        <>
          {/* ── モバイル: カードリスト（sm未満のみ） ── */}
          <div className="sm:hidden space-y-3">
            {logs.map(log => (
              <Card key={log.id} className="border border-gray-100 shadow-sm rounded-xl">
                <CardContent className="p-4">
                  {/* 日時 */}
                  <p className="text-[11px] text-gray-400 tabular-nums mb-2">
                    {formatDate(log.created_at)}
                  </p>
                  {/* ユーザー */}
                  <p className="font-bold text-sm text-gray-800">
                    {log.user_display_name ?? 'システム'}
                  </p>
                  {log.user_email && (
                    <p className="text-[11px] text-gray-500 mb-2 truncate">{log.user_email}</p>
                  )}
                  {/* アクション */}
                  <div className="flex items-start gap-2 mt-1">
                    <span className="text-[11px] text-gray-400 shrink-0 pt-0.5">アクション：</span>
                    <ActionBadgeCard action={log.action} />
                  </div>
                  {/* 詳細（日本語キー・縦並び） */}
                  {log.details_summary && (
                    <DetailsCard log={log} />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── タブレット以上: テーブル（sm以上のみ） ── */}
          <Card className="hidden sm:block border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-sm whitespace-nowrap">日時</TableHead>
                    <TableHead className="font-bold text-sm">ユーザー</TableHead>
                    <TableHead className="font-bold text-sm whitespace-nowrap">アクション</TableHead>
                    <TableHead className="font-bold text-sm">詳細</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-gray-500 text-xs whitespace-nowrap py-3">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell className="font-bold text-sm py-3">
                        {log.user_display_name ?? 'システム'}
                        {log.user_email && (
                          <div className="text-[10px] text-gray-400 font-normal">{log.user_email}</div>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <ActionBadgeTable action={log.action} />
                      </TableCell>
                      <TableCell className="py-3 max-w-xs">
                        <DetailsTable log={log} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

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
