import { Link, useNavigate } from 'react-router-dom'
import { useAppState } from '../../state/AppState'
import { useAuth } from '../../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import type { PipelineTreeNode, PipelineCreateRequest } from '../../services/api'

// Menu item type definition
type MenuSection = 'config' | 'abi' | 'management' | 'users'

// Menu item configuration
const getMenuItems = (userRole?: string) => {
	console.log('getMenuItems - userRole:', userRole)
	const items = [
	{
		id: 'management' as MenuSection,
		name: 'Unified Management',
		icon: '📊',
		description: 'Unified management of configuration and task status'
	},
	{
		id: 'config' as MenuSection,
		name: 'Configuration Management',
		icon: '⚙️',
		description: 'Pipeline and chain configuration'
	},
	{
		id: 'abi' as MenuSection,
		name: 'ABI Management',
		icon: '📄',
		description: 'Smart contract ABI files'
	},
	// Only admins can see user management
	...(userRole === 'admin' ? [{
		id: 'users' as MenuSection,
		name: 'User Management',
		icon: '👥',
		description: 'Manage users and permissions'
	}] : [])
]
	console.log('getMenuItems - final items:', items)
	return items
}

interface LeftDataNavProps {
	onOpenTab?: (tabType: MenuSection, pipelineId?: number) => void;
}

export default function LeftDataNav({ onOpenTab }: LeftDataNavProps) {
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

	const { authState } = useAuth()
	const navigate = useNavigate()
	const [activeSection, setActiveSection] = useState<MenuSection>('config')

	// 调试用户角色信息
	console.log('LeftDataNav - authState:', authState)
	console.log('LeftDataNav - user object:', authState.user)
	console.log('LeftDataNav - user role:', authState.user?.role)
	console.log('LeftDataNav - user keys:', authState.user ? Object.keys(authState.user) : 'no user')
	const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set())
	const [expandedBizTypes, setExpandedBizTypes] = useState<Set<string>>(new Set())
	const [showProtocolInput, setShowProtocolInput] = useState<string>('')
	const [newProtocolName, setNewProtocolName] = useState('')
	const [pipelineTree, setPipelineTree] = useState<PipelineTreeNode[]>([])
	const [treeLoading, setTreeLoading] = useState(false)
	const [isCollapsed, setIsCollapsed] = useState(false)
	const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null)

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

	// Get data when component mounts
	useEffect(() => {
		fetchPipelineTree()
	}, [])

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

	// Remove auto-open Tab logic, let users manually click menu

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
			
			// Open configuration management tab on the right
			onOpenTab?.('config', pipelineId)
		} catch (error) {
			console.error('❌ Handle pipeline click failed:', error)
			// Even if error, still open Tab, but component data will be empty
			onOpenTab?.('config', pipelineId)
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
		<div className="space-y-1">
			{treeLoading ? (
				<div className="text-center py-4 text-gray-500 text-sm">
					Loading...
				</div>
			) : (
				<div className="space-y-1">
					{pipelineTree.map(node => renderTreeNode(node))}
				</div>
			)}
		</div>
	)

	// Render ABI management content
	const renderAbiManagement = () => (
		<div className="space-y-3">
			<div className="text-sm text-gray-600 mb-3">
				Manage smart contract ABI files
			</div>
			
			{/* ABI File List */}
			<div className="space-y-2">
				<div className="flex items-center justify-between p-2 bg-gray-50 rounded">
					<div className="flex items-center gap-2">
						<span className="text-xs">📄</span>
						<span className="text-sm">ERC20.json</span>
					</div>
					<div className="flex gap-1">
						<button className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
							View
						</button>
						<button className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">
							Delete
						</button>
					</div>
				</div>
				
				<div className="flex items-center justify-between p-2 bg-gray-50 rounded">
					<div className="flex items-center gap-2">
						<span className="text-xs">📄</span>
						<span className="text-sm">Uniswap.json</span>
					</div>
					<div className="flex gap-1">
						<button className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
							View
						</button>
						<button className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">
							Delete
						</button>
					</div>
				</div>
			</div>
			
			{/* Upload New ABI */}
			<div className="border-t pt-3">
				<button className="w-full text-sm px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 border border-green-300">
					+ Upload New ABI File
				</button>
			</div>
		</div>
	)


	// Recursively find node
	const findNodeById = (node: PipelineTreeNode, id: number): PipelineTreeNode | null => {
		if (node.id === id) return node
		for (const child of node.children) {
			const found = findNodeById(child, id)
			if (found) return found
		}
		return null
	}

	// Find the node to delete
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
			<div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 flex flex-col h-full transition-all duration-300`}>
				{/* Header */}
				<div className="p-4 border-b border-gray-200 flex items-center justify-between">
					{!isCollapsed && <h2 className="text-lg font-semibold text-gray-800">Management Center</h2>}
					<button
						onClick={() => setIsCollapsed(!isCollapsed)}
						className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
						title={isCollapsed ? "Expand Menu" : "Collapse Menu"}
					>
						<svg className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
						</svg>
					</button>
				</div>

				{/* Vertical Menu */}
				<div className="flex-1 p-3">
					<div className="space-y-2">
						{getMenuItems(authState.user?.role).map(item => (
							<button
								key={item.id}
								onClick={() => {
									setActiveSection(item.id)
									// 所有菜单项都通过Tab系统打开
									onOpenTab?.(item.id)
								}}
								className={`w-full text-left p-3 rounded-lg transition-colors ${
									activeSection === item.id
										? 'bg-brand text-white shadow-md'
										: 'bg-gray-50 text-gray-700 hover:bg-gray-100'
								}`}
								title={isCollapsed ? item.name : ''}
							>
								{isCollapsed ? (
									// Collapsed state: only show icons
									<div className="flex justify-center">
										<span className="text-lg">{item.icon}</span>
									</div>
								) : (
									// Expanded state: show full content
									<div className="flex items-center gap-3">
										<span className="text-lg">{item.icon}</span>
										<div>
											<div className="font-medium text-sm">{item.name}</div>
											<div className={`text-xs ${
												activeSection === item.id ? 'text-blue-100' : 'text-gray-500'
											}`}>
												{item.description}
											</div>
										</div>
									</div>
								)}
							</button>
						))}
					</div>
				</div>

				{/* Footer */}
				{!isCollapsed && (
					<div className="p-4 border-t border-gray-200">
						<div className="text-xs text-gray-500">
							{components.length} components configured
						</div>
					</div>
				)}
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
		</>
	)
}