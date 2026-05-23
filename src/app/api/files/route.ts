import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getFileCategory, getFileExt, getMimeType, formatFileSize } from '@/lib/file-types';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

/** GET /api/files - 文件列表 */
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

    const { searchParams } = new URL(request.url);
    const parentIdRaw = searchParams.get('parent_id') || searchParams.get('parentId') || null;
    // parent_id 为 0 或 "0" 时视为根目录
    const parentId = parentIdRaw && parentIdRaw !== '0' ? parentIdRaw : null;
    const db = getDb();

    // 排除回收站中的文件
    const notDeleted = 'AND f.deleted_at IS NULL';

    // 管理员可看所有文件，普通用户只看自己上传的
    let files: unknown[];
    if (payload.role === 'admin') {
      files = db.prepare(`
        SELECT f.*, u.display_name as uploader_name
        FROM files f
        LEFT JOIN users u ON f.uploaded_by = u.id
        WHERE f.parent_id ${parentId ? '= ?' : 'IS NULL'} ${notDeleted}
        ORDER BY f.is_folder DESC, f.name ASC
      `).all(...(parentId ? [parentId] : []));
    } else {
      files = db.prepare(`
        SELECT f.*, u.display_name as uploader_name
        FROM files f
        LEFT JOIN users u ON f.uploaded_by = u.id
        WHERE f.uploaded_by = ? AND f.parent_id ${parentId ? '= ?' : 'IS NULL'} ${notDeleted}
        ORDER BY f.is_folder DESC, f.name ASC
      `).all(...(parentId ? [payload.userId, parentId] : [payload.userId]));
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
          uploaderName: file.uploader_name,
          createdAt: file.created_at,
          updatedAt: file.updated_at,
        };
      }),
    });
  } catch {
    return NextResponse.json({ code: 500, message: '服务器内部错误', data: null }, { status: 500 });
  }
}
