import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const user = verifyToken(auth.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const body = await request.json();
    const title = body.title || '未命名文档';
    const content = body.content || '';
    const fileId = body.fileId || null;

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO documents (file_id, title, content, created_by, last_edited_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(fileId, title, content, user.userId, user.userId);

    const doc = db.prepare(`
      SELECT d.*, u.display_name as creator_name
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.id = ?
    `).get(result.lastInsertRowid);

    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    console.error('创建文档失败:', error);
    return NextResponse.json({ error: '创建文档失败' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const user = verifyToken(auth.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const db = getDb();
    const docs = db.prepare(`
      SELECT d.*, u.display_name as creator_name, u2.display_name as last_editor_name
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN users u2 ON d.last_edited_by = u2.id
      WHERE (d.created_by = ? OR d.file_id IN (
        SELECT f.id FROM files f WHERE f.uploaded_by = ? AND f.deleted_at IS NULL
      ))
      ORDER BY d.updated_at DESC
    `).all(user.userId, user.userId);

    return NextResponse.json({ success: true, data: docs });
  } catch (error) {
    console.error('获取文档列表失败:', error);
    return NextResponse.json({ error: '获取文档列表失败' }, { status: 500 });
  }
}
