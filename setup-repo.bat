@echo off
echo 正在设置Git仓库...

REM 检查Git是否安装
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: Git未安装或不在PATH中
    echo 请先安装Git: https://git-scm.com/download/win
    pause
    exit /b 1
)

REM 初始化Git仓库（如果还没有）
if not exist .git (
    echo 初始化Git仓库...
    git init
)

REM 设置远程仓库
echo 添加远程仓库...
git remote remove origin 2>nul
git remote add origin https://github.com/T1anDongWanX1ang/T1anDongWanX1ang.git

REM 检查用户配置
git config user.name >nul 2>&1
if %errorlevel% neq 0 (
    echo 请设置Git用户名:
    set /p username="输入您的用户名: "
    git config --global user.name "%username%"
)

git config user.email >nul 2>&1
if %errorlevel% neq 0 (
    echo 请设置Git邮箱:
    set /p email="输入您的邮箱: "
    git config --global user.email "%email%"
)

REM 添加所有文件
echo 添加文件到Git...
git add .

REM 提交
echo 提交代码...
git commit -m "🎉 初始提交：Protocol Studio前端应用

- ✅ React + TypeScript + Vite项目结构
- ✅ TailwindCSS样式系统  
- ✅ 完整的5步数据处理流水线
- ✅ 区块链节点配置管理
- ✅ AI智能字段解析功能
- ✅ SQL编辑器和测试工具
- ✅ Kafka/Doris数据摄入配置
- ✅ 后端API完整集成
- ✅ 调试和错误处理工具"

REM 设置主分支并推送
echo 推送到GitHub...
git branch -M main
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ✅ 成功！代码已推送到GitHub
    echo 仓库地址: https://github.com/T1anDongWanX1ang/T1anDongWanX1ang
) else (
    echo.
    echo ❌ 推送失败，可能需要：
    echo 1. 检查网络连接
    echo 2. 验证GitHub访问权限
    echo 3. 设置Personal Access Token
)

echo.
echo 按任意键退出...
pause >nul
