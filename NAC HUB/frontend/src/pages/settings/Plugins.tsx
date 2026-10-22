import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import {
  Plug,
  MessageSquare,
  HardDrive,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Settings,
  Check,
  Power,
  PowerOff,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  fetchPlugins,
  updatePluginSettings,
  validatePluginSettings,
  enablePlugin,
  disablePlugin,
} from '../../api/admin';
import type { PluginItemResponse, PluginStatus } from '../../types/admin';

// プラグインアイコンマッピング
function getPluginIcon(pluginKey: string) {
  switch (pluginKey) {
    case 'slack':
      return <MessageSquare className="h-6 w-6 text-emerald-600 shrink-0" />;
    case 'google_drive':
      return <HardDrive className="h-6 w-6 text-blue-600 shrink-0" />;
    case 'notepm':
      return <BookOpen className="h-6 w-6 text-amber-600 shrink-0" />;
    case 'hotbiz':
      return <Calendar className="h-6 w-6 text-indigo-600 shrink-0" />;
    default:
      return <Plug className="h-6 w-6 text-primary shrink-0" />;
  }
}

// ステータスバッジのスタイルとアイコン
function getStatusBadge(status: PluginStatus, label: string) {
  switch (status) {
    case 'configured':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {label}
        </span>
      );
    case 'needs_credentials':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertCircle className="h-3.5 w-3.5" />
          {label}
        </span>
      );
    case 'not_implemented':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <Info className="h-3.5 w-3.5" />
          {label}
        </span>
      );
    case 'disabled':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
          <PowerOff className="h-3.5 w-3.5" />
          {label}
        </span>
      );
    case 'error':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="h-3.5 w-3.5" />
          {label}
        </span>
      );
    case 'not_configured':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-50 text-gray-500 border border-gray-200">
          <HelpCircle className="h-3.5 w-3.5" />
          {label || '未設定'}
        </span>
      );
  }
}

