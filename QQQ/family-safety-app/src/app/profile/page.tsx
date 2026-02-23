'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/Auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { User as UserIcon, LogOut, Loader2, Save, Users } from 'lucide-react';
import Link from 'next/link';

export default function Profile() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [displayName, setDisplayName] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        } else if (user) {
            // --- DEV MODE BYPASS ---
            if (user.id === 'dev-mock-uuid-1234-5678') {
                // eslint-disable-next-line react-hooks/exhaustive-deps
                setDisplayName('テストユーザー (DevMode)');
                return;
            }
            // ------------------------

            // ユーザー情報の読み込み
            const loadProfile = async () => {
                const { data, error } = await supabase
                    .from('users')
                    .select('display_name')
                    .eq('id', user.id)
                    .single();

                if (data && data.display_name) {
                    setDisplayName(data.display_name);
                }
            };
            loadProfile();
        }
    }, [user, loading, router]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        setMessage(null);

        // --- DEV MODE BYPASS ---
        if (user.id === 'dev-mock-uuid-1234-5678') {
            setMessage({ text: 'プロフィールを保存しました。(DevMode モック)', type: 'success' });
            setSaving(false);
            return;
        }
        // ------------------------

        const { error } = await supabase
            .from('users')
            .upsert({
                id: user.id,
                display_name: displayName,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (error) {
            setMessage({ text: 'プロフィールの保存に失敗しました。', type: 'error' });
        } else {
            setMessage({ text: 'プロフィールを保存しました。', type: 'success' });
        }
        setSaving(false);
    };

    const handleSignOut = async () => {
        if (user?.id === 'dev-mock-uuid-1234-5678') {
            localStorage.removeItem('dev_mock_session');
            window.dispatchEvent(new Event('dev_mock_login')); // Force re-check
            router.push('/');
            return;
        }
        await supabase.auth.signOut();
        router.push('/');
    };

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            </div>
        );
    }

    if (!user) return null; // router.push handled in useEffect

    return (
        <div className="max-w-md mx-auto p-4 space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center">
                        <UserIcon size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">プロフィール</h1>
                        <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label htmlFor="displayName" className="block text-sm font-medium text-slate-700 mb-1">
                            表示名 (グループメンバーに公開されます)
                        </label>
                        <input
                            id="displayName"
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="例: パパ、おばあちゃん、太郎"
                            className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                            required
                        />
                    </div>

                    {message && (
                        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white py-2.5 rounded-lg font-medium hover:bg-teal-700 transition disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {saving ? '保存中...' : '保存する'}
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4">グループ管理</h2>
                <Link
                    href="/group"
                    className="w-full flex items-center justify-center gap-2 border border-teal-200 text-teal-700 bg-teal-50 py-2.5 rounded-lg font-medium hover:bg-teal-100 transition"
                >
                    <Users className="w-5 h-5" />
                    グループ設定を開く
                </Link>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4">アカウント設定</h2>
                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 bg-red-50 py-2.5 rounded-lg font-medium hover:bg-red-100 transition"
                >
                    <LogOut className="w-5 h-5" />
                    ログアウト
                </button>
            </div>
        </div>
    );
}
