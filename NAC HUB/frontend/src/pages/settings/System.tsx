import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Settings, Save } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function System() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 max-w-2xl pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-800 flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary shrink-0" /> システム設定
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">システム全体の基本表示・全社パラメータ設定を管理します。</p>
        </div>
        <Button className="flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto">
          <Save className="h-4 w-4" /> 設定を保存
        </Button>
      </div>

      <Card className="border border-gray-100 shadow-sm rounded-xl sm:rounded-2xl">
        <CardHeader className="p-4 sm:p-5 border-b border-gray-100">
          <CardTitle className="text-base font-bold">Company マスタ情報</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 block">システム表示名</label>
            <Input defaultValue="NAC HUB" className="w-full" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 block">コーポレートカラー (HEX)</label>
            <Input defaultValue="#F97316" className="w-full" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 block">タイムゾーン</label>
            <select className="flex h-11 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option>Asia/Tokyo (JST)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-100 shadow-sm rounded-xl sm:rounded-2xl">
        <CardHeader className="p-4 sm:p-5 border-b border-gray-100">
          <CardTitle className="text-base font-bold">バージョン情報</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">バージョン</span>
              <span className="font-bold text-gray-800">v1.4.0</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">ビルド番号</span>
              <span className="font-bold text-gray-800">#20260726</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">最終更新日</span>
              <span className="font-bold text-gray-800">2026-07-26</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
