import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Users as UsersIcon, Plus, Search, RefreshCw, AlertCircle, X } from 'lucide-react';
import {
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  fetchAdminRoles,
} from '../../api/admin';
import type { AdminUserResponse, AdminUserCreateResponse } from '../../types/admin';
import type { AdminRoleResponse } from '../../types/admin';

const PAGE_SIZE = 20;

// ロール名の日本語表示
function roleLabel(roleName: string | null): string {
  if (!roleName) return '不明';
  const map: Record<string, string> = {
    admin: 'システム管理者',
    system_admin: 'システム管理者',
    user: '一般ユーザー',
  };
  return map[roleName] ?? roleName;
}

function RoleBadge({ roleName }: { roleName: string | null }) {
  return (
    <span className="bg-gray-100 px-2 py-0.5 rounded text-[11px] font-bold text-gray-700 whitespace-nowrap inline-block">
      {roleLabel(roleName)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return status === 'active'
    ? <span className="text-green-600 font-bold text-xs whitespace-nowrap">有効</span>
    : <span className="text-red-500 font-bold text-xs whitespace-nowrap">無効</span>;
}

export default function Users() {
  const [users, setUsers] = useState<AdminUserResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 検索：入力中と確定済みを分離（Enterまたは検索ボタンで確定）
  const [searchInput, setSearchInput] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [roles, setRoles] = useState<AdminRoleResponse[]>([]);

  // 追加モーダル
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', first_name: '', last_name: '', role_id: 2, status: 'active' });
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [createdUser, setCreatedUser] = useState<AdminUserCreateResponse | null>(null);

  // 編集モーダル
  const [editUser, setEditUser] = useState<AdminUserResponse | null>(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', role_id: 1, status: 'active' });
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminUsers({
        search: searchApplied || undefined,
        role_id: roleFilter !== 'all' ? Number(roleFilter) : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page,
        size: PAGE_SIZE,
      });
      setUsers(res.items);
      setTotal(res.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'ユーザー一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [searchApplied, roleFilter, statusFilter, page]);

  useEffect(() => {
    fetchAdminRoles().then(setRoles).catch(() => {});
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // 検索を実行（Enterキーまたは検索ボタン）
  const applySearch = () => {
    setSearchApplied(searchInput);
    setPage(1);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchApplied('');
    setPage(1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') applySearch();
  };

  const handleRoleFilter = (v: string) => { setRoleFilter(v); setPage(1); };
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1); };

  // 追加
  const handleAdd = async () => {
    setAddError(null);
    setAddLoading(true);
    try {
      const res = await createAdminUser({
        email: addForm.email,
        first_name: addForm.first_name,
        last_name: addForm.last_name,
        role_id: addForm.role_id,
        status: addForm.status,
      });
      setCreatedUser(res);
      loadUsers();
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : 'ユーザー作成に失敗しました');
    } finally {
      setAddLoading(false);
    }
  };

  const openAddModal = () => {
    setAddForm({ email: '', first_name: '', last_name: '', role_id: roles[1]?.id ?? 2, status: 'active' });
    setAddError(null);
    setCreatedUser(null);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setCreatedUser(null);
    setAddError(null);
  };

  // 編集
  const openEdit = (u: AdminUserResponse) => {
    setEditUser(u);
    setEditForm({ first_name: u.first_name ?? '', last_name: u.last_name ?? '', role_id: u.role_id, status: u.status });
    setEditError(null);
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setEditError(null);
    setEditLoading(true);
    try {
      await updateAdminUser(editUser.id, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        role_id: editForm.role_id,
        status: editForm.status,
      });
      setEditUser(null);
      loadUsers();
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : '更新に失敗しました');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-10">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-800 flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-primary shrink-0" /> ユーザー管理
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            システム利用ユーザーアカウントの作成・権限設定を行います。
            {total > 0 && <span className="ml-2 font-bold text-primary">{total}名</span>}
          </p>
        </div>
        <Button
          id="btn-add-user"
          className="flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto"
          onClick={openAddModal}
        >
          <Plus className="h-4 w-4" /> ユーザー追加
        </Button>
      </div>

      {/* ─── ユーザー専用検索バー ───
          このInputはUsers.tsxのユーザー一覧検索専用です。
          共通ヘッダーの検索欄とは独立しています。
          Enterキーまたは「検索」ボタンで実行。
      */}
      <div className="flex gap-2 items-stretch">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            ref={searchInputRef}
            id="user-search-input"
            type="search"
            className="pl-9 pr-9 bg-white text-sm h-11 w-full"
            placeholder="氏名・メールアドレスで検索…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            aria-label="ユーザー検索"
          />
          {searchInput && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="検索解除"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          id="btn-search-users"
          className="min-h-[44px] px-4 shrink-0"
          onClick={applySearch}
          disabled={loading}
        >
          検索
        </Button>
        {searchApplied && (
          <Button
            id="btn-clear-search-users"
            variant="ghost"
            className="min-h-[44px] px-3 shrink-0 text-gray-500"
            onClick={clearSearch}
            type="button"
          >
            解除
          </Button>
        )}
      </div>

      {/* 検索中バナー */}
      {searchApplied && (
        <div className="text-xs text-primary font-bold flex items-center gap-1">
          <Search className="h-3 w-3" />
          「{searchApplied}」で絞り込み中
          <button onClick={clearSearch} className="ml-1 underline text-gray-500" type="button">解除</button>
        </div>
      )}

      {/* サブフィルター（利用区分・ステータス・更新） */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          id="user-role-filter"
          className="h-9 rounded-lg border border-gray-200 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={roleFilter}
          onChange={e => handleRoleFilter(e.target.value)}
        >
          <option value="all">全利用区分</option>
          {roles.map(r => (
            <option key={r.id} value={r.id}>
              {r.name === 'admin' || r.name === 'system_admin' ? 'システム管理者' : r.name === 'user' ? '一般ユーザー' : r.name}
            </option>
          ))}
        </select>
        <select
          id="user-status-filter"
          className="h-9 rounded-lg border border-gray-200 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={statusFilter}
          onChange={e => handleStatusFilter(e.target.value)}
        >
          <option value="all">全ステータス</option>
          <option value="active">有効</option>
          <option value="inactive">無効</option>
        </select>
        <Button
          id="btn-reload-users"
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 shrink-0"
          onClick={loadUsers}
          disabled={loading}
          aria-label="更新"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* ──────────────────────────────────────────
          モバイル（sm未満）: カード表示
          タブレット以上（sm以上）: テーブル表示
          ────────────────────────────────────────── */}

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">読み込み中...</div>
      ) : users.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">
          {searchApplied
            ? `「${searchApplied}」に一致するユーザーはいません`
            : 'ユーザーが見つかりません'}
        </div>
      ) : (
        <>
          {/* ── モバイル: カードリスト（sm未満のみ表示） ── */}
          <div className="sm:hidden space-y-3">
            {users.map(u => (
              <Card key={u.id} className="border border-gray-100 shadow-sm rounded-xl">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-gray-800 truncate">
                        {u.last_name} {u.first_name}
                        {u.must_change_password && (
                          <span className="ml-1 text-[10px] text-amber-600 font-normal">（PW変更必要）</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{u.email}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <RoleBadge roleName={u.role_name} />
                        <StatusBadge status={u.status} />
                      </div>
                    </div>
                    <Button
                      id={`btn-edit-user-mobile-${u.id}`}
                      variant="ghost"
                      size="sm"
                      className="min-h-[40px] min-w-[52px] shrink-0"
                      onClick={() => openEdit(u)}
                    >
                      編集
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── タブレット以上: テーブル（sm以上のみ表示） ── */}
          <Card className="hidden sm:block border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-sm">氏名</TableHead>
                    <TableHead className="font-bold text-sm">メールアドレス</TableHead>
                    <TableHead className="font-bold text-sm whitespace-nowrap">利用区分</TableHead>
                    <TableHead className="font-bold text-sm whitespace-nowrap">ステータス</TableHead>
                    <TableHead className="font-bold text-sm text-right whitespace-nowrap">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-bold text-sm py-3">
                        {u.last_name} {u.first_name}
                        {u.must_change_password && (
                          <span className="ml-1 text-[10px] text-amber-600 font-normal">（PW変更必要）</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 py-3">{u.email}</TableCell>
                      <TableCell className="py-3 whitespace-nowrap">
                        <RoleBadge roleName={u.role_name} />
                      </TableCell>
                      <TableCell className="py-3 whitespace-nowrap">
                        <StatusBadge status={u.status} />
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <Button
                          id={`btn-edit-user-${u.id}`}
                          variant="ghost"
                          size="sm"
                          className="min-h-[36px]"
                          onClick={() => openEdit(u)}
                        >
                          編集
                        </Button>
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

      {/* ── ユーザー追加モーダル ── */}
      <Modal isOpen={showAddModal} onClose={closeAddModal} title="ユーザー追加">
        {createdUser ? (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              ユーザーを作成しました。初期パスワードを安全な方法で本人に伝達してください。
            </div>
            <div className="space-y-2 text-sm">
              <div><span className="font-bold">メール:</span> {createdUser.email}</div>
              <div><span className="font-bold">氏名:</span> {createdUser.last_name} {createdUser.first_name}</div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="font-bold text-amber-800 mb-1">初期パスワード（一度だけ表示）</p>
                <p className="font-mono text-lg tracking-widest text-amber-900 break-all">{createdUser.initial_password}</p>
                <p className="text-xs text-amber-700 mt-1">ログイン後にパスワード変更が必要です。</p>
              </div>
            </div>
            <Button id="btn-close-created-user" className="w-full min-h-[44px]" onClick={closeAddModal}>
              閉じる
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {addError && (
              <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                <AlertCircle className="h-3 w-3 shrink-0" /> {addError}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">メールアドレス *</label>
              <Input
                id="add-user-email"
                type="email"
                className="w-full"
                value={addForm.email}
                onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                placeholder="user@example.com"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">姓 *</label>
                <Input
                  id="add-user-last-name"
                  className="w-full"
                  value={addForm.last_name}
                  onChange={e => setAddForm(f => ({ ...f, last_name: e.target.value }))}
                  placeholder="山田"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">名 *</label>
                <Input
                  id="add-user-first-name"
                  className="w-full"
                  value={addForm.first_name}
                  onChange={e => setAddForm(f => ({ ...f, first_name: e.target.value }))}
                  placeholder="花子"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">利用区分</label>
              <select
                id="add-user-role"
                className="w-full h-11 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={addForm.role_id}
                onChange={e => setAddForm(f => ({ ...f, role_id: Number(e.target.value) }))}
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name === 'admin' || r.name === 'system_admin' ? 'システム管理者' : r.name === 'user' ? '一般ユーザー' : r.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              id="btn-submit-add-user"
              className="w-full min-h-[44px]"
              onClick={handleAdd}
              disabled={addLoading || !addForm.email || !addForm.first_name || !addForm.last_name}
            >
              {addLoading ? '作成中...' : 'ユーザーを作成'}
            </Button>
          </div>
        )}
      </Modal>

      {/* ── ユーザー編集モーダル ── */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="ユーザー編集">
        <div className="space-y-3">
          {editError && (
            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
              <AlertCircle className="h-3 w-3 shrink-0" /> {editError}
            </div>
          )}
          {editUser && (
            <p className="text-xs text-gray-500 pb-1 border-b border-gray-100">
              {editUser.email}
            </p>
          )}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">姓</label>
              <Input
                id="edit-user-last-name"
                className="w-full"
                value={editForm.last_name}
                onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">名</label>
              <Input
                id="edit-user-first-name"
                className="w-full"
                value={editForm.first_name}
                onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">利用区分</label>
            <select
              id="edit-user-role"
              className="w-full h-11 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={editForm.role_id}
              onChange={e => setEditForm(f => ({ ...f, role_id: Number(e.target.value) }))}
            >
              {roles.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name === 'admin' || r.name === 'system_admin' ? 'システム管理者' : r.name === 'user' ? '一般ユーザー' : r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">ステータス</label>
            <select
              id="edit-user-status"
              className="w-full h-11 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={editForm.status}
              onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
            >
              <option value="active">有効</option>
              <option value="inactive">無効</option>
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              id="btn-cancel-edit-user"
              variant="ghost"
              className="flex-1 min-h-[44px]"
              onClick={() => setEditUser(null)}
            >
              キャンセル
            </Button>
            <Button
              id="btn-submit-edit-user"
              className="flex-1 min-h-[44px]"
              onClick={handleEdit}
              disabled={editLoading}
            >
              {editLoading ? '更新中...' : '更新'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
