<div align="center">

<img src="https://img.shields.io/badge/CloudOPS-v1.0-6366f1?style=for-the-badge&logo=cloud&logoColor=white" alt="CloudOPS"/>

# CloudOPS

### 个人 & 小团队云盘 + 服务器管理一体化平台

**安全存储 · 团队协作 · 远程管控 · Skill 自动化 — 一个平台，全部搞定**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-22c55e.svg)](LICENSE)

**[🚀 Live Demo](http://47.101.147.0:4000)** · **[📖 技术文档](TECHNICAL.md)** · **[🪟 Windows 部署](DEPLOY_WINDOWS.md)**

</div>

---

## 项目简介

CloudOPS 是由孙天愉开发的一体化个人云盘与服务器管理系统，专为独立开发者和小型团队设计。无需 MySQL、Redis 等外部服务，单进程开箱即用，最低 512MB 内存即可运行。

系统核心亮点：

- **零外部依赖** — SQLite 嵌入式数据库，`data/` 目录即全部数据，迁移备份一键搞定
- **Skill 平台** — 内置 AI 自动化引擎，支持 Prompt / Script / Workflow 三种执行模式，可从云盘文件中自动检测并运行 Skill
- **全链路文件管理** — 上传下载、9种格式在线预览、外链分享、回收站、批量操作
- **网页远程控制** — Linux SSH 终端（xterm.js）+ Windows VNC 远程桌面（noVNC），浏览器直连服务器
- **团队协作** — 多成员、角色权限、共享文件空间
- **毛玻璃暗色 UI** — 深色科技感设计，沉浸式操作体验

---

## 功能一览

### 🗂 文件管理

| 功能 | 描述 |
|------|------|
| 文件上传 | 拖拽上传、多文件批量上传、文件夹整体上传、实时进度条 |
| 文件下载 | 单文件下载、分享链接直接下载 |
| 在线预览 | PDF / Word / PPT / Excel / 图片 / Markdown / HTML / CSS / 代码文本 — 9种格式 |
| 文件夹管理 | 创建文件夹、多层级目录导航、面包屑路径显示 |
| 搜索 | 按文件名实时搜索，支持按分类过滤 |
| 移动 / 复制 | 跨目录移动复制，循环移动安全检测 |
| 重命名 | 文件与文件夹均支持 |
| 批量操作 | 多选后批量删除、移动、复制 |
| 外链分享 | 8位随机分享码，密码保护 / 限期有效 / 下载次数限制 |
| 回收站 | 软删除机制，支持恢复与彻底删除，30天自动清理 |
| 分类浏览 | 10大分类（文档 / 图片 / 音频 / 视频 / 代码 / 压缩包 / 数据 / 可执行 / 设计 / 字体） |

### ⚡ Skill 自动化平台

| 功能 | 描述 |
|------|------|
| Prompt Skill | 调用 LLM（Doubao / Coze），支持 `{{input}}` 模板变量替换 |
| Script Skill | 沙箱内执行 Node.js 脚本，可读取云盘关联文件 |
| Workflow Skill | 多步骤自动化流程（LLM → Transform → Filter 链式处理） |
| 文件关联执行 | Skill 执行时自动注入关联文件内容 |
| 云盘 Skill 检测 | 自动扫描云盘 `skill/` 目录，识别并可直接运行 Skill 文件 |
| 流式输出 | Prompt 类 Skill 支持 SSE 流式返回 |
| 执行历史 | 完整记录每次 Skill 执行的输入、输出和状态 |
| 导入 / 导出 | JSON 格式 Skill 配置导入导出，跨实例迁移 |
| 公共发现 | `is_public` 标记发布，供其他用户使用 |

### 🖥 服务器远程管控

| 功能 | 描述 |
|------|------|
| SSH 终端 | xterm.js 全功能终端，Linux 服务器网页直连，支持复制粘贴、窗口自适应 |
| VNC 远程桌面 | noVNC 图形界面，Windows 服务器远程操作，支持全屏与 Ctrl+Alt+Del |
| 智能识别 | 根据 OS 类型自动推荐 SSH 或 VNC 连接方式 |
| 在线检测 | 连接成功自动标记在线，手动 Ping 检测，绿色脉冲动画状态指示 |
| 认证方式 | SSH 支持密码 / 私钥；VNC 支持密码保护 |
| 服务器资产 | 名称、IP、系统、环境标签、硬件配置记录 |

### 👥 团队协作

| 功能 | 描述 |
|------|------|
| 创建团队 | 自定义名称、描述、颜色标识 |
| 成员管理 | 邀请加入、角色分配（Owner / Member）、移除成员 |
| 团队文件空间 | 独立团队目录，成员共享读写 |
| 加入 / 退出 | 邀请码加入 + 主动退出 |

### 🔧 系统管理

| 功能 | 描述 |
|------|------|
| 仪表盘 | 存储用量、用户数、团队数、服务器数、文件数实时监控 |
| 用户管理 | 用户列表、审核注册、启用 / 禁用、存储配额查看 |
| 系统设置 | 注册开关、审核模式、最大上传限制、默认配额、系统名称 |
| API 密钥管理 | 生成 / 撤销 API Key，程序化访问鉴权 |
| WebDAV 配置 | WebDAV 协议挂载支持 |

---

## 技术架构

```
┌────────────────────────────────────────────────────────────────────┐
│                            Browser                                  │
│   React 19  ·  shadcn/ui  ·  Tailwind CSS 4  ·  Zustand            │
│   xterm.js (SSH终端)  ·  noVNC RFB (VNC远程桌面)                   │
│   9种文件预览组件  ·  拖拽上传  ·  批量操作                         │
├────────────────────────┬───────────────────────────────────────────┤
│       HTTP API          │          WebSocket                        │
│   Next.js App Router   │   /ws/terminal  ──→  ssh2  ──→ SSH Server │
│   40+ Route Handlers   │   /ws/vnc       ──→  net   ──→ VNC :5900  │
├────────────────────────┴───────────────────────────────────────────┤
│                        Business Logic                               │
│   JWT Auth  ·  File Manager  ·  Share System  ·  Skill Engine      │
│   Team Manager  ·  Server Manager  ·  Storage Quota                │
├────────────────────────────────────────────────────────────────────┤
│                       Data & Storage                                │
│   SQLite (better-sqlite3 · WAL Mode · Auto Migration)              │
│   Local File System (data/uploads/)  ·  Timestamp-based naming     │
└────────────────────────────────────────────────────────────────────┘
```

**技术栈选型：**

| 层级 | 技术 | 版本 | 选型理由 |
|------|------|------|---------|
| 框架 | Next.js App Router | 16 | 全栈能力，自定义 WebSocket 服务器 |
| UI | shadcn/ui + Radix UI | latest | 可定制性强，无样式锁定 |
| 样式 | Tailwind CSS | 4 | 原子化 CSS，高效开发 |
| 语言 | TypeScript strict | 5 | 类型安全，减少运行时错误 |
| 数据库 | SQLite (better-sqlite3) | 12 | 零部署依赖，WAL 模式支持并发读 |
| 认证 | JWT + bcryptjs | — | 无状态认证，自适应哈希 |
| SSH | ssh2 + xterm.js | — | 纯 Node.js SSH 客户端 + 浏览器终端 |
| VNC | @novnc/novnc + ws | — | 浏览器 VNC + WebSocket 代理 |
| Skill LLM | coze-coding-dev-sdk | — | Doubao 系列模型调用 |
| 文件预览 | pdfjs / docx-preview / xlsx / react-markdown | — | 主流文档格式全覆盖 |
| 状态管理 | Zustand | 5 | 轻量响应式，无 Redux 样板 |

---

## 快速开始

### 环境要求

- **Node.js** >= 20
- **pnpm** >= 9（项目强制要求，禁止使用 npm / yarn）
- **C++ 编译工具链**（better-sqlite3 和 ssh2 原生模块需要）

### 安装与启动

```bash
# 克隆项目
git clone https://github.com/<your-username>/cloudops.git
cd cloudops

# 安装依赖（必须使用 pnpm）
pnpm install

# 开发模式启动（端口 5000）
pnpm dev

# 生产构建
pnpm build

# 生产模式启动
pnpm start
```

启动成功后，访问 `http://localhost:5000` 即可使用。

### Windows 一键启动

项目提供 Windows 批处理脚本，双击运行：

```
start.bat
```

如果 `pnpm install` 报编译错误（better-sqlite3 / ssh2），需安装 C++ 编译工具：

1. 下载并安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)，勾选「Desktop development with C++」
2. 或运行：`npm install -g windows-build-tools`

