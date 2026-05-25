'use client';

import { useState, useEffect } from 'react';
import { Globe, Copy, Check, ExternalLink, Info } from 'lucide-react';

export default function WebdavSettingsApp({ windowId }: { windowId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [port, setPort] = useState('1900');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [webdavOrigin, setWebdavOrigin] = useState('http://localhost');

  useEffect(() => {
    setWebdavOrigin(window.location.origin);
  }, []);

  const webdavUrl = `${webdavOrigin}/${enabled ? port : ''}`;

  const handleSave = async () => {
    setSaving(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    try {
      await fetch('/api/webdav/config', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, port: Number(port), username, password }),
      });
    } catch {
      // fallback
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(webdavUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0d0f1a]/95">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20 bg-[#0e1020]/50">
        <Globe className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-foreground/80">WebDAV 设置</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* 开关 */}
        <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-white/[0.03] border border-border/10">
          <div>
            <div className="text-sm text-foreground/90">启用 WebDAV 服务</div>
            <div className="text-[10px] text-muted-foreground/60 mt-0.5">允许通过 WebDAV 协议访问云盘文件</div>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`w-10 h-5 rounded-full transition-colors relative ${enabled ? 'bg-primary' : 'bg-white/10'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* 连接信息 */}
        {enabled && (
          <>
            <div className="mb-3">
              <label className="text-xs text-muted-foreground mb-1.5 block">WebDAV 地址</label>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2 bg-white/5 border border-border/20 rounded-lg text-xs text-foreground/80 font-mono truncate">
                  {webdavUrl}
                </div>
                <button onClick={copyUrl} className="px-2 py-2 rounded-lg bg-white/5 border border-border/20 text-muted-foreground hover:text-foreground transition-colors">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="mb-3">
              <label className="text-xs text-muted-foreground mb-1.5 block">端口</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-border/20 rounded-lg text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
              />
            </div>

            <div className="mb-3">
              <label className="text-xs text-muted-foreground mb-1.5 block">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="WebDAV 访问用户名"
                className="w-full px-3 py-2 bg-white/5 border border-border/20 rounded-lg text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
              />
            </div>

            <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-1.5 block">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="WebDAV 访问密码"
                className="w-full px-3 py-2 bg-white/5 border border-border/20 rounded-lg text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
              />
            </div>
          </>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors disabled:opacity-40"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>

        {/* 使用说明 */}
        <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-border/10">
          <div className="flex items-center gap-1.5 mb-2">
            <Info className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground/80">使用说明</span>
          </div>
          <ul className="text-[10px] text-muted-foreground/60 space-y-1 list-disc list-inside">
            <li>Windows: 在资源管理器中映射网络驱动器，输入 WebDAV 地址</li>
            <li>macOS: Finder → 前往 → 连接服务器 → 输入地址</li>
            <li>Linux: 使用 davfs2 挂载或 Nautilus 连接服务器</li>
            <li>移动端: 使用支持 WebDAV 的文件管理器</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
