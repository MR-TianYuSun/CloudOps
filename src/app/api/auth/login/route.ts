import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ code: 400, message: '用户名和密码不能为空', data: null }, { status: 400 });
    }

    const db = getDb();

    // 查找用户
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as {
      id: number;
      username: string;
      password_hash: string;
      display_name: string;
      role: string;
      status: string;
    } | undefined;

    if (!user) {
      return NextResponse.json({ code: 401, message: '用户名或密码错误', data: null }, { status: 401 });
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ code: 401, message: '用户名或密码错误', data: null }, { status: 401 });
    }

    // 检查用户状态
    if (user.status === 'pending') {
      return NextResponse.json({ code: 403, message: '账号待审核，请等待管理员通过', data: null }, { status: 403 });
    }
    if (user.status === 'disabled' || user.status === 'rejected') {
      return NextResponse.json({ code: 403, message: '账号已被禁用', data: null }, { status: 403 });
    }

    // 更新最后登录时间
    db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);

    // 生成 JWT
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
    console.error('登录失败:', error);
    return NextResponse.json({ code: 500, message: '服务器内部错误', data: null }, { status: 500 });
  }
}
