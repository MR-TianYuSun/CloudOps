'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users, Plus, UserPlus, LogOut, Trash2, ChevronRight, FolderOpen, X,
} from 'lucide-react';

interface TeamInfo {
  id: number;
  name: string;
  description: string;
  owner_id: number;
  my_role: string;
  member_count: number;
  created_at: string;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [joinId, setJoinId] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (t) setToken(t);
  }, []);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch('/api/teams', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 200) setTeams(data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { if (token) fetchTeams(); }, [token, fetchTeams]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.code === 200) {
      setShowCreate(false);
      setForm({ name: '', description: '' });
      fetchTeams();
    } else {
      alert(data.message);
    }
  };

  const handleJoin = async () => {
    if (!joinId.trim()) return;
    const res = await fetch(`/api/teams/${joinId.trim()}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.code === 200) {
      setShowJoin(false);
      setJoinId('');
      fetchTeams();
    } else {
      alert(data.message);
    }
  };

  const handleLeave = async (teamId: number) => {
    if (!confirm('确定退出此团队？')) return;
    const res = await fetch(`/api/teams/${teamId}/leave`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.code === 200) fetchTeams();
    else alert(data.message);
  };

  const handleDissolve = async (teamId: number) => {
    if (!confirm('确定解散此团队？此操作不可撤销！')) return;
    const res = await fetch(`/api/teams/${teamId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.code === 200) fetchTeams();
    else alert(data.message);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" />团队空间
          </h1>
          <p className="text-muted-foreground mt-1">管理你的团队，共享文件资源</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowJoin(true)}
            className="px-4 py-2 rounded-lg bg-surface-container border border-border text-foreground hover:bg-surface-container-high text-sm"
          >
            加入团队
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 text-sm font-medium flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />创建团队
          </button>
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="bg-surface/60 backdrop-blur-xl rounded-xl border border-border p-12 text-center">
          <Users className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">还没有加入任何团队</p>
          <p className="text-muted-foreground/60 text-sm mt-1">创建一个团队或加入已有团队</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-surface/60 backdrop-blur-xl rounded-xl border border-border p-5 hover:border-primary/40 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-foreground font-semibold">{team.name}</h3>
                    <p className="text-muted-foreground text-xs">
                      {team.member_count} 名成员 · 角色: {team.my_role === 'owner' ? '创建者' : team.my_role === 'admin' ? '管理员' : '成员'}
                    </p>
                  </div>
                </div>
              </div>

              {team.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{team.description}</p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">ID: {team.id}</span>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/teams/${team.id}`}
                    className="px-3 py-1.5 rounded-md bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-colors flex items-center gap-1"
                  >
                    进入 <ChevronRight className="w-3 h-3" />
                  </Link>
                  {team.my_role === 'owner' ? (
                    <button
                      onClick={() => handleDissolve(team.id)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="解散团队"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLeave(team.id)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="退出团队"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 创建团队弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">创建团队</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-md hover:bg-surface-container"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">团队名称 *</label>
                <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container border border-border text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="我的团队" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">描述</label>
                <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container border border-border text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  rows={3} placeholder="团队描述（可选）" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg bg-surface-container text-foreground">取消</button>
                <button onClick={handleCreate} className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-medium">创建</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 加入团队弹窗 */}
      {showJoin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowJoin(false)}>
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">加入团队</h2>
              <button onClick={() => setShowJoin(false)} className="p-1 rounded-md hover:bg-surface-container"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">团队 ID</label>
                <input value={joinId} onChange={(e) => setJoinId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container border border-border text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="输入团队 ID" type="number" />
                <p className="text-xs text-muted-foreground mt-1">请向团队创建者索取团队 ID</p>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowJoin(false)} className="px-4 py-2 rounded-lg bg-surface-container text-foreground">取消</button>
                <button onClick={handleJoin} className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-medium">加入</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
