'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, Plus, Trash2, Link, RefreshCw, CheckCircle, XCircle, Loader2, Pause } from 'lucide-react';

interface DownloadTask {
  id: number;
  url: string;
  filename: string;
  progress: number;
  status: string;
  total_size: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export default function DownloadManagerApp({ windowId }: { windowId: string }) {
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [newFilename, setNewFilename] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const getToken = useCallback(() => typeof window !== 'undefined' ? localStorage.getItem('token') : null, []);

  const fetchTasks = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/downloads', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setTasks(data.data || []);
    } catch (err) {
      console.error('获取下载任务失败', err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Auto-refresh for active tasks
  useEffect(() => {
    const hasActive = tasks.some(t => t.status === 'downloading' || t.status === 'pending');
    if (!hasActive) return;
    const interval = setInterval(fetchTasks, 2000);
    return () => clearInterval(interval);
  }, [tasks, fetchTasks]);

  const addTask = async () => {
    if (!newUrl.trim()) return;
    setSubmitting(true);
    const token = getToken();
    try {
      const filename = newFilename.trim() || newUrl.split('/').pop() || 'download';
      const res = await fetch('/api/downloads', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl, filename }),
      });
      const data = await res.json();
      if (data.success) {
        setNewUrl('');
        setNewFilename('');
        fetchTasks();
      }
    } catch (err) {
      console.error('创建下载任务失败', err);
    } finally {
      setSubmitting(false);
    }
  };

  const removeTask = async (id: number) => {
    const token = getToken();
    try {
      await fetch(`/api/downloads/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchTasks();
    } catch (err) {
      console.error('删除任务失败', err);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '--';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return `${size.toFixed(1)} ${units[i]}`;
  };

  const statusConfig: Record<string, { text: string; icon: typeof CheckCircle; color: string }> = {
    pending: { text: '等待中', icon: Loader2, color: 'text-amber-400' },
    downloading: { text: '下载中', icon: Loader2, color: 'text-primary' },
    completed: { text: '已完成', icon: CheckCircle, color: 'text-emerald-400' },
    failed: { text: '失败', icon: XCircle, color: 'text-red-400' },
    cancelled: { text: '已取消', icon: XCircle, color: 'text-muted-foreground' },
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0d0f1a]/95">
      {/* 标题 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20 bg-[#0e1020]/50">
        <Download className="w-4 h-4 text-primary shrink-0" />
        <span className="text-xs font-medium text-foreground/80">离线下载</span>
        <div className="flex-1" />
        <button onClick={fetchTasks} className="p-1 rounded hover:bg-white/5 text-muted-foreground transition-colors" title="刷新">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* 添加下载 */}
      <div className="px-3 py-2 border-b border-border/10">
        <div className="flex gap-1.5 mb-1.5">
          <div className="flex-1 flex items-center gap-1.5 bg-white/[0.03] border border-border/20 rounded-md px-2 py-1">
            <Link className="w-3 h-3 text-muted-foreground/40 shrink-0" />
            <input
              type="url"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              placeholder="输入下载链接..."
              className="flex-1 bg-transparent text-xs text-foreground/90 focus:outline-none placeholder:text-muted-foreground/30"
              onKeyDown={e => e.key === 'Enter' && addTask()}
            />
          </div>
          <input
            type="text"
            value={newFilename}
            onChange={e => setNewFilename(e.target.value)}
            placeholder="文件名(可选)"
            className="w-32 bg-white/[0.03] border border-border/20 rounded-md px-2 py-1 text-xs text-foreground/90 focus:outline-none placeholder:text-muted-foreground/30"
          />
          <button
            onClick={addTask}
            disabled={submitting || !newUrl.trim()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/20 text-primary text-xs hover:bg-primary/30 transition-colors disabled:opacity-50 shrink-0"
          >
            <Plus className="w-3 h-3" />
            下载
          </button>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-xs">加载中...</div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Download className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">暂无下载任务</p>
            <p className="text-[10px] mt-1 text-muted-foreground/40">输入链接开始离线下载</p>
          </div>
        ) : (
          <div className="divide-y divide-border/5">
            {tasks.map(task => {
              const cfg = statusConfig[task.status] || statusConfig.pending;
              const StatusIcon = cfg.icon;
              return (
                <div key={task.id} className="px-3 py-2.5 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start gap-2">
                    <StatusIcon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${cfg.color} ${task.status === 'downloading' ? 'animate-spin' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-foreground/80 truncate">{task.filename}</span>
                        <span className={`text-[10px] ${cfg.color} shrink-0 ml-2`}>{cfg.text}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground/40 truncate mt-0.5">{task.url}</div>
                      {(task.status === 'downloading' || task.status === 'pending') && (
                        <div className="mt-1.5">
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-[#69E7FF] transition-all duration-300"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-0.5">
                            <span className="text-[10px] text-muted-foreground/40">{task.progress}%</span>
                            <span className="text-[10px] text-muted-foreground/40">{formatSize(task.total_size)}</span>
                          </div>
                        </div>
                      )}
                      {task.status === 'failed' && task.error_message && (
                        <div className="text-[10px] text-red-400/70 mt-0.5">{task.error_message}</div>
                      )}
                      {task.status === 'completed' && task.completed_at && (
                        <div className="text-[10px] text-muted-foreground/40 mt-0.5">
                          完成于 {task.completed_at.slice(0, 16)} · {formatSize(task.total_size)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeTask(task.id)}
                      className="p-1 rounded hover:bg-white/5 text-muted-foreground/40 hover:text-red-400 transition-colors shrink-0"
                      title="删除"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 状态栏 */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/10 text-[10px] text-muted-foreground/40">
        <span>{tasks.filter(t => t.status === 'downloading').length} 个下载中</span>
        <span>{tasks.filter(t => t.status === 'completed').length} 个已完成</span>
      </div>
    </div>
  );
}
