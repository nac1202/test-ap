import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Plug, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function Plugins() {
  const plugins = [
    { id: 1, name: 'Slack アダプター', status: 'active', type: 'Chat', lastTest: '2026-07-26 09:00' },
    { id: 2, name: 'Google Drive 連携', status: 'active', type: 'Storage', lastTest: '2026-07-26 09:00' },
    { id: 3, name: 'NotePM 連携', status: 'inactive', type: 'Knowledge', lastTest: '未テスト' },
    { id: 4, name: 'HotBiz アダプター', status: 'active', type: 'Attendance', lastTest: '2026-07-26 09:00' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-10">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-800 flex items-center gap-2">
          <Plug className="h-6 w-6 text-primary shrink-0" /> プラグイン管理
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">外部サービス連携コネクタ・拡張機能のステータス管理です。</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {plugins.map(plugin => (
          <Card key={plugin.id} className={`border border-gray-100 shadow-sm rounded-xl sm:rounded-2xl transition-all ${plugin.status === 'active' ? 'border-t-4 border-t-primary' : 'opacity-75'}`}>
            <CardHeader className="p-4 sm:p-5 pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base sm:text-lg font-bold text-gray-900 truncate">{plugin.name}</CardTitle>
                {plugin.status === 'active' ? (
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400 shrink-0" />
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0">
              <div className="text-xs sm:text-sm space-y-2 mb-4">
                <p className="flex justify-between"><span className="text-gray-500">種別:</span> <span className="font-bold text-gray-800">{plugin.type}</span></p>
                <p className="flex justify-between"><span className="text-gray-500">最終確認:</span> <span className="text-gray-600">{plugin.lastTest}</span></p>
              </div>
              <div className="flex gap-2">
                <Button variant={plugin.status === 'active' ? 'outline' : 'primary'} size="sm" className="w-full min-h-[36px]">
                  {plugin.status === 'active' ? '設定' : '有効化'}
                </Button>
                {plugin.status === 'active' && (
                  <Button variant="secondary" size="sm" className="w-full min-h-[36px]">テスト</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
