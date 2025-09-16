import { useState, useImperativeHandle, forwardRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../../state/AppState'
import { api } from '../../services/api'
import type { PipelineTreeNode, PipelineCreateRequest } from '../../services/api'
import Step1 from '../steps/Step1'
import Step2 from '../steps/Step2'
import Step3 from '../steps/Step3'
import Step4 from '../steps/Step4'
import Step5 from '../steps/Step5'
import Step6 from '../steps/Step6'
import StepNavigation from './StepNavigation'
import AbiManagement from '../pages/AbiManagement'
import ConfigurationManagement from '../pages/ConfigurationManagement'
import { AddAbiModal, EditAbiModal, ViewAbiModal, UploadAbiModal } from './AbiModals'
import { ErrorBoundaryWrapper } from './ErrorBoundary'
import type { ContractAbi } from '../../services/abiService'

// Tab type definition
type TabType = 'config' | 'abi' | 'management'

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
	const [currentStepType, setCurrentStepType] = useState<'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6'>('step1')
	const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null)
	const [showAbiModal, setShowAbiModal] = useState<{
		type: 'add' | 'edit' | 'view' | 'upload'
		abi?: ContractAbi
	} | null>(null)
	const [abiRefreshTrigger, setAbiRefreshTrigger] = useState(0)

	// Get pipeline tree data from API
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

	// Open new Tab
	const openTab = (type: TabType, pipelineId?: number) => {
		console.log('🔍 openTab called:', { type, pipelineId, existingTabs: tabs.length })
		
		// Check if there's already a Tab of the same type
		const existingTab = tabs.find(tab => tab.type === type)
		if (existingTab) {
			console.log('✅ Found existing tab, activating:', existingTab.id)
			setActiveTabId(existingTab.id)
			// If it's a configuration management Tab and pipelineId is passed, update selected pipeline
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
			management: 'Unified Management'
		}
		const tabIcons = {
			config: '⚙️',
			abi: '📄',
			management: '📊'
		}

		const newTab: Tab = {
			id: tabId,
			type,
			title: tabTitles[type],
			icon: tabIcons[type]
		}

		setTabs(prev => [...prev, newTab])
		setActiveTabId(tabId)

		// If it's a configuration management Tab, load pipeline tree data
		if (type === 'config') {
			fetchPipelineTree()
			// If pipelineId is passed, automatically select that pipeline
			if (pipelineId) {
				setSelectedPipelineId(pipelineId)
				setCurrentStepType('step1')
			}
		}
	}

	// Close Tab
	const closeTab = (tabId: string) => {
		setTabs(prev => prev.filter(tab => tab.id !== tabId))
		if (activeTabId === tabId) {
			const remainingTabs = tabs.filter(tab => tab.id !== tabId)
			setActiveTabId(remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1].id : '')
		}
	}

	// Delete classification
	const handleDeleteClassification = async (classificationId: number) => {
		try {
			const response = await api.pipeline.deleteClassification(classificationId)
			if (response.success) {
				console.log('✅ Classification deleted successfully:', response.message)
				// Refresh tree data
				await fetchPipelineTree()
				setShowDeleteConfirm(null)
			} else {
				console.error('❌ Classification deletion failed:', response.message)
				alert(`Delete failed: ${response.message}`)
			}
		} catch (error) {
			console.error('❌ Classification deletion request failed:', error)
			alert('Delete failed, please try again')
		}
	}

	// Delete pipeline
	const handleDeletePipeline = async (pipelineId: number) => {
		try {
			const response = await api.pipeline.deletePipeline(pipelineId)
			if (response.success) {
				console.log('✅ Pipeline deleted successfully:', response.message)
				// Refresh tree data
				await fetchPipelineTree()
				setShowDeleteConfirm(null)
				// If deleting the currently selected pipeline, clear selection
				if (currentPipelineId === pipelineId) {
					setCurrentPipeline(null)
					setSelectedPipelineId(null)
				}
			} else {
				console.error('❌ Pipeline deletion failed:', response.message)
				alert(`Delete failed: ${response.message}`)
			}
		} catch (error) {
			console.error('❌ Pipeline deletion request failed:', error)
			alert('Delete failed, please try again')
		}
	}

	// Handle delete confirmation
	const handleDeleteConfirm = (node: PipelineTreeNode) => {
		console.log('✅ Confirm delete node:', node.id, 'node name:', node.name, 'node type:', node.type)
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
				console.log('✅ Pipeline created successfully:', response.data)
				// Refresh tree data
				await fetchPipelineTree()
				// Clear input
				setNewProtocolName('')
				setShowProtocolInput('')
			}
		} catch (error) {
			console.error('❌ Create pipeline failed:', error)
		}
	}

	const handlePipelineClick = async (pipelineId: number) => {
		try {
			console.log('🔄 Click pipeline, ID:', pipelineId)
			
			// Set current pipeline ID
			setCurrentPipeline(pipelineId)
			
			// Try to load pipeline configuration
			await loadPipelineConfig(pipelineId)
			
			// Display Step page within configuration management page
			setSelectedPipelineId(pipelineId)
			setCurrentStepType('step1')
		} catch (error) {
			console.error('❌ Handle pipeline click failed:', error)
			// Even if error, still display Step page
			setSelectedPipelineId(pipelineId)
			setCurrentStepType('step1')
		}
	}

	// Recursively render tree nodes
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
								console.log('🗑️ Click delete button, node ID:', node.id, 'node name:', node.name, 'node type:', node.type)
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


	// Render configuration management content
	const renderConfigManagement = () => (
		<div className="h-full flex flex-col">
			{/* Title header */}
			<div className="p-4 border-b border-gray-200">
				<h3 className="text-lg font-semibold">Configuration Management</h3>
			</div>

			{/* Content area */}
			<div className="flex-1 min-h-0">
				<div className="h-full flex">
					{/* Left: Tree structure */}
					<div className="w-80 border-r border-gray-200 flex flex-col">
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
					
					{/* Right: Step page */}
					<div className="flex-1 flex flex-col min-h-0">
						{/* Step navigation */}
						<div className="flex-shrink-0">
							<StepNavigation 
								currentStep={parseInt(currentStepType.replace('step', ''))} 
								onStepChange={handleStepChange} 
							/>
						</div>
						{/* Step content */}
						<div className="flex-1 overflow-auto">
							<div className="p-6 h-full">
								{selectedPipelineId ? (
									// Show normal content when pipeline is selected
									renderStepContent(currentStepType)
								) : (
									// Show empty state Step page when no pipeline is selected
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
					</div>
				</div>
			</div>
		</div>
	)

	// Handle ABI modal opening
	const handleOpenAbiModal = (type: 'add' | 'edit' | 'view' | 'upload', abi?: ContractAbi) => {
		setShowAbiModal({ type, abi })
	}

	// Handle callback after successful ABI operations (refresh list)
	const handleAbiSuccess = () => {
		setShowAbiModal(null)
		// 触发ABI列表刷新
		setAbiRefreshTrigger(prev => prev + 1)
	}

	// Render ABI management content
	const renderAbiManagement = () => (
		<div className="h-full">
			<AbiManagement 
				onOpenModal={handleOpenAbiModal} 
				refreshTrigger={abiRefreshTrigger}
			/>
		</div>
	)


	// Handle Step navigation - switch within configuration management page
	const handleStepChange = (stepNumber: number) => {
		const stepType = `step${stepNumber}` as 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6'
		setCurrentStepType(stepType)
	}

	// Render Step page content
	const renderStepContent = (stepType: string) => {
		switch (stepType) {
			case 'step1':
				return <Step1 onStepChange={handleStepChange} />
			case 'step2':
				return <Step2 onStepChange={handleStepChange} />
			case 'step3':
				return <Step3 onStepChange={handleStepChange} />
			case 'step4':
				return <Step4 />
			case 'step5':
				return <Step5 />
			case 'step6':
				return <Step6 />
			default:
				return <div className="p-4">Unknown Step type</div>
		}
	}

	// Render unified management content
	const renderManagementContent = () => (
		<div className="h-full overflow-auto p-4">
			<ConfigurationManagement 
				onEditConfiguration={(pipelineId: number) => {
					// Switch to Configuration Management Tab and select pipeline
					setSelectedPipelineId(pipelineId)
					setCurrentStepType('step1')
					// Open configuration management Tab
					openTab('config', pipelineId)
				}}
			/>
		</div>
	)

	// Render Tab content
	const renderTabContent = (tab: Tab) => {
		const content = (() => {
			switch (tab.type) {
				case 'config':
					return renderConfigManagement()
				case 'abi':
					return renderAbiManagement()
				case 'management':
					return renderManagementContent()
				default:
					return <div className="p-4">Unknown Tab type</div>
			}
		})()

		// Wrap content with error boundary
		return (
			<ErrorBoundaryWrapper>
				{content}
			</ErrorBoundaryWrapper>
		)
	}

	// Expose openTab method to parent component
	useImperativeHandle(ref, () => ({
		openTab
	}))

	if (tabs.length === 0) {
		return (
			<div className="flex-1 flex items-center justify-center bg-gray-50">
				<div className="text-center">
					<div className="text-4xl mb-4">📋</div>
					<div className="text-lg font-medium text-gray-700 mb-2">Welcome to Management Center</div>
					<div className="text-sm text-gray-500">Click the left menu to start managing your configurations</div>
				</div>
			</div>
		)
	}

	// Recursively find node
	const findNodeById = (node: PipelineTreeNode, id: number): PipelineTreeNode | null => {
		if (node.id === id) return node
		for (const child of node.children) {
			const found = findNodeById(child, id)
			if (found) return found
		}
		return null
	}

	// Find node information to delete
	const nodeToDelete = showDeleteConfirm ? 
		pipelineTree.reduce((found: PipelineTreeNode | null, node) => 
			found || findNodeById(node, showDeleteConfirm), null) : null
	
	// Debug log
	if (showDeleteConfirm && nodeToDelete) {
		console.log('🔍 Found node to delete:', nodeToDelete.id, 'node name:', nodeToDelete.name, 'node type:', nodeToDelete.type)
	} else if (showDeleteConfirm && !nodeToDelete) {
		console.log('❌ Node to delete not found, search ID:', showDeleteConfirm, 'tree structure:', pipelineTree)
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

			{/* Delete confirmation dialog */}
			{showDeleteConfirm && nodeToDelete && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
						<div className="flex items-center gap-3 mb-4">
							<span className="text-2xl">⚠️</span>
							<h3 className="text-lg font-semibold text-gray-900">
								Confirm Delete
							</h3>
						</div>
						
						<div className="mb-6">
							<p className="text-gray-700 mb-2">
								Are you sure you want to delete the following {nodeToDelete.type === 'classification' ? 'classification' : 'pipeline'}?
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
										⚠️ Warning: This classification contains {nodeToDelete.children.length} sub-items, deletion cannot be undone!
									</p>
								</div>
							)}
						</div>
						
						<div className="flex gap-3 justify-end">
							<button
								onClick={() => setShowDeleteConfirm(null)}
								className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={() => handleDeleteConfirm(nodeToDelete)}
								className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
							>
								Confirm Delete
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ABI modals */}
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
