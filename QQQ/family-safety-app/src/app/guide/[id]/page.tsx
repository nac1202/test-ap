import ReactMarkdown from "react-markdown";
import Image from "next/image";
import guides from "@/data/disaster_guide.json";
import { GuideItem } from "@/types/guide";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Validate data type
const guideData = guides as GuideItem[];

interface PageProps {
    params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
    return guideData.map((guide) => ({
        id: guide.id,
    }));
}

export default async function GuideDetailPage({ params }: PageProps) {
    const { id } = await params;
    const guide = guideData.find((g) => g.id === id);

    if (!guide) {
        return (
            <div className="p-4 text-center">
                <p>記事が見つかりませんでした。</p>
                <Link href="/guide" className="text-blue-500 mt-4 inline-block">
                    一覧に戻る
                </Link>
            </div>
        );
    }

    const backLink = ['defense', 'security', 'fraud', 'cyber'].includes(guide.category) ? '/security' :
        ['firstaid', 'heatstroke'].includes(guide.category) ? '/firstaid' :
            '/guide';

    return (
        <div className="p-4 max-w-2xl mx-auto pb-24">
            <Link href={backLink} className="flex items-center text-gray-500 dark:text-gray-400 mb-4 hover:text-gray-900 dark:hover:text-gray-100">
                <ArrowLeft className="w-4 h-4 mr-1" />
                一覧に戻る
            </Link>

            <article className="prose prose-blue dark:prose-invert max-w-none">
                {guide.imageUrl && (
                    <div className="relative w-full h-64 mb-6 rounded-xl overflow-hidden shadow-sm">
                        <Image
                            src={guide.imageUrl}
                            alt={guide.title}
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                )}
                <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">{guide.title}</h1>
                <div className="text-sm text-gray-400 dark:text-gray-400 mb-6 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded textxs font-bold ${guide.category === 'defense' ? 'bg-purple-100 text-purple-700' :
                        ['firstaid', 'heatstroke'].includes(guide.category) ? 'bg-red-100 text-red-700' :
                            ['security', 'fraud', 'cyber'].includes(guide.category) ? 'bg-indigo-100 text-indigo-700' :
                                'bg-gray-100 text-gray-700'
                        }`}>
                        {
                            guide.category === 'defense' ? '護身' :
                                ['firstaid', 'heatstroke'].includes(guide.category) ? '救護' :
                                    ['security', 'fraud', 'cyber'].includes(guide.category) ? '防犯' :
                                        '防災'
                        }
                    </span>
                    <span>更新: {guide.updatedAt}</span>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                    <ReactMarkdown>{guide.content}</ReactMarkdown>
                </div>
            </article>
        </div>
    );
}
