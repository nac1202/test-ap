import { useState } from 'react';
import { Shelter } from '@/types/shelter';
import { Save } from 'lucide-react';

interface ShelterFormProps {
    onSubmit: (data: Omit<Shelter, 'id' | 'createdAt'>) => void;
    onCancel: () => void;
}

export function ShelterForm({ onSubmit, onCancel }: ShelterFormProps) {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [note, setNote] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !address.trim()) return;

        onSubmit({
            name,
            address,
            note
        });

        // Reset form
        setName('');
        setAddress('');
        setNote('');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div>
                <label htmlFor="name" className="block text-sm font-bold text-slate-700 mb-1.5">
                    避難所名 <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all placeholder:text-slate-400"
                    placeholder="例: 市民体育館"
                    required
                />
            </div>

            <div>
                <label htmlFor="address" className="block text-sm font-bold text-slate-700 mb-1.5">
                    住所
                </label>
                <input
                    type="text"
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all placeholder:text-slate-400"
                    placeholder="例: 東京都新宿区..."
                />
            </div>

            <div>
                <label htmlFor="note" className="block text-sm font-bold text-slate-700 mb-1.5">
                    メモ
                </label>
                <textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all min-h-[100px] placeholder:text-slate-400"
                    placeholder="家族の集合場所, 備蓄あり, など"
                />
            </div>

            <div className="flex justify-end gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-5 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors font-bold text-sm"
                >
                    キャンセル
                </button>
                <button
                    type="submit"
                    className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all font-bold text-sm flex items-center"
                >
                    <Save className="w-4 h-4 mr-2" />
                    保存する
                </button>
            </div>
        </form>
    );
}