export default function Plugins() {
  const [plugins, setPlugins] = useState<PluginItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 設定モーダル用state
  const [editingPlugin, setEditingPlugin] = useState<PluginItemResponse | null>(null);
  const [formSettings, setFormSettings] = useState<Record<string, any>>({});
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // 設定確認結果ダイアログ用state
  const [validationResult, setValidationResult] = useState<{
    pluginName: string;
    message: string;
    testedAt: string;
    success: boolean;
  } | null>(null);

  // プラグイン一覧取得
  const loadPlugins = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetchPlugins();
      setPlugins(res.items);
    } catch (err: any) {
      setErrorMessage(err.message || 'プラグイン一覧の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlugins();
  }, []);

  // 設定モーダルを開く
  const handleOpenEditModal = (plugin: PluginItemResponse) => {
    setEditingPlugin(plugin);
    setFormSettings({ ...(plugin.settings || {}) });
    setModalError(null);
  };

  // 設定モーダルを閉じる
  const handleCloseModal = () => {
    setEditingPlugin(null);
    setFormSettings({});
    setModalError(null);
  };

  // 設定保存
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlugin) return;

    try {
      setModalSaving(true);
      setModalError(null);
      await updatePluginSettings(editingPlugin.plugin_key, {
        settings: formSettings,
      });
      setSuccessMessage(`「${editingPlugin.display_name}」の基本設定を保存しました。`);
      handleCloseModal();
      await loadPlugins();
    } catch (err: any) {
      setModalError(err.message || '設定の保存に失敗しました。');
    } finally {
      setModalSaving(false);
    }
  };

  // 設定確認（旧テストボタン）
  const handleValidateSettings = async (plugin: PluginItemResponse) => {
    try {
      setActionLoading(`validate-${plugin.plugin_key}`);
      setErrorMessage(null);
      const res = await validatePluginSettings(plugin.plugin_key);
      setValidationResult({
        pluginName: plugin.display_name,
        message: res.message,
        testedAt: new Date(res.tested_at).toLocaleString('ja-JP'),
        success: res.success,
      });
      await loadPlugins();
    } catch (err: any) {
      setErrorMessage(err.message || '設定確認の実行に失敗しました。');
    } finally {
      setActionLoading(null);
    }
  };

  // 有効化・無効化
  const handleToggleActive = async (plugin: PluginItemResponse) => {
    try {
      setActionLoading(`toggle-${plugin.plugin_key}`);
      setErrorMessage(null);
      if (plugin.is_enabled) {
        await disablePlugin(plugin.plugin_key);
        setSuccessMessage(`「${plugin.display_name}」を無効化しました。`);
      } else {
        await enablePlugin(plugin.plugin_key);
        setSuccessMessage(`「${plugin.display_name}」を有効化しました。`);
      }
      await loadPlugins();
    } catch (err: any) {
      setErrorMessage(err.message || '状態の変更に失敗しました。');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-12 max-w-7xl mx-auto">
      {/* 画面ヘッダー */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-800 flex items-center gap-2">
          <Plug className="h-6 w-6 text-primary shrink-0" /> プラグイン管理
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
          外部サービスとの連携コネクタ・拡張機能の基本準備設定および利用状態を管理します。
        </p>
      </div>

      {/* 注意事項案内バナー */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-amber-900 flex items-start gap-2.5">
        <Info className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">外部サービス連携についてのご案内</p>
          <p className="text-amber-800 leading-relaxed text-xs">
            現在のバージョンでは、安全のため外部サービスへの本接続・API通信は未接続となっております。
            本画面では各サービスを利用するための「基本準備情報」の設定と事前確認のみを行えます。
            APIトークンやシークレット等の機密情報は保存されません。
          </p>
        </div>
      </div>

      {/* メッセージバナー */}
      {successMessage && (
        <div className="p-3 sm:p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-600 hover:underline shrink-0"
          >
            閉じる
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs text-red-600 hover:underline shrink-0"
          >
            閉じる
          </button>
        </div>
      )}

      {/* ローディングスピナー */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <RefreshCw className="h-8 w-8 text-primary animate-spin mb-3" />
          <p className="text-sm font-bold text-gray-600">プラグイン情報を読み込み中...</p>
        </div>
      ) : (
        /* プラグインカードグリッド (常に4件表示) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {plugins.map((plugin) => {
            const isValidating = actionLoading === `validate-${plugin.plugin_key}`;
            const isToggling = actionLoading === `toggle-${plugin.plugin_key}`;

            return (
              <Card
                key={plugin.plugin_key}
                className={`border border-gray-100 shadow-sm rounded-xl sm:rounded-2xl transition-all flex flex-col justify-between ${
                  plugin.is_enabled ? 'border-t-4 border-t-primary' : 'opacity-85'
                }`}
              >
                <div>
                  <CardHeader className="p-4 sm:p-5 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                          {getPluginIcon(plugin.plugin_key)}
                        </div>
                        <div>
                          <CardTitle className="text-base sm:text-lg font-bold text-gray-900">
                            {plugin.display_name}
                          </CardTitle>
                          <span className="text-xs text-gray-500 font-medium">
                            {plugin.category}
                          </span>
                        </div>
                      </div>
                      <div>{getStatusBadge(plugin.status, plugin.status_label)}</div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
                    {/* プラグイン説明文 */}
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                      {plugin.description}
                    </p>

                    {/* 詳細ステータス情報 */}
                    <div className="text-xs sm:text-sm space-y-2 divide-y divide-gray-50">
                      <div className="flex justify-between py-1.5 items-center">
                        <span className="text-gray-500 font-medium">利用対象フラグ:</span>
                        <span
                          className={`font-bold text-xs px-2 py-0.5 rounded ${
                            plugin.is_enabled
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {plugin.is_enabled ? '利用中 (有効)' : '無効'}
                        </span>
                      </div>

                      <div className="flex justify-between py-1.5 items-center">
                        <span className="text-gray-500 font-medium">外部通信状態:</span>
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          未接続 (準備段階)
                        </span>
                      </div>

                      <div className="flex justify-between py-1.5 items-center">
                        <span className="text-gray-500 font-medium flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          最終設定確認:
                        </span>
                        <span className="text-gray-700 font-mono text-xs">
                          {plugin.last_tested_at
                            ? new Date(plugin.last_tested_at).toLocaleString('ja-JP', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '未確認'}
                        </span>
                      </div>

                      {/* 前回確認結果サマリ */}
                      {plugin.last_validation_result && (
                        <div className="pt-2">
                          <span className="text-gray-500 font-medium block text-xs mb-1">
                            前回確認結果:
                          </span>
                          <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100 line-clamp-2">
                            {plugin.last_validation_result}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </div>

                {/* アクションボタンバー */}
                <div className="p-4 sm:p-5 pt-2 border-t border-gray-100 flex flex-wrap sm:flex-nowrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 min-h-[40px] text-xs font-bold flex items-center justify-center gap-1.5"
                    onClick={() => handleOpenEditModal(plugin)}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    基本設定
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 min-h-[40px] text-xs font-bold flex items-center justify-center gap-1.5"
                    onClick={() => handleValidateSettings(plugin)}
                    disabled={isValidating}
                  >
                    {isValidating ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                    )}
                    {isValidating ? '確認中...' : '設定確認'}
                  </Button>

                  <Button
                    variant={plugin.is_enabled ? 'outline' : 'primary'}
                    size="sm"
                    className={`min-h-[40px] px-3 text-xs font-bold flex items-center justify-center gap-1 shrink-0 ${
                      plugin.is_enabled
                        ? 'border-gray-200 text-gray-700 hover:bg-gray-50'
                        : ''
                    }`}
                    onClick={() => handleToggleActive(plugin)}
                    disabled={isToggling}
                  >
                    {isToggling ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : plugin.is_enabled ? (
                      <PowerOff className="h-3.5 w-3.5 text-gray-500" />
                    ) : (
                      <Power className="h-3.5 w-3.5" />
                    )}
                    {plugin.is_enabled ? '無効化' : '有効化'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ──────────────── 設定モーダル ──────────────── */}
      {editingPlugin && (
        <Modal
          isOpen={true}
          onClose={handleCloseModal}
          title={`${editingPlugin.display_name} 基本準備設定`}
          className="max-w-lg"
        >
          <form onSubmit={handleSaveSettings} className="space-y-4">
            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-900">
              <p className="font-bold flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                非機密情報の入力について
              </p>
              <p className="text-blue-800 mt-1 leading-relaxed">
                本画面では連携に必要な準備情報のみを入力します。APIキーやパスワード等の秘密情報は入力・保存しないでください。
              </p>
            </div>

            {/* Slack 専用フィールド */}
            {editingPlugin.plugin_key === 'slack' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ワークスペース名 または URL <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="例: nac-system または my-company.slack.com"
                    value={formSettings.workspace_name || ''}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, workspace_name: e.target.value })
                    }
                    className="text-xs"
                    required
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    連携予定のSlackワークスペース名またはドメインを入力します。
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    対象チャンネルの説明・候補
                  </label>
                  <Input
                    placeholder="例: #general, #全社連絡"
                    value={formSettings.target_channel || ''}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, target_channel: e.target.value })
                    }
                    className="text-xs"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    NAC HUB上で参照を予定しているチャンネル名を入力します。
                  </p>
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formSettings.connect_intent)}
                      onChange={(e) =>
                        setFormSettings({ ...formSettings, connect_intent: e.target.checked })
                      }
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    将来的にOAuth連携またはBot接続を行う予定がある
                  </label>
                </div>
              </div>
            )}

            {/* Google Drive 専用フィールド */}
            {editingPlugin.plugin_key === 'google_drive' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    共有ドライブ名
                  </label>
                  <Input
                    placeholder="例: NAC全社共有ドライブ"
                    value={formSettings.drive_name || ''}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, drive_name: e.target.value })
                    }
                    className="text-xs"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    検索対象とするGoogle共有ドライブの表示名です。
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    対象フォルダ名 または フォルダID
                  </label>
                  <Input
                    placeholder="例: 01_全社資料 または folder_id_xyz"
                    value={formSettings.target_folder || ''}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, target_folder: e.target.value })
                    }
                    className="text-xs"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    なっくんからの参照を許可するフォルダの指定です。
                  </p>
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formSettings.read_only !== false}
                      onChange={(e) =>
                        setFormSettings({ ...formSettings, read_only: e.target.checked })
                      }
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    閲覧専用モード（ファイルの変更や削除を許可しない）
                  </label>
                </div>
              </div>
            )}

            {/* NotePM 専用フィールド */}
            {editingPlugin.plugin_key === 'notepm' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    チームドメイン <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="例: nac-system.notepm.jp または nac-system"
                    value={formSettings.team_domain || ''}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, team_domain: e.target.value })
                    }
                    className="text-xs"
                    required
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    ご契約中のNotePMのサブドメイン名を入力します。
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    対象ノート範囲の説明
                  </label>
                  <Input
                    placeholder="例: 全社マニュアル・業務マニュアル"
                    value={formSettings.target_scope || ''}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, target_scope: e.target.value })
                    }
                    className="text-xs"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    NAC HUB検索対象とするノートの範囲です。
                  </p>
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formSettings.read_only !== false}
                      onChange={(e) =>
                        setFormSettings({ ...formSettings, read_only: e.target.checked })
                      }
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    閲覧専用（ナレッジの更新は行わない）
                  </label>
                </div>
              </div>
            )}

            {/* HotBiz 専用フィールド */}
            {editingPlugin.plugin_key === 'hotbiz' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    利用バージョン
                  </label>
                  <Input
                    placeholder="例: HotBiz 7"
                    value={formSettings.version || ''}
                    onChange={(e) =>
                      setFormSettings({ ...formSettings, version: e.target.value })
                    }
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    連携方式 <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2 pt-1 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="connection_method"
                        value="link"
                        checked={formSettings.connection_method === 'link'}
                        onChange={(e) =>
                          setFormSettings({ ...formSettings, connection_method: e.target.value })
                        }
                        className="text-primary focus:ring-primary"
                      />
                      <span>ポータルリンクのみ（画面上にHotBizへの遷移ボタンを配置）</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="connection_method"
                        value="gcal"
                        checked={formSettings.connection_method === 'gcal'}
                        onChange={(e) =>
                          setFormSettings({ ...formSettings, connection_method: e.target.value })
                        }
                        className="text-primary focus:ring-primary"
                      />
                      <span>Googleカレンダー経由連携（予定同期の準備）</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="connection_method"
                        value="csv"
                        checked={formSettings.connection_method === 'csv'}
                        onChange={(e) =>
                          setFormSettings({ ...formSettings, connection_method: e.target.value })
                        }
                        className="text-primary focus:ring-primary"
                      />
                      <span>CSVファイル取込連携（勤怠・データ同期）</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="connection_method"
                        value="vendor"
                        checked={formSettings.connection_method === 'vendor'}
                        onChange={(e) =>
                          setFormSettings({ ...formSettings, connection_method: e.target.value })
                        }
                        className="text-primary focus:ring-primary"
                      />
                      <span>ベンダー個別連携（カスタマイズAPI接続）</span>
                    </label>
                  </div>
                </div>

                <div className="pt-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    連携対象機能
                  </label>
                  <div className="flex gap-4 text-xs">
                    {['schedule:予定', 'attendance:勤怠', 'facility:設備予約'].map((item) => {
                      const [key, label] = item.split(':');
                      const features: string[] = Array.isArray(formSettings.target_features)
                        ? formSettings.target_features
                        : [];
                      const isChecked = features.includes(key);

                      return (
                        <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormSettings({
                                  ...formSettings,
                                  target_features: [...features, key],
                                });
                              } else {
                                setFormSettings({
                                  ...formSettings,
                                  target_features: features.filter((f) => f !== key),
                                });
                              }
                            }}
                            className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* モーダルフッター */}
            <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCloseModal}
                disabled={modalSaving}
                className="min-h-[40px] px-4 text-xs font-bold"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={modalSaving}
                className="min-h-[40px] px-5 text-xs font-bold flex items-center gap-1.5"
              >
                {modalSaving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                {modalSaving ? '保存中...' : '設定を保存'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ──────────────── 設定確認結果モーダル ──────────────── */}
      {validationResult && (
        <Modal
          isOpen={true}
          onClose={() => setValidationResult(null)}
          title="設定確認 結果"
          className="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="p-2 rounded-lg bg-white border border-gray-200">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">対象プラグイン</p>
                <p className="text-sm font-bold text-gray-900">{validationResult.pluginName}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-bold text-gray-700">確認内容・システム診断:</p>
              <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-900 leading-relaxed font-sans">
                {validationResult.message}
              </div>
            </div>

            <div className="text-[11px] text-gray-500 flex items-center justify-between border-t border-gray-100 pt-3">
              <span>確認日時:</span>
              <span className="font-mono">{validationResult.testedAt}</span>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setValidationResult(null)}
                className="w-full min-h-[40px] text-xs font-bold"
              >
                閉じる
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
