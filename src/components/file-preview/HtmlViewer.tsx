'use client';

import { useEffect, useState } from 'react';

interface HtmlViewerProps {
  url: string;
}

export default function HtmlViewer({ url }: HtmlViewerProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');

  useEffect(() => {
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('加载失败');
        return res.text();
      })
      .then(text => {
        setContent(text);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [url]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">加载失败: {error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
        <button
          onClick={() => setViewMode('preview')}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            viewMode === 'preview' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          预览
        </button>
        <button
          onClick={() => setViewMode('source')}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            viewMode === 'source' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          源码
        </button>
      </div>
      {viewMode === 'preview' ? (
        <iframe
          srcDoc={content}
          className="flex-1 bg-white"
          style={{ minHeight: '60vh', maxHeight: '70vh' }}
          sandbox="allow-same-origin"
          title="HTML Preview"
        />
      ) : (
        <pre className="flex-1 p-4 overflow-auto text-sm text-foreground bg-card font-mono" style={{ maxHeight: '70vh' }}>
          <code>{content}</code>
        </pre>
      )}
    </div>
  );
}
