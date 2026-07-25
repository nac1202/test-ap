import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plus, Search, FolderKanban } from 'lucide-react';

export default function Projects() {
  const navigate = useNavigate();
  
  const projects = [
    { id: 1, name: '2026年 秋の大型キャンペーン', client: 'A社', progress: 75, status: '進行中', deadline: '2026-09-30' },
    { id: 2, name: 'コーポレートサイトリニューアル', client: '自社', progress: 100, status: '完了', deadline: '2026-07-01' },
    { id: 3, name: '社内ポータル刷新プロジェクト', client: '自社', progress: 10, status: '要確認', deadline: '2026-12-01' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-primary" /> 案件一覧
          </h2>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> 新規案件
        </Button>
      </div>

      <Card>
        <CardHeader className="py-4 flex flex-row items-center justify-between border-b bg-gray-50/50">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input className="pl-9 bg-white" placeholder="案件名で検索..." />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>案件名</TableHead>
                <TableHead>クライアント</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>進捗</TableHead>
                <TableHead>納期</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-orange-50/30" onClick={() => navigate(`/projects/${p.id}`)}>
                  <TableCell className="font-bold">{p.name}</TableCell>
                  <TableCell>{p.client}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      p.status === '進行中' ? 'bg-blue-100 text-blue-700' :
                      p.status === '完了' ? 'bg-green-100 text-green-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {p.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className={`bg-primary h-2.5 rounded-full`} style={{ width: `${p.progress}%` }}></div>
                    </div>
                  </TableCell>
                  <TableCell>{p.deadline}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">詳細</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
