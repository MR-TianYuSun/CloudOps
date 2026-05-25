'use client';

import { useState, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';

const THEMES = [
  {
    id: 'glassmorphism',
    name: '毛玻璃暗黑',
    preview: { bg: '#070A14', primary: '#7C5CFF', accent: '#69E7FF' },
    colors: {
      '--background': '#070A14',
      '--foreground': '#F7FAFF',
      '--card': 'rgba(255,255,255,0.08)',
      '--primary': '#7C5CFF',
      '--muted': 'rgba(255,255,255,0.08)',
      '--border': 'rgba(255,255,255,0.1)',
      '--muted-foreground': '#9AA7C7',
      '--accent': '#69E7FF',
      '--destructive': '#EF4444',
    },
  },
  {
    id: 'ocean',
    name: '深海蓝绿',
    preview: { bg: '#0a1628', primary: '#0EA5E9', accent: '#06B6D4' },
    colors: {
      '--background': '#0a1628',
      '--foreground': '#E2E8F0',
      '--card': 'rgba(14,165,233,0.08)',
      '--primary': '#0EA5E9',
      '--muted': 'rgba(14,165,233,0.06)',
      '--border': 'rgba(14,165,233,0.15)',
      '--muted-foreground': '#64748B',
      '--accent': '#06B6D4',
      '--destructive': '#EF4444',
    },
  },
  {
    id: 'aurora',
    name: '极光森林',
    preview: { bg: '#0a1410', primary: '#22C55E', accent: '#A3E635' },
    colors: {
      '--background': '#0a1410',
      '--foreground': '#ECFDF5',
      '--card': 'rgba(34,197,94,0.08)',
      '--primary': '#22C55E',
      '--muted': 'rgba(34,197,94,0.06)',
      '--border': 'rgba(34,197,94,0.15)',
      '--muted-foreground': '#6B8A7A',
      '--accent': '#A3E635',
      '--destructive': '#EF4444',
    },
  },
  {
    id: 'sunset',
    name: '落日余晖',
    preview: { bg: '#1a0f0a', primary: '#F97316', accent: '#FBBF24' },
    colors: {
      '--background': '#1a0f0a',
      '--foreground': '#FFF7ED',
      '--card': 'rgba(249,115,22,0.08)',
      '--primary': '#F97316',
      '--muted': 'rgba(249,115,22,0.06)',
      '--border': 'rgba(249,115,22,0.15)',
      '--muted-foreground': '#A8907A',
      '--accent': '#FBBF24',
      '--destructive': '#EF4444',
    },
  },
  {
    id: 'rose',
    name: '玫瑰星云',
    preview: { bg: '#1a0a14', primary: '#EC4899', accent: '#F472B6' },
    colors: {
      '--background': '#1a0a14',
      '--foreground': '#FFF1F2',
      '--card': 'rgba(236,72,153,0.08)',
      '--primary': '#EC4899',
      '--muted': 'rgba(236,72,153,0.06)',
      '--border': 'rgba(236,72,153,0.15)',
      '--muted-foreground': '#A87A8A',
      '--accent': '#F472B6',
      '--destructive': '#EF4444',
    },
  },
  {
    id: 'minimal',
    name: '极简黑白',
    preview: { bg: '#111111', primary: '#FFFFFF', accent: '#888888' },
    colors: {
      '--background': '#111111',
      '--foreground': '#FAFAFA',
      '--card': 'rgba(255,255,255,0.05)',
      '--primary': '#FFFFFF',
      '--muted': 'rgba(255,255,255,0.05)',
      '--border': 'rgba(255,255,255,0.1)',
      '--muted-foreground': '#888888',
      '--accent': '#888888',
      '--destructive': '#EF4444',
    },
  },
];

export default function ThemeSettingsApp({ windowId }: { windowId: string }) {
  const [currentTheme, setCurrentTheme] = useState('glassmorphism');
  const [wallpaper, setWallpaper] = useState('');
  const [fontSize, setFontSize] = useState('medium');
  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    const saved = localStorage.getItem('desktop-theme');
    if (saved) setCurrentTheme(saved);

    // Load theme from server
    const token = getToken();
    if (token) {
      fetch('/api/themes', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (data.success && data.data) {
            if (data.data.theme_name && data.data.theme_name !== 'default') {
              setCurrentTheme(data.data.theme_name);
              localStorage.setItem('desktop-theme', data.data.theme_name);
              const theme = THEMES.find(t => t.id === data.data.theme_name);
              if (theme) applyThemeColors(theme);
            }
            if (data.data.accent_color) {
              document.documentElement.style.setProperty('--primary', data.data.accent_color);
            }
            if (data.data.wallpaper) setWallpaper(data.data.wallpaper);
            if (data.data.font_size) setFontSize(data.data.font_size);
          }
        })
        .catch(() => {});
    }
  }, []);

  const applyThemeColors = (theme: typeof THEMES[0]) => {
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  };

  const applyTheme = async (themeId: string) => {
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme) return;

    applyThemeColors(theme);
    setCurrentTheme(themeId);
    localStorage.setItem('desktop-theme', themeId);

    // Save to server
    const token = getToken();
    if (token) {
      fetch('/api/themes', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeName: themeId, accentColor: theme.preview.primary }),
      }).catch(() => {});
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0d0f1a]/95">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20 bg-[#0e1020]/50">
        <Palette className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-foreground/80">主题设置</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-xs text-muted-foreground mb-4">选择一个主题来改变桌面外观</p>
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map(theme => (
            <button
              key={theme.id}
              onClick={() => applyTheme(theme.id)}
              className={`relative p-3 rounded-xl border transition-all ${
                currentTheme === theme.id
                  ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border/20 bg-white/[0.02] hover:border-border/40 hover:bg-white/[0.04]'
              }`}
            >
              {currentTheme === theme.id && (
                <div className="absolute top-2 right-2">
                  <Check className="w-4 h-4 text-primary" />
                </div>
              )}
              {/* 预览色块 */}
              <div className="flex gap-1.5 mb-2.5">
                <div className="w-8 h-8 rounded-lg border border-white/10" style={{ backgroundColor: theme.preview.bg }} />
                <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: theme.preview.primary }} />
                <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: theme.preview.accent }} />
              </div>
              <span className="text-sm font-medium text-foreground/90">{theme.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
