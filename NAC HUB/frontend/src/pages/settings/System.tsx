import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Settings, Save } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function System() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" /> システム設定
        </h2>
        <Button className="flex items-center gap-2">
          <Save className="h-4 w-4" /> 保存
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company マスタ情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">システム表示名</label>
            <Input defaultValue="NAC HUB" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">コーポレートカラー (HEX)</label>
            <Input defaultValue="#F97316" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold">タイムゾーン</label>
            <select className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm">
              <option>Asia/Tokyo</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>バージョン情報</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">バージョン</span>
              <span className="font-bold">v1.1.0-alpha</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">ビルド番号</span>
              <span className="font-bold">#8024</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">最終更新日</span>
              <span className="font-bold">2026-07-08</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
