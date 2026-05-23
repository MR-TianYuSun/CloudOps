import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

/** POST /api/files/[id]/restore - 恢复文件 */
export async function POST(
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
    const db = getDb();
    const file = db.prepare('SELECT * FROM files WHERE id = ?').get(id) as Record<string, unknown> | undefined;

    if (!file || !file.deleted_at) {
      return NextResponse.json({ code: 404, message: '文件不在回收站中', data: null }, { status: 404 });
    }

    if (payload.role !== 'admin' && Number(file.uploaded_by) !== payload.userId) {
      return NextResponse.json({ code: 403, message: '无权操作', data: null }, { status: 403 });
    }

    // 恢复文件：恢复到原始 parent_id，清除 deleted_at
    db.prepare(
      'UPDATE files SET deleted_at = NULL, parent_id = original_parent_id WHERE id = ?'
    ).run(parseInt(id));

    // 递归恢复子文件
    restoreChildren(db, parseInt(id));

    return NextResponse.json({ code: 200, message: '已恢复', data: null });
  } catch {
    return NextResponse.json({ code: 500, message: '恢复失败', data: null }, { status: 500 });
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
