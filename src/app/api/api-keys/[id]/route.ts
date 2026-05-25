import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = request.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const user = verifyToken(auth.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const db = getDb();
    const key = db.prepare('SELECT * FROM api_keys WHERE id = ? AND user_id = ?').get(Number(id), user.userId);
    if (!key) return NextResponse.json({ error: 'API Key不存在' }, { status: 404 });

    db.prepare('DELETE FROM api_keys WHERE id = ?').run(Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除API Key失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
