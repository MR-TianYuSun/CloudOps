import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUploadDir, buildFilePath } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getCategoryByExt, getPreviewType, getFileCategory, getFileExt, getMimeType } from '@/lib/file-types';

// GET /api/teams/[id]/files — 获取团队文件列表
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = verifyToken(req.headers.get('authorization'));
    if (!payload) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();

    // 检查是否是团队成员
    const membership = db.prepare(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(id, payload.userId);

    if (!membership && payload.role !== 'admin') {
      return NextResponse.json({ code: 403, message: '无权限', data: null }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parent_id');
    const parentIdValue = parentId && parentId !== '0' ? Number(parentId) : null;

    const files = db.prepare(`
      SELECT f.*, u.display_name as uploader_name
      FROM files f
      LEFT JOIN users u ON f.uploaded_by = u.id
      WHERE f.owner_type = 'team' AND f.team_id = ?
        AND f.parent_id IS ?
        AND f.deleted_at IS NULL
      ORDER BY f.is_folder DESC, f.created_at DESC
    `).all(id, parentIdValue);

    const formatted = (files as Record<string, unknown>[]).map((f) => ({
      id: f.id,
      name: f.name,
      isFolder: Boolean(f.is_folder),
      size: Number(f.size) || 0,
      sizeText: formatSize(Number(f.size) || 0),
      mimeType: f.mime_type as string | null,
      fileExt: f.file_ext as string | null,
      fileCategory: f.is_folder ? 'folder' : (getCategoryByExt(f.file_ext as string) || 'other'),
      parentId: f.parent_id,
      uploaderName: f.uploader_name,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
    }));

    return NextResponse.json({ code: 200, message: 'success', data: formatted });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ code: 500, message: msg, data: null }, { status: 500 });
  }
}

// POST /api/teams/[id]/files — 上传文件到团队空间
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = verifyToken(req.headers.get('authorization'));
    if (!payload) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();

    // 检查是否是团队成员
    const membership = db.prepare(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(id, payload.userId);

    if (!membership && payload.role !== 'admin') {
      return NextResponse.json({ code: 403, message: '无权限', data: null }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const parentIdStr = formData.get('parent_id') as string | null;

    if (!file) {
      return NextResponse.json({ code: 400, message: '请选择文件', data: null }, { status: 400 });
    }

    const parentId = parentIdStr && parentIdStr !== '0' ? Number(parentIdStr) : null;

    // 保存文件到磁盘
    const uploadsDir = getUploadDir();
    await mkdir(uploadsDir, { recursive: true });

    const ext = getFileExt(file.name);
    const storageName = `${Date.now()}--${file.name}`;
    const storagePath = path.join(uploadsDir, storageName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(storagePath, buffer);

    // 构建虚拟路径
    const filePath = buildFilePath(db, file.name, parentId);

    // 写入数据库（storage_path 存完整绝对路径，与个人上传一致）
    const result = db.prepare(`
      INSERT INTO files (name, path, is_folder, size, mime_type, file_ext, file_category, storage_path, uploaded_by, owner_type, team_id, parent_id)
      VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, 'team', ?, ?)
    `).run(
      file.name,
      filePath,
      file.size,
      getMimeType(file.name),
      ext,
      getFileCategory(file.name),
      storagePath,
      payload.userId,
      id,
      parentId,
    );

    return NextResponse.json({
      code: 200,
      message: '上传成功',
      data: { id: result.lastInsertRowid, name: file.name },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '上传失败';
    return NextResponse.json({ code: 500, message: msg, data: null }, { status: 500 });
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
