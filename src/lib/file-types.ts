/**
 * 文件分类系统 - 按后缀格式分类
 * 基于完整文件格式调研，覆盖文档、图片、音视频、代码、压缩包、数据等
 */

export type FileCategory =
  | 'document'    // 文档类：PDF、Word、PPT、Excel、TXT 等
  | 'image'       // 图片类：JPG、PNG、GIF、SVG、WebP 等
  | 'audio'       // 音频类：MP3、WAV、FLAC、AAC 等
  | 'video'       // 视频类：MP4、AVI、MKV、MOV 等
  | 'code'        // 代码/开发类：JS、PY、HTML、CSS、JSON 等
  | 'archive'     // 压缩包类：ZIP、RAR、7Z、TAR.GZ 等
  | 'data'        // 数据类：CSV、SQL、DB、XML 等
  | 'executable'  // 可执行类：EXE、DLL、SH、BAT 等
  | 'design'      // 设计类：PSD、AI、SKETCH、FIGMA 等
  | 'font'        // 字体类：TTF、OTF、WOFF 等
  | 'other';      // 其他

/** 文件分类配置：名称、图标颜色、可预览标记 */
export interface CategoryConfig {
  label: string;
  color: string;        // Tailwind 色值
  iconColor: string;    // 图标颜色 class
  previewable: boolean;
}

export const CATEGORY_CONFIG: Record<FileCategory, CategoryConfig> = {
  document: {
    label: '文档',
    color: 'text-blue-400',
    iconColor: '#60A5FA',
    previewable: true,
  },
  image: {
    label: '图片',
    color: 'text-purple-400',
    iconColor: '#C084FC',
    previewable: true,
  },
  audio: {
    label: '音频',
    color: 'text-orange-400',
    iconColor: '#FB923C',
    previewable: true,
  },
  video: {
    label: '视频',
    color: 'text-rose-400',
    iconColor: '#FB7185',
    previewable: true,
  },
  code: {
    label: '代码',
    color: 'text-emerald-400',
    iconColor: '#34D399',
    previewable: true,
  },
  archive: {
    label: '压缩包',
    color: 'text-amber-400',
    iconColor: '#FBBF24',
    previewable: false,
  },
  data: {
    label: '数据',
    color: 'text-cyan-400',
    iconColor: '#22D3EE',
    previewable: true,
  },
  executable: {
    label: '可执行',
    color: 'text-red-400',
    iconColor: '#F87171',
    previewable: false,
  },
  design: {
    label: '设计',
    color: 'text-pink-400',
    iconColor: '#F472B6',
    previewable: false,
  },
  font: {
    label: '字体',
    color: 'text-slate-400',
    iconColor: '#94A3B8',
    previewable: false,
  },
  other: {
    label: '其他',
    color: 'text-slate-400',
    iconColor: '#94A3B8',
    previewable: false,
  },
};

/** 后缀 → 分类映射表 */
const EXT_CATEGORY_MAP: Record<string, FileCategory> = {
  // === 文档类 ===
  pdf: 'document',
  doc: 'document', docx: 'document',
  xls: 'document', xlsx: 'document',
  ppt: 'document', pptx: 'document',
  txt: 'document', md: 'document', markdown: 'document',
  rtf: 'document', odt: 'document', ods: 'document', odp: 'document',
  wps: 'document', et: 'document', dps: 'document',
  epub: 'document', mobi: 'document', azw3: 'document',
  htm: 'document', html: 'document',
  // === 图片类 ===
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image',
  svg: 'image', webp: 'image', bmp: 'image', ico: 'image',
  tiff: 'image', tif: 'image', avif: 'image', heic: 'image', heif: 'image',
  raw: 'image', cr2: 'image', nef: 'image',
  // === 音频类 ===
  mp3: 'audio', wav: 'audio', flac: 'audio', aac: 'audio',
  ogg: 'audio', wma: 'audio', m4a: 'audio', opus: 'audio',
  aiff: 'audio', alac: 'audio',
  // === 视频类 ===
  mp4: 'video', avi: 'video', mkv: 'video', mov: 'video',
  wmv: 'video', flv: 'video', webm: 'video', m4v: 'video',
  mpg: 'video', mpeg: 'video', '3gp': 'video', mts: 'video',
  // === 代码/开发类 ===
  js: 'code', jsx: 'code', ts: 'code', tsx: 'code',
  py: 'code', java: 'code', c: 'code', cpp: 'code', h: 'code', hpp: 'code',
  go: 'code', rs: 'code', rb: 'code', php: 'code',
  swift: 'code', kt: 'code', scala: 'code', r: 'code',
  css: 'code', scss: 'code', less: 'code', sass: 'code',
  vue: 'code', svelte: 'code',
  sh: 'code', bash: 'code', zsh: 'code', bat: 'code', ps1: 'code',
  sql: 'code',
  dockerfile: 'code', yaml: 'code', yml: 'code', toml: 'code',
  ini: 'code', conf: 'code', cfg: 'code', env: 'code',
  // === 压缩包类 ===
  zip: 'archive', rar: 'archive', '7z': 'archive',
  tar: 'archive', gz: 'archive', bz2: 'archive', xz: 'archive',
  'tar.gz': 'archive', 'tar.bz2': 'archive', 'tar.xz': 'archive',
  iso: 'archive', dmg: 'archive', deb: 'archive', rpm: 'archive',
  // === 数据类 ===
  csv: 'data', tsv: 'data',
  json: 'data', xml: 'data',
  db: 'data', sqlite: 'data', sqlite3: 'data',
  log: 'data',
  // === 可执行类 ===
  exe: 'executable', msi: 'executable', dll: 'executable', so: 'executable',
  bin: 'executable', app: 'executable',
  // === 设计类 ===
  psd: 'design', ai: 'design', sketch: 'design', fig: 'design',
  xd: 'design', indd: 'design', cdr: 'design',
  // === 字体类 ===
  ttf: 'font', otf: 'font', woff: 'font', woff2: 'font', eot: 'font',
};

