import React, { createContext, useContext, useMemo, useState } from 'react'

export type Chain = 'Ethereum' | 'Solana' | 'BSC' | 'Base'
export type BizType = 'DEX' | 'Lending' | 'Staking' | 'Restaking'

export type ChainTask = {
	id: string
	name: string
	chain: Chain
	status: 'draft' | 'active' | 'completed'
	createdAt: Date
	// Chain level: node connection, RPC endpoints, etc.
	nodeConfig: {
		rpcUrl: string
		wsUrl: string
		chainId: number
	}
}

export type ProtocolTask = {
	id: string
	name: string
	chain: Chain
	type: BizType
	status: 'draft' | 'active' | 'completed'
	createdAt: Date
	// Protocol level: step1-3 (data plan, template, log validation)
	dataPlan: {
		contractAddress: string
		abiPath: string
		events: string[]
	}
	templateConfig: {
		excelSchema: string
		replaceAIParsed: boolean
	}
	mappingRules: MappingRule[]
}

export type ColumnTask = {
	id: string
	name: string
	chain: Chain
	type: BizType
	status: 'draft' | 'active' | 'completed'
	createdAt: Date
	// Column level: step4-5 (SQL, ingestion)
	sqlText: string
	kafka: KafkaFlags
	doris: {
		host: string
		port: number
		database: string
		table: string
	}
}

export type MappingRule = {
	id: string
	sourceKey: string
	targetKey: string
	transformer: string
}

type KafkaFlags = {
	enableCompression: boolean
	retryBackoff: boolean
}

type AppState = {
	// Tree structure
	chains: ChainTask[]
	protocols: ProtocolTask[]
	columns: ColumnTask[]
	
	// Current selections
	currentChainId: string
	currentProtocolId: string
	currentColumnId: string
	
	// Actions
	createChain: (chain: Chain) => void
	deleteChain: (chainId: string) => void
	setCurrentChain: (chainId: string) => void
	
	createProtocol: (chain: Chain, type: BizType, customName?: string) => void
	deleteProtocol: (protocolId: string) => void
	setCurrentProtocol: (protocolId: string) => void
	
	createColumn: (chain: Chain, type: BizType) => void
	deleteColumn: (columnId: string) => void
	setCurrentColumn: (columnId: string) => void
	
	// Data operations
	updateProtocolDataPlan: (protocolId: string, dataPlan: Partial<ProtocolTask['dataPlan']> & { abiContent?: string }) => void
	updateMappingRule: (protocolId: string, ruleId: string, patch: Partial<MappingRule>) => void
	addMappingRule: (protocolId: string, rule?: Partial<MappingRule>) => void
	removeMappingRule: (protocolId: string, ruleId: string) => void
	reorderMappingRules: (protocolId: string, fromId: string, toId: string) => void
	
	updateSqlText: (columnId: string, sql: string) => void
	updateKafka: (columnId: string, patch: Partial<KafkaFlags>) => void
	
	// AI suggestions
	applySuggestion: (id: string) => void
}

const initialMappingRules: MappingRule[] = [
	{ id: 'event_name', sourceKey: 'event_name', targetKey: 'event_type', transformer: 'to_string' },
	{ id: 'transaction_hash', sourceKey: 'transaction_hash', targetKey: 'transaction_hash', transformer: 'to_lowercase' },
	{ id: 'block_number', sourceKey: 'block_number', targetKey: 'block_number', transformer: 'to_int' },
	{ id: 'from_address', sourceKey: 'from_address', targetKey: 'from_address', transformer: 'to_lowercase' },
	{ id: 'to_address', sourceKey: 'to_address', targetKey: 'to_address', transformer: 'to_lowercase' },
	{ id: 'value', sourceKey: 'value', targetKey: 'transfer_amount', transformer: 'normalize_by_decimals' },
	{ id: 'symbol_result', sourceKey: 'symbol_result', targetKey: 'token_symbol', transformer: '-' },
	{ id: 'decimals_result', sourceKey: 'decimals_result', targetKey: 'token_decimals', transformer: 'to_int' },
]

const AppCtx = createContext<AppState | null>(null)

