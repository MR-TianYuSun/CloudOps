# CloudOps 技术架构文档

> 个人小团队云盘 & 服务器管理一体化系统 — 技术实现详解

---

## 目录

1. [系统架构](#1-系统架构)
2. [技术栈](#2-技术栈)
3. [数据库设计](#3-数据库设计)
4. [认证系统](#4-认证系统)
5. [文件系统](#5-文件系统)
6. [文件预览引擎](#6-文件预览引擎)
7. [外链分享机制](#7-外链分享机制)
8. [回收站与软删除](#8-回收站与软删除)
9. [服务器远程连接](#9-服务器远程连接)
10. [团队协作](#10-团队协作)
11. [WebSocket 架构](#11-websocket-架构)
12. [前端架构](#12-前端架构)
13. [API 接口文档](#13-api-接口文档)
14. [安全设计](#14-安全设计)
15. [部署指南](#15-部署指南)
16. [开发规范](#16-开发规范)

---

## 1. 系统架构

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐│
│  │ React 19 │  │shadcn/ui │  │ xterm.js │  │    noVNC RFB     ││
│  │ Next 16  │  │Tailwind 4│  │  SSH终端  │  │  VNC远程桌面     ││
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬──────────┘│
│       │             │             │                 │            │
├───────┴─────────────┴─────────────┴─────────────────┴────────────┤
│                     HTTP / WebSocket                              │
├──────────────────────────┬───────────────────────────────────────┤
│     Next.js App Router   │      Custom Server (server.ts)        │
│     ┌──────────────┐     │      ┌───────────────┐                │
│     │  API Routes  │     │      │ WS /ws/terminal│──→ ssh2 ──→ SSH Server│
│     │  (30+ APIs)  │     │      │ WS /ws/vnc     │──→ net.Socket ──→ VNC Server│
│     └──────┬───────┘     │      └───────────────┘                │
│            │              │                                       │
├────────────┴──────────────┴───────────────────────────────────────┤
│                       Business Logic                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │   Auth   │  │  Files   │  │  Shares  │  │  Teams   │         │
│  │  JWT     │  │ Upload   │  │  Code    │  │ Members  │         │
│  │  bcrypt  │  │ Download │  │ Password │  │ Files    │         │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │
├──────────────────────────────────────────────────────────────────┤
│                     Data & Storage                                │
│  ┌──────────────────┐  ┌──────────────────┐                      │
│  │ SQLite (WAL)     │  │ File System      │                      │
│  │ better-sqlite3   │  │ data/uploads/    │                      │
│  │ Auto Migration   │  │ Hash Dedup       │                      │
│  └──────────────────┘  └──────────────────┘                      │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 请求生命周期

**HTTP 请求：**
```
Browser → Next.js App Router → Route Handler → DB/File → JSON Response
```

**SSH 终端请求：**
```
Browser (xterm.js) → WebSocket /ws/terminal → server.ts → ssh2 Client → SSH Server
```

**VNC 远程桌面请求：**
```
Browser (noVNC RFB) → WebSocket /ws/vnc → server.ts → net.Socket → VNC Server (5900)
```

### 1.3 自定义服务器

项目通过 `src/server.ts` 自定义 Next.js 服务器，在标准 HTTP 服务器基础上叠加 WebSocket 能力：

```typescript
// server.ts 核心结构
const server = next({ dev, hostname, port });
const handle = server.getRequestHandler();

server.prepare().then(() => {
  const httpServer = createServer(handler);   // HTTP 请求 → Next.js
  registerWSHandlers(httpServer);             // WebSocket 升级 → 自定义处理
  httpServer.listen(5000);
});
```

---

## 2. 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **框架** | Next.js | 16 | App Router, RSC, API Routes |
| **核心** | React | 19 | Concurrent Features, Server Components |
| **语言** | TypeScript | 5 | strict mode |
| **UI 组件** | shadcn/ui | latest | Radix UI 基础，可定制 |
| **样式** | Tailwind CSS | 4 | 原子化 CSS, @theme 变量 |
| **数据库** | SQLite | 3 | better-sqlite3 绑定, WAL 模式 |
| **认证** | jsonwebtoken | 9 | HS256, 24h 有效期 |
| **密码** | bcryptjs | 2 | 自适应哈希, saltRounds=10 |
| **SSH** | ssh2 | 1 | 纯 Node.js SSH2 客户端/服务器 |
| **终端** | @xterm/xterm | 5 | 浏览器终端模拟器 |
| **VNC** | @novnc/novnc | 1 | HTML5 VNC 客户端 (RFB 协议) |
| **WebSocket** | ws | 8 | 轻量 WebSocket 库, noServer 模式 |
| **PDF 预览** | pdfjs-dist | 4 | PDF.js 渲染引擎 |
| **Word 预览** | docx-preview | 0.3 | DOCX 文件渲染 |
| **Excel 预览** | xlsx | 0.18 | SheetJS 电子表格解析 |
| **Markdown** | react-markdown | 9 | Markdown 渲染 |

---

## 3. 数据库设计

### 3.1 ER 关系图

```
users ──1:N── files (uploaded_by)
users ──1:N── shares (created_by)
users ──N:M── teams (via team_members)
teams ──1:N── files (team_id)
files ──1:N── files (parent_id, 自引用)
files ──1:N── shares (file_id)
servers (独立实体)
operation_logs (独立实体)
```

### 3.2 表结构

#### users — 用户表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 用户 ID |
| username | TEXT | UNIQUE, NOT NULL | 用户名 |
| password | TEXT | NOT NULL | bcrypt 哈希密码 |
| display_name | TEXT | | 显示名称 |
| role | TEXT | DEFAULT 'user' | 角色: admin / user |
| status | TEXT | DEFAULT 'active' | 状态: active / disabled |
| storage_quota | INTEGER | DEFAULT 1073741824 | 存储配额 (字节, 默认1GB) |
| storage_used | INTEGER | DEFAULT 0 | 已用存储 (字节) |
| last_login_at | TEXT | | 最后登录时间 |
| created_at | TEXT | DEFAULT now | 创建时间 |
| updated_at | TEXT | DEFAULT now | 更新时间 |

#### files — 文件表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 文件 ID |
| name | TEXT | NOT NULL | 文件名 |
| path | TEXT | | 完整路径 |
| size | INTEGER | DEFAULT 0 | 文件大小 (字节) |
| mime_type | TEXT | | MIME 类型 |
| file_hash | TEXT | | 内容哈希 (去重用) |
| storage_path | TEXT | | 磁盘存储路径 |
| parent_id | INTEGER | FK→files.id, NULLABLE | 父目录 ID (NULL=根目录) |
| owner_type | TEXT | DEFAULT 'user' | 所有者类型: user / team |
| uploaded_by | INTEGER | FK→users.id | 上传者 |
| team_id | INTEGER | FK→teams.id, NULLABLE | 所属团队 |
| is_folder | INTEGER | DEFAULT 0 | 是否文件夹 |
| deleted_at | TEXT | NULLABLE | 软删除时间 |
| original_parent_id | INTEGER | NULLABLE | 删除前的父目录 (恢复用) |
| created_at | TEXT | DEFAULT now | 创建时间 |
| updated_at | TEXT | DEFAULT now | 更新时间 |

#### shares — 分享表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 分享 ID |
| code | TEXT | UNIQUE, NOT NULL | 8位随机分享码 |
| file_id | INTEGER | FK→files.id | 关联文件 |
| file_name | TEXT | NOT NULL | 文件名 (冗余，防删后无显示) |
| file_size | INTEGER | | 文件大小 (冗余) |
| created_by | INTEGER | FK→users.id | 创建者 |
| password | TEXT | NULLABLE | 访问密码 (bcrypt) |
| expires_at | TEXT | NULLABLE | 过期时间 (NULL=永久) |
| max_downloads | INTEGER | DEFAULT 0 | 最大下载次数 (0=无限) |
| download_count | INTEGER | DEFAULT 0 | 已下载次数 |
| created_at | TEXT | DEFAULT now | 创建时间 |

#### servers — 服务器表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 服务器 ID |
| name | TEXT | NOT NULL | 服务器名称 |
| ip_address | TEXT | NOT NULL | IP 地址 |
| os_type | TEXT | | 操作系统: linux / windows |
| os_name | TEXT | | 操作系统全名 |
| environment | TEXT | | 环境: development / staging / production |
| tags | TEXT | | 自定义标签 (逗号分隔) |
| ssh_port | INTEGER | DEFAULT 22 | SSH 端口 |
| ssh_user | TEXT | | SSH 用户名 |
| ssh_password | TEXT | NULLABLE | SSH 密码 (加密存储) |
| ssh_key | TEXT | NULLABLE | SSH 私钥 |
| vnc_port | INTEGER | DEFAULT 5900 | VNC 端口 |
| vnc_password | TEXT | NULLABLE | VNC 密码 |
| status | TEXT | DEFAULT 'offline' | 状态: online / offline |
| cpu_cores | INTEGER | | CPU 核心数 |
| memory_total | INTEGER | | 内存大小 (GB) |
| disk_total | INTEGER | | 硬盘大小 (GB) |
| created_at | TEXT | DEFAULT now | 创建时间 |
| updated_at | TEXT | DEFAULT now | 更新时间 |

#### teams — 团队表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 团队 ID |
| name | TEXT | NOT NULL | 团队名称 |
| description | TEXT | | 团队描述 |
| color | TEXT | | 标识颜色 |
| created_by | INTEGER | FK→users.id | 创建者 |
| created_at | TEXT | DEFAULT now | 创建时间 |
| updated_at | TEXT | DEFAULT now | 更新时间 |

#### team_members — 团队成员表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 成员 ID |
| team_id | INTEGER | FK→teams.id | 团队 ID |
| user_id | INTEGER | FK→users.id | 用户 ID |
| role | TEXT | DEFAULT 'member' | 角色: owner / admin / member |
| joined_at | TEXT | DEFAULT now | 加入时间 |

#### operation_logs — 操作日志表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 日志 ID |
| user_id | INTEGER | FK→users.id | 操作用户 |
| action | TEXT | NOT NULL | 操作类型 |
| target_type | TEXT | | 操作对象类型 |
| target_id | INTEGER | | 操作对象 ID |
| details | TEXT | | 操作详情 (JSON) |
| ip_address | TEXT | | 来源 IP |
| created_at | TEXT | DEFAULT now | 操作时间 |

#### storage_nodes — 存储节点表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTO | 节点 ID |
| name | TEXT | NOT NULL | 节点名称 |
| type | TEXT | DEFAULT 'local' | 存储类型 |
| path | TEXT | | 存储路径 |
| total_space | INTEGER | | 总空间 |
| used_space | INTEGER | DEFAULT 0 | 已用空间 |
| status | TEXT | DEFAULT 'active' | 节点状态 |
| created_at | TEXT | DEFAULT now | 创建时间 |

### 3.3 自动迁移机制

数据库启动时自动检测并执行 schema 迁移，无需手动执行 SQL：

```typescript
// db.ts 自动迁移逻辑
function runMigrations(db: Database) {
  // 1. 检测表是否存在 → 不存在则创建
  // 2. 检测列是否存在 → 不存在则 ALTER TABLE ADD COLUMN
  // 3. 新增表 (shares) → 自动创建
  // 4. 新增字段 (deleted_at, vnc_password 等) → 自动添加
}
```

支持的迁移类型：
- 新增表
- 新增列 (ALTER TABLE ADD COLUMN)
- 新增索引 (CREATE INDEX IF NOT EXISTS)

不支持：列类型修改、列删除、表重命名（需手动处理或重建数据库）。

### 3.4 SQLite 优化

```typescript
// WAL 模式 — 允许并发读写
db.pragma('journal_mode = WAL');

// 外键约束 — 保证数据完整性
db.pragma('foreign_keys = ON');

// 忙等待 — 写冲突时等待而非报错
db.pragma('busy_timeout = 5000');
```

---

## 4. 认证系统

### 4.1 认证流程

```
┌────────┐    POST /api/auth/login     ┌────────┐
│        │ ──────────────────────────→  │        │
│ Client │    { username, password }    │ Server │
│        │                              │        │
│        │  ←────────────────────────── │        │
│        │    { token, user }           │        │
└────────┘                              └────────┘
     │                                       │
     │  后续请求携带 Authorization           │
     │  Bearer <token>                       │
     └──────────────────────────────────────→│
```

### 4.2 JWT 结构

```json
{
  "userId": 1,
  "username": "admin",
  "role": "admin",
  "iat": 1716441600,
  "exp": 1716528000
}
```

- 算法：HS256
- 有效期：24小时
- 密钥：`JWT_SECRET` 环境变量

### 4.3 Token 传递方式

| 方式 | 格式 | 适用场景 |
|------|------|----------|
| Authorization Header | `Authorization: Bearer <token>` | API 请求、WebSocket 连接 |
| Query Parameter | `?token=<token>` | 文件下载/预览（浏览器无法设置 Header） |

### 4.4 权限控制

```typescript
// 管理员权限检查
if (payload.role !== 'admin') {
  return Response.json({ code: 403, message: '权限不足' }, { status: 403 });
}

// 资源所有者 + 管理员权限
if (Number(file.uploaded_by) !== payload.userId && payload.role !== 'admin') {
  return Response.json({ code: 403, message: '无权操作' }, { status: 403 });
}
```

---

## 5. 文件系统

### 5.1 文件分类

10大分类，覆盖 100+ 文件后缀：

| 分类 | 标识 | 常见后缀 |
|------|------|----------|
| 文档 | document | .pdf, .doc, .docx, .ppt, .pptx, .xls, .xlsx, .txt, .md |
| 图片 | image | .jpg, .png, .gif, .svg, .webp, .bmp, .ico |
| 音频 | audio | .mp3, .wav, .flac, .aac, .ogg |
| 视频 | video | .mp4, .mkv, .avi, .mov, .wmv |
| 代码 | code | .js, .ts, .py, .java, .go, .html, .css, .json |
| 压缩包 | archive | .zip, .rar, .7z, .tar, .gz |
| 数据 | data | .csv, .sql, .db, .xml |
| 可执行 | executable | .exe, .msi, .dmg, .deb, .rpm |
| 设计 | design | .psd, .ai, .sketch, .fig, .xd |
| 字体 | font | .ttf, .otf, .woff, .woff2 |

### 5.2 存储结构

```
data/uploads/
├── ab/
│   └── abc123def456...    # 文件按内容哈希存储
├── cd/
│   └── cde789fgh012...    # 相同内容的文件只存一份 (去重)
└── ...
```

- 文件名 = SHA-256 哈希值
- 取哈希前2位作为子目录，避免单目录文件过多
- 相同内容的文件共享同一存储路径（哈希去重）
- 数据库 `file_hash` 字段记录哈希，`storage_path` 记录实际磁盘路径

### 5.3 上传流程

```
Client → POST /api/files/upload (multipart/form-data)
  → 计算 file_hash (SHA-256)
  → 检查哈希是否已存在 (秒传)
  → 不存在则写入 data/uploads/<hash[:2]>/<hash>
  → INSERT INTO files
  → UPDATE users SET storage_used += size
  → Return { id, name, size, ... }
```

### 5.4 下载流程

```
Client → GET /api/files/download?id=X&token=Y
  → 验证 token
  → 管理员：全权限；普通用户：仅自己的文件
  → 读取 storage_path
  → 设置 Content-Disposition: attachment
  → Stream 文件内容
```

---

## 6. 文件预览引擎

### 6.1 支持格式

| 格式 | 组件 | 技术方案 |
|------|------|----------|
| PDF | PdfViewer | pdfjs-dist 渲染，Worker 线程解析 |
| Word (.docx) | DocxViewer | docx-preview 渲染 |
| PowerPoint (.pptx) | PptxViewer | JSZip 解压 + 幻灯片图片渲染 |
| Excel (.xlsx/.csv) | ExcelViewer | SheetJS 解析 + HTML 表格渲染 |
| 图片 | ImageViewer | fetch+blob+createObjectURL (支持认证) |
| Markdown | MarkdownViewer | react-markdown + 代码高亮 |
| HTML | HtmlViewer | iframe 沙箱渲染 |
| CSS | CssViewer | Prism.js 语法高亮 |
| 纯文本/代码 | TextViewer | 等宽字体 + 行号显示 |

### 6.2 认证方案

文件预览和下载需要 JWT 认证，但 `<img>` / `<iframe>` 等浏览器元素无法设置 HTTP Header。解决方案：

```
预览 URL: /api/files/preview?id=X&token=<jwt>
下载 URL: /api/files/download?id=X&token=<jwt>
```

API 路由优先从 `Authorization` Header 读取 token，若不存在则从 `query.token` 读取。

### 6.3 PDF.js Worker 配置

```typescript
// PdfViewer.tsx
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
```

Worker 文件放在 `public/pdf.worker.min.mjs`，作为静态资源直接加载，避免 webpack/turbopack 打包问题。

---

## 7. 外链分享机制

### 7.1 分享流程

```
用户选择文件 → 点击"分享" → 设置有效期/密码/下载次数
  → POST /api/shares { fileId, expiresIn, password, maxDownloads }
  → 生成8位随机分享码
  → 存入 shares 表
  → 返回分享链接: https://domain/s/<code>
```

### 7.2 分享码生成

```typescript
// 8位随机十六进制字符串
const shareCode = crypto.randomBytes(4).toString('hex');
// 示例: "d30b19bb"
```

### 7.3 访问控制

| 检查项 | 逻辑 |
|--------|------|
| 分享码存在 | `SELECT * FROM shares WHERE code = ?` |
| 文件未删除 | `SELECT deleted_at FROM files WHERE id = ?` — deleted_at 为空才允许访问 |
| 未过期 | `expires_at IS NULL OR expires_at > datetime('now')` |
| 下载次数 | `max_downloads = 0 OR download_count < max_downloads` |
| 密码验证 | POST 请求携带 password，bcrypt 比对 |

### 7.4 分享页面

- 路由：`/s/[code]` — 公开页面，无需登录
- 支持密码输入弹窗
- 显示文件名、大小、类型、上传时间
- 一键下载按钮
- 文件已删除/已过期友好提示

---

## 8. 回收站与软删除

### 8.1 软删除流程

```
用户删除文件 → 设置 deleted_at = datetime('now')
                保存 original_parent_id = parent_id
                子文件递归软删除
```

### 8.2 恢复流程

```
用户恢复文件 → 清空 deleted_at = NULL
               恢复 parent_id = original_parent_id
               子文件递归恢复
```

### 8.3 彻底删除

```
回收站中再次删除 → 物理删除数据库记录
                   删除磁盘文件 (若无其他引用)
                   递归删除子文件
```

### 8.4 自动清理

30天前软删除的文件会被自动清理（可扩展为定时任务）。

---

## 9. 服务器远程连接

### 9.1 SSH 终端（Linux）

**架构：**
```
Browser (xterm.js) ←WebSocket→ server.ts (/ws/terminal) ←ssh2→ SSH Server
```

**连接流程：**
1. 前端建立 WebSocket 连接 `/ws/terminal?serverId=X&token=JWT`
2. server.ts 从数据库读取 SSH 配置（host, port, user, password/key）
3. 使用 ssh2 库建立 SSH 连接
4. 双向数据转发：xterm 输入 → WS → ssh2 stdin → SSH Server → ssh2 stdout → WS → xterm 显示
5. 连接成功自动更新 `servers.status = 'online'`

**关键实现：**
```typescript
// server.ts - SSH 连接处理
wssTerminal.on('connection', (ws, req) => {
  const sshClient = new Client();
  sshClient.connect({ host, port, username, password/privateKey });
  sshClient.on('ready', () => {
    sshClient.shell({ rows: 24, cols: 80 }, (err, stream) => {
      ws.on('message', (data) => stream.write(data));  // 浏览器→服务器
      stream.on('data', (data) => ws.send(data));      // 服务器→浏览器
    });
  });
});
```

### 9.2 VNC 远程桌面（Windows）

**架构：**
```
Browser (noVNC RFB) ←WebSocket→ server.ts (/ws/vnc) ←net.Socket→ VNC Server (5900)
```

**连接流程：**
1. 前端加载 noVNC RFB 模块（从 `/novnc-rfb.js` 预打包文件加载）
2. noVNC 建立 WebSocket 连接 `/ws/vnc?serverId=X&token=JWT`
3. server.ts 从数据库读取 VNC 配置（host, vnc_port, vnc_password）
4. 建立 TCP 连接到 VNC 服务器
5. 透明转发 VNC/RFB 协议数据（WebSocket ↔ TCP Socket）
6. 连接成功自动更新 `servers.status = 'online'`

**关键实现：**
```typescript
// server.ts - VNC 代理
wssVnc.on('connection', (ws, req) => {
  const vncSocket = new net.Socket();
  vncSocket.connect(vncPort, host, () => { /* 连接成功 */ });
  ws.on('message', (data) => vncSocket.write(data));  // 浏览器→VNC
  vncSocket.on('data', (data) => ws.send(data));      // VNC→浏览器
});
```

### 9.3 智能连接选择

| OS 类型 | 主连接方式 | 备选方式 |
|---------|-----------|----------|
| Linux | SSH 终端 | VNC 远程桌面 |
| Windows | VNC 远程桌面 | SSH 终端 (需安装 OpenSSH) |

### 9.4 服务器在线检测

```typescript
// /api/servers/ping - 端口探测
// Windows → 检测 VNC 端口 (5900)
// Linux   → 检测 SSH 端口 (22)
// 可达 → UPDATE servers SET status = 'online'
// 不可达 → UPDATE servers SET status = 'offline'
```

---

## 10. 团队协作

### 10.1 数据模型

```
Team (1) ──── (N) TeamMember (N) ──── (1) User
  │
  └── (1) ── (N) File (owner_type='team', team_id=X)
```

### 10.2 团队文件空间

- 创建团队时自动在 files 表创建团队根文件夹 (`is_folder=1, owner_type='team'`)
- 团队成员可以在团队文件空间上传、下载文件
- 非团队成员无法访问团队文件

### 10.3 成员角色

| 角色 | 权限 |
|------|------|
| owner | 管理团队、管理成员、管理文件、删除团队 |
| admin | 管理成员、管理文件 |
| member | 上传文件、下载文件 |

---

## 11. WebSocket 架构

### 11.1 端点

| 路径 | 协议 | 用途 |
|------|------|------|
| `/ws/terminal` | WebSocket | SSH 终端连接 |
| `/ws/vnc` | WebSocket | VNC 远程桌面连接 |

### 11.2 认证

WebSocket 连接通过 query 参数传递 JWT token：

```
ws://host:5000/ws/terminal?serverId=1&token=eyJhbGci...
ws://host:5000/ws/vnc?serverId=1&token=eyJhbGci...
```

server.ts 在 `connection` 事件中验证 token，失败则关闭连接。

### 11.3 心跳机制

```typescript
// SSH 终端 — 依赖 ssh2 keepalive
sshClient.on('end', () => ws.close());

// VNC — 依赖 TCP socket 状态
vncSocket.on('close', () => ws.close());
```

---

## 12. 前端架构

### 12.1 页面路由

| 路由 | 页面 | 认证 |
|------|------|------|
| `/login` | 登录 | 无 |
| `/register` | 注册 | 无 |
| `/dashboard` | 仪表盘 | 需要 |
| `/cloud-drive` | 云盘 | 需要 |
| `/servers` | 服务器管理 | 需要 |
| `/teams` | 团队列表 | 需要 |
| `/teams/[id]` | 团队详情 | 需要 |
| `/users` | 用户管理 | 管理员 |
| `/settings` | 系统设置 | 需要 |
| `/s/[code]` | 分享页面 | 无 |

### 12.2 组件架构

```
components/
├── layout/
│   └── MainLayout.tsx          # 主布局（侧边栏+顶栏+内容区）
├── file-preview/
│   ├── FilePreview.tsx         # 预览入口（根据类型分发）
│   ├── PdfViewer.tsx           # PDF 预览
│   ├── DocxViewer.tsx          # Word 预览
│   ├── PptxViewer.tsx          # PPT 预览
│   ├── ExcelViewer.tsx         # Excel 预览
│   ├── ImageViewer.tsx         # 图片预览
│   ├── MarkdownViewer.tsx      # Markdown 预览
│   ├── HtmlViewer.tsx          # HTML 预览
│   ├── CssViewer.tsx           # CSS 预览
│   └── TextViewer.tsx          # 文本/代码预览
├── remote-desktop/
│   └── VncViewer.tsx           # VNC 远程桌面查看器
└── ui/                         # shadcn/ui 组件库
    ├── button.tsx
    ├── input.tsx
    ├── dialog.tsx
    ├── dropdown-menu.tsx
    ├── card.tsx
    └── ... (20+ 组件)
```

### 12.3 设计系统

**主题：毛玻璃暗色 (Glassmorphism Dark)**

```css
/* globals.css - 设计变量 */
--color-background: #070A14;      /* 深色背景 */
--color-primary: #7C5CFF;         /* 主色（紫色） */
--color-accent: #69E7FF;          /* 强调色（青色） */
--color-success: #62FAD3;         /* 成功色（绿色） */
--color-foreground: #F7FAFF;      /* 主文本 */
--color-muted-foreground: #9AA7C7;/* 次文本 */
```

**视觉特征：**
- 毛玻璃卡片 (`backdrop-blur-xl bg-white/5`)
- 悬浮发光效果 (`shadow-lg shadow-primary/10`)
- 柔和圆角 (`rounded-xl`)
- 渐变 CTA 按钮
- 背景渐变缓慢漂移动效

### 12.4 移动端适配

| 断点 | 策略 |
|------|------|
| `<640px` (sm以下) | 侧边栏折叠为汉堡菜单，表格转卡片，操作按钮常驻 |
| `640-768px` (sm) | 侧边栏可展开，紧凑布局 |
| `768-1024px` (md) | 侧边栏固定，标准布局 |
| `>1024px` (lg) | 宽屏优化，多列布局 |

---

## 13. API 接口文档

### 13.1 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/register` | 用户注册 |
| GET | `/api/auth/me` | 获取当前用户信息 |

### 13.2 文件接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/files` | 文件列表 |
| POST | `/api/files/upload` | 文件上传 (multipart) |
| GET | `/api/files/download` | 文件下载 (?id=X&token=Y) |
| GET | `/api/files/preview` | 文件预览 (?id=X&token=Y) |
| POST | `/api/files/mkdir` | 创建文件夹 |
| POST | `/api/files/rename` | 重命名 |
| POST | `/api/files/move` | 移动/复制 |
| GET | `/api/files/search` | 搜索 |
| GET | `/api/files/trash` | 回收站列表 |
| DELETE | `/api/files/trash` | 清空回收站 |
| DELETE | `/api/files/[id]/delete` | 删除文件 (?permanent=1 彻底删除) |
| POST | `/api/files/[id]/restore` | 恢复文件 |

### 13.3 分享接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/shares` | 创建分享链接 |
| GET | `/api/shares/[code]` | 获取分享信息 (公开) |
| POST | `/api/shares/[code]/download` | 下载分享文件 |

### 13.4 服务器接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/servers` | 服务器列表 |
| POST | `/api/servers` | 添加服务器 |
| GET | `/api/servers/[id]` | 服务器详情 |
| PATCH | `/api/servers/[id]` | 更新服务器 |
| DELETE | `/api/servers/[id]` | 删除服务器 |
| GET | `/api/servers/ping` | 检测服务器在线状态 |
| GET | `/api/servers/terminal` | 获取 SSH 连接信息 |
| GET | `/api/servers/vnc` | 获取 VNC 连接信息 |

### 13.5 团队接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/teams` | 团队列表 |
| POST | `/api/teams` | 创建团队 |
| GET | `/api/teams/[id]` | 团队详情 |
| DELETE | `/api/teams/[id]` | 删除团队 |
| GET | `/api/teams/[id]/members` | 成员列表 |
| POST | `/api/teams/[id]/members` | 添加成员 |
| POST | `/api/teams/[id]/join` | 加入团队 |
| POST | `/api/teams/[id]/leave` | 退出团队 |
| POST | `/api/teams/[id]/invite` | 邀请成员 |
| GET/POST | `/api/teams/[id]/files` | 团队文件列表/上传 |

### 13.6 用户接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/users` | 用户列表 |

### 13.7 统计接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stats` | 仪表盘统计数据 |

### 13.8 统一响应格式

```typescript
// 成功响应
{ "code": 200, "message": "操作成功", "data": { ... } }

// 错误响应
{ "code": 400/401/403/404/500, "message": "错误描述", "data": null }
```

---

## 14. 安全设计

### 14.1 认证安全

- 密码存储：bcryptjs 哈希，saltRounds=10，抗彩虹表和暴力破解
- JWT 密钥：生产环境必须通过 `JWT_SECRET` 环境变量设置强随机密钥
- Token 有效期：24小时，过期需重新登录
- Token 传递：优先使用 Authorization Header，Query Parameter 仅用于浏览器无法设置 Header 的场景（文件下载/预览）

### 14.2 文件安全

- 下载/预览需认证，管理员全权限，普通用户仅访问自己的文件
- 分享链接独立于用户认证，受密码/过期/次数限制
- 已删除文件无法通过分享链接访问

### 14.3 输入校验

- SQL 注入防护：better-sqlite3 使用参数化查询 (`?` 占位符)
- XSS 防护：React 自动转义 HTML，HTML 预览使用 iframe sandbox
- CSRF 防护：JWT Bearer Token 认证，不依赖 Cookie

### 14.4 服务器连接安全

- SSH 密码/私钥存储在 SQLite 数据库中
- API 响应中密码统一掩码为 `••••••`
- WebSocket 连接需 JWT 认证
- VNC 密码通过单独 API 获取，不在列表接口中暴露

---

## 15. 部署指南

### 15.1 开发环境

```bash
pnpm install
pnpm dev        # 启动开发服务器 (端口 5000, 热更新)
```

### 15.2 生产环境

```bash
pnpm install
pnpm build      # 构建 (Next.js + server.ts + noVNC打包)
pnpm start      # 启动生产服务器
```

### 15.3 环境变量

| 变量 | 必需 | 说明 | 默认值 |
|------|------|------|--------|
| `JWT_SECRET` | 是 | JWT 签名密钥 | 内置默认值 (生产必须修改) |
| `PORT` | 否 | HTTP 监听端口 | 5000 |
| `DEPLOY_RUN_PORT` | 否 | 沙箱环境端口覆盖 | - |

### 15.4 数据备份

```bash
# SQLite 数据库备份 (安全方式，不锁表)
sqlite3 data/cloudops.db ".backup 'backup.db'"

# 文件存储备份
tar -czf uploads-backup.tar.gz data/uploads/
```

### 15.5 构建产物

```
构建流程:
1. pnpm install                          # 安装依赖
2. npx esbuild novnc → public/novnc-rfb.js  # 打包 noVNC RFB 模块
3. npx tsup server.ts → dist/server.js   # 编译自定义服务器
4. next build                            # 构建前端
```

---

## 16. 开发规范

### 16.1 代码风格

- TypeScript strict 模式，禁止隐式 any
- 优先复用当前作用域已声明的变量、函数、类型
- 函数参数、返回值必须有明确类型标注
- 禁止未使用的变量和导入

### 16.2 组件规范

- 使用 shadcn/ui 组件，不使用其他 UI 库
- 样式使用 Tailwind 语义化变量 (`bg-background`, `text-foreground`)，禁止硬编码颜色
- 圆角使用 `rounded-md/lg/xl`，禁止写死像素值
- 客户端组件标记 `'use client'`，动态数据使用 useEffect + useState

### 16.3 API 规范

- 统一响应格式 `{ code, message, data }`
- 认证通过 `verifyToken(authHeader)` 统一处理
- 管理员权限检查 `payload.role === 'admin'`
- 资源所有者 + 管理员权限双重检查

### 16.4 Git 规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
refactor: 代码重构
chore: 构建/配置变更
```

---

## 附录

### A. 文件预览类型映射

| 后缀 | PreviewType | 组件 |
|------|-------------|------|
| .pdf | pdf | PdfViewer |
| .docx | docx | DocxViewer |
| .pptx | pptx | PptxViewer |
| .xlsx, .xls, .csv | excel | ExcelViewer |
| .jpg, .png, .gif, .webp, .svg, .bmp | image | ImageViewer |
| .md | markdown | MarkdownViewer |
| .html, .htm | html | HtmlViewer |
| .css, .scss, .less | css | CssViewer |
| .js, .ts, .py, .java, .go, .json, .txt, .xml, .yaml, .sh | text | TextViewer |
| 其他 | none | 不支持预览，仅下载 |

### B. HTTP 状态码约定

| 状态码 | 含义 | 场景 |
|--------|------|------|
| 200 | 成功 | 请求处理成功 |
| 400 | 请求错误 | 参数缺失/无效 |
| 401 | 未认证 | 未登录或 token 过期 |
| 403 | 权限不足 | 无操作权限 |
| 404 | 未找到 | 资源不存在 |
| 410 | 已删除 | 分享的文件已删除 |
| 500 | 服务器错误 | 内部异常 |

### C. 数据库自动 Seed

首次启动时自动创建管理员账号：
- 用户名: `admin`
- 密码: `admin12345` (bcrypt 哈希存储)
- 角色: `admin`
- 状态: `active`
