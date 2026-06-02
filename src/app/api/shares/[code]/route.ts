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

    // 如果是文件夹，获取文件夹内容
    let folderContents: Array<{
      id: number;
      name: string;
      size: number;
      sizeText: string;
      isFolder: boolean;
      fileExt: string | null;
      fileCategory: string;
    }> = [];

    if (share.is_folder) {
      const folderId = share.file_id as number;
      const children = db.prepare(`
        SELECT id, name, size, is_folder, file_ext, file_category
        FROM files
        WHERE parent_id = ? AND deleted_at IS NULL
        ORDER BY is_folder DESC, name ASC
      `).all(folderId) as Array<Record<string, unknown>>;

      folderContents = children.map(c => ({
        id: c.id as number,
        name: c.name as string,
        size: c.size as number,
        sizeText: formatFileSize(c.size as number),
        isFolder: !!c.is_folder,
        fileExt: c.file_ext as string | null,
        fileCategory: c.file_category as string,
      }));

      // 计算文件夹总大小
      const totalSize = calculateFolderSize(db, folderId);
      share.file_size = totalSize;
    }

    // 如果有密码，GET请求只返回基本信息（不返回文件内容列表）
    const hasPassword = !!share.password;
    const responseData: Record<string, unknown> = {
      id: share.id,
      fileName: share.file_name,
      fileSize: share.file_size,
      fileSizeText: formatFileSize(share.file_size as number),
      isFolder: !!share.is_folder,
      fileExt: share.file_ext,
      fileCategory: share.file_category,
      hasPassword,
      expiresAt: share.expires_at,
      createdAt: share.created_at,
    };

    // 只有无密码的分享才直接返回文件夹内容
    if (!hasPassword) {
      responseData.folderContents = folderContents;
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: responseData,
    });
  } catch {
    return NextResponse.json({ code: 500, message: '获取分享信息失败', data: null }, { status: 500 });
  }
}

/** 递归计算文件夹总大小 */
function calculateFolderSize(db: ReturnType<typeof getDb>, folderId: number): number {
  let totalSize = 0;
  const children = db.prepare(
    'SELECT id, is_folder, size FROM files WHERE parent_id = ? AND deleted_at IS NULL'
  ).all(folderId) as Array<Record<string, unknown>>;

  for (const child of children) {
    if (child.is_folder) {
      totalSize += calculateFolderSize(db, child.id as number);
    } else {
      totalSize += (child.size as number) || 0;
    }
  }
  return totalSize;
}

/** POST /api/shares/[code] - 验证分享密码并获取完整信息 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json().catch(() => ({}));
    const password = body.password as string | undefined;
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

    if (share.deleted_at) {
      return NextResponse.json({ code: 410, message: '文件已被删除，分享已失效', data: null }, { status: 410 });
    }

    if (share.expires_at) {
      const expiresAt = new Date(share.expires_at as string);
      if (expiresAt < new Date()) {
        return NextResponse.json({ code: 410, message: '分享已过期', data: null }, { status: 410 });
      }
    }

    // 验证密码
    if (share.password && password !== share.password) {
      return NextResponse.json({ code: 403, message: '提取码错误', data: null }, { status: 403 });
    }

    // 获取文件夹内容
    let folderContents: Array<{
      id: number;
      name: string;
      size: number;
      sizeText: string;
      isFolder: boolean;
      fileExt: string | null;
      fileCategory: string;
    }> = [];

    if (share.is_folder) {
      const folderId = share.file_id as number;
      const children = db.prepare(`
        SELECT id, name, size, is_folder, file_ext, file_category
        FROM files
        WHERE parent_id = ? AND deleted_at IS NULL
        ORDER BY is_folder DESC, name ASC
      `).all(folderId) as Array<Record<string, unknown>>;

      folderContents = children.map(c => ({
        id: c.id as number,
        name: c.name as string,
        size: c.size as number,
        sizeText: formatFileSize(c.size as number),
        isFolder: !!c.is_folder,
        fileExt: c.file_ext as string | null,
        fileCategory: c.file_category as string,
      }));

      share.file_size = calculateFolderSize(db, folderId);
    }

    return NextResponse.json({
      code: 200,
      message: '验证成功',
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
        folderContents,
      },
    });
  } catch {
    return NextResponse.json({ code: 500, message: '验证失败', data: null }, { status: 500 });
  }
}
