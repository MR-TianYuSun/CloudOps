import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const user = verifyToken(auth.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const db = getDb();

    // Total storage used by user
    const totalUsed = db.prepare(`
      SELECT COALESCE(SUM(size), 0) as total
      FROM files
      WHERE uploaded_by = ? AND deleted_at IS NULL
    `).get(user.userId) as { total: number };

    // Storage quota
    const userInfo = db.prepare('SELECT storage_quota FROM users WHERE id = ?').get(user.userId) as { storage_quota: number } | undefined;
    const quota = userInfo?.storage_quota || 0; // 0 = unlimited

    // By category
    const byCategory = db.prepare(`
      SELECT
        CASE
          WHEN mime_type LIKE 'image/%' THEN '图片'
          WHEN mime_type LIKE 'video/%' THEN '视频'
          WHEN mime_type LIKE 'audio/%' THEN '音频'
          WHEN mime_type LIKE 'application/pdf' THEN 'PDF'
          WHEN mime_type LIKE 'application/vnd.openxmlformats%' OR mime_type LIKE 'application/msword%' THEN '文档'
          WHEN mime_type LIKE 'application/vnd.ms-excel%' OR mime_type LIKE 'application/vnd.openxmlformats-officedocument.spreadsheetml%' THEN '表格'
          WHEN mime_type LIKE 'application/zip%' OR mime_type LIKE 'application/x-rar%' OR mime_type LIKE 'application/x-7z%' THEN '压缩包'
          WHEN mime_type LIKE 'text/%' THEN '代码/文本'
          ELSE '其他'
        END as category,
        COUNT(*) as count,
        SUM(size) as size
      FROM files
      WHERE uploaded_by = ? AND deleted_at IS NULL
      GROUP BY category
      ORDER BY size DESC
    `).all(user.userId);

    // By day (last 30 days)
    const byDay = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count, SUM(size) as size
      FROM files
      WHERE uploaded_by = ? AND deleted_at IS NULL AND created_at >= datetime('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(user.userId);

    // File count stats
    const totalFiles = db.prepare(`
      SELECT COUNT(*) as count FROM files WHERE uploaded_by = ? AND deleted_at IS NULL
    `).get(user.userId) as { count: number };

    const deletedFiles = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as size
      FROM files WHERE uploaded_by = ? AND deleted_at IS NOT NULL
    `).get(user.userId) as { count: number; size: number };

    const sharedFiles = db.prepare(`
      SELECT COUNT(*) as count FROM shares WHERE created_by = ?
    `).get(user.userId) as { count: number };

    return NextResponse.json({
      success: true,
      data: {
        totalUsed: totalUsed.total,
        quota,
        usagePercent: quota > 0 ? Math.round((totalUsed.total / quota) * 100) : 0,
        byCategory,
        byDay,
        totalFiles: totalFiles.count,
        deletedFiles: deletedFiles.count,
        deletedSize: deletedFiles.size,
        sharedFiles: sharedFiles.count,
      }
    });
  } catch (error) {
    console.error('获取存储分析失败:', error);
    return NextResponse.json({ error: '获取存储分析失败' }, { status: 500 });
  }
}
