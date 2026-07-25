import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Clock, MessageCircle, FileText, Link as LinkIcon, Star, FolderKanban } from 'lucide-react';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="p-2 rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-black text-gray-800">2026年 秋の大型キャンペーン</h2>
        <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700">進行中</span>
        <Button variant="ghost" size="sm" className="ml-auto text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50">
          <Star className="h-5 w-5 mr-1 fill-current" /> お気に入り
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details & Links */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-text-muted mb-1">クライアント</p>
                  <p className="font-bold">A社</p>
                </div>
                <div>
                  <p className="text-text-muted mb-1">納期</p>
                  <p className="font-bold">2026-09-30</p>
                </div>
                <div className="col-span-2">
                  <p className="text-text-muted mb-1">進捗状況 (75%)</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div className="bg-primary h-2.5 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" /> 連携リソース
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <a href="#" className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50 font-bold text-sm text-[#4A154B]">
                  <MessageCircle className="h-4 w-4" /> Slackチャンネル (#pj-a-autumn)
                </a>
                <a href="#" className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50 font-bold text-sm text-blue-600">
                  <FileText className="h-4 w-4" /> NotePM マニュアル
                </a>
                <a href="#" className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50 font-bold text-sm text-green-600">
                  <FolderKanban className="h-4 w-4" /> Google Drive フォルダ
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Timeline */}
        <div className="space-y-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" /> タイムライン
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative border-l-2 border-gray-100 ml-3 space-y-6 pb-4">
                <div className="relative pl-6">
                  <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1.5 ring-4 ring-white"></div>
                  <p className="text-xs text-text-muted mb-1">今日 10:30</p>
                  <p className="text-sm font-bold">Slack連携</p>
                  <p className="text-sm bg-gray-50 p-2 rounded mt-1 border">@NAC太郎 が「デザイン案を格納しました」と投稿しました。</p>
                </div>
                <div className="relative pl-6">
                  <div className="absolute w-3 h-3 bg-orange-500 rounded-full -left-[7px] top-1.5 ring-4 ring-white"></div>
                  <p className="text-xs text-text-muted mb-1">昨日 18:00</p>
                  <p className="text-sm font-bold">進捗更新</p>
                  <p className="text-sm text-gray-600 mt-1">進捗が 50% から 75% に変更されました。</p>
                </div>
                <div className="relative pl-6">
                  <div className="absolute w-3 h-3 bg-gray-300 rounded-full -left-[7px] top-1.5 ring-4 ring-white"></div>
                  <p className="text-xs text-text-muted mb-1">3日前</p>
                  <p className="text-sm font-bold">案件作成</p>
                  <p className="text-sm text-gray-600 mt-1">案件が新規作成されました。</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
