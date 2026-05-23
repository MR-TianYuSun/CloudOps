import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// 获取用户列表（管理员）
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }

    const payload = verifyToken(authHeader.slice(7));
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ code: 403, message: '无权限', data: null }, { status: 403 });
    }

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('page_size')) || 20;
    const offset = (page - 1) * pageSize;

    const users = db.prepare(
      'SELECT id, username, display_name, role, storage_quota, storage_used, status, created_at, last_login_at FROM users ORDER BY id DESC LIMIT ? OFFSET ?'
    ).all(pageSize, offset) as Record<string, unknown>[];

    const total = (db.prepare('SELECT COUNT(*) as count FROM users').get() as Record<string, unknown>).count;

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: { users, total, page, page_size: pageSize },
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json({ code: 500, message: '服务器内部错误', data: null }, { status: 500 });
  }
}

// 更新用户状态（启用/禁用）
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }

    const payload = verifyToken(authHeader.slice(7));
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ code: 403, message: '无权限', data: null }, { status: 403 });
    }

    const body = await request.json();
    const { user_id, action } = body; // action: enable / disable / set_role

    if (!user_id || !action) {
      return NextResponse.json({ code: 400, message: '参数不完整', data: null }, { status: 400 });
    }

    const db = getDb();

    if (action === 'enable') {
      db.prepare('UPDATE users SET status = ? WHERE id = ?').run('active', user_id);
    } else if (action === 'disable') {
      db.prepare('UPDATE users SET status = ? WHERE id = ?').run('disabled', user_id);
    } else if (action === 'set_role') {
      const { role } = body;
      if (!['admin', 'user', 'guest'].includes(role)) {
        return NextResponse.json({ code: 400, message: '无效角色', data: null }, { status: 400 });
      }
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, user_id);
    } else {
      return NextResponse.json({ code: 400, message: '无效操作', data: null }, { status: 400 });
    }

    return NextResponse.json({ code: 200, message: '操作成功', data: null });
  } catch (error) {
    console.error('更新用户失败:', error);
    return NextResponse.json({ code: 500, message: '服务器内部错误', data: null }, { status: 500 });
  }
}

// 删除用户
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }

    const payload = verifyToken(authHeader.slice(7));
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ code: 403, message: '无权限', data: null }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ code: 400, message: '缺少用户ID', data: null }, { status: 400 });
    }

    // 不能删除自己
    if (Number(userId) === payload.userId) {
      return NextResponse.json({ code: 400, message: '不能删除自己', data: null }, { status: 400 });
    }

    const db = getDb();
    db.prepare('DELETE FROM users WHERE id = ?').run(Number(userId));

    return NextResponse.json({ code: 200, message: '删除成功', data: null });
  } catch (error) {
    console.error('删除用户失败:', error);
    return NextResponse.json({ code: 500, message: '服务器内部错误', data: null }, { status: 500 });
  }
}
