import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { Shield, RefreshCw, AlertCircle, Lock, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { fetchAdminRoles } from '../../api/admin';
import type { AdminRoleResponse } from '../../types/admin';

// ─────────────────────────────────────────────────────────
// ロール表示設定（社内向け非SE表示）
//
// NOTE: permissions(JSON)フィールドはDBおよびAPI型として維持していますが、
// 現段階では社内管理者にJSON直接編集をさせません。
// 将来、社内で権限設計が決定した後、
// 画面・操作単位のチェック式権限UIへマッピング予定です。
// その段階でバックエンドの権限判定もpermissionsに連動させます。
// ─────────────────────────────────────────────────────────

interface RoleDisplayConfig {
  displayName: string;
  description: string;
  detailDescription: string;
}

const ROLE_DISPLAY: Record<string, RoleDisplayConfig> = {
  admin: {
    displayName: 'システム管理者',
    description: 'NAC HUBのすべての管理機能を利用できます。',
    detailDescription:
      'ユーザー管理・ロール管理・監査ログ閲覧・案件管理など、' +
      'システム全体の設定と管理が行えます。',
  },
  system_admin: {
    displayName: 'システム管理者',
    description: 'NAC HUBのすべての管理機能を利用できます。',
    detailDescription:
      'ユーザー管理・ロール管理・監査ログ閲覧・案件管理など、' +
      'システム全体の設定と管理が行えます。',
  },
  user: {
    displayName: '一般ユーザー',
    description: '案件の閲覧やなっくんチャットなど、通常業務に必要な機能を利用できます。',
    detailDescription:
      '案件一覧・案件詳細の閲覧、なっくんとのチャット機能を利用できます。' +
      'システム設定・ユーザー管理などの管理機能は利用できません。',
  },
};

function getRoleDisplay(name: string): RoleDisplayConfig {
  return ROLE_DISPLAY[name] ?? {
    displayName: name,
    description: '—',
    detailDescription: '—',
  };
}

// 種別バッジ
function SystemBadge({ isSystem }: { isSystem: boolean }) {
  return isSystem ? (
    <span className="inline-flex items-center gap-1 bg-orange-100 px-2 py-0.5 rounded text-[11px] font-bold text-orange-700 whitespace-nowrap">
      <Lock className="h-3 w-3 shrink-0" /> 標準の利用区分
    </span>
  ) : (
    <span className="inline-block bg-gray-100 px-2 py-0.5 rounded text-[11px] font-bold text-gray-700 whitespace-nowrap">
      カスタム利用区分
    </span>
  );
}

export default function Roles() {
  const [roles, setRoles] = useState<AdminRoleResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 詳細モーダル（読み取り専用）
  const [detailRole, setDetailRole] = useState<AdminRoleResponse | null>(null);

  const loadRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminRoles();
      setRoles(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '利用区分一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-10">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-800 flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary shrink-0" /> 利用権限管理
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            社員ごとに、NAC HUBで利用できる機能や範囲を管理します。
          </p>
        </div>
        <Button
          id="btn-reload-roles"
          variant="ghost"
          size="sm"
          className="min-h-[44px] w-full sm:w-auto flex items-center justify-center gap-2"
          onClick={loadRoles}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          更新
        </Button>
      </div>

      {/* お知らせバナー */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-start gap-2">
        <Lock className="h-4 w-4 shrink-0 mt-0.5" />
        <span className="break-words leading-relaxed">
          現在は「システム管理者」と「一般ユーザー」の2つの利用区分で運用しています。
          詳細な閲覧範囲や操作権限については、社内での運用方針を整理した後、
          分かりやすいチェック式の設定画面を追加する予定です。
        </span>
      </div>

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
      ) : roles.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">利用区分が見つかりません</div>
      ) : (
        <>
          {/* ── モバイル: カードリスト（sm未満のみ表示） ── */}
          <div className="sm:hidden space-y-3">
            {roles.map(r => {
              const display = getRoleDisplay(r.name);
              return (
                <Card key={r.id} className="border border-gray-100 shadow-sm rounded-xl">
                  <CardContent className="p-4">
                    {/* ロール名 + 種別バッジ */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-black text-base text-gray-800 leading-tight">
                        {display.displayName}
                      </p>
                      <SystemBadge isSystem={r.is_system} />
                    </div>

                    {/* 説明 */}
                    <p className="text-xs text-gray-500 leading-relaxed mb-3 break-words">
                      {display.description}
                    </p>

                    {/* 利用者数 */}
                    <div className="flex items-center gap-1 mb-3">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-[11px] text-gray-400">現在の利用者数：</span>
                      <span className="text-sm font-bold text-gray-700">{r.user_count}名</span>
                    </div>

                    {/* 詳細を見るボタン（読み取り専用） */}
                    <Button
                      id={`btn-detail-role-mobile-${r.id}`}
                      variant="ghost"
                      className="w-full min-h-[44px] border border-gray-200 text-sm"
                      onClick={() => setDetailRole(r)}
                    >
                      詳細を見る
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ── タブレット以上: テーブル（sm以上のみ表示） ── */}
          <Card className="hidden sm:block border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-sm whitespace-nowrap">利用区分名</TableHead>
                    <TableHead className="font-bold text-sm">説明</TableHead>
                    <TableHead className="font-bold text-sm whitespace-nowrap">利用者数</TableHead>
                    <TableHead className="font-bold text-sm whitespace-nowrap">種別</TableHead>
                    <TableHead className="font-bold text-sm text-right whitespace-nowrap" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map(r => {
                    const display = getRoleDisplay(r.name);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-bold text-sm py-3 whitespace-nowrap">
                          {display.displayName}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 py-3">
                          {display.description}
                        </TableCell>
                        <TableCell className="text-sm py-3 font-bold whitespace-nowrap">
                          {r.user_count}名
                        </TableCell>
                        <TableCell className="py-3">
                          <SystemBadge isSystem={r.is_system} />
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <Button
                            id={`btn-detail-role-${r.id}`}
                            variant="ghost"
                            size="sm"
                            className="min-h-[36px] text-gray-500"
                            onClick={() => setDetailRole(r)}
                          >
                            詳細を見る
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── 詳細モーダル（読み取り専用） ──
          現段階では変更できる設定項目がないため、
          説明の読み取りのみ提供します。
          permissions(JSON)はDB上維持されていますが、
          社内管理者には表示・編集させません。
      */}
      <Modal
        isOpen={!!detailRole}
        onClose={() => setDetailRole(null)}
        title={detailRole ? getRoleDisplay(detailRole.name).displayName : ''}
      >
        {detailRole && (() => {
          const display = getRoleDisplay(detailRole.name);
          return (
            <div className="space-y-4">
              {/* 種別 */}
              <div className="flex items-center gap-2">
                <SystemBadge isSystem={detailRole.is_system} />
              </div>

              {/* 説明 */}
              <div>
                <p className="text-xs font-bold text-gray-500 mb-1">この利用区分について</p>
                <p className="text-sm text-gray-700 leading-relaxed">{display.detailDescription}</p>
              </div>

              {/* 利用者数 */}
              <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                <Users className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-[11px] text-gray-400">現在の利用者数</p>
                  <p className="text-lg font-black text-gray-800">{detailRole.user_count}名</p>
                </div>
              </div>

              {/* 権限情報（将来拡張予定） */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 leading-relaxed">
                <p className="font-bold mb-1">権限設定について</p>
                <p>
                  詳細な権限設定（画面・操作単位の制御）は、
                  社内での運用設計が決まり次第、
                  チェック式の分かりやすい画面で設定できるよう順次対応予定です。
                </p>
              </div>

              <Button
                id="btn-close-detail-role"
                variant="ghost"
                className="w-full min-h-[44px] border border-gray-200"
                onClick={() => setDetailRole(null)}
              >
                閉じる
              </Button>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
