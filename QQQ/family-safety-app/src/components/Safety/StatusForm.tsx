"use client";

import { useState } from "react";
import { CheckCircle, AlertTriangle, HelpCircle, Send, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/Auth/AuthProvider";
import { useGeolocation } from "react-use";

export function StatusForm() {
    const { user } = useAuth();
    const [status, setStatus] = useState<"safe" | "danger" | "unknown">("safe");
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Get current location when submitting
    const currentLocation = useGeolocation({ enableHighAccuracy: true });

    // Handle DevMode
    const isDevMode = typeof window !== 'undefined' && localStorage.getItem('dev_mock_session') === 'true';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            setFeedback({ text: 'ログインが必要です', type: 'error' });
            return;
        }

        setIsSubmitting(true);
        setFeedback(null);

        // --- DEV MODE BYPASS ---
        if (isDevMode) {
            setTimeout(() => {
                // Save mock data so useFamilyLocation can read it
                localStorage.setItem('dev_mock_status', status);
                localStorage.setItem('dev_mock_message', message);
                localStorage.setItem('dev_mock_updated_at', Date.now().toString());

                setFeedback({ text: `[DevMode] ステータスを更新しました！`, type: 'success' });
                setMessage("");
                setIsSubmitting(false);
                // We will mock firing an event so other components know data "changed"
                window.dispatchEvent(new Event('dev_mock_status_update'));
            }, 800);
            return;
        }
        // ------------------------

        try {
            const { error } = await supabase
                .from('safety_status')
                .upsert({
                    user_id: user.id,
                    status: status,
                    message: message || null,
                    latitude: currentLocation.latitude || null,
                    longitude: currentLocation.longitude || null,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) throw error;

            setFeedback({ text: '安否状況を大切な人に共有しました！', type: 'success' });
            setTimeout(() => setFeedback(null), 3000);
            setMessage(""); // Clear message after success
        } catch (err: unknown) {
            console.error('Error saving status:', err);
            setFeedback({ text: '送信に失敗しました。時間をおいて再試行してください。', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
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
                    placeholder="今の状況や、これから向かう場所を入力... (任意)"
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm min-h-[100px]"
                />

                {feedback && (
                    <div className={`p-3 rounded-lg text-sm ${feedback.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {feedback.text}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting || !user}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    {isSubmitting ? '送信中...' : '状況を送信'}
                </button>
            </form>
        </div>
    );
}
