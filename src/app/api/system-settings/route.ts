import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUploadDir } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import path from 'path';

/** GET /api/system-settings - 获取系统设置 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || new URL(request.url).searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: '令牌无效' }, { status: 401 });
    }

    // 仅管理员可访问系统设置
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: '仅管理员可访问系统设置' }, { status: 403 });
    }

    const db = getDb();
    const settings = db.prepare('SELECT key, value, updated_at FROM system_settings').all() as { key: string; value: string; updated_at: string }[];

    // 转换为对象格式
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }

    // 确保返回当前的实际上传目录
    if (!result['upload_dir']) {
      result['upload_dir'] = getUploadDir();
    }

    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json({ error: '获取系统设置失败' }, { status: 500 });
  }
}

/** PUT /api/system-settings - 更新系统设置 */
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || new URL(request.url).searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: '令牌无效' }, { status: 401 });
    }

    // 仅管理员可修改系统设置
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: '仅管理员可修改系统设置' }, { status: 403 });
    }

    const body = await request.json() as Record<string, string>;
    const db = getDb();

    // 验证 upload_dir 路径
    if (body.upload_dir !== undefined) {
      const newDir = body.upload_dir.trim();
      if (newDir) {
        // 验证路径格式
        if (!path.isAbsolute(newDir)) {
          return NextResponse.json({ error: '上传目录必须是绝对路径', data: null }, { status: 400 });
        }
        // 尝试创建目录（如果不存在）
        try {
          if (!existsSync(newDir)) {
            mkdirSync(newDir, { recursive: true });
          }
          // 测试写入权限
          const testFile = path.join(newDir, '.write_test');
          writeFileSync(testFile, 'test');
          unlinkSync(testFile);
        } catch {
          return NextResponse.json({ error: '目录不可写，请检查权限', data: null }, { status: 400 });
        }
      }
    }

    // 更新所有传入的设置
    const upsert = db.prepare(`
      INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `);

    for (const [key, value] of Object.entries(body)) {
      // 只允许更新白名单中的设置项
      if (['upload_dir', 'db_path', 'max_upload_size', 'allow_registration', 'require_approval', 'default_quota', 'system_name'].includes(key)) {
        upsert.run(key, value);
      }
    }

    // 返回更新后的设置
    const settings = db.prepare('SELECT key, value FROM system_settings').all() as { key: string; value: string }[];
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }

    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json({ error: '更新系统设置失败' }, { status: 500 });
  }
}
