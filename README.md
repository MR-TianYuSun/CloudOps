<div align="center">

# CloudOps

### 个人小团队云盘 & 服务器管理一体化系统

**安全存储 · 团队协作 · 远程管控 — 一个平台，全部搞定**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 项目简介

CloudOps 是一个为个人开发者和小型团队量身打造的一体化云盘与服务器管理系统。它将**文件存储**、**团队协作**和**服务器远程管控**整合到同一个平台中，无需依赖第三方云服务即可部署运行。

**核心特色：**
- 零外部依赖 — SQLite 嵌入式数据库，无需安装 MySQL/PostgreSQL
- 轻量部署 — 单进程运行，最低 512MB 内存即可启动
- 全功能文件管理 — 上传、下载、9种格式在线预览、外链分享、回收站
- 网页远程连接 — Linux SSH终端 + Windows VNC远程桌面，浏览器直连服务器
- 团队协作 — 创建团队、共享文件空间、成员权限管理
- 毛玻璃暗色主题 — 深色科技感 UI，沉浸式操作体验

---

## 功能一览

### 文件管理

| 功能 | 说明 |
|------|------|
| 文件上传 | 支持拖拽上传、多文件批量上传、实时进度条 |
| 文件下载 | 支持单个文件下载、分享链接下载 |
| 在线预览 | PDF、Word、PPT、Excel、图片、Markdown、HTML、CSS、文本 — 9种格式 |
| 文件夹管理 | 创建文件夹、多层级目录导航、面包屑路径 |
| 搜索 | 按文件名实时搜索 |
| 移动 / 复制 | 跨目录移动和复制，防止循环移动检测 |
| 重命名 | 文件和文件夹重命名 |
| 批量操作 | 多选后批量删除、批量移动、批量复制 |
| 外链分享 | 生成8位随机分享码，支持密码保护、永久/限期有效、下载次数限制 |
| 回收站 | 软删除机制，支持恢复和彻底删除，30天自动清理 |
| 分类浏览 | 10大分类（文档/图片/音频/视频/代码/压缩包/数据/可执行/设计/字体） |

### 服务器远程管控

| 功能 | 说明 |
|------|------|
| SSH 终端 | Linux 服务器网页终端连接，xterm.js + ssh2 实时交互 |
| VNC 远程桌面 | Windows 服务器图形化远程桌面，noVNC 实时操作 |
| 智能识别 | 根据 OS 类型自动推荐 SSH 或 VNC 连接方式 |
| 自动在线检测 | 连接成功自动更新在线状态，支持手动 Ping 检测 |
| SSH 认证 | 支持密码认证和私钥认证 |
| VNC 认证 | 支持 VNC 密码保护连接 |
| 服务器资产 | 记录名称、IP、系统、环境标签、硬件配置 |

### 团队协作

| 功能 | 说明 |
|------|------|
| 创建团队 | 自定义团队名称、描述、颜色标识 |
| 成员管理 | 邀请加入、角色分配、移除成员 |
| 团队文件空间 | 独立的团队文件目录，成员共享 |
| 加入 / 退出 | 支持邀请码加入和主动退出 |

### 系统管理

| 功能 | 说明 |
|------|------|
| 仪表盘 | 存储用量、用户数、团队数、服务器数等关键指标一览 |
| 用户管理 | 用户列表、状态管理（启用/禁用）、管理员特权 |
| 系统设置 | 存储配额、系统参数配置 |

---

## 技术架构

```
┌──────────────────────────────────────────────────────────┐
│                      Browser                              │
│  React 19 + shadcn/ui + Tailwind CSS 4                   │
│  xterm.js (SSH) · noVNC (VNC) · 9种文件预览组件           │
├──────────────────┬───────────────────────────────────────┤
│   HTTP API       │        WebSocket                       │
│  Next.js Route   │  /ws/terminal (SSH)  /ws/vnc (VNC)    │
│  Handlers        │  Custom Server (server.ts)             │
├──────────────────┴───────────────────────────────────────┤
│                  Business Logic                            │
│  JWT Auth · File Manager · Share System · Team Manager    │
├──────────────────────────────────────────────────────────┤
│                  Data & Storage                            │
│  SQLite (better-sqlite3) · WAL Mode · Auto Migration      │
│  Local File System (data/uploads/) · File Hash Dedup      │
└──────────────────────────────────────────────────────────┘
```

