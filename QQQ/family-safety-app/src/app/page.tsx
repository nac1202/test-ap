import Link from "next/link";
import { Map, BookOpen, ShieldCheck, AlertTriangle, Home as HomeIcon } from "lucide-react";
import { DisasterAlertBanner } from "@/components/Safety/DisasterAlertBanner";

export default function Home() {
  return (
    <div className="pb-8 space-y-6">
      <section className="bg-gradient-to-br from-cyan-600 via-cyan-500 to-blue-600 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 text-white px-6 pt-8 pb-12 rounded-b-[2.5rem] shadow-[0_10px_30px_rgba(8,145,178,0.2)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] -mt-4 mb-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400/40 rounded-full mix-blend-overlay filter blur-3xl opacity-60 -translate-y-1/2 translate-x-1/2 animate-pulse"></div>
        <div className="absolute top-0 left-0 w-48 h-48 bg-blue-400/40 rounded-full mix-blend-overlay filter blur-3xl opacity-50 -translate-x-1/2 -translate-y-1/4"></div>

        <div className="relative z-10 text-center">
          <h1 className="text-3xl font-extrabold mb-2 tracking-tight drop-shadow-sm">Kizuna Safety</h1>
          <p className="text-cyan-50 dark:text-slate-300 text-sm font-medium opacity-90">
            キズナをつなぐ、<br />防災・安否確認アプリ
          </p>
        </div>
      </section>

      {/* Realtime Disaster Alerts Banner */}
      <div className="-mt-6 mb-2">
        <DisasterAlertBanner />
      </div>

      <div className="px-5 grid grid-cols-1 gap-4">
        <Link
          href="/safety"
          className="group flex items-center p-5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-red-50/80 dark:border-slate-700/50 rounded-2xl shadow-[0_8px_24px_rgba(239,68,68,0.12)] hover:shadow-[0_12px_32px_rgba(239,68,68,0.24)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_12px_32px_rgba(0,0,0,0.3)] transition-all duration-300 transform hover:-translate-y-1 active:scale-95"
        >
          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/40 dark:to-red-800/40 p-3.5 rounded-2xl mr-4 group-hover:from-red-100 group-hover:to-red-200 transition-colors shadow-inner">
            <ShieldCheck className="w-8 h-8 text-red-500 dark:text-red-400 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">安否報告</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">現在の状況を大切な人に知らせる</p>
          </div>
        </Link>

        <Link
          href="/map"
          className="group flex items-center p-5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-cyan-50/80 dark:border-slate-700/50 rounded-2xl shadow-[0_8px_24px_rgba(6,182,212,0.12)] hover:shadow-[0_12px_32px_rgba(6,182,212,0.24)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_12px_32px_rgba(0,0,0,0.3)] transition-all duration-300 transform hover:-translate-y-1 active:scale-95"
        >
          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/40 dark:to-cyan-800/40 p-3.5 rounded-2xl mr-4 group-hover:from-cyan-100 group-hover:to-cyan-200 transition-colors shadow-inner">
            <Map className="w-8 h-8 text-cyan-500 dark:text-cyan-400 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">共有マップ</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">大切な人の居場所を確認する</p>
          </div>
        </Link>

        <Link
          href="/shelter"
          className="group flex items-center p-5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-orange-50/80 dark:border-slate-700/50 rounded-2xl shadow-[0_8px_24px_rgba(249,115,22,0.12)] hover:shadow-[0_12px_32px_rgba(249,115,22,0.24)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_12px_32px_rgba(0,0,0,0.3)] transition-all duration-300 transform hover:-translate-y-1 active:scale-95"
        >
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/40 p-3.5 rounded-2xl mr-4 group-hover:from-orange-100 group-hover:to-orange-200 transition-colors shadow-inner">
            <HomeIcon className="w-8 h-8 text-orange-500 dark:text-orange-400 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">避難所リスト</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">近くの避難場所を登録・確認</p>
          </div>
        </Link>

        <Link
          href="/guide"
          className="group flex items-center p-5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-green-50/80 dark:border-slate-700/50 rounded-2xl shadow-[0_8px_24px_rgba(34,197,94,0.12)] hover:shadow-[0_12px_32px_rgba(34,197,94,0.24)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_12px_32px_rgba(0,0,0,0.3)] transition-all duration-300 transform hover:-translate-y-1 active:scale-95"
        >
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/40 p-3.5 rounded-2xl mr-4 group-hover:from-green-100 group-hover:to-green-200 transition-colors shadow-inner">
            <BookOpen className="w-8 h-8 text-green-500 dark:text-green-400 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">あんしんガイド</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">防災・防犯・救護の知識</p>
          </div>
        </Link>
      </div>

      <div className="px-5">
        <section className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-orange-900/10 p-4 rounded-xl border border-amber-200/60 dark:border-amber-700/30 flex items-start shadow-[0_4px_12px_rgba(245,158,11,0.06)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.2)] backdrop-blur-sm">
          <AlertTriangle className="w-5 h-5 text-amber-500 mr-3 flex-shrink-0 mt-0.5 drop-shadow-sm" />
          <div>
            <h3 className="font-bold text-amber-800 dark:text-amber-500 text-sm">災害時の注意</h3>
            <p className="text-xs text-amber-700/90 dark:text-amber-200/80 mt-1 leading-relaxed">
              災害発生時は通信が不安定になることがあります。このアプリは主要な情報をオフラインでも閲覧できるように保存します。
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
