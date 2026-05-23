import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, display_name } = body;

    if (!username || !password) {
      return NextResponse.json({ code: 400, message: '用户名和密码不能为空', data: null }, { status: 400 });
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({ code: 400, message: '用户名长度需在3-20之间', data: null }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ code: 400, message: '密码长度不能少于6位', data: null }, { status: 400 });
    }

    const db = getDb();

    // 检查用户名是否已存在
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return NextResponse.json({ code: 409, message: '用户名已存在', data: null }, { status: 409 });
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户，默认角色为 user
    const result = db.prepare(
      'INSERT INTO users (username, password_hash, display_name, role, storage_quota, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(username, hashedPassword, display_name || username, 'user', 53687091200, 'active'); // 50GB配额

    return NextResponse.json({
      code: 200,
      message: '注册成功',
      data: {
        id: result.lastInsertRowid,
        username,
        display_name: display_name || username,
        role: 'user',
      },
    });
  } catch (error) {
    console.error('注册失败:', error);
    return NextResponse.json({ code: 500, message: '服务器内部错误', data: null }, { status: 500 });
  }
}
