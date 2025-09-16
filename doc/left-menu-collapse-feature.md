# 左侧菜单收起功能

## 🔄 更新说明

已成功实现左侧菜单的收起/展开功能，用户可以通过点击收起按钮来节省屏幕空间，提高工作效率。

## 📋 主要功能

### 1. 收起/展开状态管理 ✅

**新增状态**：
```typescript
const [isCollapsed, setIsCollapsed] = useState(false)
```

**动态宽度调整**：
```typescript
className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 flex flex-col h-full transition-all duration-300`}
```

### 2. 收起按钮设计 ✅

**按钮位置**：
- 位于头部区域右侧
- 与标题并排显示
- 收起时居中显示

**按钮样式**：
```typescript
<button
	onClick={() => setIsCollapsed(!isCollapsed)}
	className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
	title={isCollapsed ? "展开菜单" : "收起菜单"}
>
	<svg className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} 
		 fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
	</svg>
</button>
```

### 3. 响应式菜单项 ✅

**展开状态**：
```typescript
// 显示完整内容：图标 + 名称 + 描述
<div className="flex items-center gap-3">
	<span className="text-lg">{item.icon}</span>
	<div>
		<div className="font-medium text-sm">{item.name}</div>
		<div className="text-xs text-gray-500">{item.description}</div>
	</div>
</div>
```

**收起状态**：
```typescript
// 只显示图标，居中对齐
<div className="flex justify-center">
	<span className="text-lg">{item.icon}</span>
</div>
```

### 4. 条件渲染优化 ✅

**头部标题**：
```typescript
{!isCollapsed && <h2 className="text-lg font-semibold text-gray-800">管理中心</h2>}
```

**底部信息**：
```typescript
{!isCollapsed && (
	<div className="p-4 border-t border-gray-200">
		<div className="text-xs text-gray-500">
			{components.length} components configured
		</div>
	</div>
)}
```

**工具提示**：
```typescript
title={isCollapsed ? item.name : ''}
```

## 🎯 用户体验优化

### 1. 平滑动画效果
- **宽度过渡**：`transition-all duration-300`
- **图标旋转**：收起按钮箭头180度旋转
- **内容切换**：平滑的显示/隐藏过渡

### 2. 视觉反馈
- **悬停效果**：按钮和菜单项都有悬停状态
- **状态指示**：收起按钮图标方向表示当前状态
- **工具提示**：收起时显示菜单项名称

### 3. 空间优化
- **收起宽度**：从 `w-64` (256px) 缩减到 `w-16` (64px)
- **空间节省**：节省 200px 宽度，为主内容区域提供更多空间
- **功能保持**：收起时仍可正常点击菜单项

## 🔧 技术实现

### CSS类设计
```css
/* 动态宽度 */
w-16    /* 收起状态：64px */
w-64    /* 展开状态：256px */

/* 过渡动画 */
transition-all duration-300    /* 所有属性300ms过渡 */
transition-transform duration-300    /* 图标旋转过渡 */

/* 布局调整 */
flex justify-center    /* 收起时图标居中 */
flex items-center gap-3    /* 展开时内容对齐 */
```

### 状态逻辑
```typescript
// 切换状态
const toggleCollapse = () => setIsCollapsed(!isCollapsed)

// 条件渲染
{isCollapsed ? <CollapsedContent /> : <ExpandedContent />}

// 动态样式
className={`${isCollapsed ? 'collapsed-style' : 'expanded-style'}`}
```

## 🎨 界面效果

### 展开状态 (256px宽度)
```
┌─────────────────────────────────┐
│ 管理中心                    ← │
├─────────────────────────────────┤
│ ⚙️  配置管理                   │
│     管道和链配置               │
├─────────────────────────────────┤
│ 📄  ABI管理                    │
│     智能合约ABI文件            │
├─────────────────────────────────┤
│ 🗄️  数据库管理                │
│     数据库连接配置             │
├─────────────────────────────────┤
│ 3 components configured        │
└─────────────────────────────────┘
```

### 收起状态 (64px宽度)
```
┌─────┐
│  →  │
├─────┤
│ ⚙️  │
├─────┤
│ 📄  │
├─────┤
│ 🗄️  │
└─────┘
```

## ✅ 功能特点

### 1. 智能收起
- **一键切换**：单击按钮即可收起/展开
- **状态记忆**：在会话期间保持收起状态
- **图标导航**：收起时仍可通过图标识别功能

### 2. 无损功能
- **完整功能**：收起时所有菜单项仍可正常点击
- **工具提示**：悬停显示完整菜单名称
- **视觉反馈**：选中状态和悬停效果保持

### 3. 响应式设计
- **自适应布局**：主内容区域自动调整宽度
- **平滑过渡**：所有状态变化都有动画效果
- **一致体验**：与整体设计风格保持一致

## 🔍 使用场景

1. **小屏幕设备**：在较小屏幕上节省空间
2. **专注工作**：收起菜单减少干扰，专注主要内容
3. **快速切换**：通过图标快速识别和切换功能
4. **多任务处理**：为Tab内容提供更大显示空间

现在左侧菜单支持收起功能，用户可以根据需要灵活调整界面布局，提高工作效率！