/** 可在线预览的后缀集合 */
const PREVIEWABLE_EXTENSIONS = new Set([
  // 文档
  'pdf', 'docx', 'xlsx', 'xls', 'pptx', 'ppt',
  'txt', 'md', 'csv',
  // 图片
  'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico',
  // 音频
  'mp3', 'wav', 'ogg', 'aac', 'm4a',
  // 视频
  'mp4', 'webm',
  // 代码/文本
  'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h',
  'go', 'rs', 'rb', 'php', 'css', 'scss', 'less', 'html', 'htm',
  'sh', 'bash', 'sql', 'yaml', 'yml', 'toml', 'json', 'xml',
  'md', 'markdown', 'conf', 'cfg', 'ini', 'env', 'log',
]);

/**
 * 根据文件名获取分类
 */
export function getFileCategory(filename: string): FileCategory {
  const ext = getFileExt(filename);
  return EXT_CATEGORY_MAP[ext.toLowerCase()] || 'other';
}

/**
 * 获取文件后缀（不含点）
 */
export function getFileExt(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toLowerCase();
}

/**
 * 判断文件是否可在线预览
 */
export function isFilePreviewable(filename: string): boolean {
  const ext = getFileExt(filename);
  return PREVIEWABLE_EXTENSIONS.has(ext);
}

/**
 * 根据后缀获取 MIME 类型
 */
export function getMimeType(filename: string): string {
  const ext = getFileExt(filename);
  const mimeMap: Record<string, string> = {
    // 文档
    pdf: 'application/pdf',
    doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain', md: 'text/markdown', csv: 'text/csv',
    rtf: 'application/rtf',
    // 图片
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
    svg: 'image/svg+xml', webp: 'image/webp', bmp: 'image/bmp', ico: 'image/x-icon',
    // 音频
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', aac: 'audio/aac', m4a: 'audio/mp4',
    // 视频
    mp4: 'video/mp4', webm: 'video/webm', avi: 'video/x-msvideo', mov: 'video/quicktime',
    mkv: 'video/x-matroska',
    // 代码
    js: 'text/javascript', ts: 'text/typescript', py: 'text/x-python',
    json: 'application/json', xml: 'application/xml', html: 'text/html', css: 'text/css',
    // 压缩包
    zip: 'application/zip', rar: 'application/x-rar-compressed', '7z': 'application/x-7z-compressed',
    gz: 'application/gzip', tar: 'application/x-tar',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * 获取预览类型（前端根据此值选择对应的预览组件）
 */
export type PreviewType = 'pdf' | 'docx' | 'excel' | 'pptx' | 'image' | 'audio' | 'video' | 'text' | 'csv' | 'markdown' | 'html' | 'css' | 'none';

export function getPreviewType(filename: string): PreviewType {
  const ext = getFileExt(filename);
  switch (ext) {
    case 'pdf': return 'pdf';
    case 'docx': return 'docx';
    case 'xlsx': case 'xls': return 'excel';
    case 'pptx': case 'ppt': return 'pptx';
    case 'csv': return 'csv';
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'svg': case 'webp': case 'bmp': case 'ico': return 'image';
    case 'mp3': case 'wav': case 'ogg': case 'aac': case 'm4a': return 'audio';
    case 'mp4': case 'webm': return 'video';
    case 'md': case 'markdown': return 'markdown';
    case 'html': case 'htm': return 'html';
    case 'css': case 'scss': case 'less': case 'sass': return 'css';
    case 'txt': case 'json': case 'xml':
    case 'js': case 'ts': case 'py': case 'java': case 'c': case 'cpp': case 'h':
    case 'sh': case 'bash': case 'sql':
    case 'yaml': case 'yml': case 'toml': case 'conf': case 'cfg': case 'ini':
    case 'env': case 'log': case 'rtf':
      return 'text';
    default: return 'none';
  }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
}

/**
 * 根据后缀获取分类（前端组件用）
 */
export function getCategoryByExt(ext: string): FileCategory {
  return EXT_CATEGORY_MAP[ext.toLowerCase()] || 'other';
}

/** 可预览的分类列表 */
export const PREVIEWABLE_CATEGORIES: FileCategory[] = [
  'document', 'image', 'audio', 'video', 'code', 'data',
];

/**
 * 获取分类对应图标名称（Lucide 图标名）
 */
export function getCategoryIcon(category: FileCategory): string {
  const iconMap: Record<FileCategory, string> = {
    document: 'file-text',
    image: 'image',
    audio: 'music',
    video: 'film',
    code: 'file-code',
    archive: 'archive',
    data: 'table',
    executable: 'terminal',
    design: 'palette',
    font: 'type',
    other: 'file',
  };
  return iconMap[category] || 'file';
}

/**
 * 获取分类图标颜色（hex）
 */
export function getCategoryColor(category: FileCategory): string {
  return CATEGORY_CONFIG[category]?.iconColor || '#94A3B8';
}
