import React from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { History, Search } from 'lucide-react';
import { Input } from '../../components/ui/Input';

export default function Audit() {
  const logs = [
    { id: 1, time: '2026-07-08 09:15:22', user: 'NAC 太郎', action: 'ログイン', target: 'System' },
    { id: 2, time: '2026-07-08 09:10:05', user: 'NAC 太郎', action: 'プラグイン有効化', target: 'Slack アダプター' },
    { id: 3, time: '2026-07-08 08:30:00', user: 'なっくん (AI)', action: 'データ検索', target: 'Google Drive (A社提案書)' },
    { id: 4, time: '2026-07-07 18:22:10', user: '山田 花子', action: '案件ステータス更新', target: '2026年 秋の大型キャンペーン' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          <History className="h-6 w-6 text-primary" /> 監査・AI実行ログ
        </h2>
      </div>

      <Card>
        <div className="p-4 border-b flex items-center gap-4 bg-gray-50/50">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input className="pl-9 bg-white" placeholder="ユーザー、アクションで検索..." />
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日時</TableHead>
                <TableHead>ユーザー/システム</TableHead>
                <TableHead>アクション</TableHead>
                <TableHead>対象データ・操作内容</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-gray-500 text-xs">{log.time}</TableCell>
                  <TableCell className="font-bold">{log.user}</TableCell>
                  <TableCell>
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold">{log.action}</span>
                  </TableCell>
                  <TableCell className="text-sm">{log.target}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
