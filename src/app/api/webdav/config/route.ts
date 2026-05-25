import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const user = verifyToken(auth.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    if (user.role !== 'admin') {
      return NextResponse.json({ error: '仅管理员可配置 WebDAV' }, { status: 403 });
    }

    const db = getDb();
    // Check if webdav_config table exists
    let config: Record<string, unknown> | undefined;
    try {
      config = db.prepare('SELECT * FROM webdav_config LIMIT 1').get() as Record<string, unknown> | undefined;
    } catch {
      config = undefined;
    }

    return NextResponse.json({
      success: true,
      data: config || {
        enabled: false,
        port: 1900,
        username: '',
        password: '',
        basePath: '/dav',
      },
    });
  } catch (error) {
    console.error('获取WebDAV配置失败:', error);
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const user = verifyToken(auth.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    if (user.role !== 'admin') {
      return NextResponse.json({ error: '仅管理员可配置 WebDAV' }, { status: 403 });
    }

    const body = await request.json();
    const db = getDb();

    // Create webdav_config table if not exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS webdav_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        enabled INTEGER NOT NULL DEFAULT 0,
        port INTEGER NOT NULL DEFAULT 1900,
        username TEXT NOT NULL DEFAULT '',
        password TEXT NOT NULL DEFAULT '',
        base_path TEXT NOT NULL DEFAULT '/dav',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    const enabled = body.enabled ? 1 : 0;
    const port = body.port || 1900;
    const username = body.username || '';
    const password = body.password || '';

    const existing = db.prepare('SELECT id FROM webdav_config LIMIT 1').get();
    if (existing) {
      db.prepare(`
        UPDATE webdav_config SET enabled = ?, port = ?, username = ?, password = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(enabled, port, username, password, (existing as Record<string, unknown>).id);
    } else {
      db.prepare(`
        INSERT INTO webdav_config (enabled, port, username, password)
        VALUES (?, ?, ?, ?)
      `).run(enabled, port, username, password);
    }

    return NextResponse.json({
      success: true,
      message: enabled ? 'WebDAV 服务已启用，请重启服务生效' : 'WebDAV 服务已关闭',
    });
  } catch (error) {
    console.error('保存WebDAV配置失败:', error);
    return NextResponse.json({ error: '保存配置失败' }, { status: 500 });
  }
}
