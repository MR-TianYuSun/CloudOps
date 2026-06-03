<div align="center">

# CloudOps Beta5.0

### 个人 / 小团队私有云盘 & 服务器管理一体化平台

**文件存储 · 文档协作 · Skill 自动化 · 服务器远程管控 — 一个平台，全部搞定**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**[🚀 内网Demo地址（管理员内部团队）](http://47.101.147.0:4000)** · **[🚀 公网Demo测试](http://de.frp.one:44774)** · **[📖 技术文档](TECHNICAL.md)** · **[🪟 Windows 部署](DEPLOY_WINDOWS.md)**

</div>

---

## 项目简介

CloudOps V7 是一套为个人开发者和小型团队打造的**全功能私有云盘与服务器管理系统**。单进程、零外部数据库依赖、SQLite 嵌入式存储，开箱即用。

相比早期版本，V7 在文件管理基础上新增了**桌面系统**、**Skill 自动化平台**、**在线文档编辑（Univer）**、**AI 对话助手（DeepSeek Function Calling）**、**文件加密**、**WebDAV 服务**、**远程下载管理**等核心模块，API 路由扩展到 **60 个**。

**核心特色：**

- 零外部数据库 — SQLite 嵌入式，WAL 并发模式，自动 Schema 迁移
- 轻量部署 — 单进程运行，最低 512MB 内存，Windows 一键 `start.bat` 启动
- 桌面系统 — 背景轮播、窗口管理、任务栏，15 个桌面应用
- 全功能文件管理 — 上传/下载/9 种预览/外链分享/回收站/加密/评论
- 在线文档编辑 — Univer 引擎，docx/xlsx/pptx 创建与编辑，WebSocket OT 实时协作
- Skill 自动化 — prompt（LLM）/ script（JS 沙箱）/ automation（工作流）三种类型，完整生命周期管理
- AI 对话助手 — DeepSeek Function Calling Agent，内置 11 种文件管理工具，最多 8 轮工具调用
- 网页远程连接 — Linux SSH 终端 + Windows VNC 远程桌面，3 条 WebSocket 通道
- 团队协作 — 创建/加入/退出团队、邀请成员、团队文件空间
- 用户管理 — 注册审批/启用/禁用/删除，API Key 管理
- 毛玻璃暗色主题 — 可定制主题系统，深色科技感 UI

---

## 功能一览

### 文件管理

| 功能 | 说明 |
|------|------|
| 文件上传 | 拖拽上传、多文件批量上传、实时进度条、SHA-256 哈希去重（秒传） |
| 文件下载 | 单文件下载、分享链接下载、文件夹 ZIP 打包下载 |
| 在线预览 | PDF、Word、PPT、Excel、图片、Markdown、HTML、CSS、文本 — 9 种格式 |
| 文件夹管理 | 创建文件夹、多层级目录导航、面包屑路径、递归操作 |
| 搜索 | 按文件名实时搜索 |
| 移动 / 复制 | 跨目录移动和复制，循环移动检测 |
| 重命名 | 文件和文件夹重命名 |
| 批量操作 | 多选后批量删除、批量移动、批量复制 |
| 外链分享 | 8 位随机分享码，支持密码保护、永久/限期有效、下载次数限制，文件夹 ZIP 打包分享 |
| 回收站 | 软删除机制，支持恢复和彻底删除，30 天自动清理 |
| 分类浏览 | 10 大分类（文档/图片/音频/视频/代码/压缩包/数据/可执行/设计/字体） |
| 文件加密 | AES-256-CBC 加密/解密，保护敏感文件 |
| 文件评论 | 对文件添加/查看/删除评论 |
| 最近文件 | 记录和查看最近访问的文件 |
| 远程下载 | 从 URL 下载文件到云盘，任务队列与进度追踪 |

### 文档编辑与协作

| 功能 | 说明 |
|------|------|
| 文档创建 | 新建 docx / xlsx / pptx / md / txt 空文档 |
| 在线编辑 | Univer 引擎，支持 docx / xlsx / pptx 打开与保存 |
| 实时协作 | WebSocket OT 协议，多用户同时编辑、光标同步、选区广播 |
| 协作者管理 | 查看文档协作者列表 |

### Skill 自动化平台

| 功能 | 说明 |
|------|------|
| Skill 创建 | 三种类型：prompt（LLM 调用）/ script（JS 沙箱执行）/ automation（步骤工作流） |
| Skill 执行 | prompt 类型调用 coze-coding-dev-sdk；script 类型通过 child_process 沙箱执行 |
| 变量替换 | 支持 `{{input}}` 和 `{{varName}}` 模板变量，从 extraParams 动态取值 |
| 执行历史 | 每次执行记录到 skill_runs 表，支持查看历史 |
| 公共 Skill | scope=public 的 Skill 可被其他用户发现和使用 |
| 文件关联 | 通过 fileCategory 参数关联文件类型，推荐相关 Skill |
| 导入/导出 | JSON 格式导入导出 Skill 配置 |
| 云盘标记 | 在云盘中将文件标记为 Skill，弹出配置弹窗快速创建 |
| 完整生命周期 | 列表 / 详情 / 创建 / 更新 / 删除 / 运行 / 导入 / 导出 / 历史 |

### AI 对话助手

| 功能 | 说明 |
|------|------|
| 智能对话 | DeepSeek Function Calling Agent，流式输出 |
| 内置工具 | 11 种文件管理工具（列表、上传、下载、搜索、创建文件夹、移动、重命名、删除、分享、预览、创建文档） |
| 工具调用 | 最多 8 轮工具调用，自然语言操控云盘 |
| 桌面应用 | 独立的 AIAssistantApp 桌面应用 |

### 服务器远程管控

| 功能 | 说明 |
|------|------|
| SSH 终端 | Linux 服务器网页终端，xterm.js + ssh2，256 色支持 |
| VNC 远程桌面 | Windows 服务器图形化远程桌面，noVNC 实时操作 |
| 文档协作通道 | WebSocket OT 协议实时文档协作 |
| 智能识别 | 根据 OS 类型自动推荐 SSH 或 VNC |
| 自动在线检测 | 连接成功自动更新状态，手动 Ping 检测 |
| 认证支持 | SSH 密码/私钥、VNC 密码 |

### 团队协作

| 功能 | 说明 |
|------|------|
| 创建团队 | 自定义名称、描述、颜色标识 |
| 成员管理 | 邀请加入（邀请码）、角色分配（owner/admin/member）、移除成员 |
| 团队文件空间 | 独立的团队文件目录，成员共享 |
| 加入 / 退出 | 邀请码加入和主动退出 |

### 系统管理

| 功能 | 说明 |
|------|------|
| 仪表盘 | 存储用量、用户数、团队数、服务器数等关键指标 |
| 用户管理 | 列表、注册审批/拒绝、启用/禁用、删除（仅管理员） |
| API Key | 创建/查看/删除 API 密钥 |
| 系统设置 | 存储配额、上传大小限制、注册开关、审批开关、系统名称、上传目录（仅管理员） |
| 主题管理 | 查询与更新主题配置 |
| 存储分析 | 存储用量可视化分析 |
| WebDAV | 启用/关闭 WebDAV 服务（仅管理员） |

### 桌面系统

| 功能 | 说明 |
|------|------|
| 桌面界面 | 背景轮播（4 张图，5 秒切换，淡入淡出）、窗口框架、任务栏 |
| 桌面应用 | 15 个内置应用：云盘、仪表盘、服务器管理、终端、Skill 平台、文档管理器、AI 助手、下载管理、加密工具、最近文件、存储分析、用户管理、系统设置、主题设置、WebDAV 设置、协作编辑器、API 文档 |

---

## 技术架构

```
+--------------------------------------------------------------+
|                         Browser                                |
|  React 19 + shadcn/ui + Tailwind CSS 4                        |
|  xterm.js (SSH) | noVNC (VNC) | Univer (Docs/Sheets) | 15 Apps|
+--------------------------+-------------------------------------+
|     HTTP API (60 routes) |     WebSocket (3 channels)         |
|     Next.js Route Handler|  /ws/terminal  /ws/vnc  /ws/collab |
|     (App Router)          |     Custom Server (server.ts)      |
+--------------------------+-------------------------------------+
|                       Business Logic                           |
|  JWT Auth | File Manager | Shares | Teams | Skills | AI Chat  |
|  Documents | Encryption | Comments | Downloads | WebDAV       |
+--------------------------------------------------------------+
|                       Data & Storage                           |
|  SQLite (better-sqlite3) | WAL Mode | Auto Schema Migration   |
|  Local File System (data/uploads/) | SHA-256 Hash Dedup      |
+--------------------------------------------------------------+
```

**技术栈：**

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 框架 | Next.js (App Router) | 16 | 全栈能力，自定义 WebSocket 服务器 |
| 核心 | React | 19 | Concurrent Features, Server Components |
| 语言 | TypeScript | 5 | strict mode |
| UI 组件 | shadcn/ui + Radix UI | latest | 30+ 组件，可定制 |
| 样式 | Tailwind CSS | 4 | 原子化 CSS, @theme 变量 |
| 数据库 | SQLite (better-sqlite3) | 12 | 零部署，WAL 并发，自动迁移 |
| 认证 | JWT (jsonwebtoken + bcryptjs) | 9 / 3 | 无状态认证，自适应哈希 |
| SSH | ssh2 + @xterm/xterm | 1 / 6 | 纯 Node.js SSH2 + 浏览器终端 |
| VNC | @novnc/novnc + ws | 1.7 / 8 | HTML5 VNC 客户端 + WebSocket |
| 文档编辑 | @univerjs/presets | 0.24 | docx / xlsx 创建与编辑，OT 协作 |
| LLM | coze-coding-dev-sdk | 0.7 | Skill prompt 执行 + AI 对话 |
| 文件预览 | pdfjs-dist / docx-preview / xlsx / mammoth | - | 9 种格式全覆盖 |
| 文件加密 | Node.js crypto (AES-256-CBC) | 内置 | 加密/解密文件 |
| 文件打包 | archiver | 7 | 文件夹 ZIP 打包下载 |
| 状态管理 | zustand | 5 | 桌面系统状态管理 |

---

## 快速开始

### 环境要求

- **Node.js** >= 20
- **pnpm** >= 9（项目仅允许使用 pnpm，有 preinstall 检查）
- **C++ 编译工具链**（better-sqlite3 和 ssh2 原生模块需要）

### 安装与启动

```bash
# 克隆项目
git clone <repository-url>
cd projects

# 安装依赖（自动检查 pnpm）
pnpm install

# 开发模式启动（端口 5000）
pnpm dev

# 生产构建（Next.js + server.ts）
pnpm build

# 生产模式启动
pnpm start
```

### Windows 一键启动

双击项目根目录的 `start.bat`，自动设置环境变量并启动服务。默认监听端口 `4000`。

### Windows 原生模块编译

如果 `pnpm install` 报错（better-sqlite3 / ssh2 编译失败），需要安装：

1. [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)，勾选 "Desktop development with C++"
2. 或运行 `npm install -g windows-build-tools`

### 默认管理员账号

| 字段 | 值 |
|------|------|
| 用户名 | `admin` |
| 密码 | `admin12345` |

> 首次登录后请立即修改默认密码。

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `JWT_SECRET` | JWT 签名密钥 | `cloudops-secret-key-change-in-production` |
| `PORT` | 服务监听端口 | `5000` |
| `COZE_PROJECT_ENV` | 运行环境 | `DEV`（设为 `PROD` 启用生产模式） |
| `DB_PATH` | 数据库文件路径 | `data/cloudops.db` |
| `UPLOAD_DIR` | 文件上传存储路径 | `data/uploads` |

> 生产环境务必设置强随机 JWT_SECRET，并配置 DB_PATH 和 UPLOAD_DIR 防止部署覆盖时数据丢失。

---

## 目录结构

```
projects/
+-- data/                          # 运行时数据（自动生成）
|   +-- cloudops.db                # SQLite 数据库
|   +-- uploads/                   # 上传文件存储（哈希去重）
+-- public/                        # 静态资源
|   +-- pdf.worker.min.mjs         # PDF.js Worker
|   +-- novnc-rfb.js               # noVNC RFB 预打包模块
|   +-- bg-1~4.jpg                 # 桌面背景壁纸
+-- scripts/                       # 构建与启动脚本
|   +-- build.sh                   # 构建脚本
|   +-- dev.sh                     # 开发启动
|   +-- prepare.sh                 # 预处理
|   +-- start.sh                   # 生产启动
|   +-- validate.sh                # 校验脚本
+-- src/
|   +-- app/                       # 页面路由
|   |   +-- (auth)/                # 认证页面（登录/注册）
|   |   +-- (main)/                # 主应用页面
|   |   |   +-- dashboard/         #   仪表盘
|   |   |   +-- cloud-drive/       #   云盘
|   |   |   +-- documents/         #   文档管理与编辑
|   |   |   +-- servers/           #   服务器管理 + 远程连接
|   |   |   +-- teams/             #   团队管理
|   |   |   +-- users/             #   用户管理
|   |   |   +-- settings/          #   系统设置
|   |   +-- desktop/               # 桌面系统页面
|   |   +-- s/[code]/              # 公开分享页面
|   |   +-- api/                   # API 路由（60 个 route.ts）
|   |       +-- auth/              #   认证（login/register/me）
|   |       +-- files/             #   文件（list/upload/download/preview/mkdir/rename/move/search/trash/delete/restore）
|   |       +-- shares/            #   分享（list/create/get/download）
|   |       +-- documents/         #   文档（list/detail/create/collaborators）
|   |       +-- skills/            #   Skill（list/create/update/delete/run/runs）
|   |       +-- servers/           #   服务器（list/create/update/delete/ping/terminal/vnc）
|   |       +-- teams/             #   团队（list/create/delete/detail/invite/join/leave/members/files）
|   |       +-- users/             #   用户（list/approve/reject/delete/status）
|   |       +-- ai/chat/           #   AI 对话
|   |       +-- api-keys/          #   API Key 管理
|   |       +-- comments/[fileId]/ #   文件评论
|   |       +-- downloads/         #   远程下载
|   |       +-- encryption/        #   文件加密/解密
|   |       +-- recent-files/      #   最近文件
|   |       +-- stats/             #   统计信息
|   |       +-- storage-analytics/ #  存储分析
|   |       +-- system-settings/   #   系统设置查询/恢复
|   |       +-- themes/            #   主题设置
|   |       +-- webdav/config/     #   WebDAV 配置
|   +-- components/
|   |   +-- desktop/              # 桌面系统组件
|   |   |   +-- Desktop.tsx        #   桌面主界面
|   |   |   +-- Taskbar.tsx        #   任务栏
|   |   |   +-- WindowFrame.tsx    #   窗口框架
|   |   |   +-- AppRegistry.ts     #   应用注册表
|   |   |   +-- AppRenderer.tsx    #   应用渲染器
|   |   |   +-- DesktopIcons.tsx  #   桌面图标
|   |   |   +-- DesktopStore.ts    #   桌面状态管理 (zustand)
|   |   |   +-- apps/              #   15 个桌面应用组件
|   |   +-- file-preview/          # 文件预览组件（9 种格式）
|   |   +-- layout/                # 布局组件
|   |   +-- remote-desktop/        # 远程连接组件
|   |   |   +-- VncViewer.tsx      #   VNC 远程桌面查看器
|   |   +-- ui/                    # shadcn/ui 组件库（30+）
|   +-- hooks/                     # 自定义 Hooks
|   +-- lib/
|   |   +-- auth.ts                # JWT 认证模块（generate/verify）
|   |   +-- db.ts                  # SQLite 初始化、迁移、文件路径管理
|   |   +-- coze-llm.ts            # LLM 调用封装（eval('require') 绕过 Turbopack）
|   |   +-- file-types.ts          # 文件分类系统（10 大类 100+ 后缀）
|   |   +-- utils.ts               # 工具函数
|   +-- server.ts                  # 自定义服务器入口（HTTP + 3 条 WebSocket）
|   +-- types/                     # TypeScript 类型声明
+-- start.bat                      # Windows 一键启动脚本
+-- package.json
+-- next.config.ts
+-- tsconfig.json
+-- DESIGN.md                      # 设计规范
+-- TECHNICAL.md                   # 技术架构文档
+-- DEPLOY_WINDOWS.md              # Windows 部署指南
+-- AGENTS.md                      # 项目上下文
```

---

## API 接口总览

V7 共 **60 个 API 路由**，按模块划分：

### 认证 (Auth)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/register` | 用户注册 |
| GET | `/api/auth/me` | 获取当前用户信息 |

### 文件 (Files)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/files` | 文件列表 |
| POST | `/api/files/upload` | 文件上传 (multipart) |
| GET | `/api/files/download` | 文件下载 |
| GET | `/api/files/preview` | 文件预览 |
| POST | `/api/files/mkdir` | 创建文件夹 |
| POST | `/api/files/rename` | 重命名 |
| POST | `/api/files/move` | 移动/复制 |
| GET | `/api/files/search` | 搜索 |
| GET | `/api/files/trash` | 回收站列表 |
| DELETE | `/api/files/[id]/delete` | 删除/彻底删除 |
| POST | `/api/files/[id]/restore` | 恢复文件 |

### 分享 (Shares)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/shares` | 创建分享链接 |
| GET | `/api/shares/[code]` | 获取分享信息（公开） |
| POST | `/api/shares/[code]/download` | 下载分享文件/文件夹 ZIP |

### 文档 (Documents)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/documents` | 文档列表 |
| POST | `/api/documents/create` | 创建文档 |
| GET | `/api/documents/[id]` | 文档详情 |
| GET | `/api/documents/[id]/collaborators` | 文档协作者列表 |

### Skill 自动化

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/skills` | Skill 列表 |
| POST | `/api/skills` | 创建 Skill |
| GET/PUT/DELETE | `/api/skills/[id]` | 详情/更新/删除 |
| POST | `/api/skills/[id]/run` | 执行 Skill |
| GET | `/api/skills/[id]/runs` | 执行历史 |

### 服务器 (Servers)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/servers` | 服务器列表 |
| POST | `/api/servers` | 添加服务器 |
| GET/PATCH/DELETE | `/api/servers/[id]` | 详情/更新/删除 |
| GET | `/api/servers/ping` | Ping 检测 |
| GET | `/api/servers/terminal` | SSH 连接信息 |
| GET | `/api/servers/vnc` | VNC 连接信息 |

### 团队 (Teams)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/teams` | 列表/创建 |
| GET/DELETE | `/api/teams/[id]` | 详情/删除 |
| GET/POST | `/api/teams/[id]/files` | 团队文件列表/上传 |
| GET/POST | `/api/teams/[id]/members` | 成员列表/添加 |
| POST | `/api/teams/[id]/invite` | 邀请成员 |
| POST | `/api/teams/[id]/join` | 加入团队 |
| POST | `/api/teams/[id]/leave` | 退出团队 |

### 用户 (Users)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/users` | 用户列表 |
| POST | `/api/users/[id]/approve` | 审批注册 |
| POST | `/api/users/[id]/reject` | 拒绝注册 |
| DELETE | `/api/users/[id]/delete` | 删除用户 |
| POST | `/api/users/[id]/status` | 启用/禁用 |

### 高级功能

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ai/chat` | AI 对话（DeepSeek Function Calling） |
| GET/POST | `/api/api-keys` | API Key 列表/创建 |
| DELETE | `/api/api-keys/[id]` | 删除 API Key |
| GET/POST/DELETE | `/api/comments/[fileId]` | 文件评论 |
| GET/POST | `/api/downloads` | 远程下载列表/创建任务 |
| GET/DELETE | `/api/downloads/[id]` | 下载任务详情/取消 |
| POST | `/api/encryption/encrypt/[id]` | 加密文件 |
| POST | `/api/encryption/decrypt/[id]` | 解密文件 |
| GET | `/api/recent-files` | 最近文件 |
| GET | `/api/stats` | 仪表盘统计 |
| GET | `/api/storage-analytics` | 存储分析 |
| GET | `/api/system-settings` | 系统设置查询 |
| POST | `/api/system-settings/recover` | 恢复默认设置 |
| GET/PUT | `/api/themes` | 主题查询/更新 |
| GET/PUT | `/api/webdav/config` | WebDAV 配置 |

### WebSocket 通道

| 路径 | 协议 | 用途 |
|------|------|------|
| `/ws/terminal` | WebSocket | SSH 终端实时交互（JSON 帧封装） |
| `/ws/vnc` | WebSocket | VNC 远程桌面（二进制 RFB 透传） |
| `/ws/collab` | WebSocket | 文档实时协作（OT 操作/光标/选区广播） |

### 统一响应格式

```json
// 成功
{ "code": 200, "message": "操作成功", "data": { ... } }

// 错误
{ "code": 400|401|403|404|500, "message": "错误描述", "data": null }
```

---

## 服务器远程连接配置

### Linux 服务器 — SSH 终端

1. 确保目标服务器已开启 SSH 服务（端口 22）
2. 添加服务器时选择 "Linux" 类型，填写 SSH 用户名和密码/私钥
3. 点击「终端」按钮在浏览器中打开 SSH 终端

### Windows 服务器 — VNC 远程桌面

1. 安装 VNC 服务（推荐 [TightVNC](https://www.tightvnc.com/) 或 [UltraVNC](https://uvnc.com/)）
2. 勾选 "Register as system service"，设置远程访问密码
3. 开放防火墙端口 5900：
   ```powershell
   netsh advfirewall firewall add rule name="VNC" dir=in action=allow protocol=TCP localport=5900
   ```
4. 添加服务器时选择 "Windows" 类型，填写 VNC 端口（默认 5900）和密码
5. 点击「远程桌面」按钮在浏览器中操作 Windows 图形界面

---

## Windows 部署

详细部署指南见 [DEPLOY_WINDOWS.md](DEPLOY_WINDOWS.md)，包括：

- 全新部署步骤
- [NSSM](https://nssm.cc/) 注册为 Windows 服务（开机自启）
- Nginx 反向代理 + HTTPS 配置
- frp 内网穿透
- 防火墙放行
- 自动备份（Windows 计划任务）
- 日常运维命令

---

## 页面展示

### 登录页
暗色背景 + 毛玻璃卡片登录表单，支持用户名密码登录和注册。

### 桌面系统
- 背景壁纸轮播（4 张图，5 秒淡入淡出）
- 桌面图标 + 窗口管理（拖拽/最小化/最大化/关闭）
- 任务栏应用快捷入口
- 15 个桌面应用，覆盖所有核心功能

### 仪表盘
关键指标卡片（存储用量、用户数、团队数、服务器数）+ 存储用量可视化 + 快捷操作。

### 云盘
个人空间目录浏览、分类浏览、回收站、拖拽上传、批量操作、外链分享、文件预览（9 种格式）。

### 文档管理
文档列表、创建新文档、在线编辑（Univer docx/xlsx/pptx）、协作编辑。

### 服务器管理
服务器资产卡片、SSH 终端（xterm.js）、VNC 远程桌面（noVNC）、在线/离线状态检测。

### 分享页面（公开）
无需登录，支持密码保护，显示文件信息，一键下载。

---

## 浏览器支持

| Chrome | Firefox | Safari | Edge |
|:------:|:-------:|:------:|:----:|
| >= 90  | >= 90   | >= 14  | >= 90 |

---

## 常见问题

**Q: 数据库文件在哪里？**
A: `data/cloudops.db`，首次启动自动创建。生产环境建议通过 `DB_PATH` 环境变量指定独立路径。

**Q: 上传的文件存储在哪里？**
A: `data/uploads/`（可通过 `UPLOAD_DIR` 环境变量或系统设置配置），按 SHA-256 哈希去重存储。

**Q: 如何修改存储配额？**
A: 管理员在系统设置页面修改 `default_quota`，或为单个用户调整 `storage_quota`。

**Q: 回收站文件保留多久？**
A: 默认 30 天，可在回收站页面手动恢复或彻底删除。

**Q: 忘记管理员密码怎么办？**
A: 删除 `data/cloudops.db` 重新启动，系统会自动创建默认管理员（注意：此操作会清除所有数据）。

**Q: VNC 连接失败怎么办？**
A: 确认：1) 服务器已安装 VNC 服务；2) 防火墙开放 5900 端口；3) VNC 密码正确。

**Q: 如何启用 WebDAV？**
A: 管理员在 WebDAV 设置页面配置并启用，重启服务后生效。

**Q: Skill 执行失败怎么办？**
A: 检查 Skill 类型：prompt 类型需确认 coze-coding-dev-sdk 配置正确；script 类型需确认代码无语法错误。

---

## 详细文档

| 文档 | 说明 |
|------|------|
| [TECHNICAL.md](TECHNICAL.md) | 技术架构详解（数据库设计、认证系统、文件系统、WebSocket 等） |
| [DESIGN.md](DESIGN.md) | 设计规范（毛玻璃暗色主题、色彩、字体、布局、动效） |
| [DEPLOY_WINDOWS.md](DEPLOY_WINDOWS.md) | Windows 服务器部署指南 |
| [AGENTS.md](AGENTS.md) | 项目上下文与开发规范 |

---

## License

MIT License
