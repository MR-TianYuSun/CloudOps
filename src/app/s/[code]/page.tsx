'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Folder, File, Download, Lock, CheckSquare, Square } from 'lucide-react';

interface FolderChild {
  id: number;
  name: string;
  size: number;
  sizeText: string;
  isFolder: boolean;
  fileExt: string | null;
  fileCategory: string;
}

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
  folderContents: FolderChild[];
}

export default function SharePage() {
  const params = useParams();
  const code = params.code as string;
  const [share, setShare] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [downloading, setDownloading] = useState<number | null>(null); // file id being downloaded, 0 = single file
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

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

  const downloadFile = useCallback(async (fileId: number | null, fileName: string) => {
    setDownloading(fileId || 0);
    try {
      const downloadUrl = fileId && share?.isFolder
        ? `/api/shares/${code}/download?fileId=${fileId}`
        : `/api/shares/${code}/download`;
      const res = await fetch(downloadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: share?.hasPassword ? password : undefined }),
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
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('下载失败');
    } finally {
      setDownloading(null);
    }
  }, [code, share?.hasPassword, password]);

  const handleDownloadSingle = async (item: FolderChild) => {
    if (item.isFolder) return; // folders can't be downloaded individually from share
    await downloadFile(item.id, item.name);
  };

  const handleDownloadSelected = async () => {
    if (!share) return;
    const filesToDownload = share.folderContents.filter(
      item => selectedIds.has(item.id) && !item.isFolder
    );
    for (const item of filesToDownload) {
      await downloadFile(item.id, item.name);
    }
  };

  const handleDownloadAll = async () => {
    if (!share) return;
    if (!share.isFolder) {
      // single file download - don't pass fileId, let server handle directly
      await downloadFile(null, share.fileName);
      return;
    }
    // download all non-folder files in the shared folder
    const filesToDownload = share.folderContents.filter(item => !item.isFolder);
    for (const item of filesToDownload) {
      await downloadFile(item.id, item.name);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!share) return;
    const selectableIds = share.folderContents.filter(item => !item.isFolder).map(item => item.id);
    if (selectedIds.size === selectableIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableIds));
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      document: '#3B82F6', spreadsheet: '#22C55E', presentation: '#F97316',
      text: '#8B5CF6', image: '#EC4899', audio: '#EAB308', video: '#EF4444',
      code: '#06B6D4', archive: '#F59E0B', data: '#14B8A6', other: '#9AA7C7',
    };
    return colors[category] || colors.other;
  };

  const renderFileIcon = (item: { isFolder: boolean; fileCategory: string; fileExt: string | null }) => {
    if (item.isFolder) {
      return <Folder className="w-5 h-5 text-amber-400" />;
    }
    return <File className="w-5 h-5" style={{ color: getCategoryColor(item.fileCategory) }} />;
  };

  const selectedCount = selectedIds.size;
  const selectableCount = share?.folderContents.filter(item => !item.isFolder).length || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070A14] flex items-center justify-center">
        <div className="text-white/60 text-lg animate-pulse">加载中...</div>
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
      <div className="w-full max-w-lg">
        <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          {/* 文件信息 */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/[0.06] flex items-center justify-center">
              {share?.isFolder ? (
                <Folder className="w-8 h-8 text-amber-400" />
              ) : (
                <File className="w-8 h-8 text-[#7C5CFF]" />
              )}
            </div>
            <h1 className="text-white text-lg font-semibold break-all">{share?.fileName}</h1>
            <p className="text-white/40 text-sm mt-1">
              {share?.isFolder ? '文件夹' : share?.fileSizeText}
              {share?.fileExt && !share?.isFolder && ` · ${share.fileExt.toUpperCase()}`}
              {share?.isFolder && share.folderContents.length > 0 && ` · ${share.folderContents.length} 个项目`}
            </p>
          </div>

          {/* 文件夹内容列表 - 可选择下载 */}
          {share?.isFolder && share.folderContents.length > 0 && (
            <div className="mb-4">
              {/* 全选栏 */}
              <div className="flex items-center justify-between px-4 py-2 mb-1">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-white/60 text-xs hover:text-white/80 transition-colors"
                >
                  {selectableCount > 0 && selectedIds.size === selectableCount ? (
                    <CheckSquare className="w-4 h-4 text-[#7C5CFF]" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  全选文件
                </button>
                {selectedCount > 0 && (
                  <span className="text-[#7C5CFF] text-xs">已选 {selectedCount} 个文件</span>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-white/5">
                {share.folderContents.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors border-b border-white/[0.03] last:border-b-0 group"
                  >
                    {/* 选择框 - 仅文件可选 */}
                    {!item.isFolder ? (
                      <button
                        onClick={() => toggleSelect(item.id)}
                        className="shrink-0 hover:scale-110 transition-transform"
                      >
                        {selectedIds.has(item.id) ? (
                          <CheckSquare className="w-4 h-4 text-[#7C5CFF]" />
                        ) : (
                          <Square className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                        )}
                      </button>
                    ) : (
                      <div className="w-4 shrink-0" />
                    )}
                    {renderFileIcon(item)}
                    <div className="flex-1 min-w-0">
                      <div className="text-white/90 text-sm truncate">{item.name}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-white/30 text-xs">
                        {item.isFolder ? '文件夹' : item.sizeText}
                      </span>
                      {!item.isFolder && (
                        <button
                          onClick={() => handleDownloadSingle(item)}
                          disabled={downloading === item.id}
                          className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-[#7C5CFF] transition-all disabled:opacity-40"
                          title="下载此文件"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 过期时间 */}
          {share?.expiresAt && (
            <div className="text-center text-white/40 text-xs mb-4">
              有效期至 {new Date(share.expiresAt).toLocaleString('zh-CN')}
            </div>
          )}

          {/* 密码输入 */}
          {share?.hasPassword && (
            <div className="mb-4 relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="password"
                placeholder="请输入提取密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/[0.06] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#7C5CFF]/50 transition-colors"
              />
            </div>
          )}

          {/* 下载按钮 */}
          {!share?.isFolder ? (
            /* 单文件下载 */
            <button
              onClick={handleDownloadAll}
              disabled={downloading !== null || (share?.hasPassword && !password)}
              className="w-full py-3 bg-[#7C5CFF] hover:bg-[#7C5CFF]/80 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {downloading !== null ? '下载中...' : '下载文件'}
            </button>
          ) : (
            /* 文件夹 - 批量下载按钮 */
            <div className="space-y-2">
              {selectedCount > 0 && (
                <button
                  onClick={handleDownloadSelected}
                  disabled={downloading !== null || (share?.hasPassword && !password)}
                  className="w-full py-3 bg-[#7C5CFF] hover:bg-[#7C5CFF]/80 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {downloading !== null ? `下载中 (${downloading})...` : `下载选中 (${selectedCount} 个文件)`}
                </button>
              )}
              <button
                onClick={handleDownloadAll}
                disabled={downloading !== null || (share?.hasPassword && !password)}
                className="w-full py-3 bg-white/[0.08] hover:bg-white/[0.12] disabled:opacity-40 disabled:cursor-not-allowed text-white/80 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 border border-white/10"
              >
                <Download className="w-4 h-4" />
                {downloading !== null ? '下载中...' : '下载全部文件'}
              </button>
            </div>
          )}

          {/* 下载错误提示 */}
          {error && share && (
            <div className="text-red-400 text-sm text-center mt-3">{error}</div>
          )}

          {/* 底部信息 */}
          <div className="text-center text-white/20 text-xs mt-4">
            分享于 {share?.createdAt ? new Date(share.createdAt).toLocaleString('zh-CN') : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
