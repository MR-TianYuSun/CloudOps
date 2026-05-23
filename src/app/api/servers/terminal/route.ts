import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

/** GET /api/servers/terminal?serverId=X — 获取终端连接token */
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
    const server = db.prepare('SELECT id, name, ip_address, ssh_port, ssh_user, ssh_password, ssh_key FROM servers WHERE id = ?').get(Number(serverId)) as Record<string, unknown> | undefined;

    if (!server) {
      return NextResponse.json({ code: 404, message: '服务器不存在', data: null }, { status: 404 });
    }

    // Only admin can use terminal
    if (payload.role !== 'admin') {
      return NextResponse.json({ code: 403, message: '仅管理员可使用终端', data: null }, { status: 403 });
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        id: server.id,
        name: server.name,
        host: String(server.ip_address).split(':')[0],
        port: Number(server.ssh_port || 22),
        user: String(server.ssh_user || 'root'),
        hasPassword: !!server.ssh_password,
        hasKey: !!server.ssh_key,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '获取终端信息失败';
    return NextResponse.json({ code: 500, message: msg, data: null }, { status: 500 });
  }
}
