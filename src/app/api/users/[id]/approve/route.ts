import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// POST /api/users/[id]/approve - 审核通过用户
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload || (payload as unknown as Record<string, unknown>).role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: '无效的用户ID' }, { status: 400 });
    }

    const db = getDb();

    // 检查用户是否存在且处于待审核状态
    const user = db.prepare('SELECT id, username, status FROM users WHERE id = ?').get(userId) as {
      id: number; username: string; status: string;
    } | undefined;

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    if (user.status !== 'pending') {
      return NextResponse.json({ error: '该用户不在待审核状态' }, { status: 400 });
    }

    // 更新用户状态为活跃
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run('active', userId);

    return NextResponse.json({
      success: true,
      message: `用户 ${user.username} 已审核通过`,
      data: { id: user.id, username: user.username, status: 'active' }
    });
  } catch (error) {
    console.error('审核用户失败:', error);
    return NextResponse.json({ error: '审核失败' }, { status: 500 });
  }
}
