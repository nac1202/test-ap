import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AlertCircle, CheckCircle, ShieldAlert, Key, Check } from 'lucide-react';

export default function ChangePassword() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // パスワードバリデーション状態
  const rules = {
    length: newPassword.length >= 12,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /\d/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
  };

  const isFormValid = 
    currentPassword && 
    newPassword && 
    newPasswordConfirm &&
    Object.values(rules).every(Boolean) &&
    newPassword === newPasswordConfirm &&
    newPassword !== currentPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== newPasswordConfirm) {
      setError('新しいパスワードと確認用パスワードが一致しません。');
      return;
    }

    if (newPassword === currentPassword) {
      setError('新しいパスワードは現在のパスワードと同じにすることはできません。');
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/v1/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          new_password_confirm: newPasswordConfirm
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'パスワードの変更に失敗しました。');
      }

      setSuccess('パスワードが正常に変更されました！ダッシュボードへ遷移します...');
      
      // バックエンドが返した新しいトークンと、更新されたユーザー情報（must_change_password=false）で再ログイン処理
      const newUserData = {
        ...user!,
        must_change_password: false
      };
      
      setTimeout(() => {
        login(data.access_token, newUserData);
        navigate('/', { replace: true });
      }, 1500);

    } catch (err: any) {
      setError(err.message || '予期せぬエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-120px)] p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-lg border border-gray-100 shadow-xl rounded-[24px] bg-white/80 backdrop-blur-md relative overflow-hidden">
        {/* 装飾用の背景グラデーション */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
        
        <CardHeader className="pt-8 pb-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-primary mb-3">
            <Key className="h-6 w-6 text-orange-500" />
          </div>
          <CardTitle className="text-2xl font-black text-gray-800 tracking-tight">パスワードの初期設定変更</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            安全なシステム利用のため、初期パスワードからの変更が必要です。
          </p>
        </CardHeader>
        
        <CardContent className="px-8 pb-8 space-y-6">
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl text-sm font-medium">
              <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 block">現在のパスワード</label>
              <Input
                type="password"
                className="w-full rounded-xl border-gray-200 focus-visible:ring-primary/20"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="現在の初期パスワードを入力"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 block">新しいパスワード</label>
              <Input
                type="password"
                className="w-full rounded-xl border-gray-200 focus-visible:ring-primary/20"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="強固な新しいパスワードを入力"
                disabled={isLoading}
              />
            </div>

            {/* リアルタイムのポリシーチェック表示 */}
            <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-4 space-y-2">
              <p className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5 mb-2">
                <ShieldAlert className="h-3.5 w-3.5 text-orange-500" />
                パスワードポリシー条件：
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={`flex items-center gap-1.5 font-bold ${rules.length ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${rules.length ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {rules.length && <Check className="h-3 w-3" />}
                  </div>
                  <span>12文字以上</span>
                </div>
                <div className={`flex items-center gap-1.5 font-bold ${rules.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${rules.uppercase ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {rules.uppercase && <Check className="h-3 w-3" />}
                  </div>
                  <span>英大文字(A-Z)を含む</span>
                </div>
                <div className={`flex items-center gap-1.5 font-bold ${rules.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${rules.lowercase ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {rules.lowercase && <Check className="h-3 w-3" />}
                  </div>
                  <span>英小文字(a-z)を含む</span>
                </div>
                <div className={`flex items-center gap-1.5 font-bold ${rules.number ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${rules.number ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {rules.number && <Check className="h-3 w-3" />}
                  </div>
                  <span>数字(0-9)を含む</span>
                </div>
                <div className={`flex items-center gap-1.5 font-bold ${rules.special ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${rules.special ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {rules.special && <Check className="h-3 w-3" />}
                  </div>
                  <span>記号(!@#$%&*)を含む</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 block">新しいパスワード（確認）</label>
              <Input
                type="password"
                className="w-full rounded-xl border-gray-200 focus-visible:ring-primary/20"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                placeholder="新しいパスワードをもう一度入力"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full py-6 mt-4 rounded-xl text-sm font-bold bg-primary hover:bg-orange-600 shadow-md transition-all duration-200 flex items-center justify-center gap-2"
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? '処理中...' : 'パスワードを変更して適用'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
