import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

/** GET /api/servers/vnc?serverId=X — 获取VNC连接信息 */
export async function GET(req: NextRequest) {
  try {
    const payload = verifyToken(req.headers.get('authorization'));
    if (!payload) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }

    const serverId = req.nextUrl.searchParams.get('serverId');
    if (!serverId) {
      return NextResponse.json({ code: 400, message: '缺少serverId', data: null }, { status: 400 });
    }

    const db = getDb();
    const server = db.prepare('SELECT id, name, ip_address, vnc_port, vnc_password, os_type FROM servers WHERE id = ?').get(Number(serverId)) as Record<string, unknown> | undefined;

    if (!server) {
      return NextResponse.json({ code: 404, message: '服务器不存在', data: null }, { status: 404 });
    }

    // Only admin can use remote desktop
    if (payload.role !== 'admin') {
      return NextResponse.json({ code: 403, message: '仅管理员可使用远程桌面', data: null }, { status: 403 });
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        id: server.id,
        name: server.name,
        host: String(server.ip_address).split(':')[0],
        port: Number(server.vnc_port || 5900),
        password: server.vnc_password ? String(server.vnc_password) : null,
        hasPassword: !!server.vnc_password,
        osType: server.os_type,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '获取VNC信息失败';
    return NextResponse.json({ code: 500, message: msg, data: null }, { status: 500 });
  }
}
