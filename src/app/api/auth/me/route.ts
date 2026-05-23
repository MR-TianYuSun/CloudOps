import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import getDb from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'));
    if (!token) {
      return NextResponse.json(
        { code: 401, message: '未登录', data: null },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { code: 401, message: 'Token 已过期或无效', data: null },
        { status: 401 }
      );
    }

    const db = getDb();
    const user = db
      .prepare('SELECT id, username, display_name, role, status, storage_quota, storage_used, last_login_at FROM users WHERE id = ?')
      .get(payload.userId) as Record<string, unknown> | undefined;

    if (!user || (user.status as string) !== 'active') {
      return NextResponse.json(
        { code: 401, message: '用户不存在或已禁用', data: null },
        { status: 401 }
      );
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        storageQuota: user.storage_quota,
        storageUsed: user.storage_used,
        lastLoginAt: user.last_login_at,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { code: 500, message: '服务器内部错误', data: null },
      { status: 500 }
    );
  }
}
