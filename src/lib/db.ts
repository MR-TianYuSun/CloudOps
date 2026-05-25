import Database from 'better-sqlite3';
import path from 'path';
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync, readFileSync } from 'fs';
const { join } = path;
import bcrypt from 'bcryptjs';

// ═══════════════════════════════════════════════════════════
// 数据库路径 - 优先使用环境变量，防止部署覆盖时数据丢失
// 生产环境务必设置: DB_PATH=/data/cloudops/cloudops.db
// ═══════════════════════════════════════════════════════════
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'cloudops.db');

// ═══════════════════════════════════════════════════════════
// 上传文件存储路径 - 优先使用环境变量
// 生产环境务必设置: UPLOAD_DIR=/data/cloudops/uploads
// 也可通过管理员在系统设置中动态配置
// ═══════════════════════════════════════════════════════════
const DEFAULT_UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');

let db: Database.Database | null = null;
let dbInstance: InstanceType<typeof Database> | null = null;

/** 获取上传文件存储根路径（优先使用管理员在系统设置中配置的路径） */
export function getUploadDir(): string {
  try {
    const database = getDb();
    const setting = database.prepare("SELECT value FROM system_settings WHERE key = 'upload_dir'").get() as { value: string } | undefined;
    if (setting?.value && setting.value.trim() !== '' && existsSync(setting.value)) {
      return setting.value;
    }
  } catch {
    // 系统设置表可能尚未创建，使用默认路径
  }
  return DEFAULT_UPLOAD_DIR;
}

/**
 * 构建文件的虚拟路径（如 /Documents/Reports/test.txt）
 * @param db 数据库实例
 * @param name 文件或文件夹名称
 * @param parentId 父文件夹 ID，null 表示根目录
 */
export function buildFilePath(db: Database.Database, name: string, parentId: number | null): string {
  if (!parentId) {
    return `/${name}`;
  }
  const parent = db.prepare('SELECT path FROM files WHERE id = ?').get(parentId) as { path: string } | undefined;
  return parent ? `${parent.path}/${name}` : `/${name}`;
}

/**
 * 递归更新文件及其所有子项的 path 字段
 * @param db 数据库实例
 * @param fileId 起始文件/文件夹 ID
 */
export function updatePathRecursive(db: Database.Database, fileId: number): void {
  const file = db.prepare('SELECT id, name, parent_id, is_folder FROM files WHERE id = ?').get(fileId) as { id: number; name: string; parent_id: number | null; is_folder: number } | undefined;
  if (!file) return;

  const newPath = buildFilePath(db, file.name, file.parent_id);
  db.prepare('UPDATE files SET path = ? WHERE id = ?').run(newPath, file.id);

  // 如果是文件夹，递归更新所有子项（包括已删除的，以便恢复时路径正确）
  if (file.is_folder) {
    const children = db.prepare('SELECT id FROM files WHERE parent_id = ?').all(file.id) as { id: number }[];
    for (const child of children) {
      updatePathRecursive(db, child.id);
    }
  }
}

