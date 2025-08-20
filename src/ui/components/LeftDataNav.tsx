import { Link, useNavigate } from 'react-router-dom'
import { useAppState } from '../../state/AppState'
import { useState } from 'react'

export default function LeftDataNav() {
	const { 
		chains, 
		columns,
		currentChainId, 
		currentProtocolId, 
		currentColumnId,
		createChain, 
		deleteChain, 
		setCurrentChain,
		createColumn, 
		deleteColumn, 
		setCurrentColumn,
		components
	} = useAppState()

	const navigate = useNavigate()
	const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set(['chain-eth']))
	const [expandedBizTypes, setExpandedBizTypes] = useState<Set<string>>(new Set())
	const [showProtocolInput, setShowProtocolInput] = useState<string>('')
	const [newProtocolName, setNewProtocolName] = useState('')

	const bizTypes = ['DEX', 'Lending', 'Staking', 'Restaking'] as const

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

	const startCreateProtocol = (chain: string, bizType: string) => {
		setShowProtocolInput(`${chain}-${bizType}`)
		setNewProtocolName('')
	}

	const confirmCreateProtocol = (chain: any, bizType: any) => {
		if (newProtocolName.trim()) {
			// 协议创建功能已移除，直接跳转到Step1
			setShowProtocolInput('')
			setNewProtocolName('')
			navigate('/step-1')
		}
	}

	const cancelCreateProtocol = () => {
		setShowProtocolInput('')
		setNewProtocolName('')
	}

	// 处理协议点击跳转
	const handleProtocolClick = (protocol: any) => {
		setCurrentProtocol(protocol.id)
		// 跳转到Step1页面开始协议配置流程
		navigate('/step-1')
	}

	return (
		<div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
			{/* Header */}
			<div className="p-4 border-b border-gray-200">
				<h2 className="text-lg font-semibold text-gray-800">Data Processing Pipeline</h2>
			</div>

			{/* Tree Structure */}
			<div className="flex-1 overflow-y-auto p-2">
				<div className="space-y-1">
					{chains.map(chain => (
						<div key={chain.id}>
							{/* Chain Level */}
							<div className="flex items-center justify-between group">
								<button
									onClick={() => toggleChainExpansion(chain.id)}
									className={`flex items-center gap-2 text-sm font-medium hover:text-brand ${
										currentChainId === chain.id ? 'text-brand' : 'text-gray-700'
									}`}
								>
									<span className="text-xs">
										{expandedChains.has(chain.id) ? '▼' : '▶'}
									</span>
									{chain.name}
								</button>
								<button
									onClick={() => setCurrentChain(chain.id)}
									className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded opacity-0 group-hover:opacity-100 hover:bg-blue-200"
								>
									Config
								</button>
							</div>

							{/* RPC接入任务 */}
							{expandedChains.has(chain.id) && (
								<div className="ml-4 space-y-1">
									{/* RPC接入配置任务 */}
									<div className="flex items-center justify-between group">
										<Link
											to="/chain-config"
											onClick={() => setCurrentChain(chain.id)}
											className="text-xs text-gray-600 hover:text-brand flex items-center gap-2"
										>
											<span>🔗</span>
											RPC接入配置
										</Link>
									</div>

									{/* Business Types under this chain */}
									{bizTypes.map(bizType => {
										const chainBizTypeKey = `${chain.id}-${bizType}`
										const protocolsInThisBizType = [] // 不再使用 protocols 数组
										
										return (
											<div key={bizType}>
												{/* Business Type Level */}
												<div className="flex items-center justify-between group">
													<button
														onClick={() => toggleBizTypeExpansion(chain.id, bizType)}
														className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand"
													>
														<span className="text-xs">
															{expandedBizTypes.has(chainBizTypeKey) ? '▼' : '▶'}
														</span>
														{bizType}
														{protocolsInThisBizType.length > 0 && (
															<span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
																{protocolsInThisBizType.length}
															</span>
														)}
													</button>
													<div className="flex gap-1 opacity-0 group-hover:opacity-100">
														<button
															onClick={() => startCreateProtocol(chain.chain, bizType)}
															className="text-xs px-1.5 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700"
															title="Add Protocol"
														>
															+
														</button>
													</div>
												</div>

												{/* Protocol Input Field */}
												{showProtocolInput === `${chain.chain}-${bizType}` && (
													<div className="ml-6 space-y-2">
														<input
															type="text"
															placeholder="Enter protocol name..."
															value={newProtocolName}
															onChange={(e) => setNewProtocolName(e.target.value)}
															className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand"
															onKeyPress={(e) => e.key === 'Enter' && confirmCreateProtocol(chain.chain, bizType)}
														/>
														<div className="flex gap-1">
															<button
																onClick={() => confirmCreateProtocol(chain.chain, bizType)}
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

												{/* Protocols under this business type - 只显示到协议级别 */}
												{expandedBizTypes.has(chainBizTypeKey) && (
													<div className="ml-6 space-y-1">
														{protocolsInThisBizType.map(protocol => (
															<div key={protocol.id} className="flex items-center justify-between group">
																<button
																	onClick={() => handleProtocolClick(protocol)}
																	className={`text-xs hover:text-brand ${
																		currentProtocolId === protocol.id ? 'text-brand font-medium' : 'text-gray-600'
																	}`}
																>
																	{protocol.name}
																</button>
																<div className="flex gap-1 opacity-0 group-hover:opacity-100">
																	
																</div>
															</div>
														))}
													</div>
												)}
											</div>
										)
									})}
								</div>
							)}
						</div>
					))}
				</div>
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


