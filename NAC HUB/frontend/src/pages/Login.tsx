import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect authenticated users to home
  if (authLoading) {
    return <div className="flex h-[100dvh] items-center justify-center text-gray-500 font-medium">Loading...</div>;
  }
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const loginRes = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (!loginRes.ok) {
        const errData = await loginRes.json().catch(() => null);
        setError(errData?.detail || 'ログインに失敗しました。');
        setIsLoading(false);
        return;
      }

      const { access_token } = await loginRes.json();

      const meRes = await fetch('http://localhost:8000/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      if (!meRes.ok) {
        setError('ユーザー情報の取得に失敗しました。');
        setIsLoading(false);
        return;
      }

      const userData = await meRes.json();
      login(access_token, userData);

      if (userData.must_change_password) {
        navigate('/change-password');
      } else {
        navigate('/');
      }
    } catch {
      setError('サーバーに接続できません。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 p-4 relative overflow-y-auto">
      {/* Decorative background shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-72 sm:w-96 h-72 sm:h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-72 sm:w-96 h-72 sm:h-96 bg-orange-300/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 my-auto">
        <div className="text-center mb-6 sm:mb-10">
          <h1 className="text-4xl sm:text-5xl font-black text-primary mb-2 sm:mb-3 tracking-tighter">NAC HUB</h1>
          <p className="text-xs sm:text-sm text-text-muted font-medium">社員が毎朝最初に開く業務OS</p>
        </div>
        
        <Card className="shadow-xl border-0 ring-1 ring-gray-900/5">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-center text-lg sm:text-xl">ログイン</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium">
                  {error}
                </div>
              )}
              <div className="space-y-1.5 sm:space-y-2">
                <label htmlFor="login-email" className="text-xs sm:text-sm font-bold text-gray-700">メールアドレス</label>
                <Input
                  id="login-email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  autoComplete="username"
                  className="h-11 sm:h-12 bg-gray-50 focus:bg-white transition-colors"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="space-y-1.5 sm:space-y-2">
                <label htmlFor="login-password" className="text-xs sm:text-sm font-bold text-gray-700">パスワード</label>
                <Input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="h-11 sm:h-12 bg-gray-50 focus:bg-white transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <Button type="submit" size="lg" className="w-full mt-6 sm:mt-8 h-11 sm:h-12 text-base sm:text-lg font-bold shadow-md hover:shadow-lg transition-all" disabled={isLoading}>
                {isLoading ? 'ログイン中...' : 'システムへ入る'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
