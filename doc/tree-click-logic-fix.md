# 树形结构点击逻辑修复

## 🐛 问题描述

在重构后的树形结构中，点击逻辑存在以下问题：
1. 管道节点点击后没有跳转到Step1页面
2. 点击逻辑可能同时触发展开和管道点击操作
3. 左侧菜单和右侧Tab系统的点击逻辑不一致

## 🔧 修复内容

### 1. 添加导航功能 ✅

**RightTabSystem.tsx**:
```typescript
// 添加导航hook
import { useNavigate } from 'react-router-dom'

const RightTabSystem = forwardRef<{ openTab: (type: TabType) => void }, {}>((props, ref) => {
	const navigate = useNavigate()
	// ...
})
```

### 2. 修复管道点击逻辑 ✅

**修复前**:
```typescript
const handlePipelineClick = async (pipelineId: number) => {
	// 设置当前管道ID
	setCurrentPipeline(pipelineId)
	// 尝试加载管道配置
	await loadPipelineConfig(pipelineId)
	// 这里不跳转，而是在当前Tab中显示配置 ❌
}
```

**修复后**:
```typescript
const handlePipelineClick = async (pipelineId: number) => {
	try {
		console.log('🔄 点击管道，ID:', pipelineId)
		
		// 设置当前管道ID
		setCurrentPipeline(pipelineId)
		
		// 尝试加载管道配置
		await loadPipelineConfig(pipelineId)
		
		// 跳转到Step1页面 ✅
		navigate('/step-1')
	} catch (error) {
		console.error('❌ 处理管道点击失败:', error)
		// 即使出错也跳转，但组件数据会是空的
		navigate('/step-1')
	}
}
```

### 3. 优化点击优先级 ✅

**修复前**:
```typescript
onClick={() => {
	if (hasChildren) {
		toggleChainExpansion(`node-${node.id}`)
	}
	if (node.type === 'pipeline') {
		handlePipelineClick(node.id) // 可能同时触发展开和点击
	}
}}
```

**修复后**:
```typescript
onClick={() => {
	if (node.type === 'pipeline') {
		handlePipelineClick(node.id) // 优先处理管道点击
	} else if (hasChildren) {
		toggleChainExpansion(`node-${node.id}`) // 其次处理展开
	}
}}
```

### 4. 统一左右两侧逻辑 ✅

确保 `LeftDataNav.tsx` 和 `RightTabSystem.tsx` 中的树形结构点击逻辑完全一致。

## 🎯 修复效果

### 点击行为优化：
1. **管道节点点击**：
   - 加载管道配置
   - 跳转到Step1页面
   - 设置当前管道状态

2. **分类节点点击**：
   - 展开/收起子节点
   - 不触发其他操作

3. **操作按钮**：
   - Edit按钮：直接触发管道编辑
   - +按钮：显示创建管道输入框

### 用户体验改进：
- **明确的操作反馈**：点击管道后立即跳转
- **避免冲突操作**：不会同时触发多个操作
- **一致的交互**：左右两侧行为完全一致

## 🔍 测试场景

1. **点击分类节点**：
   - ✅ 应该展开/收起子节点
   - ✅ 不应该跳转页面

2. **点击管道节点**：
   - ✅ 应该加载管道配置
   - ✅ 应该跳转到Step1页面
   - ✅ 应该设置当前管道状态

3. **点击操作按钮**：
   - ✅ Edit按钮应该触发管道编辑
   - ✅ +按钮应该显示创建输入框

## 📋 技术细节

### 点击优先级：
1. **管道类型** → 触发管道点击处理
2. **有子节点** → 触发展开/收起
3. **其他情况** → 无操作

### 错误处理：
- 管道配置加载失败时仍然跳转
- 控制台输出详细错误信息
- 保证用户操作的连续性

现在树形结构的点击逻辑已经完全修复，用户可以正常使用管道配置功能！
