import React from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { Shield } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function Roles() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> ロール・権限管理
        </h2>
        <Button>ロール追加</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ロール名</TableHead>
                <TableHead>概要</TableHead>
                <TableHead>利用者数</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-bold">システム管理者</TableCell>
                <TableCell className="text-sm text-gray-600">全モジュールへのフルアクセス、設定変更が可能</TableCell>
                <TableCell>2名</TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="sm">編集</Button></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-bold">プロデューサー</TableCell>
                <TableCell className="text-sm text-gray-600">案件の作成、更新、権限変更が可能</TableCell>
                <TableCell>15名</TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="sm">編集</Button></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-bold">一般ユーザー</TableCell>
                <TableCell className="text-sm text-gray-600">案件の閲覧、チャット利用のみ可能</TableCell>
                <TableCell>80名</TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="sm">編集</Button></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
