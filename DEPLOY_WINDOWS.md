# CloudOps Windows Server 部署指南

## 环境要求

| 软件 | 最低版本 | 说明 |
|------|---------|------|
| Node.js | 20.x LTS | [下载地址](https://nodejs.org/) |
| pnpm | 8.x+ | 包管理器 |
| Git | 2.x | 可选，用于代码更新 |

---

## 方式一：全新部署（推荐）

### 第 1 步：安装 Node.js

下载并安装 Node.js LTS：https://nodejs.org/

安装完成后打开 CMD 验证：
```cmd
node -v
npm -v
```

### 第 2 步：安装 pnpm

```cmd
npm install -g pnpm
pnpm -v
```

### 第 3 步：上传项目

将整个项目文件夹复制到服务器，例如 `C:\CloudOps`。

目录结构应为：
```
C:\CloudOps\
├── src\
├── public\
├── package.json
├── next.config.ts
├── start.bat          ← 启动脚本
└── ...
```

### 第 4 步：配置环境变量

在项目根目录创建 `.env` 文件：

```env
COZE_PROJECT_ENV=PROD
PORT=4000
JWT_SECRET=这里换成你自己的随机密钥至少32位
```

**生成随机密钥方法**（PowerShell）：
```powershell
-join ((65..90)+(97..122)+(48..57) | Get-Random -Count 48 | % {[char]$_})
```

### 第 5 步：安装依赖

```cmd
cd C:\CloudOps
pnpm install
```

> 如果报错 `only-allow pnpm`，确保使用的是 pnpm 而不是 npm。

### 第 6 步：构建项目

```cmd
pnpm run build:win
```

构建过程约 1-3 分钟，完成后会生成 `.next/` 和 `dist/` 目录。

### 第 7 步：启动服务

**测试启动**（看到成功信息后 Ctrl+C 停止）：
```cmd
set PORT=4000
set COZE_PROJECT_ENV=PROD
node dist\server.js
```

看到 `Server listening at http://localhost:4000` 即成功。

**双击启动**：直接双击 `start.bat` 文件。

### 第 8 步：验证

浏览器打开 http://localhost:4000 ，使用 `admin / admin12345` 登录。

---

## 方式二：注册为 Windows 服务（开机自启）

使用 [NSSM](https://nssm.cc/) 将应用注册为 Windows 服务，实现开机自动启动。

### 1. 下载 NSSM

下载地址：https://nssm.cc/download

解压后将 `nssm.exe` 放到 `C:\Windows\System32\` 或任意 PATH 目录。

### 2. 注册服务

```cmd
nssm install CloudOps
```

在弹出的 GUI 中填写：

| 字段 | 值 |
|------|-----|
| **Path** | `C:\Program Files\nodejs\node.exe` |
| **Arguments** | `C:\CloudOps\dist\server.js` |
| **Startup directory** | `C:\CloudOps` |

切换到 **I/O** 标签页：

| 字段 | 值 |
|------|-----|
| **Output (stdout)** | `C:\CloudOps\logs\stdout.log` |
| **Error (stderr)** | `C:\CloudOps\logs\stderr.log` |

切换到 **Environment** 标签页，添加环境变量：

```
COZE_PROJECT_ENV=PROD
PORT=4000
JWT_SECRET=你的密钥
```

### 3. 启动服务

```cmd
nssm start CloudOps
```

### 4. 常用服务管理命令

```cmd
nssm start CloudOps       # 启动
nssm stop CloudOps        # 停止
nssm restart CloudOps     # 重启
nssm status CloudOps      # 查看状态
nssm edit CloudOps        # 编辑配置
nssm remove CloudOps      # 删除服务
```

---

## 配置外网访问

### 方案 A：Nginx 反向代理（推荐）

#### 1. 安装 Nginx

下载：http://nginx.org/en/download.html

解压到 `C:\nginx`

#### 2. 配置反向代理

编辑 `C:\nginx\conf\nginx.conf`：

```nginx
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;

    # 限制上传文件大小为 2GB
    client_max_body_size 2048m;

    server {
        listen       80;
        server_name  your-domain.com;  # 改为你的域名或IP

        location / {
            proxy_pass http://127.0.0.1:4000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # WebSocket 支持（用于SSH终端）
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_read_timeout 86400;
        }
    }
}
```

#### 3. 启动 Nginx

```cmd
cd C:\nginx
start nginx
```

#### 4. 配置 HTTPS（可选）

使用 [Let's Encrypt](https://letsencrypt.org/) + [win-acme](https://www.win-acme.com/) 获取免费证书：

1. 下载 win-acme：https://www.win-acme.com/
2. 运行 `wacs.exe`
3. 按提示输入域名，自动获取并安装证书

### 方案 B：frp 内网穿透

适用于没有公网 IP 的场景。

#### 1. 准备一台有公网 IP 的服务器

在公网服务器上部署 frps（frp 服务端），配置 `frps.toml`：

```toml
bindPort = 7000
auth.token = "your-frp-token"
```

#### 2. Windows 服务器配置 frpc

下载 frp：https://github.com/fatedier/frp/releases

编辑 `frpc.toml`：

```toml
serverAddr = "你的公网服务器IP"
serverPort = 7000
auth.token = "your-frp-token"

[[proxies]]
name = "cloudops"
type = "tcp"
localIP = "127.0.0.1"
localPort = 4000
remotePort = 4000
```

#### 3. 启动 frpc

```cmd
frpc -c frpc.toml
```

#### 4. 将 frpc 也注册为 Windows 服务

```cmd
nssm install FrpClient "C:\frp\frpc.exe" "-c C:\frp\frpc.toml"
nssm start FrpClient
```

---

## Windows 防火墙放行

```cmd
REM 放行 4000 端口（CloudOps 主服务）
netsh advfirewall firewall add rule name="CloudOps" dir=in action=allow protocol=TCP localport=4000

REM 放行 80 端口（Nginx）
netsh advfirewall firewall add rule name="Nginx HTTP" dir=in action=allow protocol=TCP localport=80

REM 放行 443 端口（HTTPS）
netsh advfirewall firewall add rule name="Nginx HTTPS" dir=in action=allow protocol=TCP localport=443
```

---

## 数据备份

### 手动备份

```cmd
REM 停止服务
nssm stop CloudOps

REM 备份数据库和上传文件
xcopy C:\CloudOps\data D:\Backup\CloudOps\data\ /E /I /Y
xcopy C:\CloudOps\data\uploads D:\Backup\CloudOps\uploads\ /E /I /Y

REM 重启服务
nssm start CloudOps
```

### 自动备份（Windows 计划任务）

创建 `backup.bat`：
```cmd
@echo off
set BACKUP_DIR=D:\Backup\CloudOps\%date:~0,10%
mkdir "%BACKUP_DIR%" 2>nul
copy C:\CloudOps\data\cloudops.db "%BACKUP_DIR%\" /Y
xcopy C:\CloudOps\data\uploads "%BACKUP_DIR%\uploads\" /E /I /Y
echo Backup completed: %BACKUP_DIR%
```

添加计划任务（每天凌晨 2 点）：
```cmd
schtasks /create /tn "CloudOps Backup" /tr "C:\CloudOps\backup.bat" /sc daily /st 02:00 /ru SYSTEM
```

---

## 日常运维

### 更新代码

```cmd
cd C:\CloudOps
git pull                    # 如果用 Git 管理
pnpm install                # 更新依赖
pnpm run build:win          # 重新构建
nssm restart CloudOps       # 重启服务
```

### 查看日志

```cmd
REM 查看应用日志
type C:\CloudOps\logs\stdout.log

REM 查看错误日志
type C:\CloudOps\logs\stderr.log

REM 实时查看（PowerShell）
Get-Content C:\CloudOps\logs\stdout.log -Wait -Tail 50
```

### 数据库管理

数据库文件位置：`C:\CloudOps\data\cloudops.db`

使用 [DB Browser for SQLite](https://sqlitebrowser.org/) 可视化管理。

### 重置管理员密码

```cmd
cd C:\CloudOps
node -e "const db=require('better-sqlite3')('./data/cloudops.db');const bcrypt=require('bcryptjs');const hash=bcrypt.hashSync('admin12345',10);db.prepare('UPDATE users SET password_hash=? WHERE username=?').run(hash,'admin');console.log('Password reset to admin12345')"
```

---

## 常见问题

### Q: 端口被占用
```cmd
REM 查看端口占用
netstat -ano | findstr :4000
REM 结束占用进程
taskkill /PID 进程号 /F
```

### Q: better-sqlite3 原生模块报错
```cmd
REM 重新编译原生模块
pnpm rebuild better-sqlite3
```

### Q: 上传大文件失败
- 检查 Nginx 的 `client_max_body_size` 设置
- 检查 Next.js 的 `bodyParser` 限制（已在 API 中配置为无限制）

### Q: 服务启动后立即停止
- 检查日志文件 `logs\stderr.log`
- 确认 `.env` 文件配置正确
- 确认 `dist\server.js` 文件存在