export function AppStateProvider({ children }: { children: React.ReactNode }) {
	// Initialize with predefined chains
	const [chains, setChains] = useState<ChainTask[]>([
		{
			id: 'chain-eth',
			name: 'Eth',
			chain: 'Ethereum',
			status: 'active',
			createdAt: new Date(),
			nodeConfig: {
				rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/...',
				wsUrl: 'wss://eth-mainnet.g.alchemy.com/v2/...',
				chainId: 1
			}
		},
		{
			id: 'chain-sol',
			name: 'Sol',
			chain: 'Solana',
			status: 'active',
			createdAt: new Date(),
			nodeConfig: {
				rpcUrl: 'https://api.mainnet-beta.solana.com',
				wsUrl: 'wss://api.mainnet-beta.solana.com',
				chainId: 101
			}
		},
		{
			id: 'chain-base',
			name: 'Base',
			chain: 'Base',
			status: 'active',
			createdAt: new Date(),
			nodeConfig: {
				rpcUrl: 'https://mainnet.base.org',
				wsUrl: 'wss://mainnet.base.org',
				chainId: 8453
			}
		},
		{
			id: 'chain-bsc',
			name: 'BSC',
			chain: 'BSC',
			status: 'active',
			createdAt: new Date(),
			nodeConfig: {
				rpcUrl: 'https://bsc-dataseed.binance.org',
				wsUrl: 'wss://bsc-ws-node.nariox.org',
				chainId: 56
			}
		}
	])
	
	const [protocols, setProtocols] = useState<ProtocolTask[]>([
		{
			id: 'protocol-001',
			name: 'USDC Transfer Monitor',
			chain: 'Ethereum',
			type: 'DEX',
			status: 'active',
			createdAt: new Date(),
			dataPlan: {
				contractAddress: '0xA0b86a33E6441b8c4C8C1C1C1C1C1C1C1C1C1C1C1',
				abiPath: '/abis/erc20.json',
				events: ['Transfer', 'Approval']
			},
			templateConfig: {
				excelSchema: '',
				replaceAIParsed: true
			},
			mappingRules: initialMappingRules
		}
	])
	
	const [columns, setColumns] = useState<ColumnTask[]>([
		{
			id: 'column-001',
			name: 'USDC Transfer Data',
			chain: 'Ethereum',
			type: 'DEX',
			status: 'active',
			createdAt: new Date(),
			sqlText: `SELECT tx_hash, block_number, from_address, to_address, transfer_amount\nFROM raw_usdc_transfers\nWHERE block_number >= 19380000 AND transfer_amount > 0\nORDER BY block_number DESC\nLIMIT 100;`,
			kafka: { enableCompression: false, retryBackoff: false },
			doris: {
				host: '10.129.0.3',
				port: 8030,
				database: 'eth_trade_data',
				table: 'token'
			}
		}
	])
	
	const [currentChainId, setCurrentChainId] = useState<string>('chain-eth')
	const [currentProtocolId, setCurrentProtocolId] = useState<string>('protocol-001')
	const [currentColumnId, setCurrentColumnId] = useState<string>('column-001')

	// Chain operations
	const createChain = (chain: Chain) => {
		const newChain: ChainTask = {
			id: `chain-${Date.now()}`,
			name: `${chain} Network`,
			chain,
			status: 'draft',
			createdAt: new Date(),
			nodeConfig: {
				rpcUrl: '',
				wsUrl: '',
				chainId: chain === 'Ethereum' ? 1 : chain === 'BSC' ? 56 : chain === 'Base' ? 8453 : 101
			}
		}
		setChains(prev => [...prev, newChain])
		setCurrentChainId(newChain.id)
	}

	const deleteChain = (chainId: string) => {
		setChains(prev => prev.filter(c => c.id !== chainId))
		if (currentChainId === chainId) {
			const remainingChains = chains.filter(c => c.id !== chainId)
			if (remainingChains.length > 0) {
				setCurrentChainId(remainingChains[0].id)
			} else {
				setCurrentChainId('')
			}
		}
	}

	const setCurrentChain = (chainId: string) => {
		const chain = chains.find(c => c.id === chainId)
		if (chain) {
			setCurrentChainId(chainId)
		}
	}

	// Protocol operations
	const createProtocol = (chain: Chain, type: BizType, customName?: string) => {
		const newProtocol: ProtocolTask = {
			id: `protocol-${Date.now()}`,
			name: customName || `${type} ${chain} Monitor`,
			chain,
			type,
			status: 'draft',
			createdAt: new Date(),
			dataPlan: {
				contractAddress: '',
				abiPath: '',
				events: []
			},
			templateConfig: {
				excelSchema: '',
				replaceAIParsed: true
			},
			mappingRules: []
		}
		setProtocols(prev => [...prev, newProtocol])
		setCurrentProtocolId(newProtocol.id)
	}

	const deleteProtocol = (protocolId: string) => {
		setProtocols(prev => prev.filter(p => p.id !== protocolId))
		if (currentProtocolId === protocolId) {
			const remainingProtocols = protocols.filter(p => p.id !== protocolId)
			if (remainingProtocols.length > 0) {
				setCurrentProtocolId(remainingProtocols[0].id)
			} else {
				setCurrentProtocolId('')
			}
		}
	}

	const setCurrentProtocol = (protocolId: string) => {
		const protocol = protocols.find(p => p.id === protocolId)
		if (protocol) {
			setCurrentProtocolId(protocolId)
		}
	}

	// Column operations
	const createColumn = (chain: Chain, type: BizType) => {
		const newColumn: ColumnTask = {
			id: `column-${Date.now()}`,
			name: `${type} ${chain} Data`,
			chain,
			type,
			status: 'draft',
			createdAt: new Date(),
			sqlText: 'SELECT * FROM table LIMIT 100;',
			kafka: { enableCompression: false, retryBackoff: false },
			doris: {
				host: '',
				port: 8030,
				database: '',
				table: ''
			}
		}
		setColumns(prev => [...prev, newColumn])
		setCurrentColumnId(newColumn.id)
	}

	const deleteColumn = (columnId: string) => {
		setColumns(prev => prev.filter(c => c.id !== columnId))
		if (currentColumnId === columnId) {
			const remainingColumns = columns.filter(c => c.id !== columnId)
			if (remainingColumns.length > 0) {
				setCurrentColumnId(remainingColumns[0].id)
			} else {
				setCurrentColumnId('')
			}
		}
	}

	const setCurrentColumn = (columnId: string) => {
		const column = columns.find(c => c.id === columnId)
		if (column) {
			setCurrentColumnId(columnId)
		}
	}

	// Data operations
	const updateMappingRule = (protocolId: string, ruleId: string, patch: Partial<MappingRule>) => {
		setProtocols(prev => prev.map(p => 
			p.id === protocolId 
				? { ...p, mappingRules: p.mappingRules.map(r => r.id === ruleId ? { ...r, ...patch } : r) }
				: p
		))
	}

	const addMappingRule = (protocolId: string, rule?: Partial<MappingRule>) => {
		const id = (rule?.id || rule?.sourceKey || `rule_${Date.now()}`).toString()
		setProtocols(prev => prev.map(p => 
			p.id === protocolId 
				? { ...p, mappingRules: [...p.mappingRules, { id, sourceKey: '', targetKey: '', transformer: '-', ...rule }] }
				: p
		))
	}

	const removeMappingRule = (protocolId: string, ruleId: string) => {
		setProtocols(prev => prev.map(p => 
			p.id === protocolId 
				? { ...p, mappingRules: p.mappingRules.filter(r => r.id !== ruleId) }
				: p
		))
	}

	const updateProtocolDataPlan = (protocolId: string, dataPlan: Partial<ProtocolTask['dataPlan']> & { abiContent?: string }) => {
		setProtocols(prev => prev.map(p => 
			p.id === protocolId 
				? { 
					...p, 
					dataPlan: { ...p.dataPlan, ...dataPlan },
					// 如果有ABI内容，可以存储到其他地方或用于验证
				}
				: p
		))
	}

	const reorderMappingRules = (protocolId: string, fromId: string, toId: string) => {
		setProtocols(prev => prev.map(p => {
			if (p.id !== protocolId) return p
			const list = [...p.mappingRules]
			const fromIdx = list.findIndex(r => r.id === fromId)
			const toIdx = list.findIndex(r => r.id === toId)
			if (fromIdx === -1 || toIdx === -1) return p
			const [moved] = list.splice(fromIdx, 1)
			list.splice(toIdx, 0, moved)
			return { ...p, mappingRules: list }
		}))
	}

	const updateSqlText = (columnId: string, sql: string) => {
		setColumns(prev => prev.map(c => c.id === columnId ? { ...c, sqlText: sql } : c))
	}

	const updateKafka = (columnId: string, patch: Partial<KafkaFlags>) => {
		setColumns(prev => prev.map(c => c.id === columnId ? { ...c, kafka: { ...c.kafka, ...patch } } : c))
	}

	// AI suggestions
	const applySuggestion = (id: string) => {
		const currentProtocol = protocols.find(p => p.id === currentProtocolId)
		const currentColumn = columns.find(c => c.id === currentColumnId)
		
		switch (id) {
			case 'lowercase-addresses': {
				if (currentProtocol) {
					updateMappingRule(currentProtocol.id, 'from_address', { transformer: 'to_lowercase' })
					updateMappingRule(currentProtocol.id, 'to_address', { transformer: 'to_lowercase' })
				}
				break
			}
			case 'cast-block-to-int': {
				if (currentProtocol) {
					updateMappingRule(currentProtocol.id, 'block_number', { transformer: 'to_int' })
				}
				break
			}
			case 'normalize-value-by-decimals': {
				if (currentProtocol) {
					updateMappingRule(currentProtocol.id, 'value', { transformer: 'normalize_by_decimals' })
				}
				break
			}
			case 'sql-add-where-limit': {
				if (currentColumn) {
					let sql = currentColumn.sqlText
					if (!/limit\s+\d+/i.test(sql)) sql = sql.trim().replace(/;?$/, '\nLIMIT 100;')
					if (!/where/i.test(sql)) sql = sql.replace(/ORDER BY/i, 'WHERE block_number >= 19380000\nORDER BY')
					updateSqlText(currentColumn.id, sql)
				}
				break
			}
			case 'kafka-enable-compression': {
				if (currentColumn) {
					updateKafka(currentColumn.id, { enableCompression: true })
				}
				break
			}
			case 'kafka-enable-retry-backoff': {
				if (currentColumn) {
					updateKafka(currentColumn.id, { retryBackoff: true })
				}
				break
			}
			default:
				break
		}
	}

	const value = useMemo<AppState>(() => ({
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
		setCurrentColumn,
		updateProtocolDataPlan,
		updateMappingRule,
		addMappingRule,
		removeMappingRule,
		reorderMappingRules,
		updateSqlText,
		updateKafka,
		applySuggestion,
	}), [chains, protocols, columns, currentChainId, currentProtocolId, currentColumnId])

	return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useAppState() {
	const ctx = useContext(AppCtx)
	if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
	return ctx
}



