import { StatusForm } from "@/components/Safety/StatusForm";

export default function SafetyPage() {
    return (
        <div className="p-4 max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">安否確認</h1>
            <p className="mb-4 text-slate-600">
                現在の状況を家族に共有しましょう。
            </p>

            <StatusForm />

            <div className="mt-8">
                <h2 className="text-lg font-bold mb-4 text-slate-800">家族のステータス</h2>
                <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-4">
                    <p className="text-center text-slate-500 py-4">
                        まだ家族のステータス情報はありません。
                    </p>
                    {/* TODO: Add list of family statuses */}
                </div>
            </div>
        </div>
    );
}
