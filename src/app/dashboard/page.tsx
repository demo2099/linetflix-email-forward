'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ForwardedEmail {
  id: number;
  message_id: string | null;
  rule_id: number;
  from_addr: string;
  to_addr: string;
  subject: string | null;
  body: string | null;
  html_body: string | null;
  raw_email: string | null;
  forwarded_to: string;
  created_at: string;
  expires_at: string;
}

interface Stats {
  totalEmails: number;
  activeEmails: number;
  totalRules: number;
  enabledRules: number;
}

interface ApiResponse {
  success: boolean;
  data: ForwardedEmail[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
  stats: Stats;
  error?: string;
}

export default function DashboardPage() {
  const [emails, setEmails] = useState<ForwardedEmail[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<ForwardedEmail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expiryMinutes, setExpiryMinutes] = useState<number>(30);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const router = useRouter();

  const fetchEmails = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/emails?limit=20&offset=0', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch emails');
      }

      const data: ApiResponse = await response.json();

      if (data.success) {
        // 过滤掉已过期的邮件（前端过滤）
        const now = new Date().getTime();
        const validEmails = data.data.filter((email: ForwardedEmail) => {
          return new Date(email.expires_at).getTime() > now;
        });
        
        setEmails(validEmails);
        
        // 更新统计数据，只显示未过期的邮件数量
        const updatedStats = {
          ...data.stats,
          activeEmails: validEmails.length,
          totalEmails: validEmails.length,
        };
        setStats(updatedStats);
        
        // 获取过期时间配置
        const configResponse = await fetch('/api/config', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (configResponse.ok) {
          const configData = await configResponse.json();
          if (configData.expiryMinutes) {
            setExpiryMinutes(configData.expiryMinutes);
          }
        }
      } else {
        setError(data.error || 'Failed to fetch emails');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchEmails();

    // 每 30 秒刷新一次数据
    const interval = setInterval(fetchEmails, 30000);

    return () => clearInterval(interval);
  }, [fetchEmails]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    router.push('/login');
  };

  const handleViewEmail = (email: ForwardedEmail) => {
    setSelectedEmail(email);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEmail(null);
  };

  const handleDeleteEmail = async (emailId: number) => {
    if (!confirm('确定要删除这封邮件吗？')) {
      return;
    }

    setDeletingId(emailId);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/emails/${emailId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to delete email');
      }

      const data = await response.json();

      if (data.success) {
        // 从列表中移除已删除的邮件
        setEmails(emails.filter(email => email.id !== emailId));
        // 如果删除的是当前查看的邮件，关闭模态框
        if (selectedEmail?.id === emailId) {
          closeModal();
        }
      } else {
        alert('删除失败: ' + (data.error || '未知错误'));
      }
    } catch (err) {
      alert('删除失败: ' + (err instanceof Error ? err.message : '未知错误'));
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatRelativeTime = (dateString: string) =>
    formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: zhCN,
    });

  const retentionText = (() => {
    if (expiryMinutes >= 60 * 24 * 365) {
      return `保留 ${Math.round(expiryMinutes / (60 * 24 * 365))} 年`;
    }
    if (expiryMinutes >= 60 * 24) {
      return `保留 ${Math.round(expiryMinutes / (60 * 24))} 天`;
    }
    if (expiryMinutes >= 60) {
      return `保留 ${Math.round(expiryMinutes / 60)} 小时`;
    }
    return `保留 ${expiryMinutes} 分钟`;
  })();

  return (
    <div className="dash-root min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="dash-header sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="dash-header-inner max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-4">
          <div className="dash-title-wrap min-w-0">
            <h1 className="dash-title text-xl sm:text-2xl font-bold text-slate-900 truncate">邮件转发系统</h1>
            <p className="dash-subtitle text-xs sm:text-sm text-slate-600 mt-1 truncate">安全转发 Netflix 验证邮件</p>
          </div>
          <button
            onClick={handleLogout}
            className="dash-logout shrink-0 h-10 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm sm:text-base transition duration-200"
          >
            登 出
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dash-main max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        {/* Stats Grid */}
        {stats && (
          <div className="dash-stats grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-8">
            <div className="dash-stat-card bg-white rounded-xl shadow-sm sm:shadow p-4 sm:p-6 border-l-4 border-blue-500">
              <p className="text-xs sm:text-sm font-medium text-slate-600">活跃邮件</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 sm:mt-2">{stats.activeEmails}</p>
              <p className="text-xs text-slate-500 mt-1">未过期的邮件</p>
            </div>

            <div className="dash-stat-card bg-white rounded-xl shadow-sm sm:shadow p-4 sm:p-6 border-l-4 border-green-500">
              <p className="text-xs sm:text-sm font-medium text-slate-600">总邮件数</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 sm:mt-2">{stats.totalEmails}</p>
              <p className="text-xs text-slate-500 mt-1">所有已保存的邮件</p>
            </div>

            <div className="dash-stat-card bg-white rounded-xl shadow-sm sm:shadow p-4 sm:p-6 border-l-4 border-purple-500">
              <p className="text-xs sm:text-sm font-medium text-slate-600">启用规则</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 sm:mt-2">{stats.enabledRules}</p>
              <p className="text-xs text-slate-500 mt-1">活跃的转发规则</p>
            </div>

            <div className="dash-stat-card bg-white rounded-xl shadow-sm sm:shadow p-4 sm:p-6 border-l-4 border-orange-500">
              <p className="text-xs sm:text-sm font-medium text-slate-600">总规则数</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 sm:mt-2">{stats.totalRules}</p>
              <p className="text-xs text-slate-500 mt-1">配置的转发规则</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="dash-error bg-red-50 border border-red-200 rounded-xl p-4 mb-5 sm:mb-6 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Emails */}
        <div className="dash-email-wrap bg-white rounded-xl shadow-sm sm:shadow overflow-hidden">
          <div className="dash-email-head px-4 sm:px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">收到的邮件</h2>
            <p className="text-sm text-slate-600 mt-1">最近 20 条邮件 · {retentionText}</p>
          </div>

          {isLoading ? (
            <div className="px-6 py-12 text-center">
              <p className="text-slate-500">加载中...</p>
            </div>
          ) : emails.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-slate-500">暂无邮件</p>
            </div>
          ) : (
            <>
              <div className="dash-mobile-list md:hidden p-3 space-y-3 bg-slate-50/70">
                {emails.map((email) => (
                  <article key={email.id} className="dash-email-card bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900 truncate">{email.subject || '（无主题）'}</p>
                      <span className="text-[11px] text-slate-500 shrink-0">{formatRelativeTime(email.created_at)}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 break-all">发件人：{email.from_addr}</p>
                    <p className="text-xs text-slate-600 mt-1 break-all">转发至：{email.forwarded_to}</p>
                    <p className="text-xs text-slate-500 mt-1">过期：{formatRelativeTime(email.expires_at)}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleViewEmail(email)}
                        className="dash-btn dash-btn-view flex-1 h-9 rounded-lg bg-blue-600 text-white text-sm font-medium"
                      >
                        查看
                      </button>
                      <button
                        onClick={() => handleDeleteEmail(email.id)}
                        disabled={deletingId === email.id}
                        className="dash-btn dash-btn-del flex-1 h-9 rounded-lg border border-red-300 text-red-700 text-sm font-medium disabled:opacity-50"
                      >
                        {deletingId === email.id ? '删除中...' : '删除'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="dash-desktop-table hidden md:block overflow-x-auto">
                <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      发件人
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      主题
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      转发至
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      接收时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      过期时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {emails.map((email) => (
                    <tr key={email.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {email.from_addr}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 truncate max-w-xs">
                        {email.subject || '（无主题）'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {email.forwarded_to}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {formatRelativeTime(email.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {formatRelativeTime(email.expires_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                        <button
                          onClick={() => handleViewEmail(email)}
                          className="text-blue-600 hover:text-blue-800 font-medium transition"
                        >
                          查看详情
                        </button>
                        <button
                          onClick={() => handleDeleteEmail(email.id)}
                          disabled={deletingId === email.id}
                          className="text-red-600 hover:text-red-800 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingId === email.id ? '删除中...' : '删除'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Email Details Modal */}
      {isModalOpen && selectedEmail && (
        <div className="fixed inset-0 bg-black/55 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-xl max-w-2xl w-full max-h-[92vh] sm:max-h-[80vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg sm:text-xl font-bold text-white">邮件详情</h3>
              <button
                onClick={closeModal}
                className="text-white hover:text-blue-100 text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  发件人
                </p>
                <p className="text-slate-900 font-medium mt-1">{selectedEmail.from_addr}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  收件人
                </p>
                <p className="text-slate-900 font-medium mt-1">{selectedEmail.to_addr}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  转发至
                </p>
                <p className="text-slate-900 font-medium mt-1">{selectedEmail.forwarded_to}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  主题
                </p>
                <p className="text-slate-900 font-medium mt-1">
                  {selectedEmail.subject || '（无主题）'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  接收时间
                </p>
                <p className="text-slate-900 mt-1">
                  {new Date(selectedEmail.created_at).toLocaleString('zh-CN')}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  过期时间
                </p>
                <p className="text-slate-900 mt-1">
                  {new Date(selectedEmail.expires_at).toLocaleString('zh-CN')}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  邮件内容
                </p>
                <div className="bg-slate-50 p-3 sm:p-4 rounded-lg mt-2 border border-slate-200 max-h-96 overflow-y-auto">
                  {selectedEmail.html_body ? (
                    <div 
                      className="prose prose-sm max-w-none" 
                      dangerouslySetInnerHTML={{ __html: selectedEmail.html_body }}
                    />
                  ) : selectedEmail.body ? (
                    <pre className="text-sm text-slate-700 whitespace-pre-wrap break-words font-mono">
                      {selectedEmail.body}
                    </pre>
                  ) : (
                    <p className="text-slate-500 text-sm italic">无邮件内容</p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-4 sm:px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-900 rounded-lg transition duration-200 font-medium"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        .dash-root {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
        }
        .dash-header {
          background: rgba(255, 255, 255, 0.96);
          border-bottom: 1px solid #e2e8f0;
        }
        .dash-header-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .dash-title {
          margin: 0;
          font-size: 30px;
          line-height: 1.15;
          font-weight: 800;
          color: #0f172a;
        }
        .dash-subtitle {
          margin: 6px 0 0;
          color: #475569;
          font-size: 14px;
        }
        .dash-logout {
          border: none;
          background: #dc2626;
          color: #fff;
          height: 40px;
          padding: 0 14px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 14px;
        }
        .dash-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px;
        }
        .dash-stats {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }
        .dash-stat-card {
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.08);
        }
        .dash-email-wrap {
          background: #fff;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }
        .dash-email-head {
          padding: 14px 16px;
          border-bottom: 1px solid #e2e8f0;
        }
        .dash-mobile-list {
          display: block;
          padding: 12px;
          background: #f8fafc;
        }
        .dash-desktop-table {
          display: none;
        }
        .dash-email-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
        }
        .dash-btn {
          height: 36px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          border: none;
        }
        .dash-btn-view {
          background: #2563eb;
          color: #fff;
        }
        .dash-btn-del {
          background: #fff;
          color: #b91c1c;
          border: 1px solid #fca5a5;
        }
        @media (min-width: 768px) {
          .dash-main {
            padding: 24px;
          }
          .dash-stats {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
            margin-bottom: 22px;
          }
          .dash-header-inner {
            padding: 14px 24px;
          }
          .dash-title {
            font-size: 40px;
          }
          .dash-subtitle {
            font-size: 15px;
          }
          .dash-mobile-list {
            display: none;
          }
          .dash-desktop-table {
            display: block;
          }
        }
      `}</style>
    </div>
  );
}
