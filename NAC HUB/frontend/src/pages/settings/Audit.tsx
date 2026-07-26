import React from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { History, Search } from 'lucide-react';
import { Input } from '../../components/ui/Input';

export default function Audit() {
  const logs = [
    { id: 1, time: '2026-07-26 09:15:22', user: 'NAC 太郎', action: 'ログイン', target: 'System' },
    { id: 2, time: '2026-07-26 09:10:05', user: 'NAC 太郎', action: 'プラグイン有効化', target: 'Slack アダプター' },
    { id: 3, time: '2026-07-26 08:30:00', user: 'なっくん (AI)', action: 'データ検索', target: 'Google Drive (A社提案書)' },
    { id: 4, time: '2026-07-25 18:22:10', user: '山田 花子', action: '案件ステータス更新', target: '2026年 秋の大型キャンペーン' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-10">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-800 flex items-center gap-2">
          <History className="h-6 w-6 text-primary shrink-0" /> 監査・AI実行ログ
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">システム操作およびAIエージェントのアクセス・実行履歴ログです。</p>
      </div>

      <Card className="border border-gray-100 shadow-sm rounded-xl sm:rounded-2xl overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input className="pl-9 bg-white text-xs sm:text-sm h-11" placeholder="ユーザー、アクションで検索..." />
          </div>
        </div>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-xs sm:text-sm">日時</TableHead>
                <TableHead className="font-bold text-xs sm:text-sm">ユーザー/システム</TableHead>
                <TableHead className="font-bold text-xs sm:text-sm">アクション</TableHead>
                <TableHead className="font-bold text-xs sm:text-sm">対象データ・操作内容</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-gray-500 text-[11px] sm:text-xs whitespace-nowrap py-3">{log.time}</TableCell>
                  <TableCell className="font-bold text-xs sm:text-sm py-3">{log.user}</TableCell>
                  <TableCell className="py-3">
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-[11px] font-bold text-gray-700 whitespace-nowrap">{log.action}</span>
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm text-gray-700 py-3">{log.target}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
