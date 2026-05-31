import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

/** GET /api/skills/[id] - 获取技能详情 or 导出 */
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

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ code: 401, message: '令牌无效' }, { status: 401 });
    }

    const db = getDb();
    const skill = db.prepare(`
      SELECT s.*, f.name as file_name, u.display_name as creator_name
      FROM skills s
      LEFT JOIN files f ON s.file_id = f.id
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.id = ?
    `).get(skillId) as Record<string, unknown> | undefined;

    if (!skill) {
      return NextResponse.json({ code: 404, message: 'Skill不存在' }, { status: 404 });
    }

    // Check access: owner or public
    if (skill.created_by !== payload.userId && !skill.is_public) {
      return NextResponse.json({ code: 403, message: '无权限访问此Skill' }, { status: 403 });
    }

    // Export mode
    const url = new URL(request.url);
    if (url.searchParams.get('export') === 'true') {
      const exportData = {
        name: skill.name,
        description: skill.description,
        icon: skill.icon,
        category: skill.category,
        config: skill.config,
        exportedAt: new Date().toISOString(),
        version: '1.0',
      };

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${skill.name}.skill.json"`,
        },
      });
    }

    return NextResponse.json({ code: 200, message: 'success', data: skill });
  } catch (err) {
    console.error('Get skill error:', err);
    return NextResponse.json({ code: 500, message: '获取技能详情失败' }, { status: 500 });
  }
}

/** PUT /api/skills/[id] - 更新技能 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const skillId = parseInt(id);
    if (isNaN(skillId)) {
      return NextResponse.json({ code: 400, message: '无效的Skill ID' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ code: 401, message: '令牌无效' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, icon, category, config, isPublic } = body as {
      name?: string;
      description?: string;
      icon?: string;
      category?: string;
      config?: Record<string, unknown>;
      isPublic?: boolean;
    };

    const db = getDb();

    // Check ownership
    const existing = db.prepare('SELECT * FROM skills WHERE id = ?').get(skillId) as Record<string, unknown> | undefined;
    if (!existing) {
      return NextResponse.json({ code: 404, message: 'Skill不存在' }, { status: 404 });
    }
    if (existing.created_by !== payload.userId) {
      return NextResponse.json({ code: 403, message: '无权限修改此Skill' }, { status: 403 });
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name.trim()); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (icon !== undefined) { updates.push('icon = ?'); values.push(icon); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category); }
    if (config !== undefined) { updates.push('config = ?'); values.push(JSON.stringify(config)); }
    if (isPublic !== undefined) { updates.push('is_public = ?'); values.push(isPublic ? 1 : 0); }

    if (updates.length === 0) {
      return NextResponse.json({ code: 400, message: '没有需要更新的字段' }, { status: 400 });
    }

    updates.push('updated_at = datetime(\'now\')');
    values.push(skillId);

    db.prepare(`UPDATE skills SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM skills WHERE id = ?').get(skillId);
    return NextResponse.json({ code: 200, message: '更新成功', data: updated });
  } catch (err) {
    console.error('Update skill error:', err);
    return NextResponse.json({ code: 500, message: '更新技能失败' }, { status: 500 });
  }
}

/** DELETE /api/skills/[id] - 删除技能 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const skillId = parseInt(id);
    if (isNaN(skillId)) {
      return NextResponse.json({ code: 400, message: '无效的Skill ID' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ code: 401, message: '令牌无效' }, { status: 401 });
    }

    const db = getDb();
    const existing = db.prepare('SELECT * FROM skills WHERE id = ?').get(skillId) as Record<string, unknown> | undefined;
    if (!existing) {
      return NextResponse.json({ code: 404, message: 'Skill不存在' }, { status: 404 });
    }
    if (existing.created_by !== payload.userId) {
      return NextResponse.json({ code: 403, message: '无权限删除此Skill' }, { status: 403 });
    }

    // Delete runs first, then skill
    db.prepare('DELETE FROM skill_runs WHERE skill_id = ?').run(skillId);
    db.prepare('DELETE FROM skills WHERE id = ?').run(skillId);

    return NextResponse.json({ code: 200, message: '删除成功', data: null });
  } catch (err) {
    console.error('Delete skill error:', err);
    return NextResponse.json({ code: 500, message: '删除技能失败' }, { status: 500 });
  }
}
