import { useState, useImperativeHandle, forwardRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../../state/AppState'
import { api } from '../../services/api'
import type { PipelineTreeNode, PipelineCreateRequest } from '../../services/api'
import Step1 from '../steps/Step1'
import Step2 from '../steps/Step2'
import Step3 from '../steps/Step3'
import Step5 from '../steps/Step5'
import Step6 from '../steps/Step6'
import StepNavigation from './StepNavigation'
import AbiManagement from '../pages/AbiManagement'
import { AddAbiModal, EditAbiModal, ViewAbiModal, UploadAbiModal } from './AbiModals'
import { ErrorBoundaryWrapper } from './ErrorBoundary'
import type { ContractAbi } from '../../services/abiService'

// Tab类型定义
type TabType = 'config' | 'abi' | 'database'

interface Tab {
	id: string
	type: TabType
	title: string
	icon: string
}

const RightTabSystem = forwardRef<{ openTab: (type: TabType, pipelineId?: number) => void }, {}>((props, ref) => {
	const navigate = useNavigate()
	const { 
		chains, 
		columns,
		currentChainId, 
		currentProtocolId, 
		currentColumnId,
		currentPipelineId,
		createChain, 
		deleteChain, 
		setCurrentChain,
		setCurrentProtocolId,
		createColumn, 
		deleteColumn, 
		setCurrentColumn,
		setCurrentPipeline,
		loadPipelineConfig,
		components
	} = useAppState()

	const [tabs, setTabs] = useState<Tab[]>([])
	const [activeTabId, setActiveTabId] = useState<string>('')
	const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set())
	const [expandedBizTypes, setExpandedBizTypes] = useState<Set<string>>(new Set())
	const [showProtocolInput, setShowProtocolInput] = useState<string>('')
	const [newProtocolName, setNewProtocolName] = useState('')
	const [pipelineTree, setPipelineTree] = useState<PipelineTreeNode[]>([])
	const [treeLoading, setTreeLoading] = useState(false)
	const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null)
	const [currentStepType, setCurrentStepType] = useState<'step1' | 'step2' | 'step3' | 'step4' | 'step5'>('step1')
	const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null)
	const [showAbiModal, setShowAbiModal] = useState<{
		type: 'add' | 'edit' | 'view' | 'upload'
		abi?: ContractAbi
	} | null>(null)
	const [abiRefreshTrigger, setAbiRefreshTrigger] = useState(0)

	// 从 API 获取管道树数据
	const fetchPipelineTree = async () => {
		setTreeLoading(true)
		try {
			const response = await api.pipeline.getTree()
			if (response.success) {
				setPipelineTree(response.data)
			}
		} catch (error) {
			console.error('Failed to fetch pipeline tree:', error)
		} finally {
			setTreeLoading(false)
		}
	}

	// 打开新Tab
	const openTab = (type: TabType, pipelineId?: number) => {
		console.log('🔍 openTab called:', { type, pipelineId, existingTabs: tabs.length })
		
		// 检查是否已经有相同类型的Tab
		const existingTab = tabs.find(tab => tab.type === type)
		if (existingTab) {
			console.log('✅ Found existing tab, activating:', existingTab.id)
			setActiveTabId(existingTab.id)
			// 如果是配置管理Tab且传入了pipelineId，更新选中的管道
			if (type === 'config' && pipelineId) {
				setSelectedPipelineId(pipelineId)
				setCurrentStepType('step1')
			}
			return
		}

		console.log('🆕 Creating new tab:', type)
		const tabId = `${type}-tab`
		const tabTitles = {
			config: 'Configuration Management',
			abi: 'ABI Management',
			database: 'Database Management'
		}
		const tabIcons = {
			config: '⚙️',
			abi: '📄',
			database: '🗄️'
		}

		const newTab: Tab = {
			id: tabId,
			type,
			title: tabTitles[type],
			icon: tabIcons[type]
		}

		setTabs(prev => [...prev, newTab])
		setActiveTabId(tabId)

		// 如果是配置管理Tab，加载管道树数据
		if (type === 'config') {
			fetchPipelineTree()
			// 如果传入了pipelineId，自动选择该管道
			if (pipelineId) {
				setSelectedPipelineId(pipelineId)
				setCurrentStepType('step1')
			}
		}
	}

	// 关闭Tab
	const closeTab = (tabId: string) => {
		setTabs(prev => prev.filter(tab => tab.id !== tabId))
		if (activeTabId === tabId) {
			const remainingTabs = tabs.filter(tab => tab.id !== tabId)
			setActiveTabId(remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1].id : '')
		}
	}

	// 删除分类
	const handleDeleteClassification = async (classificationId: number) => {
		try {
			const response = await api.pipeline.deleteClassification(classificationId)
			if (response.success) {
				console.log('✅ 分类删除成功:', response.message)
				// 重新获取树数据
				await fetchPipelineTree()
				setShowDeleteConfirm(null)
			} else {
				console.error('❌ 分类删除失败:', response.message)
				alert(`Delete failed: ${response.message}`)
			}
		} catch (error) {
			console.error('❌ 分类删除请求失败:', error)
			alert('Delete failed, please try again')
		}
	}

	// 删除管道
	const handleDeletePipeline = async (pipelineId: number) => {
		try {
			const response = await api.pipeline.deletePipeline(pipelineId)
			if (response.success) {
				console.log('✅ 管道删除成功:', response.message)
				// 重新获取树数据
				await fetchPipelineTree()
				setShowDeleteConfirm(null)
				// 如果删除的是当前选中的管道，清除选中状态
				if (currentPipelineId === pipelineId) {
					setCurrentPipeline(null)
					setSelectedPipelineId(null)
				}
			} else {
				console.error('❌ 管道删除失败:', response.message)
				alert(`Delete failed: ${response.message}`)
			}
		} catch (error) {
			console.error('❌ 管道删除请求失败:', error)
			alert('Delete failed, please try again')
		}
	}

	// 处理删除确认
	const handleDeleteConfirm = (node: PipelineTreeNode) => {
		console.log('✅ 确认删除节点:', node.id, '节点名称:', node.name, '节点类型:', node.type)
		if (node.type === 'classification') {
			handleDeleteClassification(node.id)
		} else {
			handleDeletePipeline(node.id)
		}
	}

	const toggleChainExpansion = (chainId: string) => {
		const newExpanded = new Set(expandedChains)
		if (newExpanded.has(chainId)) {
			newExpanded.delete(chainId)
		} else {
			newExpanded.add(chainId)
		}
		setExpandedChains(newExpanded)
	}

	const toggleBizTypeExpansion = (chainId: string, bizType: string) => {
		const key = `${chainId}-${bizType}`
		const newExpanded = new Set(expandedBizTypes)
		if (newExpanded.has(key)) {
			newExpanded.delete(key)
		} else {
			newExpanded.add(key)
		}
		setExpandedBizTypes(newExpanded)
	}

	const handleCreatePipeline = async (chainId: number, protocolId: number) => {
		if (!newProtocolName.trim()) return

		try {
			const request: PipelineCreateRequest = {
				name: newProtocolName.trim(),
				description: `Pipeline for ${newProtocolName.trim()}`,
				classification_id: protocolId
			}

			const response = await api.pipeline.create(request)
			if (response.success) {
				console.log('✅ 管道创建成功:', response.data)
				// 刷新树数据
				await fetchPipelineTree()
				// 清空输入
				setNewProtocolName('')
				setShowProtocolInput('')
			}
		} catch (error) {
			console.error('❌ 创建管道失败:', error)
		}
	}

	const handlePipelineClick = async (pipelineId: number) => {
		try {
			console.log('🔄 点击管道，ID:', pipelineId)
			
			// 设置当前管道ID
			setCurrentPipeline(pipelineId)
			
			// 尝试加载管道配置
			await loadPipelineConfig(pipelineId)
			
			// 在配置管理页面内显示Step页面
			setSelectedPipelineId(pipelineId)
			setCurrentStepType('step1')
		} catch (error) {
			console.error('❌ 处理管道点击失败:', error)
			// 即使出错也显示Step页面
			setSelectedPipelineId(pipelineId)
			setCurrentStepType('step1')
		}
	}

	// 递归渲染树节点
	const renderTreeNode = (node: PipelineTreeNode, level: number = 0) => {
		const isExpanded = expandedChains.has(`node-${node.id}`)
		const hasChildren = node.children && node.children.length > 0
		
		return (
			<div key={node.id} style={{ marginLeft: `${level * 16}px` }}>
				{/* Node */}
				<div className="flex items-center justify-between group py-1">
					<button
						onClick={() => {
							if (node.type === 'pipeline') {
								handlePipelineClick(node.id)
							} else if (hasChildren) {
								toggleChainExpansion(`node-${node.id}`)
							}
						}}
						className={`flex items-center gap-2 text-sm hover:text-brand ${
							node.type === 'pipeline' && currentPipelineId === node.id ? 'text-brand font-medium' : 'text-gray-700'
						}`}
					>
						{hasChildren && (
							<span className="text-xs">
								{isExpanded ? '▼' : '▶'}
							</span>
						)}
						{!hasChildren && <span className="text-xs w-3"></span>}
						<span className="text-xs mr-1">
							{node.type === 'classification' ? '📁' : '📊'}
						</span>
						{node.name}
					</button>
					<div className="flex gap-1 opacity-0 group-hover:opacity-100">
						{node.type === 'classification' && (
							<button
								onClick={() => setShowProtocolInput(`node-${node.id}`)}
								className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
								title="Add Pipeline"
							>
								+
							</button>
						)}
						{node.type === 'pipeline' && (
							<button
								onClick={() => handlePipelineClick(node.id)}
								className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
								title="Edit Pipeline"
							>
								Edit
							</button>
						)}
						<button
							onClick={(e) => {
								e.stopPropagation()
								console.log('🗑️ 点击删除按钮，节点ID:', node.id, '节点名称:', node.name, '节点类型:', node.type)
								setShowDeleteConfirm(node.id)
							}}
							className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
							title={node.type === 'classification' ? 'Delete Classification' : 'Delete Pipeline'}
						>
							🗑️
						</button>
					</div>
				</div>

				{/* Children */}
				{isExpanded && hasChildren && (
					<div>
						{node.children.map(child => renderTreeNode(child, level + 1))}
					</div>
				)}
				
				{/* Add new pipeline input */}
				{showProtocolInput === `node-${node.id}` && node.type === 'classification' && (
					<div className="flex gap-2 mt-2" style={{ marginLeft: `${(level + 1) * 16}px` }}>
						<input
							type="text"
							value={newProtocolName}
							onChange={(e) => setNewProtocolName(e.target.value)}
							placeholder="Pipeline name"
							className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded"
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									handleCreatePipeline(0, node.id)
								}
								if (e.key === 'Escape') {
									setShowProtocolInput('')
									setNewProtocolName('')
								}
							}}
						/>
						<button
							onClick={() => handleCreatePipeline(0, node.id)}
							className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
						>
							✓
						</button>
						<button
							onClick={() => {
								setShowProtocolInput('')
								setNewProtocolName('')
							}}
							className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
						>
							✗
						</button>
					</div>
				)}
			</div>
		)
	}

	// 渲染配置管理内容
	const renderConfigManagement = () => (
		<div className="h-full flex">
			{/* 左侧：树形结构 */}
			<div className="w-80 border-r border-gray-200 flex flex-col">
				<div className="p-4 border-b border-gray-200">
					<h3 className="text-lg font-semibold">Configuration Management</h3>
				</div>
				<div className="flex-1 overflow-auto p-4">
					{treeLoading ? (
						<div className="text-center py-8 text-gray-500">
							Loading...
						</div>
					) : (
						<div className="space-y-1">
							{pipelineTree.map(node => renderTreeNode(node))}
						</div>
					)}
				</div>
			</div>
			
			{/* 右侧：Step页面 */}
			<div className="flex-1 flex flex-col min-h-0">
				<>
					{/* Step导航 */}
					<div className="flex-shrink-0">
						<StepNavigation 
							currentStep={parseInt(currentStepType.replace('step', ''))} 
							onStepChange={handleStepChange} 
						/>
					</div>
					{/* Step内容 */}
					<div className="flex-1 overflow-auto">
						<div className="p-6 h-full">
							{selectedPipelineId ? (
								// 有选中管道时显示正常内容
								renderStepContent(currentStepType)
							) : (
								// 没有选中管道时显示空状态的Step页面
								<div className="h-full flex flex-col">
									<div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
										<div className="flex items-center gap-2 text-blue-700">
											<span className="text-lg">💡</span>
											<div>
												<div className="font-medium">Start Configuring New Pipeline</div>
												<div className="text-sm text-blue-600">
													You can configure directly here, or click on pipeline nodes in the left tree structure to load existing configurations
												</div>
											</div>
										</div>
									</div>
									<div className="flex-1">
										{renderStepContent(currentStepType)}
									</div>
								</div>
							)}
						</div>
					</div>
				</>
			</div>
		</div>
	)

	// 处理ABI模态框打开
	const handleOpenAbiModal = (type: 'add' | 'edit' | 'view' | 'upload', abi?: ContractAbi) => {
		setShowAbiModal({ type, abi })
	}

	// 处理ABI操作成功后的回调（刷新列表）
	const handleAbiSuccess = () => {
		setShowAbiModal(null)
		// 触发ABI列表刷新
		setAbiRefreshTrigger(prev => prev + 1)
	}

	// 渲染ABI管理内容
	const renderAbiManagement = () => (
		<div className="h-full">
			<AbiManagement 
				onOpenModal={handleOpenAbiModal} 
				refreshTrigger={abiRefreshTrigger}
			/>
		</div>
	)

	// 渲染数据库管理内容
	const renderDatabaseManagement = () => (
		<div className="p-4">
			<h3 className="text-lg font-semibold mb-4">Database Management</h3>
			<div className="space-y-3">
				<div className="text-sm text-gray-600 mb-4">
					Manage database connections and configurations
				</div>
				
				{/* 数据库连接列表 */}
				<div className="space-y-3">
					<div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
						<div className="flex items-center gap-3">
							<span className="text-lg">🗄️</span>
							<div>
								<div className="font-medium">MySQL-Primary</div>
								<div className="text-xs text-gray-500">mysql://localhost:3306</div>
								<div className="text-xs text-green-600">● Connection Normal</div>
							</div>
						</div>
						<div className="flex gap-2">
							<button className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
								Test
							</button>
							<button className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
								Edit
							</button>
						</div>
					</div>
					
					<div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
						<div className="flex items-center gap-3">
							<span className="text-lg">🗄️</span>
							<div>
								<div className="font-medium">Doris-Analytics</div>
								<div className="text-xs text-gray-500">doris://localhost:8030</div>
								<div className="text-xs text-yellow-600">● Connection Interrupted</div>
							</div>
						</div>
						<div className="flex gap-2">
							<button className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
								Test
							</button>
							<button className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
								Edit
							</button>
						</div>
					</div>
				</div>
				
				{/* 添加新数据库 */}
				<div className="border-t pt-4">
					<button className="w-full text-sm px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 border border-green-300 font-medium">
						+ Add Database Connection
					</button>
				</div>
			</div>
		</div>
	)

	// 处理Step导航 - 在配置管理页面内切换
	const handleStepChange = (stepNumber: number) => {
		const stepType = `step${stepNumber}` as 'step1' | 'step2' | 'step3' | 'step4' | 'step5'
		setCurrentStepType(stepType)
	}

	// 渲染Step页面内容
	const renderStepContent = (stepType: string) => {
		switch (stepType) {
			case 'step1':
				return <Step1 onStepChange={handleStepChange} />
			case 'step2':
				return <Step2 onStepChange={handleStepChange} />
			case 'step3':
				return <Step3 onStepChange={handleStepChange} />
			case 'step4':
				return <Step5 />
			case 'step5':
				return <Step6 />
			default:
				return <div className="p-4">未知Step类型</div>
		}
	}

	// 渲染Tab内容
	const renderTabContent = (tab: Tab) => {
		const content = (() => {
			switch (tab.type) {
				case 'config':
					return renderConfigManagement()
				case 'abi':
					return renderAbiManagement()
				case 'database':
					return renderDatabaseManagement()
				default:
					return <div className="p-4">未知Tab类型</div>
			}
		})()

		// 用错误边界包装内容
		return (
			<ErrorBoundaryWrapper>
				{content}
			</ErrorBoundaryWrapper>
		)
	}

	// 暴露openTab方法给父组件
	useImperativeHandle(ref, () => ({
		openTab
	}))

	if (tabs.length === 0) {
		return (
			<div className="flex-1 flex items-center justify-center bg-gray-50">
				<div className="text-center">
					<div className="text-4xl mb-4">📋</div>
					<div className="text-lg font-medium text-gray-700 mb-2">欢迎使用管理中心</div>
					<div className="text-sm text-gray-500">点击左侧菜单开始管理您的配置</div>
				</div>
			</div>
		)
	}

	// 递归查找节点
	const findNodeById = (node: PipelineTreeNode, id: number): PipelineTreeNode | null => {
		if (node.id === id) return node
		for (const child of node.children) {
			const found = findNodeById(child, id)
			if (found) return found
		}
		return null
	}

	// 找到要删除的节点信息
	const nodeToDelete = showDeleteConfirm ? 
		pipelineTree.reduce((found: PipelineTreeNode | null, node) => 
			found || findNodeById(node, showDeleteConfirm), null) : null
	
	// 调试日志
	if (showDeleteConfirm && nodeToDelete) {
		console.log('🔍 找到要删除的节点:', nodeToDelete.id, '节点名称:', nodeToDelete.name, '节点类型:', nodeToDelete.type)
	} else if (showDeleteConfirm && !nodeToDelete) {
		console.log('❌ 未找到要删除的节点，查找ID:', showDeleteConfirm, '树结构:', pipelineTree)
	}

	return (
		<>
			<div className="flex-1 flex flex-col bg-white">
				{/* Tab Headers */}
				<div className="border-b border-gray-200 bg-gray-50">
					<div className="flex">
						{tabs.map(tab => (
							<div key={tab.id} className="flex items-center">
								<button
									onClick={() => setActiveTabId(tab.id)}
									className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 ${
										activeTabId === tab.id
											? 'border-brand text-brand bg-white'
											: 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
									}`}
								>
									<span>{tab.icon}</span>
									{tab.title}
								</button>
								<button
									onClick={() => closeTab(tab.id)}
									className="ml-1 mr-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
								>
									×
								</button>
							</div>
						))}
					</div>
				</div>

				{/* Tab Content */}
				<div className="flex-1 overflow-auto">
					{tabs.map(tab => (
						<div
							key={tab.id}
							className={activeTabId === tab.id ? 'block' : 'hidden'}
						>
							{renderTabContent(tab)}
						</div>
					))}
				</div>
			</div>

			{/* 删除确认对话框 */}
			{showDeleteConfirm && nodeToDelete && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
						<div className="flex items-center gap-3 mb-4">
							<span className="text-2xl">⚠️</span>
							<h3 className="text-lg font-semibold text-gray-900">
								确认删除
							</h3>
						</div>
						
						<div className="mb-6">
							<p className="text-gray-700 mb-2">
								您确定要删除以下{nodeToDelete.type === 'classification' ? '分类' : '管道'}吗？
							</p>
							<div className="bg-gray-50 p-3 rounded border">
								<div className="flex items-center gap-2">
									<span className="text-lg">
										{nodeToDelete.type === 'classification' ? '📁' : '📊'}
									</span>
									<span className="font-medium">{nodeToDelete.name}</span>
								</div>
								{nodeToDelete.description && (
									<div className="text-sm text-gray-600 mt-1">
										{nodeToDelete.description}
									</div>
								)}
							</div>
							{nodeToDelete.type === 'classification' && nodeToDelete.children.length > 0 && (
								<div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
									<p className="text-sm text-red-700">
										⚠️ 警告：此分类包含 {nodeToDelete.children.length} 个子项目，删除后将无法恢复！
									</p>
								</div>
							)}
						</div>
						
						<div className="flex gap-3 justify-end">
							<button
								onClick={() => setShowDeleteConfirm(null)}
								className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
							>
								取消
							</button>
							<button
								onClick={() => handleDeleteConfirm(nodeToDelete)}
								className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
							>
								确认删除
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ABI模态框 */}
			{showAbiModal && (
				<>
					{showAbiModal.type === 'add' && (
						<AddAbiModal
							isOpen={true}
							onClose={() => setShowAbiModal(null)}
							onSuccess={handleAbiSuccess}
						/>
					)}
					{showAbiModal.type === 'edit' && showAbiModal.abi && (
						<EditAbiModal
							isOpen={true}
							onClose={() => setShowAbiModal(null)}
							onSuccess={handleAbiSuccess}
							abi={showAbiModal.abi}
						/>
					)}
					{showAbiModal.type === 'view' && showAbiModal.abi && (
						<ViewAbiModal
							isOpen={true}
							onClose={() => setShowAbiModal(null)}
							onSuccess={handleAbiSuccess}
							abi={showAbiModal.abi}
						/>
					)}
					{showAbiModal.type === 'upload' && (
						<UploadAbiModal
							isOpen={true}
							onClose={() => setShowAbiModal(null)}
							onSuccess={handleAbiSuccess}
						/>
					)}
				</>
			)}
		</>
	)
})

export default RightTabSystem
