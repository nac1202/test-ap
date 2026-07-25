import React from 'react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Users as UsersIcon, Plus } from 'lucide-react';

export default function Users() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          <UsersIcon className="h-6 w-6 text-primary" /> ユーザー管理
        </h2>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> ユーザー追加
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>氏名</TableHead>
                <TableHead>メールアドレス</TableHead>
                <TableHead>ロール</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-bold">NAC 太郎</TableCell>
                <TableCell>admin@example.com</TableCell>
                <TableCell><span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold">システム管理者</span></TableCell>
                <TableCell><span className="text-green-600 font-bold text-sm">有効</span></TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="sm">編集</Button></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-bold">山田 花子</TableCell>
                <TableCell>yamada@nac.com</TableCell>
                <TableCell><span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold">一般ユーザー</span></TableCell>
                <TableCell><span className="text-green-600 font-bold text-sm">有効</span></TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="sm">編集</Button></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
