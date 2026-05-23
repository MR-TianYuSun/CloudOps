import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDb } from '@/lib/db';
import * as net from 'net';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || new URL(request.url).searchParams.get('token');
    const payload = verifyToken(token || null);
    if (!payload) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }

    const url = new URL(request.url);
    const serverId = url.searchParams.get('serverId');
    if (!serverId) {
      return NextResponse.json({ code: 400, message: '缺少serverId', data: null }, { status: 400 });
    }

    const db = getDb();
    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(Number(serverId)) as Record<string, unknown> | undefined;
    if (!server) {
      return NextResponse.json({ code: 404, message: '服务器不存在', data: null }, { status: 404 });
    }

    const host = String(server.ip_address || '').split(':')[0];
    const osType = String(server.os_type || 'linux').toLowerCase();
    const checkPort = osType === 'windows'
      ? Number(server.vnc_port || 5900)
      : Number(server.ssh_port || 22);

    // Try to connect to check port availability
    const isOnline = await new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      const timeout = 5000;

      socket.setTimeout(timeout);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(checkPort, host);
    });

    // Update server status
    const newStatus = isOnline ? 'online' : 'offline';
    db.prepare("UPDATE servers SET status = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, Number(serverId));

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: { id: Number(serverId), status: newStatus, host, checkedPort: checkPort },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ code: 500, message: msg, data: null }, { status: 500 });
  }
}
