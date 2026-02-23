import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthProvider';

export type FamilyGroup = {
    id: string;
    name: string;
    invite_code: string;
    created_at: string;
};

export type GroupMember = {
    group_id: string;
    user_id: string;
    role: 'admin' | 'member';
    joined_at: string;
    users?: {
        display_name: string | null;
        avatar_url: string | null;
    };
};

export function useFamilyGroup() {
    const { user } = useAuth();
    const [currentGroup, setCurrentGroup] = useState<FamilyGroup | null>(null);
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // DEV MODE CHECK
    const isDevMode = typeof window !== 'undefined' && localStorage.getItem('dev_mock_session') === 'true';

    // Fetch the user's current group
    const fetchGroup = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        // --- DEV MODE BYPASS ---
        if (isDevMode) {
            setTimeout(() => {
                const mockGroupId = localStorage.getItem('dev_mock_group_id');
                if (mockGroupId) {
                    setCurrentGroup({
                        id: mockGroupId,
                        name: 'テストメンバー',
                        invite_code: 'TEST12',
                        created_at: new Date().toISOString()
                    });
                    setMembers([
                        {
                            group_id: mockGroupId,
                            user_id: user.id,
                            role: 'admin',
                            joined_at: new Date().toISOString(),
                            users: { display_name: 'テストパパ', avatar_url: null }
                        }
                    ]);
                } else {
                    setCurrentGroup(null);
                    setMembers([]);
                }
                setLoading(false);
            }, 500);
            return;
        }
        // ------------------------

        try {
            // 1. Find which group the user belongs to
            const { data: memberData, error: memberErr } = await supabase
                .from('group_members')
                .select('group_id')
                .eq('user_id', user.id)
                .maybeSingle(); // User can only be in one group for now

            if (memberErr) throw memberErr;

            if (!memberData) {
                // FORCE: Always inject the mock group for empty groups so users can test on production
                setCurrentGroup({
                    id: 'mock-group-123',
                    name: 'デモグループ',
                    invite_code: 'DEMO12',
                    created_at: new Date().toISOString()
                });
                setMembers([
                    {
                        group_id: 'mock-group-123',
                        user_id: user.id,
                        role: 'admin',
                        joined_at: new Date().toISOString(),
                        users: { display_name: 'あなた', avatar_url: null }
                    },
                    {
                        group_id: 'mock-group-123',
                        user_id: 'mock-family-uuid',
                        role: 'member',
                        joined_at: new Date().toISOString(),
                        users: { display_name: 'テストメンバー', avatar_url: null }
                    }
                ]);
            } else {
                // 2. Fetch group details
                const { data: groupData, error: groupErr } = await supabase
                    .from('family_groups')
                    .select('*')
                    .eq('id', memberData.group_id)
                    .single();

                if (groupErr) throw groupErr;
                setCurrentGroup(groupData as FamilyGroup);

                // 3. Fetch all members with their profiles (join on users table)
                const { data: allMembers, error: allMembersErr } = await supabase
                    .from('group_members')
                    .select(`
            *,
            users (
              display_name,
              avatar_url
            )
          `)
                    .eq('group_id', memberData.group_id);

                if (allMembersErr) throw allMembersErr;
                setMembers(allMembers as unknown as GroupMember[]);
            }
        } catch (err: unknown) {
            console.error('Error fetching group:', err);
            if (err instanceof Error) {
                setError(err.message || 'グループ情報の取得に失敗しました');
            } else {
                setError('グループ情報の取得に失敗しました');
            }
        } finally {
            setLoading(false);
        }
    }, [user, isDevMode]);

    // Create a new group
    const createGroup = async (groupName: string) => {
        if (!user) return null;
        setLoading(true);
        setError(null);

        // --- DEV MODE BYPASS ---
        if (isDevMode) {
            return new Promise<FamilyGroup | null>((resolve) => {
                setTimeout(() => {
                    localStorage.setItem('dev_mock_group_id', 'mock-group-123');
                    fetchGroup(); // Refresh state
                    resolve({ id: 'mock-group-123', name: groupName, invite_code: 'TEST12', created_at: new Date().toISOString() });
                }, 800);
            });
        }
        // ------------------------

        try {
            // 1. Insert into family_groups
            // The DB trigger or server logic usually generates the short invite_code,
            // but if we are doing it client side for simplicity:
            const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

            const { data: newGroup, error: insertErr } = await supabase
                .from('family_groups')
                .insert({ name: groupName, invite_code: inviteCode })
                .select()
                .single();

            if (insertErr) throw insertErr;

            // 2. Add current user as admin
            const { error: memberErr } = await supabase
                .from('group_members')
                .insert({
                    group_id: newGroup.id,
                    user_id: user.id,
                    role: 'admin'
                });

            if (memberErr) throw memberErr;

            // Refresh state
            await fetchGroup();
            return newGroup as FamilyGroup;
        } catch (err: unknown) {
            console.error('Error creating group:', err);
            if (err instanceof Error) {
                setError(err.message || 'グループの作成に失敗しました');
            } else {
                setError('グループの作成に失敗しました');
            }
            setLoading(false);
            return null;
        }
    };

    // Join an existing group using invite code
    const joinGroup = async (inviteCode: string) => {
        if (!user) return false;
        setLoading(true);
        setError(null);

        // --- DEV MODE BYPASS ---
        if (isDevMode) {
            return new Promise<boolean>((resolve) => {
                setTimeout(() => {
                    if (inviteCode === 'TEST12') {
                        localStorage.setItem('dev_mock_group_id', 'mock-group-123');
                        fetchGroup();
                        resolve(true);
                    } else {
                        setError('無効な招待コードです (DevMode: TEST12 を使用してください)');
                        setLoading(false);
                        resolve(false);
                    }
                }, 800);
            });
        }
        // ------------------------

        try {
            // 1. Find the group by invite code
            const upperCode = inviteCode.toUpperCase().trim();
            const { data: groupData, error: groupErr } = await supabase
                .from('family_groups')
                .select('id')
                .eq('invite_code', upperCode)
                .maybeSingle();

            if (groupErr) throw groupErr;
            if (!groupData) {
                throw new Error('無効な招待コードです。入力内容を確認してください。');
            }

            // 2. Add user to the group
            const { error: memberErr } = await supabase
                .from('group_members')
                .insert({
                    group_id: groupData.id,
                    user_id: user.id,
                    role: 'member'
                });

            if (memberErr) {
                // Handle unique constraint violation (already joined)
                if (memberErr.code === '23505') {
                    throw new Error('すでにこのグループに参加しています。');
                }
                throw memberErr;
            }

            // Refresh state
            await fetchGroup();
            return true;
        } catch (err: unknown) {
            console.error('Error joining group:', err);
            if (err instanceof Error) {
                setError(err.message || 'グループへの参加に失敗しました');
            } else {
                setError('グループへの参加に失敗しました');
            }
            setLoading(false);
            return false;
        }
    };

    // Leave current group
    const leaveGroup = async () => {
        if (!user || !currentGroup) return false;
        setLoading(true);
        setError(null);

        // --- DEV MODE BYPASS ---
        if (isDevMode) {
            return new Promise<boolean>((resolve) => {
                setTimeout(() => {
                    localStorage.removeItem('dev_mock_group_id');
                    setCurrentGroup(null);
                    setMembers([]);
                    setLoading(false);
                    resolve(true);
                }, 500);
            });
        }
        // ------------------------

        try {
            const { error: leaveErr } = await supabase
                .from('group_members')
                .delete()
                .eq('group_id', currentGroup.id)
                .eq('user_id', user.id);

            if (leaveErr) throw leaveErr;

            setCurrentGroup(null);
            setMembers([]);
            return true;
        } catch (err: unknown) {
            console.error('Error leaving group:', err);
            if (err instanceof Error) {
                setError(err.message || 'グループの退出に失敗しました');
            } else {
                setError('グループの退出に失敗しました');
            }
            setLoading(false);
            return false;
        }
    };

    return {
        currentGroup,
        members,
        loading,
        error,
        fetchGroup,
        createGroup,
        joinGroup,
        leaveGroup
    };
}
