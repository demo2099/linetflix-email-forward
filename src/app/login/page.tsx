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
    <div className="login-root min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 flex items-center justify-center px-4 py-6 sm:py-8">
      <div className="login-shell w-full max-w-md">
        <div className="login-card bg-white/98 rounded-2xl shadow-2xl overflow-hidden border border-white/40">
          {/* Header */}
          <div className="login-header bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-6 sm:px-6 sm:py-8">
            <h1 className="login-title text-2xl sm:text-3xl font-bold text-white tracking-tight">邮件转发系统</h1>
            <p className="login-subtitle text-blue-100 text-sm sm:text-base mt-2">安全的 Netflix 邮件转发</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form p-5 sm:p-6 space-y-4">
            <div className="login-field">
              <label htmlFor="password" className="login-label block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入访问密码"
                className="login-input w-full h-12 px-4 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                disabled={isLoading}
                required
              />
            </div>

            {error && (
              <div className="login-error bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="login-btn w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-xl transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '验证中...' : '登 录'}
            </button>
          </form>

          {/* Footer */}
          <div className="login-footer bg-gray-50 px-5 py-4 sm:px-6 border-t border-gray-200">
            <p className="login-footnote text-xs text-gray-600 text-center">
              转发的邮件仅保存 7 天，之后自动删除
            </p>
          </div>
        </div>
      </div>
      <style jsx>{`
        .login-root {
          min-height: 100vh;
          background: linear-gradient(140deg, #0f172a 0%, #111827 55%, #172554 100%);
          padding: 24px 16px;
        }
        .login-shell {
          width: 100%;
          max-width: 420px;
          margin: 0 auto;
        }
        .login-card {
          background: #fff;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.4);
        }
        .login-header {
          background: linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%);
          padding: 24px 20px;
        }
        .login-title {
          margin: 0;
          font-size: 30px;
          line-height: 1.2;
          font-weight: 800;
          color: #fff;
        }
        .login-subtitle {
          margin: 10px 0 0;
          color: #dbeafe;
          font-size: 15px;
        }
        .login-form {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .login-label {
          display: block;
          margin-bottom: 8px;
          color: #334155;
          font-size: 14px;
          font-weight: 600;
        }
        .login-input {
          width: 100%;
          height: 48px;
          padding: 0 14px;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          font-size: 16px;
          outline: none;
          box-sizing: border-box;
        }
        .login-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }
        .login-btn {
          height: 48px;
          border: none;
          border-radius: 12px;
          background: #2563eb;
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
        }
        .login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .login-error {
          font-size: 14px;
          border-radius: 10px;
        }
        .login-footer {
          padding: 14px 20px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }
        .login-footnote {
          margin: 0;
          font-size: 12px;
          color: #64748b;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
