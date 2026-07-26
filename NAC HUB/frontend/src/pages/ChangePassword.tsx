import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AlertCircle, CheckCircle, ShieldAlert, Key, Check, ArrowLeft } from 'lucide-react';

export default function ChangePassword() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const isForced = user?.must_change_password === true;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      
      const newUserData = {
        ...user!,
        must_change_password: false
      };
      
      setTimeout(() => {
        login(data.access_token, newUserData);
        navigate('/', { replace: true });
      }, 1500);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '予期せぬエラーが発生しました。';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center py-4 sm:py-8 px-3 sm:px-6">
      {/* Back button (only for voluntary change, not forced) */}
      {!isForced && (
        <div className="w-full max-w-lg mb-3 sm:mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-1.5 text-gray-600 hover:text-gray-900 min-h-[44px]"
            id="btn-back"
          >
            <ArrowLeft className="h-4 w-4" />
            戻る
          </Button>
        </div>
      )}

      <Card className="w-full max-w-lg border border-gray-100 shadow-xl rounded-2xl sm:rounded-[24px] bg-white/95 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
        
        <CardHeader className="pt-6 sm:pt-8 pb-3 sm:pb-4 text-center px-4 sm:px-6">
          <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-50 flex items-center justify-center text-primary mb-2 sm:mb-3">
            <Key className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-black text-gray-800 tracking-tight">
            {isForced ? 'パスワードの初期設定変更' : 'パスワードの変更'}
          </CardTitle>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {isForced
              ? '安全なシステム利用のため、初期パスワードからの変更が必要です。'
              : '現在のパスワードを確認した上で、新しいパスワードへ変更します。'}
          </p>
        </CardHeader>
        
        <CardContent className="px-4 sm:px-8 pb-6 sm:pb-8 space-y-4 sm:space-y-6">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 p-3 sm:p-4 rounded-xl text-xs sm:text-sm font-medium">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2.5 bg-green-50 border border-green-200 text-green-800 p-3 sm:p-4 rounded-xl text-xs sm:text-sm font-medium">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 block">現在のパスワード</label>
              <Input
                type="password"
                className="w-full rounded-xl border-gray-200 text-base"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="現在のパスワードを入力"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 block">新しいパスワード</label>
              <Input
                type="password"
                className="w-full rounded-xl border-gray-200 text-base"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="強固な新しいパスワードを入力"
                disabled={isLoading}
              />
            </div>

            <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-3 sm:p-4 space-y-2">
              <p className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5 mb-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                パスワードポリシー条件：
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                <div className={`flex items-center gap-1.5 font-bold ${rules.length ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${rules.length ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {rules.length && <Check className="h-3 w-3" />}
                  </div>
                  <span>12文字以上</span>
                </div>
                <div className={`flex items-center gap-1.5 font-bold ${rules.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${rules.uppercase ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {rules.uppercase && <Check className="h-3 w-3" />}
                  </div>
                  <span>英大文字(A-Z)を含む</span>
                </div>
                <div className={`flex items-center gap-1.5 font-bold ${rules.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${rules.lowercase ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {rules.lowercase && <Check className="h-3 w-3" />}
                  </div>
                  <span>英小文字(a-z)を含む</span>
                </div>
                <div className={`flex items-center gap-1.5 font-bold ${rules.number ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${rules.number ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {rules.number && <Check className="h-3 w-3" />}
                  </div>
                  <span>数字(0-9)を含む</span>
                </div>
                <div className={`flex items-center gap-1.5 font-bold ${rules.special ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${rules.special ? 'bg-green-100' : 'bg-gray-100'}`}>
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
                className="w-full rounded-xl border-gray-200 text-base"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                placeholder="新しいパスワードをもう一度入力"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 sm:h-12 mt-4 rounded-xl text-sm sm:text-base font-bold bg-primary hover:bg-orange-600 shadow-md transition-all flex items-center justify-center gap-2"
              disabled={!isFormValid || isLoading}
              id="btn-change-password-submit"
            >
              {isLoading ? '処理中...' : 'パスワードを変更して適用'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

