import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { Shield, RefreshCw, AlertCircle, Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { fetchAdminRoles, updateAdminRole } from '../../api/admin';
import type { AdminRoleResponse } from '../../types/admin';

// ロール名の日本語表示
function roleDisplayName(name: string): string {
  const map: Record<string, string> = {
    admin: 'システム管理者',
    system_admin: 'システム管理者',
    user: '一般ユーザー',
  };
  return map[name] ?? name;
}

// ロールの説明
function roleDescription(name: string): string {
  const map: Record<string, string> = {
    admin: '全モジュールへのフルアクセス、設定変更が可能',
    system_admin: '全モジュールへのフルアクセス、設定変更が可能',
    user: '案件の閲覧、チャット利用が可能',
  };
  return map[name] ?? '—';
}

export default function Roles() {
  const [roles, setRoles] = useState<AdminRoleResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 編集モーダル
  const [editRole, setEditRole] = useState<AdminRoleResponse | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  // permissionsをJSON文字列として編集
  const [editPermJson, setEditPermJson] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const loadRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminRoles();
      setRoles(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'ロール一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const openEdit = (r: AdminRoleResponse) => {
    setEditRole(r);
    setEditPermJson(JSON.stringify(r.permissions ?? {}, null, 2));
    setEditError(null);
    setJsonError(null);
  };

  const handleEdit = async () => {
    if (!editRole) return;
    setJsonError(null);
    let parsedPerm: Record<string, unknown>;
    try {
      parsedPerm = JSON.parse(editPermJson);
    } catch {
      setJsonError('JSON形式が正しくありません');
      return;
    }
    setEditError(null);
    setEditLoading(true);
    try {
      await updateAdminRole(editRole.id, { permissions: parsedPerm });
      setEditRole(null);
      loadRoles();
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
            <Shield className="h-6 w-6 text-primary shrink-0" /> ロール・権限管理
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            役職・アクセス権限ロールのグループ定義と割り当てを行います。
          </p>
        </div>
        <Button
          id="btn-reload-roles"
          variant="ghost"
          size="sm"
          className="min-h-[44px] w-full sm:w-auto flex items-center gap-2"
          onClick={loadRoles}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          更新
        </Button>
      </div>

      {/* 注記 */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-start gap-2">
        <Lock className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          システムロール（admin / user）の名前は変更できません。
          permissionsフィールドはJSON形式で管理されます。
          細粒度の権限管理（画面・操作単位の制御）は今後の実装予定です。
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <Card className="border border-gray-100 shadow-sm rounded-xl sm:rounded-2xl overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">読み込み中...</div>
          ) : roles.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">ロールが見つかりません</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-xs sm:text-sm">ロール名</TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm">概要</TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm">利用者数</TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm">種別</TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-bold text-xs sm:text-sm py-3">
                      {roleDisplayName(r.name)}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm text-gray-600 py-3">
                      {roleDescription(r.name)}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm py-3 font-bold">
                      {r.user_count}名
                    </TableCell>
                    <TableCell className="py-3">
                      {r.is_system ? (
                        <span className="bg-orange-100 px-2 py-0.5 rounded text-[11px] font-bold text-orange-700 flex items-center gap-1 w-fit">
                          <Lock className="h-3 w-3" /> システム
                        </span>
                      ) : (
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-[11px] font-bold text-gray-700">カスタム</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <Button
                        id={`btn-edit-role-${r.id}`}
                        variant="ghost"
                        size="sm"
                        className="min-h-[36px]"
                        onClick={() => openEdit(r)}
                      >
                        設定
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 編集モーダル */}
      <Modal isOpen={!!editRole} onClose={() => setEditRole(null)} title={`ロール設定：${editRole ? roleDisplayName(editRole.name) : ''}`}>
        <div className="space-y-3">
          {editRole?.is_system && (
            <div className="p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700 flex items-center gap-1">
              <Lock className="h-3 w-3 shrink-0" />
              システムロールのためロール名は変更できません。permissionsのみ更新できます。
            </div>
          )}
          {editError && (
            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
              <AlertCircle className="h-3 w-3 shrink-0" /> {editError}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              permissions（JSON）
            </label>
            <textarea
              id="edit-role-permissions"
              className="w-full h-36 rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              value={editPermJson}
              onChange={e => { setEditPermJson(e.target.value); setJsonError(null); }}
            />
            {jsonError && <p className="text-red-600 text-xs mt-1">{jsonError}</p>}
            <p className="text-xs text-gray-400 mt-1">
              例: {`{"all": true}`} または {`{"projects": {"read": true, "write": false}}`}
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              id="btn-cancel-edit-role"
              variant="ghost"
              className="flex-1 min-h-[44px]"
              onClick={() => setEditRole(null)}
            >
              キャンセル
            </Button>
            <Button
              id="btn-submit-edit-role"
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
