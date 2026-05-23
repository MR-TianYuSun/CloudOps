import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// POST /api/teams/[id]/leave — 退出团队
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

    // 检查是否是成员
    const membership = db.prepare(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(id, payload.userId) as Record<string, unknown> | undefined;

    if (!membership) {
      return NextResponse.json({ code: 400, message: '你不是该团队成员', data: null }, { status: 400 });
    }

    // owner 不能退出，只能解散
    if (membership.role === 'owner') {
      return NextResponse.json({ code: 400, message: '团队创建者不能退出，请先转让或解散团队', data: null }, { status: 400 });
    }

    db.prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?').run(id, payload.userId);

    return NextResponse.json({ code: 200, message: '已退出团队', data: null });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ code: 500, message: msg, data: null }, { status: 500 });
  }
}
