import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { code: 400, message: '用户名和密码不能为空', data: null },
        { status: 400 }
      );
    }

    const db = getDb();
    const user = db
      .prepare('SELECT id, username, password_hash, display_name, role, status FROM users WHERE username = ?')
      .get(username) as {
        id: number;
        username: string;
        password_hash: string;
        display_name: string;
        role: string;
        status: string;
      } | undefined;

    if (!user) {
      return NextResponse.json(
        { code: 401, message: '用户名或密码错误', data: null },
        { status: 401 }
      );
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { code: 403, message: '账号已被禁用，请联系管理员', data: null },
        { status: 403 }
      );
    }

    const passwordMatch = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatch) {
      return NextResponse.json(
        { code: 401, message: '用户名或密码错误', data: null },
        { status: 401 }
      );
    }

    // 更新最后登录时间
    db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);

    // 记录操作日志
    db.prepare(
      "INSERT INTO operation_logs (user_id, action, target_type, detail, ip_address) VALUES (?, ?, ?, ?, ?)"
    ).run(user.id, 'login', 'user', `用户 ${user.username} 登录系统`, request.headers.get('x-forwarded-for') || 'unknown');

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    return NextResponse.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { code: 500, message: '服务器内部错误', data: null },
      { status: 500 }
    );
  }
}
