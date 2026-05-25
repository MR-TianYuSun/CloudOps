'use client';

import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, HardDrive, Cloud, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardApp({ windowId }: { windowId: string }) {
  const [stats, setStats] = useState({ users: 0, files: 0, servers: 0, storage: 0 });
  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    const token = getToken();
    fetch('/api/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.code === 200 && data.data) {
          const d = data.data;
          setStats({
            users: d.userCount || 0,
            files: d.fileCount || 0,
            servers: d.serverCount || 0,
            storage: d.storageTotal > 0 ? Math.round((d.storageUsed / d.storageTotal) * 100) : 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  const pieData = [
    { name: '已使用', value: stats.storage || 30 },
    { name: '可用', value: (100 - (stats.storage || 30)) },
  ];
  const COLORS = ['#7C5CFF', '#1a1d2e'];

  const barData = [
    { name: '文档', value: 35 },
    { name: '图片', value: 25 },
    { name: '视频', value: 20 },
    { name: '代码', value: 12 },
    { name: '其他', value: 8 },
  ];

  const statCards = [
    { icon: Users, label: '用户数', value: stats.users || 5, color: 'text-blue-400' },
    { icon: Cloud, label: '文件总数', value: stats.files || 128, color: 'text-primary' },
    { icon: HardDrive, label: '服务器', value: stats.servers || 3, color: 'text-emerald-400' },
    { icon: Activity, label: '存储使用', value: `${stats.storage || 30}%`, color: 'text-amber-400' },
  ];

  return (
    <div className="w-full h-full overflow-y-auto p-4 bg-[#0d0f1a]/95">
      <div className="grid grid-cols-4 gap-3 mb-4">
        {statCards.map(card => (
          <div key={card.label} className="p-3 rounded-lg bg-white/[0.03] border border-border/10">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-[10px] text-muted-foreground">{card.label}</span>
            </div>
            <div className="text-xl font-bold text-foreground">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-white/[0.03] border border-border/10">
          <h3 className="text-xs font-medium text-foreground/80 mb-3">存储使用率</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" stroke="none">
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="p-3 rounded-lg bg-white/[0.03] border border-border/10">
          <h3 className="text-xs font-medium text-foreground/80 mb-3">文件分类分布</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9AA7C7' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9AA7C7' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="value" fill="#7C5CFF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
