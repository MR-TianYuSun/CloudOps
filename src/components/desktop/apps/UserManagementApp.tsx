'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Trash2, Shield } from 'lucide-react';

interface UserItem {
  id: number;
  username: string;
  display_name: string;
  role: string;
  status: string;
  storage_quota: number;
  storage_used: number;
  created_at: string;
}

export default function UserManagementApp({ windowId }: { windowId: string }) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    try {
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.code === 200) setUsers(data.data);
    } catch (err) {
      console.error('获取用户列表失败', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return `${size.toFixed(1)} ${units[i]}`;
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0d0f1a]/95">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20 bg-[#0e1020]/50">
        <Users className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-foreground/80">用户管理</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">加载中...</div>
        ) : (
          <div className="space-y-1.5">
            {users.map(user => (
              <div key={user.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-border/10 hover:border-border/20 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                  {user.display_name?.charAt(0) || user.username.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground/90">{user.display_name || user.username}</div>
                  <div className="text-[10px] text-muted-foreground/50">@{user.username} · {formatBytes(user.storage_used)} / {formatBytes(user.storage_quota)}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-white/5 text-muted-foreground'
                  }`}>
                    {user.role === 'admin' ? '管理员' : '用户'}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    user.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {user.status === 'active' ? '正常' : '禁用'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
