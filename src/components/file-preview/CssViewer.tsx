'use client';

import { useEffect, useState } from 'react';

interface CssViewerProps {
  url: string;
}

export default function CssViewer({ url }: CssViewerProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      <style>{`
        .css-viewer .css-property { color: #69E7FF; }
        .css-viewer .css-value { color: #62FAD3; }
        .css-viewer .css-selector { color: #7C5CFF; font-weight: 600; }
        .css-viewer .css-comment { color: #9AA7C7; font-style: italic; }
      `}</style>
      <div className="px-4 py-2 border-b border-border">
        <span className="text-sm text-muted-foreground">CSS 样式表</span>
      </div>
      <pre className="flex-1 p-4 overflow-auto text-sm font-mono bg-card css-viewer" style={{ maxHeight: '70vh' }}>
        <code>{highlightCss(content)}</code>
      </pre>
    </div>
  );
}

function highlightCss(css: string): React.ReactNode {
  const lines = css.split('\n');
  return lines.map((line, i) => {
    let highlighted = line;
    // Comments
    if (line.trim().startsWith('/*') || line.trim().startsWith('*') || line.trim().endsWith('*/')) {
      return <div key={i} className="css-comment">{line}</div>;
    }
    // Selectors (lines with {)
    if (line.includes('{')) {
      const parts = line.split('{');
      return <div key={i}><span className="css-selector">{parts[0]}</span>{'{'}{parts[1]}</div>;
    }
    // Property: value lines
    if (line.includes(':') && line.includes(';')) {
      const match = line.match(/^(\s*)([\w-]+)(\s*:\s*)(.+)(;)$/);
      if (match) {
        return <div key={i}>{match[1]}<span className="css-property">{match[2]}</span>{match[3]}<span className="css-value">{match[4]}</span>{match[5]}</div>;
      }
    }
    return <div key={i}>{highlighted}</div>;
  });
}
