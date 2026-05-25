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
    const task = db.prepare('SELECT * FROM download_tasks WHERE id = ? AND user_id = ?').get(Number(id), user.userId) as Record<string, unknown> | undefined;
    if (!task) return NextResponse.json({ error: '任务不存在' }, { status: 404 });

    // If task is downloading, cancel it
    if (task.status === 'downloading' || task.status === 'pending') {
      db.prepare("UPDATE download_tasks SET status = 'cancelled', error_message = '用户取消' WHERE id = ?").run(Number(id));
    } else {
      // Remove completed/failed/cancelled task from list
      db.prepare('DELETE FROM download_tasks WHERE id = ?').run(Number(id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除下载任务失败:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
