import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Settings, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { fetchSystemSettings, updateSystemSettings } from '../../api/admin';
import type { SystemVersionInfo } from '../../types/admin';
import { useSystemConfig } from '../../contexts/SystemConfigContext';

export default function System() {
  const { refetchConfig } = useSystemConfig();
  const [companyName, setCompanyName] = useState('NAC System');
  const [systemName, setSystemName] = useState('NAC HUB');
  const [themeColor, setThemeColor] = useState('#FF6B00');
  const [timezone, setTimezone] = useState('Asia/Tokyo');
  const [noticeDisplayCount, setNoticeDisplayCount] = useState(5);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [versionInfo, setVersionInfo] = useState<SystemVersionInfo | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 初期データ取得
  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      try {
        setLoading(true);
        setErrorMessage(null);
        const data = await fetchSystemSettings();
        if (isMounted) {
          setCompanyName(data.company_name);
          setSystemName(data.system_name);
          setThemeColor(data.theme_color);
          setTimezone(data.timezone);
          setNoticeDisplayCount(data.notice_display_count);
          setMaintenanceMode(data.maintenance_mode);
          setVersionInfo(data.version_info);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const errObj = err as Error;
          setErrorMessage(errObj.message || 'システム設定の取得に失敗しました。');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  // 設定保存ハンドラー
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (saving) return;

    // バリデーション
    if (!companyName.trim()) {
      setErrorMessage('会社名を入力してください。');
      return;
    }
    if (!systemName.trim()) {
      setErrorMessage('システム表示名を入力してください。');
      return;
    }
    if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(themeColor.trim())) {
      setErrorMessage('コーポレートカラーは有効なカラーコード（例: #FF6B00）で入力してください。');
      return;
    }
    if (noticeDisplayCount < 1 || noticeDisplayCount > 50) {
      setErrorMessage('お知らせ表示件数は1件〜50件の範囲で指定してください。');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const updated = await updateSystemSettings({
        company_name: companyName.trim(),
        system_name: systemName.trim(),
        theme_color: themeColor.trim(),
        timezone,
        notice_display_count: Number(noticeDisplayCount),
        maintenance_mode: maintenanceMode,
      });

      // 更新後の値で反映
      setCompanyName(updated.company_name);
      setSystemName(updated.system_name);
      setThemeColor(updated.theme_color);
      setTimezone(updated.timezone);
      setNoticeDisplayCount(updated.notice_display_count);
      setMaintenanceMode(updated.maintenance_mode);
      if (updated.version_info) {
        setVersionInfo(updated.version_info);
      }

      // 共通Contextを更新（サイドバー・モバイルドロワーへ即時反映）
      try {
        await refetchConfig();
      } catch (refetchErr) {
        console.warn('Failed to refetch system config:', refetchErr);
      }

      setSuccessMessage('システム設定を正常に保存しました。');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } catch (err: unknown) {
      const errObj = err as Error;
      setErrorMessage(errObj.message || '設定の保存に失敗しました。入力内容をご確認ください。');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm font-bold text-gray-500">システム設定を読み込み中...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 max-w-2xl pb-10">
      {/* 画面ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-800 flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary shrink-0" /> システム設定
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">NAC HUB全体の基本表示および全社運用パラメータを管理します。</p>
        </div>
        <Button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto px-5 font-bold shadow-sm"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> 保存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> 設定を保存
            </>
          )}
        </Button>
      </div>

      {/* 成功通知バナー */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3.5 sm:p-4 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span className="font-bold">{successMessage}</span>
        </div>
      )}

      {/* エラー通知バナー */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 sm:p-4 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span className="font-bold">{errorMessage}</span>
        </div>
      )}

      {/* カード1: 会社・システム基本情報 */}
      <Card className="border border-gray-100 shadow-sm rounded-xl sm:rounded-2xl">
        <CardHeader className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50">
          <CardTitle className="text-base font-bold text-gray-800">会社・システム基本情報</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 block">
              会社名 <span className="text-rose-500">*</span>
            </label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="例: NAC株式会社"
              className="w-full min-h-[44px]"
              required
            />
            <p className="text-[11px] text-gray-400">システム内で正式に使用される会社名です。</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 block">
              システム表示名 <span className="text-rose-500">*</span>
            </label>
            <Input
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              placeholder="例: NAC HUB"
              className="w-full min-h-[44px]"
              required
            />
            <p className="text-[11px] text-gray-400">ヘッダーやサイドバーに表示されるポータル名称です。</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 block">
              コーポレートカラー <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2.5">
              <input
                type="color"
                value={themeColor.startsWith('#') && themeColor.length === 7 ? themeColor : '#FF6B00'}
                onChange={(e) => setThemeColor(e.target.value.toUpperCase())}
                className="h-11 w-11 p-1 rounded-lg border border-gray-300 cursor-pointer shrink-0 bg-white"
                title="カラーピッカーで色を選択"
              />
              <Input
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                placeholder="#FF6B00"
                className="w-full font-mono min-h-[44px]"
                maxLength={7}
                required
              />
            </div>
            <p className="text-[11px] text-gray-400">ブランドカラーを表す16進数コード（例: #FF6B00）です。</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 block">タイムゾーン</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="flex min-h-[44px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Asia/Tokyo">日本標準時 (Asia/Tokyo - JST)</option>
              <option value="UTC">協定世界時 (UTC)</option>
              <option value="America/New_York">米国東部標準時 (America/New_York - EST)</option>
              <option value="Europe/London">英国時間 (Europe/London - GMT/BST)</option>
            </select>
            <p className="text-[11px] text-gray-400">日時表示の基準となる時間帯を指定します。</p>
          </div>
        </CardContent>
      </Card>

      {/* カード2: 運用・表示設定 */}
      <Card className="border border-gray-100 shadow-sm rounded-xl sm:rounded-2xl">
        <CardHeader className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50">
          <CardTitle className="text-base font-bold text-gray-800">運用・表示設定</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 block">
              ホーム画面のお知らせ表示件数
            </label>
            <Input
              type="number"
              min={1}
              max={50}
              value={noticeDisplayCount}
              onChange={(e) => setNoticeDisplayCount(parseInt(e.target.value, 10) || 5)}
              className="w-full sm:w-48 min-h-[44px]"
              required
            />
            <p className="text-[11px] text-gray-400">ホームの「全社お知らせ」一覧に一度に表示する件数（1〜50件）です。</p>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-gray-800 block">メンテナンス案内バナーを表示する</span>
                <span className="text-[11px] text-gray-500 block">
                  チェックを入れると、全ユーザーの画面上部に定期メンテナンス等の予告バナーを表示します。
                </span>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* カード3: システム・バージョン情報 */}
      <Card className="border border-gray-100 shadow-sm rounded-xl sm:rounded-2xl">
        <CardHeader className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50">
          <CardTitle className="text-base font-bold text-gray-800">システム情報</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">システムバージョン</span>
              <span className="font-bold text-gray-800 font-mono">
                Ver {(versionInfo?.version ?? '1.10.0').replace(/^v/i, '')}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">ビルド番号</span>
              <span className="font-bold text-gray-800 font-mono">
                Build {(versionInfo?.build_number ?? '20261021').replace(/^#/, '').replace(/^Build\s*/i, '')}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">最終更新日</span>
              <span className="font-bold text-gray-800 font-mono">
                {versionInfo?.updated_at ?? '2026-10-21'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
