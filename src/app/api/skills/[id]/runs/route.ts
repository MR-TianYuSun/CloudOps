import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET: Get execution history for a skill
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const skillId = parseInt(id);
    if (isNaN(skillId)) {
      return NextResponse.json({ code: 400, message: '无效的Skill ID' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }

    const decoded = verifyToken(token) as { userId: number } | null;
    if (!decoded) {
      return NextResponse.json({ code: 401, message: '令牌无效' }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20'), 100);

    const db = getDb();

    // Verify skill access
    const skill = db.prepare('SELECT id, created_by, is_public FROM skills WHERE id = ?').get(skillId) as Record<string, unknown> | undefined;
    if (!skill) {
      return NextResponse.json({ code: 404, message: 'Skill不存在' }, { status: 404 });
    }

    // Only owner can see all runs; others see their own
    const isOwner = skill.created_by === decoded.userId;
    const offset = (page - 1) * pageSize;

    let runs: Record<string, unknown>[];
    let total: number;

    if (isOwner) {
      runs = db.prepare(
        `SELECT r.id, r.skill_id, r.user_id, r.input, r.output, r.status, r.created_at, r.completed_at,
          u.username as runner_name
        FROM skill_runs r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.skill_id = ?
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?`
      ).all(skillId, pageSize, offset) as Record<string, unknown>[];

      total = (db.prepare('SELECT COUNT(*) as count FROM skill_runs WHERE skill_id = ?').get(skillId) as Record<string, number>).count;
    } else {
      runs = db.prepare(
        `SELECT id, skill_id, user_id, output, status, created_at, completed_at
        FROM skill_runs
        WHERE skill_id = ? AND user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`
      ).all(skillId, decoded.userId, pageSize, offset) as Record<string, unknown>[];

      total = (db.prepare('SELECT COUNT(*) as count FROM skill_runs WHERE skill_id = ? AND user_id = ?').get(skillId, decoded.userId) as Record<string, number>).count;
    }

    // Truncate output for list display
    runs = runs.map(run => ({
      ...run,
      output: typeof run.output === 'string' && run.output.length > 500
        ? run.output.substring(0, 500) + '...'
        : run.output,
    }));

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: { runs, total, page, pageSize }
    });
  } catch (err) {
    console.error('Get skill runs error:', err);
    return NextResponse.json({ code: 500, message: '获取执行历史失败' }, { status: 500 });
  }
}
