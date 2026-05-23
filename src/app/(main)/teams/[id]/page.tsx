'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Users, Plus, UserPlus, LogOut, Trash2, Upload, FolderOpen, FileText,
  Download, Eye, ArrowLeft, X, MoreHorizontal, Search,
} from 'lucide-react';
import FilePreview from '@/components/file-preview/FilePreview';
import { getCategoryColor, type FileCategory } from '@/lib/file-types';

function getCatIcon(category: string) {
  const cat = category as FileCategory;
  const color = getCategoryColor(cat);
  const labels: Record<string, string> = {
    document: 'DOC', image: 'IMG', audio: 'AUD', video: 'VID',
    code: 'CODE', archive: 'ZIP', data: 'DATA', executable: 'EXE',
    design: 'DSN', font: 'FONT', other: 'FILE', folder: 'DIR',
  };
  return (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: color }}>
      {labels[category] || 'FILE'}
    </div>
  );
}

interface TeamInfo {
  id: number;
  name: string;
  description: string;
  my_role: string;
  member_count: number;
}

interface MemberInfo {
  id: number;
  username: string;
  display_name: string;
  role: string;
  joined_at: string;
}

interface FileInfo {
  id: number;
  name: string;
  isFolder: boolean;
  size: number;
  sizeText: string;
  mimeType: string | null;
  fileExt: string | null;
  fileCategory: string;
  parentId: number | null;
  uploaderName: string;
  createdAt: string;
}

