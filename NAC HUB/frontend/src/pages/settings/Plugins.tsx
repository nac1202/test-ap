import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Plug, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function Plugins() {
  const plugins = [
    { id: 1, name: 'Slack アダプター', status: 'active', type: 'Chat', lastTest: '2026-07-08 09:00' },
    { id: 2, name: 'Google Drive 連携', status: 'active', type: 'Storage', lastTest: '2026-07-08 09:00' },
    { id: 3, name: 'NotePM 連携', status: 'inactive', type: 'Knowledge', lastTest: '未テスト' },
    { id: 4, name: 'HotBiz アダプター', status: 'active', type: 'Attendance', lastTest: '2026-07-08 09:00' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          <Plug className="h-6 w-6 text-primary" /> プラグイン管理
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plugins.map(plugin => (
          <Card key={plugin.id} className={plugin.status === 'active' ? 'border-t-4 border-t-primary' : 'opacity-75'}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{plugin.name}</CardTitle>
                {plugin.status === 'active' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2 mb-4">
                <p className="flex justify-between"><span className="text-gray-500">種別:</span> <span className="font-bold">{plugin.type}</span></p>
                <p className="flex justify-between"><span className="text-gray-500">最終確認:</span> <span>{plugin.lastTest}</span></p>
              </div>
              <div className="flex gap-2">
                <Button variant={plugin.status === 'active' ? 'outline' : 'primary'} size="sm" className="w-full">
                  {plugin.status === 'active' ? '設定' : '有効化'}
                </Button>
                {plugin.status === 'active' && (
                  <Button variant="secondary" size="sm" className="w-full">テスト</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
