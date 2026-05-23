import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(process.cwd(), 'data', 'cloudops.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    // 确保 data 目录存在
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables(db);
    seedAdmin(db);
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
      FOREIGN KEY (parent_id) REFERENCES files(id) ON DELETE CASCADE,
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
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(team_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS team_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      file_id INTEGER NOT NULL,
      permission TEXT NOT NULL DEFAULT 'view',
      shared_by INTEGER NOT NULL,
      shared_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
      FOREIGN KEY (shared_by) REFERENCES users(id)
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
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
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
}

export default getDb;
