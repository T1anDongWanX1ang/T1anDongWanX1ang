import React, { createContext, useContext, useState, useMemo } from 'react'

export type Chain = 'Ethereum' | 'Solana' | 'Base' | 'BSC'
export type BizType = 'DEX' | 'Lending' | 'Bridge' | 'NFT' | 'GameFi' | 'Staking'

export type ChainTask = {
	id: string
	name: string
	chain: Chain
	status: 'draft' | 'active' | 'completed'
	createdAt: Date

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

export type KafkaFlags = {
	enableCompression?: boolean
	retryBackoff?: boolean
	batchSize?: number
	lingerMs?: number
	maxInFlightRequests?: number
	requestTimeoutMs?: number
	deliveryTimeoutMs?: number
}

export type DictMappingRule = {
	source_key: string
	target_key: string
	transformer?: string
}

export type EventMonitor = {
	name: string
	type: "event_monitor"
	chain_name: string
	contract_address: string
	abi_path: string
	events_to_monitor: string[]
}

export type DictMapper = {
	name: string
	type: "dict_mapper"
	mapping_rules: DictMappingRule[]
}

type AppState = {
	chains: ChainTask[]
	columns: ColumnTask[]
	components: any[]
	eventParams: Record<string, string[]> // 存储事件参数，格式为 {'step1': ['param1', 'param2']}

	// Current selections
	currentChainId: string
	currentProtocolId: string
	currentColumnId: string
	createChain: (chain: Chain) => void
	deleteChain: (chainId: string) => void
	setCurrentChain: (chainId: string) => void
	createColumn: (chain: Chain, type: BizType) => void
	deleteColumn: (columnId: string) => void
	setCurrentColumn: (columnId: string) => void
	updateProtocolDataPlan: (protocolId: string, dataPlan: Partial<ProtocolTask['dataPlan']> & { abiContent?: string }) => void
	updateMappingRule: (protocolId: string, ruleId: string, patch: Partial<MappingRule>) => void
	addMappingRule: (protocolId: string, rule?: Partial<MappingRule>) => void
	removeMappingRule: (protocolId: string, ruleId: string) => void
	reorderMappingRules: (protocolId: string, fromId: string, toId: string) => void
	updateSqlText: (columnId: string, sql: string) => void
	updateKafka: (columnId: string, patch: Partial<KafkaFlags>) => void
	
	// Components operations
	addComponent: (component: any) => void
	updateComponent: (name: string, component: any) => void
	setComponents: (components: any[]) => void
	setEventParams: (name: string, params: string[]) => void
	
	// AI suggestions
	applySuggestion: (id: string) => void
}

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
			nodeConfig: { rpcUrl: '', wsUrl: '', chainId: 56 }
		}
	])
	
	const [columns, setColumns] = useState<ColumnTask[]>([
		{
			id: 'column-aave',
			name: 'Aave V3 Data',
			chain: 'Ethereum',
			type: 'Lending',
			status: 'active',
			createdAt: new Date(),
			sqlText: 'SELECT * FROM aave_events LIMIT 100;',
			kafka: { enableCompression: false, retryBackoff: false },
			doris: {
				host: '',
				port: 8030,
				database: '',
				table: ''
			}
		}
	])
	
	// Initialize components as empty array (no initial data as requested)
	const [components, setComponentsData] = useState<any[]>([])

	// Initialize event params storage
	const [eventParams, setEventParamsState] = useState<Record<string, string[]>>({})

	const [currentChainId, setCurrentChainId] = useState<string>('chain-eth')
	const [currentProtocolId, setCurrentProtocolId] = useState<string>('')
	const [currentColumnId, setCurrentColumnId] = useState<string>('')

	const createChain = (chain: Chain) => {
		console.log('Creating chain:', chain)
	}

	const deleteChain = (chainId: string) => {
		console.log('Deleting chain:', chainId)
	}

	const setCurrentChain = (chainId: string) => setCurrentChainId(chainId)

	const createColumn = (chain: Chain, type: BizType) => {
		const newColumn: ColumnTask = {
			id: `column-${Date.now()}`,
			name: `${type} Column`,
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

	// Protocol operations (kept for compatibility but not used)
	const updateProtocolDataPlan = (protocolId: string, dataPlan: Partial<ProtocolTask['dataPlan']> & { abiContent?: string }) => {
		console.log('updateProtocolDataPlan called (deprecated):', protocolId, dataPlan)
	}

	const updateMappingRule = (protocolId: string, ruleId: string, patch: Partial<MappingRule>) => {
		console.log('updateMappingRule called (deprecated):', protocolId, ruleId, patch)
	}

	const addMappingRule = (protocolId: string, rule?: Partial<MappingRule>) => {
		console.log('addMappingRule called (deprecated):', protocolId, rule)
	}

	const removeMappingRule = (protocolId: string, ruleId: string) => {
		console.log('removeMappingRule called (deprecated):', protocolId, ruleId)
	}

	const reorderMappingRules = (protocolId: string, fromId: string, toId: string) => {
		console.log('reorderMappingRules called (deprecated):', protocolId, fromId, toId)
	}

	const updateSqlText = (columnId: string, sql: string) => {
		setColumns(prev => prev.map(c => 
			c.id === columnId ? { ...c, sqlText: sql } : c
		))
	}

	const updateKafka = (columnId: string, patch: Partial<KafkaFlags>) => {
		setColumns(prev => prev.map(c => 
			c.id === columnId ? { ...c, kafka: { ...c.kafka, ...patch } } : c
		))
	}

	// Components operations
	const addComponent = (component: any) => {
		setComponentsData(prev => [...prev, component])
	}

	const updateComponent = (name: string, component: any) => {
		setComponentsData(prev => {
			const existingIndex = prev.findIndex(c => c.name === name)
			if (existingIndex !== -1) {
				const newComponents = [...prev]
				newComponents[existingIndex] = component
				return newComponents
			} else {
				return [...prev, component] // Added to last position
			}
		})
	}

	const setEventParams = (name: string, params: string[]) => {
		setEventParamsState(prev => ({
			...prev,
			[name]: params
		}))
	}

	// AI suggestions
	const applySuggestion = (id: string) => {
		console.log('Applying suggestion:', id)
	}

	const value = useMemo<AppState>(() => ({
		chains,
		columns,
		components,
		eventParams,
		currentChainId,
		currentProtocolId,
		currentColumnId,
		createChain,
		deleteChain,
		setCurrentChain,
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
		addComponent,
		updateComponent,
		setComponents: setComponentsData,
		setEventParams,
		applySuggestion,
	}), [chains, columns, components, eventParams, currentChainId, currentProtocolId, currentColumnId])

	return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useAppState() {
	const ctx = useContext(AppCtx)
	if (!ctx) {
		throw new Error('useAppState must be used within AppStateProvider')
	}
	return ctx
}