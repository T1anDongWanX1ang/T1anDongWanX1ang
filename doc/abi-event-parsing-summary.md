# ABI 事件参数解析更新总结

## 🔄 更新说明

已成功修改代码，现在事件参数从选中的特定事件的 ABI 中解析，transformer 默认为空，不使用硬编码的默认值。

## 📋 主要修改

### 1. Step1.tsx - 事件参数解析增强

修改了 `parseEventParams` 函数：
- 为每个选中的事件单独解析参数
- 创建事件参数映射表 `eventParamsMap`
- 将映射表存储到 `window.eventParamsMap` 供 Step2 使用

### 2. Step2.tsx - 基于 ABI 的映射规则生成

修改了以下函数：
- `getDefaultMappingRulesForEvent`
- `parseEventParametersFromABI`

新功能：
- 从特定事件的 ABI 参数生成映射规则
- Transformer 默认为 `null`（空）
- 为每个事件添加统一的公共字段映射规则
- 公共字段包括：event_name, contract_address, transaction_hash, block_number, log_index, timestamp, chain

## 🎯 工作流程

### 新流程（基于 ABI）：
1. **Step1**: 用户上传 ABI → 选择事件 → 解析每个事件的具体参数
2. **Step2**: 从 ABI 解析结果获取特定事件参数 → 生成映射规则（transformer 为空）
3. **用户**: 可以手动设置需要的 transformer

## 📊 数据结构

### 事件参数存储（新增）：
```javascript
// 存储在 window.eventParamsMap
{
  "Transfer": ["args.from", "args.to", "args.value"],
  "Approval": ["args.owner", "args.spender", "args.value"],
  "TransferNFT": ["args.from", "args.to", "args.tokenId"],
  "Deposit": ["args.user", "args.depositAmount", "args.timestamp"]
}
```

### 映射规则生成（更新后）：
```json
[
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
```

## 🔧 测试用例

提供的测试 ABI (`test-erc20-abi.json`)：
- **Transfer 事件**: from, to, value
- **Approval 事件**: owner, spender, value  
- **TransferNFT 事件**: from, to, tokenId
- **Deposit 事件**: user, depositAmount, timestamp

## ✅ 关键改进

1. **动态解析**: 不再依赖硬编码的事件参数
2. **精确匹配**: 每个事件使用其实际的 ABI 参数
3. **灵活配置**: Transformer 默认为空，用户可自定义
4. **扩展性强**: 支持任意 ABI 中定义的事件类型

现在系统完全基于实际的 ABI 内容来解析和生成事件参数映射，不再使用任何硬编码的默认值！
