/**
 * Windows 模拟桌面 - 窗口管理器 Store
 * 管理所有窗口的状态：位置、大小、层级、最小化/最大化
 */
import { create } from 'zustand';

export interface WindowState {
  id: string;
  appId: string;
  title: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  isActive: boolean;
  prevBounds?: { x: number; y: number; width: number; height: number };
}

export interface AppDefinition {
  id: string;
  title: string;
  icon: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  singleton?: boolean; // 是否只允许打开一个实例
}

let nextZIndex = 100;

interface DesktopStore {
  windows: WindowState[];
  activeWindowId: string | null;
  startMenuOpen: boolean;
  contextMenu: { x: number; y: number } | null;

  // Actions
  openApp: (app: AppDefinition, props?: Record<string, unknown>) => string;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, width: number, height: number) => void;
  toggleStartMenu: () => void;
  setStartMenuOpen: (open: boolean) => void;
  setContextMenu: (pos: { x: number; y: number } | null) => void;
}

export const useDesktopStore = create<DesktopStore>((set, get) => ({
  windows: [],
  activeWindowId: null,
  startMenuOpen: false,
  contextMenu: null,

  openApp: (app, _props) => {
    const { windows } = get();
    // 单例模式：如果已存在，聚焦该窗口
    if (app.singleton) {
      const existing = windows.find(w => w.appId === app.id);
      if (existing) {
        get().focusWindow(existing.id);
        if (existing.isMinimized) get().restoreWindow(existing.id);
        return existing.id;
      }
    }

    const id = `${app.id}-${Date.now()}`;
    const offset = (windows.length % 8) * 30;
    nextZIndex += 1;

    const newWindow: WindowState = {
      id,
      appId: app.id,
      title: app.title,
      icon: app.icon,
      x: 80 + offset,
      y: 40 + offset,
      width: app.defaultWidth,
      height: app.defaultHeight,
      minWidth: app.minWidth,
      minHeight: app.minHeight,
      zIndex: nextZIndex,
      isMinimized: false,
      isMaximized: false,
      isActive: true,
    };

    set(state => ({
      windows: [
        ...state.windows.map(w => ({ ...w, isActive: false })),
        newWindow,
      ],
      activeWindowId: id,
      startMenuOpen: false,
    }));

    return id;
  },

  closeWindow: (id) => {
    set(state => {
      const remaining = state.windows.filter(w => w.id !== id);
      const topWindow = remaining
        .filter(w => !w.isMinimized)
        .sort((a, b) => b.zIndex - a.zIndex)[0];
      return {
        windows: remaining.map(w => ({
          ...w,
          isActive: w.id === topWindow?.id,
        })),
        activeWindowId: topWindow?.id ?? null,
      };
    });
  },

  minimizeWindow: (id) => {
    set(state => {
      const remaining = state.windows
        .filter(w => !w.isMinimized && w.id !== id)
        .sort((a, b) => b.zIndex - a.zIndex);
      const topWindow = remaining[0];
      return {
        windows: state.windows.map(w =>
          w.id === id
            ? { ...w, isMinimized: true, isActive: false }
            : { ...w, isActive: w.id === topWindow?.id }
        ),
        activeWindowId: topWindow?.id ?? state.activeWindowId,
      };
    });
  },

  maximizeWindow: (id) => {
    set(state => ({
      windows: state.windows.map(w =>
        w.id === id
          ? {
              ...w,
              isMaximized: true,
              prevBounds: { x: w.x, y: w.y, width: w.width, height: w.height },
              x: 0,
              y: 0,
              width: window.innerWidth,
              height: window.innerHeight - 48,
            }
          : w
      ),
    }));
  },

  restoreWindow: (id) => {
    set(state => ({
      windows: state.windows.map(w => {
        if (w.id !== id) return w;
        const restored = w.prevBounds
          ? { x: w.prevBounds.x, y: w.prevBounds.y, width: w.prevBounds.width, height: w.prevBounds.height }
          : { x: w.x, y: w.y, width: w.width, height: w.height };
        return {
          ...w,
          isMinimized: false,
          isMaximized: false,
          ...restored,
          prevBounds: undefined,
        };
      }),
    }));
    get().focusWindow(id);
  },

  focusWindow: (id) => {
    nextZIndex += 1;
    set(state => ({
      windows: state.windows.map(w =>
        w.id === id
          ? { ...w, isActive: true, zIndex: nextZIndex }
          : { ...w, isActive: false }
      ),
      activeWindowId: id,
    }));
  },

  moveWindow: (id, x, y) => {
    set(state => ({
      windows: state.windows.map(w =>
        w.id === id ? { ...w, x, y } : w
      ),
    }));
  },

  resizeWindow: (id, width, height) => {
    set(state => ({
      windows: state.windows.map(w =>
        w.id === id
          ? {
              ...w,
              width: Math.max(width, w.minWidth),
              height: Math.max(height, w.minHeight),
            }
          : w
      ),
    }));
  },

  toggleStartMenu: () => {
    set(state => ({ startMenuOpen: !state.startMenuOpen }));
  },

  setStartMenuOpen: (open) => {
    set({ startMenuOpen: open });
  },

  setContextMenu: (pos) => {
    set({ contextMenu: pos });
  },
}));
