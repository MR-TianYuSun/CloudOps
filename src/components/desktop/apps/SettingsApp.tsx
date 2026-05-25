'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, User, Shield, Bell, Database, Search, CheckCircle } from 'lucide-react';

export default function SettingsApp({ windowId }: { windowId: string }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [uploadDir, setUploadDir] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // 数据恢复状态
  const [scanning, setScanning] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [scanResult, setScanResult] = useState<{
    diskFiles: number; diskDirs: number; dbFiles: number; dbFolders: number; orphanFiles: number;
    orphans: Array<{ name: string; originalName: string; size: string; path: string; folder: string }>;
  } | null>(null);
  const [recoverResult, setRecoverResult] = useState<{
    recovered: number; recoveredFolders: number; skipped: number;
    errors: Array<{ filename: string; error: string }>;
  } | null>(null);

  const getToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || '';
    }
    return '';
  }, []);

  useEffect(() => {
    if (activeTab === 'system') {
      const token = getToken();
      if (token) {
        fetch('/api/system-settings', { headers: { Authorization: `Bearer ${token}` } })
          .then(res => res.json())
          .then(data => {
            if (data.success) setUploadDir(data.data.upload_dir || '');
          })
          .catch(() => {});
      }
    }
  }, [activeTab, getToken]);

  const handleSaveStorage = async () => {
    setSaving(true);
    setMessage('');
    try {
      const token = getToken();
      const res = await fetch('/api/system-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ upload_dir: uploadDir }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('存储路径已保存，新上传的文件将保存到新路径');
      } else {
        setMessage(data.error || '保存失败');
      }
    } catch {
      setMessage('网络错误');
    }
    setSaving(false);
  };

  const handleScan = async () => {
    const token = getToken();
    if (!token) return;
    setScanning(true);
    setScanResult(null);
    setRecoverResult(null);
    try {
      const res = await fetch('/api/system-settings/recover', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setScanResult(data.data);
      } else {
        setMessage(data.error || '扫描失败');
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setScanning(false);
    }
  };

  const handleRecover = async () => {
    const token = getToken();
    if (!token) return;
    setRecovering(true);
    setRecoverResult(null);
    try {
      const res = await fetch('/api/system-settings/recover', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRecoverResult(data.data);
        setScanResult(null);
      } else {
        setMessage(data.error || '恢复失败');
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setRecovering(false);
    }
  };

  const tabs = [
    { id: 'profile', label: '个人资料', icon: User },
    { id: 'security', label: '安全设置', icon: Shield },
    { id: 'notifications', label: '通知', icon: Bell },
    { id: 'system', label: '系统', icon: Database },
  ];

  return (
    <div className="w-full h-full flex bg-[#0d0f1a]/95">
      {/* 左侧导航 */}
      <div className="w-40 border-r border-border/20 p-2 shrink-0">
        <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
          <Settings className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-foreground/80">系统设置</span>
        </div>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors
              ${activeTab === tab.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}
            `}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 右侧内容 */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'profile' && (
          <div>
            <h2 className="text-sm font-medium text-foreground/90 mb-3">个人资料</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">用户名</label>
                <input className="w-full px-3 py-2 bg-white/5 border border-border/20 rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/40" defaultValue="admin" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">显示名称</label>
                <input className="w-full px-3 py-2 bg-white/5 border border-border/20 rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/40" defaultValue="管理员" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">邮箱</label>
                <input type="email" className="w-full px-3 py-2 bg-white/5 border border-border/20 rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/40" placeholder="admin@example.com" />
              </div>
              <button className="px-4 py-2 rounded-lg bg-primary/20 text-primary text-xs hover:bg-primary/30 transition-colors">
                保存修改
              </button>
            </div>
          </div>
        )}
        {activeTab === 'security' && (
          <div>
            <h2 className="text-sm font-medium text-foreground/90 mb-3">安全设置</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">当前密码</label>
                <input type="password" className="w-full px-3 py-2 bg-white/5 border border-border/20 rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/40" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">新密码</label>
                <input type="password" className="w-full px-3 py-2 bg-white/5 border border-border/20 rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/40" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">确认新密码</label>
                <input type="password" className="w-full px-3 py-2 bg-white/5 border border-border/20 rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/40" />
              </div>
              <button className="px-4 py-2 rounded-lg bg-primary/20 text-primary text-xs hover:bg-primary/30 transition-colors">
                修改密码
              </button>
            </div>
          </div>
        )}
        {activeTab === 'notifications' && (
          <div>
            <h2 className="text-sm font-medium text-foreground/90 mb-3">通知设置</h2>
            <p className="text-xs text-muted-foreground">暂无可配置的通知选项</p>
          </div>
        )}
        {activeTab === 'system' && (
          <div>
            <h2 className="text-sm font-medium text-foreground/90 mb-3">系统信息</h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-border/10">
                <span className="text-muted-foreground">版本</span>
                <span className="text-foreground/80">v2.0.0</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/10">
                <span className="text-muted-foreground">数据库</span>
                <span className="text-foreground/80">SQLite (WAL)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/10">
                <span className="text-muted-foreground">运行环境</span>
                <span className="text-foreground/80">Node.js</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/10">
                <span className="text-muted-foreground">存储引擎</span>
                <span className="text-foreground/80">本地文件系统</span>
              </div>
            </div>

            <h3 className="text-sm font-medium text-foreground/90 mt-5 mb-3">存储路径配置</h3>
            <p className="text-xs text-muted-foreground mb-2">
              修改此路径后，新上传的文件将保存到新路径。已有文件不受影响。建议使用独立于项目目录的路径，避免更新代码时丢失数据。
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">文件存储目录</label>
                <input
                  className="w-full px-3 py-2 bg-white/5 border border-border/20 rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/40 font-mono"
                  value={uploadDir}
                  onChange={(e) => setUploadDir(e.target.value)}
                  placeholder="/data/cloudops/uploads"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveStorage}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-primary/20 text-primary text-xs hover:bg-primary/30 transition-colors disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存路径'}
                </button>
                {message && (
                  <span className={`text-xs ${message.includes('成功') || message.includes('已保存') ? 'text-emerald-400' : 'text-red-400'}`}>
                    {message}
                  </span>
                )}
              </div>
            </div>

            {/* 数据恢复 */}
            <div className="mt-5 pt-4 border-t border-border/20">
              <h3 className="text-sm font-medium text-foreground/90 mb-2 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-primary" />
                数据恢复
              </h3>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 mb-2">
                <p className="text-[10px] text-yellow-300">
                  覆盖部署导致数据库丢失时，可扫描磁盘文件并恢复到数据库，自动还原文件夹结构。
                </p>
              </div>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={handleScan}
                  disabled={scanning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-primary/80 text-white hover:bg-primary disabled:opacity-50"
                >
                  <Search className="w-3 h-3" />
                  {scanning ? '扫描中...' : '扫描'}
                </button>
                {scanResult && scanResult.orphanFiles > 0 && (
                  <button
                    onClick={handleRecover}
                    disabled={recovering}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50"
                  >
                    <Database className="w-3 h-3" />
                    {recovering ? '恢复中...' : `恢复(${scanResult.orphanFiles})`}
                  </button>
                )}
              </div>
              {scanResult && (
                <div className="bg-white/5 rounded-lg p-2 space-y-1">
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div className="bg-white/5 rounded p-1.5 text-center">
                      <p className="font-bold text-foreground">{scanResult.diskFiles}</p>
                      <p className="text-muted-foreground">磁盘文件</p>
                    </div>
                    <div className="bg-white/5 rounded p-1.5 text-center">
                      <p className="font-bold text-yellow-400">{scanResult.orphanFiles}</p>
                      <p className="text-muted-foreground">待恢复</p>
                    </div>
                  </div>
                  {scanResult.orphanFiles > 0 && scanResult.orphans.length > 0 && (
                    <div className="max-h-32 overflow-y-auto space-y-0.5 mt-1">
                      {scanResult.orphans.map((orphan, i) => (
                        <div key={i} className="flex items-center gap-1 text-[10px] py-0.5 px-1.5 rounded bg-white/5">
                          <span>{orphan.folder === '/' ? '📄' : '📁'}</span>
                          <span className="truncate text-foreground">{orphan.originalName}</span>
                          {orphan.folder !== '/' && (
                            <span className="text-muted-foreground truncate">({orphan.folder})</span>
                          )}
                          <span className="text-muted-foreground ml-auto shrink-0">{orphan.size}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {scanResult.orphanFiles === 0 && (
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> 所有文件已注册
                    </p>
                  )}
                </div>
              )}
              {recoverResult && (
                <div className="bg-white/5 rounded-lg p-2 mt-2">
                  <p className="text-[10px]">
                    恢复完成: <span className="text-emerald-400">{recoverResult.recovered} 个文件</span>
                    {recoverResult.recoveredFolders > 0 && <span className="text-primary ml-1">({recoverResult.recoveredFolders} 个文件夹)</span>}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
