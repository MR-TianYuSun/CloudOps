'use client';

import dynamic from 'next/dynamic';
import { getCategoryByExt, getPreviewType, PREVIEWABLE_CATEGORIES } from '@/lib/file-types';
import { X } from 'lucide-react';

const PdfViewer = dynamic(() => import('./PdfViewer'), { ssr: false });
const DocxViewer = dynamic(() => import('./DocxViewer'), { ssr: false });
const PptxViewer = dynamic(() => import('./PptxViewer'), { ssr: false });
const ExcelViewer = dynamic(() => import('./ExcelViewer'), { ssr: false });
const TextViewer = dynamic(() => import('./TextViewer'), { ssr: false });
const ImageViewer = dynamic(() => import('./ImageViewer'), { ssr: false });
const MarkdownViewer = dynamic(() => import('./MarkdownViewer'), { ssr: false });
const HtmlViewer = dynamic(() => import('./HtmlViewer'), { ssr: false });
const CssViewer = dynamic(() => import('./CssViewer'), { ssr: false });
const VideoViewer = dynamic(() => import('./VideoViewer'), { ssr: false });
const AudioViewer = dynamic(() => import('./AudioViewer'), { ssr: false });

interface FilePreviewProps {
  fileId: number;
  fileName: string;
  fileExt: string;
  ownerType?: 'personal' | 'team';
  ownerId?: number;
  onClose: () => void;
}

export default function FilePreview({ fileId, fileName, fileExt, ownerType = 'personal', ownerId, onClose }: FilePreviewProps) {
  const category = getCategoryByExt(fileExt);
  const previewType = getPreviewType(fileName);
  const canPreview = PREVIEWABLE_CATEGORIES.includes(category);

  // 获取 token 用于构建带认证的 URL
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  const previewUrl = `/api/files/preview?id=${fileId}&token=${token}`;
  const downloadUrl = `/api/files/download?id=${fileId}&token=${token}`;

  // 不能预览的文件
  if (!canPreview) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/30">
          <span className="text-sm text-muted-foreground truncate">{fileName}</span>
          <button onClick={onClose} className="px-3 py-1 text-xs rounded bg-muted hover:bg-muted/80 text-muted-foreground transition-colors inline-flex items-center gap-1">
            <X className="w-3 h-3" /> 关闭
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-muted/20">
          <div className="text-muted-foreground">该文件类型暂不支持在线预览</div>
          <a
            href={downloadUrl}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
          >
            下载文件
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部信息栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground truncate max-w-[300px]">{fileName}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">{category}</span>
          {ownerType === 'team' && (
            <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">团队文件</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={downloadUrl}
            className="px-3 py-1 text-xs rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
          >
            下载
          </a>
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs rounded bg-muted hover:bg-muted/80 text-muted-foreground transition-colors inline-flex items-center gap-1"
          >
            <X className="w-3 h-3" /> 关闭
          </button>
        </div>
      </div>

      {/* 预览区域 */}
      <div className="flex-1 overflow-hidden">
        {previewType === 'pdf' && <PdfViewer url={previewUrl} fileName={fileName} />}
        {previewType === 'docx' && <DocxViewer url={previewUrl} fileName={fileName} />}
        {previewType === 'pptx' && <PptxViewer url={previewUrl} fileName={fileName} />}
        {(previewType === 'excel' || previewType === 'csv') && (
          <ExcelViewer url={previewUrl} fileName={fileName} isCsv={previewType === 'csv'} />
        )}
        {previewType === 'image' && <ImageViewer url={previewUrl} fileName={fileName} />}
        {previewType === 'markdown' && <MarkdownViewer url={previewUrl} />}
        {previewType === 'html' && <HtmlViewer url={previewUrl} />}
        {previewType === 'css' && <CssViewer url={previewUrl} />}
        {previewType === 'video' && <VideoViewer url={previewUrl} fileName={fileName} />}
        {previewType === 'audio' && <AudioViewer url={previewUrl} fileName={fileName} />}
        {previewType === 'text' && <TextViewer url={previewUrl} fileName={fileName} />}
        {previewType === 'none' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-muted/20 h-full">
            <div className="text-muted-foreground">该文件类型暂不支持在线预览</div>
            <a
              href={downloadUrl}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
            >
              下载文件
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
