'use client';

import { useState, useEffect, useRef } from 'react';
import { useDesktopStore } from './DesktopStore';
import { APP_REGISTRY } from './AppRegistry';
import { Search, Power, ChevronRight, User } from 'lucide-react';

export default function Taskbar() {
  const { windows, activeWindowId, startMenuOpen, toggleStartMenu, setStartMenuOpen, focusWindow, restoreWindow, minimizeWindow, openApp } = useDesktopStore();
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const taskbarRef = useRef<HTMLDivElement>(null);
  const startMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      );
      setCurrentDate(
        now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
      );
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);

  // 点击外部关闭开始菜单
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        startMenuOpen &&
        startMenuRef.current &&
        !startMenuRef.current.contains(e.target as Node) &&
        taskbarRef.current &&
        !taskbarRef.current.contains(e.target as Node)
      ) {
        setStartMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [startMenuOpen, setStartMenuOpen]);

  const handleTaskItemClick = (id: string, isMinimized: boolean, isActive: boolean) => {
    if (isMinimized) {
      restoreWindow(id);
    } else if (isActive) {
      minimizeWindow(id);
    } else {
      focusWindow(id);
    }
  };

  const filteredApps = APP_REGISTRY.filter(app =>
    app.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentDateString = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return (
    <>
      {/* 开始菜单 */}
      {startMenuOpen && (
        <div
          ref={startMenuRef}
          className="fixed bottom-12 left-1/2 -translate-x-1/2 w-[520px] max-h-[520px] bg-[#1a1d2e]/95 backdrop-blur-xl border border-border/30 rounded-xl shadow-2xl z-[9999] overflow-hidden flex flex-col"
        >
          {/* 搜索栏 */}
          <div className="p-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索应用..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-border/30 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                autoFocus
              />
            </div>
          </div>

          {/* 应用列表 */}
          <div className="flex-1 overflow-y-auto p-4 pt-2">
            <div className="grid grid-cols-4 gap-1">
              {filteredApps.map(app => (
                <button
                  key={app.id}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-white/5 transition-colors group"
                  onClick={() => { openApp(app); setSearchQuery(''); }}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg group-hover:bg-primary/20 transition-colors">
                    {getAppIcon(app.icon)}
                  </div>
                  <span className="text-[11px] text-foreground/80 text-center leading-tight line-clamp-2">
                    {app.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 底部栏 */}
          <div className="border-t border-border/20 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">CloudOps 用户</span>
            </div>
            <button className="flex items-center gap-1 px-2 py-1 rounded hover:bg-red-500/20 transition-colors text-muted-foreground hover:text-red-400">
              <Power className="w-3.5 h-3.5" />
              <span className="text-xs">退出</span>
            </button>
          </div>
        </div>
      )}

      {/* 任务栏 */}
      <div
        ref={taskbarRef}
        className="fixed bottom-0 left-0 right-0 h-12 bg-[#0e1020]/95 backdrop-blur-xl border-t border-border/20 z-[9990] flex items-center px-1"
      >
        {/* 开始按钮 */}
        <button
          className={`h-10 px-3 flex items-center gap-2 rounded-md transition-colors
            ${startMenuOpen ? 'bg-primary/15 text-primary' : 'hover:bg-white/5 text-muted-foreground hover:text-foreground'}
          `}
          onClick={toggleStartMenu}
        >
          <div className="w-5 h-5 rounded bg-primary/30 flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary">C</span>
          </div>
        </button>

        {/* 分隔线 */}
        <div className="w-px h-6 bg-border/30 mx-1" />

        {/* 任务项 */}
        <div className="flex-1 flex items-center gap-0.5 overflow-x-auto">
          {windows.map(win => (
            <button
              key={win.id}
              className={`h-9 px-3 flex items-center gap-2 rounded-md text-xs transition-all min-w-0 max-w-[160px]
                ${win.id === activeWindowId && !win.isMinimized
                  ? 'bg-primary/10 text-primary border-b-2 border-primary'
                  : win.isMinimized
                    ? 'bg-white/5 text-muted-foreground opacity-60'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/8'
                }
              `}
              onClick={() => handleTaskItemClick(win.id, win.isMinimized, win.id === activeWindowId)}
              title={win.title}
            >
              <span className="shrink-0 text-sm">{getAppIcon(win.icon)}</span>
              <span className="truncate">{win.title}</span>
            </button>
          ))}
        </div>

        {/* 系统托盘 */}
        <div className="flex items-center gap-3 px-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <div className="w-3 h-3 rounded-full bg-emerald-400/80 animate-pulse" title="在线" />
          </div>
          <div className="text-right">
            <div className="text-xs text-foreground/90 leading-none">{currentTime}</div>
            <div className="text-[10px] text-muted-foreground/60 leading-none mt-0.5">{currentDate}</div>
          </div>
        </div>
      </div>
    </>
  );
}

function getAppIcon(icon: string): React.ReactNode {
  const iconMap: Record<string, string> = {
    'folder': '📁', 'server': '🖥️', 'gauge': '📊', 'pie-chart': '📊',
    'clock': '🕐', 'file-edit': '📝', 'download': '⬇️', 'palette': '🎨',
    'shield': '🔒', 'code': '💻', 'globe': '🌐', 'settings': '⚙️',
    'users': '👥', 'terminal': '⌨️', 'file': '📄',
  };
  return <span>{iconMap[icon] || '📄'}</span>;
}
