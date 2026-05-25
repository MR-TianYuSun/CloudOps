'use client';

import { useDesktopStore } from './DesktopStore';
import { APP_REGISTRY, type AppDefinition } from './AppRegistry';

export default function DesktopIcons() {
  const { openApp, setStartMenuOpen } = useDesktopStore();

  const desktopApps = APP_REGISTRY.filter(app =>
    ['cloud-drive', 'server-manager', 'dashboard', 'storage-analytics', 'recent-files', 'collab-editor', 'download-manager', 'theme-settings', 'file-encrypt', 'api-docs', 'terminal'].includes(app.id)
  );

  const handleDoubleClick = (app: AppDefinition) => {
    openApp(app);
    setStartMenuOpen(false);
  };

  return (
    <div className="absolute inset-0 p-4 pt-2">
      <div className="grid grid-cols-[repeat(auto-fill,80px)] gap-2 auto-rows-min">
        {desktopApps.map(app => (
          <button
            key={app.id}
            className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors group w-[80px]"
            onDoubleClick={() => handleDoubleClick(app)}
          >
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center text-xl group-hover:bg-primary/20 transition-colors shadow-lg shadow-black/20">
              {getAppIcon(app.icon)}
            </div>
            <span className="text-[10px] text-foreground/80 text-center leading-tight line-clamp-2 drop-shadow-md">
              {app.title}
            </span>
          </button>
        ))}
      </div>
    </div>
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
