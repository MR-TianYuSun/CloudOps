'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDesktopStore } from './DesktopStore';
import WindowFrame from './WindowFrame';
import Taskbar from './Taskbar';
import DesktopIcons from './DesktopIcons';
import AppRenderer from './AppRenderer';

export default function Desktop() {
  const { windows, startMenuOpen, setStartMenuOpen, contextMenu, setContextMenu } = useDesktopStore();

  // 点击桌面空白关闭菜单
  const handleDesktopClick = useCallback(() => {
    if (startMenuOpen) setStartMenuOpen(false);
    if (contextMenu) setContextMenu(null);
  }, [startMenuOpen, contextMenu, setStartMenuOpen, setContextMenu]);

  return (
    <div
      className="w-screen h-screen bg-[#070A14] overflow-hidden relative select-none"
      onClick={handleDesktopClick}
    >
      {/* 背景渐变动画 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-[#69E7FF]/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-[#62FAD3]/3 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      {/* 桌面图标 */}
      <DesktopIcons />

      {/* 窗口层 */}
      {windows.map(win => (
        <WindowFrame key={win.id} window={win}>
          <AppRenderer appId={win.appId} windowId={win.id} />
        </WindowFrame>
      ))}

      {/* 任务栏 */}
      <Taskbar />
    </div>
  );
}
