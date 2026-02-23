'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

type AuthContextType = {
    user: User | null;
    session: Session | null;
    loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    const upsertUser = async (authUser: User) => {
        try {
            // ユーザーのプロファイルが作られているか確認、なければ作成
            await supabase.from('users').upsert({
                id: authUser.id,
                // Authから名前が取得できる場合は設定（例：Googleログイン時など）
                // Magic Linkの場合はあとからプロフィール設定画面で編集させる想定
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
        } catch (e) {
            console.error('Error upserting user profile:', e);
        }
    };

    useEffect(() => {
        // Session 取得
        const getSession = async () => {
            // --- DEV MODE BYPASS ---
            if (typeof window !== 'undefined' && localStorage.getItem('dev_mock_session') === 'true') {
                const mockUser = {
                    id: 'dev-mock-uuid-1234-5678',
                    email: 'test@test.com',
                    app_metadata: {},
                    user_metadata: {},
                    aud: 'authenticated',
                    created_at: new Date().toISOString(),
                } as User;

                setSession({ access_token: 'mock', refresh_token: 'mock', expires_in: 3600, token_type: 'bearer', user: mockUser });
                setUser(mockUser);
                setLoading(false);
                return;
            }
            // ------------------------

            const { data: { session }, error } = await supabase.auth.getSession();
            if (!error) {
                setSession(session);
                setUser(session?.user ?? null);
            }
            setLoading(false);
        };

        getSession();

        // Session 変更のリスナー設定
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                // If we are in dev mock mode, ignore real auth state changes that might reset it
                if (typeof window !== 'undefined' && localStorage.getItem('dev_mock_session') === 'true') {
                    return;
                }

                setSession(session);
                setUser(session?.user ?? null);

                // ログイン時に users テーブルにレコードがなければ作成 (または更新)
                if (session?.user) {
                    upsertUser(session.user);
                }
            }
        );

        // Custom event listener for dev mock login
        const handleMockLogin = () => {
            getSession();
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('dev_mock_login', handleMockLogin);
        }

        return () => {
            subscription.unsubscribe();
            if (typeof window !== 'undefined') {
                window.removeEventListener('dev_mock_login', handleMockLogin);
            }
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, session, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
