# Git仓库设置指南

由于当前环境中Git没有正确安装，请按照以下步骤手动设置：

## 1. 安装Git

### 方法1: 从官网下载
1. 访问 [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. 下载并安装最新版本的Git for Windows
3. 安装时选择默认选项即可

### 方法2: 使用包管理器
```bash
# 如果有chocolatey
choco install git

# 或使用winget (需要重新启动terminal)
winget install --id Git.Git -e --source winget
```

## 2. 初始化Git仓库

安装Git后，在项目目录(`C:\Users\Ash1na\.cursor`)中运行：

```bash
# 初始化Git仓库
git init

# 配置用户信息（首次使用需要）
git config --global user.name "T1anDongWanX1ang"
git config --global user.email "your-email@example.com"

# 添加远程仓库
git remote add origin https://github.com/T1anDongWanX1ang/T1anDongWanX1ang.git

# 添加所有文件
git add .

# 提交代码
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

# 推送到GitHub
git branch -M main
git push -u origin main
```

## 3. 验证上传

运行以下命令验证：
```bash
git status
git remote -v
git log --oneline
```

## 4. 后续开发工作流

```bash
# 查看状态
git status

# 添加修改的文件
git add .

# 提交更改
git commit -m "描述你的更改"

# 推送到GitHub
git push
```

## 项目文件结构

当前项目包含以下主要文件：
- `src/` - 源代码目录
- `package.json` - 项目依赖和脚本
- `README.md` - 项目文档
- `.gitignore` - Git忽略文件配置
- `vite.config.ts` - Vite配置
- `tailwind.config.js` - TailwindCSS配置

## 注意事项

1. 确保你有GitHub账户的写入权限
2. 如果仓库是私有的，可能需要设置SSH密钥或Personal Access Token
3. 首次推送可能需要登录GitHub账户

## 故障排除

如果遇到问题：
1. 检查网络连接
2. 确认GitHub仓库URL正确
3. 验证Git配置：`git config --list`
4. 检查远程仓库：`git remote -v`
