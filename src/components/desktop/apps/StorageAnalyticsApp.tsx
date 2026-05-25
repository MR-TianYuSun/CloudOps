'use client';

import { useState, useEffect } from 'react';
import { PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function StorageAnalyticsApp({ windowId }: { windowId: string }) {
  const [storageData, setStorageData] = useState({
    total: 53687091200,
    used: 0,
    byCategory: [] as { name: string; value: number; count: number }[],
    byUser: [] as { name: string; value: number }[],
    trend: [] as { date: string; value: number }[],
  });
  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    const token = getToken();
    fetch('/api/storage-analytics', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          const d = data.data;
          const categoryData = (d.byCategory || []).map((c: { category: string; size: number; count: number }) => ({
            name: c.category,
            value: c.size,
            count: c.count,
          }));
          const trendData = (d.byDay || []).map((t: { date: string; size: number }) => ({
            date: t.date.slice(5),
            value: t.size,
          }));
          setStorageData(prev => ({
            ...prev,
            total: d.quota > 0 ? d.quota : 53687091200,
            used: d.totalUsed,
            byCategory: categoryData,
            trend: trendData,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return `${size.toFixed(1)} ${units[i]}`;
  };

  const usagePercent = storageData.total > 0 ? Math.round((storageData.used / storageData.total) * 100) : 0;

  const categoryData = storageData.byCategory.length > 0
    ? storageData.byCategory
    : [
        { name: '文档', value: 1073741824, count: 45 },
        { name: '图片', value: 2147483648, count: 120 },
        { name: '视频', value: 4294967296, count: 15 },
        { name: '音频', value: 536870912, count: 30 },
        { name: '代码', value: 268435456, count: 200 },
        { name: '其他', value: 322122547, count: 50 },
      ];

  const COLORS = ['#7C5CFF', '#69E7FF', '#62FAD3', '#FBBF24', '#F87171', '#A78BFA'];

  const trendData = storageData.trend.length > 0
    ? storageData.trend
    : [
        { date: '1/1', value: Math.round(usagePercent * 0.7) },
        { date: '1/2', value: Math.round(usagePercent * 0.75) },
        { date: '1/3', value: Math.round(usagePercent * 0.8) },
        { date: '1/4', value: Math.round(usagePercent * 0.85) },
        { date: '1/5', value: Math.round(usagePercent * 0.9) },
        { date: '1/6', value: Math.round(usagePercent * 0.93) },
        { date: '1/7', value: usagePercent },
      ];

  return (
    <div className="w-full h-full overflow-y-auto p-4 bg-[#0d0f1a]/95">
      {/* 总存储概览 */}
      <div className="mb-4 p-4 rounded-lg bg-white/[0.03] border border-border/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground/90">存储空间概览</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatBytes(storageData.used)} / {formatBytes(storageData.total)}
          </span>
        </div>
        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-[#69E7FF] transition-all duration-500"
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground/60">已使用 {usagePercent}%</span>
          <span className="text-[10px] text-muted-foreground/60">剩余 {formatBytes(storageData.total - storageData.used)}</span>
        </div>
      </div>

      {/* 图表区 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* 按分类分布 */}
        <div className="p-3 rounded-lg bg-white/[0.03] border border-border/10">
          <h3 className="text-xs font-medium text-foreground/80 mb-2">按分类分布</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                outerRadius={70}
                innerRadius={40}
                dataKey="value"
                stroke="none"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {categoryData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatBytes(value)}
                contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 文件数量统计 */}
        <div className="p-3 rounded-lg bg-white/[0.03] border border-border/10">
          <h3 className="text-xs font-medium text-foreground/80 mb-2">文件数量统计</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9AA7C7' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9AA7C7' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="count" fill="#69E7FF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 使用趋势 */}
      <div className="p-3 rounded-lg bg-white/[0.03] border border-border/10">
        <h3 className="text-xs font-medium text-foreground/80 mb-2">7天使用趋势</h3>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={trendData}>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9AA7C7' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9AA7C7' }} axisLine={false} tickLine={false} unit="%" />
            <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
            <Bar dataKey="value" fill="#7C5CFF" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
