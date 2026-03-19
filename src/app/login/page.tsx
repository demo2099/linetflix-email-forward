'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // 保存令牌到 localStorage
      localStorage.setItem('auth_token', data.token);
      
      // 重定向到仪表板
      router.push('/dashboard');
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 flex items-center justify-center px-4 py-6 sm:py-8">
      <div className="w-full max-w-md">
        <div className="bg-white/98 rounded-2xl shadow-2xl overflow-hidden border border-white/40">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-6 sm:px-6 sm:py-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">邮件转发系统</h1>
            <p className="text-blue-100 text-sm sm:text-base mt-2">安全的 Netflix 邮件转发</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入访问密码"
                className="w-full h-12 px-4 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                disabled={isLoading}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-xl transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '验证中...' : '登 录'}
            </button>
          </form>

          {/* Footer */}
          <div className="bg-gray-50 px-5 py-4 sm:px-6 border-t border-gray-200">
            <p className="text-xs text-gray-600 text-center">
              转发的邮件仅保存 7 天，之后自动删除
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
