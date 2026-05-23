'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Server, HardDrive, FileText, Database, Activity, AlertTriangle, Clock, User, Users, FolderOpen } from 'lucide-react';

interface UserInfo {
  id: number;
  username: string;
  displayName: string;
  role: string;
}

interface Stats {
  serverCount: number;
  serverOnline: number;
  storageTotal: number;
  storageUsed: number;
  fileCount: number;
  fileTotalSize: number;
  nodeCount: number;
  nodeOnline: number;
  userCount: number;
  userActive: number;
  teamCount: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [stats, setStats] = useState<Stats>({
    serverCount: 0, serverOnline: 0,
    storageTotal: 0, storageUsed: 0,
    fileCount: 0, fileTotalSize: 0,
    nodeCount: 0, nodeOnline: 0,
    userCount: 0, userActive: 0,
    teamCount: 0,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // 获取用户信息
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.code === 200) setUser(d.data); });

    // 获取统计数据
    fetch('/api/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.code === 200) setStats(d.data); });
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const statCards = [
    {
      label: '在线服务器',
      value: stats.serverOnline,
      suffix: `/ ${stats.serverCount} 台`,
      icon: <Server className="w-5 h-5" />,
      color: 'text-accent',
    },
    {
      label: '存储容量',
      value: stats.storageUsed > 0 ? (stats.storageUsed / 1073741824).toFixed(1) : '0',
      suffix: `/ ${stats.storageTotal > 0 ? (stats.storageTotal / 1073741824).toFixed(0) : '∞'} GB`,
      icon: <HardDrive className="w-5 h-5" />,
      color: 'text-accent',
    },
    {
      label: '文件总数',
      value: stats.fileCount,
      suffix: ` (${formatSize(stats.fileTotalSize)})`,
      icon: <FileText className="w-5 h-5" />,
      color: 'text-accent',
    },
    {
      label: '存储节点',
      value: stats.nodeOnline,
      suffix: `/ ${stats.nodeCount} 个`,
      icon: <Database className="w-5 h-5" />,
      color: 'text-accent',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 欢迎信息 */}
      <div>
        <h1 className="text-2xl font-bold">CloudOps 仪表盘</h1>
        <p className="text-muted-foreground mt-1">
          欢迎回来，{user?.displayName || '用户'}
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{card.label}</span>
              <span className="text-muted-foreground/50">{card.icon}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-3xl font-bold ${card.color}`}>{card.value}</span>
              <span className="text-sm text-muted-foreground">{card.suffix}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 快捷入口 + 系统信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 快捷操作 */}
        <div className="bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl p-5">
          <h2 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" /> 快捷操作
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/cloud-drive"
              className="flex items-center gap-3 p-3 rounded-lg bg-surface-container/50 hover:bg-surface-container transition-colors"
            >
              <HardDrive className="w-5 h-5 text-primary" />
              <span className="text-sm">打开云盘</span>
            </Link>
            <Link
              href="/servers"
              className="flex items-center gap-3 p-3 rounded-lg bg-surface-container/50 hover:bg-surface-container transition-colors"
            >
              <Server className="w-5 h-5 text-primary" />
              <span className="text-sm">服务器管理</span>
            </Link>
            <Link
              href="/teams"
              className="flex items-center gap-3 p-3 rounded-lg bg-surface-container/50 hover:bg-surface-container transition-colors"
            >
              <Users className="w-5 h-5 text-primary" />
              <span className="text-sm">团队空间</span>
            </Link>
            {user?.role === 'admin' && (
              <>
                <Link
                  href="/users"
                  className="flex items-center gap-3 p-3 rounded-lg bg-surface-container/50 hover:bg-surface-container transition-colors"
                >
                  <User className="w-5 h-5 text-primary" />
                  <span className="text-sm">用户管理</span>
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 p-3 rounded-lg bg-surface-container/50 hover:bg-surface-container transition-colors"
                >
                  <Activity className="w-5 h-5 text-primary" />
                  <span className="text-sm">系统设置</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* 系统信息 */}
        <div className="bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl p-5">
          <h2 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> 系统信息
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">当前用户</span>
              <span>{user?.displayName || '-'} ({user?.role === 'admin' ? '管理员' : '普通用户'})</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">注册用户</span>
              <span>{stats.userActive} / {stats.userCount} 人</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">活跃团队</span>
              <span>{stats.teamCount} 个</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">系统版本</span>
              <span>v1.0.0</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">存储方式</span>
              <span>本地存储</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> 运行状态
              </span>
              <span className="text-green-400">正常</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
