import { NextRequest, NextResponse } from 'next/server';
import { getDb, buildFilePath } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

/** POST /api/files/mkdir - 创建文件夹 */
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
    const { name, parent_id, parentId } = body;
    const parentIdValue = parent_id || parentId;
    // parent_id 为 0 时视为根目录
    const effectiveParentId = parentIdValue && Number(parentIdValue) > 0 ? Number(parentIdValue) : null;

    if (!name || !name.trim()) {
      return NextResponse.json({ code: 400, message: '文件夹名称不能为空', data: null }, { status: 400 });
    }

    const db = getDb();
    const folderName = name.trim();

    // 检查同名
    const existing = db.prepare(`
      SELECT id FROM files WHERE name = ? AND parent_id ${effectiveParentId ? '= ?' : 'IS NULL'} AND is_folder = 1 AND deleted_at IS NULL
    `).get(folderName, ...(effectiveParentId ? [effectiveParentId] : []));

    if (existing) {
      return NextResponse.json({ code: 409, message: '同名文件夹已存在', data: null }, { status: 409 });
    }

    const filePath = buildFilePath(db, folderName, effectiveParentId);

    const result = db.prepare(`
      INSERT INTO files (name, path, parent_id, is_folder, size, uploaded_by, owner_type)
      VALUES (?, ?, ?, 1, 0, ?, 'personal')
    `).run(folderName, filePath, effectiveParentId, payload.userId);

    return NextResponse.json({
      code: 200,
      message: '创建成功',
      data: { id: result.lastInsertRowid, name: folderName },
    });
  } catch {
    return NextResponse.json({ code: 500, message: '创建失败', data: null }, { status: 500 });
  }
}
