import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import fs from 'fs';

/** POST /api/shares/[code]/download - 通过分享链接下载文件（公开接口）
 *  支持 ?fileId=xxx 下载文件夹内的单个文件
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    let password: string | undefined;
    try {
      const body = await request.json() as { password?: string };
      password = body.password;
    } catch {
      // No JSON body or empty body — treat as no password
    }

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

    // 获取 fileId 参数 - 用于从文件夹分享中下载单个文件
    const { searchParams } = new URL(request.url);
    const fileIdParam = searchParams.get('fileId');

    if (fileIdParam) {
      const fileId = parseInt(fileIdParam, 10);
      const shareFileId = share.file_id as number;

      // 如果 fileId 就是分享的文件本身（单文件分享场景），直接下载
      if (fileId === shareFileId && !share.is_folder) {
        const storagePath = share.storage_path as string;
        if (!storagePath || !fs.existsSync(storagePath)) {
          return NextResponse.json({ code: 404, message: '文件已丢失', data: null }, { status: 404 });
        }

        db.prepare('UPDATE shares SET download_count = download_count + 1 WHERE id = ?').run(share.id);

        const fileBuffer = fs.readFileSync(storagePath);
        const fileName = encodeURIComponent(share.file_name as string);

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename*=UTF-8''${fileName}`,
            'Content-Length': fileBuffer.length.toString(),
          },
        });
      }

      // 文件夹分享 - 验证文件属于该分享的文件夹
      const belongsToFolder = isFileDescendantOf(db, fileId, shareFileId);
      if (!belongsToFolder) {
        return NextResponse.json({ code: 403, message: '该文件不属于此分享', data: null }, { status: 403 });
      }

      const file = db.prepare(
        'SELECT id, name, storage_path, is_folder FROM files WHERE id = ? AND deleted_at IS NULL'
      ).get(fileId) as Record<string, unknown> | undefined;

      if (!file || file.is_folder) {
        return NextResponse.json({ code: 404, message: '文件不存在', data: null }, { status: 404 });
      }

      const storagePath = file.storage_path as string;
      if (!storagePath || !fs.existsSync(storagePath)) {
        return NextResponse.json({ code: 404, message: '文件已丢失', data: null }, { status: 404 });
      }

      // 增加下载计数
      db.prepare('UPDATE shares SET download_count = download_count + 1 WHERE id = ?').run(share.id);

      const fileBuffer = fs.readFileSync(storagePath);
      const fileName = encodeURIComponent(file.name as string);

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename*=UTF-8''${fileName}`,
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    }

    // 单文件分享 - 直接下载
    if (!share.is_folder) {
      const storagePath = share.storage_path as string;
      if (!storagePath || !fs.existsSync(storagePath)) {
        return NextResponse.json({ code: 404, message: '文件已丢失', data: null }, { status: 404 });
      }

      // 增加下载计数
      db.prepare('UPDATE shares SET download_count = download_count + 1 WHERE id = ?').run(share.id);

      const fileBuffer = fs.readFileSync(storagePath);
      const fileName = encodeURIComponent(share.file_name as string);

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename*=UTF-8''${fileName}`,
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    }

    // 文件夹分享但没有指定 fileId - 返回错误提示
    return NextResponse.json({
      code: 400,
      message: '文件夹分享请选择具体文件下载',
      data: null,
    }, { status: 400 });

  } catch (err) {
    console.error('Download share error:', err);
    return NextResponse.json({ code: 500, message: '下载失败', data: null }, { status: 500 });
  }
}

/** 检查文件是否是某文件夹的后代（递归） */
function isFileDescendantOf(db: ReturnType<typeof getDb>, fileId: number, folderId: number): boolean {
  // 直接子项
  const directChild = db.prepare(
    'SELECT id FROM files WHERE id = ? AND parent_id = ? AND deleted_at IS NULL'
  ).get(fileId, folderId);
  if (directChild) return true;

  // 递归检查 - 找到文件的所有祖先，看是否包含 folderId
  let currentFile = db.prepare(
    'SELECT id, parent_id FROM files WHERE id = ? AND deleted_at IS NULL'
  ).get(fileId) as Record<string, unknown> | undefined;

  const visited = new Set<number>();
  while (currentFile && currentFile.parent_id) {
    const parentId = currentFile.parent_id as number;
    if (parentId === folderId) return true;
    if (visited.has(parentId)) break; // 防止循环
    visited.add(parentId);

    currentFile = db.prepare(
      'SELECT id, parent_id FROM files WHERE id = ? AND deleted_at IS NULL'
    ).get(parentId) as Record<string, unknown> | undefined;
  }

  return false;
}
