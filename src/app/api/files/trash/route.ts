import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { formatFileSize } from '@/lib/file-types';

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
    const fs = require('fs');

    // 获取所有回收站文件
    let files: Record<string, unknown>[];
    if (payload.role === 'admin') {
      files = db.prepare('SELECT * FROM files WHERE deleted_at IS NOT NULL').all() as Record<string, unknown>[];
    } else {
      files = db.prepare('SELECT * FROM files WHERE deleted_at IS NOT NULL AND uploaded_by = ?').all(payload.userId) as Record<string, unknown>[];
    }

    // 删除磁盘文件
    for (const file of files) {
      if (!file.is_folder && file.storage_path) {
        const sp = file.storage_path as string;
        if (fs.existsSync(sp)) {
          fs.unlinkSync(sp);
        }
      }
    }

    // 删除数据库记录
    if (payload.role === 'admin') {
      db.prepare('DELETE FROM files WHERE deleted_at IS NOT NULL').run();
    } else {
      db.prepare('DELETE FROM files WHERE deleted_at IS NOT NULL AND uploaded_by = ?').run(payload.userId);
    }

    return NextResponse.json({ code: 200, message: '回收站已清空', data: null });
  } catch {
    return NextResponse.json({ code: 500, message: '清空失败', data: null }, { status: 500 });
  }
}
