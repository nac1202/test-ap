import { Shelter } from '@/types/shelter';
import { MapPin, Map, Trash2, Home as HomeIcon, Circle, X, Building, Tent } from 'lucide-react';

interface ShelterListProps {
    shelters: Shelter[];
    onRemove: (id: string) => void;
}

export function ShelterList({ shelters, onRemove }: ShelterListProps) {
    return (
        <div className="space-y-4">
            {shelters.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-xl shadow-sm border border-slate-100">
                    <div className="bg-cyan-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <HomeIcon className="w-8 h-8 text-cyan-500" />
                    </div>
                    <p className="text-slate-500 mb-2 font-medium">登録された避難所はありません</p>
                    <p className="text-xs text-slate-400">
                        「避難所を登録」または「避難所を探す」から<br />
                        自宅や職場の近くの避難所を登録しましょう
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {shelters.map((shelter) => (
                        <div key={shelter.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-cyan-200 transition-all group">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-lg text-slate-800 group-hover:text-cyan-700 transition-colors">{shelter.name}</h3>
                                        {/* 
                                        shelter.facilityType === 'indoor' && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                                                <Building className="w-3 h-3 mr-1" />
                                                屋内
                                            </span>
                                        )
                                        */}
                                        {/* 
                                        shelter.facilityType === 'outdoor' && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
                                                <Tent className="w-3 h-3 mr-1" />
                                                屋外
                                            </span>
                                        )
                                        */}
                                    </div>
                                    <div className="flex items-center text-slate-500 text-sm mt-1">
                                        <MapPin className="w-4 h-4 mr-1 text-slate-400" />
                                        <span>{shelter.address}</span>
                                    </div>
                                </div>
                                <div className="bg-cyan-50 p-2 rounded-lg">
                                    <HomeIcon className="w-5 h-5 text-cyan-600" />
                                </div>
                            </div>

                            {shelter.note && (
                                <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-700 mb-4 flex items-start">
                                    <span className="font-bold mr-2 text-xs uppercase tracking-wider bg-amber-100 px-1.5 py-0.5 rounded text-amber-800">Note</span>
                                    {shelter.note}
                                </div>
                            )}

                            {shelter.supportedDisasters && shelter.supportedDisasters.length > 0 && (
                                <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100/60">
                                    <p className="text-xs text-slate-500 font-bold mb-2.5">目的: 指定緊急避難場所</p>
                                    <div className="grid grid-cols-3 gap-y-2.5 gap-x-1">
                                        {[
                                            { id: 'earthquake', label: '地震' },
                                            { id: 'flood', label: '洪水' },
                                            { id: 'inland_flood', label: '内水氾濫' },
                                            { id: 'tsunami', label: '津波' },
                                            { id: 'landslide', label: '土砂災害' },
                                            { id: 'volcano', label: '噴火' },
                                            { id: 'storm_surge', label: '高潮' },
                                            { id: 'fire', label: '火災' },
                                            { id: 'other', label: 'その他' }
                                        ].map(dt => {
                                            const isSupported = shelter.supportedDisasters!.includes(dt.id);
                                            return (
                                                <div key={dt.id} className="flex items-center gap-1.5">
                                                    {isSupported ? (
                                                        <Circle className="w-4 h-4 text-teal-500 shrink-0 stroke-[2.5]" />
                                                    ) : (
                                                        <X className="w-4 h-4 text-slate-300 shrink-0 stroke-[2.5]" />
                                                    )}
                                                    <span className={`text-[11px] sm:text-xs font-bold leading-none ${isSupported ? 'text-slate-800' : 'text-slate-400'}`}>
                                                        {dt.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2 border-t border-slate-50">
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shelter.name + " " + shelter.address)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-bold text-cyan-600 flex items-center hover:bg-cyan-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-cyan-100"
                                >
                                    <Map className="w-4 h-4 mr-1.5" />
                                    地図で見る
                                </a>
                                <button
                                    onClick={() => onRemove(shelter.id)}
                                    className="text-sm text-rose-500 flex items-center hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors font-medium border border-transparent hover:border-rose-100"
                                >
                                    <Trash2 className="w-4 h-4 mr-1.5" />
                                    削除
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
