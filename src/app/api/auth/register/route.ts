import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

function getSettingsValue(db: ReturnType<typeof getDb>, key: string, defaultValue: string): string {
  const row = db.prepare('SELECT value FROM system_settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? defaultValue;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, display_name, email } = body;

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

    // 检查是否允许注册
    const allowRegistration = getSettingsValue(db, 'allow_registration', 'true');
    if (allowRegistration !== 'true') {
      return NextResponse.json({ code: 403, message: '管理员已关闭注册功能', data: null }, { status: 403 });
    }

    // 检查用户名是否已存在
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return NextResponse.json({ code: 409, message: '用户名已存在', data: null }, { status: 409 });
    }

    // 检查邮箱是否已存在
    if (email) {
      const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingEmail) {
        return NextResponse.json({ code: 409, message: '邮箱已被注册', data: null }, { status: 409 });
      }
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10);

    // 读取系统设置：是否需要审核、默认配额
    const requireApproval = getSettingsValue(db, 'require_approval', 'true');
    const defaultQuota = parseInt(getSettingsValue(db, 'default_quota', '53687091200'), 10); // 50GB

    // 根据审核设置决定初始状态
    const initialStatus = requireApproval === 'true' ? 'pending' : 'active';

    // 创建用户
    const result = db.prepare(
      'INSERT INTO users (username, password_hash, display_name, email, role, storage_quota, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(username, hashedPassword, display_name || username, email || null, 'user', defaultQuota, initialStatus);

    const message = initialStatus === 'pending'
      ? '注册成功，请等待管理员审核通过后登录'
      : '注册成功';

    return NextResponse.json({
      code: 200,
      message,
      data: {
        id: result.lastInsertRowid,
        username,
        display_name: display_name || username,
        role: 'user',
        status: initialStatus,
      },
    });
  } catch (error) {
    console.error('注册失败:', error);
    return NextResponse.json({ code: 500, message: '服务器内部错误', data: null }, { status: 500 });
  }
}
