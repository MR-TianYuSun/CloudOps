'use client';

import { useEffect, useRef, useState } from 'react';

interface DocxViewerProps {
  url: string;
  fileName: string;
}

export default function DocxViewer({ url, fileName }: DocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderDocx() {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('下载失败');
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();

        const docx = await import('docx-preview');
        if (cancelled || !containerRef.current) return;

        await docx.renderAsync(arrayBuffer, containerRef.current, undefined, {
          className: 'docx-wrapper',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
          experimental: false,
          trimXmlDeclaration: true,
          useBase64URL: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
        });

        if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError('DOCX 文档加载失败');
          setLoading(false);
        }
      }
    }

    renderDocx();
    return () => { cancelled = true; };
  }, [url]);

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/30">
        <span className="text-sm text-muted-foreground truncate">{fileName}</span>
        <span className="text-xs text-muted-foreground">Word 文档</span>
      </div>

      {/* 内容区 */}
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
        <div
          ref={containerRef}
          className="docx-container"
          style={{ minHeight: loading ? 0 : 400 }}
        />
      </div>

      {/* docx-preview 样式覆盖 */}
      <style jsx global>{`
        .docx-wrapper {
          background: #fff !important;
          padding: 16px !important;
        }
        .docx-wrapper > section.docx {
          box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
          margin-bottom: 16px !important;
        }
      `}</style>
    </div>
  );
}
