import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function PUT(
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
    const body = await request.json();
    const { status } = body as { status: string };

    if (!['active', 'disabled'].includes(status)) {
      return NextResponse.json({ code: 400, message: '无效状态', data: null });
    }

    const db = getDb();
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, Number(id));

    return NextResponse.json({ code: 200, message: '更新成功', data: null });
  } catch {
    return NextResponse.json({ code: 500, message: '服务器内部错误', data: null });
  }
}
