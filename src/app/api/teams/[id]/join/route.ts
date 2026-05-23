import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// POST /api/teams/[id]/join — 加入团队
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = verifyToken(req.headers.get('authorization'));
    if (!payload) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();

    // 检查团队是否存在
    const team = db.prepare("SELECT id, name FROM teams WHERE id = ? AND status = 'active'").get(id) as Record<string, unknown> | undefined;
    if (!team) {
      return NextResponse.json({ code: 404, message: '团队不存在', data: null }, { status: 404 });
    }

    // 检查是否已经是成员
    const existing = db.prepare(
      'SELECT id FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(id, payload.userId);

    if (existing) {
      return NextResponse.json({ code: 400, message: '你已经是该团队成员', data: null }, { status: 400 });
    }

    // 加入团队
    db.prepare(`
      INSERT INTO team_members (team_id, user_id, role)
      VALUES (?, ?, 'member')
    `).run(id, payload.userId);

    return NextResponse.json({ code: 200, message: '加入团队成功', data: null });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ code: 500, message: msg, data: null }, { status: 500 });
  }
}
