import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import path from 'path';
import fs from 'fs';

/** POST /api/shares/[code]/download - 通过分享链接下载文件（公开接口） */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { password } = body as { password?: string };

    const db = getDb();
    const share = db.prepare(`
      SELECT s.*, f.name as file_name, f.storage_path, f.is_folder, f.deleted_at
      FROM shares s
      JOIN files f ON s.file_id = f.id
      WHERE s.share_code = ?
    `).get(code) as Record<string, unknown> | undefined;

    if (!share) {
      return NextResponse.json({ code: 404, message: '分享不存在', data: null }, { status: 404 });
    }

    // 检查文件是否已被删除
    if (share.deleted_at) {
      return NextResponse.json({ code: 410, message: '文件已被删除，分享已失效', data: null }, { status: 410 });
    }

    // 检查密码
    if (share.password && share.password !== password) {
      return NextResponse.json({ code: 403, message: '密码错误', data: null }, { status: 403 });
    }

    // 检查过期
    if (share.expires_at) {
      const expiresAt = new Date(share.expires_at as string);
      if (expiresAt < new Date()) {
        return NextResponse.json({ code: 410, message: '分享已过期', data: null }, { status: 410 });
      }
    }

    // 检查下载次数
    if (share.max_downloads && (share.download_count as number) >= (share.max_downloads as number)) {
      return NextResponse.json({ code: 410, message: '下载次数已达上限', data: null }, { status: 410 });
    }

    if (share.is_folder) {
      return NextResponse.json({ code: 400, message: '暂不支持下载文件夹', data: null }, { status: 400 });
    }

    const storagePath = share.storage_path as string;
    if (!storagePath || !fs.existsSync(storagePath)) {
      return NextResponse.json({ code: 404, message: '文件已丢失', data: null }, { status: 404 });
    }

    // 增加下载计数
    db.prepare('UPDATE shares SET download_count = download_count + 1 WHERE id = ?').run(share.id);

    const fileBuffer = fs.readFileSync(storagePath);
    const fileName = share.file_name as string;

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch {
    return NextResponse.json({ code: 500, message: '下载失败', data: null }, { status: 500 });
  }
}
