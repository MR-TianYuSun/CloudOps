'use client';

import { useEffect, useRef, useState } from 'react';

interface AudioViewerProps {
  url: string;
  fileName: string;
}

export default function AudioViewer({ url, fileName }: AudioViewerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError('');
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [url]);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[300px] p-8">
      {error ? (
        <div className="text-center p-8">
          <div className="text-5xl mb-4">🎵</div>
          <p className="text-destructive text-sm">{error}</p>
        </div>
      ) : (
        <>
          {/* Visualizer-style decorative element */}
          <div className="flex items-end gap-1 mb-8 h-20">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-2 rounded-full bg-primary/60 animate-pulse transition-all duration-300"
                style={{
                  height: isPlaying ? '24px' : '8px',
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </div>

          {/* File info */}
          <div className="text-center mb-6">
            <div className="text-3xl mb-2">🎧</div>
            <p className="text-foreground font-medium text-lg">{fileName}</p>
            <p className="text-muted-foreground text-sm mt-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </p>
          </div>

          {/* Custom styled audio player */}
          <audio
            ref={audioRef}
            src={url}
            className="hidden"
            onLoadedData={() => {
              setLoading(false);
              if (audioRef.current) setDuration(audioRef.current.duration);
            }}
            onTimeUpdate={() => {
              if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onError={() => {
              setLoading(false);
              setError('音频加载失败，浏览器可能不支持此格式');
            }}
          />

          {/* Play controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (!audioRef.current) return;
                if (isPlaying) {
                  audioRef.current.pause();
                } else {
                  audioRef.current.play();
                }
              }}
              className="w-14 h-14 rounded-full bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors"
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <svg className="w-6 h-6 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-primary-foreground ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* Progress bar */}
          <div
            className="w-full max-w-md mt-6 h-1.5 bg-muted rounded-full cursor-pointer group"
            onClick={(e) => {
              if (!audioRef.current || !duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              audioRef.current.currentTime = ratio * duration;
            }}
          >
            <div
              className="h-full bg-primary rounded-full relative transition-all group-hover:bg-primary/80"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
