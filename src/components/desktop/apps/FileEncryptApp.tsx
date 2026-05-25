'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, Lock, Unlock, Eye, EyeOff, AlertTriangle, FileText, RefreshCw } from 'lucide-react';

interface FileItem {
  id: number;
  name: string;
  is_encrypted: number;
  size: number;
}

export default function FileEncryptApp({ windowId }: { windowId: string }) {
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);

  const getToken = useCallback(() => typeof window !== 'undefined' ? localStorage.getItem('token') : null, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch('/api/files?parent_id=0', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.success || data.code === 200) {
          setFiles((data.data || []).filter((f: FileItem) => !f.name.endsWith('/')));
        }
      })
      .catch(() => {});
  }, [getToken]);

  const handleAction = async () => {
    if (!selectedFileId || !password) return;
    if (mode === 'encrypt' && password !== confirmPassword) {
      setMessage({ type: 'error', text: '两次密码不一致' });
      return;
    }
    setProcessing(true);
    setMessage(null);

    try {
      const token = getToken();
      const endpoint = mode === 'encrypt'
        ? `/api/encryption/encrypt/${selectedFileId}`
        : `/api/encryption/decrypt/${selectedFileId}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          type: 'success',
          text: mode === 'encrypt' ? '文件加密成功' : '文件解密成功',
        });
        setPassword('');
        setConfirmPassword('');
        // Refresh file list
        const listRes = await fetch('/api/files?parentId=0', { headers: { Authorization: `Bearer ${token}` } });
        const listData = await listRes.json();
        if (listData.success || listData.code === 200) {
          setFiles((listData.data || []).filter((f: FileItem) => !f.name.endsWith('/')));
        }
      } else {
        setMessage({ type: 'error', text: data.error || '操作失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '操作失败，请重试' });
    } finally {
      setProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return `${size.toFixed(1)} ${units[i]}`;
  };

  const selectedFile = files.find(f => String(f.id) === selectedFileId);

  return (
    <div className="w-full h-full flex flex-col bg-[#0d0f1a]/95">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20 bg-[#0e1020]/50">
        <Shield className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-foreground/80">文件加密</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* 模式切换 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setMode('encrypt'); setMessage(null); }}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5
              ${mode === 'encrypt' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/[0.03] text-muted-foreground border border-border/20 hover:bg-white/[0.05]'}
            `}
          >
            <Lock className="w-3.5 h-3.5" />
            加密文件
          </button>
          <button
            onClick={() => { setMode('decrypt'); setMessage(null); }}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5
              ${mode === 'decrypt' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/[0.03] text-muted-foreground border border-border/20 hover:bg-white/[0.05]'}
            `}
          >
            <Unlock className="w-3.5 h-3.5" />
            解密文件
          </button>
        </div>

        {/* 文件选择 */}
        <div className="mb-3">
          <label className="text-xs text-muted-foreground mb-1.5 block">选择文件</label>
          <select
            value={selectedFileId}
            onChange={(e) => { setSelectedFileId(e.target.value); setMessage(null); }}
            className="w-full px-3 py-2 bg-white/5 border border-border/20 rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/40"
          >
            <option value="">选择一个文件...</option>
            {files.map(f => (
              <option key={f.id} value={f.id} className="bg-[#1a1d2e]">
                {f.name} {f.is_encrypted ? '🔒' : ''} ({formatSize(f.size)})
              </option>
            ))}
          </select>
        </div>

        {/* 文件信息 */}
        {selectedFile && (
          <div className="mb-3 p-2.5 rounded-lg bg-white/[0.02] border border-border/10 flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-foreground/80 truncate">{selectedFile.name}</div>
              <div className="text-[10px] text-muted-foreground/50">
                {formatSize(selectedFile.size)}
                {selectedFile.is_encrypted ? ' · 已加密 🔒' : ' · 未加密'}
              </div>
            </div>
          </div>
        )}

        {/* 密码输入 */}
        <div className="mb-3">
          <label className="text-xs text-muted-foreground mb-1.5 block">
            {mode === 'encrypt' ? '设置加密密码' : '输入解密密码'}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
              className="w-full px-3 py-2 pr-9 bg-white/5 border border-border/20 rounded-lg text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 确认密码 */}
        {mode === 'encrypt' && (
          <div className="mb-4">
            <label className="text-xs text-muted-foreground mb-1.5 block">确认密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
              className="w-full px-3 py-2 bg-white/5 border border-border/20 rounded-lg text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
            />
          </div>
        )}

        {/* 消息提示 */}
        {message && (
          <div className={`mb-3 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {message.type === 'error' && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
            {message.text}
          </div>
        )}

        {/* 操作按钮 */}
        <button
          onClick={handleAction}
          disabled={processing || !selectedFileId || !password}
          className="w-full py-2.5 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          {processing ? (
            <>
              <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              处理中...
            </>
          ) : (
            <>
              {mode === 'encrypt' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              {mode === 'encrypt' ? '加密文件' : '解密文件'}
            </>
          )}
        </button>

        {/* 说明 */}
        <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-border/10">
          <h4 className="text-xs font-medium text-foreground/80 mb-1.5">关于文件加密</h4>
          <ul className="text-[10px] text-muted-foreground/60 space-y-1 list-disc list-inside">
            <li>使用 AES-256-CBC 算法加密</li>
            <li>加密后文件无法直接预览，需解密后使用</li>
            <li>请妥善保管加密密码，密码丢失无法恢复</li>
            <li>加密操作不影响原文件的元数据</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
