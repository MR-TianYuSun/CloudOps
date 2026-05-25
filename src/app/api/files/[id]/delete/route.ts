import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

/** DELETE /api/files/[id]?permanent=1 - 删除文件/文件夹 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const url = new URL(request.url);
    const permanent = url.searchParams.get('permanent') === '1' || url.searchParams.get('permanent') === 'true';
    const db = getDb();
    const file = db.prepare('SELECT * FROM files WHERE id = ?').get(id) as Record<string, unknown> | undefined;

    if (!file) {
      return NextResponse.json({ code: 404, message: '文件不存在', data: null }, { status: 404 });
    }

    // 管理员可删除所有文件；非管理员只能删除自己的文件
    if (payload.role !== 'admin' && Number(file.uploaded_by) !== payload.userId) {
      return NextResponse.json({ code: 403, message: '无权删除该文件', data: null }, { status: 403 });
    }

    if (permanent) {
      // 永久删除
      return permanentDelete(db, parseInt(id), file);
    } else {
      // 软删除 - 移入回收站
      return softDelete(db, parseInt(id), file);
    }
  } catch {
    return NextResponse.json({ code: 500, message: '删除失败', data: null }, { status: 500 });
  }
}

function softDelete(
  db: ReturnType<typeof getDb>,
  fileId: number,
  file: Record<string, unknown>
) {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // 记录原始 parent_id 以便恢复
  db.prepare(
    'UPDATE files SET deleted_at = ?, original_parent_id = ? WHERE id = ?'
  ).run(now, file.parent_id as number | null, fileId);

  // 递归软删除子文件
  if (file.is_folder) {
    softDeleteChildren(db, fileId, now);
  }

  return NextResponse.json({ code: 200, message: '已移入回收站', data: null });
}

function softDeleteChildren(db: ReturnType<typeof getDb>, parentId: number, now: string) {
  const children = db.prepare('SELECT * FROM files WHERE parent_id = ? AND deleted_at IS NULL').all(parentId) as Record<string, unknown>[];
  for (const child of children) {
    db.prepare(
      'UPDATE files SET deleted_at = ?, original_parent_id = ? WHERE id = ?'
    ).run(now, child.parent_id as number | null, child.id as number);
    if (child.is_folder) {
      softDeleteChildren(db, child.id as number, now);
    }
  }
}

function permanentDelete(
  db: ReturnType<typeof getDb>,
  fileId: number,
  file: Record<string, unknown>
) {
  const fs = require('fs');

  // 收集要删除的文件总大小和所有者，用于更新 storage_used
  let totalSize = 0;
  let ownerId: number | null = Number(file.uploaded_by) || null;

  // 如果是文件，删除磁盘文件
  if (!file.is_folder && file.storage_path) {
    const storagePath = file.storage_path as string;
    if (fs.existsSync(storagePath)) {
      fs.unlinkSync(storagePath);
    }
    totalSize += Number(file.size) || 0;
  }

  // 如果是文件夹，递归永久删除子文件
  if (file.is_folder) {
    totalSize += permanentDeleteRecursive(db, fileId);
  }

  // 删除关联的分享链接
  db.prepare('DELETE FROM shares WHERE file_id = ?').run(fileId);

  // 删除数据库记录
  db.prepare('DELETE FROM files WHERE id = ?').run(fileId);

  // 更新用户存储使用量
  if (ownerId && totalSize > 0) {
    db.prepare('UPDATE users SET storage_used = MAX(0, storage_used - ?) WHERE id = ?').run(totalSize, ownerId);
  }

  return NextResponse.json({ code: 200, message: '已永久删除', data: null });
}

function permanentDeleteRecursive(db: ReturnType<typeof getDb>, folderId: number): number {
  const fs = require('fs');
  let totalSize = 0;
  const children = db.prepare('SELECT * FROM files WHERE parent_id = ?').all(folderId) as Record<string, unknown>[];
  for (const child of children) {
    if (child.is_folder) {
      totalSize += permanentDeleteRecursive(db, child.id as number);
    } else if (child.storage_path) {
      const sp = child.storage_path as string;
      if (fs.existsSync(sp)) {
        fs.unlinkSync(sp);
      }
      totalSize += Number(child.size) || 0;
    }
    db.prepare('DELETE FROM shares WHERE file_id = ?').run(child.id as number);
    db.prepare('DELETE FROM files WHERE id = ?').run(child.id);
  }
  return totalSize;
}
