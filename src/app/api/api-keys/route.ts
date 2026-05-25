import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { randomBytes, createHash } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const user = verifyToken(auth.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const body = await request.json();
    const name = body.name;
    const permissions = body.permissions || 'read';

    if (!name) return NextResponse.json({ error: '缺少API Key名称' }, { status: 400 });

    // Generate API key: cloud_ + 32 random hex chars
    const rawKey = `cloud_${randomBytes(16).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 12);

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO api_keys (user_id, name, key_hash, key_prefix, permissions)
      VALUES (?, ?, ?, ?, ?)
    `).run(user.userId, name, keyHash, keyPrefix, permissions);

    return NextResponse.json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        name,
        key: rawKey, // Only returned once
        keyPrefix,
        permissions,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('创建API Key失败:', error);
    return NextResponse.json({ error: '创建API Key失败' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const user = verifyToken(auth.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const db = getDb();
    const keys = db.prepare(`
      SELECT id, name, key_prefix, permissions, last_used_at, created_at
      FROM api_keys
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(user.userId);

    return NextResponse.json({ success: true, data: keys });
  } catch (error) {
    console.error('获取API Keys失败:', error);
    return NextResponse.json({ error: '获取API Keys失败' }, { status: 500 });
  }
}
