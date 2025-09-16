# Step6 真实数据实现

## 🔄 修改内容

### **1. 移除测试数据**
- 不再使用硬编码的USDC转账监控配置
- 改为使用全局`components`中的真实数据

### **2. 动态获取管道名称**
- 从管道树API获取当前管道的名称
- 使用`api.pipeline.getTree()`获取完整的管道树
- 递归查找当前管道ID对应的名称

### **3. 真实数据组装**
```typescript
const pipelineInfo = {
  pipeline_name: currentPipelineName || `pipeline_${currentPipelineId}`,
  description: `管道配置 - ${currentPipelineName || currentPipelineId}`,
  components: components.map(component => {
    // 根据组件类型处理不同的数据结构
    switch (component.type) {
      case 'event_monitor':
        return {
          name: component.name,
          type: component.type,
          chain_name: component.chain_name || 'ethereum',
          contract_address: component.contract_address || '',
          abi_path: component.abi_path || '',
          events_to_monitor: component.events_to_monitor || []
        }
      
      case 'dict_mapper':
        return {
          name: component.name,
          type: component.type,
          mapping_rules: component.mapping_rules || []
        }
      
      case 'kafka_producer':
        return {
          name: component.name,
          type: component.type,
          bootstrap_servers: component.bootstrap_servers || '',
          topic: component.topic || ''
        }
      
      // ... 其他组件类型
    }
  })
}
```

## 🎯 数据来源

### **Pipeline Name**
- **来源**: 管道树节点的`name`字段
- **获取方式**: 调用`api.pipeline.getTree()`，递归查找当前`currentPipelineId`
- **回退方案**: 如果找不到名称，使用`pipeline_${currentPipelineId}`

### **Components**
- **来源**: 全局`components`状态
- **处理方式**: 根据组件类型映射到标准格式
- **支持的组件类型**:
  - `event_monitor`: 事件监控器
  - `dict_mapper`: 字段映射器
  - `kafka_producer`: Kafka生产者
  - `contract_caller`: 合约调用器

## 🔧 实现细节

### **1. 管道树数据获取**
```typescript
useEffect(() => {
  const fetchPipelineTree = async () => {
    try {
      const response = await api.pipeline.getTree()
      if (response.success) {
        setPipelineTree(response.data)
        
        // 递归查找当前管道名称
        const findPipelineById = (nodes: any[]): string => {
          for (const node of nodes) {
            if (node.id === currentPipelineId) {
              return node.name
            }
            if (node.children && node.children.length > 0) {
              const found = findPipelineById(node.children)
              if (found) return found
            }
          }
          return ''
        }
        
        const pipelineName = findPipelineById(response.data)
        setCurrentPipelineName(pipelineName || `pipeline_${currentPipelineId}`)
      }
    } catch (error) {
      console.error('Failed to fetch pipeline tree:', error)
    }
  }

  fetchPipelineTree()
}, [currentPipelineId])
```

### **2. 组件数据映射**
- 每个组件根据其`type`字段进行不同的处理
- 保留组件的`name`和`type`作为基础字段
- 根据组件类型添加特定的配置字段
- 提供默认值以防止数据缺失

### **3. 用户界面增强**
- 显示当前管道的名称和ID
- 实时显示配置的组件数量
- 显示组件的详细信息

## 📋 API调用示例

### **请求数据**
```json
{
  "pipeline_id": 123,
  "pipeline_info": "{\"pipeline_name\":\"My Pipeline\",\"description\":\"管道配置 - My Pipeline\",\"components\":[{\"name\":\"step1\",\"type\":\"event_monitor\",\"chain_name\":\"ethereum\",\"contract_address\":\"0x123...\",\"abi_path\":\"/path/to/abi.json\",\"events_to_monitor\":[\"Transfer\"]},{\"name\":\"step2\",\"type\":\"dict_mapper\",\"mapping_rules\":[...]},{\"name\":\"step3\",\"type\":\"kafka_producer\",\"bootstrap_servers\":\"localhost:9092\",\"topic\":\"my-topic\"}]}"
}
```

### **响应数据**
```json
{
  "success": true,
  "message": "Pipeline configuration saved successfully",
  "pipeline_id": 123,
  "components_created": 3
}
```

## ✅ 功能验证

### **测试步骤**
1. 在左侧菜单选择一个管道
2. 在Step1-3中配置组件
3. 导航到Step6
4. 验证显示的管道名称和组件信息
5. 点击"Complete Configuration"
6. 检查发送的数据是否为真实配置

### **预期结果**
- ✅ 管道名称从树节点获取
- ✅ 组件数据来自全局状态
- ✅ 数据格式正确映射
- ✅ API调用成功
- ✅ 保存结果正确显示

## 🎉 总结

现在Step6的`handleCompleteConfiguration`函数完全使用真实数据：
- **Pipeline Name**: 从管道树节点获取
- **Components**: 从全局components状态获取
- **数据映射**: 根据组件类型正确处理
- **用户体验**: 显示真实的配置信息

不再使用任何硬编码的测试数据，所有配置都来自用户在前面步骤中的实际操作！