### 默认管理员账号

| 字段 | 值 |
|------|----|
| 用户名 | `admin` |
| 密码 | `admin12345` |

> ⚠️ 首次登录后**务必修改默认密码**，生产环境请同时更换 `JWT_SECRET`。

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `JWT_SECRET` | JWT 签名密钥 | `cloudops-secret-key-change-in-production` |
| `PORT` | 服务监听端口 | `5000` |

---

## 目录结构

```
cloudops/
├── data/                          # 运行时数据（自动生成，.gitignore 已排除）
│   ├── cloudops.db                # SQLite 数据库
│   └── uploads/                   # 上传文件存储
├── public/                        # 静态资源
│   ├── pdf.worker.min.mjs         # PDF.js Worker
│   └── novnc-rfb.js               # noVNC RFB 预打包模块
├── scripts/                       # 构建与启动脚本
│   ├── build.sh
│   ├── dev.sh
│   ├── prepare.sh
│   └── start.sh
├── src/
│   ├── app/
│   │   ├── (auth)/                # 登录 / 注册页
│   │   ├── (main)/                # 主应用页面
│   │   │   ├── dashboard/         # 仪表盘
│   │   │   ├── cloud-drive/       # 云盘（个人 / 分类 / 回收站）
│   │   │   ├── servers/           # 服务器管理 + SSH/VNC 远程连接
│   │   │   ├── teams/             # 团队管理
│   │   │   ├── users/             # 用户管理（管理员）
│   │   │   └── settings/          # 系统设置
│   │   ├── api/                   # REST API 路由（40+接口）
│   │   │   ├── auth/              # 登录 / 注册 / 鉴权
│   │   │   ├── files/             # 文件 CRUD / 上传 / 下载 / 搜索 / 回收站
│   │   │   ├── skills/            # Skill CRUD / 执行 / 历史 / 导入导出
│   │   │   ├── shares/            # 外链分享
│   │   │   ├── servers/           # 服务器 CRUD / Ping / SSH / VNC
│   │   │   ├── teams/             # 团队 / 成员 / 文件
│   │   │   ├── users/             # 用户管理
│   │   │   ├── stats/             # 统计数据
│   │   │   ├── api-keys/          # API 密钥管理
│   │   │   └── system-settings/   # 系统设置
│   │   └── s/[code]/              # 公开分享页（无需登录）
│   ├── components/
│   │   ├── file-preview/          # 9种格式文件预览组件
│   │   ├── layout/                # 主布局组件
│   │   ├── remote-desktop/        # VNC 远程桌面查看器
│   │   └── ui/                    # shadcn/ui 组件库
│   ├── hooks/                     # 自定义 Hooks
│   ├── lib/
│   │   ├── auth.ts                # JWT 认证（generateToken / verifyToken）
│   │   ├── coze-llm.ts            # LLM 调用封装（Doubao / Coze）
│   │   ├── db.ts                  # SQLite 数据库初始化与迁移
│   │   ├── file-types.ts          # 文件分类系统（10大类 100+ 后缀）
│   │   └── utils.ts               # 通用工具函数
│   ├── server.ts                  # 自定义服务器入口（HTTP + WebSocket）
│   └── types/                     # TypeScript 类型声明
├── start.bat                      # Windows 一键启动脚本
├── package.json
├── next.config.ts
├── tsconfig.json
├── DESIGN.md                      # UI 设计规范
├── TECHNICAL.md                   # 完整技术架构文档
├── AGENTS.md                      # AI 编码代理上下文
└── DEPLOY_WINDOWS.md              # Windows 详细部署指南
```

