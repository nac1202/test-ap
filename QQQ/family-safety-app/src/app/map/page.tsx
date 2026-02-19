import { LocationMap } from "@/components/Map/LocationMap";

export default function MapPage() {
    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            <div className="p-4 bg-white border-b border-slate-200 z-10 sticky top-16">
                <h1 className="text-xl font-bold text-slate-800">家族マップ</h1>
                <p className="text-xs text-slate-500">
                    家族の最新位置情報を表示します。
                </p>
            </div>
            <div className="flex-1 p-2 relative">
                <LocationMap />
            </div>
        </div>
    );
}
