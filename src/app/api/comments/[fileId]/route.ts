import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  try {
    const auth = request.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const user = verifyToken(auth.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const body = await request.json();
    const content = body.content || body.text;
    const annotation = body.annotation || null;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: '评论内容不能为空' }, { status: 400 });
    }

    const db = getDb();
    const file = db.prepare('SELECT id FROM files WHERE id = ? AND deleted_at IS NULL').get(Number(fileId));
    if (!file) return NextResponse.json({ error: '文件不存在' }, { status: 404 });

    const result = db.prepare(`
      INSERT INTO file_comments (file_id, user_id, content, annotation)
      VALUES (?, ?, ?, ?)
    `).run(Number(fileId), user.userId, content.trim(), annotation);

    const comment = db.prepare(`
      SELECT c.*, u.display_name, u.username
      FROM file_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    return NextResponse.json({ success: true, data: comment });
  } catch (error) {
    console.error('创建评论失败:', error);
    return NextResponse.json({ error: '创建评论失败' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  try {
    const auth = request.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const user = verifyToken(auth.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const db = getDb();
    const comments = db.prepare(`
      SELECT c.*, u.display_name, u.username
      FROM file_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.file_id = ?
      ORDER BY c.created_at DESC
    `).all(Number(fileId));

    return NextResponse.json({ success: true, data: comments });
  } catch (error) {
    console.error('获取评论失败:', error);
    return NextResponse.json({ error: '获取评论失败' }, { status: 500 });
  }
}
