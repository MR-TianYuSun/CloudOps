'use client';

import { useState, useEffect } from 'react';
import { Clock, FileText, Folder, ArrowRight } from 'lucide-react';

interface RecentFile {
  id: number;
  name: string;
  is_folder: number;
  size: number;
  file_category: string;
  file_ext: string;
  created_at: string;
  updated_at: string;
  last_action?: string;
  accessed_at?: string;
  owner_name?: string;
}

export default function RecentFilesApp({ windowId }: { windowId: string }) {
  const [files, setFiles] = useState<RecentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    const token = getToken();
    fetch('/api/recent-files', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) setFiles(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return `${size.toFixed(1)} ${units[i]}`;
  };

  const getFileIcon = (file: RecentFile) => {
    if (file.is_folder) return '📁';
    const cat = file.file_category;
    if (cat === 'image') return '🖼️';
    if (cat === 'video') return '🎬';
    if (cat === 'audio') return '🎵';
    if (cat === 'document') return '📄';
    if (cat === 'code') return '💻';
    return '📄';
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0d0f1a]/95">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20 bg-[#0e1020]/50">
        <Clock className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-foreground/80">最近文件</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">加载中...</div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Clock className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">暂无最近访问的文件</p>
          </div>
        ) : (
          <div className="space-y-1">
            {files.map(file => (
              <div
                key={file.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
              >
                <span className="text-xl shrink-0">{getFileIcon(file)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground/90 truncate">{file.name}</div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50 mt-0.5">
                    <span>{formatSize(file.size)}</span>
                    <span>·</span>
                    <span>{formatTime(file.updated_at)}</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
