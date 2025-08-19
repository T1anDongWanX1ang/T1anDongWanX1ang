import { Link, useNavigate } from 'react-router-dom'
import { useAppState } from '../../state/AppState'
import { useState } from 'react'

export default function LeftDataNav() {
	const { 
		chains, 
		protocols, 
		columns,
		currentChainId, 
		currentProtocolId, 
		currentColumnId,
		createChain, 
		deleteChain, 
		setCurrentChain,
		createProtocol, 
		deleteProtocol, 
		setCurrentProtocol,
		createColumn, 
		deleteColumn, 
		setCurrentColumn
	} = useAppState()

	const navigate = useNavigate()
	const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set(['chain-eth']))
	const [expandedBizTypes, setExpandedBizTypes] = useState<Set<string>>(new Set())
	const [expandedProtocols, setExpandedProtocols] = useState<Set<string>>(new Set())
	const [expandedParsingTasks, setExpandedParsingTasks] = useState<Set<string>>(new Set())
	const [expandedIngestionTasks, setExpandedIngestionTasks] = useState<Set<string>>(new Set())
	const [showProtocolInput, setShowProtocolInput] = useState<string | null>(null)
	const [newProtocolName, setNewProtocolName] = useState('')
	const [showBizTypeInput, setShowBizTypeInput] = useState<string | null>(null)
	const [newBizTypeName, setNewBizTypeName] = useState('')

	const toggleChain = (chainId: string) => {
		const s = new Set(expandedChains)
		s.has(chainId) ? s.delete(chainId) : s.add(chainId)
		setExpandedChains(s)
	}
	
	const toggleBizType = (chainId: string, bizType: string) => {
		const key = `${chainId}-${bizType}`
		const s = new Set(expandedBizTypes)
		s.has(key) ? s.delete(key) : s.add(key)
		setExpandedBizTypes(s)
	}
	
	const toggleProtocol = (protocolId: string) => {
		const s = new Set(expandedProtocols)
		s.has(protocolId) ? s.delete(protocolId) : s.add(protocolId)
		setExpandedProtocols(s)
	}

	const toggleParsingTasks = (protocolId: string) => {
		const s = new Set(expandedParsingTasks)
		s.has(protocolId) ? s.delete(protocolId) : s.add(protocolId)
		setExpandedParsingTasks(s)
	}

	const toggleIngestionTasks = (protocolId: string) => {
		const s = new Set(expandedIngestionTasks)
		s.has(protocolId) ? s.delete(protocolId) : s.add(protocolId)
		setExpandedIngestionTasks(s)
	}

	const handleCreateProtocol = (chain: string, bizType: string) => {
		setShowProtocolInput(`${chain}-${bizType}`)
		setNewProtocolName('')
	}

	const confirmCreateProtocol = (chain: string, bizType: string) => {
		if (newProtocolName.trim()) {
			createProtocol(chain as any, bizType as any, newProtocolName.trim())
			setShowProtocolInput(null)
			setNewProtocolName('')
		}
	}

	const cancelCreateProtocol = () => {
		setShowProtocolInput(null)
		setNewProtocolName('')
	}

	const handleCreateBizType = (chainId: string) => {
		setShowBizTypeInput(chainId)
		setNewBizTypeName('')
	}

	const confirmCreateBizType = (chainId: string) => {
		if (newBizTypeName.trim()) {
			// Create a new protocol with the custom business type name
			createProtocol(chains.find(c => c.id === chainId)?.chain as any, 'DEX' as any, newBizTypeName.trim())
			setShowBizTypeInput(null)
			setNewBizTypeName('')
		}
	}

	const cancelCreateBizType = () => {
		setShowBizTypeInput(null)
		setNewBizTypeName('')
	}

	const currentChain = chains.find(c => c.id === currentChainId)
	const currentProtocol = protocols.find(p => p.id === currentProtocolId)
	const currentColumn = columns.find(c => c.id === currentColumnId)

	// Business types
	const bizTypes = ['DEX', 'Lending', 'Staking', 'Restaking'] as const

	return (
		<aside className="h-full bg-white border-r border-gray-200 p-4">
			<Link to="/" className="block text-xl font-semibold text-brand mb-6">Protocol Studio</Link>
			
			{/* Project Tree */}
			<div>
				<h4 className="text-sm font-semibold text-gray-700 mb-3">Project Tree</h4>
				<div className="space-y-1">
					{/* Predefined Chains */}
					{chains.map(chain => (
						<div key={chain.id} className="space-y-1">
							{/* Chain Level */}
							<div className="flex items-center justify-between group">
								<div className="flex items-center gap-2">
									<button 
										onClick={() => toggleChain(chain.id)} 
										className="text-xs text-gray-600 hover:text-gray-800"
									>
										<span className="w-4 h-4 flex items-center justify-center">
											{expandedChains.has(chain.id) ? '▼' : '▶'}
										</span>
									</button>
									<button
										onClick={() => setCurrentChain(chain.id)}
										className={`text-sm font-medium hover:text-brand ${currentChainId === chain.id ? 'text-brand' : 'text-gray-700'}`}
									>
										{chain.name}
									</button>
								</div>
								<div className="flex gap-1 opacity-0 group-hover:opacity-100">
									<button
										onClick={() => handleCreateBizType(chain.id)}
										className="text-xs px-1.5 py-0.5 bg-green-600 text-white rounded hover:bg-green-700"
										title="Add Business Type"
									>
										+
									</button>
									<button
										onClick={() => deleteChain(chain.id)}
										className="text-xs px-1.5 py-0.5 bg-red-500 text-white rounded hover:bg-red-600"
										title="Delete Chain"
									>
										×
									</button>
								</div>
							</div>

							{/* Chain Tasks + Business Types */}
							{expandedChains.has(chain.id) && (
								<div className="ml-6 space-y-1">
									{/* Chain Tasks - RPC Connection */}
									<div className="flex items-center justify-between group">
										<button
											onClick={() => { setCurrentChain(chain.id); navigate('/chain-config') }}
											className="text-xs text-gray-600 hover:text-brand ml-4"
										>
											RPC Connection
										</button>
									</div>

									{/* Business Type Input Field */}
									{showBizTypeInput === chain.id && (
										<div className="ml-6 space-y-2">
											<input
												type="text"
												placeholder="Enter business type name..."
												value={newBizTypeName}
												onChange={(e) => setNewBizTypeName(e.target.value)}
												className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand"
												onKeyPress={(e) => e.key === 'Enter' && confirmCreateBizType(chain.id)}
											/>
											<div className="flex gap-1">
												<button
													onClick={() => confirmCreateBizType(chain.id)}
													className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
												>
													✓
												</button>
												<button
													onClick={cancelCreateBizType}
													className="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
												>
													×
												</button>
											</div>
										</div>
									)}

									{/* Business Types under this chain */}
									{bizTypes.map(bizType => {
										const chainBizTypeKey = `${chain.id}-${bizType}`
										
										return (
											<div key={bizType} className="space-y-1">
												<div className="flex items-center justify-between group">
													<div className="flex items-center gap-2">
														<button 
															onClick={() => toggleBizType(chain.id, bizType)} 
															className="text-xs text-gray-600 hover:text-gray-800"
														>
															<span className="w-4 h-4 flex items-center justify-center">
																{expandedBizTypes.has(chainBizTypeKey) ? '▼' : '▶'}
															</span>
														</button>
														<span className="text-xs text-gray-600">
															{bizType}
														</span>
													</div>
													<div className="flex gap-1 opacity-0 group-hover:opacity-100">
														<button
															onClick={() => handleCreateProtocol(chain.chain, bizType)}
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

												{/* Protocols under this business type */}
												{expandedBizTypes.has(chainBizTypeKey) && (
													<div className="ml-6 space-y-1">
														{protocols.filter(p => p.chain === chain.chain && p.type === bizType).map(protocol => (
															<div key={protocol.id} className="space-y-1">
																<div className="flex items-center justify-between group">
																	<div className="flex items-center gap-2">
																		<button 
																			onClick={() => toggleProtocol(protocol.id)} 
																			className="text-xs text-gray-600 hover:text-gray-800"
																		>
																			<span className="w-4 h-4 flex items-center justify-center">
																				{expandedProtocols.has(protocol.id) ? '▼' : '▶'}
																			</span>
																		</button>
																		<button
																			onClick={() => setCurrentProtocol(protocol.id)}
																			className={`text-xs hover:text-brand ${currentProtocolId === protocol.id ? 'text-brand' : 'text-gray-600'}`}
																		>
																			{protocol.name}
																		</button>
																	</div>
																	<div className="flex gap-1 opacity-0 group-hover:opacity-100">
																		{/* Removed + button for protocols - no more adding at this level */}
																		<button
																			onClick={() => deleteProtocol(protocol.id)}
																			className="text-xs px-1.5 py-0.5 bg-red-500 text-white rounded hover:bg-red-600"
																			title="Delete Protocol"
																		>
																			×
																		</button>
																	</div>
																</div>

																{/* Protocol Tasks - Separated into Parsing and Ingestion */}
																{expandedProtocols.has(protocol.id) && (
																	<div className="ml-6 space-y-1">
																		{/* Parsing Tasks - Step1-3 */}
																		<div className="flex items-center gap-2">
																			<button 
																				onClick={() => toggleParsingTasks(protocol.id)} 
																				className="text-xs text-gray-600 hover:text-gray-800"
																			>
																				<span className="w-4 h-4 flex items-center justify-center">
																					{expandedParsingTasks.has(protocol.id) ? '▼' : '▶'}
																				</span>
																			</button>
																			<span className="text-xs text-gray-600">解析任务</span>
																		</div>
																		{expandedParsingTasks.has(protocol.id) && (
																			<div className="ml-4 space-y-1">
																				<button 
																					onClick={() => { setCurrentProtocol(protocol.id); navigate('/step-1') }} 
																					className="text-xs text-gray-600 hover:text-brand block w-full text-left"
																				>
																					Step 1: Define Data Plan
																				</button>
																				<button 
																					onClick={() => { setCurrentProtocol(protocol.id); navigate('/step-2') }} 
																					className="text-xs text-gray-600 hover:text-brand block w-full text-left"
																				>
																					Step 2: Field Mapping
																				</button>
																				<button 
																					onClick={() => { setCurrentProtocol(protocol.id); navigate('/step-3') }} 
																					className="text-xs text-gray-600 hover:text-brand block w-full text-left"
																				>
																					Step 3: Validation
																				</button>
																			</div>
																		)}

																		{/* Ingestion Tasks - Step4-5 */}
																		<div className="flex items-center gap-2">
																			<button 
																				onClick={() => toggleIngestionTasks(protocol.id)} 
																				className="text-xs text-gray-600 hover:text-gray-800"
																			>
																				<span className="w-4 h-4 flex items-center justify-center">
																					{expandedIngestionTasks.has(protocol.id) ? '▼' : '▶'}
																				</span>
																			</button>
																			<span className="text-xs text-gray-600">入库任务</span>
																		</div>
																		{expandedIngestionTasks.has(protocol.id) && (
																			<div className="ml-4 space-y-1">
																				<button 
																					onClick={() => { setCurrentProtocol(protocol.id); navigate('/step-4') }} 
																					className="text-xs text-gray-600 hover:text-brand block w-full text-left"
																				>
																					Step 4: SQL Editor
																				</button>
																				<button 
																					onClick={() => { setCurrentProtocol(protocol.id); navigate('/step-5') }} 
																					className="text-xs text-gray-600 hover:text-brand block w-full text-left"
																				>
																					Step 5: Ingestion
																				</button>
																			</div>
																		)}

																		{/* Columns under this protocol */}
																		<div className="ml-4 space-y-1">
																			{columns.filter(c => c.chain === protocol.chain && c.type === protocol.type).map(column => (
																				<div key={column.id} className="space-y-1">
																					<div className="flex items-center justify-between group">
																						<button
																							onClick={() => setCurrentColumn(column.id)}
																							className={`text-xs hover:text-brand ${currentColumnId === column.id ? 'text-brand' : 'text-gray-600'}`}
																						>
																							{column.name}
																						</button>
																						<div className="flex gap-1 opacity-0 group-hover:opacity-100">
																							<button
																								onClick={() => deleteColumn(column.id)}
																								className="text-xs px-1.5 py-0.5 bg-red-500 text-white rounded hover:bg-red-600"
																								title="Delete Column"
																							>
																								×
																							</button>
																						</div>
																					</div>
																				</div>
																			))}
																		</div>
																	</div>
																)}
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

					{/* Add New Chain Button */}
					<div className="mt-4 pt-4 border-t border-gray-200">
						<button
							onClick={() => createChain('Ethereum')}
							className="w-full px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:border-brand hover:text-brand transition-colors"
						>
							+ Add New Chain
						</button>
					</div>
				</div>
			</div>

			{/* Current Context Info */}
			{(currentChain || currentProtocol || currentColumn) && (
				<div className="mt-6 p-3 bg-brand-muted rounded">
					{currentChain && (
						<div className="text-xs font-medium text-brand mb-1">
							Chain: {currentChain.name}
						</div>
					)}
					{currentProtocol && (
						<div className="text-xs text-brand/70 mb-1">
							Protocol: {currentProtocol.name} ({currentProtocol.type})
						</div>
					)}
					{currentColumn && (
						<div className="text-xs text-brand/70">
							Column: {currentColumn.name}
						</div>
					)}
				</div>
			)}
		</aside>
	)
}