**技术栈选型：**

| 层级 | 技术 | 选型理由 |
|------|------|----------|
| 框架 | Next.js 16 (App Router) | 全栈能力，SSR/CSR 灵活切换，自定义 WebSocket 服务器 |
| UI | shadcn/ui + Radix UI | 可定制性强，无样式锁定 |
| 样式 | Tailwind CSS 4 | 原子化 CSS，高效开发 |
| 语言 | TypeScript 5 (strict) | 类型安全，减少运行时错误 |
| 数据库 | SQLite (better-sqlite3) | 零部署依赖，嵌入式，WAL 模式支持并发读 |
| 认证 | JWT (jsonwebtoken + bcryptjs) | 无状态认证，自适应哈希抗暴力破解 |
| SSH | ssh2 + xterm.js | 纯 Node.js SSH 客户端 + 浏览器终端模拟器 |
| VNC | @novnc/novnc + ws | 浏览器 VNC 客户端 + WebSocket 代理转发 |
| 文件预览 | pdfjs-dist / docx-preview / xlsx / react-markdown | 主流文档格式全覆盖 |

---

## 快速开始

### 环境要求

- **Node.js** >= 20
- **pnpm** >= 8（项目仅允许使用 pnpm）
- **C++ 编译工具链**（better-sqlite3 和 ssh2 需要）

### 安装与启动

```bash
# 克隆项目
git clone <repository-url>
cd cloudops

# 安装依赖
pnpm install

# 开发模式启动（端口 5000）
pnpm dev

# 生产构建
pnpm build

# 生产模式启动
pnpm start
```

### Windows 用户注意

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

> 生产环境务必设置强随机 JWT_SECRET。

---

## 目录结构

```
cloudops/
├── data/                          # 运行时数据（自动生成）
│   ├── cloudops.db                # SQLite 数据库
│   └── uploads/                   # 上传文件存储
├── public/                        # 静态资源
│   ├── pdf.worker.min.mjs         # PDF.js Worker
│   └── novnc-rfb.js               # noVNC RFB 预打包模块
├── scripts/                       # 构建与启动脚本
│   ├── build.sh                   # 构建脚本
│   ├── dev.sh                     # 开发启动
│   ├── prepare.sh                 # 预处理
│   └── start.sh                   # 生产启动
├── src/
│   ├── app/                       # 页面路由
│   │   ├── (auth)/                # 认证页面（登录/注册）
│   │   ├── (main)/                # 主应用页面
│   │   │   ├── dashboard/         # 仪表盘
│   │   │   ├── cloud-drive/       # 云盘
│   │   │   ├── servers/           # 服务器管理 + 远程连接
│   │   │   ├── teams/             # 团队管理
│   │   │   ├── users/             # 用户管理
│   │   │   └── settings/          # 系统设置
│   │   ├── api/                   # API 路由
│   │   │   ├── auth/              # 认证接口
│   │   │   ├── files/             # 文件接口（上传/下载/预览/删除/恢复/移动/搜索）
│   │   │   ├── shares/            # 分享接口
│   │   │   ├── servers/           # 服务器接口（CRUD/Ping/VNC/Terminal）
│   │   │   ├── teams/             # 团队接口
│   │   │   ├── users/             # 用户接口
│   │   │   └── stats/             # 统计接口
│   │   └── s/[code]/              # 公开分享页面
│   ├── components/
│   │   ├── file-preview/          # 文件预览组件（9种格式）
│   │   ├── layout/                # 布局组件
│   │   ├── remote-desktop/        # 远程连接组件
│   │   │   └── VncViewer.tsx      # VNC 远程桌面查看器
│   │   └── ui/                    # shadcn/ui 组件库
│   ├── hooks/                     # 自定义 Hooks
│   ├── lib/
│   │   ├── auth.ts                # JWT 认证模块
│   │   ├── db.ts                  # 数据库初始化与迁移
│   │   ├── file-types.ts          # 文件分类系统（10大类100+后缀）
│   │   └── utils.ts               # 工具函数
│   ├── server.ts                  # 自定义服务器入口（HTTP + WebSocket）
│   └── types/                     # TypeScript 类型声明
├── package.json
├── next.config.ts
├── tsconfig.json
├── DESIGN.md                      # 设计规范
└── TECHNICAL.md                   # 技术架构文档
```