export function getDb(): Database.Database {
  if (!db) {
    // 确保数据库目录存在
    const dir = path.dirname(DB_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // 仅首次启动时创建备份（防止迁移失败导致数据丢失）
    // 使用文件锁防止多个 Next.js worker 重复备份
    // 注意：必须先打开数据库并checkpoint WAL，再进行备份
    let dbForBackup: Database.Database | null = null;
    try {
      if (existsSync(DB_PATH)) {
        dbForBackup = new Database(DB_PATH);
        dbForBackup.pragma('journal_mode = WAL');
        dbForBackup.pragma('busy_timeout = 5000');
        // 强制将WAL写入主数据库文件，确保备份完整性
        dbForBackup.pragma('wal_checkpoint(TRUNCATE)');
        
        const today = new Date().toISOString().slice(0, 10);
        const backupMarker = DB_PATH + '.lastbackup';
        let shouldBackup = true;
        if (existsSync(backupMarker)) {
          const lastBackup = readFileSync(backupMarker, 'utf-8').trim();
          if (lastBackup === today) shouldBackup = false;
        }
        if (shouldBackup) {
          const backupPath = DB_PATH + '.backup.' + today;
          // 使用SQLite内置的backup API（异步），确保数据完整性
          // 注意：backup() 是异步的，但我们不能在这里 await，因此使用回调方式
          dbForBackup!.backup(backupPath)
            .then(() => {
              writeFileSync(backupMarker, today);
              console.log(`[DB] Daily backup created: ${backupPath}`);
              // 只保留最近3个备份
              const backups = readdirSync(path.dirname(DB_PATH))
                .filter((f: string) => f.startsWith(path.basename(DB_PATH) + '.backup.'))
                .sort()
                .map((f: string) => join(path.dirname(DB_PATH), f));
              while (backups.length > 3) {
                unlinkSync(backups.shift()!);
              }
            })
            .catch((e: Error) => {
              console.error('[DB] Backup creation failed (non-fatal):', e);
            });
        }
      }
    } catch (e) {
      console.error('[DB] Backup creation failed (non-fatal):', e);
    } finally {
      if (dbForBackup) {
        try { dbForBackup.close(); } catch {}
      }
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    db.pragma('foreign_keys = ON');
    initTables(db);
    seedAdmin(db);

    // 每日备份已在上面的 backupDb 块中完成
  }
  return db;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      email TEXT UNIQUE,
      role TEXT NOT NULL DEFAULT 'user',
      status TEXT NOT NULL DEFAULT 'active',
      storage_quota INTEGER NOT NULL DEFAULT 53687091200,
      storage_used INTEGER NOT NULL DEFAULT 0,
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      parent_id INTEGER,
      is_folder INTEGER NOT NULL DEFAULT 0,
      size INTEGER NOT NULL DEFAULT 0,
      mime_type TEXT,
      file_ext TEXT,
      file_category TEXT,
      storage_path TEXT,
      uploaded_by INTEGER NOT NULL,
      owner_type TEXT NOT NULL DEFAULT 'personal',
      team_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (uploaded_by) REFERENCES users(id),
      FOREIGN KEY (parent_id) REFERENCES files(id) ON DELETE SET NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      os_type TEXT NOT NULL,
      os_name TEXT NOT NULL,
      environment TEXT NOT NULL DEFAULT 'development',
      tags TEXT,
      ssh_port INTEGER DEFAULT 22,
      ssh_user TEXT,
      status TEXT NOT NULL DEFAULT 'offline',
      cpu_cores INTEGER,
      memory_total INTEGER,
      disk_total INTEGER,
      owner_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS storage_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      os_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'offline',
      disk_total INTEGER NOT NULL DEFAULT 0,
      disk_used INTEGER NOT NULL DEFAULT 0,
      read_speed INTEGER,
      write_speed INTEGER,
      api_endpoint TEXT,
      node_token TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id INTEGER,
      detail TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      avatar_color TEXT NOT NULL DEFAULT '#7C5CFF',
      owner_id INTEGER NOT NULL,
      max_members INTEGER NOT NULL DEFAULT 20,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      status TEXT NOT NULL DEFAULT 'active',
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE(team_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS team_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      file_id INTEGER NOT NULL,
      permission TEXT NOT NULL DEFAULT 'view',
      shared_by INTEGER NOT NULL,
      shared_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL,
      FOREIGN KEY (shared_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL,
      share_code TEXT UNIQUE NOT NULL,
      password TEXT,
      max_downloads INTEGER DEFAULT 0,
      download_count INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS file_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      annotation TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS recent_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      file_id INTEGER NOT NULL,
      action TEXT NOT NULL DEFAULT 'view',
      accessed_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL,
      UNIQUE(user_id, file_id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      created_by INTEGER NOT NULL,
      last_edited_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (last_edited_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS download_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      filename TEXT NOT NULL,
      save_path TEXT,
      file_id INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      progress INTEGER NOT NULL DEFAULT 0,
      total_size INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      permissions TEXT NOT NULL DEFAULT 'read',
      last_used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS user_themes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      theme_name TEXT NOT NULL DEFAULT 'default',
      accent_color TEXT DEFAULT '#7C5CFF',
      wallpaper TEXT,
      font_size TEXT DEFAULT 'medium',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 迁移：如果旧表缺少列，则添加
  migrateColumn(db, 'files', 'owner_type', "TEXT NOT NULL DEFAULT 'personal'");
  migrateColumn(db, 'files', 'team_id', 'INTEGER');
  migrateColumn(db, 'files', 'deleted_at', 'TEXT');
  migrateColumn(db, 'files', 'original_parent_id', 'INTEGER');
  migrateColumn(db, 'servers', 'ssh_password', 'TEXT');
  migrateColumn(db, 'servers', 'ssh_key', 'TEXT');
  migrateColumn(db, 'servers', 'vnc_port', 'INTEGER DEFAULT 5900');
  migrateColumn(db, 'servers', 'vnc_password', 'TEXT');
  migrateColumn(db, 'files', 'is_encrypted', 'INTEGER NOT NULL DEFAULT 0');
  migrateColumn(db, 'files', 'encryption_iv', 'TEXT');
  migrateColumn(db, 'shares', 'share_code', 'TEXT');
  migrateColumn(db, 'shares', 'file_name', 'TEXT');
  migrateColumn(db, 'shares', 'file_size', 'INTEGER');
  migrateColumn(db, 'users', 'email', 'TEXT');

  // 数据迁移：更新已有文件的 file_category（xlsx/xls → spreadsheet, pptx/ppt → presentation）
  try {
    db.exec("UPDATE files SET file_category = 'spreadsheet' WHERE file_ext IN ('xlsx', 'xls') AND file_category = 'document'");
    db.exec("UPDATE files SET file_category = 'presentation' WHERE file_ext IN ('pptx', 'ppt') AND file_category = 'document'");
  } catch {
    // 忽略迁移错误
  }

  // 数据迁移：如果旧 shares 表有 code 列但没有 share_code 数据，将 code 复制到 share_code
  migrateSharesCode(db);
}

/** 迁移旧 shares 表的 code 列数据到 share_code 列 */
function migrateSharesCode(db: Database.Database) {
  try {
    // 检查是否存在旧的 code 列
    const tableInfo = db.prepare("PRAGMA table_info(shares)").all() as { name: string }[];
    const hasCodeColumn = tableInfo.some(col => col.name === 'code');
    const hasShareCodeColumn = tableInfo.some(col => col.name === 'share_code');

    if (hasCodeColumn && hasShareCodeColumn) {
      // 将旧 code 列的数据复制到 share_code（仅当 share_code 为空时）
      db.exec("UPDATE shares SET share_code = code WHERE share_code IS NULL AND code IS NOT NULL");
      console.log('[DB] Migrated shares.code → shares.share_code');
    }
  } catch (e) {
    console.error('[DB] Shares code migration error:', e);
  }
}

/** 安全地为已有表添加列（SQLite 不支持 IF NOT EXISTS ALTER COLUMN） */
function migrateColumn(db: Database.Database, table: string, column: string, definition: string) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch {
    // 列已存在，忽略错误
  }
}

function seedAdmin(db: Database.Database) {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!existing) {
    const passwordHash = bcrypt.hashSync('admin12345', 10);
    db.prepare(`
      INSERT INTO users (username, password_hash, display_name, role, status, storage_quota)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('admin', passwordHash, '管理员', 'admin', 'active', 0);
    console.log('[DB] Admin account created: admin / admin12345');
  }

  // 初始化系统设置默认值
  const defaultSettings: Record<string, string> = {
    upload_dir: DEFAULT_UPLOAD_DIR,
    allow_registration: 'true',
    require_approval: 'true',
    max_upload_size: '104857600',
    default_quota: '53687091200',
    system_name: 'CloudOps',
  };
  for (const [key, value] of Object.entries(defaultSettings)) {
    const existing = db.prepare("SELECT value FROM system_settings WHERE key = ?").get(key) as { value: string } | undefined;
    if (!existing) {
      db.prepare("INSERT INTO system_settings (key, value) VALUES (?, ?)").run(key, value);
    }
  }
  console.log('[DB] System settings initialized');
}

export default getDb;
