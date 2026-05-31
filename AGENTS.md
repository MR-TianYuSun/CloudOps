# 项目上下文

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

## 目录结构

```
├── public/                 # 静态资源 (含桌面背景图 bg-1~4)
├── scripts/                # 构建与启动脚本
│   ├── build.sh            # 构建脚本
│   ├── dev.sh              # 开发环境启动脚本
│   ├── prepare.sh          # 预处理脚本
│   └── start.sh            # 生产环境启动脚本
├── src/
│   ├── app/                # 页面路由与布局
│   │   ├── (main)/         # 主布局页面 (云盘、设置等)
│   │   ├── s/[code]/       # 分享页面 (文件+文件夹分享)
│   │   └── api/            # API 路由
│   │       ├── auth/       # 认证 (登录/注册/验证)
│   │       ├── files/      # 文件操作 (上传/下载/删除/搜索/回收站)
│   │       ├── shares/     # 分享管理 (含文件夹ZIP下载)
│   │       ├── skills/     # Skill 平台 (CRUD/执行/历史/导入导出)
│   │       ├── system-settings/ # 系统设置
│   │       └── users/      # 用户管理
│   ├── components/
│   │   ├── desktop/        # 桌面系统组件
│   │   │   └── apps/       # 桌面应用 (SkillPlatform 等)
│   │   └── ui/             # Shadcn UI 组件库
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/
│   │   ├── auth.ts         # JWT 认证工具
│   │   ├── coze-llm.ts     # LLM 调用封装 (eval('require')绕过Turbopack)
│   │   ├── db.ts           # SQLite 数据库 + schema + 迁移
│   │   └── utils.ts        # 通用工具函数 (cn)
│   └── server.ts           # 自定义服务端入口
├── next.config.ts          # Next.js 配置 (含 serverExternalPackages)
├── package.json            # 项目依赖管理
└── tsconfig.json           # TypeScript 配置
```

- 项目文件（如 app 目录、pages 目录、components 等）默认初始化到 `src/` 目录下。

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

### 编码规范

- 默认按 TypeScript `strict` 心智写代码；优先复用当前作用域已声明的变量、函数、类型和导入，禁止引用未声明标识符或拼错变量名。
- 禁止隐式 `any` 和 `as any`；函数参数、返回值、解构项、事件对象、`catch` 错误在使用前应有明确类型或先完成类型收窄，并清理未使用的变量和导入。

### next.config 配置规范

- 配置的路径不要写死绝对路径，必须使用 path.resolve(__dirname, ...)、import.meta.dirname 或 process.cwd() 动态拼接。

### Hydration 问题防范

1. 严禁在 JSX 渲染逻辑中直接使用 typeof window、Date.now()、Math.random() 等动态数据。**必须使用 'use client' 并配合 useEffect + useState 确保动态内容仅在客户端挂载后渲染**；同时严禁非法 HTML 嵌套（如 <p> 嵌套 <div>）。
2. **禁止使用 head 标签**，优先使用 metadata，详见文档：https://nextjs.org/docs/app/api-reference/functions/generate-metadata
   1. 三方 CSS、字体等资源可在 `globals.css` 中顶部通过 `@import` 引入或使用 next/font
   2. preload, preconnect, dns-prefetch 通过 ReactDOM 的 preload、preconnect、dns-prefetch 方法引入
   3. json-ld 可阅读 https://nextjs.org/docs/app/guides/json-ld

## UI 设计与组件规范 (UI & Styling Standards)

- 模板默认预装核心组件库 `shadcn/ui`，位于`src/components/ui/`目录下
- Next.js 项目**必须默认**采用 shadcn/ui 组件、风格和规范，**除非用户指定用其他的组件和规范。**

## 核心功能模块

### 文件管理
- 上传/下载/搜索/回收站/批量操作
- 文件夹创建、移动、递归删除
- 存储配额检查 (上传时校验 max_upload_size + storage_used)
- 永久删除时自动扣减 storage_used

### 分享系统
- 文件分享：生成分享链接+提取码
- 文件夹分享：显示子文件列表 + ZIP 打包下载 (archiver v7)
- API: POST /api/shares/[code]/download 支持递归打包

### Skill 平台
- 三种类型：prompt (LLM调用)、script (JS沙箱执行)、automation (步骤工作流)
- 执行引擎：prompt 使用 coze-coding-dev-sdk (通过 eval('require') 绕过 Turbopack CJS 限制)
- script 类型：生成临时 JS 文件通过 child_process.execSync 执行
- 模板变量替换：支持 {{input}} 和任意 {{varName}} 从 extraParams 取值
- 执行历史：skill_runs 表记录每次执行
- 公共 Skill 发现：scope=public 查询公共 Skill
- 文件类型关联：fileCategory 参数推荐关联 Skill
- 导入/导出：action=import/export JSON 配置
- 云盘"标记为 Skill"：弹出配置弹窗创建 Skill

### 桌面系统
- 桌面背景轮播：4张背景图，5秒间隔切换，淡入淡出过渡
- 桌面应用：SkillPlatform、文件管理器等
- AppRegistry/AppRenderer 管理桌面应用注册和渲染

### 系统设置
- allow_registration / require_approval / max_upload_size / default_quota / system_name / upload_dir
- 所有设置项已验证生效

## 注意事项

- **coze-coding-dev-sdk**: CJS 模块，在 Turbopack 环境下必须通过 `eval('require')` 加载，不能直接 import
- **archiver**: 使用 v7，v8 API 不兼容
- **DB 迁移**: ALTER TABLE 语句用于增量添加列，已存在时会跳过
- **JWT**: 统一使用 lib/auth.ts 的 generateToken/verifyToken，禁止单独创建密钥
