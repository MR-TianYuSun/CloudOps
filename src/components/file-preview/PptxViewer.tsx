'use client';

import { useEffect, useRef, useState } from 'react';

interface PptxViewerProps {
  url: string;
  fileName: string;
}

export default function PptxViewer({ url, fileName }: PptxViewerProps) {
  const [slides, setSlides] = useState<string[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderPptx() {
      try {
        const JSZip = (await import('jszip')).default;

        const response = await fetch(url);
        if (!response.ok) throw new Error('下载失败');
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();

        const zip = await JSZip.loadAsync(arrayBuffer);
        const slideFiles: string[] = [];

        // 提取所有幻灯片
        const slideEntries = Object.keys(zip.files)
          .filter(name => name.match(/ppt\/slides\/slide\d+\.xml$/))
          .sort((a, b) => {
            const numA = parseInt(a.match(/slide(\d+)\.xml$/)?.[1] || '0');
            const numB = parseInt(b.match(/slide(\d+)\.xml$/)?.[1] || '0');
            return numA - numB;
          });

        for (const slidePath of slideEntries) {
          const xmlContent = await zip.files[slidePath].async('text');
          slideFiles.push(xmlContent);
        }

        if (cancelled) return;
        setSlides(slideFiles);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError('PPTX 文件加载失败，请下载后查看');
          setLoading(false);
        }
      }
    }

    renderPptx();
    return () => { cancelled = true; };
  }, [url]);

  // 简单解析 PPTX XML 提取文本内容
  function extractTextFromXml(xml: string): string[] {
    const texts: string[] = [];
    const regex = /<a:t>(.*?)<\/a:t>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      if (match[1].trim()) {
        texts.push(match[1].trim());
      }
    }
    return texts;
  }

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/30">
        <span className="text-sm text-muted-foreground truncate">{fileName}</span>
        {slides.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
              disabled={currentSlide <= 0}
              className="px-2 py-1 text-xs rounded bg-muted hover:bg-muted/80 disabled:opacity-30"
            >
              上一页
            </button>
            <span className="text-xs text-muted-foreground">
              {currentSlide + 1} / {slides.length}
            </span>
            <button
              onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
              disabled={currentSlide >= slides.length - 1}
              className="px-2 py-1 text-xs rounded bg-muted hover:bg-muted/80 disabled:opacity-30"
            >
              下一页
            </button>
          </div>
        )}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto p-6 bg-muted/20">
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
        {!loading && !error && slides.length > 0 && (
          <div className="max-w-3xl mx-auto">
            {/* 幻灯片卡片 */}
            <div className="aspect-[16/9] bg-white rounded-lg shadow-lg p-8 flex flex-col justify-center">
              <div className="space-y-3">
                {extractTextFromXml(slides[currentSlide]).map((text, idx) => (
                  <p key={idx} className={`text-gray-800 ${idx === 0 ? 'text-xl font-bold' : 'text-sm'}`}>
                    {text}
                  </p>
                ))}
                {extractTextFromXml(slides[currentSlide]).length === 0 && (
                  <p className="text-gray-400 text-sm text-center">此幻灯片无文本内容（可能包含图片或图形）</p>
                )}
              </div>
            </div>
            {/* 缩略图 */}
            {slides.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`flex-shrink-0 w-16 h-10 rounded text-xs flex items-center justify-center transition-colors ${
                      idx === currentSlide
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
