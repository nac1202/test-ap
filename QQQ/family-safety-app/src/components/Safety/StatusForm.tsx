"use client";

import { useState } from "react";
import { CheckCircle, AlertTriangle, HelpCircle, Send } from "lucide-react";

export function StatusForm() {
    const [status, setStatus] = useState<"safe" | "danger" | "unknown">("safe");
    const [message, setMessage] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Send to backend
        alert(`ステータス: ${status}\nメッセージ: ${message}\nを送信しました`);
        setMessage("");
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold mb-4 text-slate-800">安否報告</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                    <button
                        type="button"
                        onClick={() => setStatus("safe")}
                        className={`p-3 rounded-lg flex flex-col items-center justify-center border-2 transition-all ${status === "safe"
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-slate-200 hover:border-green-200 text-slate-500"
                            }`}
                    >
                        <CheckCircle className="w-6 h-6 mb-1" />
                        <span className="text-xs font-bold">無事</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatus("danger")}
                        className={`p-3 rounded-lg flex flex-col items-center justify-center border-2 transition-all ${status === "danger"
                            ? "border-red-500 bg-red-50 text-red-700"
                            : "border-slate-200 hover:border-red-200 text-slate-500"
                            }`}
                    >
                        <AlertTriangle className="w-6 h-6 mb-1" />
                        <span className="text-xs font-bold">SOS</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatus("unknown")}
                        className={`p-3 rounded-lg flex flex-col items-center justify-center border-2 transition-all ${status === "unknown"
                            ? "border-yellow-500 bg-yellow-50 text-yellow-700"
                            : "border-slate-200 hover:border-yellow-200 text-slate-500"
                            }`}
                    >
                        <HelpCircle className="w-6 h-6 mb-1" />
                        <span className="text-xs font-bold">不明・移動中</span>
                    </button>
                </div>

                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="今の状況や、これから向かう場所を入力..."
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm min-h-[100px]"
                />

                <button
                    type="submit"
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                    <Send className="w-4 h-4" />
                    状況を送信
                </button>
            </form>
        </div>
    );
}
