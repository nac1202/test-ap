import React from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { Shield, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function Roles() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-800 flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary shrink-0" /> ロール・権限管理
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">役職・アクセス権限ロールのグループ定義と割り当てを行います。</p>
        </div>
        <Button className="flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto">
          <Plus className="h-4 w-4" /> ロール追加
        </Button>
      </div>

      <Card className="border border-gray-100 shadow-sm rounded-xl sm:rounded-2xl overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-xs sm:text-sm">ロール名</TableHead>
                <TableHead className="font-bold text-xs sm:text-sm">概要</TableHead>
                <TableHead className="font-bold text-xs sm:text-sm">利用者数</TableHead>
                <TableHead className="font-bold text-xs sm:text-sm text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-bold text-xs sm:text-sm py-3">システム管理者</TableCell>
                <TableCell className="text-xs sm:text-sm text-gray-600 py-3">全モジュールへのフルアクセス、設定変更が可能</TableCell>
                <TableCell className="text-xs sm:text-sm py-3 font-bold">2名</TableCell>
                <TableCell className="text-right py-3"><Button variant="ghost" size="sm" className="min-h-[36px]">編集</Button></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-bold text-xs sm:text-sm py-3">プロデューサー</TableCell>
                <TableCell className="text-xs sm:text-sm text-gray-600 py-3">案件の作成、更新、メンバー設定が可能</TableCell>
                <TableCell className="text-xs sm:text-sm py-3 font-bold">15名</TableCell>
                <TableCell className="text-right py-3"><Button variant="ghost" size="sm" className="min-h-[36px]">編集</Button></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-bold text-xs sm:text-sm py-3">一般ユーザー</TableCell>
                <TableCell className="text-xs sm:text-sm text-gray-600 py-3">案件の閲覧、チャット利用のみ可能</TableCell>
                <TableCell className="text-xs sm:text-sm py-3 font-bold">80名</TableCell>
                <TableCell className="text-right py-3"><Button variant="ghost" size="sm" className="min-h-[36px]">編集</Button></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
