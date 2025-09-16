import React, { useState, useEffect } from 'react'
import { useAppState } from '../../state/AppState'
import { api } from '../../services/api'
import type { PipelineTreeNode, PipelineLatestTaskResponse } from '../../services/api'
import Box from '../components/Box'
import { useToast } from '../components/Toast'

interface ConfigurationItem {
	id: number
	name: string
	description: string
	type: 'pipeline'
	status: 'idle' | 'running' | 'completed' | 'failed'
	lastUpdated: string
	taskInfo?: {
		taskId: number
		statusText: string
		createTime: string
	}
}

interface ConfigManagementProps {
	onEditConfiguration?: (pipelineId: number) => void
}

export default function ConfigurationManagement({ onEditConfiguration }: ConfigManagementProps) {
	const { success, error } = useToast()
	const { setCurrentPipeline, loadPipelineConfig } = useAppState()
	
	// State management
	const [configurations, setConfigurations] = useState<ConfigurationItem[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [filterStatus, setFilterStatus] = useState<string>('all')
	const [sortBy, setSortBy] = useState<'name' | 'status' | 'time'>('time')
	const [searchTerm, setSearchTerm] = useState('')
	
	// Log modal state
	const [logModalOpen, setLogModalOpen] = useState(false)
	const [logContent, setLogContent] = useState('')
	const [logLoading, setLogLoading] = useState(false)
	const [logInfo, setLogInfo] = useState<{
		task_id: number
		log_path: string
		total_lines: number
		returned_lines: number
	} | null>(null)

	// Load configurations from API
	useEffect(() => {
		loadConfigurations()
	}, [])

	const loadConfigurations = async () => {
		setIsLoading(true)
		try {
			// Get pipeline tree structure
			const treeResponse = await api.pipeline.getTree()
			if (treeResponse.success) {
				const items: ConfigurationItem[] = []
				
				// Process tree nodes recursively, only include pipelines
				const processNode = async (node: PipelineTreeNode) => {
					// Only process pipeline nodes
					if (node.type === 'pipeline') {
						const item: ConfigurationItem = {
							id: node.id,
							name: node.name,
							description: node.description || '',
							type: 'pipeline',
							status: 'idle',
							lastUpdated: node.update_time || node.create_time
						}
						
						// Get task status for pipeline
						try {
							const taskResponse = await api.pipeline.getLatestTask(node.id)
							if (taskResponse.success && taskResponse.task) {
								item.taskInfo = {
									taskId: taskResponse.task.task_id,
									statusText: taskResponse.task.status_text,
									createTime: taskResponse.task.create_time
								}
								
								// Map status codes to readable status
								const statusCode = taskResponse.task.status
								if (statusCode === 0) item.status = 'running'
								else if (statusCode === 1) item.status = 'completed'  
								else if (statusCode === 2) item.status = 'failed'
								else item.status = 'idle'
							}
						} catch (err) {
							console.log(`Pipeline ${node.id} has no tasks yet`)
							item.status = 'idle'
						}
						
						items.push(item)
					}
					
					// Process children recursively (but only include pipeline children)
					if (node.children && node.children.length > 0) {
						for (const child of node.children) {
							await processNode(child)
						}
					}
				}
				
				// Process all root nodes
				for (const rootNode of treeResponse.data) {
					await processNode(rootNode)
				}
				
				setConfigurations(items)
				console.log('📋 Loaded configurations:', items)
			}
		} catch (err) {
			console.error('Failed to load configurations:', err)
			error('Failed to load configuration', 'Unable to get configuration list')
		} finally {
			setIsLoading(false)
		}
	}

	// Handle view log
	const handleViewLog = async (item: ConfigurationItem) => {
		if (!item.taskInfo || !item.taskInfo.taskId) {
			error('No task found', 'This configuration has no running or completed tasks')
			return
		}

		console.log('📋 开始View Log:', {
			pipeline_id: item.id,
			task_id: item.taskInfo.taskId
		})

		setLogLoading(true)
		setLogModalOpen(true)
		setLogContent('')
		setLogInfo(null)

		try {
			const response = await api.pipeline.getTaskLog(item.taskInfo.taskId)
			
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
			} else {
				setLogContent(`加载日志失败: ${response.message}`)
				console.error('❌ 日志加载失败:', response.message)
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			setLogContent(`加载日志时发生错误: ${errorMessage}`)
			console.error('❌ 日志加载异常:', error)
		} finally {
			setLogLoading(false)
		}
	}

	// Close log modal
	const handleCloseLogModal = () => {
		setLogModalOpen(false)
		setLogContent('')
		setLogInfo(null)
	}

	// Handle edit configuration
	const handleEditConfiguration = async (item: ConfigurationItem) => {
		// All items are now pipeline type, so no need to check
		
		try {
			// Load pipeline configuration into global state
			await setCurrentPipeline(item.id)
			await loadPipelineConfig(item.id)
			
			success('Navigate to edit', `Loading configuration for pipeline ${item.name}`)
			
			// Call parent callback to switch to configuration tab
			if (onEditConfiguration) {
				onEditConfiguration(item.id)
			}
		} catch (err) {
			error('Navigation failed', 'Unable to load pipeline configuration')
		}
	}

	// Filter and sort configurations
	const getFilteredAndSortedConfigurations = () => {
		let filtered = configurations

		// Apply status filter
		if (filterStatus !== 'all') {
			filtered = filtered.filter(item => item.status === filterStatus)
		}

		// Apply search filter
		if (searchTerm) {
			filtered = filtered.filter(item => 
				item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				item.description.toLowerCase().includes(searchTerm.toLowerCase())
			)
		}

		// Apply sorting
		filtered.sort((a, b) => {
			switch (sortBy) {
				case 'name':
					return a.name.localeCompare(b.name)
				case 'status':
					return a.status.localeCompare(b.status)
				case 'time':
					return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
				default:
					return 0
			}
		})

		return filtered
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'running': return 'text-blue-600 bg-blue-100'
			case 'completed': return 'text-green-600 bg-green-100'  
			case 'failed': return 'text-red-600 bg-red-100'
			default: return 'text-gray-600 bg-gray-100'
		}
	}

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'running': return '🔄'
			case 'completed': return '✅'
			case 'failed': return '❌'
			default: return '⚪'
		}
	}

	const filteredConfigurations = getFilteredAndSortedConfigurations()

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold text-gray-900">Configuration Management</h1>
				<button
					onClick={loadConfigurations}
					disabled={isLoading}
					className="btn"
				>
					{isLoading ? 'Refreshing...' : 'Refresh'}
				</button>
			</div>

			{/* Statistics */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="bg-white p-4 rounded-lg border">
					<div className="text-2xl font-bold text-blue-600">
						{configurations.length}
					</div>
					<div className="text-sm text-gray-600">Total Configurations</div>
				</div>
				<div className="bg-white p-4 rounded-lg border">
					<div className="text-2xl font-bold text-yellow-600">
						{configurations.filter(c => c.status === 'running').length}
					</div>
					<div className="text-sm text-gray-600">Running</div>
				</div>
				<div className="bg-white p-4 rounded-lg border">
					<div className="text-2xl font-bold text-green-600">
						{configurations.filter(c => c.status === 'completed').length}
					</div>
					<div className="text-sm text-gray-600">Completed</div>
				</div>
				<div className="bg-white p-4 rounded-lg border">
					<div className="text-2xl font-bold text-red-600">
						{configurations.filter(c => c.status === 'failed').length}
					</div>
					<div className="text-sm text-gray-600">Failed</div>
				</div>
			</div>

			{/* Filters and Search */}
			<Box title="Filter and Search">
				<div className="flex flex-col sm:flex-row gap-4">
					{/* Status Filter */}
					<div className="flex gap-2">
						{[
							{ key: 'all', label: 'All' },
							{ key: 'running', label: 'Running' },
							{ key: 'completed', label: 'Completed' },
							{ key: 'failed', label: 'Failed' },
							{ key: 'idle', label: 'Idle' }
						].map(({ key, label }) => (
							<button
								key={key}
								onClick={() => setFilterStatus(key)}
								className={`px-3 py-2 text-sm rounded-lg transition-colors ${
									filterStatus === key
										? 'bg-blue-600 text-white'
										: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
								}`}
							>
								{label}
							</button>
						))}
					</div>

					{/* Search */}
					<div className="flex-1 max-w-md">
						<input
							type="text"
							placeholder="Search configuration name or description..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					{/* Sort */}
					<select
						value={sortBy}
						onChange={(e) => setSortBy(e.target.value as 'name' | 'status' | 'time')}
						className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="time">Sort by Time</option>
						<option value="name">Sort by Name</option>
						<option value="status">Sort by Status</option>
					</select>
				</div>
			</Box>

			{/* Configuration List */}
			<Box title={`Configuration List (${filteredConfigurations.length})`}>
				{isLoading ? (
					<div className="flex items-center justify-center py-8">
						<div className="text-gray-500">Loading...</div>
					</div>
				) : filteredConfigurations.length > 0 ? (
					<div className="space-y-3">
						{filteredConfigurations.map(item => (
							<div 
								key={item.id} 
								className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
							>
								<div className="flex-1">
									<div className="flex items-center gap-3 mb-2">
										<span className="text-lg">{getStatusIcon(item.status)}</span>
										<h3 className="font-medium text-gray-900">{item.name}</h3>
										<span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
											{item.status}
										</span>
										<span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
											pipeline
										</span>
									</div>
									<p className="text-sm text-gray-600 mb-2">{item.description}</p>
									<div className="text-xs text-gray-500">
										Last Updated: {new Date(item.lastUpdated).toLocaleString()}
										{item.taskInfo && (
											<span className="ml-4">
												Task #{item.taskInfo.taskId} - {item.taskInfo.statusText}
											</span>
										)}
									</div>
								</div>
								<div className="flex gap-2">
									<button
										onClick={() => handleEditConfiguration(item)}
										className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
									>
										Edit Configuration
									</button>
									{item.taskInfo && (
										<button
											onClick={() => handleViewLog(item)}
											className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
											title={`View Log: Task #${item.taskInfo.taskId}`}
										>
											View Log
										</button>
									)}
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="text-center py-8 text-gray-500">
						<div className="text-4xl mb-4">📋</div>
						<div className="text-lg font-medium">No configurations found</div>
						<div className="text-sm mt-2">
							{searchTerm || filterStatus !== 'all' 
								? 'Try adjusting your filters or search terms'
								: 'No configuration data available, please create new pipeline configurations'
							}
						</div>
					</div>
				)}
			</Box>

			{/* Log Modal */}
			{logModalOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg max-w-4xl max-h-[80vh] w-full mx-4 flex flex-col">
						{/* Modal Header */}
						<div className="flex items-center justify-between p-4 border-b border-gray-200">
							<div className="flex items-center gap-3">
								<h3 className="text-lg font-semibold text-gray-900">Pipeline Task Log</h3>
								{logInfo && (
									<div className="text-sm text-gray-600">
										Task #{logInfo.task_id} | Lines: {logInfo.returned_lines}/{logInfo.total_lines}
									</div>
								)}
							</div>
							<button
								onClick={handleCloseLogModal}
								className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
							>
								×
							</button>
						</div>

						{/* Modal Content */}
						<div className="flex-1 overflow-hidden p-4">
							{logLoading ? (
								<div className="flex items-center justify-center h-full">
									<div className="text-gray-500">Loading log...</div>
								</div>
							) : (
								<div className="h-full border-2 border-gray-300 rounded-lg bg-gray-100">
									<div 
										className="w-full bg-gray-900 text-green-400 text-sm font-mono leading-relaxed p-4"
										style={{
											height: '400px',
											overflowY: 'scroll',
											overflowX: 'auto',
											scrollbarWidth: 'auto',
											scrollbarColor: '#9CA3AF #374151'
										}}
									>
										<pre className="whitespace-pre-wrap break-words m-0 p-0">
											{logContent || 'No log content available'}
										</pre>
									</div>
								</div>
							)}
						</div>

						{/* Modal Footer */}
						<div className="flex justify-end gap-2 p-4 border-t border-gray-200">
							<button
								onClick={handleCloseLogModal}
								className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}