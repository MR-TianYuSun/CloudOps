import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET /api/stats — 仪表盘统计数据
export async function GET(req: NextRequest) {
  try {
    const payload = verifyToken(req.headers.get('authorization'));
    if (!payload) {
      return NextResponse.json({ code: 401, message: '未登录', data: null }, { status: 401 });
    }

    const db = getDb();

    // 服务器统计
    const serverStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online
      FROM servers
    `).get() as Record<string, unknown>;

    // 存储节点统计
    const nodeStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online,
        COALESCE(SUM(disk_total), 0) as disk_total,
        COALESCE(SUM(disk_used), 0) as disk_used
      FROM storage_nodes
    `).get() as Record<string, unknown>;

    // 文件统计
    const fileStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(size), 0) as total_size
      FROM files
      WHERE is_folder = 0
    `).get() as Record<string, unknown>;

    // 用户统计
    const userStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
      FROM users
    `).get() as Record<string, unknown>;

    // 团队统计
    const teamStats = db.prepare(`
      SELECT COUNT(*) as total FROM teams WHERE status = 'active'
    `).get() as Record<string, unknown>;

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        serverCount: Number(serverStats.total) || 0,
        serverOnline: Number(serverStats.online) || 0,
        nodeCount: Number(nodeStats.total) || 0,
        nodeOnline: Number(nodeStats.online) || 0,
        storageTotal: Number(nodeStats.disk_total) || 0,
        storageUsed: Number(nodeStats.disk_used) || 0,
        fileCount: Number(fileStats.total) || 0,
        fileTotalSize: Number(fileStats.total_size) || 0,
        userCount: Number(userStats.total) || 0,
        userActive: Number(userStats.active) || 0,
        teamCount: Number(teamStats.total) || 0,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ code: 500, message: msg, data: null }, { status: 500 });
  }
}
