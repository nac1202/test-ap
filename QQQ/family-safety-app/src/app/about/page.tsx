'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, Map, Navigation, MessageSquare, BookOpen, ChevronRight, Home, Building, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const features = [
    {
        id: 'home',
        title: 'ホーム画面',
        description: 'すべての機能にすばやくアクセスできる直感的なダッシュボード。緊急時でも迷わず必要な機能を開くことができます。',
        icon: Home,
        image: '/images/feature-home.jpg',
        color: 'from-blue-500 to-cyan-400'
    },
    {
        id: 'safety',
        title: '安否報告 (Safety Status)',
        description: '「無事」や「SOS」をワンタップで送信。家族のスマホにプッシュ通知が届き、瞬時に状況を共有できます。',
        icon: ShieldCheck,
        image: '/images/feature-safety.jpg',
        color: 'from-emerald-500 to-teal-400'
    },
    {
        id: 'timeline',
        title: '連絡タイムライン',
        description: '家族間のメッセージのやり取りや、全体への被害状況の報告など、リアルタイムな情報共有を可能にします。',
        icon: MessageSquare,
        image: '/images/feature-timeline.jpg',
        color: 'from-amber-500 to-orange-400'
    },
    {
        id: 'map',
        title: '共有マップ (Shared Map)',
        description: '大切な人の現在地と、周辺のハザードマップや避難所情報を一つの地図上に重ねて表示します。',
        icon: Map,
        image: '/images/feature-map.jpg',
        color: 'from-indigo-500 to-blue-500'
    },
    {
        id: 'hazard',
        title: 'ハザード表示',
        description: '現在地や自宅周辺の土砂災害・洪水などの危険エリア（ハザードマップ）を地図上で直感的に確認できます。',
        icon: AlertTriangle,
        image: '/images/feature-hazard.jpg',
        color: 'from-orange-500 to-red-400'
    },
    {
        id: 'radar',
        title: 'オフラインレーダー',
        description: '電波が繋がらない状況でも、デバイスのコンパス機能を使って家族のいる方向と距離を特定します。',
        icon: Navigation,
        image: '/images/feature-radar.jpg',
        color: 'from-purple-500 to-indigo-500'
    },
    {
        id: 'shelter',
        title: '避難所リスト',
        description: '現在地周辺の避難所をすばやく検索・確認。いざという時の避難先を事前に把握できます。',
        icon: Building,
        image: '/images/feature-shelter.jpg',
        color: 'from-sky-500 to-cyan-400'
    },
    {
        id: 'guide',
        title: '防災ガイド',
        description: 'いざという時に役立つ防災マニュアル。一度読み込んでおけば、オフライン時でも確認可能です。',
        icon: BookOpen,
        image: '/images/feature-guide.jpg',
        color: 'from-rose-500 to-pink-500'
    },
    {
        id: 'eew-alert',
        title: '緊急地震警報（速報）',
        description: '強い揺れが予想される際に、画面全体を赤くして直感的にお知らせします。いざという時に素早く安全を確保するための機能です。',
        icon: AlertTriangle,
        image: '/images/feature-eew-alert.jpg',
        color: 'from-red-500 to-rose-500'
    },
    {
        id: 'eew-test',
        title: '警報テスト機能',
        description: '「設定 ＞ 通知設定」から、実際の警報画面がどのように表示されるか事前にテスト実行して確認することができます。',
        icon: ShieldCheck,
        image: '/images/feature-eew-test.jpg',
        color: 'from-orange-500 to-amber-500'
    }
];

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 overflow-x-hidden">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-brand-header-from to-brand-header-to dark:from-slate-800 dark:to-slate-900 text-white pt-8 pb-8 px-4">

                <div className="max-w-3xl mx-auto text-center relative z-10">
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-4 tracking-tight drop-shadow-md"
                    >
                        Kizuna Safety へようこそ
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-white text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-loose font-medium drop-shadow-sm"
                    >
                        大切な人との「キズナ」をつなぐ<br />
                        次世代の防災・安否確認アプリ<br />
                        いざという時に本当に役立つ機能をご紹介します
                    </motion.p>
                </div>
            </div>

            {/* Features List */}
            <div className="relative z-20 max-w-4xl mx-auto px-4 mt-8 space-y-16">
                {features.map((feature, index) => (
                    <motion.div
                        key={feature.id}
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.5 }}
                        className={`flex flex-col ${index % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8`}
                    >
                        {/* Text Content */}
                        <div className="flex-1 space-y-4">
                            <div className={`inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br ${feature.color} text-white shadow-lg`}>
                                <feature.icon className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                {feature.title}
                            </h2>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg">
                                {feature.description}
                            </p>
                        </div>

                        {/* Image Mockup */}
                        <div className="flex-1 w-full max-w-sm relative flex justify-center">
                            {/* Device Frame */}
                            <div className="relative border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-[1.5rem] w-[260px] sm:w-[300px] shadow-2xl overflow-hidden">
                                {/* Screen content */}
                                <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img 
                                        src={feature.image} 
                                        alt={feature.title} 
                                        className="w-full h-auto object-contain"
                                        onError={(e) => {
                                            // プレースホルダー画像に切り替え
                                            e.currentTarget.src = `https://placehold.co/400x800/e2e8f0/475569?text=${encodeURIComponent(feature.title)}`;
                                        }}
                                    />
                                </div>
                            </div>
                            {/* Decorative background blob */}
                            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-br ${feature.color} opacity-20 blur-[60px] -z-10 rounded-full`} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Bottom CTA */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="max-w-3xl mx-auto text-center mt-24 px-4 pb-12"
            >
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 sm:p-12 border border-slate-100 dark:border-slate-700">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                        さっそく使ってみましょう
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 mb-8">
                        Kizuna Safety のすべての機能は、直感的に操作できるように設計されています。
                    </p>
                    <Link 
                        href="/"
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-header-from to-brand-header-to text-white px-8 py-4 rounded-full font-bold shadow-lg shadow-teal-500/30 hover:scale-105 transition-transform"
                    >
                        ホーム画面へ戻る
                        <ChevronRight className="w-5 h-5" />
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
