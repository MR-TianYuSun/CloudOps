import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getFileCategory, getFileExt, getMimeType } from '@/lib/file-types';

/** POST /api/files/rename - 重命名文件/文件夹 */
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

    const body = await request.json();
    const { id, name } = body;

    if (!id || !name || !name.trim()) {
      return NextResponse.json({ code: 400, message: '参数错误', data: null }, { status: 400 });
    }

    const db = getDb();
    const file = db.prepare('SELECT * FROM files WHERE id = ?').get(id) as Record<string, unknown> | undefined;

    if (!file) {
      return NextResponse.json({ code: 404, message: '文件不存在', data: null }, { status: 404 });
    }

    const ext = getFileExt(name);
    const category = getFileCategory(name);
    const mimeType = getMimeType(name);

    db.prepare(`
      UPDATE files SET name = ?, file_ext = ?, file_category = ?, mime_type = ?, updated_at = datetime('now') WHERE id = ?
    `).run(name.trim(), ext, category, mimeType, id);

    return NextResponse.json({ code: 200, message: '重命名成功', data: null });
  } catch {
    return NextResponse.json({ code: 500, message: '重命名失败', data: null }, { status: 500 });
  }
}
