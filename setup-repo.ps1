# Protocol Studio Git仓库设置脚本
# 使用方法: .\setup-repo.ps1

Write-Host "🚀 正在设置Protocol Studio Git仓库..." -ForegroundColor Cyan

# 检查Git是否安装
try {
    $gitVersion = git --version 2>$null
    Write-Host "✅ Git已安装: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git未安装或不在PATH中" -ForegroundColor Red
    Write-Host "请先安装Git: https://git-scm.com/download/win" -ForegroundColor Yellow
    Read-Host "按Enter键退出"
    exit 1
}

# 初始化Git仓库（如果还没有）
if (-not (Test-Path ".git")) {
    Write-Host "📁 初始化Git仓库..." -ForegroundColor Yellow
    git init
}

# 设置远程仓库
Write-Host "🔗 添加远程仓库..." -ForegroundColor Yellow
git remote remove origin 2>$null
git remote add origin https://github.com/T1anDongWanX1ang/T1anDongWanX1ang.git

# 检查用户配置
$userName = git config user.name 2>$null
if (-not $userName) {
    $userName = Read-Host "请输入您的Git用户名"
    git config --global user.name $userName
}

$userEmail = git config user.email 2>$null
if (-not $userEmail) {
    $userEmail = Read-Host "请输入您的Git邮箱"
    git config --global user.email $userEmail
}

Write-Host "👤 用户配置: $userName <$userEmail>" -ForegroundColor Green

# 显示将要添加的文件
Write-Host "📋 检查项目文件..." -ForegroundColor Yellow
$files = git ls-files --others --exclude-standard
if ($files) {
    Write-Host "将添加以下文件:" -ForegroundColor Cyan
    $files | ForEach-Object { Write-Host "  + $_" -ForegroundColor Gray }
}

# 添加所有文件
Write-Host "📦 添加文件到Git..." -ForegroundColor Yellow
git add .

# 显示状态
$status = git status --porcelain
if ($status) {
    Write-Host "📊 Git状态:" -ForegroundColor Cyan
    git status --short
}

# 提交
Write-Host "💾 提交代码..." -ForegroundColor Yellow
$commitMessage = @"
🎉 初始提交：Protocol Studio前端应用

✨ 功能特性:
- ✅ React + TypeScript + Vite项目结构
- ✅ TailwindCSS样式系统  
- ✅ 完整的5步数据处理流水线
- ✅ 区块链节点配置管理 (ETH, SOL, Base, BSC)
- ✅ AI智能字段解析功能
- ✅ SQL编辑器和测试工具
- ✅ Kafka/Doris数据摄入配置
- ✅ 后端API完整集成
- ✅ 调试和错误处理工具

🛠️ 技术栈:
- React 18 + TypeScript
- Vite + TailwindCSS
- React Router DOM
- Context API状态管理
- Fetch API + 重试机制

📦 项目组件:
- 左侧树形导航 (Chain → Protocol → Column)
- 中间操作区域 (Step 1-5)
- 右侧AI建议面板
- 完整的表单验证和错误处理
"@

git commit -m $commitMessage

# 设置主分支并推送
Write-Host "🚀 推送到GitHub..." -ForegroundColor Yellow
git branch -M main

try {
    git push -u origin main
    Write-Host ""
    Write-Host "🎉 成功！代码已推送到GitHub" -ForegroundColor Green
    Write-Host "📍 仓库地址: https://github.com/T1anDongWanX1ang/T1anDongWanX1ang" -ForegroundColor Cyan
    Write-Host "🌐 在线预览: 等待部署完成" -ForegroundColor Cyan
} catch {
    Write-Host ""
    Write-Host "❌ 推送失败，可能的原因:" -ForegroundColor Red
    Write-Host "1. 网络连接问题" -ForegroundColor Yellow
    Write-Host "2. GitHub访问权限不足" -ForegroundColor Yellow
    Write-Host "3. 需要设置Personal Access Token" -ForegroundColor Yellow
    Write-Host "4. 仓库不存在或无写入权限" -ForegroundColor Yellow
    
    Write-Host ""
    Write-Host "💡 解决方案:" -ForegroundColor Cyan
    Write-Host "1. 检查 https://github.com/T1anDongWanX1ang/T1anDongWanX1ang 是否存在" -ForegroundColor Gray
    Write-Host "2. 确认你有该仓库的写入权限" -ForegroundColor Gray
    Write-Host "3. 考虑使用SSH密钥或Personal Access Token" -ForegroundColor Gray
}

Write-Host ""
Write-Host "📋 后续开发命令:" -ForegroundColor Cyan
Write-Host "  git status          # 查看状态" -ForegroundColor Gray
Write-Host "  git add .           # 添加所有更改" -ForegroundColor Gray
Write-Host "  git commit -m '...' # 提交更改" -ForegroundColor Gray
Write-Host "  git push            # 推送到GitHub" -ForegroundColor Gray

Write-Host ""
Write-Host "完成！按任意键退出..." -ForegroundColor White
Read-Host
