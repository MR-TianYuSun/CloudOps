import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDb, getUploadDir } from '@/lib/db';
import { existsSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { getFileCategory } from '@/lib/file-types';

const MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  mp4: 'video/mp4', webm: 'video/webm', avi: 'video/x-msvideo', mov: 'video/quicktime',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac', aac: 'audio/aac',
  zip: 'application/zip', rar: 'application/x-rar-compressed', '7z': 'application/x-7z-compressed', tar: 'application/x-tar', gz: 'application/gzip',
  txt: 'text/plain', md: 'text/markdown', html: 'text/html', css: 'text/css', js: 'text/javascript', ts: 'text/typescript',
  json: 'application/json', xml: 'text/xml', csv: 'text/csv',
  py: 'text/x-python', java: 'text/x-java-source', c: 'text/x-c', cpp: 'text/x-c++', h: 'text/x-c',
  sh: 'text/x-shellscript', yml: 'text/yaml', yaml: 'text/yaml', toml: 'text/x-toml',
};

function getMimeType(ext: string): string {
  return MIME_MAP[ext.toLowerCase()] || 'application/octet-stream';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 从存储文件名中提取原始文件名和文件夹路径
 * v3格式: {timestamp}--{folderPath}--{originalFilename}
 *   例: 1779600997149--Documents/Reports--test.txt → { originalName: "test.txt", folderPath: "Documents/Reports" }
 *   例: 1779600997149----test.txt → { originalName: "test.txt", folderPath: "" } (根目录文件)
 * v2格式: {timestamp}_{originalFilename}
 *   例: 1779600997149_test.txt → { originalName: "test.txt", folderPath: "" }
 * v1格式: {timestamp}-{randomHex}.{ext}
 *   例: 1779458081854-950bd26e9cf1f779.txt → { originalName: "950bd26e9cf1f779.txt", folderPath: "" } (无法完美还原)
 */
function parseStorageName(storageName: string): { originalName: string; folderPath: string } {
  // v3格式: 1779600997149--Documents^Reports--test.txt (文件夹路径中 / 用 ^ 代替)
  const v3Match = storageName.match(/^\d+--(.+)--(.+)$/);
  if (v3Match) {
    const folderPath = v3Match[1].replace(/\^/g, '/'); // "Documents/Reports"
    const originalName = v3Match[2];
    return { originalName, folderPath };
  }
  // v3根目录格式: 1779600997149--test.txt (无文件夹路径)
  const v3RootMatch = storageName.match(/^\d+--(.+)$/);
  if (v3RootMatch) {
    return { originalName: v3RootMatch[1], folderPath: '' };
  }

  // v2格式: 1779600997149_test.txt
  const v2Match = storageName.match(/^\d+_(.+)$/);
  if (v2Match) {
    return { originalName: v2Match[1], folderPath: '' };
  }

  // v1格式: 1779458081854-950bd26e9cf1f779.txt
  const v1Match = storageName.match(/^\d+-(.+)$/);
  if (v1Match) {
    return { originalName: v1Match[1], folderPath: '' };
  }

  return { originalName: storageName, folderPath: '' };
}

/**
 * 递归扫描目录，返回所有文件（含完整路径和大小）
 */
function scanDir(dir: string): Array<{ name: string; fullPath: string; size: number }> {
  const results: Array<{ name: string; fullPath: string; size: number }> = [];
  if (!existsSync(dir)) return results;

  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        // 递归扫描子目录（以防未来存储结构改为按文件夹分目录）
        results.push(...scanDir(fullPath));
      } else if (entry.isFile()) {
        try {
          const stat = statSync(fullPath);
          results.push({ name: entry.name, fullPath, size: stat.size });
        } catch { /* skip unreadable files */ }
      }
    }
  } catch { /* skip unreadable dirs */ }

  return results;
}

/**
 * 确保文件夹层级存在，返回最终文件夹的 id
 * folderPath: "Documents/Reports" (不含前导/)
 */
