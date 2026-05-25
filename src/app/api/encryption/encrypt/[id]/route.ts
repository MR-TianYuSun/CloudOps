import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { createCipheriv, randomBytes, scryptSync } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = request.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const user = verifyToken(auth.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const body = await request.json();
    const password = body.password;

    if (!password) return NextResponse.json({ error: '请输入加密密码' }, { status: 400 });

    const db = getDb();
    let file = db.prepare('SELECT * FROM files WHERE id = ? AND uploaded_by = ? AND deleted_at IS NULL')
      .get(Number(id), user.userId) as Record<string, unknown> | undefined;

    // Admin can encrypt any file
    if (!file && user.role === 'admin') {
      file = db.prepare('SELECT * FROM files WHERE id = ? AND deleted_at IS NULL')
        .get(Number(id)) as Record<string, unknown> | undefined;
    }

    if (!file) return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    if (Number(file.is_encrypted)) return NextResponse.json({ error: '文件已加密' }, { status: 400 });

    const storagePath = file.storage_path as string;
    if (!storagePath) return NextResponse.json({ error: '文件路径无效' }, { status: 400 });

    // Read original file
    const fileBuffer = readFileSync(storagePath);

    // Encrypt with AES-256-CBC
    const iv = randomBytes(16);
    const key = scryptSync(password, 'cloud-drive-salt', 32);
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);

    // Write encrypted file back
    writeFileSync(storagePath, encrypted);

    // Update database
    const ivHex = iv.toString('hex');
    db.prepare('UPDATE files SET is_encrypted = 1, encryption_iv = ? WHERE id = ?').run(ivHex, Number(id));

    return NextResponse.json({ success: true, message: '文件加密成功' });
  } catch (error) {
    console.error('文件加密失败:', error);
    return NextResponse.json({ error: '文件加密失败' }, { status: 500 });
  }
}
