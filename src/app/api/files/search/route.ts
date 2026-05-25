import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { formatFileSize } from '@/lib/file-types';

/** GET /api/files/search?q=xxx - 文件搜索 */
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
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';

    if (!query && !category) {
      return NextResponse.json({ code: 400, message: '请输入搜索关键词或选择分类', data: null }, { status: 400 });
    }

    const db = getDb();
    let files: Record<string, unknown>[];

    if (query && category) {
      files = db.prepare(`
        SELECT f.*, u.display_name as uploader_name
        FROM files f LEFT JOIN users u ON f.uploaded_by = u.id
        WHERE f.name LIKE ? AND f.file_category = ? AND f.deleted_at IS NULL
        ORDER BY f.is_folder DESC, f.name ASC
      `).all(`%${query}%`, category) as Record<string, unknown>[];
    } else if (query) {
      files = db.prepare(`
        SELECT f.*, u.display_name as uploader_name
        FROM files f LEFT JOIN users u ON f.uploaded_by = u.id
        WHERE f.name LIKE ? AND f.deleted_at IS NULL
        ORDER BY f.is_folder DESC, f.name ASC
      `).all(`%${query}%`) as Record<string, unknown>[];
    } else {
      files = db.prepare(`
        SELECT f.*, u.display_name as uploader_name
        FROM files f LEFT JOIN users u ON f.uploaded_by = u.id
        WHERE f.file_category = ? AND f.deleted_at IS NULL
        ORDER BY f.is_folder DESC, f.name ASC
      `).all(category) as Record<string, unknown>[];
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: files.map((f: Record<string, unknown>) => ({
        id: f.id,
        name: f.name,
        isFolder: !!f.is_folder,
        size: f.size,
        sizeText: formatFileSize(f.size as number),
        mimeType: f.mime_type,
        fileExt: f.file_ext,
        fileCategory: f.file_category,
        parentId: f.parent_id,
        uploaderName: f.uploader_name,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      })),
    });
  } catch {
    return NextResponse.json({ code: 500, message: '搜索失败', data: null }, { status: 500 });
  }
}
