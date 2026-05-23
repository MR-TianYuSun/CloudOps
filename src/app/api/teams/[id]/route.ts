import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET /api/teams/[id] — 获取团队详情
export async function GET(
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

    const team = db.prepare(`
      SELECT t.*,
             (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
      FROM teams t
      WHERE t.id = ? AND t.status = 'active'
    `).get(id) as Record<string, unknown> | undefined;

    if (!team) {
      return NextResponse.json({ code: 404, message: '团队不存在', data: null }, { status: 404 });
    }

    // 检查用户是否是团队成员
    const membership = db.prepare(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(id, payload.userId) as Record<string, unknown> | undefined;

    if (!membership) {
      return NextResponse.json({ code: 403, message: '你不是该团队成员', data: null }, { status: 403 });
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: { ...team, my_role: membership.role },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ code: 500, message: msg, data: null }, { status: 500 });
  }
}

// DELETE /api/teams/[id] — 解散团队
export async function DELETE(
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

    // 检查是否是 owner
    const membership = db.prepare(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(id, payload.userId) as Record<string, unknown> | undefined;

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ code: 403, message: '只有团队创建者才能解散团队', data: null }, { status: 403 });
    }

    // 软删除
    db.prepare("UPDATE teams SET status = 'deleted' WHERE id = ?").run(id);

    return NextResponse.json({ code: 200, message: '团队已解散', data: null });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ code: 500, message: msg, data: null }, { status: 500 });
  }
}
