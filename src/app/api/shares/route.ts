import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import crypto from 'crypto';

/** POST /api/shares - 创建分享链接 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ code: 401, message: '令牌无效', data: null }, { status: 401 });
    }

    const body = await request.json();
    const { fileId, file_id, password, expiresIn, expiry_days, maxDownloads } = body as {
      fileId?: number;
      file_id?: number;
      password?: string;
      expiresIn?: number; // 小时数
      expiry_days?: number; // 天数（前端传）
      maxDownloads?: number;
    };

    const actualFileId = fileId || file_id;
    if (!actualFileId) {
      return NextResponse.json({ code: 400, message: '请选择文件', data: null }, { status: 400 });
    }

    // 前端传天数(expiry_days)，后端统一转为小时
    const actualExpiresIn = expiresIn || (expiry_days ? expiry_days * 24 : undefined);

    const db = getDb();
    const file = db.prepare('SELECT * FROM files WHERE id = ? AND deleted_at IS NULL').get(actualFileId) as Record<string, unknown> | undefined;
    if (!file) {
      return NextResponse.json({ code: 404, message: '文件不存在或已被删除', data: null }, { status: 404 });
    }

    // 文件夹暂不支持分享下载
    if (file.is_folder) {
      return NextResponse.json({ code: 400, message: '暂不支持分享文件夹，请选择文件进行分享', data: null }, { status: 400 });
    }

    if (payload.role !== 'admin' && file.uploaded_by !== payload.userId) {
      return NextResponse.json({ code: 403, message: '无权分享该文件', data: null }, { status: 403 });
    }

    const shareCode = crypto.randomBytes(4).toString('hex'); // 8位
    const expiresAt = actualExpiresIn
      ? new Date(Date.now() + actualExpiresIn * 3600000).toISOString().replace('T', ' ').substring(0, 19)
      : null;

    db.prepare(`
      INSERT INTO shares (file_id, share_code, password, max_downloads, expires_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(actualFileId, shareCode, password || null, maxDownloads || 0, expiresAt, payload.userId);

    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || `http://localhost:${process.env.DEPLOY_RUN_PORT || 5000}`;
    const shareUrl = `${domain}/s/${shareCode}`;

    return NextResponse.json({
      code: 200,
      message: '分享链接已创建',
      data: { shareCode, shareUrl, password: password || null, expiresAt, maxDownloads: maxDownloads || 0 },
    });
  } catch {
    return NextResponse.json({ code: 500, message: '创建分享失败', data: null }, { status: 500 });
  }
}

/** GET /api/shares - 获取我的分享列表 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ code: 401, message: '令牌无效', data: null }, { status: 401 });
    }

    const db = getDb();
    const shares = db.prepare(`
      SELECT s.*, f.name as file_name, f.size as file_size, f.is_folder, f.file_ext, f.file_category
      FROM shares s
      JOIN files f ON s.file_id = f.id
      WHERE s.created_by = ?
      ORDER BY s.created_at DESC
    `).all(payload.userId);

    return NextResponse.json({ code: 200, message: 'success', data: shares });
  } catch {
    return NextResponse.json({ code: 500, message: '获取分享列表失败', data: null }, { status: 500 });
  }
}

/** DELETE /api/shares - 删除分享 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ code: 401, message: '令牌无效', data: null }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ code: 400, message: '缺少 id', data: null }, { status: 400 });
    }

    const db = getDb();
    db.prepare('DELETE FROM shares WHERE id = ? AND created_by = ?').run(parseInt(id), payload.userId);

    return NextResponse.json({ code: 200, message: '已取消分享', data: null });
  } catch {
    return NextResponse.json({ code: 500, message: '操作失败', data: null }, { status: 500 });
  }
}
