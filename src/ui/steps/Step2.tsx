import { useState, useEffect, useCallback } from 'react'
import { useAppState } from '../../state/AppState'
import { contractMethodsAPI, ContractMethod } from '../../services/api'
import AbiService, { ContractAbi } from '../../services/abiService'
import { useToast } from '../components/Toast'
import { Loading, LoadingOverlay } from '../components/Loading'
import Box from '../components/Box'

interface Step2Props {
	onStepChange?: (step: number) => void
}

// 单个contractMethod Queryconfiguration
interface ContractMethodQuery {
	abi_path: string
	contract_address: string
	chain_name: string
	method_name: string
	method_params: string[]
	selectedAbi: ContractAbi
}

// eventcontractMethod Queryconfiguration
interface EventMethodQueries {
	event_name: string
	queries: ContractMethodQuery[]
}

export default function Step2({ onStepChange }: Step2Props = {}) {
	const { components, updateComponent, currentPipelineId } = useAppState()
	const { success, error, info } = useToast()
	
	// from Step1 getdata
	const [step1Events, setStep1Events] = useState<string[]>([])
	const [step1EventParams, setStep1EventParams] = useState<{[eventName: string]: string[]}>({})
	
	// Step2 state
	const [eventMethodQueries, setEventMethodQueries] = useState<EventMethodQueries[]>([])
	const [activeEventIndex, setActiveEventIndex] = useState(0)
	const [abiOptions, setAbiOptions] = useState<ContractAbi[]>([])
	
	// currenteditqueryconfiguration
	const [selectedAbi, setSelectedAbi] = useState<ContractAbi | null>(null)
	const [selectedMethodName, setSelectedMethodName] = useState<string>('')
	const [selectedMethodParams, setSelectedMethodParams] = useState<string[]>([])
	const [availableMethods, setAvailableMethods] = useState<ContractMethod[]>([])
	
	const [isLoading, setIsLoading] = useState(false)
	const [isLoadingMethods, setIsLoadingMethods] = useState(false)
	const [abiSearchTerm, setAbiSearchTerm] = useState('')
	const [isAbiDropdownOpen, setIsAbiDropdownOpen] = useState(false)
	const [validationMessage, setValidationMessage] = useState('')
	
	// new：manualinputcontractaddressstate
	
	// new：dynamiccontractaddressstate
	const [useDynamicAddress, setUseDynamicAddress] = useState(false)
	const [selectedContractAddressField, setSelectedContractAddressField] = useState('')
	const [dynamicChainName, setDynamicChainName] = useState('ethereum')
	const [dynamicSelectedAbi, setDynamicSelectedAbi] = useState<ContractAbi | null>(null)
	
	// new：JSONfieldselectstate
	const [availableJsonFields, setAvailableJsonFields] = useState<string[]>([])
	const [showJsonFieldSelector, setShowJsonFieldSelector] = useState(false)
	
	// 可forcontractaddressfield（usually是eventparameterinaddressfield）
	const [availableContractAddressFields, setAvailableContractAddressFields] = useState<string[]>([])
	
	// addbuttonstate，preventduplicateclick
	const [isAddingQuery, setIsAddingQuery] = useState(false)

	// fromStep1getdata并initializeeventqueryconfiguration
	useEffect(() => {
		const step1Component = components.find(c => c.name === "step1")
		if (step1Component) {
			console.log('📥 fromStep1getdata:', step1Component)
			
			// getselecteventlist
			const eventsToMonitor = step1Component.events_to_monitor || []
			setStep1Events(eventsToMonitor)
			
			// initialize每个eventqueryconfiguration
			const initialEventQueries = eventsToMonitor.map((eventName: string) => ({
				event_name: eventName,
				queries: []
			}))
			setEventMethodQueries(initialEventQueries)
			
			// get每个eventparameter（fromABIinparse）
			if (step1Component.selectedAbi && step1Component.selectedAbi.abi_content) {
				const eventParams: {[eventName: string]: string[]} = {}
				let abiContent = step1Component.selectedAbi.abi_content
				
				// if abi_content 是字符串，尝试parse它
				if (typeof abiContent === 'string') {
					try {
						abiContent = JSON.parse(abiContent)
					} catch (err) {
						console.error('parse ABI contentfailed:', err)
						return
					}
				}
				
				// parseABIineventparameter
				if (Array.isArray(abiContent)) {
					abiContent.forEach((item: any) => {
						if (item.type === 'event' && eventsToMonitor.includes(item.name)) {
							const paramNames = (item.inputs || []).map((input: any) => input.name).filter((name: string) => name)
							eventParams[item.name] = paramNames
							console.log(`🎯 parseevent ${item.name} parameter:`, paramNames)
						}
					})
				}
				
				setStep1EventParams(eventParams)
				console.log('📋 完整eventparameter映射:', eventParams)
				
				// initializeavailableJSONfield（包括公共field + eventparameter）
				const commonFields = [
					"event_name", "contract_address", "transaction_hash", 
					"block_number", "log_index", "timestamp", "chain", "chain_id"
				]
				const allEventParams = Object.values(eventParams).flat()
				const jsonFields = [...commonFields, ...allEventParams.map(param => `args.${param}`)]
				setAvailableJsonFields(jsonFields)
				console.log('📋 availableJSONfield:', jsonFields)
				
				// initialize可forcontractaddressfield（包括公共fieldand所有eventparameter）
				const contractAddressFields = [
					"contract_address", // 公共fieldincontractaddress
					...allEventParams.map(param => `args.${param}`) // 所有eventparameter都can作为contractaddress来源
				]
				setAvailableContractAddressFields(contractAddressFields)
				console.log('📋 availablecontractaddressfield:', contractAddressFields)
			}
		}
	}, [components])

	// 转换contract_callers到eventMethodQueries的辅助函数
	const convertContractCallersToEventMethodQueries = useCallback((contract_callers: any[]): EventMethodQueries[] => {
		console.log('🔄 从contract_callers格式转换为eventMethodQueries')
		
		// 创建事件到查询的映射
		const eventToQueriesMap: {[eventName: string]: ContractMethodQuery[]} = {}
		
		contract_callers.forEach((caller: any) => {
			const eventName = caller.event_name
			if (!eventToQueriesMap[eventName]) {
				eventToQueriesMap[eventName] = []
			}
			
			// 尝试从ABI选项中查找匹配的ABI
			let matchedAbi: ContractAbi | undefined = undefined
			if (caller.abi_path && abiOptions.length > 0) {
				// 尝试多种匹配方式
				matchedAbi = abiOptions.find(abi => {
					// 直接匹配 file_name 或 abi_path
					if (abi.file_name === caller.abi_path || abi.abi_path === caller.abi_path) {
						return true
					}
					
					// 尝试根据命名约定匹配：{contract_name}_{id}.json
					const expectedFileName = `${abi.contract_name}_${abi.id}.json`
					if (expectedFileName === caller.abi_path) {
						return true
					}
					
					// 其他模糊匹配
					if (abi.file_name?.includes(caller.abi_path.replace('.json', '')) ||
						caller.abi_path.includes(abi.file_name?.replace('.json', '') || '') ||
						caller.abi_path.includes(abi.contract_name || '')) {
						return true
					}
					
					return false
				})
				
				console.log(`🔍 ABI匹配结果 for ${caller.abi_path}:`, matchedAbi ? `找到 ${matchedAbi.contract_name} (ID: ${matchedAbi.id})` : '未找到')
			}

			// 构造ContractMethodQuery对象
			const query: ContractMethodQuery = {
				abi_path: caller.abi_path,
				contract_address: caller.contract_address,
				chain_name: caller.chain_name,
				method_name: caller.method_name,
				method_params: caller.method_params || [],
				selectedAbi: matchedAbi || {
					id: 0,
					contract_address: caller.contract_address,
					contract_name: caller.abi_path.replace('.json', ''),
					chain_name: caller.chain_name,
					abi_content: '',
					file_path: caller.abi_path,
					file_name: caller.abi_path,
					abi_path: caller.abi_path,
					source_type: 'manual' as const,
					created_at: '',
					updated_at: ''
				} as ContractAbi
			}
			
			eventToQueriesMap[eventName].push(query)
		})
		
		// 转换为EventMethodQueries数组
		const result = Object.entries(eventToQueriesMap).map(([eventName, queries]) => ({
			event_name: eventName,
			queries: queries
		}))
		
		console.log('✅ 转换完成contract_callers -> eventMethodQueries:', result)
		return result
	}, [abiOptions])

	// fromglobalcomponents恢复data
	useEffect(() => {
		if (!currentPipelineId) {
			setEventMethodQueries([])
			setValidationMessage('No current pipeline, please select or create a pipeline')
			return
		}

		const step2Component = components.find((c: any) => c.type === 'contract_caller' || c.type === 'evm_contract_caller')
		if (step2Component) {
			console.log('🔄 fromglobal components 恢复 Step2 data:', step2Component)
			
			let restoredEventMethodQueries: EventMethodQueries[] = []
			
			// 优先使用eventMethodQueries格式（如果存在）
			if (step2Component.eventMethodQueries) {
				restoredEventMethodQueries = step2Component.eventMethodQueries
				console.log('📋 使用已有eventMethodQueries格式')
			} 
			// 如果没有eventMethodQueries，尝试从contract_callers格式转换
			else if (step2Component.contract_callers && Array.isArray(step2Component.contract_callers)) {
				restoredEventMethodQueries = convertContractCallersToEventMethodQueries(step2Component.contract_callers)
			}
			
			if (restoredEventMethodQueries.length > 0) {
				setEventMethodQueries(restoredEventMethodQueries)
				setValidationMessage(`✅ Contract method query configuration loaded from pipeline ${currentPipelineId}`)
				setTimeout(() => setValidationMessage(''), 3000)
			} else {
				setValidationMessage('📝 Current pipeline contract caller component has no query data')
			}
		} else if (components.length === 0) {
			setValidationMessage('📝 Current pipeline has no configuration data, please start configuration')
		} else {
			setValidationMessage('📝 Current pipeline has no contract method query component, please start configuration')
		}
	}, [components, currentPipelineId, convertContractCallersToEventMethodQueries])

	// loadABIoption
	useEffect(() => {
		loadAbiOptions()
	}, [])

	const loadAbiOptions = async () => {
		setIsLoading(true)
		try {
			const response = await AbiService.getAbiList()
			if (response.success) {
				setAbiOptions(response.data.items)
			} else {
				throw new Error(response.message)
			}
		} catch (err) {
			console.error('loadABIoptionfailed:', err)
			error('Load failed', 'Unable to get ABI list')
		} finally {
			setIsLoading(false)
		}
	}

	// 当selectcontract后，load该contractmethod
	useEffect(() => {
		if (selectedAbi) {
			loadContractMethods()
		}
	}, [selectedAbi])

	const loadContractMethods = async (abi?: ContractAbi) => {
		const abiToUse = abi || selectedAbi
		if (!abiToUse) return

		// checkwhether为dynamicaddress占位符（格式：{fieldName}）
		const isDynamicAddress = /^\{.+\}$/.test(abiToUse.contract_address)
		if (isDynamicAddress) {
			console.log('🔄 检测todynamicaddress占位符，直接fromABIparsemethod:', abiToUse.contract_address)
			// fordynamicaddress，直接fromABIinparsemethod，no进行API调用
			loadMethodsFromAbi(abiToUse)
			return
		}

		setIsLoadingMethods(true)
		try {
			const result = await contractMethodsAPI.queryContractMethods(
				abiToUse.contract_address,
				abiToUse.chain_name,
				'',
				['function']
			)

			setAvailableMethods(result.functions)
			console.log('📋 loadtoContract Method:', result.functions)
		} catch (err) {
			console.error('loadContract Methodfailed:', err)
			error('Load failed', 'Unable to get contract methods')
			setAvailableMethods([])
		} finally {
			setIsLoadingMethods(false)
		}
	}

	// fromABIdata直接parsemethod（fordynamic模式）
	const loadMethodsFromAbi = (abi: ContractAbi) => {
		console.log('🔍 startparseABI:', abi.contract_name, abi.contract_address)
		console.log('🔍 ABI原始data:', abi.abi_content)
		console.log('🔍 ABIData Type:', typeof abi.abi_content)
		
		try {
			setIsLoadingMethods(true)
			
			// parseABIinfunctiontype
			let abiData
			if (typeof abi.abi_content === 'string') {
				console.log('🔍 parse字符串格式ABI')
				abiData = JSON.parse(abi.abi_content)
			} else {
				console.log('🔍 use对象格式ABI')
				abiData = abi.abi_content
			}

			console.log('🔍 parse后ABIdata:', abiData)
			console.log('🔍 ABIdatawhether为数组:', Array.isArray(abiData))

			if (!Array.isArray(abiData)) {
				throw new Error('ABI data is not in array format')
			}

			const functions = abiData
				.filter((item: any) => {
					console.log('🔍 checkABI项:', item.type, item.name)
					return item.type === 'function'
				})
				.map((func: any) => ({
					name: func.name,
					type: 'function' as const,
					inputs: func.inputs || [],
					outputs: func.outputs || [],
					stateMutability: func.stateMutability || 'nonpayable'
				}))

			console.log('📋 筛选to函数数量:', functions.length)
			setAvailableMethods(functions)
			console.log('📋 fromABIparsetomethod:', functions)
		} catch (err) {
			console.error('parseABImethodfailed:', err)
			console.error('error堆栈:', (err as Error).stack)
			error('Parse failed', `Unable to parse methods from ABI: ${(err as Error).message}`)
			setAvailableMethods([])
		} finally {
			setIsLoadingMethods(false)
		}
	}


	// 筛选ABIoption
	const getFilteredAbiOptions = () => {
		if (!abiSearchTerm.trim()) return abiOptions
		
		return abiOptions.filter(abi => 
			(abi.contract_name && abi.contract_name.toLowerCase().includes(abiSearchTerm.toLowerCase())) ||
			abi.contract_address.toLowerCase().includes(abiSearchTerm.toLowerCase())
		)
	}

	// 处理ABIselect
	const handleAbiSelect = (abi: ContractAbi) => {
		console.log('🎯 selectABI:', abi.contract_name, abi.contract_address)
		setSelectedAbi(abi)
		setAbiSearchTerm(`${abi.contract_name} - ${abi.contract_address}`)
		setIsAbiDropdownOpen(false)
		// reset其他select
		setSelectedMethodName('')
		setSelectedMethodParams([])
		setAvailableMethods([])
	}

	// 处理dynamic模式ABIselect
	const handleDynamicAbiSelect = (abi: ContractAbi) => {
		console.log('🎯 dynamic模式selectABI:', abi.contract_name, abi.contract_address)
		setDynamicSelectedAbi(abi)
		// resetmethodselect
		setSelectedMethodName('')
		setSelectedMethodParams([])
		// 立即fromABIparsemethod（dynamic模式noneedAPI调用）
		loadMethodsFromAbi(abi)
	}

	// 处理parameterselect
	const handleParamToggle = (paramName: string) => {
		setSelectedMethodParams(prev => {
			if (prev.includes(paramName)) {
				return prev.filter(p => p !== paramName)
			} else {
				return [...prev, paramName]
			}
		})
	}

	// checkcurrentSelected Methodswhetherneedparameter
	const currentMethodNeedsParams = () => {
		const currentMethod = availableMethods.find(method => method.name === selectedMethodName)
		return currentMethod ? currentMethod.inputs.length > 0 : false
	}

	// checkParameter Configurationwhether完整
	const isParamConfigComplete = () => {
		if (!selectedMethodName) return false
		
		const needsParams = currentMethodNeedsParams()
		if (!needsParams) {
			// methodnoneedparameter，Parameter Configuration就算完整
			return true
		}
		
		// methodneedparameter，checkwhetheralreadyselect
		return selectedMethodParams.length > 0
	}

	// addquerytocurrentevent
	const handleAddQuery = async () => {
		// preventduplicateclick
		if (isAddingQuery) {
			console.log('⚠️ preventduplicateclick，操作被忽略')
			return
		}
		
		console.log('🔄 startaddquerymethod...')
		setIsAddingQuery(true)
		// checkno同address模式configuration完整性
		if (useDynamicAddress) {
			if (!dynamicSelectedAbi || !selectedContractAddressField || !dynamicChainName || !selectedMethodName || !isParamConfigComplete()) {
				const missingParams = currentMethodNeedsParams() && selectedMethodParams.length === 0
				const errorMsg = missingParams 
					? 'Please complete ABI selection, dynamic contract address field, chain name, method selection, and parameter selection' 
					: 'Please complete ABI selection, dynamic contract address field, chain name, and method selection'
				error('Configuration incomplete', errorMsg)
				setIsAddingQuery(false)
				return
			}
		} else {
			if (!selectedAbi || !selectedMethodName || !isParamConfigComplete()) {
				const missingParams = currentMethodNeedsParams() && selectedMethodParams.length === 0
				const errorMsg = missingParams 
					? 'Please complete ABI selection, method selection, and parameter selection' 
					: 'Please complete ABI selection and method selection'
				error('Configuration incomplete', errorMsg)
				setIsAddingQuery(false)
				return
			}
		}

		const currentEventName = eventMethodQueries[activeEventIndex]?.event_name
		if (!currentEventName) {
			setIsAddingQuery(false)
			return
		}

		let newQuery: ContractMethodQuery
		
		if (useDynamicAddress) {
			// dynamicaddress模式
			newQuery = {
				abi_path: dynamicSelectedAbi!.abi_path || `${dynamicSelectedAbi!.contract_name}_${dynamicSelectedAbi!.id}.json`,
				contract_address: `{${selectedContractAddressField}}`, // use占位符标记dynamicaddress
				chain_name: dynamicChainName,
				method_name: selectedMethodName,
				method_params: [...selectedMethodParams],
				selectedAbi: {
					...dynamicSelectedAbi!,
					// 覆盖display信息，表明这是dynamicaddress模式
					contract_name: `${dynamicSelectedAbi!.contract_name} (Dynamic)`,
					contract_address: `{${selectedContractAddressField}}`
				}
			}
		} else {
			// ABI库模式
			newQuery = {
				abi_path: selectedAbi!.abi_path || `${selectedAbi!.contract_name}_${selectedAbi!.id}.json`,
				contract_address: selectedAbi!.contract_address,
				chain_name: selectedAbi!.chain_name,
				method_name: selectedMethodName,
				method_params: [...selectedMethodParams],
				selectedAbi: selectedAbi!
			}
		}

		// checkwhetheralready存in相同query（preventduplicateadd）
		const currentQueries = eventMethodQueries[activeEventIndex].queries
		console.log('🔍 currentalready有query:', currentQueries.length)
		console.log('🔍 新query:', newQuery)
		
		const isDuplicate = currentQueries.some(existingQuery => {
			const addressMatch = existingQuery.contract_address === newQuery.contract_address
			const methodMatch = existingQuery.method_name === newQuery.method_name
			
			// 安全地比较parameter数组（避免修改原数组）
			const existingParams = [...existingQuery.method_params].sort()
			const newParams = [...newQuery.method_params].sort()
			const paramsMatch = JSON.stringify(existingParams) === JSON.stringify(newParams)
			
			console.log('🔍 比较query:', {
				existing: existingQuery,
				new: newQuery,
				addressMatch,
				methodMatch,
				paramsMatch,
				existingParams,
				newParams
			})
			
			return addressMatch && methodMatch && paramsMatch
		})

		if (isDuplicate) {
			console.log('⚠️ 检测toduplicatequery，忽略add操作')
			error('Duplicate query', 'The same query method already exists, please do not add duplicates')
			setIsAddingQuery(false)
			return
		}

		setEventMethodQueries(prev => {
			const newQueries = [...prev]
			console.log('📊 add前state:', {
				activeEventIndex,
				currentEvent: newQueries[activeEventIndex],
				currentQueriesCount: newQueries[activeEventIndex]?.queries?.length || 0
			})
			
			// in这里再次checkduplicate（use最新state）
			const currentEventQueries = newQueries[activeEventIndex]?.queries || []
			const isDuplicateRealTime = currentEventQueries.some(existingQuery => {
				const addressMatch = existingQuery.contract_address === newQuery.contract_address
				const methodMatch = existingQuery.method_name === newQuery.method_name
				const existingParams = [...(existingQuery.method_params || [])].sort()
				const newParams = [...(newQuery.method_params || [])].sort()
				const paramsMatch = JSON.stringify(existingParams) === JSON.stringify(newParams)
				
				console.log('🔍 实时duplicatecheck:', {
					existing: existingQuery,
					new: newQuery,
					addressMatch,
					methodMatch,
					paramsMatch
				})
				
				return addressMatch && methodMatch && paramsMatch
			})
			
			if (isDuplicateRealTime) {
				console.log('⚠️ 实时检测toduplicatequery，跳过add')
				return prev // no修改state
			}
			
			newQueries[activeEventIndex].queries.push(newQuery)
			console.log('✅ queryalreadyaddtoeventmethodlist:', newQuery)
			console.log('📊 add后state:', {
				totalQueries: newQueries[activeEventIndex].queries.length,
				allQueries: newQueries[activeEventIndex].queries
			})
			return newQueries
		})

		// resetselect
		setSelectedAbi(null)
		setSelectedMethodName('')
		setSelectedMethodParams([])
		setAbiSearchTerm('')
		setAvailableMethods([])
		setIsAbiDropdownOpen(false)
		// resetdynamicaddress相关state
		setSelectedContractAddressField('')
		setDynamicSelectedAbi(null)

		success('Add successful', `Contract method query added for event ${currentEventName}`)
		console.log('✅ queryaddsuccess，formalreadyreset')
		
		// resetaddstate
		setIsAddingQuery(false)
	}

	// deletequery
	const handleRemoveQuery = (eventIndex: number, queryIndex: number) => {
		setEventMethodQueries(prev => {
			const newQueries = [...prev]
			newQueries[eventIndex].queries.splice(queryIndex, 1)
			return newQueries
		})
		success('Delete successful', 'Query method has been deleted')
	}

	// 修改query - 将选inqueryloadtoformin进行edit
	const handleEditQuery = (eventIndex: number, queryIndex: number) => {
		const query = eventMethodQueries[eventIndex].queries[queryIndex]
		console.log('📝 starteditquery:', query)
		
		// checkwhether为dynamicaddress（格式：{fieldName}）
		const isDynamicAddress = /^\{.+\}$/.test(query.contract_address)
		console.log('🔍 检测addresstype:', { 
			contract_address: query.contract_address,
			isDynamicAddress,
			availableContractAddressFields: availableContractAddressFields,
			availableContractAddressFields_length: availableContractAddressFields.length
		})
		
		// resetformstate
		setSelectedAbi(null)
		setDynamicSelectedAbi(null)
		setSelectedMethodName('')
		setSelectedMethodParams([])
		setAvailableMethods([])
		setAbiSearchTerm('')
		
		// 处理ABIdata
		console.log('🔍 查找ABI前state:', {
			query_abi_path: query.abi_path,
			abiOptions_length: abiOptions.length,
			available_files: abiOptions.map(abi => ({ 
				file_name: abi.file_name, 
				contract_name: abi.contract_name,
				id: abi.id 
			}))
		})
		
		// 尝试多种方式查找ABI
		let abiToUse = query.selectedAbi
		if (!abiToUse && query.abi_path) {
			// 方式1：直接match file_name
			abiToUse = abiOptions.find(abi => abi.file_name === query.abi_path)
			
			// 方式2：if没找to，尝试match abi_path field
			if (!abiToUse) {
				abiToUse = abiOptions.find(abi => abi.abi_path === query.abi_path)
			}
			
			// 方式3：if还没找to，尝试部分match
			if (!abiToUse) {
				abiToUse = abiOptions.find(abi => 
					abi.file_name?.includes(query.abi_path.replace('.json', '')) ||
					query.abi_path.includes(abi.file_name?.replace('.json', '') || '')
				)
			}
		}
		
		console.log('🔧 找toABI:', { 
			has_selectedAbi: !!query.selectedAbi,
			abi_path: query.abi_path,
			found_abi: !!abiToUse,
			abi_name: abiToUse?.contract_name || abiToUse?.file_name,
			abi_file_name: abiToUse?.file_name,
			search_methods_used: !query.selectedAbi ? 'file_name + abi_path + partial_match' : 'selectedAbi'
		})
		
		// loadquerydatatoform
		if (isDynamicAddress) {
			// dynamicaddress模式
			console.log('🔄 设置dynamicaddress模式')
			setUseDynamicAddress(true)
			setDynamicChainName(query.chain_name)
			
			// from {fieldName} 格式in提取field名
			const fieldName = query.contract_address.slice(1, -1) // 移除 { and }
			setSelectedContractAddressField(fieldName)
			console.log('📍 设置dynamicaddressfield:', fieldName)
			
			if (abiToUse) {
				setDynamicSelectedAbi(abiToUse)
				console.log('✅ 设置dynamicABI')
			}
		} else {
			// staticaddress模式
			console.log('🏠 设置staticaddress模式')
			setUseDynamicAddress(false)
			
			if (abiToUse) {
				setSelectedAbi(abiToUse)
				// 设置search框display文本
				setAbiSearchTerm(`${abiToUse.contract_name || abiToUse.file_name} - ${abiToUse.contract_address || query.contract_address}`)
				console.log('✅ 设置staticABIandsearch文本')
			}
		}
		
		// 设置method信息
		setTimeout(() => {
			setSelectedMethodName(query.method_name)
			setSelectedMethodParams(query.method_params || [])
			console.log('📋 设置method信息:', {
				method_name: query.method_name,
				method_params: query.method_params
			})
			
			// ifavailablecontractaddressfield为空，尝试fromalready有datain恢复
			if (availableContractAddressFields.length === 0 && isDynamicAddress) {
				const fieldName = query.contract_address.slice(1, -1) // 移除 { and }
				const fallbackFields = ["contract_address", fieldName]
				setAvailableContractAddressFields(fallbackFields)
				console.log('🔄 恢复availablecontractaddressfield:', fallbackFields)
			}
			
			// loadmethodlist
			if (abiToUse) {
				console.log('🔄 startloadmethodlist...', {
					abi_name: abiToUse.contract_name || abiToUse.file_name,
					isDynamicAddress: isDynamicAddress
				})
				if (isDynamicAddress) {
					loadMethodsFromAbi(abiToUse)
				} else {
					loadContractMethods(abiToUse)
				}
			} else {
				console.error('❌ no找tomatchABI，no法loadmethodlist')
			}
		}, 100) // 小延迟确保stateupdatecomplete
		
		// delete原query（edit就是delete+重新add）
		setTimeout(() => {
			handleRemoveQuery(eventIndex, queryIndex)
			console.log('🗑️ 原queryalreadydelete，readyedit')
		}, 200)
		
		success('Edit mode', 'Query data has been loaded into the form. After making changes, click the add button to save')
	}

	// clearcurrentevent所有query
	const handleClearCurrentEventQueries = () => {
		setEventMethodQueries(prev => {
			const newQueries = [...prev]
			newQueries[activeEventIndex].queries = []
			return newQueries
		})
	}

	// clearcurrentform
	const handleClearCurrentForm = () => {
		setSelectedAbi(null)
		setSelectedMethodName('')
		setSelectedMethodParams([])
		setAbiSearchTerm('')
		setAvailableMethods([])
		setIsAbiDropdownOpen(false)
		// cleardynamicaddress相关state
		setSelectedContractAddressField('')
		
		console.log('🧹 formalreadyclear')
	}

	// Save Configuration
	const handleSaveConfiguration = () => {
		if (eventMethodQueries.length === 0) {
			error('Configuration is empty', 'Please configure query methods for at least one event')
			return
		}

		// 验证至少有一个eventconfiguration了query
		const hasQueries = eventMethodQueries.some(eventQuery => eventQuery.queries.length > 0)
		if (!hasQueries) {
			error('Configuration incomplete', 'Please add contract method queries for at least one event')
			return
		}

		// 将eventMethodQueries转换为后端期望contract_callers格式
		const contract_callers: any[] = []
		
		eventMethodQueries.forEach(eventQuery => {
			eventQuery.queries.forEach(query => {
				contract_callers.push({
					event_name: eventQuery.event_name,
					chain_name: query.chain_name,
					abi_path: query.abi_path,
					contract_address: query.contract_address, // 包含{field}格式dynamicaddressorstaticaddress
					method_name: query.method_name,
					method_params: query.method_params
				})
			})
		})

		// saveStep2configuration
		const step2Component = {
			name: "step2", 
			type: "contract_caller",  // usewith后端一致type
			contract_callers: contract_callers,
			eventMethodQueries: eventMethodQueries // 保留原格式供前端use
		}
		updateComponent("step2", step2Component)
		
		// 同时updateStep1EventMonitor，addmethod返回值field
		const updateSuccess = updateStep1WithMethodReturnFields()
		
		const totalQueries = eventMethodQueries.reduce((sum, eventQuery) => sum + eventQuery.queries.length, 0)
		let message = `✅ Contract method query configuration saved successfully!\nConfigured ${totalQueries} query methods for ${eventMethodQueries.length} events`
		
		if (updateSuccess) {
			const methodReturnFields = extractMethodReturnFields()
			const methodCount = Object.keys(methodReturnFields).length
			message += `\n🔄 already自动updateStep1field映射，new ${methodCount} 个method返回值field`
		}
		
		setValidationMessage(message)

		console.log('💾 saveStep2configuration:', step2Component)
		success('Save successful', `Contract method query configuration has been saved${updateSuccess ? ' and Step 1 fields have been updated' : ''}`)

		setTimeout(() => setValidationMessage(''), 5000)
	}

	// 提取method返回值field
	const extractMethodReturnFields = () => {
		const methodReturnFields: { [methodName: string]: string[] } = {}
		
		eventMethodQueries.forEach(eventQuery => {
			eventQuery.queries.forEach(query => {
				// fromqueryconfigurationinselectedAbigetABIcontent
				if (query.selectedAbi && query.selectedAbi.abi_content) {
					let abiContent = query.selectedAbi.abi_content
					
					// if abi_content 是字符串，尝试parse它
					if (typeof abiContent === 'string') {
						try {
							abiContent = JSON.parse(abiContent)
						} catch (err) {
							console.error('parse ABI contentfailed:', err)
							return
						}
					}
					
					// inABIin查找对应method
					if (Array.isArray(abiContent)) {
						const method = abiContent.find((item: any) => 
							item.type === 'function' && item.name === query.method_name
						)
						
						if (method && method.outputs && Array.isArray(method.outputs)) {
							// 提取返回值field名
							let returnFields: string[]
							
							if (method.outputs.length === 1) {
								// 单返回值：if有名称就用名称，otherwise直接用method名
								const output = method.outputs[0]
								if (output.name && output.name.trim() !== '') {
									returnFields = [output.name]
								} else {
									// 单返回值且no名称，直接用method名作为field名
									returnFields = [query.method_name]
								}
							} else {
								// 多返回值：为no名返回值生成默认名称
								returnFields = method.outputs.map((output: any, index: number) => {
									if (output.name && output.name.trim() !== '') {
										return output.name
									} else {
										return `result_${index}`
									}
								})
							}
							
							if (returnFields.length > 0) {
								methodReturnFields[query.method_name] = returnFields
								console.log(`📋 提取method ${query.method_name} 返回值field:`, returnFields)
							}
						}
					}
				}
			})
		})
		
		return methodReturnFields
	}

	// updateStep1EventMonitorcomponent，addmethod返回值field
	const updateStep1WithMethodReturnFields = () => {
		const step1Component = components.find(c => c.name === "step1")
		if (step1Component) {
			const methodReturnFields = extractMethodReturnFields()
			
			// updateStep1component，addmethod返回值field
			const updatedStep1Component = {
				...step1Component,
				method_return_fields: methodReturnFields
			}
			
			updateComponent("step1", updatedStep1Component)
			console.log('🔄 alreadyupdateStep1method返回值field:', methodReturnFields)
			
			return true
		}
		return false
	}

	// Continue to Next Step
	const handleContinue = () => {
		handleSaveConfiguration()
		if (onStepChange) {
			onStepChange(3)
		}
	}

	const getCurrentEventQueries = () => {
		return eventMethodQueries[activeEventIndex]?.queries || []
	}

	return (
		<LoadingOverlay isVisible={isLoading} message="loadABIoptionin...">
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold">Step 2: Contract Method Query</h2>
					<div className="text-sm text-gray-600">
						Configure multiple contract method queries for each event
					</div>
				</div>

				{/* event标签页 */}
				{eventMethodQueries.length > 0 && (
					<Box title="Event Contract Method Query Configuration" right={
						<button 
							className="btn btn-secondary" 
							onClick={handleClearCurrentEventQueries}
							disabled={isLoading}
						>
							Clear Current Event
						</button>
					}>
						<div className="space-y-4">
							{/* Event selection tabs */}
							<div className="flex border-b">
								{eventMethodQueries.map((eventQuery, index) => (
									<button
										key={index}
										onClick={() => setActiveEventIndex(index)}
										className={`px-4 py-2 text-sm font-medium ${
											activeEventIndex === index
												? 'border-b-2 border-blue-500 text-blue-600'
												: 'text-gray-500 hover:text-gray-700'
										}`}
									>
										{eventQuery.event_name} ({eventQuery.queries.length})
									</button>
								))}
							</div>

							{/* currenteventconfiguration区域 */}
							{eventMethodQueries[activeEventIndex] && (
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<h4 className="font-medium">
											event: {eventMethodQueries[activeEventIndex].event_name}
										</h4>
										<div className="text-sm text-gray-500">
											Configured {getCurrentEventQueries().length} query methods
											{getCurrentEventQueries().length > 0 && (
												<span className="ml-2 text-blue-600">• Supports multiple queries</span>
											)}
										</div>
									</div>

									{/* alreadyconfigurationquerylist */}
									{getCurrentEventQueries().length > 0 && (
										<div className="border rounded-lg overflow-hidden">
											<div className="bg-gray-50 px-3 py-2 border-b">
												<span className="text-sm font-medium text-gray-700">Configured query methods</span>
											</div>
											<div className="divide-y divide-gray-200">
												{getCurrentEventQueries().map((query, queryIndex) => (
													<div key={queryIndex} className="p-3">
														<div className="flex items-center justify-between">
															<div className="flex-1">
																<div className="flex items-center gap-3 mb-2">
																	<span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
																		{query.method_name}
																	</span>
																	<span className="text-sm text-gray-600">
																		{query.selectedAbi?.contract_name || query.abi_path || '未知contract'}
																	</span>
																</div>
																<div className="text-xs text-gray-500">
																	parameter: {query.method_params.join(', ')}
																</div>
																<div className="text-xs text-gray-400 font-mono">
																	{query.contract_address}
																</div>
															</div>
															<div className="flex gap-2">
																<button
																	onClick={() => handleEditQuery(activeEventIndex, queryIndex)}
																	className="btn btn-xs btn-primary"
																	title="Edit this query"
																>
																	✏️ Edit
																</button>
																<button
																	onClick={() => handleRemoveQuery(activeEventIndex, queryIndex)}
																	className="btn btn-xs btn-error"
																	title="Delete this query"
																>
																	🗑️ Delete
																</button>
															</div>
														</div>
													</div>
												))}
											</div>
										</div>
									)}

									{/* add新queryform */}
									<div className="border border-gray-200 rounded-xl p-6 bg-gradient-to-br from-gray-50 to-white shadow-sm">
										<div className="flex items-center justify-between mb-4">
											<div>
												<h5 className="font-semibold text-gray-800 flex items-center">
													<span className="inline-flex items-center justify-center w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs rounded-full mr-2">+</span>
													Add new query method
												</h5>
												<p className="text-xs text-gray-600 mt-1 flex items-center">
													<span className="mr-1">💡</span>
													The same event can add multiple different contract method queries
												</p>
											</div>
											<button
												onClick={handleClearCurrentForm}
												className="btn btn-xs btn-secondary"
											>
												Reset form
											</button>
										</div>
										
										{/* selectcontractaddress方式 */}
										<div className="mb-6">
											<label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
												<span className="inline-flex items-center justify-center w-6 h-6 bg-purple-500 text-white text-xs rounded-full mr-2">0</span>
												selectcontractaddress方式
											</label>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
												<label className="flex items-center cursor-pointer p-4 border rounded-lg hover:bg-purple-50 transition-colors">
													<input
														type="radio"
														name="addressMode"
														checked={!useDynamicAddress}
														onChange={() => {
															setUseDynamicAddress(false)
														}}
														className="mr-3"
													/>
													<div>
														<span className="text-sm font-medium">📚 ABI库select</span>
														<div className="text-xs text-gray-500 mt-1">from预设contract库inselect</div>
													</div>
												</label>
												<label className="flex items-center cursor-pointer p-4 border rounded-lg hover:bg-green-50 transition-colors">
													<input
														type="radio"
														name="addressMode"
														checked={useDynamicAddress}
														onChange={() => {
															setUseDynamicAddress(true)
														}}
														className="mr-3"
													/>
													<div>
														<span className="text-sm font-medium">🔄 dynamicparse</span>
														<div className="text-xs text-gray-500 mt-1">fromeventparameterdynamicget</div>
													</div>
												</label>
											</div>
										</div>

										{/* dynamiccontractaddress */}
										{useDynamicAddress ? (
											<div className="space-y-6">
												{/* 步骤1：selectABI */}
												<div className="mb-6">
													<label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
														<span className="inline-flex items-center justify-center w-6 h-6 bg-blue-500 text-white text-xs rounded-full mr-2">1</span>
														selectcontractABI
													</label>
													<div className="relative">
														<input
															type="text"
															value={dynamicSelectedAbi ? `${dynamicSelectedAbi.contract_name || dynamicSelectedAbi.file_name} - ${dynamicSelectedAbi.contract_address || 'dynamicaddress'}` : ''}
															onChange={(e) => {
																if (!e.target.value) {
																	setDynamicSelectedAbi(null)
																	setAvailableMethods([])
																}
															}}
															onFocus={() => setIsAbiDropdownOpen(true)}
															onBlur={() => {
																// 延迟关闭，让用户canclickoption
																setTimeout(() => {
																	setIsAbiDropdownOpen(false)
																}, 200)
															}}
															placeholder="🔍 search并selectcontractABI..."
															className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
															readOnly
														/>
														
														{isAbiDropdownOpen && (
															<div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
																{getFilteredAbiOptions().length > 0 ? (
																	getFilteredAbiOptions().map((abi, index) => (
																		<div
																			key={index}
																			onClick={() => {
																				handleDynamicAbiSelect(abi)
																				setIsAbiDropdownOpen(false)
																			}}
																			className="px-4 py-3 cursor-pointer hover:bg-green-50 border-b border-gray-100 last:border-b-0 transition-colors"
																		>
																			<div className="flex items-center justify-between">
																				<div className="flex-1 min-w-0">
																					<div className="font-semibold text-gray-900 truncate">
																						{abi.contract_name || 'Unknown Contract'}
																					</div>
																					<div className="text-sm text-gray-500 font-mono mt-1 truncate">
																						{abi.contract_address}
																					</div>
																					<div className="text-xs text-blue-600 mt-1">
																						📍 {abi.chain_name}
																					</div>
																				</div>
																			</div>
																		</div>
																	))
																) : (
																	<div className="px-4 py-3 text-gray-500 text-sm">
																		😢 no找tomatchABI
																	</div>
																)}
															</div>
														)}
													</div>
													{dynamicSelectedAbi && (
														<div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
															<div className="flex items-center text-sm">
																<span className="text-blue-500 text-lg mr-2">📋</span>
																<div className="text-blue-800">
																	<div className="font-semibold">{dynamicSelectedAbi.contract_name}</div>
																	<div className="text-xs text-blue-600 mt-1">
																		ABI将forparseContract Method：{dynamicSelectedAbi.contract_address} ({dynamicSelectedAbi.chain_name})
																	</div>
																</div>
															</div>
														</div>
													)}
												</div>
												
												{/* 步骤2：configurationdynamiccontractaddress */}
												{dynamicSelectedAbi && (
													<div className="mb-6">
														<label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
															<span className="inline-flex items-center justify-center w-6 h-6 bg-green-500 text-white text-xs rounded-full mr-2">2</span>
															configurationdynamiccontractaddress
														</label>
												<div className="space-y-3">
													<div>
														<label className="block text-xs font-medium text-gray-600 mb-1">Blockchain</label>
														<select
															value={dynamicChainName}
															onChange={(e) => setDynamicChainName(e.target.value)}
															className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
														>
															<option value="ethereum">Ethereum</option>
															<option value="bsc">BSC</option>
															<option value="polygon">Polygon</option>
															<option value="arbitrum">Arbitrum</option>
															<option value="base">Base</option>
														</select>
													</div>
													<div>
														<label className="block text-xs font-medium text-gray-600 mb-1">contractaddressfield</label>
														<select
															value={selectedContractAddressField}
															onChange={(e) => setSelectedContractAddressField(e.target.value)}
															className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono"
														>
															<option value="">Select contract address source field</option>
															{availableContractAddressFields.map((field, index) => (
																<option key={index} value={field}>{field}</option>
															))}
														</select>
													</div>
													{selectedContractAddressField && (
														<div className="p-3 bg-green-50 border border-green-200 rounded-lg">
															<div className="flex items-center text-sm">
																<span className="text-green-500 text-lg mr-2">🔄</span>
																<div className="text-green-800">
																	<div className="font-semibold">dynamiccontractaddress: {selectedContractAddressField}</div>
																	<div className="text-xs text-green-600 mt-1">
																		Runtime will get contract address from event data field {selectedContractAddressField}
																	</div>
																</div>
															</div>
														</div>
													)}
													<div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
														💡 <strong>Tip:</strong> In dynamic mode, contract address will be dynamically obtained from specified field in event data at runtime, but ABI determines the callable method list.
													</div>
												</div>
											</div>
											)}
										</div>
										) : (
											<div className="space-y-6">
												{/* ABIselect */}
												<div className="mb-6">
													<label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
														<span className="inline-flex items-center justify-center w-6 h-6 bg-blue-500 text-white text-xs rounded-full mr-2">1</span>
														selectcontractABI
													</label>
													<div className="relative">
														<input
															type="text"
															value={abiSearchTerm}
															onChange={(e) => {
																setAbiSearchTerm(e.target.value)
																setIsAbiDropdownOpen(true)
															}}
															onFocus={() => setIsAbiDropdownOpen(true)}
															onBlur={() => {
																// 延迟关闭，让用户canclickoption
																setTimeout(() => {
																	setIsAbiDropdownOpen(false)
																}, 200)
															}}
															placeholder="🔍 searchcontract名称oraddress..."
															className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
														/>
														
														{isAbiDropdownOpen && (
															<div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
																{getFilteredAbiOptions().map((abi) => (
																	<div
																		key={abi.id}
																		onClick={(e) => {
																			e.preventDefault()
																			e.stopPropagation()
																			handleAbiSelect(abi)
																		}}
																		className="px-4 py-3 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
																	>
																		<div className="flex items-center justify-between">
																			<div className="flex-1 min-w-0">
																				<div className="font-semibold text-gray-900 truncate">
																					{abi.contract_name || 'Unknown Contract'}
																				</div>
																				<div className="text-sm text-gray-500 font-mono mt-1 truncate">
																					{abi.contract_address}
																				</div>
																			</div>
																			<span className="ml-3 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full capitalize">
																				{abi.chain_name}
																			</span>
																		</div>
																	</div>
																))}
																
																{getFilteredAbiOptions().length === 0 && (
																	<div className="px-4 py-8 text-center text-gray-500">
																		<div className="text-4xl mb-2">🔍</div>
																		<div>未找tomatchcontract</div>
																		<div className="text-sm mt-1">please尝试其他search条件</div>
																	</div>
																)}
															</div>
														)}
													</div>

													{selectedAbi && (
														<div className="mt-3 p-3 bg-green-50 border-l-4 border-green-400 rounded-r-lg">
															<div className="flex items-center">
																<span className="text-green-500 text-lg mr-2">✅</span>
																<div>
																	<div className="font-semibold text-green-800">{selectedAbi.contract_name}</div>
																	<div className="text-xs text-green-600 font-mono">{selectedAbi.contract_address}</div>
																</div>
															</div>
														</div>
													)}
												</div>
											</div>
										)}

										{/* methodselect */}
										<div className="mb-6">
											<label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
												<span className="inline-flex items-center justify-center w-6 h-6 bg-green-500 text-white text-xs rounded-full mr-2">2</span>
												selectContract Method
											</label>
											{useDynamicAddress ? (
												/* dynamic模式：fromABIinselectmethod */
												<div className="space-y-3">
													{!dynamicSelectedAbi ? (
														<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
															<span className="text-yellow-600">⚠️ please先selectABI</span>
														</div>
													) : isLoadingMethods ? (
														<div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
															<Loading size="sm" />
															<span className="text-sm text-blue-700 font-medium">currentlyloadContract Method...</span>
														</div>
													) : (
														<>
															<select
																value={selectedMethodName}
																onChange={(e) => setSelectedMethodName(e.target.value)}
																className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
																disabled={!dynamicSelectedAbi || availableMethods.length === 0}
															>
																<option value="" className="text-gray-500">
																	{!dynamicSelectedAbi ? 'please先selectABI' : availableMethods.length === 0 ? '暂noavailablemethod' : 'pleaseselectContract Method'}
																</option>
																{availableMethods.map((method, index) => (
																	<option key={index} value={method.name} className="py-2 px-3 hover:bg-green-50">
																		🔧 {method.name} ({method.inputs.length} parameters)
																	</option>
																))}
															</select>
															<div className="text-xs text-gray-500 p-2 bg-green-50 border border-green-200 rounded">
																💡 <strong>Dynamic mode:</strong> Method list already loaded from selected ABI, contract address will be dynamically obtained from event parameters at runtime.
															</div>
														</>
													)}
												</div>
											) : isLoadingMethods ? (
												<div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
													<Loading size="sm" />
													<span className="text-sm text-blue-700 font-medium">currentlyloadContract Method...</span>
												</div>
											) : (
												<div className="space-y-3">
													<select
														value={selectedMethodName}
														onChange={(e) => setSelectedMethodName(e.target.value)}
														className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
														disabled={!selectedAbi || availableMethods.length === 0}
													>
														<option value="" className="text-gray-500">
															{!selectedAbi ? 'Please select contract first' : availableMethods.length === 0 ? 'No available methods' : 'Please select Contract Method'}
														</option>
														{availableMethods.map((method, index) => (
															<option key={index} value={method.name} className="py-2 px-3 hover:bg-green-50">
																🔧 {method.name} ({method.inputs.length} parameters)
															</option>
														))}
													</select>
													
													{/* displayalready选method */}
													{selectedMethodName && (
														<div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
															<div className="flex items-center">
																<span className="text-green-500 text-lg mr-2">✅</span>
																<div>
																	<div className="font-semibold text-green-800">{selectedMethodName}</div>
																	<div className="text-xs text-green-600">
																		{availableMethods.find(m => m.name === selectedMethodName)?.inputs.length || 0} parameters available
																	</div>
																</div>
															</div>
														</div>
													)}
												</div>
											)}
										</div>

										{/* parameterselect */}
										<div className="mb-6">
											<label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
												<span className="inline-flex items-center justify-center w-6 h-6 bg-purple-500 text-white text-xs rounded-full mr-2">3</span>
												selectmethodparameter (来源于eventparameter)
											</label>
											
											{/* 智能提示：根据currentmethodwhetherneedparameterdisplayno同提示 */}
											{selectedMethodName && (
												<div className={`mb-3 p-2 rounded-md text-xs ${currentMethodNeedsParams() 
													? 'bg-orange-50 text-orange-700 border border-orange-200' 
													: 'bg-green-50 text-green-700 border border-green-200'
												}`}>
													{currentMethodNeedsParams() 
														? `💡 method "${selectedMethodName}" need ${availableMethods.find(m => m.name === selectedMethodName)?.inputs.length || 0} 个parameter，pleaseselect相应eventparameter进行映射` 
														: `✅ method "${selectedMethodName}" noneedparameter，can直接save`
													}
												</div>
											)}
											{step1EventParams[eventMethodQueries[activeEventIndex]?.event_name] ? (
												<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
													{step1EventParams[eventMethodQueries[activeEventIndex].event_name].map((paramName, index) => (
														<label
															key={index}
															className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
																selectedMethodParams.includes(paramName)
																	? 'border-purple-500 bg-purple-50 text-purple-700'
																	: 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
															}`}
														>
															<input
																type="checkbox"
																checked={selectedMethodParams.includes(paramName)}
																onChange={() => handleParamToggle(paramName)}
																className="mr-3 w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
															/>
															<div className="flex items-center">
																<span className="text-sm font-mono font-semibold">{paramName}</span>
																{selectedMethodParams.includes(paramName) && (
																	<span className="ml-2 text-xs text-purple-600">✓</span>
																)}
															</div>
														</label>
													))}
												</div>
											) : (
												<div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
													<div className="text-2xl mb-2">📋</div>
													<div className="text-sm text-gray-600 font-medium">该event暂noavailableparameter</div>
													<div className="text-xs text-gray-500 mt-1">please确认 Step1 inABIconfigurationwhether正确</div>
												</div>
											)}

											{selectedMethodParams.length > 0 && (
												<div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
													<div className="flex items-center mb-2">
														<span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
														<span className="text-sm font-semibold text-purple-800">alreadyselectparameter ({selectedMethodParams.length}):</span>
													</div>
													<div className="flex flex-wrap gap-2">
														{selectedMethodParams.map(param => (
															<span key={param} className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full font-mono">
																{param}
															</span>
														))}
													</div>
												</div>
											)}
										</div>

										{/* JSONfieldselect */}
										<div className="mb-6">
											<div className="flex items-center justify-between mb-3">
												<label className="block text-sm font-semibold text-gray-800 flex items-center">
													<span className="inline-flex items-center justify-center w-6 h-6 bg-indigo-500 text-white text-xs rounded-full mr-2">4</span>
													selectJSONfield（可选）
												</label>
												<button
													onClick={() => setShowJsonFieldSelector(!showJsonFieldSelector)}
													className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
												>
													{showJsonFieldSelector ? '隐藏' : 'display'} fieldselect器
												</button>
											</div>
											
											{showJsonFieldSelector && (
												<div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
													<div className="text-sm text-indigo-700 mb-3">
														这些field来自currentpipelineJSONdata，您canselect它们作为Contract Methodparameter：
													</div>
													<div className="max-h-32 overflow-y-auto">
														<div className="grid grid-cols-2 gap-2">
															{availableJsonFields.map((field, index) => (
																<div
																	key={index}
																	onClick={() => {
																		if (!selectedMethodParams.includes(field)) {
																			setSelectedMethodParams([...selectedMethodParams, field])
																		}
																	}}
																	className={`p-2 text-xs font-mono rounded cursor-pointer transition-colors ${
																		selectedMethodParams.includes(field)
																			? 'bg-indigo-200 text-indigo-800 cursor-not-allowed'
																			: 'bg-white text-indigo-700 hover:bg-indigo-100'
																	}`}
																>
																	{field}
																	{selectedMethodParams.includes(field) && (
																		<span className="ml-1 text-indigo-600">✓</span>
																	)}
																</div>
															))}
														</div>
													</div>
													{availableJsonFields.length === 0 && (
														<div className="text-sm text-indigo-600 text-center py-4">
															暂noavailableJSONfield
														</div>
													)}
												</div>
											)}
										</div>

										{/* addbutton */}
										<button
											onClick={handleAddQuery}
											disabled={
												isAddingQuery || (
													useDynamicAddress 
														? (!dynamicSelectedAbi || !selectedContractAddressField || !selectedMethodName || !isParamConfigComplete())
														: (!selectedAbi || !selectedMethodName || !isParamConfigComplete())
												)
											}
											className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
												(isAddingQuery || (useDynamicAddress 
													? (!dynamicSelectedAbi || !selectedContractAddressField || !selectedMethodName || !isParamConfigComplete())
													: (!selectedAbi || !selectedMethodName || !isParamConfigComplete())))
													? 'bg-gray-200 text-gray-500 cursor-not-allowed'
													: 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
											}`}
										>
											<span className="flex items-center justify-center gap-2">
												<span>{isAddingQuery ? '⏳' : '➕'}</span>
												<span>{isAddingQuery ? 'Adding...' : 'Add query method'}</span>
											</span>
										</button>
									</div>
								</div>
							)}
						</div>
					</Box>
				)}

				{/* 验证message */}
				{validationMessage && (
					<div className={`p-4 rounded-lg ${
						validationMessage.includes('✅') ? 'bg-green-50 text-green-700' : 
						validationMessage.includes('❌') ? 'bg-red-50 text-red-700' :
						'bg-blue-50 text-blue-700'
					}`}>
						<pre className="whitespace-pre-wrap">{validationMessage}</pre>
					</div>
				)}

				{/* 操作button */}
				<div className="flex gap-3">
					<button
						onClick={handleSaveConfiguration}
						disabled={eventMethodQueries.length === 0}
						className="btn"
					>
						Save Configuration
					</button>
					
					<button
						onClick={handleContinue}
						disabled={eventMethodQueries.length === 0}
						className="btn btn-secondary"
					>
						Continue to Step 3
					</button>
				</div>

				{/* configuration预览 */}
				{eventMethodQueries.length > 0 && (
					<Box title="Configuration Preview" right={
						<div className="flex items-center gap-2">
							<span className="text-xs text-gray-500 bg-green-100 px-2 py-1 rounded">
								pipeline {currentPipelineId}
							</span>
							<span className="text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded">
								{eventMethodQueries.reduce((sum, eq) => sum + eq.queries.length, 0)} 个query
							</span>
						</div>
					}>
						<div className="space-y-4">
							{eventMethodQueries.map((eventQuery, index) => (
								<div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
									<div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												<span className="text-lg font-bold text-blue-600">📡</span>
												<div>
													<span className="font-semibold text-gray-800">{eventQuery.event_name}</span>
													<div className="text-xs text-gray-500 mt-1">
														event监听 → contractMethod Query
													</div>
												</div>
											</div>
											<span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
												{eventQuery.queries.length} query methods
											</span>
										</div>
									</div>
									
									<div className="divide-y divide-gray-100">
										{eventQuery.queries.map((query, queryIndex) => {
											// 检测whether为dynamicaddress
											const isDynamicAddress = /^\{.+\}$/.test(query.contract_address)
											
											return (
												<div key={queryIndex} className="p-4 hover:bg-gray-50 transition-colors">
													<div className="flex items-start justify-between">
														<div className="flex-1 space-y-2">
															{/* method名称andcontract信息 */}
															<div className="flex items-center gap-3">
																<span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
																	🔧 {query.method_name}
																</span>
																<span className="text-gray-400">→</span>
																<span className="text-green-600 font-medium">
																	{query.selectedAbi?.contract_name || query.abi_path || '未知contract'}
																</span>
																{isDynamicAddress && (
																	<span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
																		🔄 dynamicaddress
																	</span>
																)}
															</div>
															
															{/* contractaddress信息 */}
															<div className="space-y-1">
																<div className="flex items-center gap-2 text-sm">
																	<span className="text-gray-500 font-medium">contractaddress:</span>
																	<span className={`font-mono text-xs px-2 py-1 rounded ${
																		isDynamicAddress 
																			? 'bg-orange-50 text-orange-700 border border-orange-200' 
																			: 'bg-gray-100 text-gray-700'
																	}`}>
																		{query.contract_address}
																	</span>
																</div>
																
																<div className="flex items-center gap-4 text-xs text-gray-500">
																	<span>
																		<span className="font-medium">链:</span> {query.chain_name}
																	</span>
																	<span>
																		<span className="font-medium">ABI:</span> {query.abi_path}
																	</span>
																</div>
															</div>
															
															{/* methodparameter */}
															{query.method_params.length > 0 && (
																<div className="space-y-1">
																	<span className="text-sm font-medium text-gray-500">methodparameter:</span>
																	<div className="flex flex-wrap gap-1">
																		{query.method_params.map((param, paramIndex) => (
																			<span 
																				key={paramIndex}
																				className="inline-flex items-center px-2 py-1 bg-purple-50 text-purple-700 text-xs font-mono rounded border"
																			>
																				{param}
																			</span>
																		))}
																	</div>
																</div>
															)}
															
															{/* if是dynamicaddress，display说明 */}
															{isDynamicAddress && (
																<div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
																	<div className="text-orange-700">
																		<span className="font-medium">dynamicparse:</span> 运行时fromeventparameter <code className="bg-orange-100 px-1 rounded">{query.contract_address}</code> getcontractaddress
																	</div>
																</div>
															)}
														</div>
														
														{/* query序号 */}
														<div className="ml-4 text-right">
															<span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-500 text-xs font-bold rounded-full">
																{queryIndex + 1}
															</span>
														</div>
													</div>
												</div>
											)
										})}
									</div>
								</div>
							))}
						</div>
					</Box>
				)}

				{/* 帮助信息 */}
				{step1Events.length === 0 && (
					<div className="text-center py-12">
						<div className="text-6xl mb-4">📝</div>
						<div className="text-lg font-medium text-gray-900 mb-2">Need Step 1 data</div>
						<div className="text-gray-600">
							Please first complete ABI selection and Event Monitoring configuration in Step 1
						</div>
					</div>
				)}
			</div>
		</LoadingOverlay>
	)
}