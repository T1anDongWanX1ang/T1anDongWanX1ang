import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppState } from '../../state/AppState'

type Suggestion = { id: string; title: string; tips: Array<{ text: string; actionId: string; adopted?: boolean }> }

export default function RightAISidebar() {
	const { pathname } = useLocation()
	const [showModal, setShowModal] = useState(false)
	const [isCollapsed, setIsCollapsed] = useState(true) // Default collapsed
	const { 
		applySuggestion, 
		currentChainId, 
		currentProtocolId, 
		currentColumnId,
		chains, 
		columns, 
		components
	} = useAppState()
	
	const currentChain = chains.find(c => c.id === currentChainId)
	const currentProtocol = components.find(c => c.name === "step1") // Get step1 data from components
	const currentColumn = columns.find(c => c.id === currentColumnId)
	
	const suggestion = useMemo<Suggestion>(() => {
		if (pathname.includes('step-1') || pathname === '/') {
			return {
				id: 's1',
				title: 'AI Suggestions',
				tips: [
					{ text: 'Include ABI for precise event parsing', actionId: 'noop' },
					{ text: 'List critical events (Transfer, Approval)', actionId: 'noop' },
					{ text: 'Use consistent snake_case field names', actionId: 'noop' },
					{ text: 'Infer token_decimals from ABI automatically', actionId: 'noop' },
					{ text: 'Ready for configuration', actionId: 'noop' },
					{ text: currentProtocol ? `Protocol: ${currentProtocol.name} - Data plan setup` : 'No protocol selected', actionId: 'noop' },
				],
			}
		}
		if (pathname.includes('step-2')) {
			return {
				id: 's2',
				title: 'AI Suggestions',
				tips: [
					{ text: 'Use to_lowercase on addresses', actionId: 'lowercase-addresses' },
					{ text: 'Cast block_number to integer', actionId: 'cast-block-to-int' },
					{ text: 'Normalize value by token_decimals', actionId: 'normalize-value-by-decimals' },
					{ text: 'Detected from ABI: events Transfer; functions symbol(), decimals()', actionId: 'noop' },
					{ text: currentProtocol ? `Protocol: ${currentProtocol.name} - Field mapping optimized` : 'No protocol selected', actionId: 'noop' },
				],
			}
		}
		if (pathname.includes('step-3')) {
			return {
				id: 's3',
				title: 'AI Suggestions',
				tips: [
					{ text: 'Fix mismatched mapping fields', actionId: 'noop' },
					{ text: 'Ensure log file includes all required columns', actionId: 'noop' },
					{ text: 'Use decimals-aware conversion for value column', actionId: 'noop' },
					{ text: currentProtocol ? `Validating ${currentProtocol.chain_name} event_monitor data` : 'No protocol selected', actionId: 'noop' },
				],
			}
		}
		if (pathname.includes('step-4')) {
			return {
				id: 's4',
				title: 'AI Suggestions',
				tips: [
					{ text: 'Use LIMIT for test runs', actionId: 'sql-add-where-limit' },
					{ text: 'Add WHERE block_number >= X', actionId: 'sql-add-where-limit' },
					{ text: 'Index-aware predicates first', actionId: 'noop' },
					{ text: 'Compare column types', actionId: 'noop' },
					{ text: 'Check decimals normalization', actionId: 'noop' },
					{ text: currentColumn ? `SQL Editor for ${currentColumn.name}` : 'No column selected', actionId: 'noop' },
				],
			}
		}
		return {
			id: 's5',
			title: 'AI Suggestions',
			tips: [
				{ text: 'Start with Test env', actionId: 'noop' },
				{ text: 'Validate table schema before deploy', actionId: 'noop' },
				{ text: 'Replicas=1 for dev', actionId: 'noop' },
				{ text: 'Linger.ms=0 for realtime', actionId: 'noop' },
				{ text: 'Enable batch compression', actionId: 'kafka-enable-compression' },
				{ text: 'Set retry backoff', actionId: 'kafka-enable-retry-backoff' },
				{ text: currentColumn ? `Deploying ${currentColumn.name} to production` : 'No column selected', actionId: 'noop' },
			],
		}
	}, [pathname, currentProtocol, currentColumn])

	return (
		<>
			<aside className={`h-full bg-white border-l border-gray-200 transition-all duration-300 ${
				isCollapsed ? 'w-12' : 'w-[320px]'
			}`}>
				{isCollapsed ? (
					// Collapsed state - only show one button
					<div className="p-3">
						<button
							onClick={() => setIsCollapsed(false)}
							className="w-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded flex items-center justify-center"
							title="Expand AI Suggestions"
						>
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
							</svg>
						</button>
					</div>
				) : (
					// Expanded state - show full content
					<div className="p-4">
						<div className="flex items-center justify-between mb-4">
							<h3 className="font-semibold text-gray-800">{suggestion.title}</h3>
							<div className="flex gap-1">
								<button
									onClick={() => setShowModal(true)}
									className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
									title="Expand AI Suggestion Details"
								>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
									</svg>
								</button>
								<button
									onClick={() => setIsCollapsed(true)}
									className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
									title="Collapse AI Suggestions"
								>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
									</svg>
								</button>
							</div>
						</div>
			
			{/* Context Info */}
			<div className="mt-2 space-y-2">
				{currentChain && (
					<div className="p-2 bg-blue-50 rounded text-xs border border-blue-200">
						<div className="font-medium text-blue-700">Chain: {currentChain.name}</div>
						<div className="text-blue-600">Status: {currentChain.status}</div>
						<div className="text-blue-600">RPC: {currentChain.nodeConfig.rpcUrl ? 'Configured' : 'Not configured'}</div>
					</div>
				)}
				
				{currentProtocol && (
					<div className="p-2 bg-green-50 rounded text-xs border border-green-200">
						<div className="font-medium text-green-700">Protocol: {currentProtocol.name}</div>
						<div className="text-green-600">{currentProtocol.chain_name} • {currentProtocol.type}</div>
						<div className="text-green-600">Contract: {currentProtocol.contract_address?.slice(0, 10)}...</div>
						<div className="text-green-600">Events: {currentProtocol.events_to_monitor?.length || 0}</div>
					</div>
				)}
				
				{currentColumn && (
					<div className="p-2 bg-purple-50 rounded text-xs border border-purple-200">
						<div className="font-medium text-purple-700">Column: {currentColumn.name}</div>
						<div className="text-purple-600">{currentColumn.chain} • {currentColumn.type}</div>
						<div className="text-purple-600">Status: {currentColumn.status}</div>
						<div className="text-purple-600">Kafka: {currentColumn.kafka.enableCompression ? 'Compression ON' : 'Compression OFF'}</div>
					</div>
				)}
			</div>
			
			<ul className="mt-3 space-y-2 text-sm">
				{suggestion.tips.map((tip, i) => (
					<li key={i} className="flex items-start gap-2">
						{tip.actionId !== 'noop' ? (
							<button 
								onClick={() => applySuggestion(tip.actionId)} 
								className="mt-0.5 h-5 w-5 shrink-0 rounded border border-gray-300 text-[10px] hover:border-brand hover:bg-brand/10"
							>
								Adopt
							</button>
						) : (
							<div className="mt-0.5 h-5 w-5 shrink-0 rounded border border-gray-200 bg-gray-50 text-[10px] flex items-center justify-center text-gray-400">
								✓
							</div>
						)}
						<p className="text-gray-700 leading-5">{tip.text}</p>
					</li>
						))}
					</ul>
					</div>
				)}
			</aside>

			{/* AI Suggestion Modal */}
			{showModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
						{/* Modal Header */}
						<div className="flex items-center justify-between p-4 border-b border-gray-200">
							<h2 className="text-lg font-semibold text-gray-800">AI Smart Suggestions</h2>
							<button
								onClick={() => setShowModal(false)}
								className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
							>
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>

						{/* Modal Content */}
						<div className="p-4 overflow-y-auto max-h-[60vh]">
							<div className="space-y-4">
								{suggestion.tips.map((tip, i) => (
									<div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
										<div className="flex-shrink-0 mt-1">
											{tip.actionId !== 'noop' ? (
												<button 
													onClick={() => {
														applySuggestion(tip.actionId)
														setShowModal(false)
													}} 
													className="px-3 py-1 bg-brand text-white text-xs rounded hover:bg-brand/90"
												>
													Apply
												</button>
											) : (
												<div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
													<svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
														<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
													</svg>
												</div>
											)}
										</div>
										<div className="flex-1">
											<p className="text-gray-700 text-sm leading-relaxed">{tip.text}</p>
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Modal Footer */}
						<div className="p-4 border-t border-gray-200 bg-gray-50">
							<div className="flex justify-end">
								<button
									onClick={() => setShowModal(false)}
									className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
								>
									Close
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	)
}


