import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getFileCategory, getFileExt, getMimeType } from '@/lib/file-types';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

/** POST /api/files/upload - 文件上传 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ code: 401, message: '令牌无效', data: null }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const parentIdRaw = formData.get('parent_id') as string | null;
    const parentId = parentIdRaw ? parseInt(parentIdRaw) : null;
    // parent_id 为 0 或 NaN 时视为根目录（NULL）
    const effectiveParentId = parentId && parentId > 0 ? parentId : null;

    if (!file) {
      return NextResponse.json({ code: 400, message: '请选择文件', data: null }, { status: 400 });
    }

    ensureUploadDir();

    // 生成唯一存储文件名
    const ext = getFileExt(file.name);
    const storageName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const storagePath = path.join(UPLOAD_DIR, storageName);

    // 写入文件
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(storagePath, buffer);

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO files (name, path, parent_id, is_folder, size, mime_type, file_ext, file_category, storage_path, uploaded_by, owner_type)
      VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 'personal')
    `).run(
      file.name,
      `/${file.name}`,
      effectiveParentId,
      file.size,
      getMimeType(file.name),
      ext,
      getFileCategory(file.name),
      storagePath,
      payload.userId
    );

    return NextResponse.json({
      code: 200,
      message: '上传成功',
      data: { id: result.lastInsertRowid, name: file.name },
    });
  } catch (e) {
    console.error('[Upload Error]', e);
    return NextResponse.json({ code: 500, message: '上传失败', data: null }, { status: 500 });
  }
}
