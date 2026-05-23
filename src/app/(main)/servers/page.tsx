'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Server, Plus, Monitor, Terminal, Trash2,
  Cpu, HardDrive, MemoryStick,
  Globe, X, Key, Lock, ExternalLink, ScreenShare,
} from 'lucide-react';

interface ServerItem {
  id: number;
  name: string;
  ip_address: string;
  os_type: string;
  os_name: string;
  environment: string;
  tags: string;
  ssh_port: number;
  ssh_user: string;
  ssh_password: string | null;
  ssh_key: string | null;
  vnc_port: number;
  vnc_password: string | null;
  has_ssh_password: boolean;
  has_ssh_key: boolean;
  has_vnc_password: boolean;
  status: string;
  cpu_cores: number | null;
  memory_total: number | null;
  disk_total: number | null;
  created_at: string;
}

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function getStatusBadge(status: string, onClick?: () => void) {
  const common = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs";
  if (status === 'online') {
    return <span className={`${common} bg-green-500/20 text-green-400 cursor-pointer`} onClick={onClick}><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />在线</span>;
  }
  return <span className={`${common} bg-muted text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors`} onClick={onClick} title="点击检测连接状态"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />离线</span>;
}

function getOsIcon(osType: string) {
  if (osType?.toLowerCase().includes('windows')) return <Monitor className="w-5 h-5 text-blue-400" />;
  if (osType?.toLowerCase().includes('linux')) return <Terminal className="w-5 h-5 text-orange-400" />;
  return <Server className="w-5 h-5 text-muted-foreground" />;
}

function isWindows(osType: string) {
  return osType?.toLowerCase().includes('windows');
}

