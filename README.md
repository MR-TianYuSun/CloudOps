<div align="center">

# CloudOps

### 个人 & 小团队云盘 · 服务器管控一体化平台

**安全存储 · 团队协作 · 远程管控 — 一个平台，全部搞定**

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL%20Mode-003B57?logo=sqlite)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-22C55E.svg)](LICENSE)
[![pnpm](https://img.shields.io/badge/pnpm-9.0+-F69220?logo=pnpm)](https://pnpm.io/)
[![在线演示](https://img.shields.io/badge/在线演示-点击访问-blue?logo=globe)](http://47.101.147.0:4000)

</div>

---

## 项目简介

CloudOps 是一套面向**个人开发者和小型团队**的云盘 & 服务器管理一体化系统。它将文件存储、团队协作与服务器远程管控整合在同一平台，无需依赖任何外部云服务即可完整运行。

**为什么选择 CloudOps？**

- 🚀 **零外部依赖** — 内嵌 SQLite，无需单独安装数据库，开箱即用
- ⚡ **轻量部署** — 单进程运行，512 MB 内存即可启动，2 核 4 GB 就能跑生产
- 📂 **全功能云盘** — 上传 / 下载 / 9 种格式在线预览 / 外链分享 / 回收站，一套完整的文件管理体验
- 🖥 **网页远程连接** — Linux SSH 终端 + Windows VNC 远程桌面，浏览器直连，无需额外客户端
- 👥 **团队协作** — 创建团队、共享文件空间、细粒度成员权限管理
- 🎨 **毛玻璃暗色 UI** — 深色科技感界面，沉浸式操作体验

---

## 功能一览

### 📁 文件管理

| 功能 | 说明 |
|------|------|
| 文件上传 | 拖拽上传、多文件批量上传、实时进度条 |
| 文件下载 | 单文件下载、分享链接下载 |
| 在线预览 | PDF、Word、PPT、Excel、图片、Markdown、HTML、CSS、文本 — 9 种格式 |
| 文件夹管理 | 多层级目录导航、面包屑路径、新建 / 重命名 |
| 实时搜索 | 按文件名快速过滤，结果即时响应 |
| 移动 / 复制 | 跨目录移动和复制，内置循环移动检测 |
| 批量操作 | 多选后批量删除、批量移动、批量复制 |
| 外链分享 | 8 位随机分享码，支持密码保护 / 限期有效 / 下载次数限制 |
| 回收站 | 软删除机制，支持恢复和彻底清除，30 天自动清理 |
| 分类浏览 | 10 大分类（文档 / 图片 / 音频 / 视频 / 代码 / 压缩包 / 数据 / 可执行 / 设计 / 字体） |

### 🖥 服务器远程管控

| 功能 | 说明 |
|------|------|
| SSH 终端 | Linux 服务器网页终端，xterm.js + ssh2 实时交互 |
| VNC 远程桌面 | Windows 服务器图形化远程操作，noVNC 实时传输 |
| 智能识别 | 根据 OS 类型自动推荐 SSH 或 VNC 连接方式 |
| 在线状态检测 | 连接成功自动更新在线状态，支持手动 Ping |
| SSH 认证 | 密码认证 + 私钥认证双模式 |
| VNC 认证 | 支持 VNC 密码保护连接 |
| 资产管理 | 记录名称、IP、系统类型、环境标签、硬件配置 |

### 👥 团队协作

| 功能 | 说明 |
|------|------|
| 创建团队 | 自定义团队名称、描述、颜色标识 |
| 成员管理 | 邀请加入、角色分配（admin / member）、移除成员 |
| 团队文件空间 | 独立的团队共享目录，成员均可读写 |
| 邀请码机制 | 分享邀请码即可加入团队，支持主动退出 |

### ⚙️ 系统管理

| 功能 | 说明 |
|------|------|
| 仪表盘 | 存储用量、用户数、团队数、服务器数核心指标一览 |
| 用户管理 | 用户列表、启用 / 禁用账号、管理员特权 |
| 系统设置 | 存储配额、JWT 过期时间等系统参数配置 |
| 操作日志 | 关键操作记录，支持审计追溯 |

---

## 技术架构

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser                               │
│   React 19 · shadcn/ui · Tailwind CSS 4                       │
│   xterm.js (SSH Terminal) · noVNC (VNC) · 9 种文件预览组件     │
├─────────────────────┬────────────────────────────────────────┤
│    REST API (HTTP)  │         WebSocket                       │
│   Next.js Route     │  /ws/terminal — SSH 双向流              │
│   Handlers          │  /ws/vnc      — VNC 帧缓冲代理          │
│                     │  Custom Server (server.ts)              │
├─────────────────────┴────────────────────────────────────────┤
│                      Business Logic                            │
│   JWT Auth · File Manager · Share System · Team Manager       │
│   Server Asset Manager · RBAC Permission                      │
├──────────────────────────────────────────────────────────────┤
│                     Data & Storage                             │
│   SQLite (better-sqlite3) · WAL Mode · Auto Migration         │
│   Local File System (data/uploads/) · Hash-based Dedup        │
└──────────────────────────────────────────────────────────────┘
```

**技术栈选型：**

| 层级 | 技术 | 版本 | 选型理由 |
|------|------|------|----------|
| 框架 | Next.js App Router | 16.1 | 全栈能力，SSR/CSR 灵活，内置自定义 WebSocket 服务器支持 |
| UI 组件 | shadcn/ui + Radix UI | latest | 可定制性强，无样式锁定 |
| 样式 | Tailwind CSS | 4.x | 原子化 CSS，开发效率高 |
| 语言 | TypeScript | 5 (strict) | 类型安全，减少运行时错误 |
| 数据库 | SQLite (better-sqlite3) | 12.x | 零部署依赖，嵌入式，WAL 模式支持并发读 |
| ORM | Drizzle ORM | 0.45 | 轻量，类型安全，适配 SQLite |
| 认证 | JWT + bcryptjs | — | 无状态认证，bcrypt 自适应哈希抗暴力破解 |
| SSH | ssh2 + xterm.js | — | 纯 Node.js SSH 客户端 + 浏览器全功能终端模拟器 |
| VNC | @novnc/novnc + ws | — | 浏览器 VNC 客户端 + WebSocket 代理转发 |
| 文件预览 | pdfjs-dist / docx-preview / xlsx / react-markdown | — | 主流文档格式全覆盖 |
| 状态管理 | Zustand | 5.x | 轻量，与 Next.js 集成简洁 |
| 图表 | Recharts | 2.x | React 原生，SSR 兼容性好 |

---

## 快速开始

### 环境要求

| 依赖 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | >= 20.0 | 推荐 20.x LTS |
| pnpm | >= 9.0 | 项目唯一支持的包管理器 |
| C++ 编译工具链 | — | better-sqlite3 和 ssh2 原生模块编译需要 |

> **Windows 用户**：如果 `pnpm install` 报编译错误，请先安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)，勾选"Desktop development with C++"。

### 本地运行

```bash
# 克隆项目
git clone <repository-url>
cd cloudops

# 安装依赖（首次约 2-5 分钟）
pnpm install

# 开发模式启动（监听端口 5000）
pnpm dev
```

打开浏览器访问 [http://localhost:5000](http://localhost:5000)

### 默认管理员账号

| 字段 | 值 |
|------|------|
| 用户名 | `admin` |
| 密码 | `admin12345` |

> ⚠️ **首次登录后请立即修改默认密码！**

### 生产构建

```bash
# 构建生产版本
pnpm build

# 启动生产服务
pnpm start
```

---

## 环境变量

在项目根目录创建 `.env.local`（开发）或 `.env.production`（生产）：

| 变量名 | 默认值 | 说明 | 生产是否必填 |
|--------|--------|------|------------|
| `PORT` | `5000` | 服务监听端口 | 否 |
| `JWT_SECRET` | `cloudops-secret-key-change-in-production` | JWT 签名密钥 | **必填（请使用强随机字符串 ≥ 32 位）** |
| `JWT_EXPIRES_IN` | `604800` | Token 有效期（秒，默认 7 天） | 否 |
| `MAX_UPLOAD_SIZE` | `104857600` | 最大上传文件大小（字节，默认 100 MB） | 否 |

```bash
# .env.local 示例
PORT=5000
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_EXPIRES_IN=604800
MAX_UPLOAD_SIZE=104857600
```

---

## 目录结构

```
cloudops/
├── data/                          # 运行时数据（自动生成，勿删）
│   ├── cloudops.db                # SQLite 数据库文件
│   └── uploads/                   # 用户上传文件存储（哈希去重）
├── public/                        # 静态资源
│   ├── pdf.worker.min.mjs         # PDF.js Web Worker
│   └── novnc-rfb.js               # noVNC RFB 预打包模块
├── scripts/                       # 构建与启动脚本
│   ├── build.sh                   # 生产构建
│   ├── dev.sh                     # 开发环境启动
│   ├── prepare.sh                 # 依赖预处理
│   └── start.sh                   # 生产环境启动
├── src/
│   ├── app/                       # Next.js App Router 页面路由
│   │   ├── (auth)/                # 认证页面（登录 / 注册）
│   │   ├── (main)/                # 主应用页面
│   │   │   ├── dashboard/         # 仪表盘
│   │   │   ├── cloud-drive/       # 云盘（个人空间 / 分类 / 回收站）
│   │   │   ├── servers/           # 服务器管理 + 远程连接
│   │   │   ├── teams/             # 团队管理
│   │   │   ├── users/             # 用户管理（管理员）
│   │   │   └── settings/          # 系统设置
│   │   ├── api/                   # REST API 路由
│   │   │   ├── auth/              # 认证接口（登录 / 注册 / 登出 / 当前用户）
│   │   │   ├── files/             # 文件接口（上传 / 下载 / 预览 / 删除 / 恢复 / 移动 / 搜索）
│   │   │   ├── shares/            # 分享接口（创建 / 验证 / 下载）
│   │   │   ├── servers/           # 服务器接口（CRUD / Ping / VNC / Terminal）
│   │   │   ├── teams/             # 团队接口（创建 / 成员管理 / 文件空间）
│   │   │   ├── users/             # 用户接口（管理员操作）
│   │   │   └── stats/             # 统计接口（仪表盘数据）
│   │   └── s/[code]/              # 公开分享页面（无需登录）
│   ├── components/
│   │   ├── file-preview/          # 文件预览组件（9 种格式）
│   │   ├── layout/                # 全局布局（侧边栏 / 顶栏 / 面包屑）
│   │   ├── remote-desktop/        # 远程连接组件
│   │   │   └── VncViewer.tsx      # VNC 远程桌面查看器
│   │   └── ui/                    # shadcn/ui 基础组件库
│   ├── hooks/                     # 自定义 React Hooks
│   ├── lib/
│   │   ├── auth.ts                # JWT 认证模块
│   │   ├── db.ts                  # SQLite 初始化与自动迁移
│   │   ├── file-types.ts          # 文件分类系统（10 大类 100+ 后缀）
│   │   └── utils.ts               # 通用工具函数
│   ├── server.ts                  # 自定义服务器入口（HTTP + WebSocket）
│   └── types/                     # TypeScript 类型声明
├── package.json
├── next.config.ts                 # Next.js 配置
├── tsconfig.json                  # TypeScript 配置（strict 模式）
├── components.json                # shadcn/ui 配置
├── DESIGN.md                      # UI 设计规范
└── TECHNICAL.md                   # 技术架构详细文档
```

---

## 服务器远程连接

### Linux — SSH 终端

1. 确保目标服务器已开启 SSH 服务（默认端口 22）
2. 添加服务器时选择 **Linux** 类型，填写 SSH 用户名和认证信息（密码或私钥）
3. 进入服务器详情页，点击「终端」按钮，即可在浏览器中打开全功能 SSH 终端

终端支持：复制粘贴 / 窗口尺寸自适应 / 颜色渲染 / 滚动历史

### Windows — VNC 远程桌面

1. 在 Windows 服务器上安装 VNC 服务（推荐 [TightVNC](https://www.tightvnc.com/) 或 [UltraVNC](https://uvnc.com/)），勾选"Register as system service"，设置远程访问密码
2. 开放防火墙端口 5900：
   ```powershell
   netsh advfirewall firewall add rule name="VNC" dir=in action=allow protocol=TCP localport=5900
   ```
3. 添加服务器时选择 **Windows** 类型，填写 VNC 端口（默认 5900）和 VNC 密码
4. 进入服务器详情页，点击「远程桌面」即可在浏览器操作 Windows 图形界面

远程桌面支持：全屏模式 / Ctrl+Alt+Del 快捷键 / 剪贴板同步

> **提示**：Windows 服务器也可安装 OpenSSH Server，从而同时支持 SSH 终端 + VNC 远程桌面两种连接方式。

---

## 生产部署

### 推荐架构（单机）

```
用户浏览器
    │ HTTPS (443)
    ▼
Nginx（SSL 终止 + 静态资源托管 + Gzip 压缩）
    │ HTTP (5000)
    ▼
Node.js 应用（PM2 进程守护）
    │
    ▼
SQLite（data/cloudops.db）
```

### 关键步骤

```bash
# 1. 服务器安装 Node.js 20 LTS + pnpm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g pnpm pm2

# 2. 部署代码并构建
git clone <repository-url> /var/www/cloudops && cd /var/www/cloudops
pnpm install
pnpm build

# 3. 设置生产环境变量（.env.production）
# 务必修改 JWT_SECRET 为强随机字符串！

# 4. PM2 启动 + 开机自启
pm2 start pnpm --name "cloudops" -- start
pm2 save && pm2 startup

# 5. 配置 Nginx 反向代理 + SSL（Let's Encrypt 免费证书）
```

### 上线前检查清单

- [ ] `JWT_SECRET` 已修改为强随机字符串（≥ 32 字符）
- [ ] Nginx 已配置 SSL 证书（HTTPS 强制跳转）
- [ ] 防火墙已正确配置（仅开放 80 / 443）
- [ ] PM2 已配置开机自启（`pm2 startup && pm2 save`）
- [ ] `data/` 目录已配置定期备份（`cp -r data/ backup/`）
- [ ] 默认管理员密码已修改
- [ ] Nginx `client_max_body_size` 已配置（匹配 `MAX_UPLOAD_SIZE`）
- [ ] 日志轮转已配置（`pm2 install pm2-logrotate`）

> 详细部署步骤参见 `docs/03-部署运维文档.md`。

---

## 数据管理

### 数据存储位置

| 内容 | 路径 | 说明 |
|------|------|------|
| 数据库 | `data/cloudops.db` | 所有结构化数据（用户 / 文件记录 / 服务器 / 团队） |
| 上传文件 | `data/uploads/` | 按文件内容哈希去重存储 |

### 备份

```bash
# 快速备份（直接复制 data 目录）
cp -r data/ /backup/cloudops-$(date +%Y%m%d)/

# SQLite 在线热备份
sqlite3 data/cloudops.db ".backup /backup/cloudops.db"
```

> **重要**：`data/` 目录包含所有用户数据，部署时请妥善配置数据卷和定期备份。

---

## 常见问题

**Q：数据库文件在哪里？**  
A：`data/cloudops.db`，首次启动时自动创建并执行迁移。

**Q：上传的文件存储在哪里？**  
A：`data/uploads/`，采用文件内容哈希命名，相同内容的文件只存储一份。

**Q：如何修改用户存储配额？**  
A：管理员在「用户管理」页面为单个用户调整，或在「系统设置」修改全局默认配额。

**Q：回收站文件保留多久？**  
A：默认 30 天自动清理，也可在回收站页面手动恢复或彻底删除。

**Q：忘记管理员密码怎么办？**  
A：⚠️ 删除 `data/cloudops.db` 后重启服务，系统会自动创建初始管理员账号——此操作将清除**所有**数据，操作前请确认已备份。

**Q：Windows 服务器 SSH 连接失败？**  
A：Windows 默认不带 SSH 服务，需要安装 OpenSSH Server，或改用 VNC 远程桌面连接方式。

**Q：VNC 连接失败怎么排查？**  
A：依次确认：① 服务器已安装 VNC 服务并在运行；② 防火墙已开放 5900 端口；③ 填写的 VNC 密码正确；④ CloudOps 服务器可以访问目标 IP 的 5900 端口。

**Q：分享链接打开提示"已失效"？**  
A：确认：① 文件未被删除（回收站中的文件无法访问分享链接）；② 分享链接未超过有效期；③ 下载次数未达到上限。

**Q：`pnpm install` 在 Windows 上报编译错误？**  
A：安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)，勾选"Desktop development with C++"，重新运行 `pnpm install`。

---

## 浏览器兼容性

| Chrome | Firefox | Safari | Edge |
|:------:|:-------:|:------:|:----:|
| >= 90 | >= 90 | >= 14 | >= 90 |

> VNC 远程桌面需要 Canvas 2D API 支持，所有现代浏览器均已支持。

---

## 后续规划

- [ ] 微信 / 企业微信告警推送
- [ ] 支持阿里云 / 腾讯云 API 对接（免 Agent 读取云资源）
- [ ] 移动端适配（PWA）
- [ ] 实时 WebSocket 服务器状态推送
- [ ] 多租户隔离（企业多部门场景）
- [ ] Kubernetes 容器化部署支持
- [ ] 审计日志增强（合规报表导出）

---

## 文档索引

| 文档 | 路径 | 说明 |
|------|------|------|
| 架构设计文档 | `docs/01-架构设计文档.md` | 系统架构、技术选型、数据库设计 |
| API 接口文档 | `docs/02-API接口文档.md` | 全部 REST API，含请求 / 响应示例 |
| 部署运维文档 | `docs/03-部署运维文档.md` | 环境要求、部署步骤、故障排查、回滚方案 |
| 设计规范 | `DESIGN.md` | UI 设计语言、组件规范 |
| 技术架构 | `TECHNICAL.md` | 关键模块技术实现细节 |

---

