import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ code: 401, message: '未登录', data: null });

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ code: 403, message: '无权限', data: null });
    }

    const { id } = await params;
    const userId = Number(id);

    // 禁止删除自己
    if (userId === payload.userId) {
      return NextResponse.json({ code: 400, message: '不能删除自己', data: null });
    }

    const db = getDb();
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    return NextResponse.json({ code: 200, message: '删除成功', data: null });
  } catch {
    return NextResponse.json({ code: 500, message: '服务器内部错误', data: null });
  }
}
