import { Link, useNavigate } from 'react-router-dom'
import { useAppState } from '../../state/AppState'
import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import type { PipelineTreeNode, PipelineCreateRequest } from '../../services/api'

export default function LeftDataNav() {
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

	const navigate = useNavigate()
	const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set(['chain-eth']))
	const [expandedBizTypes, setExpandedBizTypes] = useState<Set<string>>(new Set())
	const [showProtocolInput, setShowProtocolInput] = useState<string>('')
	const [newProtocolName, setNewProtocolName] = useState('')
	const [pipelineTree, setPipelineTree] = useState<PipelineTreeNode[]>([])
	const [treeLoading, setTreeLoading] = useState(false)

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

	// 组件挂载时获取数据
	useEffect(() => {
		fetchPipelineTree()
	}, [])

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

	const startCreateProtocol = (chainNode: PipelineTreeNode, bizTypeNode: PipelineTreeNode) => {
		setShowProtocolInput(`${chainNode.name}-${bizTypeNode.name}`)
		setNewProtocolName('')
	}

	const confirmCreateProtocol = async (chainNode: PipelineTreeNode, bizTypeNode: PipelineTreeNode) => {
		if (newProtocolName.trim()) {
			try {
				const createRequest: PipelineCreateRequest = {
					classification_id: bizTypeNode.id,
					name: newProtocolName.trim(),
					description: `${chainNode.name} ${bizTypeNode.name} 管道配置`
				}
				
				const response = await api.pipeline.create(createRequest)
				
				if (response.success) {
					console.log('Pipeline created successfully:', response.data)
					// 重新获取树数据以刷新界面
					await fetchPipelineTree()
					// 清空输入框
					setShowProtocolInput('')
					setNewProtocolName('')
					// 跳转到Step1开始配置
					navigate('/step-1')
				} else {
					console.error('Failed to create pipeline:', response.message)
					alert(`创建失败: ${response.message}`)
				}
			} catch (error) {
				console.error('Error creating pipeline:', error)
				alert(`创建失败: ${error instanceof Error ? error.message : '未知错误'}`)
			}
		}
	}

	const cancelCreateProtocol = () => {
		setShowProtocolInput('')
		setNewProtocolName('')
	}

	// 处理管道点击跳转
	const handlePipelineClick = async (pipelineNode: PipelineTreeNode) => {
		try {
			console.log('🎯 管道点击事件:', {
				name: pipelineNode.name,
				id: pipelineNode.id,
				type: pipelineNode.type
			})
			
			// 设置当前管道ID
			setCurrentPipeline(pipelineNode.id)
			setCurrentProtocolId(`pipeline-${pipelineNode.id}`)  // 保持兼容性
			
			console.log('🔄 开始加载管道配置...')
			
			// 加载管道配置 - 这会调用 /api/v1/pipeline/config/{pipeline_id} 接口
			await loadPipelineConfig(pipelineNode.id)
			
			console.log('✅ 管道配置加载完成，跳转到Step1页面')
			
			// 跳转到Step1页面
			navigate('/step-1')
		} catch (error) {
			console.error('❌ 处理管道点击失败:', error)
			// 即使出错也跳转，但组件数据会是空的
			navigate('/step-1')
		}
	}

	return (
		<div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
			{/* Header */}
			<div className="p-4 border-b border-gray-200">
				<h2 className="text-lg font-semibold text-gray-800">Data Processing Pipeline</h2>
			</div>

			{/* Tree Structure */}
			<div className="flex-1 overflow-y-auto p-2">
				{treeLoading ? (
					<div className="text-center py-4 text-gray-500 text-sm">
						加载中...
					</div>
				) : (
					<div className="space-y-1">
						{pipelineTree.map(chainNode => (
							<div key={chainNode.id}>
							{/* Chain Level */}
							<div className="flex items-center justify-between group">
								<button
									onClick={() => toggleChainExpansion(`chain-${chainNode.id}`)}
									className={`flex items-center gap-2 text-sm font-medium hover:text-brand ${
										currentChainId === `chain-${chainNode.id}` ? 'text-brand' : 'text-gray-700'
									}`}
								>
									<span className="text-xs">
										{expandedChains.has(`chain-${chainNode.id}`) ? '▼' : '▶'}
									</span>
									{chainNode.name}
								</button>
								<button
									onClick={() => setCurrentChain(`chain-${chainNode.id}`)}
									className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded opacity-0 group-hover:opacity-100 hover:bg-blue-200"
								>
									Config
								</button>
							</div>

							{/* RPC接入任务 */}
							{expandedChains.has(`chain-${chainNode.id}`) && (
								<div className="ml-4 space-y-1">
									{/* RPC接入配置任务 */}
									<div className="flex items-center justify-between group">
										<Link
											to="/chain-config"
											onClick={() => setCurrentChain(`chain-${chainNode.id}`)}
											className="text-xs text-gray-600 hover:text-brand flex items-center gap-2"
										>
											<span>🔗</span>
											RPC接入配置
										</Link>
									</div>

									{/* Business Types and Pipelines under this chain */}
									{chainNode.children.map(childNode => {
										const chainBizTypeKey = `chain-${chainNode.id}-${childNode.name}`
										const isClassification = childNode.type === 'classification'
										const isPipeline = childNode.type === 'pipeline'
										
										if (isClassification) {
											// 分类节点 (DEX, Lending, etc.)
											return (
												<div key={childNode.id}>
													{/* Business Type Level */}
													<div className="flex items-center justify-between group">
														<button
															onClick={() => toggleBizTypeExpansion(`chain-${chainNode.id}`, childNode.name)}
															className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand"
														>
															<span className="text-xs">
																{expandedBizTypes.has(chainBizTypeKey) ? '▼' : '▶'}
															</span>
															{childNode.name}
															{childNode.children.length > 0 && (
																<span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
																	{childNode.children.length}
																</span>
															)}
														</button>
														<div className="flex gap-1 opacity-0 group-hover:opacity-100">
															<button
																onClick={() => startCreateProtocol(chainNode, childNode)}
																className="text-xs px-1.5 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700"
																title="Add Protocol"
															>
																+
															</button>
														</div>
													</div>

													{/* Protocol Input Field */}
													{showProtocolInput === `${chainNode.name}-${childNode.name}` && (
														<div className="ml-6 space-y-2">
															<input
																type="text"
																placeholder="Enter protocol name..."
																value={newProtocolName}
																onChange={(e) => setNewProtocolName(e.target.value)}
																className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand"
																onKeyPress={(e) => e.key === 'Enter' && confirmCreateProtocol(chainNode, childNode)}
															/>
															<div className="flex gap-1">
																<button
																	onClick={() => confirmCreateProtocol(chainNode, childNode)}
																	className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
																>
																	✓
																</button>
																<button
																	onClick={cancelCreateProtocol}
																	className="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
																>
																	×
																</button>
															</div>
														</div>
													)}

													{/* Pipelines under this business type */}
													{expandedBizTypes.has(chainBizTypeKey) && (
														<div className="ml-6 space-y-1">
															{childNode.children.length === 0 ? (
																<div className="text-xs text-gray-400 italic">
																	No pipelines configured
																</div>
															) : (
																childNode.children.map(pipelineNode => (
																	<div key={pipelineNode.id} className="flex items-center justify-between group">
																																										<button
																									onClick={() => handlePipelineClick(pipelineNode)}
																									className={`text-xs hover:text-brand flex items-center gap-2 ${
																										currentPipelineId === pipelineNode.id ? 'text-brand font-medium' : 'text-gray-600'
																									}`}
																								>
																			<span>📊</span>
																			{pipelineNode.name}
																		</button>
																	</div>
																))
															)}
														</div>
													)}
												</div>
											)
										} else if (isPipeline) {
											// 直接的管道节点
											return (
												<div key={childNode.id} className="flex items-center justify-between group">
																																				<button
																								onClick={() => handlePipelineClick(childNode)}
																								className={`text-xs hover:text-brand flex items-center gap-2 ${
																									currentPipelineId === childNode.id ? 'text-brand font-medium' : 'text-gray-600'
																								}`}
																							>
														<span>📊</span>
														{childNode.name}
													</button>
												</div>
											)
										}
										return null
									})}
								</div>
							)}
						</div>
					))}
				</div>
				)}
			</div>

			{/* Footer */}
			<div className="p-4 border-t border-gray-200">
				<div className="text-xs text-gray-500">
					{components.length} components configured
				</div>
			</div>
		</div>
	)
}


