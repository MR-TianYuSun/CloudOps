'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, HardDrive, Users as UsersIcon, Settings,
  Server, ChevronLeft, ChevronRight, LogOut, Menu, X,
  Cloud, Folder, Monitor,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/desktop', label: '桌面', icon: Monitor },
  { href: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { href: '/cloud-drive', label: '云盘', icon: Cloud },
  { href: '/teams', label: '团队空间', icon: Folder },
  { href: '/servers', label: '服务器管理', icon: Server },
  { href: '/users', label: '用户管理', icon: UsersIcon, adminOnly: true },
  { href: '/settings', label: '系统设置', icon: Settings, adminOnly: true },
];

interface UserInfo {
  id: number;
  username: string;
  displayName: string;
  role: string;
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const t = localStorage.getItem('token');
    setToken(t);
    if (!t) { window.location.href = '/login'; return; }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(data => { if (data.code === 200) setUser(data.data); })
      .catch(() => {});
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }, []);

  const filteredNav = NAV_ITEMS.filter(item => !item.adminOnly || user?.role === 'admin');

  // 移动端点击导航后关闭菜单
  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* 桌面侧边栏 */}
      <aside className={`hidden lg:flex flex-col border-r border-border/20 bg-surface/40 backdrop-blur-xl transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 h-14 border-b border-border/10 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <Cloud className="w-4 h-4 text-primary" />
          </div>
          {!collapsed && <span className="font-bold text-sm tracking-wide">CloudOps</span>}
        </div>
        {/* 导航 */}
        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
          {filteredNav.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-surface-container/50 hover:text-foreground'}`}>
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        {/* 折叠按钮 */}
        <div className="border-t border-border/10 p-2 shrink-0">
          <button onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-2 rounded-lg hover:bg-surface-container/50 text-muted-foreground transition-colors">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
        {/* 用户信息 */}
        {!collapsed && user && (
          <div className="border-t border-border/10 p-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                {(user.displayName || user.username).charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{user.displayName || user.username}</p>
                <p className="text-xs text-muted-foreground">{user.role === 'admin' ? '管理员' : '用户'}</p>
              </div>
              <button onClick={handleLogout} className="p-1 rounded hover:bg-surface-container/50 text-muted-foreground" title="退出登录">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* 移动端侧边栏遮罩 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      {/* 移动端侧边栏 */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface/95 backdrop-blur-xl border-r border-border/20 transform transition-transform duration-300 lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 h-14 border-b border-border/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-sm">CloudOps</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="p-1 rounded hover:bg-surface-container"><X className="w-5 h-5" /></button>
        </div>
        <nav className="py-2 px-2 space-y-0.5">
          {filteredNav.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href} onClick={handleNavClick}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-surface-container/50 hover:text-foreground'}`}>
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        {user && (
          <div className="absolute bottom-0 left-0 right-0 border-t border-border/10 p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                {(user.displayName || user.username).charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{user.displayName || user.username}</p>
                <p className="text-xs text-muted-foreground">{user.role === 'admin' ? '管理员' : '用户'}</p>
              </div>
              <button onClick={handleLogout} className="p-1 rounded hover:bg-surface-container/50 text-muted-foreground"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </aside>

      {/* 主内容 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 移动端顶部栏 */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-border/10 bg-surface/40 backdrop-blur-xl sticky top-0 z-30 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-1 rounded hover:bg-surface-container"><Menu className="w-5 h-5" /></button>
          <span className="font-bold text-sm">CloudOps</span>
        </header>
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
