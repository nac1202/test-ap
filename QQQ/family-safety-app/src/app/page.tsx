import Link from "next/link";
import { Map, BookOpen, ShieldCheck, AlertTriangle, Home as HomeIcon } from "lucide-react";

export default function Home() {
  return (
    <div className="pb-8 space-y-6">
      <section className="bg-cyan-600 text-white px-6 pt-8 pb-12 rounded-b-[2.5rem] shadow-md -mx-4 -mt-4 mb-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute top-0 left-0 w-48 h-48 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/4"></div>

        <div className="relative z-10 text-center">
          <h1 className="text-3xl font-bold mb-2 tracking-tight">Kizuna Safety</h1>
          <p className="text-cyan-50 text-sm font-medium">
            キズナをつなぐ、<br />防災・安否確認アプリ
          </p>
        </div>
      </section>

      <div className="px-5 grid grid-cols-1 gap-4">
        <Link
          href="/safety"
          className="group flex items-center p-5 bg-white border border-slate-100 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <div className="bg-red-50 p-3.5 rounded-2xl mr-4 group-hover:bg-red-100 transition-colors">
            <ShieldCheck className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 group-hover:text-red-600 transition-colors">安否報告</h2>
            <p className="text-xs text-slate-500 font-medium">現在の状況を大切な人に知らせる</p>
          </div>
        </Link>

        <Link
          href="/map"
          className="group flex items-center p-5 bg-white border border-slate-100 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <div className="bg-cyan-50 p-3.5 rounded-2xl mr-4 group-hover:bg-cyan-100 transition-colors">
            <Map className="w-8 h-8 text-cyan-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 group-hover:text-cyan-600 transition-colors">共有マップ</h2>
            <p className="text-xs text-slate-500 font-medium">大切の人居場所を確認する</p>
          </div>
        </Link>

        <Link
          href="/shelter"
          className="group flex items-center p-5 bg-white border border-slate-100 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <div className="bg-orange-50 p-3.5 rounded-2xl mr-4 group-hover:bg-orange-100 transition-colors">
            <HomeIcon className="w-8 h-8 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 group-hover:text-orange-600 transition-colors">避難所リスト</h2>
            <p className="text-xs text-slate-500 font-medium">近くの避難場所を登録・確認</p>
          </div>
        </Link>

        <Link
          href="/guide"
          className="group flex items-center p-5 bg-white border border-slate-100 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <div className="bg-green-50 p-3.5 rounded-2xl mr-4 group-hover:bg-green-100 transition-colors">
            <BookOpen className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 group-hover:text-green-600 transition-colors">あんしんガイド</h2>
            <p className="text-xs text-slate-500 font-medium">防災・防犯・救護の知識</p>
          </div>
        </Link>
      </div>

      <div className="px-5">
        <section className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start">
          <AlertTriangle className="w-5 h-5 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-800 text-sm">災害時の注意</h3>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              災害発生時は通信が不安定になることがあります。このアプリは主要な情報をオフラインでも閲覧できるように保存します。
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