interface PreviewFile {
  id: number;
  name: string;
  ext: string;
  mimeType: string;
}

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [teamId, setTeamId] = useState<string>('');
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'files' | 'members'>('files');
  const [token, setToken] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentParentId, setCurrentParentId] = useState<number | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: number | null; name: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    params.then((p) => setTeamId(p.id));
  }, [params]);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (t) setToken(t);
  }, []);

  const fetchTeam = useCallback(async () => {
    if (!teamId || !token) return;
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 200) setTeam(data.data);
      else { alert(data.message); return; }
    } catch { /* ignore */ }
  }, [teamId, token]);

  const fetchMembers = useCallback(async () => {
    if (!teamId || !token) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 200) setMembers(data.data || []);
    } catch { /* ignore */ }
  }, [teamId, token]);

  const fetchFiles = useCallback(async (parentId: number | null = null) => {
    if (!teamId || !token) return;
    try {
      const url = `/api/teams/${teamId}/files${parentId ? `?parent_id=${parentId}` : '?parent_id=0'}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 200) setFiles(data.data || []);
    } catch { /* ignore */ }
  }, [teamId, token]);

  useEffect(() => {
    if (teamId && token) {
      fetchTeam();
      fetchMembers();
      fetchFiles(null);
      setLoading(false);
    }
  }, [teamId, token, fetchTeam, fetchMembers, fetchFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('parent_id', currentParentId?.toString() || '0');

      // 使用 XMLHttpRequest 获取上传进度
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/teams/${teamId}/files`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const fileProgress = ((i + event.loaded / event.total) / fileList.length) * 100;
            setUploadProgress(Math.round(fileProgress));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error('上传失败'));
          }
        };

        xhr.onerror = () => reject(new Error('上传失败'));
        xhr.send(formData);
      });
    }

    setUploading(false);
    setUploadProgress(0);
    fetchFiles(currentParentId);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleInvite = async () => {
    if (!inviteUsername.trim()) return;
    const res = await fetch(`/api/teams/${teamId}/invite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: inviteUsername.trim() }),
    });
    const data = await res.json();
    if (data.code === 200) {
      setShowInvite(false);
      setInviteUsername('');
      fetchMembers();
    } else {
      alert(data.message);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!confirm('确定移除此成员？')) return;
    const res = await fetch(`/api/teams/${teamId}/members?user_id=${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.code === 200) fetchMembers();
    else alert(data.message);
  };

  const handleLeave = async () => {
    if (!confirm('确定退出此团队？')) return;
    const res = await fetch(`/api/teams/${teamId}/leave`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.code === 200) {
      window.location.href = '/teams';
    } else {
      alert(data.message);
    }
  };

  const handleFolderClick = (folder: FileInfo) => {
    setCurrentParentId(folder.id);
    setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
    fetchFiles(folder.id);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === 0) {
      setCurrentParentId(null);
      setBreadcrumbs([]);
      fetchFiles(null);
    } else {
      const target = breadcrumbs[index];
      setCurrentParentId(target.id);
      setBreadcrumbs(breadcrumbs.slice(0, index + 1));
      fetchFiles(target.id);
    }
  };

  const handlePreview = (file: FileInfo) => {
    if (file.isFolder) {
      handleFolderClick(file);
      return;
    }
    setPreviewFile({
      id: file.id,
      name: file.name,
      ext: file.fileExt || '',
      mimeType: file.mimeType || 'application/octet-stream',
    });
  };

  if (loading || !team) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/teams" className="p-2 rounded-lg hover:bg-surface-container text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderOpen className="w-7 h-7 text-primary" />{team.name}
            </h1>
            <p className="text-muted-foreground text-sm">{team.description || '暂无描述'} · {team.my_role === 'owner' ? '创建者' : team.my_role === 'admin' ? '管理员' : '成员'}</p>
          </div>
        </div>
        {team.my_role !== 'owner' && (
          <button onClick={handleLeave} className="px-3 py-1.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 flex items-center gap-1.5">
            <LogOut className="w-4 h-4" />退出团队
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container/50 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('files')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'files' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <FileText className="w-4 h-4 inline mr-1.5" />文件
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'members' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Users className="w-4 h-4 inline mr-1.5" />成员 ({members.length})
        </button>
      </div>

      {/* Files Tab */}
      {activeTab === 'files' && (
        <div className="space-y-4">
          {/* Upload bar */}
          <div className="flex items-center justify-between">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1 text-sm">
              <button onClick={() => handleBreadcrumbClick(0)} className="text-muted-foreground hover:text-foreground">根目录</button>
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="text-muted-foreground">/</span>
                  <button onClick={() => handleBreadcrumbClick(i + 1)} className="text-muted-foreground hover:text-foreground">{crumb.name}</button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {uploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-32 h-2 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <span>{uploadProgress}%</span>
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />{uploading ? '上传中...' : '上传文件'}
              </button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />
            </div>
          </div>

          {/* File list */}
          {files.length === 0 ? (
            <div className="bg-surface/60 backdrop-blur-xl rounded-xl border border-border p-12 text-center">
              <FileText className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground">团队空间暂无文件</p>
            </div>
          ) : (
            <div className="bg-surface/60 backdrop-blur-xl rounded-xl border border-border overflow-hidden">
              {files.map((file) => (
                <div
                  key={file.id}
                  onClick={() => handlePreview(file)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surface-container/50 cursor-pointer border-b border-border/50 last:border-0 transition-colors"
                >
                  <span>
                    {file.isFolder ? <FolderOpen className="w-5 h-5" /> : getCatIcon(file.fileCategory)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{file.uploaderName} · {file.createdAt}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!file.isFolder && (
                      <>
                        <span className="text-xs text-muted-foreground">{file.sizeText}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); window.open(`/api/files/download?id=${file.id}&token=${token}`, '_blank'); }}
                          className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary"
                          title="下载"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePreview(file); }}
                          className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary"
                          title="预览"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {(team.my_role === 'owner' || team.my_role === 'admin') && (
              <button
                onClick={() => setShowInvite(true)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 text-sm font-medium flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />邀请成员
              </button>
            )}
          </div>

          <div className="bg-surface/60 backdrop-blur-xl rounded-xl border border-border overflow-hidden">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                  {(member.display_name || member.username).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-foreground text-sm">{member.display_name || member.username}</p>
                  <p className="text-xs text-muted-foreground">@{member.username}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  member.role === 'owner' ? 'bg-amber-500/20 text-amber-400' :
                  member.role === 'admin' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-surface-container text-muted-foreground'
                }`}>
                  {member.role === 'owner' ? '创建者' : member.role === 'admin' ? '管理员' : '成员'}
                </span>
                {(team.my_role === 'owner' || team.my_role === 'admin') && member.role !== 'owner' && member.id !== members.find(m => m.username === localStorage.getItem('username'))?.id && (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    title="移除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowInvite(false)}>
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">邀请成员</h2>
              <button onClick={() => setShowInvite(false)} className="p-1 rounded-md hover:bg-surface-container"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">用户名</label>
                <input value={inviteUsername} onChange={(e) => setInviteUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container border border-border text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="输入要邀请的用户名" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowInvite(false)} className="px-4 py-2 rounded-lg bg-surface-container text-foreground">取消</button>
                <button onClick={handleInvite} className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-medium">邀请</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setPreviewFile(null)}>
          <div className="w-full h-full max-w-5xl max-h-[90vh] m-4" onClick={(e) => e.stopPropagation()}>
            <FilePreview
              fileId={previewFile.id}
              fileName={previewFile.name}
              fileExt={previewFile.ext}
              ownerType="team"
              ownerId={Number(teamId)}
              onClose={() => setPreviewFile(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
