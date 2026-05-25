'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, Shield, Database, Bell, Info, Save, CheckCircle, AlertTriangle, FolderOpen, Search, Users, UserCheck, UserX, Trash2 } from 'lucide-react';

const TABS = [
  { key: 'storage', label: '存储配置', icon: Database },
  { key: 'general', label: '基本设置', icon: Settings },
  { key: 'users', label: '用户管理', icon: Users },
  { key: 'security', label: '安全设置', icon: Shield },
  { key: 'about', label: '关于系统', icon: Info },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('storage');
  const [token, setToken] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 系统设置状态
  const [uploadDir, setUploadDir] = useState('');
  const [currentUploadDir, setCurrentUploadDir] = useState('');
  const [maxUploadSize, setMaxUploadSize] = useState('100');
  const [allowRegistration, setAllowRegistration] = useState('true');
  const [requireApproval, setRequireApproval] = useState('true');
  const [defaultQuota, setDefaultQuota] = useState('0');

  // 数据恢复状态
  const [recovering, setRecovering] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    diskFiles: number; diskDirs: number; dbFiles: number; dbFolders: number; orphanFiles: number;
    orphans: Array<{ name: string; originalName: string; size: string; path: string; folder: string }>;
  } | null>(null);
  const [recoverResult, setRecoverResult] = useState<{
    recovered: number; recoveredFolders: number; skipped: number;
    errors: Array<{ filename: string; error: string }>;
    recoveredFiles: Array<Record<string, unknown>>;
  } | null>(null);

  // 基本设置
  const [systemName, setSystemName] = useState('CloudOps');

  // 用户管理状态
  const [pendingUsers, setPendingUsers] = useState<Array<{ id: number; username: string; display_name: string; email: string; role: string; status: string; created_at: string }>>([]);
  const [allUsers, setAllUsers] = useState<Array<{ id: number; username: string; display_name: string; email: string; role: string; status: string; storage_quota: number; storage_used: number; created_at: string; last_login_at: string | null }>>([]);
  const [userFilter, setUserFilter] = useState<'all' | 'pending' | 'active' | 'rejected'>('all');
  const [userLoading, setUserLoading] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('token');
    setToken(t);
  }, []);

  const fetchSettings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/system-settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const settings = data.data;
        if (settings.upload_dir) { setUploadDir(settings.upload_dir); setCurrentUploadDir(settings.upload_dir); }
        if (settings.max_upload_size) setMaxUploadSize(String(Math.round(parseInt(settings.max_upload_size) / 1024 / 1024)));
        if (settings.allow_registration) setAllowRegistration(settings.allow_registration);
        if (settings.require_approval) setRequireApproval(settings.require_approval);
        if (settings.default_quota) setDefaultQuota(String(Math.round(parseInt(settings.default_quota) / 1024 / 1024)));
      }
    } catch {
      // 非管理员可能无法访问
    }
  }, [token]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // 用户管理
  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setUserLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 200) {
        const users = data.data.users || [];
        setAllUsers(users);
        setPendingUsers(users.filter((u: { status: string }) => u.status === 'pending'));
      }
    } catch {
      // ignore
    } finally {
      setUserLoading(false);
    }
  }, [token]);

  const handleApproveUser = async (userId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/users/${userId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success || data.code === 200) { fetchUsers(); }
    } catch { /* ignore */ }
  };

  const handleRejectUser = async (userId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/users/${userId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success || data.code === 200) { fetchUsers(); }
    } catch { /* ignore */ }
  };

  const handleDisableUser = async (userId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'disabled' }),
      });
      const data = await res.json();
      if (data.success || data.code === 200) { fetchUsers(); }
    } catch { /* ignore */ }
  };

  const handleEnableUser = async (userId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'active' }),
      });
      const data = await res.json();
      if (data.success || data.code === 200) { fetchUsers(); }
    } catch { /* ignore */ }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!token) return;
    if (!confirm('确定要删除该用户吗？此操作不可恢复。')) return;
    try {
      const res = await fetch(`/api/users/${userId}/delete`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success || data.code === 200) { fetchUsers(); }
    } catch { /* ignore */ }
  };

  // 当切换到用户管理tab时获取用户列表
  useEffect(() => {
    if (activeTab === 'users') { fetchUsers(); }
  }, [activeTab, fetchUsers]);

  const handleSave = async (settings: Record<string, string>) => {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      // 前端以MB展示，保存到DB需转换为字节
      const toSave: Record<string, string> = { ...settings };
      if (toSave.max_upload_size !== undefined) {
        const mb = parseInt(toSave.max_upload_size);
        toSave.max_upload_size = isNaN(mb) ? '0' : String(mb * 1024 * 1024);
      }
      if (toSave.default_quota !== undefined) {
        const mb = parseInt(toSave.default_quota);
        toSave.default_quota = isNaN(mb) ? '0' : String(mb * 1024 * 1024);
      }
      const res = await fetch('/api/system-settings', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(toSave),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        fetchSettings();
      } else {
        setError(data.error || '保存失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  const handleScan = async () => {
    if (!token) return;
    setScanning(true);
    setScanResult(null);
    setRecoverResult(null);
    setError(null);
    try {
      const res = await fetch('/api/system-settings/recover', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setScanResult(data.data);
      } else {
        setError(data.error || '扫描失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setScanning(false);
    }
  };

  const handleRecover = async () => {
    if (!token) return;
    setRecovering(true);
    setRecoverResult(null);
    setError(null);
    try {
      const res = await fetch('/api/system-settings/recover', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRecoverResult(data.data);
        // 恢复后刷新扫描结果
        setScanResult(null);
      } else {
        setError(data.error || '恢复失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setRecovering(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-xl font-bold mb-4">系统设置</h1>
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* 左侧Tab */}
        <div className="flex md:flex-col gap-1 md:w-48 md:shrink-0 overflow-x-auto md:overflow-visible pb-2 md:pb-0 -mb-2 md:mb-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setError(null); }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-surface-container/50 hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 min-w-0">
          {error && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* 存储配置 */}
          {activeTab === 'storage' && (
            <div className="bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl p-4 md:p-6 space-y-5">
              <h2 className="text-base font-bold">存储配置</h2>

              {/* 当前存储路径信息 */}
              <div className="bg-surface-container/50 border border-border/20 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FolderOpen className="w-4 h-4 text-primary" />
                  文件存储目录
                </div>
                <p className="text-xs text-muted-foreground">
                  当前路径: <code className="bg-surface-container px-1.5 py-0.5 rounded text-foreground">{currentUploadDir || '未配置'}</code>
                </p>
                <p className="text-xs text-muted-foreground">
                  修改存储路径后，新上传的文件将保存到新目录。已有文件不会自动迁移。
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">文件存储路径（绝对路径）</label>
                  <input
                    className="w-full bg-surface-container border-none rounded-lg px-3 py-2 text-sm"
                    value={uploadDir}
                    onChange={(e) => setUploadDir(e.target.value)}
                    placeholder="/var/lib/cloudops/uploads"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    建议使用项目目录外的路径（如 /var/lib/cloudops/uploads），避免覆盖源码时丢失文件
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">最大上传大小 (MB)</label>
                  <input
                    className="w-full bg-surface-container border-none rounded-lg px-3 py-2 text-sm"
                    type="number"
                    value={maxUploadSize}
                    onChange={(e) => setMaxUploadSize(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">默认存储配额 (MB，0=无限制)</label>
                  <input
                    className="w-full bg-surface-container border-none rounded-lg px-3 py-2 text-sm"
                    type="number"
                    value={defaultQuota}
                    onChange={(e) => setDefaultQuota(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => handleSave({ upload_dir: uploadDir, max_upload_size: maxUploadSize, default_quota: defaultQuota })}
                  disabled={saving}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    saved ? 'bg-green-500/20 text-green-400' : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  } disabled:opacity-50`}
                >
                  {saved ? <><CheckCircle className="w-4 h-4" />已保存</> : <><Save className="w-4 h-4" />{saving ? '保存中...' : '保存设置'}</>}
                </button>
              </div>

              {/* 数据恢复 */}
              <div className="mt-6 pt-6 border-t border-border/30">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  数据恢复
                </h3>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-3">
                  <p className="text-xs text-yellow-300">
                    如果因覆盖部署导致数据库丢失，但上传文件仍在磁盘上，可以使用此功能扫描存储目录，将未注册的文件重新导入数据库。恢复时会自动还原文件夹结构。
                  </p>
                </div>

                {/* 扫描按钮 */}
                <div className="flex gap-2">
                  <button
                    onClick={handleScan}
                    disabled={scanning}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary/80 text-white hover:bg-primary disabled:opacity-50"
                  >
                    <Search className="w-4 h-4" />
                    {scanning ? '扫描中...' : '扫描文件'}
                  </button>
                  {scanResult && scanResult.orphanFiles > 0 && (
                    <button
                      onClick={handleRecover}
                      disabled={recovering}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50"
                    >
                      <Database className="w-4 h-4" />
                      {recovering ? '恢复中...' : `恢复 ${scanResult.orphanFiles} 个文件`}
                    </button>
                  )}
                </div>

                {/* 扫描结果 */}
                {scanResult && (
                  <div className="mt-3 bg-surface-container/50 border border-border/20 rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div className="bg-surface/60 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-foreground">{scanResult.diskFiles}</p>
                        <p className="text-xs text-muted-foreground">磁盘文件</p>
                      </div>
                      <div className="bg-surface/60 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-foreground">{scanResult.diskDirs}</p>
                        <p className="text-xs text-muted-foreground">磁盘目录</p>
                      </div>
                      <div className="bg-surface/60 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-foreground">{scanResult.dbFiles}</p>
                        <p className="text-xs text-muted-foreground">数据库文件</p>
                      </div>
                      <div className="bg-surface/60 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-yellow-400">{scanResult.orphanFiles}</p>
                        <p className="text-xs text-muted-foreground">待恢复</p>
                      </div>
                    </div>

                    {scanResult.orphanFiles > 0 && scanResult.orphans.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">待恢复文件列表：</p>
                        <div className="max-h-48 overflow-y-auto space-y-0.5">
                          {scanResult.orphans.map((orphan, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-surface/40">
                              <span className="text-muted-foreground shrink-0">
                                {orphan.folder === '/' ? '📄' : '📁'}
                              </span>
                              <span className="truncate text-foreground" title={orphan.originalName}>
                                {orphan.originalName}
                              </span>
                              {orphan.folder !== '/' && (
                                <span className="text-muted-foreground truncate" title={orphan.folder}>
                                  ({orphan.folder})
                                </span>
                              )}
                              <span className="text-muted-foreground shrink-0 ml-auto">{orphan.size}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {scanResult.orphanFiles === 0 && (
                      <p className="text-sm text-green-400 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        所有文件已在数据库中注册，无需恢复
                      </p>
                    )}
                  </div>
                )}

                {/* 恢复结果 */}
                {recoverResult && (
                  <div className="mt-3 bg-surface-container/50 border border-border/20 rounded-lg p-3 space-y-1">
                    <p className="text-sm font-medium">
                      恢复完成: <span className="text-green-400">{recoverResult.recovered} 个文件已恢复</span>
                      {recoverResult.recoveredFolders > 0 && (
                        <span className="text-primary ml-2">({recoverResult.recoveredFolders} 个文件夹已创建)</span>
                      )}
                      {recoverResult.skipped > 0 && <span className="text-muted-foreground ml-2">({recoverResult.skipped} 个已注册)</span>}
                    </p>
                    {recoverResult.errors.length > 0 && (
                      <div className="mt-2 text-xs text-destructive space-y-0.5">
                        {recoverResult.errors.map((e, i) => (
                          <p key={i}>{e.filename}: {e.error}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 基本设置 */}
          {activeTab === 'general' && (
            <div className="bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl p-4 md:p-6 space-y-5">
              <h2 className="text-base font-bold">基本设置</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">系统名称</label>
                  <input className="w-full bg-surface-container border-none rounded-lg px-3 py-2 text-sm" value={systemName} onChange={(e) => setSystemName(e.target.value)} />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="text-sm">允许注册</p><p className="text-xs text-muted-foreground">允许新用户自行注册账号</p></div>
                  <button
                    onClick={() => setAllowRegistration(allowRegistration === 'true' ? 'false' : 'true')}
                    className={`w-10 h-6 rounded-full transition-colors ${allowRegistration === 'true' ? 'bg-primary' : 'bg-surface-container'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white m-1 transition-transform ${allowRegistration === 'true' ? 'ml-auto' : ''}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="text-sm">注册审核</p><p className="text-xs text-muted-foreground">新用户注册后需管理员审核通过才能登录</p></div>
                  <button
                    onClick={() => setRequireApproval(requireApproval === 'true' ? 'false' : 'true')}
                    className={`w-10 h-6 rounded-full transition-colors ${requireApproval === 'true' ? 'bg-primary' : 'bg-surface-container'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white m-1 transition-transform ${requireApproval === 'true' ? 'ml-auto' : ''}`} />
                  </button>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">回收站保留天数</label>
                  <input className="w-full bg-surface-container border-none rounded-lg px-3 py-2 text-sm" type="number" defaultValue="30" />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => handleSave({ allow_registration: allowRegistration, require_approval: requireApproval, system_name: systemName })}
                  disabled={saving}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    saved ? 'bg-green-500/20 text-green-400' : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  } disabled:opacity-50`}
                >
                  {saved ? <><CheckCircle className="w-4 h-4" />已保存</> : <><Save className="w-4 h-4" />{saving ? '保存中...' : '保存设置'}</>}
                </button>
              </div>
            </div>
          )}

          {/* 安全设置 */}
          {activeTab === 'security' && (
            <div className="bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl p-4 md:p-6 space-y-5">
              <h2 className="text-base font-bold">安全设置</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm">双因素认证</p><p className="text-xs text-muted-foreground">启用 TOTP 二步验证</p></div>
                  <div className="w-10 h-6 rounded-full bg-surface-container cursor-pointer"><div className="w-4 h-4 rounded-full bg-muted-foreground/40 m-1" /></div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">会话超时</label>
                  <select className="w-full bg-surface-container border-none rounded-lg px-3 py-2 text-sm">
                    <option>15 分钟</option><option selected>30 分钟</option><option>1 小时</option><option>2 小时</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 用户管理 */}
          {activeTab === 'users' && (
            <div className="bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl p-4 md:p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">用户管理</h2>
                {pendingUsers.length > 0 && (
                  <span className="px-2.5 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    {pendingUsers.length} 个待审核
                  </span>
                )}
              </div>

              {/* 待审核用户 */}
              {pendingUsers.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    待审核用户
                  </h3>
                  {pendingUsers.map((user) => (
                    <div key={user.id} className="bg-surface-container/50 border border-yellow-500/20 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold text-sm">
                          {(user.display_name || user.username).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{user.display_name || user.username}</p>
                          <p className="text-xs text-muted-foreground">{user.username} · 注册于 {new Date(user.created_at).toLocaleString('zh-CN')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApproveUser(user.id)}
                          className="px-3 py-1.5 text-xs rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors"
                        >
                          通过
                        </button>
                        <button
                          onClick={() => handleRejectUser(user.id)}
                          className="px-3 py-1.5 text-xs rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                        >
                          拒绝
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 全部用户 */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  全部用户 ({allUsers.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">用户</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">角色</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">状态</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">存储</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">注册时间</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map((user) => (
                        <tr key={user.id} className="border-b border-border/10 hover:bg-surface-container/30">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                                {(user.display_name || user.username).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm">{user.display_name || user.username}</p>
                                <p className="text-xs text-muted-foreground">{user.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              user.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                            }`}>
                              {user.role === 'admin' ? '管理员' : '用户'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              user.status === 'active' ? 'bg-green-500/20 text-green-400' :
                              user.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              user.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {user.status === 'active' ? '正常' :
                               user.status === 'pending' ? '待审核' :
                               user.status === 'rejected' ? '已拒绝' :
                               user.status === 'disabled' ? '已禁用' : user.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-xs text-muted-foreground">
                            {user.role !== 'admin' ? `${(user.storage_used / 1024 / 1024).toFixed(1)} MB` : '无限制'}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString('zh-CN')}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {user.role !== 'admin' && (
                              <div className="flex items-center justify-end gap-1">
                                {user.status === 'pending' && (
                                  <button
                                    onClick={() => handleApproveUser(user.id)}
                                    className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                                  >
                                    通过
                                  </button>
                                )}
                                {user.status === 'active' && (
                                  <button
                                    onClick={() => handleDisableUser(user.id)}
                                    className="px-2 py-1 text-xs rounded bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                                  >
                                    禁用
                                  </button>
                                )}
                                {user.status === 'disabled' && (
                                  <button
                                    onClick={() => handleEnableUser(user.id)}
                                    className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                                  >
                                    启用
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                >
                                  删除
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {allUsers.length === 0 && !userLoading && (
                  <p className="text-center text-muted-foreground py-8 text-sm">暂无用户数据</p>
                )}
              </div>
            </div>
          )}

          {/* 关于系统 */}
          {activeTab === 'about' && (
            <div className="bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl p-4 md:p-6 space-y-5">
              <h2 className="text-base font-bold">关于系统</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">系统版本</span><span>1.0.0</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">技术栈</span><span>Next.js 16 + React 19 + SQLite</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">数据库路径</span><span className="font-mono text-xs">{currentUploadDir ? currentUploadDir.replace('/uploads', '/cloudops.db') : '默认路径'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">上传目录</span><span className="font-mono text-xs">{currentUploadDir || '默认路径'}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
