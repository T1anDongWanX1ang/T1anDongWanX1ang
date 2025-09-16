# 多事件配置 API 集成文档

## 🔄 更新说明

已更新 config 接口以支持新的多事件数据结构。现在 `dict_mapper` 类型的组件使用 `dict_mappers` 字段，支持多个事件的独立映射规则配置。

## 📋 新的数据结构

### DictMapper 组件结构
```typescript
interface DictMapper {
  name: string
  type: "dict_mapper"
  dict_mappers: EventMappingRule[]
}

interface EventMappingRule {
  event_name: string
  mapping_rules: DictMappingRule[]
}

interface DictMappingRule {
  source_key: string
  target_key: string
  transformer?: string | null
}
```

## 🚀 API 调用示例

### 保存多事件配置到管道

```typescript
import { api } from '../services/api'

const savePipelineWithMultiEventConfig = async () => {
  try {
    const pipelineInfo = {
      pipeline_name: "Multi-Event Pipeline",
      description: "支持多事件映射的管道配置",
      components: [
        {
          name: "step1",
          type: "event_monitor",
          chain_name: "ethereum",
          contract_address: "0x1234567890123456789012345678901234567890",
          abi_path: "/path/to/contract.abi.json",
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
                  source_key: "blockNumber",
                  target_key: "block_number",
                  transformer: "to_int"
                },
                {
                  source_key: "transactionHash",
                  target_key: "tx_hash",
                  transformer: "to_lowercase"
                },
                                 {
                   source_key: "args.from",
                   target_key: "sender_address",
                   transformer: "to_lowercase"
                 },
                 {
                   source_key: "args.to",
                   target_key: "receiver_address",
                   transformer: "to_lowercase"
                 },
                 {
                   source_key: "args.value",
                   target_key: "transfer_amount_wei",
                   transformer: null
                 },
                 {
                   source_key: "args.value",
                   target_key: "transfer_amount_ether",
                   transformer: "wei_to_ether"
                 }
              ]
            },
            {
              event_name: "Approval",
              mapping_rules: [
                {
                  source_key: "blockNumber",
                  target_key: "block_number",
                  transformer: "to_int"
                },
                {
                  source_key: "transactionHash",
                  target_key: "tx_hash",
                  transformer: "to_lowercase"
                },
                                 {
                   source_key: "args.owner",
                   target_key: "token_owner",
                   transformer: "to_lowercase"
                 },
                 {
                   source_key: "args.spender",
                   target_key: "approved_spender",
                   transformer: "to_lowercase"
                 },
                 {
                   source_key: "args.value",
                   target_key: "approved_amount_wei",
                   transformer: null
                 },
                 {
                   source_key: "args.value",
                   target_key: "approved_amount_ether",
                   transformer: "wei_to_ether"
                 }
              ]
            }
          ]
        },
        {
          name: "step3",
          type: "kafka_producer",
          bootstrap_servers: "localhost:9092",
          topic: "multi-event-topic"
        }
      ]
    }

    const response = await api.pipeline.saveConfig({
      pipeline_id: 123,
      pipeline_info: JSON.stringify(pipelineInfo)
    })

    if (response.success) {
      console.log('✅ 多事件管道配置保存成功!')
      console.log(`Pipeline ID: ${response.pipeline_id}`)
      console.log(`创建组件数: ${response.components_created}`)
    }
  } catch (error) {
    console.error('❌ 保存失败:', error)
  }
}
```

## 🔍 主要变更

### 1. Step6.tsx 更新
- 更新了 `dict_mapper` 组件的数据结构处理
- 从 `mapping_rules` 改为 `dict_mappers`

### 2. 数据结构变更
- **旧结构**: `{ type: "dict_mapper", mapping_rules: [...] }`
- **新结构**: `{ type: "dict_mapper", dict_mappers: [{ event_name: "Transfer", mapping_rules: [...] }] }`

### 3. 字段简化
- 移除了 `condition` 字段
- 移除了 `default_value` 字段
- 保留核心的 `source_key`、`target_key` 和 `transformer` 字段

### 4. 向后兼容性
- 保持了 API 接口的一致性
- 只是内部数据结构的变更，不影响外部调用方式

## 📊 支持的转换器类型

- `to_int`: 转换为整数
- `to_lowercase`: 转换为小写
- `to_uppercase`: 转换为大写
- `wei_to_ether`: Wei 转换为 Ether
- `timestamp_to_date`: 时间戳转日期
- `null`: 无转换

## 🎯 使用场景

1. **ERC-20 代币合约**: 支持 Transfer 和 Approval 事件的独立映射
2. **DEX 协议**: 支持 Swap、Mint、Burn 等多种事件类型
3. **NFT 合约**: 支持 Transfer、Approval、ApprovalForAll 等事件
4. **DeFi 协议**: 支持各种复杂的事件组合

## ✅ 测试验证

可以使用项目根目录下的 `test-multi-event-config.json` 文件来测试新的数据结构：

```bash
# 在 Step 2 中使用导入功能加载测试配置
# 然后在 Step 6 中保存到管道配置
```

## 🎨 UI 界面更新

- 移除了 Condition 和 Default Value 列
- 简化了映射规则表格，只保留核心字段
- 保持了多事件标签页的功能

这样就完成了对多事件配置的完整 API 支持，同时简化了数据结构！