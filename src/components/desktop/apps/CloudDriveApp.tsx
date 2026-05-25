'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Folder, File, Upload, Download, Trash2, Share2,
  MoreVertical, ArrowLeft, Search, RefreshCw, Plus, FolderPlus, Grid, List
} from 'lucide-react';
import { useDesktopStore } from '../DesktopStore';
import { getAppById } from '../AppRegistry';

interface FileItem {
  id: number;
  name: string;
  is_folder: number;
  size: number;
  file_category: string;
  file_ext: string;
  created_at: string;
  updated_at: string;
}

export default function CloudDriveApp({ windowId }: { windowId: string }) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState<number>(0);
  const [pathStack, setPathStack] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [dragOver, setDragOver] = useState(false);

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchFiles = useCallback(async (parentId: number = 0) => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/files?parent_id=${parentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 200) {
        setFiles((data.data || []).filter((f: FileItem & { deleted_at?: string | null }) => !f.deleted_at));
      }
    } catch (err) {
      console.error('获取文件列表失败', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath, fetchFiles]);

  const handleOpenFolder = (file: FileItem) => {
    if (file.is_folder) {
      setPathStack(prev => [...prev, { id: currentPath, name: file.name }]);
      setCurrentPath(file.id);
    }
    // Track recent file
    const token = getToken();
    if (token) {
      fetch('/api/recent-files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id, action: 'view' }),
      }).catch(() => {});
    }
  };

  const handleGoBack = () => {
    if (pathStack.length > 0) {
      const prev = pathStack[pathStack.length - 1];
      setPathStack(p => p.slice(0, -1));
      setCurrentPath(prev.id);
    }
  };

  const handleDelete = async (fileId: number) => {
    const token = getToken();
    await fetch(`/api/files/${fileId}/delete`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchFiles(currentPath);
  };

  const handleUpload = async (files: FileList, basePath: string = '') => {
    const token = getToken();
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      if (currentPath) formData.append('parent_id', String(currentPath));
      if (basePath) formData.append('folder_path', basePath);
      await fetch('/api/files/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    }
    fetchFiles(currentPath);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const items = e.dataTransfer.items;
    if (items) {
      const filePromises: Promise<File>[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry?.isFile) {
          filePromises.push(new Promise<File>((resolve) => {
            (entry as FileSystemFileEntry).file(resolve);
          }));
        }
      }
      const fileArray = await Promise.all(filePromises);
      if (fileArray.length > 0) {
        const dt = new DataTransfer();
        fileArray.forEach(f => dt.items.add(f));
        handleUpload(dt.files);
      }
    } else {
      handleUpload(e.dataTransfer.files);
    }
  };

  const handleNewDocument = () => {
    const appDef = getAppById('collab-editor');
    if (appDef) useDesktopStore.getState().openApp(appDef);
  };

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return `${size.toFixed(1)} ${units[i]}`;
  };

  const getFileIcon = (file: FileItem) => {
    if (file.is_folder) return '📁';
    const cat = file.file_category;
    const ext = file.file_ext?.toLowerCase();
    if (cat === 'spreadsheet' || ext === 'xlsx' || ext === 'xls') return '📊';
    if (cat === 'presentation' || ext === 'pptx' || ext === 'ppt') return '📽️';
    if (cat === 'image') return '🖼️';
    if (cat === 'video') return '🎬';
    if (cat === 'audio') return '🎵';
    if (cat === 'document') return '📄';
    if (ext === 'pdf') return '📕';
    if (cat === 'code') return '💻';
    if (cat === 'archive') return '📦';
    return '📄';
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0d0f1a]/95">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20 bg-[#0e1020]/50">
        {pathStack.length > 0 && (
          <button onClick={handleGoBack} className="p-1.5 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <Folder className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs text-muted-foreground truncate">
            {pathStack.length > 0 ? pathStack.map(p => p.name).join(' / ') : '根目录'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'hover:bg-white/5 text-muted-foreground'}`}>
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'hover:bg-white/5 text-muted-foreground'}`}>
            <List className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-border/30" />
          <button onClick={handleNewDocument} className="p-1.5 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors" title="新建文档">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <label className="p-1.5 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" title="上传文件">
            <Upload className="w-3.5 h-3.5" />
            <input type="file" multiple className="hidden" onChange={(e) => e.target.files && handleUpload(e.target.files)} />
          </label>
          <button onClick={() => fetchFiles(currentPath)} className="p-1.5 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="px-3 py-2 border-b border-border/10">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="搜索文件..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-border/20 rounded-md text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
          />
        </div>
      </div>

      {/* 文件列表 */}
      <div
        className={`flex-1 overflow-y-auto p-3 ${dragOver ? 'bg-primary/5 border-2 border-dashed border-primary/30' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {loading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            加载中...
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Folder className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">暂无文件</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2">
            {filteredFiles.map(file => (
              <div
                key={file.id}
                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-colors"
                onDoubleClick={() => handleOpenFolder(file)}
              >
                <span className="text-3xl">{getFileIcon(file)}</span>
                <span className="text-[11px] text-foreground/80 text-center line-clamp-2 leading-tight w-full">{file.name}</span>
                <div className="hidden group-hover:flex items-center gap-0.5 mt-0.5">
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }} className="p-0.5 rounded hover:bg-red-500/20 text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredFiles.map(file => (
              <div
                key={file.id}
                className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer transition-colors"
                onDoubleClick={() => handleOpenFolder(file)}
              >
                <span className="text-lg">{getFileIcon(file)}</span>
                <span className="flex-1 text-xs text-foreground/80 truncate">{file.name}</span>
                <span className="text-[10px] text-muted-foreground/60">{formatSize(file.size)}</span>
                <span className="text-[10px] text-muted-foreground/60">{new Date(file.created_at).toLocaleDateString()}</span>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }} className="p-0.5 rounded hover:bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
