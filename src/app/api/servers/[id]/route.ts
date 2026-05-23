import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET /api/servers/[id] — 获取服务器详情
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
    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(id) as Record<string, unknown> | undefined;

    if (!server) {
      return NextResponse.json({ code: 404, message: '服务器不存在', data: null }, { status: 404 });
    }

    // Mask sensitive fields in response
    const masked = {
      ...server,
      ssh_password: server.ssh_password ? '••••••' : null,
      ssh_key: server.ssh_key ? '••••••' : null,
      vnc_password: (server as Record<string, unknown>).vnc_password ? '••••••' : null,
      has_ssh_password: !!server.ssh_password,
      has_ssh_key: !!server.ssh_key,
      has_vnc_password: !!(server as Record<string, unknown>).vnc_password,
    };

    return NextResponse.json({ code: 200, message: 'success', data: masked });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ code: 500, message: msg, data: null }, { status: 500 });
  }
}

// PATCH /api/servers/[id] — 更新服务器信息（包括 SSH 凭据）
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = verifyToken(req.headers.get('authorization'));
    if (!payload) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }
    if (payload.role !== 'admin') {
      return NextResponse.json({ code: 403, message: '无权限', data: null }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const db = getDb();

    const server = db.prepare('SELECT id FROM servers WHERE id = ?').get(id);
    if (!server) {
      return NextResponse.json({ code: 404, message: '服务器不存在', data: null }, { status: 404 });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) { updates.push('name = ?'); values.push(body.name.trim()); }
    if (body.ip_address !== undefined) { updates.push('ip_address = ?'); values.push(body.ip_address.trim()); }
    if (body.os_type !== undefined) { updates.push('os_type = ?'); values.push(body.os_type); }
    if (body.os_name !== undefined) { updates.push('os_name = ?'); values.push(body.os_name); }
    if (body.environment !== undefined) { updates.push('environment = ?'); values.push(body.environment); }
    if (body.ssh_port !== undefined) { updates.push('ssh_port = ?'); values.push(Number(body.ssh_port) || 22); }
    if (body.ssh_user !== undefined) { updates.push('ssh_user = ?'); values.push(body.ssh_user || 'root'); }
    if (body.ssh_password !== undefined) { updates.push('ssh_password = ?'); values.push(body.ssh_password || null); }
    if (body.ssh_key !== undefined) { updates.push('ssh_key = ?'); values.push(body.ssh_key || null); }
    if (body.vnc_port !== undefined) { updates.push('vnc_port = ?'); values.push(Number(body.vnc_port) || 5900); }
    if (body.vnc_password !== undefined) { updates.push('vnc_password = ?'); values.push(body.vnc_password || null); }
    if (body.tags !== undefined) { updates.push('tags = ?'); values.push(body.tags); }
    if (body.cpu_cores !== undefined) { updates.push('cpu_cores = ?'); values.push(body.cpu_cores); }
    if (body.memory_total !== undefined) { updates.push('memory_total = ?'); values.push(body.memory_total); }
    if (body.disk_total !== undefined) { updates.push('disk_total = ?'); values.push(body.disk_total); }

    if (updates.length === 0) {
      return NextResponse.json({ code: 400, message: '没有需要更新的字段', data: null }, { status: 400 });
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`UPDATE servers SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    return NextResponse.json({ code: 200, message: '更新成功', data: null });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ code: 500, message: msg, data: null }, { status: 500 });
  }
}

// DELETE /api/servers/[id] — 删除服务器
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = verifyToken(req.headers.get('authorization'));
    if (!payload) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }
    if (payload.role !== 'admin') {
      return NextResponse.json({ code: 403, message: '无权限', data: null }, { status: 403 });
    }

    const { id } = await params;
    const db = getDb();
    const server = db.prepare('SELECT id FROM servers WHERE id = ?').get(id);
    if (!server) {
      return NextResponse.json({ code: 404, message: '服务器不存在', data: null }, { status: 404 });
    }

    db.prepare('DELETE FROM servers WHERE id = ?').run(id);
    return NextResponse.json({ code: 200, message: '删除成功', data: null });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ code: 500, message: msg, data: null }, { status: 500 });
  }
}
