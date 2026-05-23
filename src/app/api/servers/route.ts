import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET /api/servers — 获取服务器列表
export async function GET(req: NextRequest) {
  try {
    const payload = verifyToken(req.headers.get('authorization'));
    if (!payload) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }

    const db = getDb();
    const servers = db.prepare(`
      SELECT id, name, ip_address, os_type, os_name, environment, tags,
             ssh_port, ssh_user, ssh_password, ssh_key, vnc_port, vnc_password,
             status, cpu_cores, memory_total, disk_total, created_at
      FROM servers
      ORDER BY created_at DESC
    `).all() as Record<string, unknown>[];

    // Mask sensitive fields in response
    const masked = servers.map(s => ({
      ...s,
      ssh_password: s.ssh_password ? '••••••' : null,
      ssh_key: s.ssh_key ? '••••••' : null,
      vnc_password: s.vnc_password ? '••••••' : null,
      has_ssh_password: !!s.ssh_password,
      has_ssh_key: !!s.ssh_key,
      has_vnc_password: !!s.vnc_password,
    }));

    return NextResponse.json({ code: 200, message: 'success', data: masked });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ code: 500, message: msg, data: null }, { status: 500 });
  }
}

// POST /api/servers — 添加服务器
export async function POST(req: NextRequest) {
  try {
    const payload = verifyToken(req.headers.get('authorization'));
    if (!payload) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }
    if (payload.role !== 'admin') {
      return NextResponse.json({ code: 403, message: '无权限', data: null }, { status: 403 });
    }

    const body = await req.json();
    const { name, ip_address, os_type, os_name, environment, ssh_port, ssh_user, ssh_password, ssh_key, vnc_port, vnc_password, tags, cpu_cores, memory_total, disk_total } = body;

    if (!name?.trim() || !ip_address?.trim()) {
      return NextResponse.json({ code: 400, message: '名称和IP地址不能为空', data: null }, { status: 400 });
    }

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO servers (name, ip_address, os_type, os_name, environment, ssh_port, ssh_user, ssh_password, ssh_key, vnc_port, vnc_password, tags, status, cpu_cores, memory_total, disk_total, owner_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'offline', ?, ?, ?, ?)
    `).run(
      name.trim(), ip_address.trim(), os_type || 'linux', os_name || os_type || 'Linux',
      environment || 'development', ssh_port || 22, ssh_user || 'root',
      ssh_password || null, ssh_key || null, vnc_port || 5900, vnc_password || null,
      tags || '',
      cpu_cores || null, memory_total || null, disk_total || null,
      payload.userId
    );

    return NextResponse.json({ code: 200, message: '添加成功', data: { id: result.lastInsertRowid } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ code: 500, message: msg, data: null }, { status: 500 });
  }
}