---

## 服务器远程连接配置

### Linux 服务器 — SSH 终端

1. 确保目标服务器已开启 SSH 服务（端口22）
2. 添加服务器时选择"Linux"类型，填写 SSH 用户名和密码/私钥
3. 点击「终端」按钮即可在浏览器中打开 SSH 终端

### Windows 服务器 — VNC 远程桌面

1. 在 Windows 服务器上安装 VNC 服务（推荐 [TightVNC](https://www.tightvnc.com/) 或 [UltraVNC](https://uvnc.com/)）
2. 安装时勾选 "Register as system service"，设置远程访问密码
3. 开放防火墙端口 5900：
   ```powershell
   netsh advfirewall firewall add rule name="VNC" dir=in action=allow protocol=TCP localport=5900
   ```
4. 添加服务器时选择"Windows"类型，填写 VNC 端口（默认5900）和 VNC 密码
5. 点击「远程桌面」按钮即可在浏览器中操作 Windows 图形界面

> 可选：安装 OpenSSH Server 使 Windows 服务器同时支持 SSH 终端和 VNC 远程桌面。

---

## 页面展示

### 登录页
暗色背景 + 毛玻璃卡片登录表单，支持用户名密码登录和注册。

### 仪表盘
- 关键指标卡片（存储用量、用户数、团队数、服务器数）
- 存储用量可视化进度条
- 快捷操作入口

### 云盘
- **个人空间** — 多层级目录浏览、面包屑导航、文件操作菜单
- **分类浏览** — 10大分类快速筛选
- **回收站** — 已删除文件管理、恢复与清空
- 拖拽上传区域 + 上传进度条
- 批量选择操作栏
- 文件移动/复制对话框
- 外链分享对话框（密码/过期/次数设置）
- 文件预览弹窗（9种格式）

### 服务器管理
- 服务器资产卡片列表
- **SSH 终端** — xterm.js 全功能终端，支持复制粘贴、窗口自适应
- **VNC 远程桌面** — noVNC 图形化桌面，支持全屏、Ctrl+Alt+Del
- 在线/离线自动检测（绿色脉冲动画）
- 环境标签 + 自定义标签

### 团队管理
- 团队列表（卡片/表格双视图）
- 团队详情页：成员管理 + 团队文件空间
- 邀请加入 / 退出团队

### 用户管理（管理员）
- 用户列表
- 启用/禁用账户
- 存储配额查看

### 分享页面（公开）
- 无需登录即可访问
- 密码保护验证
- 文件大小与类型展示
- 一键下载

---

## 浏览器支持

| Chrome | Firefox | Safari | Edge |
|:------:|:-------:|:------:|:----:|
| >= 90  | >= 90   | >= 14  | >= 90 |

---

## 常见问题

**Q: 数据库文件在哪里？**
A: `data/cloudops.db`，首次启动自动创建。

**Q: 上传的文件存储在哪里？**
A: `data/uploads/`，按文件内容哈希去重存储。

**Q: 如何修改存储配额？**
A: 在系统设置页面修改，或在用户管理页面为单个用户调整。

**Q: 回收站文件保留多久？**
A: 默认30天，可在回收站页面手动清空或恢复。

**Q: 忘记管理员密码怎么办？**
A: 删除 `data/cloudops.db` 重新启动，系统会自动创建默认管理员（注意：此操作会清除所有数据）。

**Q: Windows 服务器 SSH 连接失败？**
A: Windows 默认没有 SSH 服务，需要安装 OpenSSH Server，或者使用 VNC 远程桌面连接。

**Q: VNC 连接失败怎么办？**
A: 确认：1) 服务器已安装 VNC 服务；2) 防火墙开放了5900端口；3) VNC 密码设置正确；4) 服务器管理页面中填写了正确的 VNC 端口和密码。

**Q: 分享链接无法访问？**
A: 确认：1) 分享的文件未被删除（回收站中的文件无法通过分享链接访问）；2) 分享链接未过期（创建时选择"永久"则永不过期）。

---

