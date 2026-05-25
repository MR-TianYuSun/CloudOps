'use client';

import { useState, useEffect, useCallback } from 'react';
import { Code, Copy, Check, Key, Trash2, Plus } from 'lucide-react';

interface ApiKeyItem {
  id: number;
  name: string;
  key_prefix: string;
  permissions: string;
  last_used_at: string | null;
  created_at: string;
}

const API_ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/files',
    description: '获取文件列表',
    params: 'parent_id, page, page_size',
    auth: 'Bearer Token / API Key',
  },
  {
    method: 'POST',
    path: '/api/files/upload',
    description: '上传文件',
    params: 'file (multipart), parent_id, path',
    auth: 'Bearer Token / API Key',
  },
  {
    method: 'DELETE',
    path: '/api/files/{id}',
    description: '删除文件',
    params: 'permanent (boolean)',
    auth: 'Bearer Token / API Key',
  },
  {
    method: 'GET',
    path: '/api/servers',
    description: '获取服务器列表',
    params: '-',
    auth: 'Bearer Token / API Key',
  },
  {
    method: 'POST',
    path: '/api/shares',
    description: '创建分享链接',
    params: 'fileId, expiresIn, password',
    auth: 'Bearer Token / API Key',
  },
  {
    method: 'GET',
    path: '/api/stats',
    description: '获取系统概览统计',
    params: '-',
    auth: 'Bearer Token / API Key',
  },
  {
    method: 'GET',
    path: '/api/stats/storage',
    description: '获取存储空间统计',
    params: '-',
    auth: 'Bearer Token / API Key',
  },
  {
    method: 'GET',
    path: '/api/files/recent',
    description: '获取最近访问的文件',
    params: 'limit (default: 20)',
    auth: 'Bearer Token / API Key',
  },
  {
    method: 'POST',
    path: '/api/files/encrypt',
    description: '文件加密/解密',
    params: 'fileId, password, action (encrypt|decrypt)',
    auth: 'Bearer Token / API Key',
  },
  {
    method: 'GET',
    path: '/api/comments/{fileId}',
    description: '获取文件评论',
    params: '-',
    auth: 'Bearer Token / API Key',
  },
  {
    method: 'POST',
    path: '/api/comments',
    description: '添加文件评论',
    params: 'fileId, content, parentId',
    auth: 'Bearer Token / API Key',
  },
];

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  POST: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  PUT: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  DELETE: 'bg-red-500/10 text-red-400 border-red-500/20',
  PATCH: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export default function ApiDocsApp({ windowId }: { windowId: string }) {
  const [apiKey, setApiKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const getToken = useCallback(() => typeof window !== 'undefined' ? localStorage.getItem('token') : null, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch('/api/api-keys', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.success) setApiKeys(data.data || []); })
      .catch(() => {});
  }, [getToken]);

  const generateApiKey = async () => {
    setGenerating(true);
    try {
      const token = getToken();
      const name = newKeyName.trim() || 'Default API Key';
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, permissions: 'read' }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setApiKey(data.data.key);
        setNewKeyName('');
        const listRes = await fetch('/api/api-keys', { headers: { Authorization: `Bearer ${token}` } });
        const listData = await listRes.json();
        if (listData.success) setApiKeys(listData.data || []);
      }
    } catch {
      // error
    } finally {
      setGenerating(false);
    }
  };

  const deleteApiKey = async (id: number) => {
    const token = getToken();
    try {
      await fetch(`/api/api-keys/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setApiKeys(prev => prev.filter(k => k.id !== id));
    } catch {}
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0d0f1a]/95">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20 bg-[#0e1020]/50">
        <Code className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-foreground/80">API 开放接口文档</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* API Key 区域 */}
        <div className="mb-4 p-3 rounded-lg bg-white/[0.03] border border-border/10">
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground/80">API 密钥</span>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mb-2">
            使用 API Key 可以通过 HTTP Header <code className="text-primary/80">X-API-Key</code> 认证访问所有接口
          </p>
          <div className="flex gap-2">
            <div className="flex-1 px-3 py-1.5 bg-white/5 border border-border/20 rounded-md text-xs text-foreground/80 font-mono truncate">
              {apiKey || '点击生成 API Key'}
            </div>
            {apiKey && (
              <button
                onClick={() => copyToClipboard(apiKey)}
                className="px-2 py-1.5 rounded-md bg-white/5 border border-border/20 text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
            <button
              onClick={generateApiKey}
              disabled={generating}
              className="px-3 py-1.5 rounded-md bg-primary/20 text-primary text-xs hover:bg-primary/30 transition-colors disabled:opacity-50"
            >
              {generating ? '生成中...' : '生成'}
            </button>
          </div>
        </div>

        {/* Base URL */}
        <div className="mb-4 p-3 rounded-lg bg-white/[0.03] border border-border/10">
          <span className="text-xs text-muted-foreground">Base URL</span>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-xs text-foreground/80 font-mono">
              {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}
            </code>
            <button onClick={() => copyToClipboard(typeof window !== 'undefined' ? window.location.origin : '')} className="text-muted-foreground/50 hover:text-foreground transition-colors">
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 认证方式 */}
        <div className="mb-4 p-3 rounded-lg bg-white/[0.03] border border-border/10">
          <h3 className="text-xs font-medium text-foreground/80 mb-2">认证方式</h3>
          <div className="space-y-2">
            <div>
              <span className="text-[10px] text-muted-foreground">方式一: Bearer Token</span>
              <div className="mt-1 px-2.5 py-1.5 bg-black/20 rounded text-[10px] font-mono text-foreground/70">
                Authorization: Bearer {'<your_jwt_token>'}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground">方式二: API Key</span>
              <div className="mt-1 px-2.5 py-1.5 bg-black/20 rounded text-[10px] font-mono text-foreground/70">
                X-API-Key: {'<your_api_key>'}
              </div>
            </div>
          </div>
        </div>

        {/* 接口列表 */}
        <h3 className="text-xs font-medium text-foreground/80 mb-2">接口列表</h3>
        <div className="space-y-2">
          {API_ENDPOINTS.map((ep, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-white/[0.03] border border-border/10 hover:border-border/20 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${methodColors[ep.method]}`}>
                  {ep.method}
                </span>
                <code className="text-xs text-foreground/80 font-mono">{ep.path}</code>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mb-1">{ep.description}</p>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground/40">
                <span>参数: {ep.params}</span>
                <span>认证: {ep.auth}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
