import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUploadDir } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getFileCategory, getFileExt, getMimeType } from '@/lib/file-types';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

function ensureUploadDir() {
  const UPLOAD_DIR = getUploadDir();
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * 根据路径字符串确保文件夹层级存在，返回最终文件夹的 id
 * folderPath: "Photos/2024/Vacation"
 * rootParentId: 当前所在目录的 parent_id
 * userId: 上传者 id
 */
function ensureFolderPath(db: ReturnType<typeof getDb>, folderPath: string, rootParentId: number | null, userId: number): number {
  const parts = folderPath.split('/').filter(Boolean);
  let currentParentId = rootParentId;

  for (const part of parts) {
    // 查找当前层级下是否已有同名文件夹
    const existing = db.prepare(
      `SELECT id FROM files WHERE name = ? AND parent_id ${currentParentId === null ? 'IS NULL' : '= ?'} AND is_folder = 1 AND deleted_at IS NULL AND uploaded_by = ? AND owner_type = 'personal'`
    ).get(
      ...(currentParentId === null ? [part, userId] : [part, currentParentId, userId])
    ) as { id: number } | undefined;

    if (existing) {
      currentParentId = existing.id;
    } else {
      // 创建新文件夹
      const newPath = currentParentId
        ? db.prepare('SELECT path FROM files WHERE id = ?').get(currentParentId) as { path: string } | undefined
        : null;

      const folderPathStr = newPath ? `${newPath.path}/${part}` : `/${part}`;
      const result = db.prepare(`
        INSERT INTO files (name, path, parent_id, is_folder, size, mime_type, file_ext, file_category, storage_path, uploaded_by, owner_type)
        VALUES (?, ?, ?, 1, 0, NULL, NULL, NULL, NULL, ?, 'personal')
      `).run(part, folderPathStr, currentParentId, userId);

      currentParentId = result.lastInsertRowid as number;
    }
  }

  return currentParentId as number;
}

/** POST /api/files/upload - 文件上传（支持文件夹路径） */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ code: 401, message: '令牌无效', data: null }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const parentIdRaw = formData.get('parent_id') as string | null;
    const parentId = parentIdRaw ? parseInt(parentIdRaw) : null;
    // parent_id 为 0 或 NaN 时视为根目录（NULL）
    const effectiveParentId = parentId && parentId > 0 ? parentId : null;
    // 文件夹路径（拖拽文件夹上传时传入，如 "Photos/2024/Vacation"）
    const folderPath = formData.get('folder_path') as string | null;

    if (!file) {
      return NextResponse.json({ code: 400, message: '请选择文件', data: null }, { status: 400 });
    }

    // 检查系统设置的最大上传大小（DB存储的是字节数）
    const db = getDb();
    const maxUploadSetting = db.prepare("SELECT value FROM system_settings WHERE key = 'max_upload_size'").get() as { value: string } | undefined;
    if (maxUploadSetting?.value) {
      const maxSizeBytes = parseInt(maxUploadSetting.value);
      if (!isNaN(maxSizeBytes) && maxSizeBytes > 0) {
        if (file.size > maxSizeBytes) {
          const maxSizeMB = Math.round(maxSizeBytes / 1024 / 1024);
          return NextResponse.json({ code: 400, message: `文件大小超出限制（最大 ${maxSizeMB}MB）`, data: null }, { status: 400 });
        }
      }
    }

    // 检查用户存储配额
    const user = db.prepare('SELECT storage_quota, storage_used FROM users WHERE id = ?').get(payload.userId) as { storage_quota: number, storage_used: number } | undefined;
    if (user && user.storage_quota > 0 && user.storage_used + file.size > user.storage_quota) {
      return NextResponse.json({ code: 400, message: '存储空间不足', data: null }, { status: 400 });
    }

    ensureUploadDir();

    // 计算文件的实际父目录
    let actualParentId = effectiveParentId;
    if (folderPath && folderPath.trim()) {
      actualParentId = ensureFolderPath(db, folderPath.trim(), effectiveParentId, payload.userId);
    }

    // 生成唯一存储文件名 — 包含文件夹路径和原始文件名以便数据恢复时还原
    // 格式: {timestamp}--{folderPath}--{originalFilename}（文件夹路径用--分隔）
    // 例: 1779600997149--Documents/Reports--test.txt
    // 无文件夹: 1779600997149----test.txt（双横线后无路径再双横线）
    const ext = getFileExt(file.name);
    const baseName = file.name.replace(/\.[^.]+$/, '');
    const folderPathForName = folderPath ? folderPath.trim().replace(/\//g, '^') : '';
    let storageName = folderPathForName
      ? `${Date.now()}--${folderPathForName}--${file.name}`
      : `${Date.now()}--${file.name}`;
    const storageDir = getUploadDir();
    // 如果文件名已存在，追加随机后缀
    if (fs.existsSync(path.join(storageDir, storageName))) {
      storageName = folderPathForName
        ? `${Date.now()}--${folderPathForName}--${baseName}_${crypto.randomBytes(4).toString('hex')}.${ext}`
        : `${Date.now()}--${baseName}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    }
    const storagePath = path.join(storageDir, storageName);

    // 写入文件
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(storagePath, buffer);

    // 计算文件的 path 字段
    let filePath = `/${file.name}`;
    if (actualParentId) {
      const parent = db.prepare('SELECT path FROM files WHERE id = ?').get(actualParentId) as { path: string } | undefined;
      if (parent) {
        filePath = `${parent.path}/${file.name}`;
      }
    }

    const result = db.prepare(`
      INSERT INTO files (name, path, parent_id, is_folder, size, mime_type, file_ext, file_category, storage_path, uploaded_by, owner_type)
      VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 'personal')
    `).run(
      file.name,
      filePath,
      actualParentId,
      file.size,
      getMimeType(file.name),
      ext,
      getFileCategory(file.name),
      storagePath,
      payload.userId
    );

    // 更新用户存储使用量
    db.prepare('UPDATE users SET storage_used = storage_used + ? WHERE id = ?').run(file.size, payload.userId);

    return NextResponse.json({
      code: 200,
      message: '上传成功',
      data: { id: result.lastInsertRowid, name: file.name },
    });
  } catch (e) {
    console.error('[Upload Error]', e);
    return NextResponse.json({ code: 500, message: '上传失败', data: null }, { status: 500 });
  }
}
