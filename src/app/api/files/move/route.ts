import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

/** POST /api/files/move - 移动/复制文件 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || new URL(request.url).searchParams.get('token');
    if (!token) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ code: 401, message: '令牌无效', data: null }, { status: 401 });
    }

    const body = await request.json();
    const { fileIds, file_ids, targetFolderId, target_parent_id, action, mode } = body as {
      fileIds?: number[];
      file_ids?: number[];
      targetFolderId?: number | null;
      target_parent_id?: number | null;
      action?: 'move' | 'copy';
      mode?: 'move' | 'copy';
    };

    const actualFileIds = fileIds || file_ids;
    const actualTargetId = targetFolderId ?? target_parent_id ?? null;
    const actualAction = action || mode || 'move';

    if (!actualFileIds || !Array.isArray(actualFileIds) || actualFileIds.length === 0) {
      return NextResponse.json({ code: 400, message: '请选择文件', data: null }, { status: 400 });
    }

    const db = getDb();

    // 验证目标文件夹存在且是文件夹
    if (actualTargetId) {
      const target = db.prepare('SELECT * FROM files WHERE id = ? AND is_folder = 1 AND deleted_at IS NULL').get(actualTargetId) as Record<string, unknown> | undefined;
      if (!target) {
        return NextResponse.json({ code: 404, message: '目标文件夹不存在', data: null }, { status: 404 });
      }
    }

    // 不能移动到自身或自己的子文件夹内
    if (actualAction === 'move' && actualTargetId) {
      for (const fileId of actualFileIds) {
        if (fileId === actualTargetId) {
          return NextResponse.json({ code: 400, message: '不能移动到自身', data: null }, { status: 400 });
        }
        if (isDescendant(db, actualTargetId, fileId)) {
          return NextResponse.json({ code: 400, message: '不能移动到子文件夹中', data: null }, { status: 400 });
        }
      }
    }

    if (actualAction === 'move') {
      const stmt = db.prepare(`UPDATE files SET parent_id = ?, updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`);
      const transaction = db.transaction(() => {
        for (const fileId of actualFileIds) {
          const file = db.prepare('SELECT * FROM files WHERE id = ?').get(fileId) as Record<string, unknown> | undefined;
          if (!file) continue;
          if (payload.role !== 'admin' && Number(file.uploaded_by) !== payload.userId) continue;
          const resolvedTargetId = actualTargetId === 0 ? null : actualTargetId;
          stmt.run(resolvedTargetId, fileId);
        }
      });
      transaction();
    } else {
      // 复制
      const transaction = db.transaction(() => {
        for (const fileId of actualFileIds) {
          const file = db.prepare('SELECT * FROM files WHERE id = ?').get(fileId) as Record<string, unknown> | undefined;
          if (!file) continue;
          if (payload.role !== 'admin' && Number(file.uploaded_by) !== payload.userId) continue;
          copyFileRecursive(db, file, actualTargetId, payload.userId);
        }
      });
      transaction();
    }

    return NextResponse.json({
      code: 200,
      message: actualAction === 'move' ? '移动成功' : '复制成功',
      data: null,
    });
  } catch (error) {
    console.error('文件移动/复制失败:', error);
    return NextResponse.json({ code: 500, message: '操作失败', data: null }, { status: 500 });
  }
}

function isDescendant(db: ReturnType<typeof getDb>, checkId: number, ancestorId: number): boolean {
  const children = db.prepare('SELECT id, is_folder FROM files WHERE parent_id = ? AND deleted_at IS NULL').all(ancestorId) as Record<string, unknown>[];
  for (const child of children) {
    if (child.id === checkId) return true;
    if (child.is_folder && isDescendant(db, checkId, child.id as number)) return true;
  }
  return false;
}

function copyFileRecursive(
  db: ReturnType<typeof getDb>,
  file: Record<string, unknown>,
  targetParentId: number | null,
  userId: number
) {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  if (file.is_folder) {
    // 复制文件夹
    const result = db.prepare(`
      INSERT INTO files (name, is_folder, size, mime_type, file_ext, file_category, parent_id, path, uploaded_by, owner_type, created_at, updated_at)
      VALUES (?, 1, 0, NULL, NULL, 'folder', ?, '/', ?, 'personal', ?, ?)
    `).run(`${file.name} (副本)`, targetParentId, userId, now, now);

    const newFolderId = result.lastInsertRowid as number;
    const children = db.prepare('SELECT * FROM files WHERE parent_id = ? AND deleted_at IS NULL').all(file.id) as Record<string, unknown>[];
    for (const child of children) {
      copyFileRecursive(db, child, newFolderId, userId);
    }
  } else {
    // 复制文件 - 在数据库中创建新记录，指向同一磁盘文件
    db.prepare(`
      INSERT INTO files (name, is_folder, size, mime_type, file_ext, file_category, parent_id, storage_path, path, uploaded_by, owner_type, created_at, updated_at)
      VALUES (?, 0, ?, ?, ?, ?, ?, ?, '/', ?, 'personal', ?, ?)
    `).run(
      file.name, file.size, file.mime_type, file.file_ext, file.file_category,
      targetParentId, file.storage_path, userId, now, now
    );
  }
}
