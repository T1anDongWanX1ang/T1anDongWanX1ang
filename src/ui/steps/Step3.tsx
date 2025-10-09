import { useState, useEffect } from 'react'
import { useAppState, DictMapper, EventMappingRule, DictMappingRule } from '../../state/AppState'
import { api } from '../../services/api'
import { useToast } from '../components/Toast'
import Box from '../components/Box'

interface Step3Props {
	onStepChange?: (step: number) => void
}

interface DecimalCache {
	[key: string]: {
		decimals?: number
		timestamp: number
		error?: string
	}
}

interface TransformerPreview {
	sourceValue: string
	transformedValue: string
	decimalsUsed?: number
}

export default function Step3MappingRules({ onStepChange }: Step3Props = {}) {
	const { components, updateComponent, currentPipelineId } = useAppState()
	const { success, error, info } = useToast()
	
	// 状态管理
	const [selectedContract, setSelectedContract] = useState<{address: string, chainName: string} | null>(null)
	const [selectedMethods, setSelectedMethods] = useState<any[]>([])
	const [eventMappings, setEventMappings] = useState<EventMappingRule[]>([])
	const [decimalCache, setDecimalCache] = useState<DecimalCache>({})
	const [isLoadingDecimals, setIsLoadingDecimals] = useState(false)
	const [activeEventIndex, setActiveEventIndex] = useState(0)
	const [previewData, setPreviewData] = useState<{[key: string]: TransformerPreview}>({})
	const [isLoading, setIsLoading] = useState(false)
	const [validationMessage, setValidationMessage] = useState('')

	// 从Step1和Step2获取数据
	useEffect(() => {
		const step1Component = components.find(c => c.name === "step1")
		const step2Component = components.find(c => c.name === "step2")
		
		if (step1Component && step1Component.selectedAbi) {
			const abi = step1Component.selectedAbi
			setSelectedContract({
				address: abi.contract_address,
				chainName: abi.chain_name
			})
		}
		
		// 优先从Step2获取字段信息，如果没有则从Step1获取
		initializeEventMappingsFromSteps(step1Component, step2Component)
	}, [components])

	// 从全局components恢复数据
	useEffect(() => {
		if (!currentPipelineId) {
			setEventMappings([])
			setValidationMessage('No current pipeline, please select or create pipeline')
			return
		}

		const dictMapperComponent = components.find((c: any) => c.type === 'dict_mapper')
		if (dictMapperComponent && dictMapperComponent.dict_mappers) {
			console.log('🔄 从全局 components 恢复 Step3 Mapping Rules 数据:', dictMapperComponent)
			setEventMappings(dictMapperComponent.dict_mappers)
			setValidationMessage(`✅ Field Mapping Rules已从Pipeline ${currentPipelineId} loaded`)
			setTimeout(() => setValidationMessage(''), 3000)
		} else if (components.length === 0) {
			setValidationMessage('📝 Current pipeline has no configuration data, please start configuration')
		} else {
			setValidationMessage('📝 Current pipeline has no field mapping component, please start configuration')
		}
	}, [components, currentPipelineId])

	// 从Step1和Step2初始化Event映射（优先级：Step2 > Step1）
	const initializeEventMappingsFromSteps = (step1Component: any, step2Component: any) => {
		let fieldsSource = 'none'
		let eventsData: any[] = []
		
		// 优先从Step2获取字段信息
		if (step2Component && step2Component.selectedMethods) {
			const events = step2Component.selectedMethods.filter((m: any) => m.type === 'event')
			if (events.length > 0) {
				eventsData = events
				fieldsSource = 'step2'
				setSelectedMethods(step2Component.selectedMethods)
				console.log('🎯 Step3 字段信息来源: Step2 Contract Methods', events)
			}
		}
		
		// 如果Step2没有数据，从Step1获取
		if (eventsData.length === 0 && step1Component && step1Component.events_to_monitor) {
			// 从Step1的选中ABI和events_to_monitor中获取字段信息
			const eventsToMonitor = step1Component.events_to_monitor || []
			if (eventsToMonitor.length > 0) {
				// 如果有selectedAbi，尝试从ABI中获取Event定义
				if (step1Component.selectedAbi && step1Component.selectedAbi.abi_content) {
					const abiContent = step1Component.selectedAbi.abi_content
					if (Array.isArray(abiContent)) {
						const abiEvents = abiContent.filter((item: any) => item.type === 'event')
						
						// 匹配events_to_monitor中的Event名称与ABI中的Event定义
						// events_to_monitor 是 string[] 类型，每个元素就是Event名称
						eventsData = eventsToMonitor.map((eventName: string) => {
							const abiEvent = abiEvents.find((abiItem: any) => 
								abiItem.name === eventName
							)
							return abiEvent ? {
								name: abiEvent.name,
								inputs: abiEvent.inputs || [],
								type: 'event'
							} : {
								name: eventName,
								inputs: [], // 如果没有在ABI中找到，使用空的inputs数组
								type: 'event'
							}
						}).filter(Boolean)
						
						if (eventsData.length > 0) {
							fieldsSource = 'step1'
							console.log('🎯 Step3 字段信息来源: Step1 Events to Monitor (有ABI)', eventsData)
							console.log('🎯 Step1 Event名称列表:', eventsToMonitor)
							console.log('🎯 ABI中匹配的Event:', eventsData)
						}
					}
				}
				
				// 如果没有ABI内容或ABI解析失败，直接使用Event名称
				if (eventsData.length === 0) {
					eventsData = eventsToMonitor.map((eventName: string) => ({
						name: eventName,
						inputs: [],
						type: 'event'
					}))
					
					if (eventsData.length > 0) {
						fieldsSource = 'step1'
						console.log('🎯 Step3 字段信息来源: Step1 Events to Monitor (无ABI)', eventsData)
						console.log('🎯 Step1 Event名称列表:', eventsToMonitor)
					}
				}
			}
		}
		
		// 初始化映射规则
		if (eventsData.length > 0) {
			const mappings: EventMappingRule[] = eventsData.map(event => {
				// 公TotalField Mapping Rules
				const commonFieldRules = [
					{ source_key: "event_name", target_key: "event_name", transformer: null },
					{ source_key: "contract_address", target_key: "contract_address", transformer: null },
					{ source_key: "transaction_hash", target_key: "transaction_hash", transformer: null },
					{ source_key: "block_number", target_key: "block_number", transformer: null },
					{ source_key: "log_index", target_key: "log_index", transformer: null },
					{ source_key: "timestamp", target_key: "timestamp", transformer: null },
					{ source_key: "chain", target_key: "chain", transformer: null },
					{ source_key: "chain_id", target_key: "chain_id", transformer: null }
				]
				
				// Event参数字段（添加args.前缀）
				const eventInputRules = event.inputs?.map((input: any, index: number) => ({
					source_key: `args.${input.name || `param_${index}`}`,
					target_key: input.name || `param_${index}`,
					transformer: null
				})) || []
				
				// 从Step1获取方法返回值字段（如果有的话）
				const methodReturnRules: DictMappingRule[] = []
				if (step1Component && step1Component.method_return_fields) {
					const methodReturnFields = step1Component.method_return_fields
					console.log('🔄 发现Step1中的方法返回值字段:', methodReturnFields)
					
					// 为每个方法的返回值字段创建映射规则
					Object.entries(methodReturnFields).forEach(([methodName, returnFields]) => {
						if (Array.isArray(returnFields)) {
							returnFields.forEach((fieldName: string) => {
								// 如果字段名就是方法名本身（单返回值情况），则直接使用方法名
								if (fieldName === methodName) {
									methodReturnRules.push({
										source_key: methodName,
										target_key: methodName,
										transformer: null
									})
								} else {
									// 多返回值或有命名返回值的情况
									methodReturnRules.push({
										source_key: `${methodName}.${fieldName}`,
										target_key: `${methodName}_${fieldName}`,
										transformer: null
									})
								}
							})
						}
					})
					
					if (methodReturnRules.length > 0) {
						console.log(`📋 为Event ${event.name} 添加了 ${methodReturnRules.length} method return value fields`)
					}
				}
				
				return {
					event_name: event.name,
					mapping_rules: [...commonFieldRules, ...eventInputRules, ...methodReturnRules]
				}
			})
			setEventMappings(mappings)
			const totalFields = mappings.reduce((sum, e) => sum + e.mapping_rules.length, 0)
			const methodFieldCount = mappings.reduce((sum, e) => {
				return sum + e.mapping_rules.filter(rule => rule.source_key.includes('.')).length
			}, 0)
			
			let message = `✅ Field information loaded from ${fieldsSource === 'step2' ? 'Step2 合约方法' : 'Step1 Event监控'} loaded\nTotal ${eventsData.length} events，${totalFields} fields`
			if (methodFieldCount > 0) {
				message += `\nincludes ${methodFieldCount} 个method return value fields from Step2 contract methods`
			}
			
			setValidationMessage(message)
			setTimeout(() => setValidationMessage(''), 5000)
		} else {
			setValidationMessage('📝 No available field information, please first select events in Step1 or select contract methods in Step2')
		}
	}

	// 初始化Event映射（保留向后兼容）
	const initializeEventMappings = (methods: any[]) => {
		const events = methods.filter(m => m.type === 'event')
		const mappings: EventMappingRule[] = events.map(event => {
			// 公TotalField Mapping Rules
			const commonFieldRules = [
				{ source_key: "event_name", target_key: "event_name", transformer: null },
				{ source_key: "contract_address", target_key: "contract_address", transformer: null },
				{ source_key: "transaction_hash", target_key: "transaction_hash", transformer: null },
				{ source_key: "block_number", target_key: "block_number", transformer: null },
				{ source_key: "log_index", target_key: "log_index", transformer: null },
				{ source_key: "timestamp", target_key: "timestamp", transformer: null },
				{ source_key: "chain", target_key: "chain", transformer: null },
				{ source_key: "chain_id", target_key: "chain_id", transformer: null }
			]
			
			// Event参数字段（添加args.前缀）
			const eventInputRules = event.inputs?.map((input: any, index: number) => ({
				source_key: `args.${input.name || `param_${index}`}`,
				target_key: input.name || `param_${index}`,
				transformer: null
			})) || []
			
			return {
				event_name: event.name,
				mapping_rules: [...commonFieldRules, ...eventInputRules]
			}
		})
		setEventMappings(mappings)
	}

	// 查询合约decimals
	const fetchContractDecimals = async (contractAddress: string, chainName: string) => {
		const cacheKey = `${contractAddress}_${chainName}`
		const cached = decimalCache[cacheKey]
		
		// 检查缓存（5分钟有效）
		if (cached && Date.now() - cached.timestamp < 300000) {
			return cached
		}

		setIsLoadingDecimals(true)
		try {
			const response = await api.contractInfo.getContractDecimals(contractAddress, chainName)
			const result = {
				decimals: response.success ? response.decimals : undefined,
				timestamp: Date.now(),
				error: response.success ? undefined : response.message
			}
			
			setDecimalCache(prev => ({
				...prev,
				[cacheKey]: result
			}))
			
			return result
		} catch (err) {
			const result = {
				timestamp: Date.now(),
				error: err instanceof Error ? err.message : 'Query Failed'
			}
			setDecimalCache(prev => ({
				...prev,
				[cacheKey]: result
			}))
			return result
		} finally {
			setIsLoadingDecimals(false)
		}
	}

	// 更新映射规则
	const updateMappingRule = (eventIndex: number, ruleIndex: number, field: keyof DictMappingRule, value: any) => {
		setEventMappings(prev => {
			const newMappings = [...prev]
			if (!newMappings[eventIndex].mapping_rules[ruleIndex]) {
				newMappings[eventIndex].mapping_rules[ruleIndex] = {
					source_key: '',
					target_key: '',
					transformer: null
				}
			}
			newMappings[eventIndex].mapping_rules[ruleIndex] = {
				...newMappings[eventIndex].mapping_rules[ruleIndex],
				[field]: value
			}
			return newMappings
		})
		
		// 如果是transformer变更且includesdecimal转换，更新Preview
		if (field === 'transformer' && value && (value.includes('decimal') || value === 'decimal_normalize_with_field')) {
			updateTransformerPreview(eventIndex, ruleIndex, value)
		}
	}

	// Add Mapping Rule
	const addMappingRule = (eventIndex: number) => {
		setEventMappings(prev => {
			const newMappings = [...prev]
			newMappings[eventIndex].mapping_rules.push({
				source_key: '',
				target_key: '',
				transformer: null
			})
			return newMappings
		})
	}

	// Delete映射规则
	const removeMappingRule = (eventIndex: number, ruleIndex: number) => {
		setEventMappings(prev => {
			const newMappings = [...prev]
			newMappings[eventIndex].mapping_rules.splice(ruleIndex, 1)
			return newMappings
		})
	}

	// 自动添加decimalTransformer
	const addDecimalTransformer = async (eventIndex: number, ruleIndex: number) => {
		if (!selectedContract) {
			error('Error', 'No contract selected')
			return
		}

		info('Querying', 'Querying contract decimal precision...')
		const decimalsInfo = await fetchContractDecimals(selectedContract.address, selectedContract.chainName)
		
		if ('decimals' in decimalsInfo && decimalsInfo.decimals !== undefined) {
			const transformer = `decimal_normalize(${decimalsInfo.decimals})`
			updateMappingRule(eventIndex, ruleIndex, 'transformer', transformer)
			success('Success', `Added decimal transformer (precision: ${decimalsInfo.decimals})`)
		} else {
			error('Failed', decimalsInfo.error || 'Unable to get contract decimal precision')
		}
	}

	// 更新转换Preview - 调用后端API进行真实转换
	const updateTransformerPreview = async (eventIndex: number, ruleIndex: number, transformer: string) => {
		const previewKey = `${eventIndex}_${ruleIndex}`
		
		try {
			// 准备示例数据和上下文
			let sampleValue = "1000000000000000000" // 1 ETH in wei
			let context: Record<string, any> = {}
			
			// 根据不同转化器准备不同的示例数据
			if (transformer === 'hex_to_decimal') {
				sampleValue = "0xDE0B6B3A7640000" // 1 ETH in hex
			} else if (transformer === 'timestamp_to_date') {
				sampleValue = Math.floor(Date.now() / 1000).toString()
			} else if (transformer === 'decimal_normalize_with_field') {
				// 为decimal_normalize_with_field提供上下文
				context = { decimals: 18 }
			} else if (transformer === 'format_timestamp') {
				sampleValue = Math.floor(Date.now() / 1000).toString()
				context = { format_str: '%Y-%m-%d %H:%M:%S' }
			} else if (transformer === 'format_amount') {
				context = { decimals: 18 }
			} else if (transformer === 'to_lowercase') {
				sampleValue = "0xABCDEF123456789abcdef" // 混合大小写的地址示例
			} else if (transformer === 'to_uppercase') {
				sampleValue = "0xabcdef123456789ABCDEF" // 混合大小写的地址示例
			} else if (transformer === 'format_address') {
				sampleValue = "0xABCDEF123456789abcdef123456789ABCDEF12345" // 地址示例
			} else if (transformer === 'trim') {
				sampleValue = "  trim_example_string  " // 带空格的字符串
			} else if (transformer === 'to_string') {
				sampleValue = "123456" // 数字示例
			} else if (transformer === 'to_int') {
				sampleValue = "123.456" // 浮点数示例
			} else if (transformer === 'to_float') {
				sampleValue = "123456" // 整数示例
			} else if (transformer === 'to_bool') {
				sampleValue = "true" // 布尔值示例
			}
			
			// 调用后端API
			const response = await api.transform.preview({
				transformer,
				source_value: sampleValue,
				context
			})
			
			if (response.success) {
				setPreviewData(prev => ({
					...prev,
					[previewKey]: {
						sourceValue: response.source_value,
						transformedValue: response.transformed_value,
						decimalsUsed: context.decimals || null
					}
				}))
			} else {
				// 失败时显示错误信息
				setPreviewData(prev => ({
					...prev,
					[previewKey]: {
						sourceValue: sampleValue,
						transformedValue: `转换失败: ${response.message}`,
						decimalsUsed: undefined
					}
				}))
			}
		} catch (error) {
			console.error('转化器Preview失败:', error)
			// 错误时显示本地Preview
			setPreviewData(prev => ({
				...prev,
				[previewKey]: {
					sourceValue: "1000000000000000000",
					transformedValue: "Preview失败，请检查网络连接",
					decimalsUsed: undefined
				}
			}))
		}
	}

	// Save Mapping Rules配置
	const saveMappingRules = async () => {
		if (eventMappings.length === 0) {
			setValidationMessage('❌ 请至少配置一eventsmapping rules')
			return
		}

		// 验证必填字段
		for (let i = 0; i < eventMappings.length; i++) {
			const mapping = eventMappings[i]
			if (!mapping.event_name) {
				setValidationMessage(`❌ Event ${i + 1} Missing event name`)
				return
			}
			
			for (let j = 0; j < mapping.mapping_rules.length; j++) {
				const rule = mapping.mapping_rules[j]
				if (!rule.source_key || !rule.target_key) {
					setValidationMessage(`❌ Event "${mapping.event_name}" 的规则 ${j + 1} Missing required fields`)
					return
				}
			}
		}

		setIsLoading(true)
		try {
			const dictMapperComponent: DictMapper = {
				name: "step3",
				type: "dict_mapper",
				dict_mappers: eventMappings
			}

			updateComponent("step3", dictMapperComponent)

			setValidationMessage(`✅ Field Mapping Rulessaved successfully!\nTotal配置 ${eventMappings.length} eventsmapping rules\nTotal rules: ${eventMappings.reduce((sum, e) => sum + e.mapping_rules.length, 0)} items`)

			console.log('🎯 Step3 Mapping Rules saved successfully!')
			console.log('当前 components 列表:', components)
			console.log('保存的 DictMapper:', dictMapperComponent)
			
			// 自动跳转到下一步
			setTimeout(() => {
				if (onStepChange) {
					onStepChange(4)
				}
			}, 2000)
		} catch (err) {
			setValidationMessage('❌ Save failed，Please try again')
		} finally {
			setIsLoading(false)
		}
	}

	// 获取transformer选项 - 与后端 BuiltinTransformers 保持一致
	const getTransformerOptions = () => [
		{ value: null, label: 'No Transformation' },
		{ value: 'to_string', label: 'Convert to String' },
		{ value: 'to_int', label: 'Convert to Integer' },
		{ value: 'to_float', label: 'Convert to Float' },
		{ value: 'to_bool', label: 'Convert to Boolean' },
		{ value: 'to_lowercase', label: 'Convert to Lowercase' },
		{ value: 'to_uppercase', label: 'Convert to Uppercase' },
		{ value: 'trim', label: 'Trim Whitespace' },
		{ value: 'format_address', label: 'Format Address' },
		{ value: 'format_timestamp', label: 'Format Timestamp' },
		{ value: 'timestamp_to_date', label: 'Timestamp to Date' },
		{ value: 'hex_to_decimal', label: 'Hex to Decimal' },
		{ value: 'decimal_normalize(18)', label: 'Decimal Normalization (18bits)' },
		{ value: 'decimal_normalize(6)', label: 'Decimal Normalization (6bits)' },
		{ value: 'decimal_normalize_with_field', label: 'Normalize by Decimals Field' }
	]

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Step 3: Field Mapping Rules</h2>
				<div className="text-sm text-gray-600">
					Step 3: Field Mapping Rules with Decimal Conversion
				</div>
			</div>

			{/* Contract Information显示 */}
			{selectedContract && (
				<Box title="Contract Information">
					<div className="bg-gray-50 p-3 rounded">
						<div className="text-sm">
							<span className="font-medium">Contract Address:</span> {selectedContract.address}
						</div>
						<div className="text-sm mt-1">
							<span className="font-medium">Blockchain:</span> {selectedContract.chainName}
						</div>
						{decimalCache[`${selectedContract.address}_${selectedContract.chainName}`] && (
							<div className="text-sm mt-1">
								<span className="font-medium">Decimals:</span>{' '}
								{decimalCache[`${selectedContract.address}_${selectedContract.chainName}`]?.decimals || 'Query Failed'}
							</div>
						)}
					</div>
				</Box>
			)}

			{/* Event映射配置 */}
			<Box title="Event Field Mapping Configuration" right={
				<button 
					className="btn btn-secondary" 
					onClick={() => setEventMappings([])}
					disabled={isLoading}
				>
					Clear
				</button>
			}>
				{eventMappings.length > 0 ? (
					<div className="space-y-4">
						{/* Event选择标签页 */}
						<div className="flex border-b">
							{eventMappings.map((mapping, index) => (
								<button
									key={index}
									onClick={() => setActiveEventIndex(index)}
									className={`px-4 py-2 text-sm font-medium ${
										activeEventIndex === index
											? 'border-b-2 border-blue-500 text-blue-600'
											: 'text-gray-500 hover:text-gray-700'
									}`}
								>
									{mapping.event_name} ({mapping.mapping_rules.length})
								</button>
							))}
						</div>

						{/* 当前Eventmapping rules */}
						{eventMappings[activeEventIndex] && (
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<h4 className="font-medium">
										Event: {eventMappings[activeEventIndex].event_name}
									</h4>
									<button
										onClick={() => addMappingRule(activeEventIndex)}
										className="btn btn-sm btn-secondary"
									>
										+ Add Mapping Rule
									</button>
								</div>

								{/* 映射规则表格 */}
								<div className="border rounded-lg overflow-hidden">
									<table className="w-full">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
													Source Field
												</th>
												<th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
													Target Field
												</th>
												<th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
													Transformer
												</th>
												<th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
													Preview
												</th>
												<th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
													Actions
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-gray-200">
											{eventMappings[activeEventIndex].mapping_rules.map((rule, ruleIndex) => (
												<tr key={ruleIndex}>
													<td className="px-3 py-2">
														<input
															type="text"
															className="input input-sm w-full"
															placeholder="Source Field Name"
															value={rule.source_key}
															onChange={(e) => updateMappingRule(activeEventIndex, ruleIndex, 'source_key', e.target.value)}
														/>
													</td>
													<td className="px-3 py-2">
														<input
															type="text"
															className="input input-sm w-full"
															placeholder="Target Field Name"
															value={rule.target_key}
															onChange={(e) => updateMappingRule(activeEventIndex, ruleIndex, 'target_key', e.target.value)}
														/>
													</td>
													<td className="px-3 py-2">
														<div className="flex gap-1">
															<select
																className="select select-sm flex-1"
																value={rule.transformer || ''}
																onChange={(e) => updateMappingRule(activeEventIndex, ruleIndex, 'transformer', e.target.value || null)}
															>
																{getTransformerOptions().map(option => (
																	<option key={option.label} value={option.value || ''}>
																		{option.label}
																	</option>
																))}
															</select>
															<button
																onClick={() => addDecimalTransformer(activeEventIndex, ruleIndex)}
																className="btn btn-xs btn-secondary"
																disabled={isLoadingDecimals}
																title="Auto add decimal transformer"
															>
																{isLoadingDecimals ? '...' : 'D'}
															</button>
															{rule.transformer && (
																<button
																	onClick={() => updateTransformerPreview(activeEventIndex, ruleIndex, rule.transformer || '')}
																	className="btn btn-xs btn-accent"
																	title="Preview transformation result"
																>
																	Preview
																</button>
															)}
														</div>
													</td>
													<td className="px-3 py-2">
														{previewData[`${activeEventIndex}_${ruleIndex}`] && (
															<div className="text-xs">
																<div className="text-gray-500">
																	{previewData[`${activeEventIndex}_${ruleIndex}`].sourceValue.substring(0, 8)}...
																</div>
																<div className="font-medium">
																	→ {previewData[`${activeEventIndex}_${ruleIndex}`].transformedValue}
																</div>
															</div>
														)}
													</td>
													<td className="px-3 py-2 text-center">
														<button
															onClick={() => removeMappingRule(activeEventIndex, ruleIndex)}
															className="btn btn-xs btn-error"
														>
															Delete
														</button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						)}
					</div>
				) : (
					<div className="text-center py-8 text-gray-500">
						<p>No event mapping rules yet</p>
						<p className="text-sm">Field information priority：</p>
						<p className="text-sm">1. Step2 Contract method selection → 2. Step1 Event monitoring configuration</p>
						<p className="text-sm mt-2">Please select events in Step1 or methods in Step2 to auto-generate</p>
					</div>
				)}
			</Box>

			{/* 验证消息 */}
			{validationMessage && (
				<div className={`p-4 rounded-lg ${
					validationMessage.includes('✅') ? 'bg-green-50 text-green-700' : 
					validationMessage.includes('❌') ? 'bg-red-50 text-red-700' :
					'bg-blue-50 text-blue-700'
				}`}>
					<pre className="whitespace-pre-wrap">{validationMessage}</pre>
				</div>
			)}

			{/* Actions按钮 */}
			<div className="flex gap-3">
				<button 
					className="btn" 
					onClick={saveMappingRules}
					disabled={isLoading || eventMappings.length === 0}
				>
					{isLoading ? 'Saving...' : 'Save Mapping Rules'}
				</button>
				<button 
					className="btn btn-secondary"
					onClick={async () => {
						await saveMappingRules()
						if (onStepChange) {
							onStepChange(4)
						}
					}}
					disabled={isLoading || eventMappings.length === 0}
				>
					Continue to Step 4
				</button>
			</div>

			{/* 配置Preview */}
			{eventMappings.length > 0 && (
				<Box title="Mapping Rules Preview" right={
					<span className="text-xs text-gray-500 bg-green-100 px-2 py-1 rounded">
						Pipeline {currentPipelineId}
					</span>
				}>
					<div className="space-y-3">
						{eventMappings.map((mapping, index) => (
							<div key={index} className="border rounded p-3">
								<div className="font-medium mb-2">{mapping.event_name}</div>
								<div className="grid grid-cols-3 gap-2 text-sm">
									{mapping.mapping_rules.map((rule, ruleIndex) => (
										<div key={ruleIndex} className="flex items-center bg-gray-50 p-2 rounded">
											<span className="text-blue-600">{rule.source_key}</span>
											<span className="mx-2">→</span>
											<span className="text-green-600">{rule.target_key}</span>
											{rule.transformer && (
												<span className="ml-1 text-xs bg-orange-100 px-1 rounded">
													{rule.transformer}
												</span>
											)}
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				</Box>
			)}
		</div>
	)
}