# 前后端API集成文档

## 概述

本项目已成功集成后端API服务，用于字段解析、模板上传、数据验证等功能。后端服务地址：`http://192.168.50.94:8001`

## 🚀 已集成的功能

### 1. 字段解析API (`/api/v1/parse-fields`)

**功能描述**：根据链配置和合约信息，AI自动解析字段映射规则

**请求参数**：
```typescript
{
  chain_name: string,           // 链名称 (ethereum, solana, bsc, base)
  contract_address: string,     // 合约地址
  abi_path: string,            // ABI文件路径
  events_to_monitor: string[], // 要监控的事件列表
  mode: 'realtime' | 'batch',  // 监控模式
  poll_interval?: number        // 轮询间隔
}
```

**响应格式**：
```typescript
{
  success: boolean,
  data: {
    fields: Array<{
      source_key: string,      // 源字段名
      target_key: string,      // 目标字段名
      transformer: string,     // 转换规则
      description: string      // 字段描述
    }>,
    message: string
  }
}
```

### 2. 模板上传API (`/api/v1/upload-template`)

**功能描述**：上传Excel/CSV模板文件，自动解析字段结构

**请求参数**：
```typescript
{
  file: File,                  // 模板文件
  chain_name: string,          // 链名称
  protocol_type: string        // 协议类型
}
```

**响应格式**：
```typescript
{
  success: boolean,
  data: {
    parsed_fields: Array<{
      source_key: string,      // 源字段名
      target_key: string,      // 目标字段名
      transformer: string,     // 转换规则
      description: string      // 字段描述
    }>,
    message: string
  }
}
```

### 3. 字段建议API (`/api/v1/field-suggestions`)

**功能描述**：根据链和协议类型获取字段映射建议

**请求参数**：
```
GET /api/v1/field-suggestions?chain_name={chainName}&protocol_type={protocolType}
```

### 4. 映射验证API (`/api/v1/validate-mapping`)

**功能描述**：验证字段映射规则的有效性

**请求参数**：
```typescript
{
  mapping_rules: Array<{
    source_key: string,        // 源字段名
    target_key: string,        // 目标字段名
    transformer: string        // 转换规则
  }>
}
```

## 🔧 前端使用方法

### Step2组件中的集成

在Step2组件中，我们已经集成了以下功能：

1. **AI字段解析**：点击"AI解析"按钮，自动调用后端解析API
2. **模板文件上传**：支持Excel/CSV文件上传，自动解析字段
3. **字段建议获取**：点击"获取建议"按钮，获取智能字段建议
4. **实时验证**：字段映射规则的实时验证和错误提示

### 使用示例

```typescript
import { fieldParsingAPI } from '../../services/api'

// AI解析字段
const handleAIParsing = async () => {
  try {
    const response = await fieldParsingAPI.parseFields({
      chain_name: 'ethereum',
      contract_address: '0x...',
      abi_path: '/abis/erc20.json',
      events_to_monitor: ['Transfer'],
      mode: 'realtime'
    })
    
    if (response.success) {
      // 处理解析结果
      response.data.fields.forEach(field => {
        addMappingRule(protocolId, {
          sourceKey: field.source_key,
          targetKey: field.target_key,
          transformer: field.transformer
        })
      })
    }
  } catch (error) {
    console.error('AI解析失败:', error)
  }
}
```

## 🌍 环境配置

### 开发环境
- API地址：`http://192.168.50.94:8001`
- 超时时间：30秒
- 重试次数：3次
- 调试模式：开启

### 生产环境
- API地址：`https://api.yourdomain.com`
- 超时时间：60秒
- 重试次数：5次
- 调试模式：关闭

### 修改配置

如需修改API配置，请编辑 `src/config/environment.ts` 文件：

```typescript
export const ENV_CONFIG = {
  development: {
    apiBaseUrl: 'http://your-new-api-url:port',
    apiTimeout: 30000,
    apiRetryAttempts: 3,
    enableDebug: true,
    logLevel: 'debug'
  }
  // ... 其他环境配置
}
```

## 📊 支持的转换器

前端支持以下字段转换器：

- `-`：无转换
- `to_lowercase`：转小写
- `to_uppercase`：转大写
- `to_int`：转整数
- `to_float`：转浮点数
- `normalize_by_decimals`：按精度标准化
- `hex_to_address`：十六进制转地址
- `timestamp_to_date`：时间戳转日期

## 🔍 错误处理

### HTTP状态码映射
- `400`：请求参数错误
- `401`：未授权访问
- `403`：禁止访问
- `404`：接口不存在
- `500`：服务器内部错误
- `502`：网关错误
- `503`：服务不可用
- `504`：网关超时

### 重试机制
- 自动重试失败的请求
- 指数退避策略
- 可配置重试次数

## 🧪 测试建议

1. **网络连接测试**：确保前端能访问 `192.168.50.94:8001`
2. **API接口测试**：使用Postman或curl测试各个接口
3. **文件上传测试**：测试Excel/CSV文件上传功能
4. **错误处理测试**：测试各种错误情况的处理

## 📝 注意事项

1. **CORS配置**：确保后端已正确配置CORS，允许前端域名访问
2. **文件大小限制**：注意上传文件的大小限制
3. **网络超时**：根据网络环境调整超时时间
4. **错误日志**：开启调试模式查看详细的API调用日志

## 🔗 相关文件

- `src/services/api.ts` - API服务层
- `src/config/api.ts` - API配置
- `src/config/environment.ts` - 环境配置
- `src/ui/steps/Step2.tsx` - Step2组件（已集成API）
- `src/state/AppState.tsx` - 应用状态管理

## 📞 技术支持

如遇到API集成问题，请检查：
1. 网络连接是否正常
2. 后端服务是否启动
3. API地址是否正确
4. 请求参数格式是否正确
5. 浏览器控制台是否有错误信息
