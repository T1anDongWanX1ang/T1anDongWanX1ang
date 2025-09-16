# Protocol Studio

一个用于区块链协议数据处理和监控的前端应用程序。

## 项目概述

Protocol Studio 是一个现代化的前端应用，专门用于：

- 🔗 **区块链节点配置**: 管理多个区块链网络的RPC连接
- 📊 **数据计划定义**: 配置智能合约监控和ABI解析
- 🔄 **字段映射管理**: 创建和管理数据转换规则
- ✅ **映射验证**: 验证日志格式和字段映射配置
- 💾 **SQL编辑器**: 编写和测试数据查询
- 🚀 **数据摄入配置**: 配置Kafka和Doris数据管道

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: TailwindCSS
- **路由**: React Router DOM
- **状态管理**: React Context API
- **HTTP客户端**: Fetch API
- **开发工具**: ESLint + TypeScript

## 支持的区块链

- Ethereum (ETH)
- Solana (SOL)
- Base
- Binance Smart Chain (BSC)

## 主要功能

### 1. 链配置管理
- RPC和WebSocket端点配置
- 连接测试和状态监控
- 多网络支持（主网/测试网）

### 2. 数据处理流水线
- **Step 1**: 数据计划定义 - 合约地址、ABI文件、事件选择
- **Step 2**: 字段映射规则 - 模板上传、AI解析、映射规则编辑
- **Step 3**: 映射验证 - 日志格式验证、规则验证
- **Step 4**: SQL编辑器 - 查询编写、语法验证、测试执行
- **Step 5**: 摄入配置 - Kafka/Doris配置、连接测试

### 3. AI智能功能
- 智能字段解析
- 字段映射建议
- 配置优化建议

## 快速开始

### 环境要求
- Node.js 18+
- npm/pnpm

### 安装依赖
```bash
pnpm install
```

### 启动开发服务器
```bash
pnpm run dev
```

### 构建生产版本
```bash
pnpm run build
```

## 后端API集成

应用集成了完整的后端API支持：

- **字段解析API**: `/api/v1/parse-fields`
- **模板上传API**: `/api/v1/upload-template`
- **数据验证API**: `/api/v1/validate-mapping`
- **SQL测试API**: `/api/v1/execute-sql-test`
- **连接测试API**: `/api/v1/test-*-connection`

默认后端地址: `http://192.168.50.94:8001`

## 项目结构

```
src/
├── ui/                     # UI组件
│   ├── components/         # 通用组件
│   ├── steps/             # 步骤组件
│   └── RootLayout.tsx     # 布局组件
├── state/                 # 状态管理
│   └── AppState.tsx       # 全局状态
├── services/              # API服务
│   └── api.ts            # API接口
├── config/               # 配置文件
│   ├── api.ts           # API配置
│   └── environment.ts    # 环境配置
├── utils/               # 工具函数
│   └── debug.ts         # 调试工具
└── styles.css           # 样式文件
```

## 开发指南

### 代码规范
- 使用TypeScript进行类型检查
- 遵循ESLint配置规范
- 使用React Hooks模式
- 保持组件功能单一

### 状态管理
项目使用React Context API进行状态管理：
- `AppState`: 全局应用状态
- 包含链、协议、列任务的管理
- 支持数据持久化和状态同步

### API集成
- 统一的错误处理机制
- 请求重试和超时控制
- 环境配置支持
- 调试和监控工具

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

MIT License

## 联系方式

- GitHub: [@T1anDongWanX1ang](https://github.com/T1anDongWanX1ang)
- 项目地址: [https://github.com/T1anDongWanX1ang/T1anDongWanX1ang](https://github.com/T1anDongWanX1ang/T1anDongWanX1ang)

---

⭐ 如果这个项目对你有帮助，请给它一个星标！