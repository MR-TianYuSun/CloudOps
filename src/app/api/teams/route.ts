import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET /api/teams — 获取我加入的团队列表
export async function GET(req: NextRequest) {
  try {
    const payload = verifyToken(req.headers.get('authorization'));
    if (!payload) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }

    const db = getDb();
    const teams = db.prepare(`
      SELECT t.*, tm.role as my_role,
             (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
      FROM teams t
      INNER JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = ? AND t.status = 'active'
      ORDER BY t.created_at DESC
    `).all(payload.userId);

    return NextResponse.json({ code: 200, message: 'success', data: teams });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ code: 500, message: msg, data: null }, { status: 500 });
  }
}

// POST /api/teams — 创建团队
export async function POST(req: NextRequest) {
  try {
    const payload = verifyToken(req.headers.get('authorization'));
    if (!payload) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name?.trim()) {
      return NextResponse.json({ code: 400, message: '团队名称不能为空', data: null }, { status: 400 });
    }

    const db = getDb();

    // 创建团队
    const result = db.prepare(`
      INSERT INTO teams (name, description, owner_id, status)
      VALUES (?, ?, ?, 'active')
    `).run(name.trim(), description?.trim() || '', payload.userId);

    const teamId = result.lastInsertRowid;

    // 创建者自动成为 owner
    db.prepare(`
      INSERT INTO team_members (team_id, user_id, role)
      VALUES (?, ?, 'owner')
    `).run(teamId, payload.userId);

    // 为团队创建根文件夹
    db.prepare(`
      INSERT INTO files (name, path, is_folder, size, mime_type, uploaded_by, owner_type, team_id, parent_id)
      VALUES (?, '', 1, 0, NULL, ?, 'team', ?, NULL)
    `).run(`${name.trim()} 团队空间`, payload.userId, teamId);

    return NextResponse.json({
      code: 200,
      message: '创建成功',
      data: { id: teamId, name: name.trim() },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ code: 500, message: msg, data: null }, { status: 500 });
  }
}
