import Box from '../components/Box'
import { Link } from 'react-router-dom'
import { useAppState } from '../../state/AppState'
import { useState, useEffect, useRef } from 'react'
import { api, fieldParsingAPI } from '../../services/api'
import type { PipelineLatestTaskResponse } from '../../services/api'

export default function Step6() {
	const { components, currentPipelineId } = useAppState()
	const [isLoading, setIsLoading] = useState(false)
	

	const [saveMessage, setSaveMessage] = useState('')
	
	// Flink任务相关状态
	const [flinkStartResult, setFlinkStartResult] = useState<{
		success: boolean
		data: any
		message?: string
		timestamp?: string
	} | null>(null)
	const [flinkStartLoading, setFlinkStartLoading] = useState(false)
	const [flinkJobDetailUrl, setFlinkJobDetailUrl] = useState<string | null>(null)
	const [flinkJobId, setFlinkJobId] = useState<string | null>(null)

	const [saveResult, setSaveResult] = useState<{
		success: boolean
		pipeline_id: number
		components_created: number
		message: string
	} | null>(null)
	const [pipelineTree, setPipelineTree] = useState<any[]>([])
	const [currentPipelineName, setCurrentPipelineName] = useState('')
	const [taskStatus, setTaskStatus] = useState<PipelineLatestTaskResponse['task'] | null>(null)
	const [taskLoading, setTaskLoading] = useState(false)
	const intervalRef = useRef<number | null>(null)
	const logIntervalRef = useRef<number | null>(null)
	const [logModalOpen, setLogModalOpen] = useState(false)
	const [logContent, setLogContent] = useState('')
	const [logLoading, setLogLoading] = useState(false)

	// 监听 Flink 状态变化
	useEffect(() => {
		console.log('🔄 Flink状态变化监听:', {
			loading: flinkStartLoading,
			jobDetailUrl: flinkJobDetailUrl,
			jobId: flinkJobId,
			startResultSuccess: flinkStartResult?.success,
			timestamp: new Date().toLocaleTimeString()
		})
	}, [flinkStartLoading, flinkJobDetailUrl, flinkJobId, flinkStartResult])
	const [logInfo, setLogInfo] = useState<{
		task_id: number
		log_path: string
		total_lines: number
		returned_lines: number
	} | null>(null)

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

	// 查询管道最新任务状态
	const fetchLatestTask = async () => {
		if (!currentPipelineId) {
			setTaskStatus(null)
			return
		}

		console.log('🔍 Step6 fetchLatestTask 调试:', {
			'currentPipelineId': currentPipelineId,
			'typeof currentPipelineId': typeof currentPipelineId
		})

		try {
			setTaskLoading(true)
			const response = await api.pipeline.getLatestTask(currentPipelineId)
			
			if (response.success) {
				setTaskStatus(response.task)
				console.log('📊 最新任务状态:', response.task)
			} else {
				setTaskStatus(null)
				console.log('📝 暂无任务记录')
			}
		} catch (error) {
			console.error('❌ 查询任务状态失败:', error)
			setTaskStatus(null)
		} finally {
			setTaskLoading(false)
		}
	}

	// 定时查询任务状态 (30秒间隔) + 立即查询
	useEffect(() => {
		// 清除之前的定时器
		if (intervalRef.current) {
			clearInterval(intervalRef.current)
		}

		if (currentPipelineId) {
			console.log('🎯 Step6: 检测到管道ID变化或组件挂载，立即查询任务状态')
			// 立即查询一次（包括组件挂载和管道切换）
			fetchLatestTask()
			
			// 设置定时器，每30秒查询一次
			intervalRef.current = setInterval(() => {
				console.log('⏰ 定时查询任务状态...')
				fetchLatestTask()
			}, 30000) // 30秒 = 30000毫秒
			
			console.log('⏰ 已启动任务状态定时查询 (30秒间隔)')
		} else {
			console.log('📝 无管道ID，清空任务状态')
			setTaskStatus(null)
		}

		// 清理函数
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current)
				intervalRef.current = null
				console.log('🛑 已停止任务状态定时查询')
			}
			if (logIntervalRef.current) {
				clearInterval(logIntervalRef.current)
				logIntervalRef.current = null
				console.log('🛑 已停止日志自动刷新')
			}
		}
	}, [currentPipelineId])

	// 保存解析任务 - 执行完整配置保存
	const handleSaveParseTask = async () => {
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
								dict_mappers: component.dict_mappers || []
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

	// 启动解析任务
	const handleStartParseTask = async () => {
		if (!currentPipelineId) {
			setSaveMessage('❌ 请先选择一个管道')
			return
		}

		console.log('🚀 启动解析任务...')
		const parseComponents = components.filter(component => 
			component.type === 'event_monitor' || 
			component.type === 'dict_mapper' || 
			component.type === 'kafka_producer'
		)
		
		if (parseComponents.length === 0) {
			setSaveMessage('❌ 没有可启动的解析任务组件')
			return
		}

		setIsLoading(true)
		setSaveMessage('🔄 正在启动管道...')

		try {
			const response = await api.pipeline.start({
				pipeline_id: currentPipelineId
			})

			if (response.success) {
				setSaveMessage(`✅ 管道启动成功！\nPipeline ID: ${response.pipeline_id}\n状态: ${response.status}\n启动时间: ${response.start_time || '未提供'}\n包含 ${parseComponents.length} 个解析任务组件`)
				console.log('🎉 管道启动成功:', response)
				console.log('📊 启动的解析任务组件:', parseComponents)
				
				// 2秒后查询任务状态
				console.log('⏰ 将在2秒后查询任务状态...')
				setTimeout(() => {
					console.log('🔄 开始查询启动后的任务状态')
					fetchLatestTask()
				}, 2000)
			} else {
				setSaveMessage(`❌ 管道启动失败: ${response.message}`)
			}
		} catch (error) {
			console.error('管道启动失败:', error)
			setSaveMessage(`❌ 启动失败: ${error instanceof Error ? error.message : '未知错误'}`)
		} finally {
			setIsLoading(false)
		}
	}

	// 获取任务信息并设置详情链接
	const fetchJobInfo = async (): Promise<string | null> => {
		console.log('🔍 开始查询任务信息...')
		console.log('⏱️ 查询期间按钮保持启动中状态...')

		try {
			const jobResponse: any = await fieldParsingAPI.getJobInfo()
			console.log('📡 完整接口响应:', JSON.stringify(jobResponse, null, 2))
			
			// 使用 any 类型灵活解析数据
			let actualJobs = null
			
			// 根据实际API返回格式，应该是 jobResponse.data.jobs
			if (jobResponse && jobResponse.success) {
				console.log('✅ 接口调用成功')
				
				// 尝试多种可能的数据路径
				if (jobResponse.data && jobResponse.data.jobs) {
					actualJobs = jobResponse.data.jobs
					console.log('📋 在 data.jobs 中找到任务数组')
				} else if (jobResponse.data && jobResponse.data.data && jobResponse.data.data.jobs) {
					actualJobs = jobResponse.data.data.jobs
					console.log('📋 在 data.data.jobs 中找到任务数组')
				} else if (jobResponse.jobs) {
					actualJobs = jobResponse.jobs
					console.log('📋 在根级别找到任务数组')
				}
			}
			
			console.log('🔍 解析到的任务数组:', actualJobs)
			console.log('🔍 任务数组类型:', typeof actualJobs)
			console.log('🔍 是否为数组:', Array.isArray(actualJobs))
			
			if (!actualJobs || !Array.isArray(actualJobs) || actualJobs.length === 0) {
				console.log('❌ 没有找到有效的任务数组')
				return null
			}

			console.log('✅ 成功找到任务数组，数量:', actualJobs.length)
			console.log('📋 前3个任务预览:', actualJobs.slice(0, 3))
			
			// 取第一个任务
			const firstJob = actualJobs[0]
			console.log('📋 第一个任务完整数据:', JSON.stringify(firstJob, null, 2))
			
			if (!firstJob) {
				console.log('❌ 第一个任务为空')
				return null
			}

			if (!firstJob.job_id) {
				console.log('❌ 第一个任务没有 job_id')
				console.log('🔍 第一个任务的所有属性:', Object.keys(firstJob))
				return null
			}

			console.log('🔍 原始 job_id:', firstJob.job_id)

			// 处理重复的 job_id
			let cleanJobId = firstJob.job_id.trim()
			if (cleanJobId.indexOf(' ') !== -1) {
				cleanJobId = cleanJobId.split(' ')[0].trim()
				console.log('🔧 清理后的 job_id:', cleanJobId)
			}

			// 生成详情链接
			const detailUrl = `http://35.208.145.201:8081/#/job/running/${cleanJobId}/overview`
			console.log('🔗 生成的详情链接:', detailUrl)

			// 立即设置状态
			console.log('📊 即将设置状态...')
			console.log('📊 设置 flinkJobId:', cleanJobId)
			console.log('📊 设置 flinkJobDetailUrl:', detailUrl)
			
			setFlinkJobId(cleanJobId)
			setFlinkJobDetailUrl(detailUrl)
			
			// 强制状态更新并验证
			setTimeout(() => {
				console.log('🔍 验证状态设置结果:')
				console.log('  期望的 jobId:', cleanJobId)
				console.log('  期望的 detailUrl:', detailUrl)
				console.log('  实际的状态会在状态监听器中显示')
			}, 100)
			
			// 强制组件重新渲染
			setFlinkStartResult(prev => prev ? { ...prev } : null)
			
			console.log('✅ 任务信息处理完成，取消loading状态')
			setFlinkStartLoading(false)
			console.log('✅ 按钮应显示"启动任务"并恢复可点击状态')
			return cleanJobId

		} catch (error) {
			console.error('❌ 查询任务信息异常:', error)
			if (error instanceof Error) {
				console.error('❌ 错误堆栈:', error.stack)
			}
			console.log('❌ 查询失败，取消loading状态')
			setFlinkStartLoading(false)
			return null
		}
	}

	// 启动Flink任务
	const startFlinkJob = async () => {
		setFlinkStartLoading(true)
		setFlinkStartResult(null)
		setFlinkJobDetailUrl(null)
		setFlinkJobId(null)

		try {
			console.log('🚀 启动Flink任务...')
			const response = await fieldParsingAPI.startFlinkJob()
			
			const result = {
				...response,
				timestamp: new Date().toLocaleString('zh-CN')
			}
			
			setFlinkStartResult(result)
			
			if (response.success) {
				setSaveMessage(`🚀 Flink任务已成功启动，正在等待任务信息...`)
				
				// 启动成功后，等待15秒查询任务信息 - 期间保持loading状态
				console.log('⏱️ 15秒后查询任务信息，期间按钮保持"启动中"状态...')
				console.log('📅 当前时间:', new Date().toLocaleTimeString())
				setTimeout(async () => {
					console.log('⏰ 15秒到了，开始查询任务信息...')
					console.log('📅 查询时间:', new Date().toLocaleTimeString())
					const result = await fetchJobInfo()
					console.log('📊 fetchJobInfo 返回结果:', result)
					
					// fetchJobInfo 内部会处理 loading 状态的取消
					if (!result) {
						console.log('❌ 任务信息获取失败，取消loading状态')
						setFlinkStartLoading(false)
						setSaveMessage(`❌ 无法获取任务信息`)
					} else {
						setSaveMessage(`✅ Flink任务启动成功！任务ID: ${result}`)
					}
				}, 15000)
			} else {
				setSaveMessage(`❌ Flink任务启动失败: ${response.message || '未知错误'}`)
				setFlinkStartLoading(false)
			}
		} catch (error) {
			console.error('启动Flink任务失败:', error)
			const errorResult = {
				success: false,
				data: null,
				message: error instanceof Error ? error.message : '网络请求失败',
				timestamp: new Date().toLocaleString('zh-CN')
			}
			setFlinkStartResult(errorResult)
			setSaveMessage(`❌ Flink任务启动失败: ${errorResult.message}`)
			setFlinkStartLoading(false)
		}
	}

	// 保存FLINK任务
	const handleSaveFlinkTask = async () => {
		console.log('🔄 保存FLINK任务...')
		const flinkComponents = components.filter(component => 
			component.type !== 'event_monitor' && 
			component.type !== 'dict_mapper' && 
			component.type !== 'kafka_producer'
		)
		
		if (flinkComponents.length === 0) {
			setSaveMessage('❌ 没有可保存的FLINK任务组件')
			return
		}
		
		setSaveMessage(`✅ FLINK任务已保存！共 ${flinkComponents.length} 个组件`)
		console.log('⚡ FLINK任务组件:', flinkComponents)
	}





	// 刷新日志内容（不显示加载状态）
	const refreshLogContent = async (taskId: number) => {
		try {
			const response = await api.pipeline.getTaskLog(taskId)
			
			if (response.success) {
				setLogContent(response.log_content)
				setLogInfo({
					task_id: response.task_id,
					log_path: response.log_path,
					total_lines: response.total_lines,
					returned_lines: response.returned_lines
				})
				console.log('🔄 日志自动刷新成功:', {
					total_lines: response.total_lines,
					returned_lines: response.returned_lines
				})
			} else {
				console.error('❌ 日志自动刷新失败:', response.message)
			}
		} catch (error) {
			console.error('❌ 日志自动刷新异常:', error)
		}
	}

	// 查看日志
	const handleViewLog = async () => {
		if (!taskStatus || !taskStatus.task_id) {
			console.error('❌ 无法获取任务ID')
			return
		}

		console.log('📋 开始查看日志:', {
			task_id: taskStatus.task_id,
			log_path: taskStatus.log_path
		})

		setLogLoading(true)
		setLogModalOpen(true)
		setLogContent('')
		setLogInfo(null)

		try {
			const response = await api.pipeline.getTaskLog(taskStatus.task_id)
			
			if (response.success) {
				setLogContent(response.log_content)
				setLogInfo({
					task_id: response.task_id,
					log_path: response.log_path,
					total_lines: response.total_lines,
					returned_lines: response.returned_lines
				})
				console.log('✅ 日志加载成功:', {
					total_lines: response.total_lines,
					returned_lines: response.returned_lines
				})

				// 启动日志自动刷新（每3秒刷新一次）
				if (logIntervalRef.current) {
					clearInterval(logIntervalRef.current)
				}
				logIntervalRef.current = window.setInterval(() => {
					refreshLogContent(taskStatus.task_id)
				}, 3000)
				console.log('🔄 已启动日志自动刷新，每3秒更新一次')
			} else {
				setLogContent(`加载日志失败: ${response.message}`)
				console.error('❌ 日志加载失败:', response.message)
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : '未知错误'
			setLogContent(`加载日志时发生错误: ${errorMessage}`)
			console.error('❌ 日志加载异常:', error)
		} finally {
			setLogLoading(false)
		}
	}

	// 关闭日志弹出框
	const handleCloseLogModal = () => {
		// 清理日志刷新定时器
		if (logIntervalRef.current) {
			clearInterval(logIntervalRef.current)
			logIntervalRef.current = null
			console.log('🛑 已停止日志自动刷新')
		}
		
		setLogModalOpen(false)
		setLogContent('')
		setLogInfo(null)
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

					<div className="mt-6 space-y-6">
						{/* 已配置解析任务的组件 (Step1, Step2, Step3) */}
						<div>
							<div className="flex items-center justify-between mb-3">
								<div className="flex items-center gap-4">
									<h4 className="text-lg font-medium text-gray-800 flex items-center gap-2">
										<span className="text-blue-600">📊</span>
										已配置解析任务的组件:
									</h4>
									
									{/* 任务状态显示 */}
									<div className="flex items-center gap-2">
										{taskLoading ? (
											<span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full animate-pulse">
												查询中...
											</span>
										) : taskStatus ? (
											<>
												<span className={`px-2 py-1 text-xs rounded-full font-medium ${
													taskStatus.status === 0 ? 'bg-yellow-100 text-yellow-800' :
													taskStatus.status === 1 ? 'bg-blue-100 text-blue-800' :
													taskStatus.status === 2 ? 'bg-red-100 text-red-800' :
													taskStatus.status === 3 ? 'bg-green-100 text-green-800' :
													'bg-gray-100 text-gray-800'
												}`}>
													{taskStatus.status_text}
												</span>
												<button
													onClick={handleViewLog}
													className="px-2 py-1 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700 transition-colors"
													title={`查看日志: ${taskStatus.log_path}`}
												>
													查看日志
												</button>
											</>
										) : (
											<span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
												未启动
											</span>
										)}
									</div>
								</div>
								
								<div className="flex gap-2">
									<button 
										className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										onClick={() => handleSaveParseTask()}
										disabled={isLoading || !currentPipelineId}
									>
										{isLoading ? '保存中...' : '保存配置'}
									</button>
									<button 
										className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										onClick={() => handleStartParseTask()}
										disabled={isLoading || !currentPipelineId}
									>
										{isLoading ? '启动中...' : '启动任务'}
									</button>
								</div>
							</div>
							<div className="space-y-2">
								{components
									.filter(component => 
										component.type === 'event_monitor' || 
										component.type === 'dict_mapper' || 
										component.type === 'kafka_producer'
									)
									.map((component, index) => (
									<div key={`parse-${index}`} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
										<div className="flex items-center gap-3">
											<span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
												{index + 1}
											</span>
											<div>
												<div className="font-medium text-gray-800">{component.name}</div>
												<div className="text-sm text-blue-600">
													{component.type === 'event_monitor' && '事件监控器 (Step1)'}
													{component.type === 'dict_mapper' && '字段映射 (Step2)'}
													{component.type === 'kafka_producer' && 'Kafka生产者 (Step3)'}
												</div>
											</div>
										</div>
										<span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
											解析任务
										</span>
									</div>
								))}
								{components.filter(component => 
									component.type === 'event_monitor' || 
									component.type === 'dict_mapper' || 
									component.type === 'kafka_producer'
								).length === 0 && (
									<div className="p-3 bg-gray-50 rounded-lg text-gray-500 text-center">
										暂无已配置的解析任务组件
									</div>
								)}
							</div>
						</div>

						{/* FLINK任务控制 */}
						<div className="space-y-4">
							<div className="flex items-center justify-between mb-3">
								<h4 className="text-lg font-medium text-gray-800 flex items-center gap-2">
									<span className="text-green-600">⚡</span>
									FLINK任务控制:
								</h4>
							</div>
							
							{/* 启动按钮 */}
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-gray-600">
										{flinkStartLoading ? '正在启动并获取任务信息...' : '点击启动Flink任务'}
									</p>
									<p className="text-xs text-gray-500 mt-1">
										{flinkStartLoading ? '请等待任务启动和信息查询完成' : '启动后将自动查询任务信息并生成详情链接'}
									</p>
								</div>
								<button
									onClick={startFlinkJob}
									disabled={flinkStartLoading}
									className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{flinkStartLoading ? '启动中...' : '启动任务'}
								</button>
							</div>

							{/* Flink启动结果 */}
							{flinkStartResult && (
								<div className={`p-4 rounded-lg ${
									flinkStartResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
								}`}>
									<div className="flex items-center gap-3 mb-3">
										<span className="text-xl">
											{flinkStartResult.success ? '✅' : '❌'}
										</span>
										<div>
											<div className={`font-medium ${
												flinkStartResult.success ? 'text-green-700' : 'text-red-700'
											}`}>
												{flinkStartResult.success ? 'Flink任务启动成功' : 'Flink任务启动失败'}
											</div>
											<div className="text-sm text-gray-500">
												启动时间: {flinkStartResult.timestamp}
											</div>
										</div>
									</div>
									
									{/* 任务详情按钮 - 仅在成功时显示 */}
									{flinkStartResult.success && flinkJobDetailUrl && (
										<div className="flex justify-center mt-4">
											<a
												href={flinkJobDetailUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
											>
												<span>🔍</span>
												任务详情
												<span className="text-xs">↗</span>
											</a>
										</div>
									)}
									
									{/* 调试信息区域 */}
									<div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
																			<div className="text-sm space-y-1">
										<div className="font-medium text-yellow-800">调试信息:</div>
										<div className="text-yellow-700">
											按钮状态: {flinkStartLoading ? '🔄 启动中' : '✅ 可点击'}
										</div>
										<div className="text-yellow-700">
											启动成功: {flinkStartResult?.success ? '✅ 是' : '❌ 否'}
										</div>
										<div className="text-yellow-700">
											详情链接: {flinkJobDetailUrl ? '✅ 已生成' : '❌ 未生成'}
										</div>
										<div className="text-yellow-700">
											任务ID: {flinkJobId || '未获取'}
										</div>
										{flinkJobDetailUrl && (
											<div className="text-xs text-yellow-600 break-all">
												链接: {flinkJobDetailUrl}
											</div>
										)}
									</div>
										
										{/* 手动测试按钮 */}
										<div className="mt-3 flex gap-2">
											<button
												onClick={async () => {
													console.log('🧪 手动测试获取任务信息 - 开始')
													console.log('📅 手动测试时间:', new Date().toLocaleTimeString())
													
													// 手动测试时设置loading状态
													setFlinkStartLoading(true)
													const result = await fetchJobInfo()
													console.log('🧪 手动测试结果:', result)
													
													if (!result) {
														setFlinkStartLoading(false)
													}
													
													console.log('📊 手动测试后的状态:', {
														flinkJobDetailUrl,
														flinkJobId,
														flinkStartResult: flinkStartResult?.success,
														loading: flinkStartLoading
													})
												}}
												disabled={flinkStartLoading}
												className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors disabled:opacity-50"
											>
												{flinkStartLoading ? '查询中...' : '手动获取任务信息'}
											</button>
											<button
												onClick={() => {
													console.log('📊 当前状态:', {
														flinkStartResult,
														flinkJobDetailUrl,
														flinkJobId
													})
												}}
												className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
											>
												打印状态
											</button>
										</div>
									</div>
								</div>
							)}
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
			</div>

			{/* 日志弹出框 */}
			{logModalOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
						{/* 弹出框头部 */}
						<div className="flex items-center justify-between p-4 border-b border-gray-200">
							<div className="flex items-center gap-3">
								<span className="text-xl">📋</span>
								<div>
									<h3 className="text-lg font-semibold text-gray-800">任务日志</h3>
									{logInfo && (
										<p className="text-sm text-gray-600">
											任务ID: {logInfo.task_id} | 路径: {logInfo.log_path}
										</p>
									)}
								</div>
							</div>
							<button
								onClick={handleCloseLogModal}
								className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
							>
								×
							</button>
						</div>

						{/* 日志信息 */}
						{logInfo && (
							<div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
								总行数: {logInfo.total_lines} | 返回行数: {logInfo.returned_lines}
								{logInfo.returned_lines < logInfo.total_lines && (
									<span className="text-orange-600 ml-2">
										(显示部分日志内容)
									</span>
								)}
							</div>
						)}

						{/* 日志内容 */}
						<div className="flex-1 p-4 overflow-hidden">
							{logLoading ? (
								<div className="flex items-center justify-center h-32">
									<div className="flex items-center gap-2 text-gray-600">
										<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
										<span>加载日志中...</span>
									</div>
								</div>
							) : (
								<div className="h-full overflow-auto">
									<pre className="text-sm font-mono bg-gray-900 text-green-400 p-4 rounded-lg whitespace-pre-wrap break-words">
										{logContent || '暂无日志内容'}
									</pre>
								</div>
							)}
						</div>

						{/* 弹出框底部 */}
						<div className="flex justify-end gap-2 p-4 border-t border-gray-200">
							<button
								onClick={handleCloseLogModal}
								className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
							>
								关闭
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}