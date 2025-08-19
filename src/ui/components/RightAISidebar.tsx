import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppState } from '../../state/AppState'

type Suggestion = { id: string; title: string; tips: Array<{ text: string; actionId: string; adopted?: boolean }> }

export default function RightAISidebar() {
	const { pathname } = useLocation()
	const { 
		applySuggestion, 
		currentChainId, 
		currentProtocolId, 
		currentColumnId,
		chains, 
		protocols, 
		columns, 
		selectedChain, 
		selectedType 
	} = useAppState()
	
	const currentChain = chains.find(c => c.id === currentChainId)
	const currentProtocol = protocols.find(p => p.id === currentProtocolId)
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
					{ text: `Current: ${selectedChain} ${selectedType} - Ready for configuration`, actionId: 'noop' },
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
					{ text: currentProtocol ? `Validating ${currentProtocol.chain} ${currentProtocol.type} data` : 'No protocol selected', actionId: 'noop' },
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
	}, [pathname, currentProtocol, currentColumn, selectedChain, selectedType])

	return (
		<aside className="h-full bg-white border-l border-gray-200 p-4 w-[320px]">
			<h3 className="font-semibold text-gray-800">{suggestion.title}</h3>
			
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
						<div className="text-green-600">{currentProtocol.chain} • {currentProtocol.type}</div>
						<div className="text-green-600">Status: {currentProtocol.status}</div>
						<div className="text-green-600">Rules: {currentProtocol.mappingRules.length}</div>
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
		</aside>
	)
}


