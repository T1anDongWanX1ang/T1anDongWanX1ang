import Box from '../components/Box'
import { Link } from 'react-router-dom'
import { useAppState, KafkaProducer } from '../../state/AppState'
import { useState, useEffect } from 'react'

export default function Step3() {
	const { components, updateComponent, currentPipelineId } = useAppState()
	const [isLoading, setIsLoading] = useState(false)
	const [validationMessage, setValidationMessage] = useState('')
	const [bootstrapServers, setBootstrapServers] = useState('')
	const [topic, setTopic] = useState('')
	const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')

	// 从全局 components 中恢复数据
	useEffect(() => {
		if (!currentPipelineId) {
			// 没有选中管道时，清空表单
			setBootstrapServers('')
			setTopic('')
			setValidationMessage('')
			setConnectionStatus('idle')
			return
		}

		// 从全局 components 中查找 kafka_producer 类型的组件
		const kafkaProducerComponent = components.find((c: any) => c.type === 'kafka_producer')
		
		if (kafkaProducerComponent) {
			console.log('🔄 从全局 components 恢复 Step3 数据:', kafkaProducerComponent)
			
			// 恢复表单数据
			setBootstrapServers(kafkaProducerComponent.bootstrap_servers || '')
			setTopic(kafkaProducerComponent.topic || '')
			
			setValidationMessage(`✅ 已从管道 ${currentPipelineId} 自动加载Kafka配置\nBootstrap Servers: ${kafkaProducerComponent.bootstrap_servers || 'N/A'}\nTopic: ${kafkaProducerComponent.topic || 'N/A'}`)
			
			setTimeout(() => {
				setValidationMessage('')
			}, 8000)
		} else {
			// 没有找到对应组件，清空表单
			setBootstrapServers('')
			setTopic('')
			
			if (components.length === 0) {
				setValidationMessage('📝 当前管道暂无配置数据，请开始配置')
			} else {
				setValidationMessage('📝 当前管道没有Kafka Producer组件，请开始配置')
			}
			
			setTimeout(() => {
				setValidationMessage('')
			}, 3000)
		}
	}, [components, currentPipelineId])

	// 验证表单数据
	const validateForm = () => {
		if (!bootstrapServers.trim()) {
			setValidationMessage('❌ 请输入Bootstrap Servers')
			return false
		}
		
		if (!topic.trim()) {
			setValidationMessage('❌ 请输入Topic名称')
			return false
		}
		
		// 验证Bootstrap Servers格式（简单验证）
		const serverPattern = /^[a-zA-Z0-9.-]+:\d+$/
		const servers = bootstrapServers.split(',').map(s => s.trim())
		const invalidServers = servers.filter(server => !serverPattern.test(server))
		
		if (invalidServers.length > 0) {
			setValidationMessage(`❌ Bootstrap Servers格式错误: ${invalidServers.join(', ')}\n正确格式: host:port 或 host1:port1,host2:port2`)
			return false
		}
		
		// 验证Topic名称格式（简单验证）
		const topicPattern = /^[a-zA-Z0-9._-]+$/
		if (!topicPattern.test(topic)) {
			setValidationMessage('❌ Topic名称格式错误，只能包含字母、数字、点、下划线和连字符')
			return false
		}
		
		return true
	}

	// 测试Kafka连接
	const testKafkaConnection = async () => {
		if (!validateForm()) return
		
		setConnectionStatus('testing')
		setIsLoading(true)
		
		try {
			// 这里可以调用实际的Kafka连接测试API
			// const response = await api.kafka.testConnection({
			//     bootstrap_servers: bootstrapServers,
			//     topic: topic
			// })
			
			// 模拟API调用
			await new Promise(resolve => setTimeout(resolve, 2000))
			
			// 模拟成功响应
			setConnectionStatus('success')
			setValidationMessage('✅ Kafka连接测试成功！')
			
			setTimeout(() => {
				setValidationMessage('')
				setConnectionStatus('idle')
			}, 3000)
		} catch (error) {
			console.error('Kafka connection test failed:', error)
			setConnectionStatus('error')
			setValidationMessage('❌ Kafka连接测试失败，请检查配置')
			
			setTimeout(() => {
				setValidationMessage('')
				setConnectionStatus('idle')
			}, 5000)
		} finally {
			setIsLoading(false)
		}
	}

	// 保存Kafka Producer配置
	const handleSaveKafkaConfig = async (event?: React.MouseEvent) => {
		if (!validateForm()) {
			// 如果验证失败且是从Link点击触发的，阻止跳转
			if (event) {
				event.preventDefault()
			}
			return
		}
		
		setIsLoading(true)
		try {
			// 组装 KafkaProducer 数据
			const kafkaProducerComponent: KafkaProducer = {
				name: "step3",
				type: "kafka_producer",
				bootstrap_servers: bootstrapServers.trim(),
				topic: topic.trim()
			}
			
			// 根据 name 更新或添加 KafkaProducer 到全局 components
			updateComponent("step3", kafkaProducerComponent)
			
			// 检查是否是更新还是新增
			const existingComponent = components.find(c => c.name === "step3")
			const action = existingComponent ? "更新" : "添加"
			
			setValidationMessage(`✅ Kafka Producer配置保存成功！\n已${action}到全局组件列表\nBootstrap Servers: ${bootstrapServers.trim()}\nTopic: ${topic.trim()}`)
			
			// 调试信息：显示当前 components 状态
			console.log('🎯 Step3 保存成功!')
			console.log('当前 components 列表:', components)
			console.log(`${action}的 KafkaProducer:`, kafkaProducerComponent)
			console.log('📋 全局components中的kafka_producer:', components.find(c => c.type === 'kafka_producer'))
			
			// 延迟跳转到下一步
			setTimeout(() => {
				// 这里可以添加跳转逻辑
			}, 1500)
		} catch (error) {
			setValidationMessage('❌ 保存失败，请重试')
			// 如果保存失败且是从Link点击触发的，阻止跳转
			if (event) {
				event.preventDefault()
			}
		} finally {
			setIsLoading(false)
		}
	}

	// 清空表单
	const handleClearForm = () => {
		setBootstrapServers('')
		setTopic('')
		setValidationMessage('')
		setConnectionStatus('idle')
	}

	// 获取连接状态颜色
	const getConnectionStatusColor = () => {
		switch (connectionStatus) {
			case 'testing': return 'text-blue-600'
			case 'success': return 'text-green-600'
			case 'error': return 'text-red-600'
			default: return 'text-gray-600'
		}
	}

	// 获取连接状态图标
	const getConnectionStatusIcon = () => {
		switch (connectionStatus) {
			case 'testing': return '🔄'
			case 'success': return '✅'
			case 'error': return '❌'
			default: return '🔌'
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Step 3: Kafka Producer</h2>
				<div className="text-sm text-gray-600">
					Step 3: Kafka生产者配置
				</div>
			</div>

			{/* Kafka配置 */}
			<Box title="Kafka Producer Configuration" right={
				<button 
					className="btn btn-secondary" 
					onClick={handleClearForm}
					disabled={isLoading}
				>
					Clear
				</button>
			}>
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Bootstrap Servers *
						</label>
						<input 
							type="text" 
							className="input w-full" 
							placeholder="localhost:9092 或 broker1:9092,broker2:9092"
							value={bootstrapServers}
							onChange={(e) => setBootstrapServers(e.target.value)}
						/>
						<div className="mt-1 text-xs text-gray-500">
							Kafka集群的Bootstrap服务器地址，多个地址用逗号分隔
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Topic *
						</label>
						<input 
							type="text" 
							className="input w-full" 
							placeholder="my-topic"
							value={topic}
							onChange={(e) => setTopic(e.target.value)}
						/>
						<div className="mt-1 text-xs text-gray-500">
							消息发送的目标Topic名称
						</div>
					</div>

					{/* 连接状态显示 */}
					<div className="flex items-center gap-2">
						<span className={`text-sm font-medium ${getConnectionStatusColor()}`}>
							{getConnectionStatusIcon()} 连接状态: 
							{connectionStatus === 'idle' && ' 未测试'}
							{connectionStatus === 'testing' && ' 测试中...'}
							{connectionStatus === 'success' && ' 连接成功'}
							{connectionStatus === 'error' && ' 连接失败'}
						</span>
					</div>
				</div>
			</Box>

			{/* 连接测试 */}
			<Box title="Connection Test">
				<div className="space-y-4">
					<div className="text-sm text-gray-600">
						在保存配置前，建议先测试Kafka连接以确保配置正确
					</div>
					
					<button 
						className="btn btn-secondary"
						onClick={testKafkaConnection}
						disabled={isLoading || !bootstrapServers.trim() || !topic.trim()}
					>
						{connectionStatus === 'testing' ? '测试中...' : '测试连接'}
					</button>
				</div>
			</Box>

			{/* 验证消息 */}
			{validationMessage && (
				<div className={`p-4 rounded-lg ${
					validationMessage.includes('✅') ? 'bg-green-50 text-green-700' : 
					validationMessage.includes('❌') ? 'bg-red-50 text-red-700' :
					'bg-blue-50 text-blue-700'
				}`}>
					<pre className="whitespace-pre-wrap">{validationMessage}</pre>
				</div>
			)}

			{/* 操作按钮 */}
			<div className="flex gap-3">
				<button 
					className="btn" 
					onClick={handleSaveKafkaConfig}
					disabled={isLoading}
				>
					{isLoading ? '保存中...' : 'Save Kafka Config'}
				</button>
				<Link 
					to="/step-4" 
					className="btn btn-secondary"
					onClick={handleSaveKafkaConfig}
				>
					Continue to Step 4
				</Link>
			</div>

			{/* 配置预览 - 从 components 中获取数据 */}
			{(() => {
				const kafkaProducerComponent = components.find((c: any) => c.type === 'kafka_producer')
				return kafkaProducerComponent && (
					<Box title="Current Kafka Configuration" right={
						<span className="text-xs text-gray-500 bg-green-100 px-2 py-1 rounded">
							从管道 {currentPipelineId} 加载
						</span>
					}>
						<div className="space-y-2">
							{/* 组件名称 */}
							<div className="flex items-center justify-between py-1 border-b border-gray-100">
								<span className="text-sm font-medium text-gray-700">Component Name</span>
								<span className="text-sm text-gray-900 font-medium">
									{kafkaProducerComponent.name || '-'}
								</span>
							</div>

							{/* 组件类型 */}
							<div className="flex items-center justify-between py-1 border-b border-gray-100">
								<span className="text-sm font-medium text-gray-700">Component Type</span>
								<span className="text-sm text-gray-900 px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
									{kafkaProducerComponent.type || '-'}
								</span>
							</div>

							{/* Bootstrap Servers */}
							<div className="flex items-start justify-between py-1 border-b border-gray-100">
								<span className="text-sm font-medium text-gray-700">Bootstrap Servers</span>
								<span className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded max-w-xs break-all text-right">
									{kafkaProducerComponent.bootstrap_servers || '-'}
								</span>
							</div>

							{/* Topic */}
							<div className="flex items-start justify-between py-1">
								<span className="text-sm font-medium text-gray-700">Topic</span>
								<span className="text-sm text-gray-900 bg-gray-50 px-2 py-1 rounded max-w-xs break-all text-right">
									{kafkaProducerComponent.topic || '-'}
								</span>
							</div>
						</div>
					</Box>
				)
			})()}
		</div>
	)
}
