/**
 * Windows 模拟桌面 - 应用注册表
 */
import type { AppDefinition } from './DesktopStore';
export type { AppDefinition };

export const APP_REGISTRY: AppDefinition[] = [
  // 核心应用
  {
    id: 'cloud-drive',
    title: '云盘文件管理器',
    icon: 'folder',
    defaultWidth: 900,
    defaultHeight: 600,
    minWidth: 600,
    minHeight: 400,
    singleton: true,
  },
  {
    id: 'server-manager',
    title: '服务器管理',
    icon: 'server',
    defaultWidth: 900,
    defaultHeight: 600,
    minWidth: 600,
    minHeight: 400,
    singleton: true,
  },
  {
    id: 'dashboard',
    title: '系统仪表盘',
    icon: 'gauge',
    defaultWidth: 1000,
    defaultHeight: 650,
    minWidth: 700,
    minHeight: 450,
    singleton: true,
  },
  // P2 应用
  {
    id: 'storage-analytics',
    title: '存储空间分析',
    icon: 'pie-chart',
    defaultWidth: 800,
    defaultHeight: 550,
    minWidth: 600,
    minHeight: 400,
    singleton: true,
  },
  {
    id: 'recent-files',
    title: '最近文件',
    icon: 'clock',
    defaultWidth: 800,
    defaultHeight: 500,
    minWidth: 500,
    minHeight: 350,
    singleton: true,
  },
  {
    id: 'collab-editor',
    title: '在线文档编辑',
    icon: 'file-edit',
    defaultWidth: 900,
    defaultHeight: 650,
    minWidth: 600,
    minHeight: 400,
  },
  {
    id: 'download-manager',
    title: '离线下载',
    icon: 'download',
    defaultWidth: 750,
    defaultHeight: 500,
    minWidth: 500,
    minHeight: 350,
    singleton: true,
  },
  // P3 应用
  {
    id: 'theme-settings',
    title: '主题设置',
    icon: 'palette',
    defaultWidth: 650,
    defaultHeight: 500,
    minWidth: 450,
    minHeight: 350,
    singleton: true,
  },
  {
    id: 'file-encrypt',
    title: '文件加密',
    icon: 'shield',
    defaultWidth: 650,
    defaultHeight: 500,
    minWidth: 450,
    minHeight: 350,
    singleton: true,
  },
  {
    id: 'api-docs',
    title: 'API 开放接口',
    icon: 'code',
    defaultWidth: 900,
    defaultHeight: 650,
    minWidth: 600,
    minHeight: 400,
    singleton: true,
  },
  {
    id: 'webdav-settings',
    title: 'WebDAV 设置',
    icon: 'globe',
    defaultWidth: 650,
    defaultHeight: 500,
    minWidth: 450,
    minHeight: 350,
    singleton: true,
  },
  // 系统应用
  {
    id: 'settings',
    title: '系统设置',
    icon: 'settings',
    defaultWidth: 700,
    defaultHeight: 550,
    minWidth: 500,
    minHeight: 350,
    singleton: true,
  },
  {
    id: 'user-management',
    title: '用户管理',
    icon: 'users',
    defaultWidth: 800,
    defaultHeight: 550,
    minWidth: 600,
    minHeight: 400,
    singleton: true,
  },
  {
    id: 'terminal',
    title: '终端',
    icon: 'terminal',
    defaultWidth: 750,
    defaultHeight: 480,
    minWidth: 450,
    minHeight: 300,
  },
];

export function getAppById(id: string): AppDefinition | undefined {
  return APP_REGISTRY.find(a => a.id === id);
}
