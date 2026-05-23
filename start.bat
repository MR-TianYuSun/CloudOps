@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion
REM ============================================
REM   CloudOps Windows 启动脚本
REM   双击运行或命令行执行: start.bat
REM ============================================

cd /d %~dp0

REM 设置环境变量
set COZE_PROJECT_ENV=PROD
set PORT=4000

REM 加载 .env 文件
if exist .env (
    for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
        set "line=%%a"
        if not "!line:~0,1!"=="#" (
            set "%%a=%%b"
        )
    )
)

REM 确保数据目录存在
if not exist data mkdir data
if not exist data\uploads mkdir data\uploads

echo.
echo   ========================================
echo     CloudOps 云盘+服务器管理一体化平台
echo     http://localhost:%PORT%
echo     默认账号: admin / admin12345
echo   ========================================
echo.

REM 启动服务
node dist\server.js
pause
