'use client';

import { useEffect, useRef, useState } from 'react';

interface VideoViewerProps {
  url: string;
  fileName: string;
}

export default function VideoViewer({ url, fileName }: VideoViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
  }, [url]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px] bg-black/40 rounded-lg overflow-hidden">
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="text-center p-8">
          <div className="text-4xl mb-3">🎬</div>
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}
      <video
        ref={videoRef}
        src={url}
        controls
        className="max-w-full max-h-[70vh] rounded-lg shadow-2xl"
        style={{ display: error ? 'none' : 'block' }}
        onLoadedData={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError('视频加载失败，浏览器可能不支持此格式');
        }}
      >
        您的浏览器不支持视频播放
      </video>
      <p className="text-muted-foreground text-xs mt-3">{fileName}</p>
    </div>
  );
}
