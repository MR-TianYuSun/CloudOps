'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface ShareInfo {
  id: number;
  fileName: string;
  fileSize: number;
  fileSizeText: string;
  isFolder: boolean;
  fileExt: string | null;
  fileCategory: string;
  hasPassword: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export default function SharePage() {
  const params = useParams();
  const code = params.code as string;
  const [share, setShare] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchShare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const fetchShare = async () => {
    try {
      const res = await fetch(`/api/shares/${code}`);
      const data = await res.json();
      if (data.code === 200) {
        setShare(data.data);
      } else {
        setError(data.message);
      }
    } catch {
      setError('获取分享信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!share) return;
    if (share.hasPassword && !password) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/shares/${code}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: share.hasPassword ? password : undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || '下载失败');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = share.fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('下载失败');
    } finally {
      setDownloading(false);
    }
  };

  const getFileIcon = () => {
    if (!share) return '📁';
    if (share.isFolder) return '📁';
    const cat = share.fileCategory;
    const icons: Record<string, string> = {
      document: '📄', spreadsheet: '📊', presentation: '📽️', text: '📝',
      image: '🖼️', audio: '🎵', video: '🎬', code: '💻',
      archive: '📦', data: '🗃️', folder: '📁',
    };
    return icons[cat] || '📄';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070A14] flex items-center justify-center">
        <div className="text-white/60 text-lg">加载中...</div>
      </div>
    );
  }

  if (error && !share) {
    return (
      <div className="min-h-screen bg-[#070A14] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <div className="text-white/80 text-lg">{error}</div>
          <div className="text-white/40 text-sm mt-2">该分享可能已过期或被取消</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070A14] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          {/* 文件信息 */}
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">{getFileIcon()}</div>
            <h1 className="text-white text-lg font-semibold break-all">{share?.fileName}</h1>
            <p className="text-white/40 text-sm mt-1">
              {share?.fileSizeText}
              {share?.fileExt && ` · ${share.fileExt.toUpperCase()}`}
            </p>
          </div>

          {/* 过期时间 */}
          {share?.expiresAt && (
            <div className="text-center text-white/40 text-xs mb-4">
              有效期至 {new Date(share.expiresAt).toLocaleString('zh-CN')}
            </div>
          )}

          {/* 密码输入 */}
          {share?.hasPassword && (
            <div className="mb-4">
              <input
                type="password"
                placeholder="请输入提取密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#7C5CFF]/50"
              />
            </div>
          )}

          {/* 下载按钮 */}
          <button
            onClick={handleDownload}
            disabled={downloading || (share?.hasPassword && !password)}
            className="w-full py-3 bg-[#7C5CFF] hover:bg-[#7C5CFF]/80 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {downloading ? '下载中...' : '下载文件'}
          </button>

          {/* 底部信息 */}
          <div className="text-center text-white/20 text-xs mt-4">
            分享于 {share?.createdAt ? new Date(share.createdAt).toLocaleString('zh-CN') : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