function ensureFolderForRecovery(
  db: ReturnType<typeof getDb>,
  folderPath: string,
  userId: number,
  folderCache: Map<string, number>
): number {
  if (folderCache.has(folderPath)) {
    return folderCache.get(folderPath)!;
  }

  // 查找数据库中是否已有同名同路径的文件夹
  const virtualPath = `/${folderPath}`;
  const existing = db.prepare(
    `SELECT id FROM files WHERE path = ? AND is_folder = 1 AND deleted_at IS NULL`
  ).get(virtualPath) as { id: number } | undefined;

  if (existing) {
    folderCache.set(folderPath, existing.id);
    return existing.id;
  }

  const parts = folderPath.split('/').filter(Boolean);
  let currentParentId: number | null = null;
  let currentPath = '';

  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    const currentVirtualPath = `/${currentPath}`;

    // 检查缓存
    if (folderCache.has(currentPath)) {
      currentParentId = folderCache.get(currentPath)!;
      continue;
    }

    // 查找数据库中是否已有该文件夹
    const existingFolder = db.prepare(
      `SELECT id FROM files WHERE path = ? AND is_folder = 1 AND deleted_at IS NULL`
    ).get(currentVirtualPath) as { id: number } | undefined;

    if (existingFolder) {
      currentParentId = existingFolder.id;
      folderCache.set(currentPath, existingFolder.id);
      continue;
    }

    // 创建新文件夹
    const result = db.prepare(`
      INSERT INTO files (name, path, parent_id, is_folder, size, mime_type, file_ext, file_category, storage_path, uploaded_by, owner_type, created_at, updated_at)
      VALUES (?, ?, ?, 1, 0, NULL, NULL, NULL, NULL, ?, 'personal', datetime('now'), datetime('now'))
    `).run(part, currentVirtualPath, currentParentId, userId);

    currentParentId = Number(result.lastInsertRowid);
    folderCache.set(currentPath, currentParentId);
  }

  return currentParentId!;
}

/** POST /api/system-settings/recover - 恢复孤儿文件（保留文件夹结构） */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: '仅管理员可执行恢复操作' }, { status: 403 });
    }

    const uploadDir = getUploadDir();
    if (!existsSync(uploadDir)) {
      return NextResponse.json({ error: '上传目录不存在' }, { status: 404 });
    }

    const db = getDb();

    // 获取数据库中已知的 storage_path 列表
    const knownPaths = new Set(
      (db.prepare('SELECT storage_path FROM files WHERE storage_path IS NOT NULL').all() as { storage_path: string }[])
        .map(r => r.storage_path)
    );

    // 扫描上传目录
    const diskFiles = scanDir(uploadDir);

    // 过滤出孤儿文件（不在数据库中的文件），排除辅助文件
    const orphanFiles = diskFiles.filter(f => !knownPaths.has(f.fullPath) && !f.name.endsWith('.univer.json'));

    if (orphanFiles.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          uploadDir,
          scannedFiles: diskFiles.length,
          recovered: 0,
          recoveredFolders: 0,
          skipped: diskFiles.length,
          errors: 0,
          recoveredFiles: [],
          recoveredFolderList: [],
          skippedFiles: [],
          errorFiles: []
        }
      });
    }

    // 预处理：解析每个孤儿文件的原始名称和文件夹路径
    const processedFiles = orphanFiles.map(f => {
      const parsed = parseStorageName(f.name);
      return {
        ...f,
        originalName: parsed.originalName,
        folderPath: parsed.folderPath
      };
    });

    // 收集所有需要创建的文件夹路径
    const allFolderPaths = new Set<string>();
    for (const f of processedFiles) {
      if (f.folderPath) {
        allFolderPaths.add(f.folderPath);
        // 也需要确保中间路径都存在（如 Documents/Reports → Documents 和 Documents/Reports）
        const parts = f.folderPath.split('/');
        for (let i = 1; i <= parts.length; i++) {
          allFolderPaths.add(parts.slice(0, i).join('/'));
        }
      }
    }

    // 创建文件夹
    const folderCache = new Map<string, number>();
    const createdFolders: Array<{ name: string; path: string }> = [];

    for (const folderPath of allFolderPaths) {
      try {
        const folderId = ensureFolderForRecovery(db, folderPath, payload.userId, folderCache);
        const parts = folderPath.split('/');
        createdFolders.push({ name: parts[parts.length - 1], path: `/${folderPath}` });
      } catch (err) {
        console.error(`[Recover] 创建文件夹失败: ${folderPath}`, err);
      }
    }

    // 插入文件记录
    const insertStmt = db.prepare(`
      INSERT INTO files (name, path, storage_path, size, mime_type, file_ext, file_category,
        uploaded_by, parent_id, is_folder, owner_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'personal', datetime('now'), datetime('now'))
    `);

    const recoverMany = db.transaction((fileList: typeof processedFiles) => {
      const results: Array<Record<string, unknown>> = [];
      const errs: Array<{ filename: string; error: string }> = [];

      for (const file of fileList) {
        try {
          const ext = extname(file.originalName).replace('.', '').toLowerCase();
          const category = getFileCategory(file.originalName);
          const mimeType = ext ? getMimeType(ext) : 'application/octet-stream';

          // 确定文件的虚拟路径和父目录
          let virtualPath: string;
          let parentId: number | null = null;

          if (file.folderPath) {
            virtualPath = `/${file.folderPath}/${file.originalName}`;
            parentId = folderCache.get(file.folderPath) || null;
          } else {
            virtualPath = `/${file.originalName}`;
          }

          const result = insertStmt.run(
            file.originalName,
            virtualPath,
            file.fullPath,
            file.size,
            mimeType,
            ext || null,
            category || 'other',
            payload.userId,
            parentId
          );

          results.push({
            filename: file.originalName,
            size: file.size,
            path: virtualPath,
            folder: file.folderPath || '/',
            fileId: Number(result.lastInsertRowid),
            category
          });
        } catch (err) {
          errs.push({ filename: file.originalName, error: String(err) });
        }
      }
      return { results, errs };
    });

    let txResult: { results: Array<Record<string, unknown>>; errs: Array<{ filename: string; error: string }> };
    try {
      txResult = recoverMany(processedFiles);
    } catch (txErr) {
      // 事务失败，尝试逐个插入
      txResult = { results: [], errs: [] };
      for (const file of processedFiles) {
        try {
          const ext = extname(file.originalName).replace('.', '').toLowerCase();
          const category = getFileCategory(file.originalName);
          const mimeType = ext ? getMimeType(ext) : 'application/octet-stream';

          let virtualPath: string;
          let parentId: number | null = null;

          if (file.folderPath) {
            virtualPath = `/${file.folderPath}/${file.originalName}`;
            parentId = folderCache.get(file.folderPath) || null;
          } else {
            virtualPath = `/${file.originalName}`;
          }

          const result = insertStmt.run(
            file.originalName, virtualPath, file.fullPath,
            file.size, mimeType, ext || null,
            category || 'other', payload.userId, parentId
          );
          txResult.results.push({
            filename: file.originalName, size: file.size,
            path: virtualPath, folder: file.folderPath || '/',
            fileId: Number(result.lastInsertRowid), category
          });
        } catch (err) {
          txResult.errs.push({ filename: file.originalName, error: String(err) });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        uploadDir,
        scannedFiles: diskFiles.length,
        recovered: txResult.results.length,
        recoveredFolders: createdFolders.length,
        skipped: 0,
        errors: txResult.errs.length,
        recoveredFiles: txResult.results,
        recoveredFolderList: createdFolders,
        skippedFiles: [],
        errorFiles: txResult.errs
      }
    });
  } catch (error) {
    console.error('文件恢复失败:', error);
    return NextResponse.json({ error: '文件恢复失败' }, { status: 500 });
  }
}

