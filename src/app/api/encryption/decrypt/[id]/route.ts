import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { createDecipheriv, scryptSync } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = request.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const user = verifyToken(auth.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const body = await request.json();
    const password = body.password;

    if (!password) return NextResponse.json({ error: '请输入解密密码' }, { status: 400 });

    const db = getDb();
    let file = db.prepare('SELECT * FROM files WHERE id = ? AND uploaded_by = ? AND deleted_at IS NULL')
      .get(Number(id), user.userId) as Record<string, unknown> | undefined;

    // Admin can decrypt any file
    if (!file && user.role === 'admin') {
      file = db.prepare('SELECT * FROM files WHERE id = ? AND deleted_at IS NULL')
        .get(Number(id)) as Record<string, unknown> | undefined;
    }

    if (!file) return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    if (!Number(file.is_encrypted)) return NextResponse.json({ error: '文件未加密' }, { status: 400 });

    const storagePath = file.storage_path as string;
    const ivHex = file.encryption_iv as string;
    if (!storagePath || !ivHex) return NextResponse.json({ error: '加密信息不完整' }, { status: 400 });

    // Read encrypted file
    const encryptedBuffer = readFileSync(storagePath);

    // Decrypt
    const iv = Buffer.from(ivHex, 'hex');
    const key = scryptSync(password, 'cloud-drive-salt', 32);
    const decipher = createDecipheriv('aes-256-cbc', key, iv);

    let decrypted: Buffer;
    try {
      decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
    } catch {
      return NextResponse.json({ error: '密码错误，解密失败' }, { status: 400 });
    }

    // Write decrypted file back
    writeFileSync(storagePath, decrypted);

    // Update database
    db.prepare('UPDATE files SET is_encrypted = 0, encryption_iv = NULL WHERE id = ?').run(Number(id));

    return NextResponse.json({ success: true, message: '文件解密成功' });
  } catch (error) {
    console.error('文件解密失败:', error);
    return NextResponse.json({ error: '文件解密失败' }, { status: 500 });
  }
}
