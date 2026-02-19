"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { ShelterForm } from "@/components/Shelter/ShelterForm";
import { ShelterList } from "@/components/Shelter/ShelterList";
import { NearbyShelters } from "@/components/Shelter/NearbyShelters";
import { useShelterList } from "@/hooks/useShelterList";

export default function ShelterPage() {
    const { shelters, addShelter, removeShelter } = useShelterList();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [showNearbySearch, setShowNearbySearch] = useState(false);

    return (
        <div className="p-4 pb-24 max-w-md mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">避難所リスト</h1>
                    <p className="text-sm text-slate-500">いざという時の避難場所</p>
                </div>
            </div>

            <div className="flex gap-4 mb-6">
                {!isFormOpen && !showNearbySearch && (
                    <>
                        <button
                            onClick={() => setShowNearbySearch(true)}
                            className="flex-1 bg-white border border-cyan-100 text-cyan-600 font-bold py-4 rounded-xl shadow-sm hover:bg-cyan-50 hover:shadow-md transition-all flex flex-col items-center justify-center gap-2"
                        >
                            <Search className="w-6 h-6" />
                            <span>避難所を探す</span>
                        </button>
                        <button
                            onClick={() => setIsFormOpen(true)}
                            className="flex-1 bg-cyan-600 text-white font-bold py-4 rounded-xl shadow-sm hover:bg-cyan-700 hover:shadow-md transition-all flex flex-col items-center justify-center gap-2"
                        >
                            <Plus className="w-6 h-6" />
                            <span>避難所を登録</span>
                        </button>
                    </>
                )}
                {(isFormOpen || showNearbySearch) && (
                    <button
                        onClick={() => {
                            setIsFormOpen(false);
                            setShowNearbySearch(false);
                        }}
                        className="text-slate-500 font-medium text-sm hover:text-slate-700 transition-colors ml-auto"
                    >
                        キャンセル
                    </button>
                )}
            </div>

            {showNearbySearch && (
                <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <h2 className="text-lg font-bold mb-2 text-slate-800">周辺の避難所を探す</h2>
                    <p className="text-xs text-slate-500 mb-4">現在地から半径3km以内の避難所候補（学校、公民館、公園など）を検索します。</p>
                    <NearbyShelters
                        onAdd={(data) => {
                            addShelter(data);
                            setShowNearbySearch(false);
                        }}
                    />
                </div>
            )}

            {isFormOpen ? (
                <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <h2 className="text-lg font-bold mb-4 text-slate-800">新しい避難所を登録</h2>
                    <ShelterForm
                        onSubmit={(data) => {
                            addShelter(data);
                            setIsFormOpen(false);
                        }}
                        onCancel={() => setIsFormOpen(false)}
                    />
                </div>
            ) : (
                !showNearbySearch && <ShelterList shelters={shelters} onRemove={removeShelter} />
            )}

            <div className="mt-8 p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800">
                <p>※登録した情報は、この端末（ブラウザ）にのみ保存されます。</p>
                <p className="mt-1">※災害時はネットがつながらない可能性があるため、事前に登録しておくことをおすすめします。</p>
            </div>
        </div>
    );
}
