'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/Auth/AuthProvider';
import { useFamilyGroup } from '@/hooks/useFamilyGroup';
import { useRouter } from 'next/navigation';
import { Users, UserPlus, Copy, Check, LogOut, Loader2, RefreshCw } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { Navbar } from '@/components/layout/Navbar';

export default function GroupPage() {
    const { user, loading: authLoading } = useAuth();
    const {
        currentGroup,
        members,
        loading: groupLoading,
        error,
        fetchGroup,
        createGroup,
        joinGroup,
        leaveGroup
    } = useFamilyGroup();

    const router = useRouter();

    const [groupName, setGroupName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [copied, setCopied] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const isDevMode = typeof window !== 'undefined' && localStorage.getItem('dev_mock_session') === 'true';

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        } else if (user) {
            fetchGroup();
        }
    }, [user, authLoading, router, fetchGroup]);

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupName.trim()) return;
        setIsProcessing(true);
        await createGroup(groupName);
        setIsProcessing(false);
        setGroupName('');
    };

    const handleJoinGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteCode.trim()) return;
        setIsProcessing(true);
        await joinGroup(inviteCode);
        setIsProcessing(false);
        setInviteCode('');
    };

    const handleLeaveGroup = async () => {
        if (confirm('本当にグループから退出しますか？\n（あなたを含め、他のメンバーからも位置情報が見えなくなります）')) {
            setIsProcessing(true);
            await leaveGroup();
            setIsProcessing(false);
        }
    };

    const copyInviteCode = () => {
        if (!currentGroup) return;
        navigator.clipboard.writeText(currentGroup.invite_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (authLoading || (groupLoading && !currentGroup && !error)) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-50 pb-20 pt-16">
            <Navbar />

            <main className="max-w-md mx-auto p-4 space-y-6">

                {/* === Error Message === */}
                {error && (
                    <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                        {error}
                    </div>
                )}

                {/* === ALREADY IN A GROUP === */}
                {currentGroup ? (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold text-slate-800">{currentGroup.name}</h1>
                                        <p className="text-xs text-slate-500">
                                            作成日: {new Date(currentGroup.created_at).toLocaleDateString('ja-JP')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={fetchGroup}
                                    className="p-2 text-slate-400 hover:text-teal-600 transition-colors"
                                    aria-label="更新"
                                >
                                    <RefreshCw size={20} className={groupLoading ? 'animate-spin' : ''} />
                                </button>
                            </div>

                            {/* Invite Code Section */}
                            <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                    <UserPlus size={16} />
                                    グループに招待する
                                </p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-white border border-slate-300 rounded px-3 py-2 text-center text-lg font-mono tracking-widest text-slate-800 font-bold">
                                        {currentGroup.invite_code}
                                    </div>
                                    <button
                                        onClick={copyInviteCode}
                                        className="p-3 bg-teal-600 text-white rounded hover:bg-teal-700 transition flex-shrink-0"
                                        title="招待コードをコピー"
                                    >
                                        {copied ? <Check size={20} /> : <Copy size={20} />}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    この6桁のコードを招待したい人に教えてください。
                                </p>
                            </div>

                            {/* Members List */}
                            <div className="mt-6">
                                <h3 className="text-sm font-bold text-slate-700 mb-3 border-b pb-2">グループメンバー ({members.length}名)</h3>
                                <ul className="space-y-3">
                                    {members.map((member) => (
                                        <li key={member.user_id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
                                                    {member.users?.display_name?.charAt(0) || <UserPlus size={14} />}
                                                </div>
                                                <span className="text-sm font-medium text-slate-800">
                                                    {member.users?.display_name || '名前未設定'}
                                                    {member.user_id === user.id && <span className="ml-2 text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">あなた</span>}
                                                </span>
                                            </div>
                                            <span className="text-xs text-slate-400">
                                                {member.role === 'admin' ? '管理者' : 'メンバー'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <button
                            onClick={handleLeaveGroup}
                            disabled={isProcessing}
                            className="w-full flex items-center justify-center gap-2 py-3 text-red-600 hover:bg-red-50 rounded-lg font-medium transition disabled:opacity-50"
                        >
                            <LogOut size={18} />
                            グループから退出する
                        </button>
                    </div>
                ) : (
                    /* === NOT IN A GROUP === */
                    <div className="space-y-6">
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users size={32} />
                            </div>
                            <h1 className="text-xl font-bold text-slate-800 mb-2">グループに参加</h1>
                            <p className="text-sm text-slate-600">
                                位置情報や安否を共有するために、新しいグループを作成するか、既存のグループに参加してください。
                            </p>
                        </div>

                        {/* Create Group Form */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">新しくグループを作る</h2>
                            <form onSubmit={handleCreateGroup} className="space-y-4">
                                <div>
                                    <label htmlFor="groupName" className="block text-sm font-medium text-slate-700 mb-1">
                                        グループ名
                                    </label>
                                    <input
                                        id="groupName"
                                        type="text"
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        placeholder="例: 田中家、佐藤ファミリーなど"
                                        className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isProcessing || !groupName.trim()}
                                    className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white py-2.5 rounded-lg font-medium hover:bg-teal-700 transition disabled:opacity-50"
                                >
                                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users size={18} />}
                                    グループを作成
                                </button>
                            </form>
                        </div>

                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-slate-200"></div>
                            <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">または</span>
                            <div className="flex-grow border-t border-slate-200"></div>
                        </div>

                        {/* Join Group Form */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">招待コードで参加する</h2>
                            <form onSubmit={handleJoinGroup} className="space-y-4">
                                <div>
                                    <label htmlFor="inviteCode" className="block text-sm font-medium text-slate-700 mb-1">
                                        招待コード (6文字)
                                    </label>
                                    <input
                                        id="inviteCode"
                                        type="text"
                                        value={inviteCode}
                                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                        placeholder="例: A1B2C3"
                                        maxLength={6}
                                        className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none font-mono tracking-widest text-center text-lg"
                                        required
                                    />
                                    {isDevMode && (
                                        <p className="text-xs text-blue-600 mt-2">※DevModeテスト用の招待コードは「TEST12」です</p>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    disabled={isProcessing || inviteCode.trim().length === 0}
                                    className="w-full flex items-center justify-center gap-2 bg-white border-2 border-teal-600 text-teal-700 py-2.5 rounded-lg font-medium hover:bg-teal-50 transition disabled:opacity-50"
                                >
                                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus size={18} />}
                                    参加する
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    );
}
