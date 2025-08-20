import { createContext, useContext, useState } from 'react'

export type Chain = 'Ethereum' | 'Solana' | 'Base' | 'BSC'
export type BizType = 'DEX' | 'Lending' | 'Staking' | 'Restaking'

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
	description?: string
}

type KafkaFlags = {
	enableCompression: boolean
	retryBackoff: boolean
	batchSize?: number
	lingerMs?: number
	bufferMemory?: number
	acks?: string
	compressionType?: string
	maxInFlightRequests?: number
	requestTimeoutMs?: number
	deliveryTimeoutMs?: number
}

type AppState = {
	chains: ChainTask[]
	protocols: ProtocolTask[]
	columns: ColumnTask[]
	currentChainId: string
	currentProtocolId: string
	currentColumnId: string
	createChain: (chain: Chain) => void
	deleteChain: (chainId: string) => void
	setCurrentChain: (chainId: string) => void
	createProtocol: (chain: Chain, type: BizType, customName?: string) => void
	deleteProtocol: (protocolId: string) => void
	setCurrentProtocol: (protocolId: string) => void
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
	applySuggestion: (id: string) => void
}

const AppCtx = createContext<AppState | null>(null)

export function AppStateProvider({ children }: { children: React.ReactNode }) {
	const [chains] = useState<ChainTask[]>([
		{
			id: 'chain-eth',
			name: 'Eth',
			chain: 'Ethereum',
			status: 'active',
			createdAt: new Date(),
			nodeConfig: { rpcUrl: '', wsUrl: '', chainId: 1 }
		},
		{
			id: 'chain-sol',
			name: 'Sol',
			chain: 'Solana',
			status: 'active',
			createdAt: new Date(),
			nodeConfig: { rpcUrl: '', wsUrl: '', chainId: 101 }
		},
		{
			id: 'chain-base',
			name: 'Base',
			chain: 'Base',
			status: 'active',
			createdAt: new Date(),
			nodeConfig: { rpcUrl: '', wsUrl: '', chainId: 8453 }
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
	
	// 添加一些示例协议数据
	const [protocols, setProtocols] = useState<ProtocolTask[]>([
		{
			id: 'protocol-uniswap',
			name: 'Uniswap V3',
			chain: 'Ethereum',
			type: 'DEX',
			status: 'active',
			createdAt: new Date(),
			dataPlan: {
				contractAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
				abiPath: '',
				events: ['Swap', 'Mint', 'Burn']
			},
			templateConfig: {
				excelSchema: '',
				replaceAIParsed: false
			},
			mappingRules: []
		},
		{
			id: 'protocol-aave',
			name: 'Aave V3',
			chain: 'Ethereum',
			type: 'Lending',
			status: 'active',
			createdAt: new Date(),
			dataPlan: {
				contractAddress: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
				abiPath: '',
				events: ['Supply', 'Withdraw', 'Borrow', 'Repay']
			},
			templateConfig: {
				excelSchema: '',
				replaceAIParsed: false
			},
			mappingRules: []
		}
	])
	
	const [columns, setColumns] = useState<ColumnTask[]>([])
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
	
	const createProtocol = (chain: Chain, type: BizType, customName?: string) => {
		const newProtocol: ProtocolTask = {
			id: `protocol-${Date.now()}`,
			name: customName || `${type} Protocol`,
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
				replaceAIParsed: false
			},
			mappingRules: []
		}
		setProtocols(prev => [...prev, newProtocol])
		setCurrentProtocolId(newProtocol.id)
	}
	
	const deleteProtocol = (protocolId: string) => {
		setProtocols(prev => prev.filter(p => p.id !== protocolId))
		if (currentProtocolId === protocolId) {
			setCurrentProtocolId('')
		}
	}
	
	const setCurrentProtocol = (protocolId: string) => setCurrentProtocolId(protocolId)
	
	const createColumn = (chain: Chain, type: BizType) => {
		const newColumn: ColumnTask = {
			id: `column-${Date.now()}`,
			name: `${type} Column`,
			chain,
			type,
			status: 'draft',
			createdAt: new Date(),
			sqlText: '',
			kafka: {
				enableCompression: false,
				retryBackoff: false
			},
			doris: {
				host: '',
				port: 9030,
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
			setCurrentColumnId('')
		}
	}
	
	const setCurrentColumn = (columnId: string) => setCurrentColumnId(columnId)

	const updateProtocolDataPlan = (protocolId: string, dataPlan: Partial<ProtocolTask['dataPlan']> & { abiContent?: string }) => {
		setProtocols(prev => prev.map(p => 
			p.id === protocolId 
				? { ...p, dataPlan: { ...p.dataPlan, ...dataPlan } }
				: p
		))
	}

	const updateMappingRule = (protocolId: string, ruleId: string, patch: Partial<MappingRule>) => {
		setProtocols(prev => prev.map(p => 
			p.id === protocolId 
				? { 
					...p, 
					mappingRules: p.mappingRules.map(r => 
						r.id === ruleId ? { ...r, ...patch } : r
					)
				}
				: p
		))
	}

	const addMappingRule = (protocolId: string, rule?: Partial<MappingRule>) => {
		const newRule: MappingRule = {
			id: `rule-${Date.now()}`,
			sourceKey: rule?.sourceKey || '',
			targetKey: rule?.targetKey || '',
			transformer: rule?.transformer || '',
			description: rule?.description || ''
		}
		setProtocols(prev => prev.map(p => 
			p.id === protocolId 
				? { ...p, mappingRules: [...p.mappingRules, newRule] }
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

	const reorderMappingRules = (protocolId: string, fromId: string, toId: string) => {
		console.log('Reordering rules:', { protocolId, fromId, toId })
	}

	const updateSqlText = (columnId: string, sql: string) => {
		setColumns(prev => prev.map(c => 
			c.id === columnId ? { ...c, sqlText: sql } : c
		))
	}

	const updateKafka = (columnId: string, patch: Partial<KafkaFlags>) => {
		setColumns(prev => prev.map(c => 
			c.id === columnId 
				? { ...c, kafka: { ...c.kafka, ...patch } }
				: c
		))
	}

	const applySuggestion = (id: string) => {
		console.log('Applying suggestion:', id)
	}

	const value: AppState = {
		chains, protocols, columns,
		currentChainId, currentProtocolId, currentColumnId,
		createChain, deleteChain, setCurrentChain,
		createProtocol, deleteProtocol, setCurrentProtocol,
		createColumn, deleteColumn, setCurrentColumn,
		updateProtocolDataPlan, updateMappingRule, addMappingRule,
		removeMappingRule, reorderMappingRules, updateSqlText,
		updateKafka, applySuggestion
	}

	return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useAppState() {
	const ctx = useContext(AppCtx)
	if (!ctx) {
		throw new Error('useAppState must be used within AppStateProvider')
	}
	return ctx
}