/** GET /api/system-settings/recover - 扫描孤儿文件（含文件夹信息） */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: '仅管理员可访问' }, { status: 403 });
    }

    const uploadDir = getUploadDir();
    if (!existsSync(uploadDir)) {
      return NextResponse.json({ success: true, data: { uploadDir, diskFiles: 0, dbFiles: 0, dbFolders: 0, orphanFiles: 0, orphans: [] } });
    }

    const db = getDb();

    // 数据库中的文件记录
    const dbFiles = db.prepare('SELECT id, name, storage_path, size, path, parent_id, is_folder FROM files WHERE deleted_at IS NULL').all() as Array<{
      id: number; name: string; storage_path: string; size: number; path: string; parent_id: number | null; is_folder: number;
    }>;

    // 磁盘上的文件
    const diskFiles = scanDir(uploadDir);

    // 数据库中已知的 storage_path
    const knownPaths = new Set(dbFiles.filter(f => !f.is_folder && f.storage_path).map(f => f.storage_path));

    // 找出孤儿文件
    const orphans: Array<{ name: string; size: string; path: string; folder: string; originalName: string }> = [];

    for (const file of diskFiles) {
      if (!knownPaths.has(file.fullPath) && !file.name.endsWith('.univer.json')) {
        const parsed = parseStorageName(file.name);
        orphans.push({
          name: file.name,
          originalName: parsed.originalName,
          size: formatFileSize(file.size),
          path: file.fullPath,
          folder: parsed.folderPath || '/'
        });
      }
    }

    // 数据库中的文件夹和文件数量
    const dbFolders = dbFiles.filter(f => f.is_folder).length;
    const dbFileCount = dbFiles.filter(f => !f.is_folder).length;

    return NextResponse.json({
      success: true,
      data: {
        uploadDir,
        diskFiles: diskFiles.length,
        dbFiles: dbFileCount,
        dbFolders,
        orphanFiles: orphans.length,
        orphans
      }
    });
  } catch (error) {
    console.error('扫描失败:', error);
    return NextResponse.json({ error: '扫描失败' }, { status: 500 });
  }
}
