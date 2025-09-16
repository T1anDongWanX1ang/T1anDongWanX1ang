# Pipeline Save Config API 使用示例

## 🔗 API 接口信息

### 请求信息
- **URL**: `/api/v1/pipeline/config`
- **方法**: `POST`
- **Content-Type**: `application/json`

### 请求参数
```typescript
interface PipelineSaveConfigRequest {
  pipeline_id: number
  pipeline_info: string
}
```

### 响应参数
```typescript
interface PipelineSaveConfigResponse {
  success: boolean
  message: string
  pipeline_id: number
  components_created: number
}
```

## 📝 使用示例

### 1. 基本调用
```typescript
import { api } from '../services/api'

// 保存管道配置
const savePipelineConfig = async () => {
  try {
    const request = {
      pipeline_id: 123,
      pipeline_info: JSON.stringify({
        name: "My Pipeline",
        description: "Pipeline description",
        components: [
          {
            name: "step1",
            type: "event_monitor",
            contract_address: "0x123...",
            abi_path: "/path/to/abi.json",
            events_to_monitor: ["Transfer", "Approval"]
          },
          {
            name: "step2", 
            type: "dict_mapper",
            dict_mappers: [
              {
                event_name: "Transfer",
                mapping_rules: [
                  {
                    source_key: "args.from",
                    target_key: "sender_address",
                    transformer: "to_lowercase"
                  },
                  {
                    source_key: "args.to",
                    target_key: "receiver_address",
                    transformer: "to_lowercase"
                  }
                ]
              },
              {
                event_name: "Approval",
                mapping_rules: [
                  {
                    source_key: "args.owner",
                    target_key: "token_owner",
                    transformer: "to_lowercase"
                  },
                  {
                    source_key: "args.spender",
                    target_key: "approved_spender",
                    transformer: "to_lowercase"
                  }
                ]
              }
            ]
          },
          {
            name: "step3",
            type: "kafka_producer", 
            bootstrap_servers: "localhost:9092",
            topic: "my-topic"
          }
        ]
      })
    }
    
    const response = await api.pipeline.saveConfig(request)
    
    if (response.success) {
      console.log('✅ 管道配置保存成功!')
      console.log(`Pipeline ID: ${response.pipeline_id}`)
      console.log(`创建组件数: ${response.components_created}`)
      console.log(`消息: ${response.message}`)
    }
  } catch (error) {
    console.error('❌ 保存失败:', error)
  }
}
```

### 2. 在组件中使用
```typescript
// 在Step组件中保存配置
const handleSavePipelineConfig = async () => {
  const pipelineInfo = {
    pipeline_name: "Data Processing Pipeline",
    description: "Complete data processing workflow",
    components: components, // 来自全局状态
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  try {
    const response = await api.pipeline.saveConfig({
      pipeline_id: currentPipelineId || 0,
      pipeline_info: JSON.stringify(pipelineInfo)
    })
    
    if (response.success) {
      setValidationMessage(`✅ 管道配置保存成功! 创建了 ${response.components_created} 个组件`)
    }
  } catch (error) {
    setValidationMessage('❌ 保存失败，请重试')
  }
}
```

### 3. 错误处理
```typescript
const savePipelineWithErrorHandling = async (pipelineId: number, pipelineInfo: string) => {
  try {
    const response = await api.pipeline.saveConfig({
      pipeline_id: pipelineId,
      pipeline_info: pipelineInfo
    })
    
    return response
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('400')) {
        throw new Error('请求参数错误，请检查pipeline_id和pipeline_info')
      } else if (error.message.includes('500')) {
        throw new Error('服务器内部错误，请稍后重试')
      } else if (error.message.includes('timeout')) {
        throw new Error('请求超时，请检查网络连接')
      }
    }
    throw error
  }
}
```

## 🧪 测试示例

### 测试数据
```json
{
  "pipeline_id": 1,
  "pipeline_info": "{\"name\":\"Test Pipeline\",\"components\":[{\"name\":\"step1\",\"type\":\"event_monitor\"},{\"name\":\"step3\",\"type\":\"kafka_producer\"}]}"
}
```

### 预期响应
```json
{
  "success": true,
  "message": "Pipeline configuration saved successfully",
  "pipeline_id": 1,
  "components_created": 2
}
```

## 🔧 API 特性

- ✅ **自动超时控制**: 使用AbortController实现请求超时
- ✅ **错误处理**: 完整的HTTP状态码错误映射
- ✅ **类型安全**: 完整的TypeScript类型定义
- ✅ **调试支持**: 成功时输出详细日志
- ✅ **统一配置**: 使用全局API配置（超时、重试等）

## 📋 集成到现有流程

这个API可以用于：
1. **Step组件保存**: 各个Step完成配置后保存到后端
2. **批量保存**: 将所有步骤的配置一次性保存
3. **管道导出**: 将完整的管道配置导出到后端存储
4. **配置备份**: 定期备份管道配置数据

新增的API已经完全集成到现有的API架构中，可以通过 `api.pipeline.saveConfig()` 直接调用。