---

## API 接口概览

所有 API 均以 `/api` 开头，认证方式为 `Authorization: Bearer <token>`。

### 认证

| 方法 | 路径 | 描述 |
|------|------|------|
| `POST` | `/api/auth/login` | 用户登录，返回 JWT Token |
| `POST` | `/api/auth/register` | 用户注册 |
| `GET` | `/api/auth/me` | 获取当前用户信息 |

### 文件管理

| 方法 | 路径 | 描述 |
|------|------|------|
| `GET` | `/api/files` | 获取文件列表（支持 `parent_id` 分页浏览） |
| `POST` | `/api/files/upload` | 上传文件（multipart/form-data，支持 `folder_path`） |
| `GET` | `/api/files/download?id=<id>` | 下载文件 |
| `GET` | `/api/files/search?q=<keyword>` | 搜索文件（支持 `category` 过滤） |
| `POST` | `/api/files/mkdir` | 创建文件夹 |
| `POST` | `/api/files/move` | 移动文件 / 文件夹 |
| `POST` | `/api/files/rename` | 重命名 |
| `DELETE` | `/api/files/<id>/delete` | 软删除到回收站 |
| `POST` | `/api/files/<id>/restore` | 从回收站恢复 |
| `GET` | `/api/files/trash` | 获取回收站列表 |
| `GET` | `/api/files/preview` | 获取文件预览内容 |

