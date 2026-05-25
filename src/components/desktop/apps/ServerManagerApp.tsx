'use client';

import { useState, useEffect, useCallback } from 'react';
import { Server, Plus, RefreshCw, Monitor, Wifi, WifiOff } from 'lucide-react';

interface ServerItem {
  id: number;
  name: string;
  ip_address: string;
  os_type: string;
  os_name: string;
  status: string;
  ssh_port: number;
  environment: string;
}

export default function ServerManagerApp({ windowId }: { windowId: string }) {
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchServers = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch('/api/servers', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.code === 200) setServers(data.data);
    } catch (err) {
      console.error('获取服务器列表失败', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchServers(); }, [fetchServers]);

  const handlePing = async (id: number) => {
    const token = getToken();
    await fetch('/api/servers/ping', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId: id }),
    });
    fetchServers();
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const token = getToken();
    await fetch('/api/servers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fd.get('name'),
        ip_address: fd.get('ip_address'),
        os_type: fd.get('os_type'),
        os_name: fd.get('os_name') || fd.get('os_type'),
        ssh_port: Number(fd.get('ssh_port')) || 22,
        ssh_user: fd.get('ssh_user'),
        ssh_password: fd.get('ssh_password') || null,
        vnc_port: Number(fd.get('vnc_port')) || 5900,
        vnc_password: fd.get('vnc_password') || null,
        environment: fd.get('environment') || 'development',
      }),
    });
    setShowAdd(false);
    fetchServers();
  };

  const handleDelete = async (id: number) => {
    const token = getToken();
    await fetch(`/api/servers/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchServers();
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0d0f1a]/95">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20 bg-[#0e1020]/50">
        <Server className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-foreground/80">服务器管理</span>
        <div className="flex-1" />
        <button onClick={() => setShowAdd(!showAdd)} className="p-1.5 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button onClick={fetchServers} className="p-1.5 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {showAdd && (
        <div className="p-3 border-b border-border/20 bg-[#0e1020]/30">
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-2">
            <input name="name" placeholder="名称" required className="col-span-2 px-2 py-1.5 bg-white/5 border border-border/20 rounded text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40" />
            <input name="ip_address" placeholder="IP 地址" required className="px-2 py-1.5 bg-white/5 border border-border/20 rounded text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40" />
            <select name="os_type" className="px-2 py-1.5 bg-white/5 border border-border/20 rounded text-xs text-foreground focus:outline-none focus:border-primary/40">
              <option value="linux">Linux</option>
              <option value="windows">Windows</option>
            </select>
            <input name="ssh_port" placeholder="SSH 端口" defaultValue="22" className="px-2 py-1.5 bg-white/5 border border-border/20 rounded text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40" />
            <input name="ssh_user" placeholder="SSH 用户" className="px-2 py-1.5 bg-white/5 border border-border/20 rounded text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40" />
            <input name="ssh_password" type="password" placeholder="SSH 密码" className="px-2 py-1.5 bg-white/5 border border-border/20 rounded text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40" />
            <input name="vnc_port" placeholder="VNC 端口" defaultValue="5900" className="px-2 py-1.5 bg-white/5 border border-border/20 rounded text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40" />
            <input name="vnc_password" type="password" placeholder="VNC 密码" className="px-2 py-1.5 bg-white/5 border border-border/20 rounded text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40" />
            <div className="col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">取消</button>
              <button type="submit" className="px-3 py-1.5 text-xs bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors">添加</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">加载中...</div>
        ) : servers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Monitor className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">暂无服务器</p>
          </div>
        ) : (
          <div className="space-y-2">
            {servers.map(srv => (
              <div key={srv.id} className="p-3 rounded-lg bg-white/[0.03] border border-border/10 hover:border-border/30 transition-colors">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${srv.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground/30'}`} />
                  <span className="text-sm font-medium text-foreground/90">{srv.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">{srv.environment}</span>
                  <div className="flex-1" />
                  <button onClick={() => handlePing(srv.id)} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    检测
                  </button>
                  <button onClick={() => handleDelete(srv.id)} className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                    删除
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground/60">
                  <span>{srv.ip_address}:{srv.ssh_port}</span>
                  <span>{srv.os_type === 'linux' ? '🐧 Linux' : '🪟 Windows'}</span>
                  <span>{srv.os_name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
