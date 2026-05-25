'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Search, Shield, User, Eye, Trash2, X } from 'lucide-react';

interface UserItem {
  id: number;
  username: string;
  displayName: string;
  role: string;
  status: string;
  storageUsed: number;
  storageQuota: number;
  lastLogin: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: '管理员', color: 'bg-primary/20 text-primary' },
  user: { label: '普通用户', color: 'bg-accent/20 text-accent' },
  guest: { label: '访客', color: 'bg-muted/30 text-muted-foreground' },
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ username: '', displayName: '', password: '', role: 'user' });
  const [currentRole, setCurrentRole] = useState<string>('user');

  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem('token'));
  }, []);

  const fetchUsers = async () => {
    const t = localStorage.getItem('token');
    if (!t) return;
    const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    if (data.code === 200) {
      const rawUsers = data.data?.users || data.data || [];
      const mapped = rawUsers.map((u: Record<string, unknown>) => ({
        id: u.id as number,
        username: (u.username || u.user_name || '') as string,
        displayName: (u.display_name || u.displayName || '') as string,
        role: (u.role || 'user') as string,
        status: (u.status || 'active') as string,
        storageUsed: (u.storage_used || u.storageUsed || 0) as number,
        storageQuota: (u.storage_quota || u.storageQuota || 0) as number,
        lastLogin: (u.last_login_at || u.last_login || u.lastLogin || '') as string,
        createdAt: (u.created_at || u.createdAt || '') as string,
      }));
      setUsers(mapped);
    }
  };

  useEffect(() => { if (token) fetchUsers(); }, [token]);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => { if (d.code === 200) setCurrentRole(d.data.role); });
  }, [token]);

  const handleAddUser = async () => {
    if (!addForm.username || !addForm.password) return;
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    });
    const data = await res.json();
    if (data.code === 200) {
      setShowAdd(false);
      setAddForm({ username: '', displayName: '', password: '', role: 'user' });
      fetchUsers();
    } else {
      alert(data.message);
    }
  };

  const handleToggleStatus = async (user: UserItem) => {
    if (!token) return;
    const action = user.status === 'active' ? 'disable' : 'enable';
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, action }),
    });
    const data = await res.json();
    if (data.code === 200) fetchUsers();
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('确定删除该用户？此操作不可恢复')) return;
    const res = await fetch(`/api/users?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.code === 200) fetchUsers();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filtered = users.filter((u) => u.username.includes(searchQuery) || u.displayName.includes(searchQuery));

  if (currentRole !== 'admin') {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl p-12 text-center">
          <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">仅管理员可访问此页面</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* 工具栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">用户管理</h1>
          <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">{users.length} 人</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <input
              className="w-full sm:w-48 bg-surface-container border-none rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              placeholder="搜索用户..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
            <UserPlus className="w-4 h-4" /> <span className="hidden sm:inline">添加用户</span><span className="sm:hidden">添加</span>
          </button>
        </div>
      </div>

      {/* 添加用户弹窗 */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-surface border border-border/30 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">添加用户</h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-surface-container"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">用户名</label>
                <input className="w-full bg-surface-container border-none rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  value={addForm.username} onChange={(e) => setAddForm((f) => ({ ...f, username: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">显示名称</label>
                <input className="w-full bg-surface-container border-none rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  value={addForm.displayName} onChange={(e) => setAddForm((f) => ({ ...f, displayName: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">密码</label>
                <input type="password" className="w-full bg-surface-container border-none rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  value={addForm.password} onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">角色</label>
                <select className="w-full bg-surface-container border-none rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  value={addForm.role} onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}>
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                  <option value="guest">访客</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-surface-container rounded-lg text-sm">取消</button>
                <button onClick={handleAddUser} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">创建</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 桌面端表格 */}
      <div className="hidden md:block bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_80px_120px_80px_80px] gap-4 px-4 py-2.5 text-xs text-muted-foreground/60 border-b border-border/20">
          <span>用户</span>
          <span>角色</span>
          <span>状态</span>
          <span>存储配额</span>
          <span>登录</span>
          <span>操作</span>
        </div>
        {filtered.map((u) => {
          const roleInfo = ROLE_LABELS[u.role] || ROLE_LABELS.user;
          const quotaPercent = u.storageQuota > 0 ? Math.min((u.storageUsed / u.storageQuota) * 100, 100) : 0;
          return (
            <div key={u.id} className="grid grid-cols-[1fr_80px_80px_120px_80px_80px] gap-4 px-4 py-3 items-center hover:bg-surface-container/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                  {(u.displayName || u.username)[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{u.displayName || u.username}</p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${roleInfo.color}`}>{roleInfo.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${u.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {u.status === 'active' ? '正常' : '禁用'}
              </span>
              <div>
                <div className="text-xs text-muted-foreground mb-1">{formatSize(u.storageUsed)} / {u.storageQuota > 0 ? formatSize(u.storageQuota) : '无限'}</div>
                <div className="w-full bg-surface-container rounded-full h-1.5">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: `${quotaPercent}%` }} />
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('zh-CN') : '-'}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => handleToggleStatus(u)}
                  className="p-1 rounded hover:bg-surface-container transition-colors" title={u.status === 'active' ? '禁用' : '启用'}>
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDeleteUser(u.id)}
                  className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors" title="删除">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 移动端卡片列表 */}
      <div className="md:hidden space-y-3">
        {filtered.map((u) => {
          const roleInfo = ROLE_LABELS[u.role] || ROLE_LABELS.user;
          return (
            <div key={u.id} className="bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                    {(u.displayName || u.username)[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{u.displayName || u.username}</p>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleToggleStatus(u)} className="p-2 rounded-lg hover:bg-surface-container transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteUser(u.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full ${roleInfo.color}`}>{roleInfo.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${u.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {u.status === 'active' ? '正常' : '禁用'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatSize(u.storageUsed)} / {u.storageQuota > 0 ? formatSize(u.storageQuota) : '无限'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 角色说明 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(ROLE_LABELS).map(([key, info]) => (
          <div key={key} className="bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {key === 'admin' ? '拥有全部权限，可管理用户、服务器和系统设置' :
                key === 'user' ? '可使用云盘、查看服务器状态，不可管理用户' :
                  '仅可查看共享文件，不可上传或管理'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
