'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload, FolderPlus, Search, List, Grid3X3,
  Folder, File, Download, Share2, Trash2, Eye,
  ChevronRight, MoreHorizontal, ArrowLeft, Pencil, X,
  RotateCcw, Copy, Move, CheckSquare, Link2, Lock,
} from 'lucide-react';
import { FilePreview } from '@/components/file-preview';

interface FileItem {
  id: number;
  name: string;
  isFolder: boolean;
  size: number;
  sizeText: string;
  mimeType: string;
  fileExt: string;
  fileCategory: string;
  parentId: number;
  uploaderName: string;
  createdAt: string;
  updatedAt: string;
}

interface CategoryInfo {
  label: string;
  color: string;
  icon: string;
}

const CATEGORY_MAP: Record<string, CategoryInfo> = {
  document: { label: '文档', color: '#3B82F6', icon: 'doc' },
  spreadsheet: { label: '表格', color: '#22C55E', icon: 'xls' },
  presentation: { label: '演示', color: '#F97316', icon: 'ppt' },
  text: { label: '文本', color: '#8B5CF6', icon: 'txt' },
  image: { label: '图片', color: '#EC4899', icon: 'img' },
  audio: { label: '音频', color: '#EAB308', icon: 'aud' },
  video: { label: '视频', color: '#EF4444', icon: 'vid' },
  code: { label: '代码', color: '#06B6D4', icon: 'code' },
  archive: { label: '压缩包', color: '#F59E0B', icon: 'zip' },
  data: { label: '数据', color: '#14B8A6', icon: 'data' },
  other: { label: '其他', color: '#9AA7C7', icon: 'file' },
};

const PREVIEWABLE = ['document', 'spreadsheet', 'presentation', 'text', 'image', 'data', 'code'];

function getCategoryInfo(category: string): CategoryInfo {
  return CATEGORY_MAP[category] || CATEGORY_MAP.other;
}

function getCategoryIcon(category: string) {
  const info = getCategoryInfo(category);
  return (
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
      style={{ backgroundColor: info.color }}
    >
      {info.icon.toUpperCase()}
    </div>
  );
}

