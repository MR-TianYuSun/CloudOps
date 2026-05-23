'use client';

import { useEffect, useRef, useState } from 'react';

interface PdfViewerProps {
  url: string;
  fileName: string;
}

export default function PdfViewer({ url, fileName }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // 先用 fetch 下载 PDF 数据（支持 token 认证）
  useEffect(() => {
    let cancelled = false;
    async function fetchPdf() {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();
        if (!cancelled) setPdfData(buffer);
      } catch (e) {
        if (!cancelled) {
          setError('PDF 加载失败: ' + (e instanceof Error ? e.message : '未知错误'));
          setLoading(false);
        }
      }
    }
    fetchPdf();
    return () => { cancelled = true; };
  }, [url]);

  // 渲染 PDF
  useEffect(() => {
    if (!pdfData) return;
    let cancelled = false;

    async function renderPdf() {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        // 使用 public 目录下的 worker 文件，通过 URL 引用
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const loadingTask = pdfjsLib.getDocument({ data: pdfData as ArrayBuffer });
        const pdf = await loadingTask.promise;

        if (cancelled) return;
        setNumPages(pdf.numPages);
        setLoading(false);

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.display = 'block';
          canvas.style.margin = '0 auto 16px auto';
          canvas.style.maxWidth = '100%';
          canvas.style.height = 'auto';
          canvas.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';

          const context = canvas.getContext('2d');
          if (!context) continue;

          await page.render({ canvasContext: context, viewport } as never).promise;

          if (cancelled) return;
          if (containerRef.current) {
            containerRef.current.appendChild(canvas);
            canvasRefs.current.push(canvas);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError('PDF 渲染失败: ' + (e instanceof Error ? e.message : '未知错误'));
          setLoading(false);
        }
      }
    }

    renderPdf();

    return () => {
      cancelled = true;
      canvasRefs.current = [];
    };
  }, [pdfData]);

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/30">
        <span className="text-sm text-muted-foreground truncate">{fileName}</span>
        {numPages > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="px-2 py-1 text-xs rounded bg-muted hover:bg-muted/80 disabled:opacity-30"
            >
              上一页
            </button>
            <span className="text-xs text-muted-foreground">
              {currentPage} / {numPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
              disabled={currentPage >= numPages}
              className="px-2 py-1 text-xs rounded bg-muted hover:bg-muted/80 disabled:opacity-30"
            >
              下一页
            </button>
          </div>
        )}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto p-4 bg-[#1a1a2e]">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">PDF 加载中...</div>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-destructive">{error}</div>
          </div>
        )}
        <div ref={containerRef} />
      </div>
    </div>
  );
}
