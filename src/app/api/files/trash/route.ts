import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { formatFileSize } from '@/lib/file-types';
import * as fs from 'fs';

/** GET /api/files/trash - 获取回收站文件列表 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ code: 401, message: '令牌无效', data: null }, { status: 401 });
    }

    const db = getDb();

    // 管理员看所有回收站文件，普通用户只看自己的
    let files: unknown[];
    if (payload.role === 'admin') {
      files = db.prepare(`
        SELECT f.*, u.display_name as uploader_name
        FROM files f
        LEFT JOIN users u ON f.uploaded_by = u.id
        WHERE f.deleted_at IS NOT NULL
        ORDER BY f.deleted_at DESC
      `).all();
    } else {
      files = db.prepare(`
        SELECT f.*, u.display_name as uploader_name
        FROM files f
        LEFT JOIN users u ON f.uploaded_by = u.id
        WHERE f.deleted_at IS NOT NULL AND f.uploaded_by = ?
        ORDER BY f.deleted_at DESC
      `).all(payload.userId);
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: files.map((f: unknown) => {
        const file = f as Record<string, unknown>;
        return {
          id: file.id,
          name: file.name,
          isFolder: !!file.is_folder,
          size: file.size,
          sizeText: formatFileSize(file.size as number),
          mimeType: file.mime_type,
          fileExt: file.file_ext,
          fileCategory: file.file_category,
          parentId: file.parent_id,
          originalParentId: file.original_parent_id,
          uploaderName: file.uploader_name,
          createdAt: file.created_at,
          updatedAt: file.updated_at,
          deletedAt: file.deleted_at,
        };
      }),
    });
  } catch {
    return NextResponse.json({ code: 500, message: '服务器内部错误', data: null }, { status: 500 });
  }
}

/** POST /api/files/trash - 批量操作回收站文件 */
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

    const body = await request.json() as { action: 'restore' | 'permanent_delete'; ids: number[] };
    const { action, ids } = body;

    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ code: 400, message: '参数错误', data: null }, { status: 400 });
    }

    const db = getDb();
    let successCount = 0;
    let failCount = 0;

    for (const id of ids) {
      const file = db.prepare('SELECT * FROM files WHERE id = ? AND deleted_at IS NOT NULL').get(id) as Record<string, unknown> | undefined;
      if (!file) {
        failCount++;
        continue;
      }

      // 权限检查：管理员可操作所有，普通用户只能操作自己的
      if (payload.role !== 'admin' && Number(file.uploaded_by) !== payload.userId) {
        failCount++;
        continue;
      }

      if (action === 'restore') {
        // 恢复文件
        db.prepare(
          'UPDATE files SET deleted_at = NULL, parent_id = original_parent_id WHERE id = ?'
        ).run(id);
        // 递归恢复子文件
        restoreChildren(db, id);
        successCount++;
      } else if (action === 'permanent_delete') {
        // 永久删除磁盘文件
        if (!file.is_folder && file.storage_path) {
          const sp = file.storage_path as string;
          if (fs.existsSync(sp)) {
            fs.unlinkSync(sp);
          }
        }
        // 计算总大小用于更新 storage_used
        let deletedSize = 0;
        if (!file.is_folder) {
          deletedSize += Number(file.size) || 0;
        }
        // 递归删除子文件
        if (file.is_folder) {
          deletedSize += permanentDeleteRecursive(db, id);
        }
        // 删除关联的分享链接
        db.prepare('DELETE FROM shares WHERE file_id = ?').run(id);
        // 删除数据库记录
        db.prepare('DELETE FROM files WHERE id = ?').run(id);
        // 更新用户存储使用量
        const ownerId = Number(file.uploaded_by);
        if (ownerId && deletedSize > 0) {
          db.prepare('UPDATE users SET storage_used = MAX(0, storage_used - ?) WHERE id = ?').run(deletedSize, ownerId);
        }
        successCount++;
      }
    }

    const actionLabel = action === 'restore' ? '恢复' : '永久删除';
    return NextResponse.json({
      code: 200,
      message: `${actionLabel}完成：成功 ${successCount} 个${failCount > 0 ? `，失败 ${failCount} 个` : ''}`,
      data: { successCount, failCount },
    });
  } catch {
    return NextResponse.json({ code: 500, message: '操作失败', data: null }, { status: 500 });
  }
}

function restoreChildren(db: ReturnType<typeof getDb>, parentId: number) {
  const children = db.prepare('SELECT * FROM files WHERE parent_id = ? AND deleted_at IS NOT NULL').all(parentId) as Record<string, unknown>[];
  for (const child of children) {
    db.prepare(
      'UPDATE files SET deleted_at = NULL, parent_id = original_parent_id WHERE id = ?'
    ).run(child.id as number);
    if (child.is_folder) {
      restoreChildren(db, child.id as number);
    }
  }
}

function permanentDeleteRecursive(db: ReturnType<typeof getDb>, folderId: number): number {
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

/** DELETE /api/files/trash - 清空回收站 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ code: 401, message: '令牌无效', data: null }, { status: 401 });
    }

    const db = getDb();

    // 获取所有回收站文件
    let files: Record<string, unknown>[];
    if (payload.role === 'admin') {
      files = db.prepare('SELECT * FROM files WHERE deleted_at IS NOT NULL').all() as Record<string, unknown>[];
    } else {
      files = db.prepare('SELECT * FROM files WHERE deleted_at IS NOT NULL AND uploaded_by = ?').all(payload.userId) as Record<string, unknown>[];
    }

    // 删除磁盘文件并计算总大小
    let totalDeletedSize = 0;
    const ownerSizeMap = new Map<number, number>();
    for (const file of files) {
      if (!file.is_folder && file.storage_path) {
        const sp = file.storage_path as string;
        if (fs.existsSync(sp)) {
          fs.unlinkSync(sp);
        }
        const fileSize = Number(file.size) || 0;
        totalDeletedSize += fileSize;
        const ownerId = Number(file.uploaded_by) || 0;
        if (ownerId > 0) {
          ownerSizeMap.set(ownerId, (ownerSizeMap.get(ownerId) || 0) + fileSize);
        }
      }
    }

    // 删除数据库记录
    if (payload.role === 'admin') {
      db.prepare('DELETE FROM files WHERE deleted_at IS NOT NULL').run();
    } else {
      db.prepare('DELETE FROM files WHERE deleted_at IS NOT NULL AND uploaded_by = ?').run(payload.userId);
    }

    // 更新用户存储使用量
    for (const [ownerId, deletedSize] of ownerSizeMap) {
      db.prepare('UPDATE users SET storage_used = MAX(0, storage_used - ?) WHERE id = ?').run(deletedSize, ownerId);
    }

    return NextResponse.json({ code: 200, message: '回收站已清空', data: null });
  } catch {
    return NextResponse.json({ code: 500, message: '清空失败', data: null }, { status: 500 });
  }
}
