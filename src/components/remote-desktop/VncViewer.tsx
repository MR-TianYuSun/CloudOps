'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RFBClass = any;

interface VncViewerProps {
  serverId: number;
  serverName: string;
  serverHost: string;
  vncPort: number;
  token: string;
  onClose: () => void;
}

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

// Load noVNC RFB from pre-bundled public asset
async function loadRFB(): Promise<RFBClass> {
  // If already loaded via script tag
  if ((window as unknown as Record<string, RFBClass>).RFB) {
    return (window as unknown as Record<string, RFBClass>).RFB;
  }

  return new Promise((resolve, reject) => {
    // Check if script already added
    const existing = document.getElementById('novnc-rfb-script');
    if (existing) {
      // Script tag exists, wait for load
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

    // Timeout fallback
    setTimeout(() => {
      document.removeEventListener('novnc-rfb-ready', onReady);
      const RFB = (window as unknown as Record<string, RFBClass>).RFB;
      if (RFB) resolve(RFB);
      else reject(new Error('Timeout loading noVNC'));
    }, 10000);
  });
}

export default function VncViewer({
  serverId,
  serverName,
  serverHost,
  vncPort,
  token,
  onClose,
}: VncViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<RFBClass | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [errorMsg, setErrorMsg] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [vncPassword, setVncPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const pendingCredentials = useRef<((password: string) => void) | null>(null);

  const disconnect = useCallback(() => {
    if (rfbRef.current) {
      try {
        rfbRef.current.disconnect();
      } catch {
        // ignore disconnect errors
      }
      rfbRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (!containerRef.current) return;

    // Clean up existing connection
    disconnect();

    setConnectionState('connecting');
    setErrorMsg('');

    try {
      // Load RFB class from bundled script
      const RFB = await loadRFB();

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/vnc?token=${encodeURIComponent(token)}&serverId=${serverId}`;

      const rfb = new RFB(containerRef.current, wsUrl, {
        credentials: vncPassword ? { password: vncPassword } : undefined,
      });

      rfbRef.current = rfb;

      // Set display properties
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
        // VNC server requires password
        if (vncPassword) {
          rfb.sendCredentials({ password: vncPassword });
        } else {
          setShowPasswordInput(true);
          setConnectionState('connected'); // UI still shows but waiting for credentials
          // Store the callback for later use
          pendingCredentials.current = (pwd: string) => {
            rfb.sendCredentials({ password: pwd });
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
  }, [serverId, token, vncPassword, disconnect]);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReconnect = () => {
    connect();
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
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

  const stateColors: Record<ConnectionState, string> = {
    connecting: 'text-yellow-400',
    connected: 'text-green-400',
    disconnected: 'text-gray-400',
    error: 'text-red-400',
  };

  const stateLabels: Record<ConnectionState, string> = {
    connecting: '正在连接...',
    connected: '已连接',
    disconnected: '已断开',
    error: '连接失败',
  };

  const stateDots: Record<ConnectionState, string> = {
    connecting: 'bg-yellow-400',
    connected: 'bg-green-400',
    disconnected: 'bg-gray-400',
    error: 'bg-red-400',
  };

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
            <span className="text-muted-foreground">
              {serverName} · {serverHost}:{vncPort}
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
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
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
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
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
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                正在连接到 {serverHost}:{vncPort}...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-card/60 backdrop-blur-xl border-t border-border text-xs text-muted-foreground">
        <span>{serverName} · VNC</span>
        <span>端口 {vncPort}</span>
      </div>
    </div>
  );
}
