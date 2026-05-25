import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const user = verifyToken(auth.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || '50'), 200);

    const db = getDb();
    const files = db.prepare(`
      SELECT f.*, rf.action as last_action, rf.accessed_at,
        u.display_name as owner_name
      FROM recent_files rf
      JOIN files f ON rf.file_id = f.id AND f.deleted_at IS NULL
      LEFT JOIN users u ON f.uploaded_by = u.id
      WHERE rf.user_id = ?
      ORDER BY rf.accessed_at DESC
      LIMIT ?
    `).all(user.userId, limit);

    return NextResponse.json({ success: true, data: files });
  } catch (error) {
    console.error('获取最近文件失败:', error);
    return NextResponse.json({ error: '获取最近文件失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const user = verifyToken(auth.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const body = await request.json();
    const fileId = body.fileId || body.file_id;
    const action = body.action || 'view';

    if (!fileId) return NextResponse.json({ error: '缺少fileId' }, { status: 400 });

    const db = getDb();
    db.prepare(`
      INSERT INTO recent_files (user_id, file_id, action, accessed_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, file_id) DO UPDATE SET
        action = excluded.action,
        accessed_at = datetime('now')
    `).run(user.userId, Number(fileId), action);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('记录最近文件失败:', error);
    return NextResponse.json({ error: '记录最近文件失败' }, { status: 500 });
  }
}
