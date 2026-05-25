'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { X, Minus, Square, Copy } from 'lucide-react';
import { useDesktopStore, type WindowState } from './DesktopStore';
import { getAppById } from './AppRegistry';

interface WindowFrameProps {
  window: WindowState;
  children: React.ReactNode;
}

export default function WindowFrame({ window: win, children }: WindowFrameProps) {
  const {
    closeWindow, minimizeWindow, maximizeWindow, restoreWindow,
    focusWindow, moveWindow, resizeWindow,
  } = useDesktopStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, winX: 0, winY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const app = getAppById(win.appId);

  // 拖拽 - 标题栏
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (win.isMaximized) return;
    e.preventDefault();
    focusWindow(win.id);
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, winX: win.x, winY: win.y };
  }, [win.id, win.x, win.y, win.isMaximized, focusWindow]);

  // 调整大小 - 右下角
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (win.isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStart.current = { x: e.clientX, y: e.clientY, w: win.width, h: win.height };
  }, [win.id, win.width, win.height, win.isMaximized]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      moveWindow(win.id, dragStart.current.winX + dx, Math.max(0, dragStart.current.winY + dy));
    };
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, win.id, moveWindow]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;
      resizeWindow(win.id, resizeStart.current.w + dx, resizeStart.current.h + dy);
    };
    const handleUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isResizing, win.id, resizeWindow]);

  if (win.isMinimized) return null;

  const handleToggleMax = () => {
    if (win.isMaximized) {
      restoreWindow(win.id);
    } else {
      maximizeWindow(win.id);
    }
  };

  const handleDoubleClickTitle = () => {
    handleToggleMax();
  };

  return (
    <div
      className={`absolute flex flex-col rounded-lg overflow-hidden shadow-2xl border transition-shadow duration-150
        ${win.isActive ? 'border-primary/30 shadow-primary/10' : 'border-border/30'}
        ${win.isMaximized ? 'rounded-none' : 'rounded-lg'}
        ${isDragging || isResizing ? 'select-none' : ''}
      `}
      style={{
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
      }}
      onMouseDown={() => focusWindow(win.id)}
    >
      {/* 标题栏 */}
      <div
        className={`h-9 flex items-center justify-between px-3 shrink-0 cursor-default select-none
          ${win.isActive
            ? 'bg-gradient-to-r from-[#1a1d2e] to-[#141728] border-b border-primary/20'
            : 'bg-[#1a1d2e]/80 border-b border-border/20'
          }
        `}
        onMouseDown={handleDragStart}
        onDoubleClick={handleDoubleClickTitle}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm opacity-80">
            {getAppIcon(app?.icon || 'file')}
          </span>
          <span className={`text-xs truncate ${win.isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
            {win.title}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
            onClick={(e) => { e.stopPropagation(); minimizeWindow(win.id); }}
            onMouseDown={e => e.stopPropagation()}
          >
            <Minus className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
            onClick={(e) => { e.stopPropagation(); handleToggleMax(); }}
            onMouseDown={e => e.stopPropagation()}
          >
            {win.isMaximized
              ? <Copy className="w-3 h-3 text-muted-foreground" />
              : <Square className="w-3 h-3 text-muted-foreground" />
            }
          </button>
          <button
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-500/80 transition-colors"
            onClick={(e) => { e.stopPropagation(); closeWindow(win.id); }}
            onMouseDown={e => e.stopPropagation()}
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto bg-[#0d0f1a]/95 backdrop-blur-sm">
        {children}
      </div>

      {/* 调整大小手柄 */}
      {!win.isMaximized && (
        <div
          className="absolute right-0 bottom-0 w-4 h-4 cursor-se-resize z-10"
          onMouseDown={handleResizeStart}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" className="opacity-30">
            <path d="M14 14L14 8M14 14L8 14" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M14 14L14 11M14 14L11 14" stroke="currentColor" strokeWidth="1"/>
          </svg>
        </div>
      )}
    </div>
  );
}

function getAppIcon(icon: string): React.ReactNode {
  const iconMap: Record<string, string> = {
    'folder': '📁',
    'server': '🖥️',
    'gauge': '📊',
    'pie-chart': '📊',
    'clock': '🕐',
    'file-edit': '📝',
    'download': '⬇️',
    'palette': '🎨',
    'shield': '🔒',
    'code': '💻',
    'globe': '🌐',
    'settings': '⚙️',
    'users': '👥',
    'terminal': '⌨️',
    'file': '📄',
  };
  return <span>{iconMap[icon] || '📄'}</span>;
}
