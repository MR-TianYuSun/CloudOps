'use client';

import { useEffect, useState } from 'react';

interface TextViewerProps {
  url: string;
  fileName: string;
}

export default function TextViewer({ url, fileName }: TextViewerProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadText() {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('下载失败');
        const text = await response.text();
        if (!cancelled) {
          setContent(text);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError('文本文件加载失败');
          setLoading(false);
        }
      }
    }

    loadText();
    return () => { cancelled = true; };
  }, [url]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/30">
        <span className="text-sm text-muted-foreground truncate">{fileName}</span>
        <span className="text-xs text-muted-foreground">文本文件</span>
      </div>
      <div className="flex-1 overflow-auto bg-muted/20">
        {loading && (
          <div className="flex items-center justify-center h-48">
            <div className="text-muted-foreground">加载中...</div>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-48">
            <div className="text-destructive">{error}</div>
          </div>
        )}
        {!loading && !error && (
          <pre className="p-4 text-sm font-mono text-foreground/80 whitespace-pre-wrap break-words leading-relaxed">
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}