### Skill 自动化

| 方法 | 路径 | 描述 |
|------|------|------|
| `GET` | `/api/skills` | 获取 Skill 列表（支持 `scope` / `category` / `search` 过滤） |
| `POST` | `/api/skills` | 创建 Skill 或导入 Skill（`action=import`） |
| `GET` | `/api/skills/<id>` | 获取 Skill 详情 |
| `PUT` | `/api/skills/<id>` | 更新 Skill |
| `DELETE` | `/api/skills/<id>` | 删除 Skill |
| `POST` | `/api/skills/<id>/run` | 执行 Skill（支持 `input` / `params` / `fileIds`） |
| `GET` | `/api/skills/<id>/run` | 流式执行（SSE，仅 prompt 类型） |
| `GET` | `/api/skills/<id>/runs` | 获取执行历史 |

### 分享

| 方法 | 路径 | 描述 |
|------|------|------|
| `POST` | `/api/shares` | 创建分享链接 |
| `GET` | `/api/shares/<code>` | 获取分享信息（无需登录） |
| `POST` | `/api/shares/<code>/download` | 下载分享文件（无需登录） |

### 服务器管理

| 方法 | 路径 | 描述 |
|------|------|------|
| `GET/POST` | `/api/servers` | 服务器列表 / 添加服务器 |
| `GET/PUT/DELETE` | `/api/servers/<id>` | 服务器详情 / 更新 / 删除 |
| `POST` | `/api/servers/ping` | Ping 检测在线状态 |
| `GET` | `/api/servers/terminal` | 获取 SSH 终端 WebSocket 地址 |
| `GET` | `/api/servers/vnc` | 获取 VNC WebSocket 地址 |

---

## Skill 平台使用指南

CloudOPS 内置 Skill 自动化平台，支持三种执行模式：

### 1. Prompt Skill（LLM 调用）

```json
{
  "name": "文章摘要生成器",
  "category": "prompt",
  "config": {
    "template": "请对以下内容生成200字摘要：\n\n{{input}}",
    "systemPrompt": "你是一名专业的内容编辑",
    "model": "doubao-seed-2-0-mini-260215"
  }
}
```

### 2. Script Skill（Node.js 沙箱）

