import { useState, useImperativeHandle, forwardRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../../state/AppState'
import { api } from '../../services/api'
import type { PipelineTreeNode, PipelineCreateRequest } from '../../services/api'
import Step1 from '../steps/Step1'
import Step2 from '../steps/Step2'
import Step3 from '../steps/Step3'
import Step4 from '../steps/Step4'
import Step6 from '../steps/Step6'
import StepNavigation from './StepNavigation'

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
			config: '配置管理',
			abi: 'ABI管理',
			database: '数据库管理'
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
							>
								+
							</button>
						)}
						{node.type === 'pipeline' && (
							<button
								onClick={() => handlePipelineClick(node.id)}
								className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
							>
								Edit
							</button>
						)}
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
					<h3 className="text-lg font-semibold">配置管理</h3>
				</div>
				<div className="flex-1 overflow-auto p-4">
					{treeLoading ? (
						<div className="text-center py-8 text-gray-500">
							加载中...
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
												<div className="font-medium">开始配置新管道</div>
												<div className="text-sm text-blue-600">
													您可以直接在这里配置，或者点击左侧树形结构中的管道节点加载现有配置
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

	// 渲染ABI管理内容
	const renderAbiManagement = () => (
		<div className="p-4">
			<h3 className="text-lg font-semibold mb-4">ABI管理</h3>
			<div className="space-y-3">
				<div className="text-sm text-gray-600 mb-4">
					管理智能合约 ABI 文件
				</div>
				
				{/* ABI 文件列表 */}
				<div className="space-y-3">
					<div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
						<div className="flex items-center gap-3">
							<span className="text-lg">📄</span>
							<div>
								<div className="font-medium">ERC20.json</div>
								<div className="text-xs text-gray-500">标准ERC20代币合约</div>
							</div>
						</div>
						<div className="flex gap-2">
							<button className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
								查看
							</button>
							<button className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">
								删除
							</button>
						</div>
					</div>
					
					<div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
						<div className="flex items-center gap-3">
							<span className="text-lg">📄</span>
							<div>
								<div className="font-medium">Uniswap.json</div>
								<div className="text-xs text-gray-500">Uniswap V3 路由合约</div>
							</div>
						</div>
						<div className="flex gap-2">
							<button className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
								查看
							</button>
							<button className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">
								删除
							</button>
						</div>
					</div>
				</div>
				
				{/* 上传新ABI */}
				<div className="border-t pt-4">
					<button className="w-full text-sm px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 border border-green-300 font-medium">
						+ 上传新 ABI 文件
					</button>
				</div>
			</div>
		</div>
	)

	// 渲染数据库管理内容
	const renderDatabaseManagement = () => (
		<div className="p-4">
			<h3 className="text-lg font-semibold mb-4">数据库管理</h3>
			<div className="space-y-3">
				<div className="text-sm text-gray-600 mb-4">
					管理数据库连接和配置
				</div>
				
				{/* 数据库连接列表 */}
				<div className="space-y-3">
					<div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
						<div className="flex items-center gap-3">
							<span className="text-lg">🗄️</span>
							<div>
								<div className="font-medium">MySQL-主库</div>
								<div className="text-xs text-gray-500">mysql://localhost:3306</div>
								<div className="text-xs text-green-600">● 连接正常</div>
							</div>
						</div>
						<div className="flex gap-2">
							<button className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
								测试
							</button>
							<button className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
								编辑
							</button>
						</div>
					</div>
					
					<div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
						<div className="flex items-center gap-3">
							<span className="text-lg">🗄️</span>
							<div>
								<div className="font-medium">Doris-分析库</div>
								<div className="text-xs text-gray-500">doris://localhost:8030</div>
								<div className="text-xs text-yellow-600">● 连接中断</div>
							</div>
						</div>
						<div className="flex gap-2">
							<button className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
								测试
							</button>
							<button className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
								编辑
							</button>
						</div>
					</div>
				</div>
				
				{/* 添加新数据库 */}
				<div className="border-t pt-4">
					<button className="w-full text-sm px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 border border-green-300 font-medium">
						+ 添加数据库连接
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
				return <Step1 />
			case 'step2':
				return <Step2 />
			case 'step3':
				return <Step3 />
			case 'step4':
				return <Step4 />
			case 'step5':
				return <Step6 />
			default:
				return <div className="p-4">未知Step类型</div>
		}
	}

	// 渲染Tab内容
	const renderTabContent = (tab: Tab) => {
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

	return (
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
	)
})

export default RightTabSystem
