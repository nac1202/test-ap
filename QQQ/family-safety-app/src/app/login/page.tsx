'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LogIn, Mail, Lock } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        let error;

        // --- DEV MODE BYPASS ---
        // To bypass Supabase's strict email rate limits during local testing
        if (email === 'demo@kizuna.com' && password === 'demo2026') {
            // Simulate a successful login 
            localStorage.setItem('dev_mock_session', 'true');
            setMessage({ text: 'テスト用アカウントでログインしました！', type: 'success' });

            // Dispatch a custom event to force AuthProvider to reload
            window.dispatchEvent(new Event('dev_mock_login'));

            // Wait a moment then redirect
            setTimeout(() => {
                window.location.href = '/profile';
            }, 1000);
            setLoading(false);
            return;
        }
        // ------------------------

        if (isSignUp) {
            const res = await supabase.auth.signUp({
                email,
                password,
            });
            error = res.error;
            if (!error && res.data?.user) {
                if (res.data.session) {
                    setMessage({ text: 'アカウントを作成してログインしました！', type: 'success' });
                    setTimeout(() => {
                        window.location.href = '/profile';
                    }, 1000);
                } else {
                    setMessage({ text: '確認メールを送信しました！メール内のリンクをクリックして本登録を完了してください。', type: 'success' });
                }
            }
        } else {
            const res = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            error = res.error;
            if (!error) {
                setMessage({ text: 'ログインしました！', type: 'success' });
                setTimeout(() => {
                    window.location.href = '/profile';
                }, 1000);
            }
        }

        if (error) {
            setMessage({ text: error.message, type: 'error' });
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center text-teal-600 mb-4">
                    <LogIn size={48} />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Kizuna Safety にログイン
                </h2>
                <div className="text-center text-slate-500 text-sm mt-8 pb-8">
                    グループ機能を利用するにはログインが必要です
                </div>

                {/* Dev mode hint */}
                <div className="mt-4 p-4 bg-teal-50 text-teal-800 text-sm rounded-lg border border-teal-200 text-center">
                    <p className="font-bold mb-2 text-base">商談デモ用（ワンタップで開始）</p>
                    <button
                        type="button"
                        onClick={() => {
                            localStorage.setItem('dev_mock_session', 'true');
                            window.dispatchEvent(new Event('dev_mock_login'));
                            window.location.href = '/profile';
                        }}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-md text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 transition-all active:scale-95"
                    >
                        デモ環境にログインする
                    </button>
                    <p className="text-xs mt-3 opacity-90 font-medium">※パスワード警告が出ないように、入力なしで安全にデモに入れます</p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200 relative overflow-hidden">
                    {/* デモ版の制限オーバーレイ（半透明） */}
                    <div className="absolute inset-0 bg-white/60 z-10 flex flex-col items-center justify-center backdrop-blur-[1px]">
                        <div className="bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg">
                            デモ版のため一般ログインは制限されています
                        </div>
                    </div>

                    <form className="space-y-6 opacity-50" onSubmit={(e) => e.preventDefault()}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                メールアドレス
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <input
                                    id="email"
                                    type="email"
                                    disabled
                                    className="block w-full sm:text-sm border-gray-300 rounded-md py-3 border bg-gray-50"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                パスワード
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <input
                                    id="password"
                                    type="password"
                                    disabled
                                    className="block w-full sm:text-sm border-gray-300 rounded-md py-3 border bg-gray-50"
                                    placeholder="6文字以上"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="button"
                                disabled
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-400 cursor-not-allowed"
                            >
                                ログイン
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
