import Link from "next/link";
import { Map, BookOpen, ShieldCheck, AlertTriangle, Building, MessageSquare, ChevronRight } from "lucide-react";
import { DisasterAlertBanner } from "@/components/Safety/DisasterAlertBanner";

export default function Home() {
  return (
    <div className="pb-8 pt-6 space-y-6">
      {/* Realtime Disaster Alerts Banner */}
      <div className="mb-2">
        <DisasterAlertBanner />
      </div>

      <div className="px-5 grid grid-cols-1 gap-4">
        <Link
          href="/safety"
          className="group flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-brand-primary/20 dark:border-slate-700/50 border-l-4 border-l-brand-primary rounded-md shadow-sm hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center">
            <div className="mr-4 p-2 bg-brand-light dark:bg-brand-primary/20 rounded-full group-hover:bg-brand-light-hover transition-colors">
              <ShieldCheck className="w-6 h-6 text-brand-primary stroke-[2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-brand-primary transition-colors">安否報告</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">現在の状況を大切な人に知らせる</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-brand-primary opacity-70 group-hover:opacity-100 transition-opacity" />
        </Link>

        <Link
          href="/timeline"
          className="group flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-brand-primary/20 dark:border-slate-700/50 border-l-4 border-l-brand-primary rounded-md shadow-sm hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center">
            <div className="mr-4 p-2 bg-brand-light dark:bg-brand-primary/20 rounded-full group-hover:bg-brand-light-hover transition-colors">
              <MessageSquare className="w-6 h-6 text-brand-primary stroke-[2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-brand-primary transition-colors">タイムライン</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">家族間でメッセージや状況を共有する</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-brand-primary opacity-70 group-hover:opacity-100 transition-opacity" />
        </Link>

        <Link
          href="/map"
          className="group flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-brand-primary/20 dark:border-slate-700/50 border-l-4 border-l-brand-primary rounded-md shadow-sm hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center">
            <div className="mr-4 p-2 bg-brand-light dark:bg-brand-primary/20 rounded-full group-hover:bg-brand-light-hover transition-colors">
              <Map className="w-6 h-6 text-brand-primary stroke-[2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-brand-primary transition-colors">共有マップ</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">大切な人の居場所を確認する</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-brand-primary opacity-70 group-hover:opacity-100 transition-opacity" />
        </Link>

        <Link
          href="/shelter"
          className="group flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-brand-primary/20 dark:border-slate-700/50 border-l-4 border-l-brand-primary rounded-md shadow-sm hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center">
            <div className="mr-4 p-2 bg-brand-light dark:bg-brand-primary/20 rounded-full group-hover:bg-brand-light-hover transition-colors">
              <Building className="w-6 h-6 text-brand-primary stroke-[2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-brand-primary transition-colors">避難所リスト</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">近くの避難場所を登録・確認</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-brand-primary opacity-70 group-hover:opacity-100 transition-opacity" />
        </Link>

        <Link
          href="/guide"
          className="group flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-brand-primary/20 dark:border-slate-700/50 border-l-4 border-l-brand-primary rounded-md shadow-sm hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center">
            <div className="mr-4 p-2 bg-brand-light dark:bg-brand-primary/20 rounded-full group-hover:bg-brand-light-hover transition-colors">
              <BookOpen className="w-6 h-6 text-brand-primary stroke-[2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-brand-primary transition-colors">あんしんガイド</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">防災・防犯・救護の知識</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-brand-primary opacity-70 group-hover:opacity-100 transition-opacity" />
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
