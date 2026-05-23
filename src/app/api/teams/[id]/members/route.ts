import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET /api/teams/[id]/members — 获取成员列表
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

    // 检查是否是成员
    const membership = db.prepare(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(id, payload.userId);

    if (!membership && payload.role !== 'admin') {
      return NextResponse.json({ code: 403, message: '无权限', data: null }, { status: 403 });
    }

    const members = db.prepare(`
      SELECT tm.role, tm.joined_at, u.id, u.username, u.display_name
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ?
      ORDER BY CASE tm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END
    `).all(id);

    return NextResponse.json({ code: 200, message: 'success', data: members });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ code: 500, message: msg, data: null }, { status: 500 });
  }
}

// POST /api/teams/[id]/members — 添加成员 (通过用户名)
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

    // 检查操作者权限 (owner 或 admin 可添加)
    const operatorMembership = db.prepare(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(id, payload.userId) as Record<string, unknown> | undefined;

    if (!operatorMembership || (operatorMembership.role !== 'owner' && operatorMembership.role !== 'admin')) {
      return NextResponse.json({ code: 403, message: '只有团队管理员才能添加成员', data: null }, { status: 403 });
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

    db.prepare(`
      INSERT INTO team_members (team_id, user_id, role)
      VALUES (?, ?, 'member')
    `).run(id, targetUser.id);

    return NextResponse.json({
      code: 200,
      message: '添加成功',
      data: { username: targetUser.username, display_name: targetUser.display_name },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ code: 500, message: msg, data: null }, { status: 500 });
  }
}

// DELETE /api/teams/[id]/members — 移除成员
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
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ code: 400, message: '缺少用户ID', data: null }, { status: 400 });
    }

    const db = getDb();

    // 检查操作者权限
    const operatorMembership = db.prepare(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(id, payload.userId) as Record<string, unknown> | undefined;

    if (!operatorMembership || (operatorMembership.role !== 'owner' && operatorMembership.role !== 'admin')) {
      return NextResponse.json({ code: 403, message: '只有团队管理员才能移除成员', data: null }, { status: 403 });
    }

    // 不能移除 owner
    const targetMembership = db.prepare(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(id, Number(userId)) as Record<string, unknown> | undefined;

    if (targetMembership?.role === 'owner') {
      return NextResponse.json({ code: 400, message: '不能移除团队创建者', data: null }, { status: 400 });
    }

    db.prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?').run(id, Number(userId));

    return NextResponse.json({ code: 200, message: '已移除成员', data: null });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ code: 500, message: msg, data: null }, { status: 500 });
  }
}