```json
{
  "name": "字数统计",
  "category": "script",
  "config": {
    "code": "const words = input.trim().split(/\\s+/).length;\nreturn `共 ${words} 个词`;",
    "timeout": 5000
  }
}
```

### 3. Workflow Skill（多步骤流程）

```json
{
  "name": "内容处理流水线",
  "category": "workflow",
  "config": {
    "steps": [
      { "type": "llm", "name": "提取关键词", "prompt": "从以下文章中提取5个关键词：{{input}}" },
      { "type": "transform", "name": "格式化", "prompt": "return '关键词：' + input;" }
    ]
  }
}
```

### 从云盘检测 Skill

在云盘 `skill/` 目录下存放的 `.json` 文件，系统可自动识别为 Skill 配置并直接运行，无需手动导入。

---

## 服务器远程连接配置

### Linux — SSH 终端

1. 确保目标服务器开放 SSH 服务（默认端口 22）
2. 添加服务器时选择「Linux」类型，填写 IP、SSH 用户名、密码或私钥
3. 点击「终端」按钮，即可在浏览器中打开全功能 SSH 终端

### Windows — VNC 远程桌面

1. 在 Windows 服务器安装 VNC 服务（推荐 [TightVNC](https://www.tightvnc.com/) 或 [UltraVNC](https://uvnc.com/)）
2. 开放防火墙端口 5900：
   ```powershell
   netsh advfirewall firewall add rule name="VNC" dir=in action=allow protocol=TCP localport=5900
   ```
3. 添加服务器时选择「Windows」类型，填写 VNC 端口（默认 5900）和密码
4. 点击「远程桌面」，即可在浏览器中操作 Windows 图形界面

---

## 浏览器兼容性

| Chrome | Firefox | Safari | Edge |
|:------:|:-------:|:------:|:----:|
| ≥ 90   | ≥ 90    | ≥ 14   | ≥ 90 |

---

## 常见问题

**Q: 数据库和上传文件存在哪里？**
A: `data/cloudops.db`（数据库）和 `data/uploads/`（文件），首次启动自动创建，迁移时只需复制整个 `data/` 目录。

**Q: 如何修改存储配额？**
A: 在系统设置页面全局修改，或在用户管理页面为单个用户单独调整。

**Q: 回收站文件保留多久？**
A: 默认 30 天，可在回收站手动清空或逐条恢复。

**Q: 忘记管理员密码怎么办？**
A: 删除 `data/cloudops.db` 并重启，系统将自动创建默认管理员（注意：**此操作会清除全部数据**）。

**Q: Windows 的 SSH 连接失败？**
A: Windows 默认无 SSH 服务，需安装 OpenSSH Server，或直接使用 VNC 远程桌面。

**Q: Skill 执行时 LLM 调用失败？**
A: 检查服务器端 Coze API Key 配置，确保网络可访问 Coze 平台接口。

**Q: 分享链接无法访问？**
A: 确认：① 文件未被移入回收站；② 分享链接未过期；③ 输入的提取码正确。

---

## 部署

### Docker（推荐）

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install -g pnpm && pnpm install && pnpm build
EXPOSE 5000
CMD ["pnpm", "start"]
```

```bash
docker build -t cloudops .
docker run -d -p 5000:5000 -v $(pwd)/data:/app/data cloudops
```

### Linux 服务器

```bash
# 克隆并构建
git clone https://github.com/<your-username>/cloudops.git
cd cloudops
pnpm install
pnpm build

# 使用 PM2 持久化运行
npm install -g pm2
pm2 start pnpm --name cloudops -- start
pm2 save
pm2 startup
```

### Windows 服务器

详见 [DEPLOY_WINDOWS.md](DEPLOY_WINDOWS.md)。

---

## 开发指南

```bash
# 开发模式（热重载，端口 5000）
pnpm dev

# 类型检查
pnpm ts-check

# ESLint 检查
pnpm lint

# 构建生产版本
pnpm build
```

技术架构详情参见 [TECHNICAL.md](TECHNICAL.md)。

---
