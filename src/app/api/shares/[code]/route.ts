import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { formatFileSize } from '@/lib/file-types';

/** GET /api/shares/[code] - 获取分享信息（公开接口，无需登录） */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const db = getDb();

    const share = db.prepare(`
      SELECT s.*, f.name as file_name, f.size as file_size, f.is_folder, f.file_ext,
             f.file_category, f.storage_path, f.mime_type, f.deleted_at
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

    // 检查是否过期
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

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        id: share.id,
        fileName: share.file_name,
        fileSize: share.file_size,
        fileSizeText: formatFileSize(share.file_size as number),
        isFolder: !!share.is_folder,
        fileExt: share.file_ext,
        fileCategory: share.file_category,
        hasPassword: !!share.password,
        expiresAt: share.expires_at,
        createdAt: share.created_at,
      },
    });
  } catch {
    return NextResponse.json({ code: 500, message: '获取分享信息失败', data: null }, { status: 500 });
  }
}
