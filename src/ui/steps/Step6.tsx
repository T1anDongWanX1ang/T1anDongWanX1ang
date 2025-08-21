import Box from '../components/Box'
import { Link } from 'react-router-dom'
import { useAppState } from '../../state/AppState'
import { useState, useEffect } from 'react'
import { api } from '../../services/api'

export default function Step6() {
	const { components, currentPipelineId } = useAppState()
	const [isLoading, setIsLoading] = useState(false)
	const [saveMessage, setSaveMessage] = useState('')
	const [saveResult, setSaveResult] = useState<{
		success: boolean
		pipeline_id: number
		components_created: number
		message: string
	} | null>(null)
	const [pipelineTree, setPipelineTree] = useState<any[]>([])
	const [currentPipelineName, setCurrentPipelineName] = useState('')

	// 获取管道树数据
	useEffect(() => {
		const fetchPipelineTree = async () => {
			try {
				const response = await api.pipeline.getTree()
				if (response.success) {
					setPipelineTree(response.data)
					
					// 查找当前管道的名称
					if (currentPipelineId) {
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
				}
			} catch (error) {
				console.error('Failed to fetch pipeline tree:', error)
			}
		}

		fetchPipelineTree()
	}, [currentPipelineId])

	// 完成配置 - 调用config接口
	const handleCompleteConfiguration = async () => {
		if (!currentPipelineId) {
			setSaveMessage('❌ 请先选择一个管道')
			return
		}

		if (components.length === 0) {
			setSaveMessage('❌ 没有可保存的组件配置')
			return
		}

		setIsLoading(true)
		setSaveMessage('🔄 正在保存管道配置...')

		try {
			// 使用真实数据构建pipeline_info
			const pipelineInfo = {
				pipeline_name: currentPipelineName || `pipeline_${currentPipelineId}`,
				description: `管道配置 - ${currentPipelineName || currentPipelineId}`,
				components: components.map(component => {
					// 根据组件类型处理不同的数据结构
					const baseComponent = {
						name: component.name,
						type: component.type
					}

					// 根据组件类型添加特定字段
					switch (component.type) {
						case 'event_monitor':
							return {
								...baseComponent,
								chain_name: component.chain_name || 'ethereum',
								contract_address: component.contract_address || '',
								abi_path: component.abi_path || '',
								events_to_monitor: component.events_to_monitor || []
							}
						
						case 'dict_mapper':
							return {
								...baseComponent,
								mapping_rules: component.mapping_rules || []
							}
						
						case 'kafka_producer':
							return {
								...baseComponent,
								bootstrap_servers: component.bootstrap_servers || '',
								topic: component.topic || ''
							}
						
						case 'contract_caller':
							return {
								...baseComponent,
								chain_name: component.chain_name || 'ethereum',
								contract_address: component.contract_address || '',
								abi_path: component.abi_path || '',
								method_name: component.method_name || '',
								method_params: component.method_params || []
							}
						
						default:
							// 对于其他类型的组件，直接返回原始数据
							return component
					}
				})
			}

			console.log('🔄 准备保存的管道配置:', pipelineInfo)

			// 调用config接口
			const response = await api.pipeline.saveConfig({
				pipeline_id: currentPipelineId,
				pipeline_info: JSON.stringify(pipelineInfo)
			})

			if (response.success) {
				setSaveResult({
					success: true,
					pipeline_id: response.pipeline_id,
					components_created: response.components_created,
					message: response.message
				})
				setSaveMessage(`✅ 管道配置保存成功！\nPipeline ID: ${response.pipeline_id}\n创建组件数: ${response.components_created}`)
				
				console.log('🎉 管道配置保存成功:', response)
			} else {
				setSaveMessage(`❌ 保存失败: ${response.message}`)
			}
		} catch (error) {
			console.error('管道配置保存失败:', error)
			setSaveMessage(`❌ 保存失败: ${error instanceof Error ? error.message : '未知错误'}`)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Step 6: Complete Configuration</h2>
				<div className="text-sm text-gray-600">
					Step 6: 完成配置并保存
				</div>
			</div>

			{/* 配置概览 */}
			<Box title="Configuration Overview">
				<div className="space-y-4">
					{/* 管道信息 */}
					{currentPipelineName && (
						<div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
							<div className="flex items-center gap-3">
								<span className="text-2xl">🚀</span>
								<div>
									<div className="text-lg font-semibold text-blue-800">
										{currentPipelineName}
									</div>
									<div className="text-sm text-blue-600">
										Pipeline ID: {currentPipelineId}
									</div>
								</div>
							</div>
						</div>
					)}

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="text-center p-4 bg-blue-50 rounded-lg">
							<div className="text-2xl font-bold text-blue-600">{components.length}</div>
							<div className="text-sm text-blue-700">配置的组件</div>
						</div>
						<div className="text-center p-4 bg-green-50 rounded-lg">
							<div className="text-2xl font-bold text-green-600">{currentPipelineId || 0}</div>
							<div className="text-sm text-green-700">当前管道ID</div>
						</div>
						<div className="text-center p-4 bg-purple-50 rounded-lg">
							<div className="text-2xl font-bold text-purple-600">6</div>
							<div className="text-sm text-purple-700">完成的步骤</div>
						</div>
					</div>

					<div className="mt-6">
						<h4 className="text-lg font-medium text-gray-800 mb-3">已配置的组件:</h4>
						<div className="space-y-2">
							{components.map((component, index) => (
								<div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
									<div className="flex items-center gap-3">
										<span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
											{index + 1}
										</span>
										<div>
											<div className="font-medium text-gray-800">{component.name}</div>
											<div className="text-sm text-gray-600">{component.type}</div>
										</div>
									</div>
									<span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
										已配置
									</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</Box>

			{/* 保存结果 */}
			{saveResult && (
				<Box title="Save Result">
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<span className="text-2xl">✅</span>
							<span className="text-lg font-medium text-green-700">配置保存成功！</span>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="p-3 bg-green-50 rounded-lg">
								<div className="text-sm text-green-600">Pipeline ID</div>
								<div className="text-xl font-bold text-green-800">{saveResult.pipeline_id}</div>
							</div>
							<div className="p-3 bg-blue-50 rounded-lg">
								<div className="text-sm text-blue-600">创建组件数</div>
								<div className="text-xl font-bold text-blue-800">{saveResult.components_created}</div>
							</div>
						</div>
						<div className="p-3 bg-gray-50 rounded-lg">
							<div className="text-sm text-gray-600">消息</div>
							<div className="text-gray-800">{saveResult.message}</div>
						</div>
					</div>
				</Box>
			)}

			{/* 保存消息 */}
			{saveMessage && (
				<div className={`p-4 rounded-lg ${
					saveMessage.includes('✅') ? 'bg-green-50 text-green-700' : 
					saveMessage.includes('❌') ? 'bg-red-50 text-red-700' :
					'bg-blue-50 text-blue-700'
				}`}>
					<pre className="whitespace-pre-wrap text-sm">{saveMessage}</pre>
				</div>
			)}

			{/* 操作按钮 */}
			<div className="flex gap-3">
				<Link to="/step-5" className="btn btn-secondary">
					Back to Step 5
				</Link>
				<button 
					className="btn"
					onClick={handleCompleteConfiguration}
					disabled={isLoading || !currentPipelineId}
				>
					{isLoading ? '保存中...' : 'Complete Configuration'}
				</button>
			</div>
		</div>
	)
}