'use client';

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// 懒加载所有应用组件
const CloudDriveApp = dynamic(() => import('./apps/CloudDriveApp'), { ssr: false });
const ServerManagerApp = dynamic(() => import('./apps/ServerManagerApp'), { ssr: false });
const DashboardApp = dynamic(() => import('./apps/DashboardApp'), { ssr: false });
const StorageAnalyticsApp = dynamic(() => import('./apps/StorageAnalyticsApp'), { ssr: false });
const RecentFilesApp = dynamic(() => import('./apps/RecentFilesApp'), { ssr: false });
const CollabEditorApp = dynamic(() => import('./apps/CollabEditorApp'), { ssr: false });
const DownloadManagerApp = dynamic(() => import('./apps/DownloadManagerApp'), { ssr: false });
const ThemeSettingsApp = dynamic(() => import('./apps/ThemeSettingsApp'), { ssr: false });
const FileEncryptApp = dynamic(() => import('./apps/FileEncryptApp'), { ssr: false });
const ApiDocsApp = dynamic(() => import('./apps/ApiDocsApp'), { ssr: false });
const WebdavSettingsApp = dynamic(() => import('./apps/WebdavSettingsApp'), { ssr: false });
const SettingsApp = dynamic(() => import('./apps/SettingsApp'), { ssr: false });
const UserManagementApp = dynamic(() => import('./apps/UserManagementApp'), { ssr: false });
const TerminalApp = dynamic(() => import('./apps/TerminalApp'), { ssr: false });

const APP_COMPONENT_MAP: Record<string, ComponentType<{ windowId: string }>> = {
  'cloud-drive': CloudDriveApp,
  'server-manager': ServerManagerApp,
  'dashboard': DashboardApp,
  'storage-analytics': StorageAnalyticsApp,
  'recent-files': RecentFilesApp,
  'collab-editor': CollabEditorApp,
  'download-manager': DownloadManagerApp,
  'theme-settings': ThemeSettingsApp,
  'file-encrypt': FileEncryptApp,
  'api-docs': ApiDocsApp,
  'webdav-settings': WebdavSettingsApp,
  'settings': SettingsApp,
  'user-management': UserManagementApp,
  'terminal': TerminalApp,
};

interface AppRendererProps {
  appId: string;
  windowId: string;
}

export default function AppRenderer({ appId, windowId }: AppRendererProps) {
  const AppComponent = APP_COMPONENT_MAP[appId];

  if (!AppComponent) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="text-4xl mb-2">🚧</div>
          <p className="text-sm">应用 "{appId}" 开发中...</p>
        </div>
      </div>
    );
  }

  return <AppComponent windowId={windowId} />;
}
