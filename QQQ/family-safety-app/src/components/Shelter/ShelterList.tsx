import { Shelter } from '@/types/shelter';
import { MapPin, Map, Trash2, Home as HomeIcon } from 'lucide-react';

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
                                    <h3 className="font-bold text-lg text-slate-800 group-hover:text-cyan-700 transition-colors">{shelter.name}</h3>
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