function getEnvBadge(env: string) {
  const colors: Record<string, string> = {
    production: 'bg-red-500/20 text-red-400',
    staging: 'bg-yellow-500/20 text-yellow-400',
    development: 'bg-green-500/20 text-green-400',
  };
  const labels: Record<string, string> = {
    production: '生产',
    staging: '预发布',
    development: '开发',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${colors[env] || 'bg-muted text-muted-foreground'}`}>
      {labels[env] || env}
    </span>
  );
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '-';
  const gb = bytes / (1024 * 1024 * 1024);
  return gb >= 1 ? `${gb.toFixed(0)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export default function ServersPage() {
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [terminalServer, setTerminalServer] = useState<ServerItem | null>(null);
  const [vncServer, setVncServer] = useState<ServerItem | null>(null);
  const [form, setForm] = useState({
    name: '', ip_address: '', os_type: 'linux', os_name: '',
    environment: 'development', ssh_port: '22', ssh_user: 'root',
    ssh_password: '', ssh_key: '',
    vnc_port: '5900', vnc_password: '',
    tags: '', cpu_cores: '', memory_total: '', disk_total: '',
  });

  const [pingingIds, setPingingIds] = useState<Set<number>>(new Set());

  const fetchServers = useCallback(async () => {
    try {
      const res = await fetch('/api/servers', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.code === 200) setServers(data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const pingServer = async (serverId: number) => {
    setPingingIds(prev => new Set(prev).add(serverId));
    try {
      await fetch(`/api/servers/ping?serverId=${serverId}`, { headers: getAuthHeaders() });
      await fetchServers();
    } catch { /* ignore */ } finally {
      setPingingIds(prev => { const n = new Set(prev); n.delete(serverId); return n; });
    }
  };

  useEffect(() => { fetchServers(); }, [fetchServers]);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.ip_address.trim()) return;
    const res = await fetch('/api/servers', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: form.name.trim(),
        ip_address: form.ip_address.trim(),
        os_type: form.os_type,
        os_name: form.os_name.trim() || form.os_type,
        environment: form.environment,
        ssh_port: Number(form.ssh_port) || 22,
        ssh_user: form.ssh_user.trim() || 'root',
        ssh_password: form.ssh_password || null,
        ssh_key: form.ssh_key || null,
        vnc_port: Number(form.vnc_port) || 5900,
        vnc_password: form.vnc_password || null,
        tags: form.tags.trim(),
        cpu_cores: form.cpu_cores ? Number(form.cpu_cores) : null,
        memory_total: form.memory_total ? Number(form.memory_total) * 1024 * 1024 * 1024 : null,
        disk_total: form.disk_total ? Number(form.disk_total) * 1024 * 1024 * 1024 : null,
      }),
    });
    const data = await res.json();
    if (data.code === 200) {
      setShowAdd(false);
      setForm({ name: '', ip_address: '', os_type: 'linux', os_name: '', environment: 'development', ssh_port: '22', ssh_user: 'root', ssh_password: '', ssh_key: '', vnc_port: '5900', vnc_password: '', tags: '', cpu_cores: '', memory_total: '', disk_total: '' });
      fetchServers();
    } else {
      alert(data.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此服务器？')) return;
    const res = await fetch(`/api/servers/${id}`, {
      method: 'DELETE', headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.code === 200) fetchServers();
  };

  const openTerminal = (server: ServerItem) => {
    if (!server.has_ssh_password && !server.has_ssh_key) {
      alert('请先为该服务器配置 SSH 密码或密钥');
      return;
    }
    setTerminalServer(server);
  };

  const openRemoteDesktop = (server: ServerItem) => {
    setVncServer(server);
  };

  // Get the primary action based on OS type
  const getPrimaryAction = (server: ServerItem) => {
    if (isWindows(server.os_type)) {
      return (
        <button
          onClick={() => openRemoteDesktop(server)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-xs font-medium"
        >
          <ScreenShare className="w-3.5 h-3.5" />远程桌面
        </button>
      );
    }
    return (
      <button
        onClick={() => openTerminal(server)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-xs font-medium"
      >
        <Terminal className="w-3.5 h-3.5" />终端
      </button>
    );
  };

  if (loading) {
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
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Server className="w-7 h-7 text-primary" />服务器管理
          </h1>
          <p className="text-muted-foreground mt-1">管理和监控你的服务器资源，支持 SSH 终端和 VNC 远程桌面</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />添加服务器
        </button>
      </div>

      {/* Server List */}
      {servers.length === 0 ? (
        <div className="bg-card/60 backdrop-blur-xl rounded-xl border border-border p-12 text-center">
          <Server className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">还没有添加任何服务器</p>
          <p className="text-muted-foreground/60 text-sm mt-1">点击右上角添加你的第一台服务器</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servers.map((server) => (
            <div
              key={server.id}
              className="bg-card/60 backdrop-blur-xl rounded-xl border border-border p-5 hover:border-primary/40 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    {getOsIcon(server.os_type)}
                  </div>
                  <div>
                    <h3 className="text-foreground font-semibold">{server.name}</h3>
                    <p className="text-muted-foreground text-xs flex items-center gap-1">
                      <Globe className="w-3 h-3" />{server.ip_address}
                    </p>
                  </div>
                </div>
                {getStatusBadge(server.status, pingingIds.has(server.id) ? undefined : () => pingServer(server.id))}
              </div>

              <div className="flex items-center gap-2 mb-3">
                {getEnvBadge(server.environment)}
                <span className="text-xs text-muted-foreground">{server.os_name}</span>
                {(server.has_ssh_password || server.has_ssh_key) && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-accent/10 text-accent">
                    <Lock className="w-2.5 h-2.5" />SSH
                  </span>
                )}
                {isWindows(server.os_type) && server.vnc_port && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400">
                    <Monitor className="w-2.5 h-2.5" />VNC
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <Cpu className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-0.5" />
                  <div className="text-xs text-foreground font-medium">{server.cpu_cores || '-'}核</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <MemoryStick className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-0.5" />
                  <div className="text-xs text-foreground font-medium">{formatSize(server.memory_total)}</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <HardDrive className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-0.5" />
                  <div className="text-xs text-foreground font-medium">{formatSize(server.disk_total)}</div>
                </div>
              </div>

              {server.tags && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {server.tags.split(',').map((tag, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary">{tag.trim()}</span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {isWindows(server.os_type) ? `VNC: ${server.ip_address}:${server.vnc_port || 5900}` : `SSH: ${server.ssh_user}@${server.ip_address}`}
                </span>
                <div className="flex items-center gap-1">
                  {getPrimaryAction(server)}
                  {/* Secondary action: show both buttons for all servers */}
                  {!isWindows(server.os_type) ? (
                    <button
                      onClick={() => openRemoteDesktop(server)}
                      className="p-1.5 rounded-md hover:bg-blue-500/10 text-muted-foreground hover:text-blue-400 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                      title="VNC 远程桌面"
                    >
                      <Monitor className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => openTerminal(server)}
                      className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                      title="SSH 终端"
                    >
                      <Terminal className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(server.id)}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connection Guide */}
      <div className="bg-card/40 backdrop-blur-xl rounded-xl border border-border p-5">
        <h3 className="text-foreground font-semibold mb-3 flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-primary" />
          远程连接指南
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-4 h-4 text-orange-400" />
              <span className="text-foreground font-medium text-sm">Linux SSH 终端</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Linux 服务器通过 SSH 协议连接，点击「终端」按钮即可打开网页终端。
              需要在添加服务器时配置 SSH 用户名和密码/密钥。
            </p>
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="w-4 h-4 text-blue-400" />
              <span className="text-foreground font-medium text-sm">Windows VNC 远程桌面</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Windows 服务器通过 VNC 协议实现图形化远程桌面。
              请在 Windows 服务器上安装 VNC 服务（推荐 <a href="https://tightvnc.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">TightVNC</a> 或 <a href="https://uvnc.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">UltraVNC</a>），
              默认端口 5900。
            </p>
          </div>
        </div>
      </div>

      {/* Add Server Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAdd(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-foreground mb-4">添加服务器</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">服务器名称 *</label>
                  <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="My Server" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">IP 地址 *</label>
                  <input value={form.ip_address} onChange={(e) => setForm(f => ({ ...f, ip_address: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="192.168.1.100" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">操作系统</label>
                  <select value={form.os_type} onChange={(e) => setForm(f => ({ ...f, os_type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground">
                    <option value="linux">Linux</option>
                    <option value="windows">Windows</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">环境</label>
                  <select value={form.environment} onChange={(e) => setForm(f => ({ ...f, environment: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground">
                    <option value="development">开发</option>
                    <option value="staging">预发布</option>
                    <option value="production">生产</option>
                  </select>
                </div>
              </div>

              {/* SSH Settings */}
              <div className="border border-border rounded-lg p-3 space-y-3">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-primary" />SSH 连接设置
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">SSH 端口</label>
                    <input value={form.ssh_port} onChange={(e) => setForm(f => ({ ...f, ssh_port: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground" type="number" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">SSH 用户</label>
                    <input value={form.ssh_user} onChange={(e) => setForm(f => ({ ...f, ssh_user: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground" placeholder="root" />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 flex items-center gap-1"><Key className="w-3.5 h-3.5" />SSH 密码</label>
                  <input value={form.ssh_password} onChange={(e) => setForm(f => ({ ...f, ssh_password: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    type="password" placeholder="留空则不设置" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 flex items-center gap-1"><Lock className="w-3.5 h-3.5" />SSH 私钥</label>
                  <textarea value={form.ssh_key} onChange={(e) => setForm(f => ({ ...f, ssh_key: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-xs h-20 resize-y"
                    placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----" />
                </div>
              </div>

              {/* VNC Settings (for Windows) */}
              <div className="border border-border rounded-lg p-3 space-y-3">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-blue-400" />VNC 远程桌面设置
                  <span className="text-xs text-muted-foreground font-normal ml-1">（Windows 服务器必填）</span>
                </h4>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">VNC 端口</label>
                  <input value={form.vnc_port} onChange={(e) => setForm(f => ({ ...f, vnc_port: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground"
                    type="number" placeholder="5900" />
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Windows 服务器需安装 VNC 服务（推荐 TightVNC / UltraVNC），默认端口 5900
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">VNC 密码</label>
                  <input value={form.vnc_password} onChange={(e) => setForm(f => ({ ...f, vnc_password: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground"
                    type="password" placeholder="VNC 访问密码" />
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    TightVNC/UltraVNC 中设置的 Primary password
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">CPU 核数</label>
                  <input value={form.cpu_cores} onChange={(e) => setForm(f => ({ ...f, cpu_cores: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground" type="number" placeholder="4" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">内存 (GB)</label>
                  <input value={form.memory_total} onChange={(e) => setForm(f => ({ ...f, memory_total: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground" type="number" placeholder="16" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">硬盘 (GB)</label>
                  <input value={form.disk_total} onChange={(e) => setForm(f => ({ ...f, disk_total: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground" type="number" placeholder="500" />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">标签 (逗号分隔)</label>
                <input value={form.tags} onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="web, database, cache" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg bg-muted/50 text-foreground hover:bg-muted">取消</button>
                <button onClick={handleAdd} className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 font-medium">添加</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terminal Modal */}
      {terminalServer && (
        <TerminalModal
          server={terminalServer}
          onClose={() => { setTerminalServer(null); fetchServers(); }}
        />
      )}

      {/* VNC Remote Desktop Modal */}
      {vncServer && (
        <VncRemoteDesktop
          server={vncServer}
          onClose={() => { setVncServer(null); fetchServers(); }}
        />
      )}
    </div>
  );
}

// ===================== Terminal Modal Component =====================

function TerminalModal({ server, onClose }: { server: ServerItem; onClose: () => void }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const termRef = useRef<unknown>(null);
  const fitAddonRef = useRef<unknown>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let terminal: import('@xterm/xterm').Terminal | null = null;
    let fitAddon: import('@xterm/addon-fit').FitAddon | null = null;

    const initTerminal = async () => {
      // Dynamic imports for xterm.js
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');

      terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#0a0e1a',
          foreground: '#e4e8f1',
          cursor: '#7C5CFF',
          cursorAccent: '#0a0e1a',
          selectionBackground: '#7C5CFF40',
          black: '#0a0e1a',
          red: '#ff5555',
          green: '#62FAD3',
          yellow: '#f1fa8c',
          blue: '#69E7FF',
          magenta: '#ff79c6',
          cyan: '#8be9fd',
          white: '#e4e8f1',
          brightBlack: '#6272a4',
          brightRed: '#ff6e6e',
          brightGreen: '#69ff94',
          brightYellow: '#ffffa5',
          brightBlue: '#d6acff',
          brightMagenta: '#ff92df',
          brightCyan: '#a4ffff',
          brightWhite: '#ffffff',
        },
        allowTransparency: true,
      });

      fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);

      if (terminalRef.current) {
        terminal.open(terminalRef.current);
        fitAddon.fit();
      }

      termRef.current = terminal;
      fitAddonRef.current = fitAddon;

      // Connect WebSocket
      const token = localStorage.getItem('token') || '';
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/terminal?token=${encodeURIComponent(token)}&serverId=${server.id}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'output') {
            const data = atob(msg.payload);
            terminal?.write(data);
          } else if (msg.type === 'connected') {
            setStatus('connected');
            terminal?.write(`\x1b[32m✓ ${msg.payload}\x1b[0m\r\n\r\n`);
          } else if (msg.type === 'error') {
            setStatus('error');
            setErrorMsg(msg.payload);
            terminal?.write(`\x1b[31m✗ ${msg.payload}\x1b[0m\r\n`);
          } else if (msg.type === 'disconnected') {
            setStatus('disconnected');
            terminal?.write(`\x1b[33m⚠ ${msg.payload}\x1b[0m\r\n`);
          } else if (msg.type === 'pong') {
            // heartbeat response
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        setStatus('disconnected');
        terminal?.write(`\r\n\x1b[33m⚠ 连接已断开\x1b[0m\r\n`);
      };

      ws.onerror = () => {
        setStatus('error');
        setErrorMsg('WebSocket连接失败');
        terminal?.write(`\r\n\x1b[31m✗ WebSocket连接失败\x1b[0m\r\n`);
      };

      // Terminal input -> WebSocket
      terminal.onData((data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          const encoded = btoa(data);
          ws.send(JSON.stringify({ type: 'input', payload: encoded }));
        }
      });

      // Handle resize
      const handleResize = () => {
        if (fitAddon && terminal) {
          fitAddon.fit();
          const cols = terminal.cols;
          const rows = terminal.rows;
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'resize', payload: { cols, rows } }));
          }
        }
      };

      const resizeObserver = new ResizeObserver(handleResize);
      if (terminalRef.current) {
        resizeObserver.observe(terminalRef.current);
      }

      // Heartbeat
      const heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', payload: null }));
        }
      }, 30000);

      // Cleanup
      return () => {
        clearInterval(heartbeat);
        resizeObserver.disconnect();
        ws.close();
        terminal?.dispose();
      };
    };

    const cleanup = initTerminal();

    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, [server.id]);

  const handleReconnect = () => {
    if (wsRef.current) wsRef.current.close();
    if (termRef.current) {
      (termRef.current as import('@xterm/xterm').Terminal).dispose();
    }
    setStatus('connecting');
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl w-full max-w-5xl mx-4 overflow-hidden flex flex-col"
        style={{ height: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <button onClick={onClose} className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-400 transition-colors" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <span className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-primary" />
              {server.ssh_user}@{server.ip_address}
            </span>
            {status === 'connecting' && (
              <span className="text-xs text-yellow-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />连接中...
              </span>
            )}
            {status === 'connected' && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />已连接
              </span>
            )}
            {status === 'disconnected' && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />已断开
              </span>
            )}
            {status === 'error' && (
              <span className="text-xs text-red-400 flex items-center gap-1" title={errorMsg}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />连接失败
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {status === 'disconnected' || status === 'error' ? (
              <button onClick={handleReconnect} className="px-2.5 py-1 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                重连
              </button>
            ) : null}
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="flex-1 overflow-hidden bg-[#0a0e1a] p-1">
          <div ref={terminalRef} className="w-full h-full" />
        </div>

        {/* Terminal Footer */}
        <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-muted/30">
          <span className="text-xs text-muted-foreground">{server.name} · {server.os_name}</span>
          <span className="text-xs text-muted-foreground">端口 {server.ssh_port}</span>
        </div>
      </div>
    </div>
  );
}

// ===================== VNC Remote Desktop Component =====================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RFBClass = any;

async function loadRFB(): Promise<RFBClass> {
  if ((window as unknown as Record<string, RFBClass>).RFB) {
    return (window as unknown as Record<string, RFBClass>).RFB;
  }
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('novnc-rfb-script');
    if (existing) {
      existing.addEventListener('load', () => {
        const RFB = (window as unknown as Record<string, RFBClass>).RFB;
        if (RFB) resolve(RFB);
        else reject(new Error('RFB not found after script load'));
      });
      existing.addEventListener('error', () => reject(new Error('Failed to load noVNC script')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'novnc-rfb-script';
    script.type = 'module';
    script.textContent = `
      import RFB from '/novnc-rfb.js';
      window.RFB = RFB;
      document.dispatchEvent(new Event('novnc-rfb-ready'));
    `;
    document.head.appendChild(script);
    const onReady = () => {
      document.removeEventListener('novnc-rfb-ready', onReady);
      const RFB = (window as unknown as Record<string, RFBClass>).RFB;
      if (RFB) resolve(RFB);
      else reject(new Error('RFB not found after script load'));
    };
    document.addEventListener('novnc-rfb-ready', onReady);
    setTimeout(() => {
      document.removeEventListener('novnc-rfb-ready', onReady);
      const RFB = (window as unknown as Record<string, RFBClass>).RFB;
      if (RFB) resolve(RFB);
      else reject(new Error('Timeout loading noVNC'));
    }, 10000);
  });
}

function VncRemoteDesktop({ server, onClose }: { server: ServerItem; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<RFBClass | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [errorMsg, setErrorMsg] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [vncPassword, setVncPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const pendingCredentials = useRef<((password: string) => void) | null>(null);

  const disconnect = useCallback(() => {
    if (rfbRef.current) {
      try { rfbRef.current.disconnect(); } catch { /* ignore */ }
      rfbRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (!containerRef.current) return;
    disconnect();
    setConnectionState('connecting');
    setErrorMsg('');

    try {
      // Fetch VNC credentials from server
      let savedPassword = vncPassword;
      if (!savedPassword) {
        try {
          const vncRes = await fetch(`/api/servers/vnc?serverId=${server.id}`, { headers: getAuthHeaders() });
          const vncData = await vncRes.json();
          if (vncData.code === 200 && vncData.data?.password) {
            savedPassword = vncData.data.password;
            setVncPassword(savedPassword);
          }
        } catch { /* ignore fetch errors, will prompt for password */ }
      }

      const RFB = await loadRFB();

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const token = localStorage.getItem('token') || '';
      const wsUrl = `${protocol}//${window.location.host}/ws/vnc?token=${encodeURIComponent(token)}&serverId=${server.id}`;

      const rfb = new RFB(containerRef.current, wsUrl, {
        credentials: savedPassword ? { password: savedPassword } : undefined,
      });

      rfbRef.current = rfb;
      rfb.scaleViewport = true;
      rfb.resizeSession = false;
      rfb.showDotCursor = true;
      rfb.clipViewport = true;

      rfb.addEventListener('connect', () => {
        setConnectionState('connected');
        setShowPasswordInput(false);
      });

      rfb.addEventListener('disconnect', (e: { detail: { clean: boolean } }) => {
        if (e.detail.clean) {
          setConnectionState('disconnected');
        } else {
          setConnectionState('error');
          setErrorMsg('VNC 连接已断开');
        }
        rfbRef.current = null;
      });

      rfb.addEventListener('credentialsrequired', () => {
        const pwd = vncPassword || savedPassword;
        if (pwd) {
          rfb.sendCredentials({ password: pwd });
        } else {
          setShowPasswordInput(true);
          pendingCredentials.current = (p: string) => {
            rfb.sendCredentials({ password: p });
          };
        }
      });

      rfb.addEventListener('desktopname', (e: { detail: { name: string } }) => {
        console.log('VNC Desktop name:', e.detail.name);
      });

    } catch (err) {
      setConnectionState('error');
      setErrorMsg(`初始化 VNC 失败: ${(err as Error).message}`);
    }
  }, [server.id, vncPassword, disconnect]);

  useEffect(() => {
    connect();
    return () => { disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReconnect = () => { connect(); };

  const handleFullscreen = () => {
    const wrapper = containerRef.current?.parentElement;
    if (!wrapper) return;
    if (!document.fullscreenElement) {
      wrapper.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handlePasswordSubmit = () => {
    if (pendingCredentials.current && vncPassword) {
      pendingCredentials.current(vncPassword);
      pendingCredentials.current = null;
      setShowPasswordInput(false);
    }
  };

  const handleCtrlAltDel = () => {
    if (rfbRef.current) {
      rfbRef.current.sendCtrlAltDel();
    }
  };

  const stateColors = {
    connecting: 'text-yellow-400',
    connected: 'text-green-400',
    disconnected: 'text-gray-400',
    error: 'text-red-400',
  };

  const stateLabels = {
    connecting: '正在连接...',
    connected: '已连接',
    disconnected: '已断开',
    error: '连接失败',
  };

  const stateDots = {
    connecting: 'bg-yellow-400',
    connected: 'bg-green-400',
    disconnected: 'bg-gray-400',
    error: 'bg-red-400',
  };

  const vncPort = server.vnc_port || 5900;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-3">
          {/* macOS-style dots */}
          <div className="flex gap-1.5">
            <button
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
              title="关闭"
            />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <button
              onClick={handleFullscreen}
              className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors"
              title={isFullscreen ? '退出全屏' : '全屏'}
            />
          </div>

          <div className="flex items-center gap-2 text-sm">
            <ScreenShare className="w-4 h-4 text-blue-400" />
            <span className="text-muted-foreground">
              {server.name} · {server.ip_address}:{vncPort}
            </span>
            <span className={`flex items-center gap-1.5 ${stateColors[connectionState]}`}>
              <span className={`w-2 h-2 rounded-full ${stateDots[connectionState]} ${connectionState === 'connecting' ? 'animate-pulse' : ''}`} />
              {stateLabels[connectionState]}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCtrlAltDel}
            disabled={connectionState !== 'connected'}
            className="px-3 py-1 text-xs rounded-md bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Ctrl+Alt+Del
          </button>
          <button
            onClick={handleReconnect}
            className="px-3 py-1 text-xs rounded-md bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
          >
            重连
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* VNC display area */}
      <div className="flex-1 relative bg-black">
        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ minHeight: 0 }}
        />

        {/* Password input overlay */}
        {showPasswordInput && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-10">
            <div className="bg-card/90 backdrop-blur-xl rounded-xl border border-border p-6 w-80 shadow-2xl">
              <h3 className="text-foreground font-semibold mb-2">VNC 密码验证</h3>
              <p className="text-sm text-muted-foreground mb-4">
                该服务器需要 VNC 密码才能连接
              </p>
              <input
                type="password"
                value={vncPassword}
                onChange={(e) => setVncPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="输入 VNC 密码"
                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3"
                autoFocus
              />
              <button
                onClick={handlePasswordSubmit}
                className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                连接
              </button>
            </div>
          </div>
        )}

        {/* Error / Disconnected overlay */}
        {(connectionState === 'error' || connectionState === 'disconnected') && !showPasswordInput && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10">
            <div className="text-center">
              <div className="text-4xl mb-3">
                {connectionState === 'error' ? '⚠️' : '🔌'}
              </div>
              <p className="text-red-400 text-sm mb-1">
                {errorMsg || (connectionState === 'disconnected' ? '连接已断开' : '连接失败')}
              </p>
              <p className="text-muted-foreground text-xs mb-4">
                请确认目标服务器已开启 VNC 服务（端口 {vncPort}）
              </p>
              <button
                onClick={handleReconnect}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
              >
                重新连接
              </button>
            </div>
          </div>
        )}

        {/* Connecting overlay */}
        {connectionState === 'connecting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                正在连接到 {server.ip_address}:{vncPort}...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-card/60 backdrop-blur-xl border-t border-border text-xs text-muted-foreground">
        <span>{server.name} · VNC</span>
        <span>端口 {vncPort}</span>
      </div>
    </div>
  );
}
