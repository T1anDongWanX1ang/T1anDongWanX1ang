# Args 前缀更新总结

## 🔄 更新说明

已成功更新事件参数格式，现在所有事件参数都使用 `args.` 前缀，确保与 Step1 中的事件参数解析保持一致。

## 📋 更新内容

### 1. Step1.tsx - 事件参数解析 ✅
- `parseEventParams` 函数已正确实现 `args.${input.name}` 格式
- 从 ABI 解析的事件参数自动添加 `args.` 前缀
- 基础字段保持原格式（如 `event_name`、`block_number` 等）

### 2. Step2.tsx - 默认映射规则 ✅
- 更新了 `getDefaultMappingRulesForEvent` 函数
- Transfer 事件参数：`args.from`、`args.to`、`args.value`
- Approval 事件参数：`args.owner`、`args.spender`、`args.value`

### 3. 测试文件更新 ✅
- `test-multi-event-config.json`
- `test-pipeline-config.json`
- `simplified-multi-event-config.json`

### 4. 文档更新 ✅
- `multi-event-api-integration.md`
- `pipeline-save-api-example.md`

## 🎯 参数格式对比

### 更新前
```json
{
  "source_key": "from",
  "target_key": "sender_address",
  "transformer": "to_lowercase"
}
```

### 更新后
```json
{
  "source_key": "args.from",
  "target_key": "sender_address",
  "transformer": "to_lowercase"
}
```

## 📊 完整的事件参数结构

### 基础字段（无前缀）
- `event_name`
- `contract_address`
- `transaction_hash`
- `block_number`
- `log_index`
- `timestamp`
- `chain`

### 事件参数（args 前缀）
- `args.from` (Transfer 事件)
- `args.to` (Transfer 事件)
- `args.value` (Transfer/Approval 事件)
- `args.owner` (Approval 事件)
- `args.spender` (Approval 事件)

## 🔍 工作流程

1. **Step1**: 用户选择事件 → ABI 解析 → 生成 `args.` 前缀的参数列表
2. **Step2**: 基于 Step1 的参数列表 → 自动生成默认映射规则 → 用户可编辑
3. **Step6**: 保存完整配置到后端 API

## ✅ 验证结果

- ✅ 应用正常运行 (http://localhost:5173)
- ✅ 无语法错误
- ✅ 事件参数格式一致性
- ✅ 多事件配置功能完整
- ✅ 测试文件格式正确

## 🚀 使用示例

### Transfer 事件映射
```json
{
  "event_name": "Transfer",
  "mapping_rules": [
    {
      "source_key": "args.from",
      "target_key": "sender_address",
      "transformer": "to_lowercase"
    },
    {
      "source_key": "args.to", 
      "target_key": "receiver_address",
      "transformer": "to_lowercase"
    },
    {
      "source_key": "args.value",
      "target_key": "transfer_amount_ether",
      "transformer": "wei_to_ether"
    }
  ]
}
```

### Approval 事件映射
```json
{
  "event_name": "Approval",
  "mapping_rules": [
    {
      "source_key": "args.owner",
      "target_key": "token_owner", 
      "transformer": "to_lowercase"
    },
    {
      "source_key": "args.spender",
      "target_key": "approved_spender",
      "transformer": "to_lowercase"
    },
    {
      "source_key": "args.value",
      "target_key": "approved_amount_ether",
      "transformer": "wei_to_ether"
    }
  ]
}
```

现在事件参数格式完全统一，确保了从 Step1 到 Step6 的整个工作流程中数据格式的一致性！
