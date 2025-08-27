import React, { createContext, useContext, useState, useMemo } from 'react'
import { api } from '../services/api'

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
	transformer?: string | null
}

export type EventMappingRule = {
	event_name: string
	mapping_rules: DictMappingRule[]
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
	dict_mappers: EventMappingRule[]
}

export type KafkaProducer = {
	name: string
	type: "kafka_producer"
	bootstrap_servers: string
	topic: string
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
	currentPipelineId: number | null  // 新增：当前管道ID
	createChain: (chain: Chain) => void
	deleteChain: (chainId: string) => void
	setCurrentChain: (chainId: string) => void
	setCurrentProtocolId: (protocolId: string) => void
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
	
	// Pipeline operations
	setCurrentPipeline: (pipelineId: number | null) => void
	loadPipelineConfig: (pipelineId: number) => Promise<void>
	
	// AI suggestions
	applySuggestion: (id: string) => void
}

const AppCtx = createContext<AppState | null>(null)

export function AppStateProvider({ children }: { children: React.ReactNode }) {
	// Initialize with empty chains array
	const [chains, setChains] = useState<ChainTask[]>([])
	
	// Initialize with empty columns array
	const [columns, setColumns] = useState<ColumnTask[]>([])
	
	// Initialize components as empty array (no initial data as requested)
	const [components, setComponentsData] = useState<any[]>([])

	// Initialize event params storage
	const [eventParams, setEventParamsState] = useState<Record<string, string[]>>({})

	const [currentChainId, setCurrentChainId] = useState<string>('')
	const [currentProtocolId, setCurrentProtocolId] = useState<string>('')
	const [currentColumnId, setCurrentColumnId] = useState<string>('')
	const [currentPipelineId, setCurrentPipelineId] = useState<number | null>(null)

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

	// Pipeline operations
	const setCurrentPipeline = (pipelineId: number | null) => {
		setCurrentPipelineId(pipelineId)
		console.log('Current pipeline ID set to:', pipelineId)
	}

	const loadPipelineConfig = async (pipelineId: number) => {
		try {
			console.log('🔄 开始加载管道配置，ID:', pipelineId)
			const response = await api.pipeline.getConfig(pipelineId)
			
			// 首先检查响应是否成功，以及data是否存在
			if (response.success && response.data && response.data.components && response.data.components.length > 0) {
				// 成功获取到配置且有组件数据
				console.log('✅ 管道配置加载成功:', {
					pipeline_id: response.data.pipeline_id,
					pipeline_name: response.data.pipeline_name,
					components_count: response.data.components.length,
					components: response.data.components
				})
				
				// 设置组件数据
				setComponentsData(response.data.components)
				
				// 解析并设置事件参数（如果有event_monitor组件）
				const eventMonitorComponent = response.data.components.find((c: any) => c.type === 'event_monitor')
				if (eventMonitorComponent && eventMonitorComponent.events_to_monitor) {
					// 从组件数据中解析事件参数
					const baseFields = [
						"event_name",
						"contract_address", 
						"transaction_hash",
						"block_number",
						"log_index",
						"timestamp",
						"chain"
					]
					
					// 这里简化处理，如果需要完整的事件参数解析，需要ABI数据
					// 目前先使用基础字段 + 事件名称作为参数
					const eventParams = [
						...baseFields,
						...eventMonitorComponent.events_to_monitor.map((event: string) => `args.${event}_data`)
					]
					
					setEventParamsState(prev => ({
						...prev,
						step1: eventParams
					}))
					
					console.log('📋 已设置事件参数:', eventParams)
				}
				
				console.log('🎯 管道配置加载完成，组件数据已填充到全局状态')
			} else {
				// API返回失败、data不存在或components为空的情况
				console.log('📝 管道配置不存在或为空，清空组件数据')
				console.log('响应详情:', { 
					success: response.success, 
					message: response.message, 
					data: response.data,
					hasData: !!response.data,
					hasComponents: !!(response.data && response.data.components),
					componentsLength: response.data && response.data.components ? response.data.components.length : 0
				})
				setComponentsData([])
				// 清空事件参数
				setEventParamsState(prev => ({
					...prev,
					step1: []
				}))
			}
		} catch (error) {
			// 网络错误或其他错误，也设置为空数组
			console.error('❌ 加载管道配置失败:', error)
			setComponentsData([])
			// 清空事件参数
			setEventParamsState(prev => ({
				...prev,
				step1: []
			}))
		}
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
		currentPipelineId,
		createChain,
		deleteChain,
		setCurrentChain,
		setCurrentProtocolId,
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
		setCurrentPipeline,
		loadPipelineConfig,
		applySuggestion,
	}), [chains, columns, components, eventParams, currentChainId, currentProtocolId, currentColumnId, currentPipelineId])

	return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useAppState() {
	const ctx = useContext(AppCtx)
	if (!ctx) {
		throw new Error('useAppState must be used within AppStateProvider')
	}
	return ctx
}