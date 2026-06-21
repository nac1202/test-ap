import Link from "next/link";
import { GuideItem } from "@/types/guide";
import { ShieldAlert, Umbrella, Activity, HeartPulse, Shield, Flame, Sun, Snowflake, Mountain, Rocket, PhoneOff, Lock, UserX, Car } from "lucide-react";
import Image from "next/image";

interface GuideListProps {
    guides: GuideItem[];
    searchQuery?: string;
}

const categoryIcons = {
    earthquake: ShieldAlert,
    typhoon: Umbrella,
    tsunami: Activity,
    firstaid: HeartPulse,
    fire: Flame,
    heatstroke: Sun,
    snow: Snowflake,
    volcano: Mountain,
    missile: Rocket,
    security: Shield,
    fraud: PhoneOff,
    cyber: Lock,
    defense: UserX,
    car: Car,
};

export function GuideList({ guides, searchQuery = "" }: GuideListProps) {
    const filteredGuides = guides.filter(guide => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            guide.title.toLowerCase().includes(query) ||
            guide.description.toLowerCase().includes(query) ||
            guide.category.toLowerCase().includes(query)
        );
    });

    return (
        <div className="space-y-4">
            {filteredGuides.map((guide) => {
                const Icon = categoryIcons[guide.category] || ShieldAlert;
                return (
                    <Link
                        key={guide.id}
                        href={`/guide/${guide.id}`}
                        className="group block bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-100 dark:border-slate-700 overflow-hidden transform hover:-translate-y-0.5"
                    >
                        {guide.imageUrl && (
                            <div className="relative w-full h-36 bg-slate-100">
                                <Image
                                    src={guide.imageUrl}
                                    alt={guide.title}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        )}
                        <div className="p-5 flex items-start gap-4">
                            <div className={`p-3 rounded-2xl shrink-0 transition-colors ${['earthquake', 'volcano', 'fire'].includes(guide.category) ? 'bg-orange-50 text-orange-600 group-hover:bg-orange-100' :
                                ['typhoon', 'tsunami', 'snow'].includes(guide.category) ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-100' :
                                    ['firstaid', 'heatstroke'].includes(guide.category) ? 'bg-rose-50 text-rose-600 group-hover:bg-rose-100' :
                                        ['defense'].includes(guide.category) ? 'bg-purple-50 text-purple-600 group-hover:bg-purple-100' :
                                            ['security', 'fraud', 'cyber'].includes(guide.category) ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100' :
                                                ['car'].includes(guide.category) ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' :
                                                    ['missile'].includes(guide.category) ? 'bg-slate-800 text-yellow-400' :
                                                        'bg-cyan-50 text-cyan-600'
                                }`}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wide ${guide.category === 'defense' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                        ['firstaid', 'heatstroke'].includes(guide.category) ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                            ['security', 'fraud', 'cyber'].includes(guide.category) ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                                                ['car'].includes(guide.category) ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                    ['earthquake', 'volcano', 'fire'].includes(guide.category) ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                                                    ['typhoon', 'tsunami', 'snow'].includes(guide.category) ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                                        'bg-cyan-50 text-cyan-600 border border-cyan-100'
                                        }`}>
                                        {
                                            guide.category === 'defense' ? '護身' :
                                                ['firstaid', 'heatstroke'].includes(guide.category) ? '救護' :
                                                    ['security', 'fraud', 'cyber'].includes(guide.category) ? '防犯' :
                                                        ['car'].includes(guide.category) ? '運転・車' :
                                                            '防災'
                                        }
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">{guide.updatedAt}</span>
                                </div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight mb-1 group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition-colors">{guide.title}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                    {guide.description}
                                </p>
                            </div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
