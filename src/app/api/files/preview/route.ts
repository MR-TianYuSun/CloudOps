import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getPreviewType, getMimeType } from '@/lib/file-types';
import fs from 'fs';
import path from 'path';

/** GET /api/files/preview?id=xxx&token=xxx - 文件预览 */
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
    const file = db.prepare('SELECT * FROM files WHERE id = ? AND is_folder = 0').get(fileId) as Record<string, unknown> | undefined;

    if (!file || !file.storage_path) {
      return NextResponse.json({ code: 404, message: '文件不存在', data: null }, { status: 404 });
    }

    const ownerType = (file.owner_type as string) || 'personal';

    // 管理员可预览所有文件；非管理员需权限校验
    if (payload.role !== 'admin') {
      if (ownerType === 'personal' && file.uploaded_by !== payload.userId) {
        return NextResponse.json({ code: 403, message: '无权访问该文件', data: null }, { status: 403 });
      }
      if (ownerType === 'team' && file.team_id) {
        const membership = db.prepare('SELECT id FROM team_members WHERE team_id = ? AND user_id = ?').get(file.team_id as number, payload.userId);
        if (!membership) {
          return NextResponse.json({ code: 403, message: '无权访问该团队文件', data: null }, { status: 403 });
        }
      }
    }

    const previewType = getPreviewType(file.name as string);
    if (previewType === 'none') {
      return NextResponse.json({ code: 400, message: '该文件类型不支持预览', data: null }, { status: 400 });
    }

    const storagePath = file.storage_path as string;
    if (!fs.existsSync(storagePath)) {
      return NextResponse.json({ code: 404, message: '文件已丢失', data: null }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(storagePath);
    const ext = path.extname(file.name as string).toLowerCase().replace('.', '');

    // 文本类文件：直接返回文本内容供前端渲染
    const textPreviewTypes = ['text', 'csv', 'markdown', 'html', 'css', 'code'];
    if (textPreviewTypes.includes(previewType)) {
      let content: string;
      try {
        content = fileBuffer.toString('utf-8');
      } catch {
        content = '[无法解码文件内容]';
      }
      return NextResponse.json({
        code: 200,
        message: 'success',
        data: {
          previewType,
          content,
          fileName: file.name,
          ext,
          mimeType: file.mime_type,
        },
      });
    }

    // 二进制文件（PDF、DOCX、Excel、PPTX、图片、音视频）：返回文件流
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': (file.mime_type as string) || getMimeType(file.name as string) || 'application/octet-stream',
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (e) {
    console.error('[Preview Error]', e);
    return NextResponse.json({ code: 500, message: '预览失败', data: null }, { status: 500 });
  }
}