export default function CloudDrivePage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentParentId, setCurrentParentId] = useState(0);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: number; name: string }[]>([{ id: 0, name: '全部文件' }]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{ fileId: number; x: number; y: number } | null>(null);
  const [spaceType, setSpaceType] = useState<'personal' | 'team'>('personal');
  const [teamId, setTeamId] = useState<number | null>(null);
  const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // === P0: 回收站 ===
  const [showTrash, setShowTrash] = useState(false);
  const [trashFiles, setTrashFiles] = useState<FileItem[]>([]);

  // === P0: 批量操作 ===
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // === P0: 外链分享 ===
  const [shareModal, setShareModal] = useState<{ fileId: number; fileName: string } | null>(null);
  const [sharePassword, setSharePassword] = useState('');
  const [shareExpiry, setShareExpiry] = useState('0');
  const [shareResult, setShareResult] = useState<{ code: string; url: string } | null>(null);
  const [shareLoading, setShareLoading] = useState(false);

  // === P0: 移动/复制 ===
  const [moveModal, setMoveModal] = useState<{ fileIds: number[]; mode: 'move' | 'copy' } | null>(null);
  const [moveTargetId, setMoveTargetId] = useState(0);
  const [moveFolders, setMoveFolders] = useState<FileItem[]>([]);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // 加载用户团队列表
  useEffect(() => {
    if (!token) return;
    fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.code === 200) setTeams((data.data || []).map((t: Record<string, unknown>) => ({ id: t.id as number, name: t.name as string }))); })
      .catch(() => {});
  }, [token]);

  const fetchFiles = useCallback(async () => {
    if (!token) return;
    const baseUrl = spaceType === 'team' && teamId
      ? `/api/teams/${teamId}/files?parent_id=${currentParentId}`
      : `/api/files?parent_id=${currentParentId}`;
    const res = await fetch(baseUrl, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.code === 200) setFiles(data.data || []);
  }, [token, currentParentId, spaceType, teamId]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  // 点击空白关闭右键菜单
  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  // === 文件上传（带进度条）===
  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !token) return;
    setUploading(true);
    setUploadProgress(0);
    const total = fileList.length;
    const uploadUrl = spaceType === 'team' && teamId
      ? `/api/teams/${teamId}/files`
      : '/api/files/upload';

    for (let i = 0; i < total; i++) {
      const file = fileList[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('parent_id', String(currentParentId));

      await new Promise<void>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const fileProgress = event.loaded / event.total;
            const overallProgress = ((i + fileProgress) / total) * 100;
            setUploadProgress(Math.round(overallProgress));
          }
        };
        xhr.onload = () => resolve();
        xhr.onerror = () => resolve();
        xhr.send(formData);
      });
    }

    setUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    fetchFiles();
  };

  // === 创建文件夹 ===
  const handleMkdir = async () => {
    if (!newFolderName.trim() || !token) return;
    const res = await fetch('/api/files/mkdir', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName.trim(), parent_id: currentParentId }),
    });
    const data = await res.json();
    if (data.code === 200) {
      setNewFolderName('');
      setShowNewFolder(false);
      fetchFiles();
    }
  };

  // === 删除（移入回收站）===
  const handleDelete = async (id: number) => {
    if (!token || !confirm('确定要删除吗？文件将移入回收站')) return;
    const res = await fetch(`/api/files/${id}/delete`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.code === 200) fetchFiles();
  };

  // === 批量删除 ===
  const handleBatchDelete = async () => {
    if (!token || selectedIds.size === 0 || !confirm(`确定要删除选中的 ${selectedIds.size} 个文件吗？`)) return;
    for (const id of selectedIds) {
      await fetch(`/api/files/${id}/delete`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    setSelectedIds(new Set());
    setBatchMode(false);
    fetchFiles();
  };

  // === 重命名 ===
  const handleRename = async (id: number) => {
    if (!renameValue.trim() || !token) return;
    const res = await fetch('/api/files/rename', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: renameValue.trim() }),
    });
    const data = await res.json();
    if (data.code === 200) {
      setRenamingId(null);
      fetchFiles();
    }
  };

  // === 下载 ===
  const handleDownload = async (file: FileItem) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/files/download?id=${file.id}&token=${token}`);
      if (!res.ok) { alert('下载失败'); return; }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch { alert('下载失败'); }
  };

  // === 搜索 ===
  const handleSearch = async () => {
    if (!searchQuery.trim() || !token) return;
    setIsSearching(true);
    const res = await fetch(`/api/files/search?q=${encodeURIComponent(searchQuery.trim())}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.code === 200) setFiles(data.data || []);
  };

  // === 回收站 ===
  const fetchTrash = async () => {
    if (!token) return;
    const res = await fetch('/api/files/trash', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.code === 200) setTrashFiles(data.data || []);
  };

  const handleRestore = async (id: number) => {
    if (!token) return;
    const res = await fetch(`/api/files/${id}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.code === 200) { fetchTrash(); fetchFiles(); }
  };

  const handlePermanentDelete = async (id: number) => {
    if (!token || !confirm('永久删除无法恢复，确定吗？')) return;
    const res = await fetch(`/api/files/${id}/delete?permanent=true`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.code === 200) fetchTrash();
  };

  // === 外链分享 ===
  const handleShare = async () => {
    if (!shareModal || !token) return;
    setShareLoading(true);
    setShareResult(null);
    const res = await fetch('/api/shares', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId: shareModal.fileId,
        password: sharePassword || undefined,
        expiresIn: Number(shareExpiry) ? Number(shareExpiry) * 24 : undefined,
      }),
    });
    const data = await res.json();
    if (data.code === 200) {
      const domain = window.location.origin;
      setShareResult({ code: data.data.shareCode, url: `${domain}/s/${data.data.shareCode}` });
    }
    setShareLoading(false);
  };

  // === 移动/复制 ===
  const fetchMoveFolders = async () => {
    if (!token) return;
    const res = await fetch('/api/files?parent_id=0', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.code === 200) setMoveFolders((data.data || []).filter((f: FileItem) => f.isFolder));
  };

  const handleMoveOrCopy = async () => {
    if (!moveModal || !token) return;
    const res = await fetch('/api/files/move', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileIds: moveModal.fileIds,
        targetFolderId: moveTargetId || null,
        action: moveModal.mode,
      }),
    });
    const data = await res.json();
    if (data.code === 200) {
      setMoveModal(null);
      setSelectedIds(new Set());
      setBatchMode(false);
      fetchFiles();
    }
  };

  // === 拖拽上传 ===
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    handleUpload(e.dataTransfer.files);
  };

  // === 导航 ===
  const enterFolder = (folder: FileItem) => {
    setCurrentParentId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setIsSearching(false);
  };
  const navigateTo = (index: number) => {
    const target = breadcrumbs[index];
    setCurrentParentId(target.id);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setIsSearching(false);
  };
  const goBack = () => {
    if (breadcrumbs.length <= 1) return;
    const prev = breadcrumbs[breadcrumbs.length - 2];
    setCurrentParentId(prev.id);
    setBreadcrumbs((b) => b.slice(0, -1));
    setIsSearching(false);
  };

  // 右键菜单
  const handleContextMenu = (e: React.MouseEvent, fileId: number) => {
    e.preventDefault();
    setContextMenu({ fileId, x: e.clientX, y: e.clientY });
  };

  // 排序：文件夹在前
  const sortedFiles = [...files].sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return a.name.localeCompare(b.name);
  });

  // 批量选择
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedFiles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedFiles.map(f => f.id)));
    }
  };

  // 当前右键菜单对应的文件
  const contextFile = contextMenu ? sortedFiles.find(f => f.id === contextMenu.fileId) : null;

  return (
    <div
      className="max-w-6xl mx-auto space-y-4"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 空间切换 + 面包屑 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-surface-container rounded-lg p-0.5">
            <button
              onClick={() => { setSpaceType('personal'); setTeamId(null); setCurrentParentId(0); setBreadcrumbs([{ id: 0, name: '全部文件' }]); setShowTrash(false); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${spaceType === 'personal' && !showTrash ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              个人空间
            </button>
            <button
              onClick={() => { setSpaceType('team'); setShowTrash(false); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${spaceType === 'team' && !showTrash ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              团队空间
            </button>
            <button
              onClick={() => { setShowTrash(true); fetchTrash(); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${showTrash ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              回收站
            </button>
          </div>
          {spaceType === 'team' && !showTrash && (
            <select
              value={teamId || ''}
              onChange={(e) => { const tid = Number(e.target.value); setTeamId(tid || null); setCurrentParentId(0); setBreadcrumbs([{ id: 0, name: '全部文件' }]); }}
              className="bg-surface-container border border-border rounded-lg px-2 py-1.5 text-xs text-foreground"
            >
              <option value="">选择团队</option>
              {teams.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>
          )}
        </div>
        {/* 面包屑 */}
        {!showTrash && (
          <div className="flex items-center gap-2 text-sm">
            {isSearching && (
              <button onClick={() => { setIsSearching(false); fetchFiles(); setSearchQuery(''); }}
                className="p-1.5 rounded-lg hover:bg-surface-container transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {breadcrumbs.map((bc, i) => (
              <span key={bc.id} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />}
                <button
                  onClick={() => navigateTo(i)}
                  className={`hover:text-primary transition-colors ${i === breadcrumbs.length - 1 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                >
                  {bc.name}
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 回收站视图 */}
      {showTrash ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">回收站中的文件将在 30 天后自动清除</h2>
            <button onClick={() => setShowTrash(false)} className="text-sm text-primary hover:underline">返回文件列表</button>
          </div>
          {trashFiles.length === 0 ? (
            <div className="bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl p-12 text-center">
              <Trash2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">回收站为空</p>
            </div>
          ) : (
            <div className="bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_100px_120px_120px] gap-4 px-4 py-2.5 text-xs text-muted-foreground/60 border-b border-border/20">
                <span>名称</span>
                <span>大小</span>
                <span>删除时间</span>
                <span>操作</span>
              </div>
              {trashFiles.map((file) => (
                <div key={file.id} className="grid grid-cols-[1fr_100px_120px_120px] gap-4 px-4 py-3 items-center hover:bg-surface-container/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    {file.isFolder ? <Folder className="w-5 h-5 text-yellow-400 shrink-0" /> : getCategoryIcon(file.fileCategory)}
                    <span className="truncate text-sm">{file.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{file.isFolder ? '-' : file.sizeText}</span>
                  <span className="text-sm text-muted-foreground">{new Date(file.updatedAt).toLocaleDateString('zh-CN')}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleRestore(file.id)} className="p-1 rounded hover:bg-surface-container transition-colors text-primary" title="恢复">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button onClick={() => handlePermanentDelete(file.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors" title="永久删除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 操作按钮行 */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* 搜索 */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  className="bg-surface-container border-none rounded-lg pl-9 pr-3 py-2 text-sm w-40 sm:w-48 focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40"
                  placeholder="搜索文件..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              {/* 批量操作 */}
              {batchMode ? (
                <>
                  <button onClick={toggleSelectAll} className="flex items-center gap-1.5 px-3 py-2 bg-surface-container hover:bg-surface-container/80 rounded-lg text-sm transition-colors">
                    <CheckSquare className="w-4 h-4" /> {selectedIds.size === sortedFiles.length ? '取消全选' : '全选'}
                  </button>
                  {selectedIds.size > 0 && (
                    <>
                      <button onClick={handleBatchDelete} className="flex items-center gap-1.5 px-3 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg text-sm transition-colors">
                        <Trash2 className="w-4 h-4" /> 删除({selectedIds.size})
                      </button>
                      <button onClick={() => { setMoveModal({ fileIds: Array.from(selectedIds), mode: 'move' }); fetchMoveFolders(); }} className="flex items-center gap-1.5 px-3 py-2 bg-surface-container hover:bg-surface-container/80 rounded-lg text-sm transition-colors">
                        <Move className="w-4 h-4" /> 移动({selectedIds.size})
                      </button>
                      <button onClick={() => { setMoveModal({ fileIds: Array.from(selectedIds), mode: 'copy' }); fetchMoveFolders(); }} className="flex items-center gap-1.5 px-3 py-2 bg-surface-container hover:bg-surface-container/80 rounded-lg text-sm transition-colors">
                        <Copy className="w-4 h-4" /> 复制({selectedIds.size})
                      </button>
                    </>
                  )}
                  <button onClick={() => { setBatchMode(false); setSelectedIds(new Set()); }} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    取消
                  </button>
                </>
              ) : (
                <>
                  {/* 视图切换 */}
                  <div className="flex bg-surface-container rounded-lg p-0.5">
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                      <List className="w-4 h-4" />
                    </button>
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                  </div>
                  {/* 上传 */}
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors">
                    <Upload className="w-4 h-4" /> <span className="hidden sm:inline">上传</span>
                  </button>
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
                  {/* 新建文件夹 */}
                  <button onClick={() => setShowNewFolder(true)} className="flex items-center gap-1.5 px-3 py-2 bg-surface-container hover:bg-surface-container/80 rounded-lg text-sm transition-colors">
                    <FolderPlus className="w-4 h-4" /> <span className="hidden sm:inline">新建文件夹</span>
                  </button>
                  {/* 批量操作入口 */}
                  <button onClick={() => setBatchMode(true)} className="flex items-center gap-1.5 px-3 py-2 bg-surface-container hover:bg-surface-container/80 rounded-lg text-sm transition-colors">
                    <CheckSquare className="w-4 h-4" /> <span className="hidden sm:inline">批量操作</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 上传进度 */}
          {uploading && (
            <div className="bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">上传中...</span>
                <span className="text-sm text-accent">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-surface-container rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {/* 新建文件夹弹窗 */}
          {showNewFolder && (
            <div className="bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl p-4 flex items-center gap-3">
              <Folder className="w-5 h-5 text-yellow-400" />
              <input className="flex-1 bg-surface-container border-none rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                placeholder="文件夹名称" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMkdir()} autoFocus />
              <button onClick={handleMkdir} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm">创建</button>
              <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="px-3 py-2 bg-surface-container rounded-lg text-sm">取消</button>
            </div>
          )}

          {/* 拖拽提示 */}
          {isDragging && (
            <div className="border-2 border-dashed border-primary/50 rounded-xl p-12 text-center bg-primary/5">
              <Upload className="w-10 h-10 text-primary mx-auto mb-3" />
              <p className="text-lg font-medium">松开鼠标上传文件</p>
            </div>
          )}

          {/* 空状态 */}
          {sortedFiles.length === 0 && !uploading && !isDragging && (
            <div className="bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl p-12 text-center">
              <Folder className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">暂无文件，上传或创建文件夹开始使用</p>
              <p className="text-xs text-muted-foreground/50 mt-1">支持拖拽文件到此处上传</p>
            </div>
          )}

          {/* 列表视图 */}
          {viewMode === 'list' && sortedFiles.length > 0 && (
            <div className="bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl overflow-hidden">
              <div className={`grid gap-4 px-4 py-2.5 text-xs text-muted-foreground/60 border-b border-border/20 ${batchMode ? 'grid-cols-[32px_1fr_80px_120px_80px]' : 'grid-cols-[1fr_80px_120px_80px_80px]'}`}>
                {batchMode && <span><input type="checkbox" checked={selectedIds.size === sortedFiles.length} onChange={toggleSelectAll} className="accent-primary" /></span>}
                <span>名称</span>
                <span className="hidden sm:block">大小</span>
                <span className="hidden sm:block">修改时间</span>
                <span className="hidden sm:block">上传者</span>
                <span>操作</span>
              </div>
              {sortedFiles.map((file) => (
                <div
                  key={file.id}
                  className={`grid gap-4 px-4 py-3 items-center hover:bg-surface-container/30 transition-colors cursor-pointer group ${batchMode ? 'grid-cols-[32px_1fr_80px_120px_80px]' : 'grid-cols-[1fr_80px_120px_80px_80px]'} ${selectedIds.has(file.id) ? 'bg-primary/5' : ''}`}
                  onClick={() => batchMode ? toggleSelect(file.id) : (file.isFolder ? enterFolder(file) : setPreviewFile(file))}
                  onContextMenu={(e) => handleContextMenu(e, file.id)}
                >
                  {batchMode && (
                    <span><input type="checkbox" checked={selectedIds.has(file.id)} onChange={() => toggleSelect(file.id)} className="accent-primary" onClick={(e) => e.stopPropagation()} /></span>
                  )}
                  <div className="flex items-center gap-3 min-w-0">
                    {file.isFolder ? <Folder className="w-5 h-5 text-yellow-400 shrink-0" /> : getCategoryIcon(file.fileCategory)}
                    {renamingId === file.id ? (
                      <input className="bg-surface-container border-none rounded px-2 py-1 text-sm flex-1 min-w-0 focus:outline-none focus:ring-1 focus:ring-primary/50"
                        value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRename(file.id); if (e.key === 'Escape') setRenamingId(null); }}
                        onBlur={() => setRenamingId(null)} autoFocus onClick={(e) => e.stopPropagation()} />
                    ) : (
                      <span className="truncate text-sm">{file.name}</span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground hidden sm:block">{file.isFolder ? '-' : file.sizeText}</span>
                  <span className="text-sm text-muted-foreground hidden sm:block">{new Date(file.updatedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-sm text-muted-foreground hidden sm:block">{file.uploaderName || '-'}</span>
                  <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {!file.isFolder && PREVIEWABLE.includes(file.fileCategory) && (
                      <button onClick={(e) => { e.stopPropagation(); setPreviewFile(file); }} className="p-1 rounded hover:bg-surface-container transition-colors" title="预览"><Eye className="w-3.5 h-3.5" /></button>
                    )}
                    {!file.isFolder && (
                      <button onClick={(e) => { e.stopPropagation(); handleDownload(file); }} className="p-1 rounded hover:bg-surface-container transition-colors" title="下载"><Download className="w-3.5 h-3.5" /></button>
                    )}
                    {!file.isFolder && (
                      <button onClick={(e) => { e.stopPropagation(); setShareModal({ fileId: file.id, fileName: file.name }); setShareResult(null); setSharePassword(''); setShareExpiry('7'); }} className="p-1 rounded hover:bg-surface-container transition-colors" title="分享"><Share2 className="w-3.5 h-3.5" /></button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setMoveModal({ fileIds: [file.id], mode: 'move' }); fetchMoveFolders(); }} className="p-1 rounded hover:bg-surface-container transition-colors" title="移动"><Move className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); setMoveModal({ fileIds: [file.id], mode: 'copy' }); fetchMoveFolders(); }} className="p-1 rounded hover:bg-surface-container transition-colors" title="复制"><Copy className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); setRenamingId(file.id); setRenameValue(file.name); }} className="p-1 rounded hover:bg-surface-container transition-colors" title="重命名"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }} className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors" title="删除"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 网格视图 */}
          {viewMode === 'grid' && sortedFiles.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {sortedFiles.map((file) => (
                <div
                  key={file.id}
                  className={`bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl p-4 hover:border-primary/30 transition-colors cursor-pointer group ${selectedIds.has(file.id) ? 'border-primary/50 bg-primary/5' : ''}`}
                  onClick={() => batchMode ? toggleSelect(file.id) : (file.isFolder ? enterFolder(file) : setPreviewFile(file))}
                  onContextMenu={(e) => handleContextMenu(e, file.id)}
                >
                  {batchMode && (
                    <div className="flex justify-end mb-1">
                      <input type="checkbox" checked={selectedIds.has(file.id)} onChange={() => toggleSelect(file.id)} className="accent-primary" />
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-2">
                    {file.isFolder ? <Folder className="w-10 h-10 text-yellow-400" /> : (
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: getCategoryInfo(file.fileCategory).color }}>
                        {file.fileExt?.toUpperCase().slice(0, 3) || 'FILE'}
                      </div>
                    )}
                    <span className="text-sm text-center truncate w-full">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{file.isFolder ? '文件夹' : file.sizeText}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {!file.isFolder && PREVIEWABLE.includes(file.fileCategory) && (
                      <button onClick={(e) => { e.stopPropagation(); setPreviewFile(file); }} className="p-1.5 rounded-lg hover:bg-surface-container text-muted-foreground hover:text-foreground" title="预览"><Eye className="w-3.5 h-3.5" /></button>
                    )}
                    {!file.isFolder && (
                      <button onClick={(e) => { e.stopPropagation(); handleDownload(file); }} className="p-1.5 rounded-lg hover:bg-surface-container text-muted-foreground hover:text-foreground" title="下载"><Download className="w-3.5 h-3.5" /></button>
                    )}
                    {!file.isFolder && (
                      <button onClick={(e) => { e.stopPropagation(); setShareModal({ fileId: file.id, fileName: file.name }); setShareResult(null); setSharePassword(''); setShareExpiry('7'); }} className="p-1.5 rounded-lg hover:bg-surface-container text-muted-foreground hover:text-foreground" title="分享"><Share2 className="w-3.5 h-3.5" /></button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="删除"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 右键菜单 */}
      {contextMenu && contextFile && (
        <div className="fixed z-50 bg-surface/95 backdrop-blur-xl border border-border/30 rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 200), top: Math.min(contextMenu.y, window.innerHeight - 300) }}
          onClick={(e) => e.stopPropagation()}
        >
          {!contextFile.isFolder && PREVIEWABLE.includes(contextFile.fileCategory) && (
            <button onClick={() => { setPreviewFile(contextFile); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-container transition-colors"><Eye className="w-4 h-4" /> 预览</button>
          )}
          {!contextFile.isFolder && (
            <button onClick={() => { handleDownload(contextFile); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-container transition-colors"><Download className="w-4 h-4" /> 下载</button>
          )}
          {!contextFile.isFolder && (
            <button onClick={() => { setShareModal({ fileId: contextFile.id, fileName: contextFile.name }); setShareResult(null); setSharePassword(''); setShareExpiry('7'); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-container transition-colors"><Share2 className="w-4 h-4" /> 分享</button>
          )}
          <button onClick={() => { setMoveModal({ fileIds: [contextFile.id], mode: 'move' }); fetchMoveFolders(); setContextMenu(null); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-container transition-colors"><Move className="w-4 h-4" /> 移动到</button>
          <button onClick={() => { setMoveModal({ fileIds: [contextFile.id], mode: 'copy' }); fetchMoveFolders(); setContextMenu(null); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-container transition-colors"><Copy className="w-4 h-4" /> 复制到</button>
          <button onClick={() => { setRenamingId(contextFile.id); setRenameValue(contextFile.name); setContextMenu(null); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-container transition-colors"><Pencil className="w-4 h-4" /> 重命名</button>
          <div className="border-t border-border/20 my-1" />
          <button onClick={() => { handleDelete(contextFile.id); setContextMenu(null); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="w-4 h-4" /> 删除</button>
        </div>
      )}

      {/* 文件预览弹窗 */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
          onClick={() => setPreviewFile(null)}>
          <div className="bg-surface border border-border/30 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border/20">
              <div className="flex items-center gap-3 min-w-0">
                {getCategoryIcon(previewFile.fileCategory)}
                <div className="min-w-0">
                  <h3 className="font-medium text-sm truncate">{previewFile.name}</h3>
                  <p className="text-xs text-muted-foreground">{previewFile.sizeText} · {getCategoryInfo(previewFile.fileCategory).label}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => handleDownload(previewFile)} className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container hover:bg-surface-container/80 rounded-lg text-sm transition-colors">
                  <Download className="w-3.5 h-3.5" /> 下载
                </button>
                <button onClick={() => setPreviewFile(null)} className="p-1.5 rounded-lg hover:bg-surface-container transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <FilePreview fileId={previewFile.id} fileName={previewFile.name} fileExt={previewFile.fileExt || previewFile.name?.split('.').pop() || ''} onClose={() => setPreviewFile(null)} />
            </div>
          </div>
        </div>
      )}

      {/* 外链分享弹窗 */}
      {shareModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShareModal(null)}>
          <div className="bg-surface border border-border/30 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">分享文件</h3>
              <button onClick={() => setShareModal(null)} className="p-1 rounded hover:bg-surface-container"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">分享「{shareModal.fileName}」</p>

            {!shareResult ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">访问密码（可选）</label>
                  <div className="flex items-center gap-2">
                    <input className="flex-1 bg-surface-container border-none rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                      placeholder="留空则无需密码" value={sharePassword} onChange={(e) => setSharePassword(e.target.value)} />
                    <button onClick={() => setSharePassword(Math.random().toString(36).slice(2, 8))} className="px-3 py-2 bg-surface-container rounded-lg text-sm hover:bg-surface-container/80">随机</button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">有效期</label>
                  <select value={shareExpiry} onChange={(e) => setShareExpiry(e.target.value)}
                    className="w-full bg-surface-container border-none rounded-lg px-3 py-2 text-sm text-foreground">
                    <option value="1">1 天</option>
                    <option value="7">7 天</option>
                    <option value="30">30 天</option>
                    <option value="0">永久</option>
                  </select>
                </div>
                <button onClick={handleShare} disabled={shareLoading}
                  className="w-full py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {shareLoading ? '生成中...' : '创建分享链接'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-surface-container rounded-lg p-3">
                  <label className="text-xs text-muted-foreground mb-1 block">分享链接</label>
                  <div className="flex items-center gap-2">
                    <input className="flex-1 bg-transparent text-sm truncate" value={shareResult.url} readOnly />
                    <button onClick={() => { navigator.clipboard.writeText(shareResult.url); }} className="px-3 py-1 bg-primary/10 text-primary rounded text-sm hover:bg-primary/20">复制</button>
                  </div>
                </div>
                {sharePassword && (
                  <div className="bg-surface-container rounded-lg p-3">
                    <label className="text-xs text-muted-foreground mb-1 block">访问密码</label>
                    <div className="flex items-center gap-2">
                      <input className="flex-1 bg-transparent text-sm" value={sharePassword} readOnly />
                      <button onClick={() => { navigator.clipboard.writeText(sharePassword); }} className="px-3 py-1 bg-primary/10 text-primary rounded text-sm hover:bg-primary/20">复制</button>
                    </div>
                  </div>
                )}
                <div className="bg-surface-container rounded-lg p-3">
                  <label className="text-xs text-muted-foreground mb-1 block">提取码</label>
                  <div className="flex items-center gap-2">
                    <input className="flex-1 bg-transparent text-sm font-mono" value={shareResult.code} readOnly />
                    <button onClick={() => { navigator.clipboard.writeText(shareResult.code); }} className="px-3 py-1 bg-primary/10 text-primary rounded text-sm hover:bg-primary/20">复制</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 移动/复制弹窗 */}
      {moveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setMoveModal(null)}>
          <div className="bg-surface border border-border/30 rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">{moveModal.mode === 'move' ? '移动到' : '复制到'}</h3>
              <button onClick={() => setMoveModal(null)} className="p-1 rounded hover:bg-surface-container"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 mb-4 max-h-60 overflow-auto">
              <button onClick={() => setMoveTargetId(0)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${moveTargetId === 0 ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container'}`}>
                <Folder className="w-4 h-4 text-yellow-400" /> 根目录
              </button>
              {moveFolders.map((f) => (
                <button key={f.id} onClick={() => setMoveTargetId(f.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${moveTargetId === f.id ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container'}`}>
                  <Folder className="w-4 h-4 text-yellow-400" /> {f.name}
                </button>
              ))}
            </div>
            <button onClick={handleMoveOrCopy}
              className="w-full py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors">
              确认{moveModal.mode === 'move' ? '移动' : '复制'}
            </button>
          </div>
        </div>
      )}

      {/* 底部状态栏 */}
      {!showTrash && (
        <div className="text-xs text-muted-foreground/60 text-right">
          共 {sortedFiles.length} 项 · {sortedFiles.filter((f) => !f.isFolder).reduce((sum, f) => sum + f.size, 0) > 0
            ? formatSize(sortedFiles.filter((f) => !f.isFolder).reduce((sum, f) => sum + f.size, 0))
            : '0 B'}
        </div>
      )}
    </div>
  );
}

function formatSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
