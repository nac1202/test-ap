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
        if (email === 'test@test.com' && password === 'testtest') {
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
                setMessage({ text: 'アカウントを作成してログインしました！', type: 'success' });
            }
        } else {
            const res = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            error = res.error;
            if (!error) {
                setMessage({ text: 'ログインしました！', type: 'success' });
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
                <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-md border border-blue-200 text-center">
                    <p className="font-semibold">テスト用ログイン（制限回避用）</p>
                    <p>メール: test@test.com</p>
                    <p>パスワード: testtest</p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
                    <form className="space-y-6" onSubmit={handleAuth}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                メールアドレス
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-3 border"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                パスワード
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-3 border"
                                    placeholder="6文字以上"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        {message && (
                            <div
                                className={`p-4 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                                    }`}
                            >
                                {message.text}
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
                            >
                                {loading ? '処理中...' : (isSignUp ? 'アカウントを作成' : 'ログイン')}
                            </button>
                        </div>

                        <div className="mt-4 text-center">
                            <button
                                type="button"
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="text-sm text-teal-600 hover:text-teal-500"
                            >
                                {isSignUp
                                    ? 'すでにアカウントをお持ちの方はこちら (ログイン)'
                                    : '初めての方はこちら (アカウント作成)'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
