# Step3 Kafka Producer 集成测试

## 功能验证清单

### 1. 新Step3组件创建 ✅
- [x] 创建了新的Step3.tsx文件
- [x] 实现了Kafka Producer配置界面
- [x] 包含bootstrap_servers和topic两个必填字段
- [x] 添加了表单验证逻辑
- [x] 实现了连接测试功能（模拟）

### 2. 步骤重命名 ✅
- [x] 原Step3 → Step4 (Mapping Validation)
- [x] 原Step4 → Step5 (SQL Editor & Test Run)  
- [x] 原Step5 → Step6 (数据摄入配置)

### 3. 路由更新 ✅
- [x] 在main.tsx中添加了Step6的路由
- [x] 更新了所有步骤的导航链接
- [x] 确保路由链条完整：step-1 → step-2 → step-3 → step-4 → step-5 → step-6

### 4. 类型定义 ✅
- [x] 在AppState.tsx中添加了KafkaProducer类型
- [x] 包含name、type、bootstrap_servers、topic字段

### 5. 自动填充功能 ✅
- [x] Step3能够从全局components中恢复kafka_producer类型的组件
- [x] 当选择管道时自动填充bootstrap_servers和topic
- [x] 显示加载状态和恢复信息

## 测试步骤

1. **启动应用**
   ```bash
   npm run dev
   ```

2. **测试新Step3组件**
   - 访问 http://localhost:5173/step-3
   - 验证Kafka Producer配置界面显示正常
   - 测试表单验证功能
   - 测试保存配置功能

3. **测试自动填充功能**
   - 在左侧菜单点击任意管道
   - 导航到Step3页面
   - 验证是否能从管道配置中自动加载Kafka配置

4. **测试步骤导航**
   - 从Step1开始，依次导航到Step6
   - 验证所有导航链接正确
   - 验证步骤标题和内容正确

## 预期结果

- ✅ 新的Step3 Kafka Producer组件正常工作
- ✅ 所有步骤重命名正确
- ✅ 路由和导航链接正确
- ✅ 自动填充功能正常
- ✅ 类型定义完整

## 组件结构

```
Step1: Define Data Plan (Event Monitor)
Step2: Upload Template & Edit Fields (Dict Mapper)  
Step3: Kafka Producer (NEW - bootstrap_servers, topic)
Step4: Mapping Validation (原Step3)
Step5: SQL Editor & Test Run (原Step4)
Step6: Data Ingestion (原Step5)
```

## 数据流程

1. 用户点击左侧管道 → 调用 `/api/v1/pipeline/config/{pipeline_id}`
2. 返回的components数据填充到全局状态
3. Step1自动恢复event_monitor组件数据
4. Step2自动恢复dict_mapper组件数据  
5. **Step3自动恢复kafka_producer组件数据** (新增)
6. 用户可以继续配置或修改

## 注意事项

- Step3的组件名称固定为"step3"
- 组件类型为"kafka_producer"
- 支持从管道配置中自动恢复数据
- 包含基本的表单验证和连接测试功能
