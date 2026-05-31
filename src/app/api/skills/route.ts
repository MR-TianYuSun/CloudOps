import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

/** GET /api/skills - 获取技能列表 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ code: 401, message: '令牌无效', data: null }, { status: 401 });
    }

    const db = getDb();
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const scope = url.searchParams.get('scope'); // 'mine' | 'public' | 'all'
    const fileCategory = url.searchParams.get('fileCategory'); // for file type association

    let query = `
      SELECT s.*, f.name as file_name, u.display_name as creator_name
      FROM skills s
      LEFT JOIN files f ON s.file_id = f.id
      LEFT JOIN users u ON s.created_by = u.id
    `;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (scope === 'public') {
      // 只看公共技能（发现/市场）
      conditions.push('s.is_public = 1');
    } else if (scope === 'mine') {
      // 只看我的技能
      conditions.push('s.created_by = ?');
      params.push(payload.userId);
    } else {
      // 默认：我的 + 公共的
      conditions.push('(s.created_by = ? OR s.is_public = 1)');
      params.push(payload.userId);
    }

    if (category) {
      conditions.push('s.category = ?');
      params.push(category);
    }

    if (search) {
      conditions.push('(s.name LIKE ? OR s.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    // File type association: recommend skills by file category
    if (fileCategory) {
      const categoryMap: Record<string, string[]> = {
        document: ['prompt', 'automation'],
        spreadsheet: ['automation', 'script'],
        image: ['prompt', 'script'],
        video: ['script', 'automation'],
        audio: ['script', 'automation'],
        code: ['script', 'automation'],
        archive: ['script'],
      };
      const allowedCategories = categoryMap[fileCategory] || ['prompt', 'script', 'automation'];
      const placeholders = allowedCategories.map(() => '?').join(',');
      conditions.push(`s.category IN (${placeholders})`);
      params.push(...allowedCategories);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY s.updated_at DESC';

    const skills = db.prepare(query).all(...params);

    return NextResponse.json({ code: 200, message: 'success', data: skills });
  } catch (err) {
    console.error('Get skills error:', err);
    return NextResponse.json({ code: 500, message: '获取技能列表失败', data: null }, { status: 500 });
  }
}

/** POST /api/skills - 创建技能 or 导入技能 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ code: 401, message: '令牌无效', data: null }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body as { action?: string };

    // Import skill from JSON
    if (action === 'import') {
      const { skillData } = body as { skillData: Record<string, unknown> };
      if (!skillData || !skillData.name) {
        return NextResponse.json({ code: 400, message: '导入数据格式无效', data: null }, { status: 400 });
      }

      const db = getDb();
      const result = db.prepare(`
        INSERT INTO skills (name, description, icon, category, file_id, config, is_public, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        (skillData.name as string).trim(),
        (skillData.description as string) || '',
        (skillData.icon as string) || '⚡',
        (skillData.category as string) || 'general',
        null, // imported skills don't link to files
        typeof skillData.config === 'string' ? skillData.config : JSON.stringify(skillData.config || {}),
        0, // imported skills are private by default
        payload.userId
      );

      const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(result.lastInsertRowid);
      return NextResponse.json({ code: 200, message: 'Skill导入成功', data: skill });
    }

    // Create skill normally
    const { name, description, icon, category, fileId, config, isPublic } = body as {
      name: string;
      description?: string;
      icon?: string;
      category?: string;
      fileId?: number;
      config?: Record<string, unknown>;
      isPublic?: boolean;
    };

    if (!name?.trim()) {
      return NextResponse.json({ code: 400, message: '技能名称不能为空', data: null }, { status: 400 });
    }

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO skills (name, description, icon, category, file_id, config, is_public, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name.trim(),
      description || '',
      icon || '⚡',
      category || 'general',
      fileId || null,
      JSON.stringify(config || {}),
      isPublic ? 1 : 0,
      payload.userId
    );

    const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(result.lastInsertRowid);

    return NextResponse.json({ code: 200, message: '技能创建成功', data: skill });
  } catch (err) {
    console.error('Create skill error:', err);
    return NextResponse.json({ code: 500, message: '创建技能失败', data: null }, { status: 500 });
  }
}
