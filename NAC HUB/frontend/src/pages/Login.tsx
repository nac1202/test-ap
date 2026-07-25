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
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // OAuth2PasswordRequestForm expects form-urlencoded with "username" field
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

      // Fetch user profile
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

      // Redirect based on must_change_password
      if (userData.must_change_password) {
        navigate('/change-password');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError('サーバーに接続できません。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-orange-300/20 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black text-primary mb-3 tracking-tighter">NAC HUB</h1>
          <p className="text-text-muted font-medium">社員が毎朝最初に開く業務OS</p>
        </div>
        
        <Card className="shadow-xl border-0 ring-1 ring-gray-900/5">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-xl">ログイン</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="login-email" className="text-sm font-bold text-gray-700">メールアドレス</label>
                <Input
                  id="login-email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  autoComplete="username"
                  className="h-12 bg-gray-50 focus:bg-white transition-colors"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="login-password" className="text-sm font-bold text-gray-700">パスワード</label>
                <Input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="h-12 bg-gray-50 focus:bg-white transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <Button type="submit" size="lg" className="w-full mt-8 h-12 text-lg font-bold shadow-md hover:shadow-lg transition-all" disabled={isLoading}>
                {isLoading ? 'ログイン中...' : 'システムへ入る'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
