import React from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Users as UsersIcon, Plus } from 'lucide-react';

export default function Users() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-800 flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-primary shrink-0" /> ユーザー管理
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">システム利用ユーザーアカウントの作成・権限設定を行います。</p>
        </div>
        <Button className="flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto">
          <Plus className="h-4 w-4" /> ユーザー追加
        </Button>
      </div>

      <Card className="border border-gray-100 shadow-sm rounded-xl sm:rounded-2xl overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-xs sm:text-sm">氏名</TableHead>
                <TableHead className="font-bold text-xs sm:text-sm">メールアドレス</TableHead>
                <TableHead className="font-bold text-xs sm:text-sm">ロール</TableHead>
                <TableHead className="font-bold text-xs sm:text-sm">ステータス</TableHead>
                <TableHead className="font-bold text-xs sm:text-sm text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-bold text-xs sm:text-sm py-3">NAC 太郎</TableCell>
                <TableCell className="text-xs sm:text-sm text-gray-600 py-3">admin@example.com</TableCell>
                <TableCell className="py-3">
                  <span className="bg-gray-100 px-2 py-0.5 rounded text-[11px] font-bold text-gray-700">システム管理者</span>
                </TableCell>
                <TableCell className="py-3">
                  <span className="text-green-600 font-bold text-xs">有効</span>
                </TableCell>
                <TableCell className="text-right py-3">
                  <Button variant="ghost" size="sm" className="min-h-[36px]">編集</Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-bold text-xs sm:text-sm py-3">山田 花子</TableCell>
                <TableCell className="text-xs sm:text-sm text-gray-600 py-3">yamada@nac.com</TableCell>
                <TableCell className="py-3">
                  <span className="bg-gray-100 px-2 py-0.5 rounded text-[11px] font-bold text-gray-700">一般ユーザー</span>
                </TableCell>
                <TableCell className="py-3">
                  <span className="text-green-600 font-bold text-xs">有効</span>
                </TableCell>
                <TableCell className="text-right py-3">
                  <Button variant="ghost" size="sm" className="min-h-[36px]">編集</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
