import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import fs from 'fs';

/** GET /api/files/download?id=xxx&owner_type=personal|team&token=xxx - 文件下载 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // 支持 Authorization header 和 query param 两种方式传 token
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
      || searchParams.get('token');
    if (!token) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ code: 401, message: '令牌无效', data: null }, { status: 401 });
    }

    const fileId = searchParams.get('id');
    if (!fileId) {
      return NextResponse.json({ code: 400, message: '缺少文件ID', data: null }, { status: 400 });
    }

    const db = getDb();
    const file = db.prepare('SELECT * FROM files WHERE id = ? AND is_folder = 0 AND deleted_at IS NULL').get(fileId) as Record<string, unknown> | undefined;

    if (!file || !file.storage_path) {
      return NextResponse.json({ code: 404, message: '文件不存在', data: null }, { status: 404 });
    }

    const ownerType = (file.owner_type as string) || 'personal';

    // 管理员可下载所有文件；非管理员需权限校验
    if (payload.role !== 'admin') {
      // 个人文件：只有上传者本人可下载
      if (ownerType === 'personal' && file.uploaded_by !== payload.userId) {
        return NextResponse.json({ code: 403, message: '无权下载该文件', data: null }, { status: 403 });
      }
      // 团队文件：必须是团队成员
      if (ownerType === 'team' && file.team_id) {
        const membership = db.prepare('SELECT id FROM team_members WHERE team_id = ? AND user_id = ?').get(file.team_id as number, payload.userId);
        if (!membership) {
          return NextResponse.json({ code: 403, message: '无权下载该团队文件', data: null }, { status: 403 });
        }
      }
    }

    const storagePath = file.storage_path as string;
    if (!fs.existsSync(storagePath)) {
      return NextResponse.json({ code: 404, message: '文件已丢失', data: null }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(storagePath);
    const fileName = encodeURIComponent(file.name as string);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': (file.mime_type as string) || 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${fileName}`,
        'Content-Length': String(fileBuffer.length),
      },
    });
  } catch (e) {
    console.error('[Download Error]', e);
    return NextResponse.json({ code: 500, message: '下载失败', data: null }, { status: 500 });
  }
}
