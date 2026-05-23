'use client';

import { useState } from 'react';
import { Settings, Shield, Database, Bell, Info } from 'lucide-react';

const TABS = [
  { key: 'general', label: '基本设置', icon: Settings },
  { key: 'security', label: '安全设置', icon: Shield },
  { key: 'storage', label: '存储配置', icon: Database },
  { key: 'notification', label: '通知设置', icon: Bell },
  { key: 'about', label: '关于系统', icon: Info },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-xl font-bold mb-4">系统设置</h1>
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* 左侧Tab - 水平滚动(移动端) / 垂直(桌面) */}
        <div className="flex md:flex-col gap-1 md:w-48 md:shrink-0 overflow-x-auto md:overflow-visible pb-2 md:pb-0 -mb-2 md:mb-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-surface-container/50 hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 min-w-0">
          {activeTab === 'general' && (
            <div className="bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl p-4 md:p-6 space-y-5">
              <h2 className="text-base font-bold">基本设置</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">系统名称</label>
                  <input className="w-full bg-surface-container border-none rounded-lg px-3 py-2 text-sm" defaultValue="CloudOps" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">系统端口</label>
                  <input className="w-full bg-surface-container border-none rounded-lg px-3 py-2 text-sm" defaultValue="4000" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">默认存储配额</label>
                  <input className="w-full bg-surface-container border-none rounded-lg px-3 py-2 text-sm" defaultValue="50GB" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">文件分片大小</label>
                  <select className="w-full bg-surface-container border-none rounded-lg px-3 py-2 text-sm">
                    <option>1MB</option><option>2MB</option><option selected>5MB</option><option>10MB</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">回收站保留天数</label>
                  <input className="w-full bg-surface-container border-none rounded-lg px-3 py-2 text-sm" defaultValue="30" />
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={handleSave}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${saved ? 'bg-green-500/20 text-green-400' : 'bg-primary text-primary-foreground'}`}>
                  {saved ? '已保存' : '保存设置'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl p-4 md:p-6 space-y-5">
              <h2 className="text-base font-bold">安全设置</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm">双因素认证</p><p className="text-xs text-muted-foreground">启用 TOTP 二步验证</p></div>
                  <div className="w-10 h-6 rounded-full bg-surface-container cursor-pointer"><div className="w-4 h-4 rounded-full bg-muted-foreground/40 m-1" /></div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">IP 白名单</label>
                  <textarea className="w-full bg-surface-container border-none rounded-lg px-3 py-2 text-sm h-20 resize-none"
                    defaultValue="192.168.1.0/24&#10;10.0.0.0/8" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">会话超时</label>
                  <select className="w-full bg-surface-container border-none rounded-lg px-3 py-2 text-sm">
                    <option>15 分钟</option><option selected>30 分钟</option><option>1 小时</option><option>2 小时</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={handleSave}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${saved ? 'bg-green-500/20 text-green-400' : 'bg-primary text-primary-foreground'}`}>
                  {saved ? '已保存' : '保存设置'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'storage' && (
            <div className="bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl p-4 md:p-6 space-y-5">
              <h2 className="text-base font-bold">存储配置</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">默认副本数</label>
                  <select className="w-full bg-surface-container border-none rounded-lg px-3 py-2 text-sm">
                    <option selected>1 副本</option><option>2 副本</option><option>3 副本</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="text-sm">自动迁移</p><p className="text-xs text-muted-foreground">节点离线时自动迁移数据</p></div>
                  <div className="w-10 h-6 rounded-full bg-primary cursor-pointer"><div className="w-4 h-4 rounded-full bg-white m-1 ml-auto" /></div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">数据目录</label>
                  <input className="w-full bg-surface-container border-none rounded-lg px-3 py-2 text-sm" defaultValue="/data/cloudops" />
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={handleSave}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${saved ? 'bg-green-500/20 text-green-400' : 'bg-primary text-primary-foreground'}`}>
                  {saved ? '已保存' : '保存设置'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notification' && (
            <div className="bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl p-4 md:p-6 space-y-5">
              <h2 className="text-base font-bold">通知设置</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm">告警邮件通知</p><p className="text-xs text-muted-foreground">资源超阈值时发送邮件</p></div>
                  <div className="w-10 h-6 rounded-full bg-primary cursor-pointer"><div className="w-4 h-4 rounded-full bg-white m-1 ml-auto" /></div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">SMTP 服务器</label>
                  <input className="w-full bg-surface-container border-none rounded-lg px-3 py-2 text-sm" defaultValue="smtp.example.com" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">告警阈值</label>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="text-xs text-muted-foreground">CPU</label><input className="w-full bg-surface-container border-none rounded-lg px-2 py-1.5 text-sm mt-1" defaultValue="90%" /></div>
                    <div><label className="text-xs text-muted-foreground">内存</label><input className="w-full bg-surface-container border-none rounded-lg px-2 py-1.5 text-sm mt-1" defaultValue="85%" /></div>
                    <div><label className="text-xs text-muted-foreground">磁盘</label><input className="w-full bg-surface-container border-none rounded-lg px-2 py-1.5 text-sm mt-1" defaultValue="90%" /></div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={handleSave}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${saved ? 'bg-green-500/20 text-green-400' : 'bg-primary text-primary-foreground'}`}>
                  {saved ? '已保存' : '保存设置'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="bg-surface/60 backdrop-blur-xl border border-border/30 rounded-xl p-4 md:p-6 space-y-5">
              <h2 className="text-base font-bold">关于系统</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">版本号</span><span>v1.0.0</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">构建日期</span><span>2025-01-15</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">开源协议</span><span>MIT</span></div>
              </div>
              <div className="border-t border-border/20 pt-4">
                <p className="text-xs text-muted-foreground">CloudOps 是一款面向小团队的一体化云运维平台，集云盘存储、服务器管理、存储节点于一体。</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
