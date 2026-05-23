'use client';

import { useState, useEffect } from 'react';

interface ImageViewerProps {
  url: string;
  fileName: string;
}

export default function ImageViewer({ url, fileName }: ImageViewerProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    // 构建 URL：如果 url 已含 token 参数则直接用，否则追加
    const fetchUrl = url.includes('token=') ? url : `${url}${url.includes('?') ? '&' : '?'}token=${token}`;

    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load image');
        return res.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setImgUrl(objectUrl);
      })
      .catch(() => {
        setError(true);
      });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/30">
          <span className="text-sm text-muted-foreground truncate">{fileName}</span>
          <span className="text-xs text-muted-foreground">图片</span>
        </div>
        <div className="flex-1 flex items-center justify-center bg-muted/20">
          <div className="text-muted-foreground text-sm">图片加载失败</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/30">
        <span className="text-sm text-muted-foreground truncate">{fileName}</span>
        <span className="text-xs text-muted-foreground">图片</span>
      </div>
      <div className="flex-1 overflow-auto p-4 bg-muted/20 flex items-center justify-center">
        {imgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgUrl}
            alt={fileName}
            className="max-w-full max-h-full object-contain rounded shadow-lg"
          />
        ) : (
          <div className="text-muted-foreground text-sm animate-pulse">加载中...</div>
        )}
      </div>
    </div>
  );
}
