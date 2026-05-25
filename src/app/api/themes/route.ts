import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const user = verifyToken(auth.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const db = getDb();

    // Get user's theme
    let theme = db.prepare('SELECT * FROM user_themes WHERE user_id = ?').get(user.userId);
    if (!theme) {
      // Create default theme
      db.prepare(`
        INSERT INTO user_themes (user_id, theme_name, accent_color, font_size)
        VALUES (?, 'default', '#7C5CFF', 'medium')
      `).run(user.userId);
      theme = db.prepare('SELECT * FROM user_themes WHERE user_id = ?').get(user.userId);
    }

    return NextResponse.json({ success: true, data: theme });
  } catch (error) {
    console.error('获取主题失败:', error);
    return NextResponse.json({ error: '获取主题失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const user = verifyToken(auth.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const body = await request.json();
    const db = getDb();

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.themeName !== undefined) { updates.push('theme_name = ?'); values.push(body.themeName); }
    if (body.accentColor !== undefined) { updates.push('accent_color = ?'); values.push(body.accentColor); }
    if (body.wallpaper !== undefined) { updates.push('wallpaper = ?'); values.push(body.wallpaper); }
    if (body.fontSize !== undefined) { updates.push('font_size = ?'); values.push(body.fontSize); }

    if (updates.length === 0) {
      return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 });
    }

    updates.push("updated_at = datetime('now')");
    values.push(user.userId);

    db.prepare(`
      UPDATE user_themes SET ${updates.join(', ')} WHERE user_id = ?
    `).run(...values);

    const updated = db.prepare('SELECT * FROM user_themes WHERE user_id = ?').get(user.userId);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('更新主题失败:', error);
    return NextResponse.json({ error: '更新主题失败' }, { status: 500 });
  }
}
