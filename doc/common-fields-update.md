# 公共字段更新说明

## 🔄 更新内容

已成功更新每个事件的公共字段映射规则，现在每个事件都包含以下7个公共字段：

## 📋 公共字段列表

1. **event_name** - 事件名称
2. **contract_address** - 合约地址  
3. **transaction_hash** - 交易哈希
4. **block_number** - 区块号
5. **log_index** - 日志索引
6. **timestamp** - 时间戳
7. **chain** - 链名称

## 🔧 修改的文件

### 1. Step2.tsx
- 更新了 `getDefaultMappingRulesForEvent` 函数中的 `commonRules` 数组
- 现在包含完整的7个公共字段映射规则

### 2. Step1.tsx  
- 确保 `parseEventParams` 函数中的 `baseFields` 与公共字段保持一致

### 3. abi-event-parsing-summary.md
- 更新了文档中的映射规则示例
- 添加了公共字段的详细说明

## 📊 映射规则结构

每个事件现在都会自动生成以下结构的映射规则：

```json
{
  "event_name": "Transfer",
  "mapping_rules": [
    // 7个公共字段
    {
      "source_key": "event_name",
      "target_key": "event_name", 
      "transformer": null
    },
    {
      "source_key": "contract_address",
      "target_key": "contract_address",
      "transformer": null
    },
    {
      "source_key": "transaction_hash", 
      "target_key": "transaction_hash",
      "transformer": null
    },
    {
      "source_key": "block_number",
      "target_key": "block_number",
      "transformer": null
    },
    {
      "source_key": "log_index",
      "target_key": "log_index", 
      "transformer": null
    },
    {
      "source_key": "timestamp",
      "target_key": "timestamp",
      "transformer": null
    },
    {
      "source_key": "chain",
      "target_key": "chain",
      "transformer": null
    },
    // 事件特定参数（从ABI解析）
    {
      "source_key": "args.from",
      "target_key": "from",
      "transformer": null
    },
    {
      "source_key": "args.to", 
      "target_key": "to",
      "transformer": null
    },
    {
      "source_key": "args.value",
      "target_key": "value", 
      "transformer": null
    }
  ]
}
```

## ✅ 优势

1. **标准化**: 所有事件都有统一的公共字段结构
2. **完整性**: 包含区块链事件的所有基础信息
3. **一致性**: 字段名称与目标字段名称保持一致，便于理解
4. **灵活性**: 用户可以根据需要修改transformer

## 🎯 使用效果

- 每个事件标签页都会显示7个公共字段 + 该事件的ABI参数
- 公共字段为所有事件提供统一的基础数据结构
- 简化了数据处理和分析流程

现在每个事件的映射规则都包含完整的区块链事件基础信息！
