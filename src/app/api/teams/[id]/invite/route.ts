import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// POST /api/teams/[id]/invite — 邀请用户加入团队 (通过用户名)
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
    const body = await req.json();
    const { username } = body;

    if (!username?.trim()) {
      return NextResponse.json({ code: 400, message: '请输入用户名', data: null }, { status: 400 });
    }

    const db = getDb();

    // 检查操作者是否是团队成员
    const operatorMembership = db.prepare(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(id, payload.userId) as Record<string, unknown> | undefined;

    if (!operatorMembership) {
      return NextResponse.json({ code: 403, message: '你不是该团队成员', data: null }, { status: 403 });
    }

    // 查找目标用户
    const targetUser = db.prepare('SELECT id, username, display_name FROM users WHERE username = ?').get(username.trim()) as Record<string, unknown> | undefined;
    if (!targetUser) {
      return NextResponse.json({ code: 404, message: '用户不存在', data: null }, { status: 404 });
    }

    // 检查是否已经是成员
    const existing = db.prepare(
      'SELECT id FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(id, targetUser.id);

    if (existing) {
      return NextResponse.json({ code: 400, message: '该用户已经是团队成员', data: null }, { status: 400 });
    }

    // 直接加入 (简化版，不做邀请流程)
    db.prepare(`
      INSERT INTO team_members (team_id, user_id, role)
      VALUES (?, ?, 'member')
    `).run(id, targetUser.id);

    return NextResponse.json({
      code: 200,
      message: '邀请成功，用户已加入团队',
      data: { username: targetUser.username, display_name: targetUser.display_name },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ code: 500, message: msg, data: null }, { status: 500 });
  }
}
