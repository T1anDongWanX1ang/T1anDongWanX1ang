import Box from '../components/Box'

import { useAppState, DictMapper, EventMappingRule, DictMappingRule } from '../../state/AppState'
import { useState, useRef, useEffect } from 'react'
import { fieldParsingAPI, FieldParsingRequest, TemplateUploadRequest } from '../../services/api'
import { currentApiConfig } from '../../config/api'

import { debugAPI } from '../../utils/debug'

interface Step2Props {
	onStepChange?: (step: number) => void
}

export default function Step2({ onStepChange }: Step2Props = {}) {
	const { eventParams, updateComponent, components } = useAppState()

	const [dragId, setDragId] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [uploadMessage, setUploadMessage] = useState('')
	const [parsingMessage, setParsingMessage] = useState('')
	const [saveMessage, setSaveMessage] = useState('')
	const fileInputRef = useRef<HTMLInputElement>(null)
	
	// 多事件映射规则状态管理
	const [eventMappings, setEventMappings] = useState<EventMappingRule[]>([])
	const [currentEventIndex, setCurrentEventIndex] = useState(0)
	const [availableEvents, setAvailableEvents] = useState<string[]>([])

	// 从全局 components 中恢复数据，或根据第一步字段自动生成映射规则
	useEffect(() => {
		// 获取 Step1 中的事件监控器配置
		const step1Component = components.find(c => c.name === "step1")
		const eventsToMonitor = step1Component?.events_to_monitor || []
		
		// 设置可用事件列表
		setAvailableEvents(eventsToMonitor)
		
		// 检查是否已有保存的 Step2 配置
		const step2Component = components.find(c => c.name === "step2") as DictMapper
		
		if (step2Component && step2Component.dict_mappers && step2Component.dict_mappers.length > 0) {
			// 从保存的数据中恢复多事件映射规则
			console.log('🔄 从全局 components 恢复 Step2 多事件数据:', step2Component)
			setEventMappings(step2Component.dict_mappers)
			setSaveMessage(`✅ Restored mapping rules for ${step2Component.dict_mappers.length} events from pipeline configuration`)
			setTimeout(() => setSaveMessage(''), 6000)
		} else if (eventsToMonitor.length > 0) {
			// 如果没有保存的数据，为每个事件创建默认的映射规则
			console.log('🔄 根据第一步事件自动生成多事件映射规则:', eventsToMonitor)
			
			const defaultEventMappings: EventMappingRule[] = eventsToMonitor.map((eventName: string) => ({
				event_name: eventName,
				mapping_rules: getDefaultMappingRulesForEvent(eventName)
			}))
			
			setEventMappings(defaultEventMappings)
			setSaveMessage(`✅ Auto-generated default mapping rules for ${eventsToMonitor.length} events`)
			setTimeout(() => setSaveMessage(''), 6000)
		} else {
			// 没有任何数据可以恢复或生成
			console.log('📝 Step2: 没有可恢复的数据，等待用户配置')
		}
	}, [components])

	// 从 ABI 中解析特定事件的参数并生成默认映射规则
	const getDefaultMappingRulesForEvent = (eventName: string): DictMappingRule[] => {
		const commonRules: DictMappingRule[] = [
			{
				source_key: "event_name",
				target_key: "event_name",
				transformer: null
			},
			{
				source_key: "contract_address",
				target_key: "contract_address",
				transformer: null
			},
			{
				source_key: "transaction_hash",
				target_key: "transaction_hash",
				transformer: null
			},
			{
				source_key: "block_number",
				target_key: "block_number",
				transformer: null
			},
			{
				source_key: "log_index",
				target_key: "log_index",
				transformer: null
			},
			{
				source_key: "timestamp",
				target_key: "timestamp",
				transformer: null
			},
			{
				source_key: "chain",
				target_key: "chain",
				transformer: null
			},
			{
				source_key: "chain_id",
				target_key: "chain_id",
				transformer: null
			}
		]

		// 从 Step1 组件中获取 ABI 内容和选中的事件
		const step1Component = components.find(c => c.name === "step1")
		if (!step1Component) {
			console.log('未找到 Step1 组件，使用基础规则')
			return commonRules
		}

		// 尝试直接解析 ABI 内容获取特定事件的参数
		const eventRules = parseEventParametersFromABI(eventName, step1Component)
		
		console.log(`为事件 ${eventName} 从 ABI 解析了 ${eventRules.length} 条参数映射规则:`, eventRules.map(r => r.source_key))
		return [...commonRules, ...eventRules]
	}

	// 从 ABI 中解析特定事件的参数
	const parseEventParametersFromABI = (eventName: string, step1Component: any): DictMappingRule[] => {
		try {
			// 尝试从 Step1 存储的事件参数映射中获取特定事件的参数
			const eventParamsMap = (window as any).eventParamsMap || {}
			const eventSpecificParams = eventParamsMap[eventName] || []

			if (eventSpecificParams.length > 0) {
				console.log(`从 ABI 解析中找到事件 ${eventName} 的 ${eventSpecificParams.length} 个参数:`, eventSpecificParams)
				return eventSpecificParams.map((param: string) => ({
					source_key: param,
					target_key: param.replace('args.', ''), // 移除 args. 前缀作为目标字段
					transformer: null // 默认为空
				}))
			}

			// 如果没有找到特定事件的参数，尝试从全局事件参数中获取
			const step1EventParams = eventParams.step1 || []
			const allEventParams = step1EventParams.filter(param => 
				param.startsWith('args.') && !param.includes('_data')
			)

			if (allEventParams.length > 0) {
				console.log(`从全局事件参数中找到 ${allEventParams.length} 个参数（可能包含多个事件的参数）:`, allEventParams)
				return allEventParams.map(param => ({
					source_key: param,
					target_key: param.replace('args.', ''), // 移除 args. 前缀作为目标字段
					transformer: null // 默认为空
				}))
			}

			console.log(`未找到事件 ${eventName} 的已解析参数，请先在 Step1 中上传 ABI 并选择事件`)
			return []
		} catch (error) {
			console.error(`解析事件 ${eventName} 参数时出错:`, error)
			return []
		}
	}

	// 为单个参数生成映射规则的辅助函数
	const generateMappingRulesForParam = (sourceKey: string, paramName: string, eventName: string): DictMappingRule[] => {
		// 智能推断目标字段名和转换器
		let targetKey = paramName
		let transformer: string | null = null

		// 基于参数名称的智能映射
		if (paramName === 'from') {
			targetKey = 'sender_address'
			transformer = 'to_lowercase'
		} else if (paramName === 'to') {
			targetKey = 'receiver_address'
			transformer = 'to_lowercase'
		} else if (paramName === 'owner') {
			targetKey = 'token_owner'
			transformer = 'to_lowercase'
		} else if (paramName === 'spender') {
			targetKey = 'approved_spender'
			transformer = 'to_lowercase'
		} else if (paramName === 'operator') {
			targetKey = 'operator_address'
			transformer = 'to_lowercase'
		} else if (paramName === 'approved') {
			targetKey = 'approved_address'
			transformer = 'to_lowercase'
		} else if (paramName === 'tokenId') {
			targetKey = 'token_id'
			transformer = 'to_int'
		} else if (paramName === 'value' || paramName === 'amount') {
			// 对于金额参数，创建两个映射规则：wei 和 ether
			return [
				{
					source_key: sourceKey,
					target_key: `${eventName.toLowerCase()}_amount_wei`,
					transformer: null
				},
				{
					source_key: sourceKey,
					target_key: `${eventName.toLowerCase()}_amount_ether`,
					transformer: 'wei_to_ether'
				}
			]
		} else if (paramName.toLowerCase().includes('address')) {
			// 地址类型参数
			transformer = 'to_lowercase'
		} else if (paramName.toLowerCase().includes('amount') || paramName.toLowerCase().includes('value')) {
			// 其他金额类型参数
			return [
				{
					source_key: sourceKey,
					target_key: `${paramName}_wei`,
					transformer: null
				},
				{
					source_key: sourceKey,
					target_key: `${paramName}_ether`,
					transformer: 'wei_to_ether'
				}
			]
		} else if (paramName.toLowerCase().includes('id') || paramName.toLowerCase().includes('index')) {
			// ID 或索引类型参数
			transformer = 'to_int'
		} else if (paramName.toLowerCase().includes('time') || paramName.toLowerCase().includes('timestamp')) {
			// 时间戳类型参数
			transformer = 'timestamp_to_date'
		}

		return [{
			source_key: sourceKey,
			target_key: targetKey,
			transformer: transformer
		}]
	}

	// 获取当前选中事件的映射规则
	const getCurrentEventMapping = (): EventMappingRule | null => {
		return eventMappings[currentEventIndex] || null
	}

	// 更新当前事件的映射规则
	const updateCurrentEventMapping = (updatedRules: DictMappingRule[]) => {
		setEventMappings(prev => prev.map((mapping, index) => 
			index === currentEventIndex 
				? { ...mapping, mapping_rules: updatedRules }
				: mapping
		))
	}

	// 添加新的映射规则到当前事件
	const addMappingRule = () => {
		const currentMapping = getCurrentEventMapping()
		if (!currentMapping) return

		const newRule: DictMappingRule = {
			source_key: '',
			target_key: '',
			transformer: null
		}

		const updatedRules = [...currentMapping.mapping_rules, newRule]
		updateCurrentEventMapping(updatedRules)
	}

	// 删除映射规则
	const removeMappingRule = (ruleIndex: number) => {
		const currentMapping = getCurrentEventMapping()
		if (!currentMapping) return

		const updatedRules = currentMapping.mapping_rules.filter((_, index) => index !== ruleIndex)
		updateCurrentEventMapping(updatedRules)
	}

	// 更新映射规则
	const updateMappingRule = (ruleIndex: number, field: keyof DictMappingRule, value: string | null) => {
		const currentMapping = getCurrentEventMapping()
		if (!currentMapping) return

		const updatedRules = currentMapping.mapping_rules.map((rule, index) =>
			index === ruleIndex ? { ...rule, [field]: value } : rule
		)
		updateCurrentEventMapping(updatedRules)
	}

	// 清空当前事件的所有映射规则
	const handleBatchDelete = () => {
		updateCurrentEventMapping([])
		setParsingMessage('✅ Cleared all mapping rules for current event')
		setTimeout(() => setParsingMessage(''), 3000)
	}

	// 添加新事件
	const addNewEvent = () => {
		const eventName = prompt('Please enter new event name:')
		if (!eventName || eventName.trim() === '') return

		const newEventMapping: EventMappingRule = {
			event_name: eventName.trim(),
			mapping_rules: getDefaultMappingRulesForEvent(eventName.trim())
		}

		setEventMappings(prev => [...prev, newEventMapping])
		setCurrentEventIndex(eventMappings.length) // 切换到新添加的事件
		setParsingMessage(`✅ Added new event: ${eventName}`)
		setTimeout(() => setParsingMessage(''), 3000)
	}

	// 删除事件
	const removeEvent = (eventIndex: number) => {
		if (eventMappings.length <= 1) {
			setParsingMessage('❌ At least one event configuration must be kept')
			setTimeout(() => setParsingMessage(''), 3000)
			return
		}

		const eventName = eventMappings[eventIndex].event_name
		if (confirm(`Are you sure you want to delete event "${eventName}" and all its mapping rules?`)) {
			setEventMappings(prev => prev.filter((_, index) => index !== eventIndex))
			
			// 调整当前选中的事件索引
			if (currentEventIndex >= eventIndex && currentEventIndex > 0) {
				setCurrentEventIndex(currentEventIndex - 1)
			}
			
			setParsingMessage(`✅ Deleted event: ${eventName}`)
			setTimeout(() => setParsingMessage(''), 3000)
		}
	}

	// 保存多事件映射配置
	const handleSaveMapping = async (event?: React.MouseEvent) => {
		if (eventMappings.length === 0) {
			setParsingMessage('❌ Please configure mapping rules for at least one event')
			if (event) event.preventDefault()
			return
		}

		// 验证每个事件至少有一条映射规则
		const emptyEvents = eventMappings.filter(mapping => mapping.mapping_rules.length === 0)
		if (emptyEvents.length > 0) {
			setParsingMessage(`❌ The following events have no mapping rules configured: ${emptyEvents.map(e => e.event_name).join(', ')}`)
			if (event) event.preventDefault()
			return
		}

		setIsLoading(true)
		try {
			// 组装 DictMapper 数据
			const dictMapperComponent: DictMapper = {
				name: "step2",
				type: "dict_mapper",
				dict_mappers: eventMappings
			}
			
			// 更新全局 components
			updateComponent("step2", dictMapperComponent)
			
			// 检查是否是更新还是新增
			const existingComponent = components.find(c => c.name === "step2")
			const action = existingComponent ? "updated" : "added"
			
			setSaveMessage(`✅ Multi-event mapping configuration saved successfully!\n${action} to global component list\nConfigured mapping rules for ${eventMappings.length} events`)
			
			// 调试信息
			console.log('🎯 Step2 多事件映射保存成功!')
			console.log('当前 components 列表:', components)
			console.log(`${action}的 DictMapper:`, dictMapperComponent)
			
			// 延迟跳转到下一步
			setTimeout(() => {
				// 这里可以添加跳转逻辑
			}, 1500)
		} catch (error) {
			setSaveMessage('❌ Save failed, please try again')
			if (event) event.preventDefault()
		} finally {
			setIsLoading(false)
		}
	}

	// 导出配置
	const handleExportRules = () => {
		const exportData = {
			name: "step2",
			type: "dict_mapper",
			dict_mappers: eventMappings
		}
		
		const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'multi-event-mapping-rules.json'
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)
		
		setSaveMessage('✅ Multi-event mapping rules exported')
		setTimeout(() => setSaveMessage(''), 3000)
	}

	// 导入配置
	const handleImportRules = () => {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = '.json'
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0]
			if (!file) return

			try {
				const text = await file.text()
				const importedData = JSON.parse(text)
				
				if (importedData.dict_mappers && Array.isArray(importedData.dict_mappers)) {
					setEventMappings(importedData.dict_mappers)
					setCurrentEventIndex(0)
					setSaveMessage(`✅ Imported mapping rules for ${importedData.dict_mappers.length} events`)
					setTimeout(() => setSaveMessage(''), 3000)
				} else {
					setSaveMessage('❌ Import file format is incorrect')
					setTimeout(() => setSaveMessage(''), 3000)
				}
			} catch (error) {
				setSaveMessage('❌ Import file parsing failed')
				setTimeout(() => setSaveMessage(''), 3000)
			}
		}
		input.click()
	}

	const currentMapping = getCurrentEventMapping()

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Step 2: Multi-Event Field Mapping</h2>
				<div className="flex items-center gap-3">
					<div className="text-sm text-gray-600">
						Step 2: Multi-Event Field Mapping Configuration
					</div>
				</div>
			</div>

			{/* 事件选择标签页 */}
			<Box title="Event Selection" right={
				<button 
					className="btn btn-secondary" 
					onClick={addNewEvent}
				>
					Add Event
				</button>
			}>
				<div className="space-y-4">
					{eventMappings.length > 0 ? (
						<div className="flex flex-wrap gap-2">
							{eventMappings.map((mapping, index) => (
								<div key={index} className="flex items-center">
									<button
										className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
											index === currentEventIndex
												? 'bg-blue-600 text-white'
												: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
										}`}
										onClick={() => setCurrentEventIndex(index)}
									>
										{mapping.event_name}
										<span className="ml-2 text-xs opacity-75">
											({mapping.mapping_rules.length} rules)
										</span>
									</button>
									{eventMappings.length > 1 && (
										<button
											className="ml-1 text-red-500 hover:text-red-700 text-sm"
											onClick={() => removeEvent(index)}
											title="Delete Event"
										>
											×
										</button>
									)}
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-8 text-gray-500">
							<p>No event configuration</p>
							<p className="text-sm mt-2">Please configure events to monitor in Step 1 first, or manually add events</p>
						</div>
					)}
				</div>
			</Box>

			{/* 当前事件的映射规则配置 */}
			{currentMapping && (
				<Box title={`Mapping Rules for "${currentMapping.event_name}"`} right={
					<div className="flex gap-2">
						<button 
							className="btn btn-secondary" 
							onClick={addMappingRule}
						>
							Add Rule
						</button>
						<button 
							className="btn btn-secondary" 
							onClick={handleImportRules}
						>
							Import
						</button>
						<button 
							className="btn btn-secondary" 
							onClick={handleExportRules}
							disabled={eventMappings.length === 0}
						>
							Export
						</button>
						<button 
							className="btn btn-secondary" 
							onClick={handleBatchDelete}
							disabled={currentMapping.mapping_rules.length === 0}
						>
							Clear All
						</button>
					</div>
				}>
					{parsingMessage && (
						<div className={`mb-4 p-3 rounded text-sm ${parsingMessage.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
							{parsingMessage}
						</div>
					)}
					
					<div className="overflow-x-auto">
						<table className="w-full border-collapse">
							<thead>
								<tr className="border-b border-gray-200">
									<th className="text-left p-3 font-medium text-gray-700">Source Key</th>
									<th className="text-left p-3 font-medium text-gray-700">Target Key</th>
									<th className="text-left p-3 font-medium text-gray-700">Transformer</th>
									<th className="text-left p-3 font-medium text-gray-700">Actions</th>
								</tr>
							</thead>
							<tbody>
								{currentMapping.mapping_rules.map((rule, index) => (
									<tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
										<td className="p-3">
											<input
												type="text"
												className="input w-full"
												value={rule.source_key}
												onChange={(e) => updateMappingRule(index, 'source_key', e.target.value)}
												placeholder="Source field name"
											/>
										</td>
										<td className="p-3">
											<input
												type="text"
												className="input w-full"
												value={rule.target_key}
												onChange={(e) => updateMappingRule(index, 'target_key', e.target.value)}
												placeholder="Target field name"
											/>
										</td>
										<td className="p-3">
											<select
												className="input w-full"
												value={rule.transformer || ''}
												onChange={(e) => updateMappingRule(index, 'transformer', e.target.value || null)}
											>
												<option value="">No transformation</option>
												<option value="to_int">Convert to integer</option>
												<option value="to_lowercase">Convert to lowercase</option>
												<option value="to_uppercase">Convert to uppercase</option>
												<option value="wei_to_ether">Wei to Ether</option>
												<option value="timestamp_to_date">Timestamp to date</option>
											</select>
										</td>
										<td className="p-3">
											<button
												className="text-red-500 hover:text-red-700"
												onClick={() => removeMappingRule(index)}
												title="Delete rule"
											>
												Delete
											</button>
										</td>
									</tr>
								))}
								{currentMapping.mapping_rules.length === 0 && (
									<tr>
										<td colSpan={4} className="p-8 text-center text-gray-500">
											No mapping rules, click "Add Rule" to add rules
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</Box>
			)}

			{/* 保存消息 */}
			{saveMessage && (
				<div className={`p-4 rounded-lg ${
					saveMessage.includes('✅') ? 'bg-green-50 text-green-700' : 
					saveMessage.includes('❌') ? 'bg-red-50 text-red-700' :
					'bg-blue-50 text-blue-700'
				}`}>
					<pre className="whitespace-pre-wrap">{saveMessage}</pre>
				</div>
			)}

			{/* 操作按钮 */}
			<div className="flex gap-3">
				<button 
					className="btn" 
					onClick={handleSaveMapping}
					disabled={isLoading}
				>
					{isLoading ? 'Saving...' : 'Save Multi-Event Mapping'}
				</button>
				<button 
					className="btn btn-secondary"
					onClick={async () => {
						await handleSaveMapping()
						if (onStepChange) {
							onStepChange(3)
						}
					}}
				>
					Continue to Step 3
				</button>
			</div>

			{/* 配置预览 */}
			{eventMappings.length > 0 && (
				<Box title="Multi-Event Configuration Preview">
					<div className="space-y-4">
						{eventMappings.map((mapping, index) => (
							<div key={index} className="border border-gray-200 rounded-lg p-4">
								<div className="flex items-center justify-between mb-3">
									<h4 className="font-medium text-gray-900">Event: {mapping.event_name}</h4>
									<span className="text-sm text-gray-500 bg-blue-100 px-2 py-1 rounded">
										{mapping.mapping_rules.length} rules
									</span>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
									{mapping.mapping_rules.slice(0, 6).map((rule, ruleIndex) => (
										<div key={ruleIndex} className="bg-gray-50 p-2 rounded">
											<div className="font-mono text-xs">
												{rule.source_key} → {rule.target_key}
											</div>
											{rule.transformer && (
												<div className="text-xs text-blue-600 mt-1">
													{rule.transformer}
												</div>
											)}
										</div>
									))}
									{mapping.mapping_rules.length > 6 && (
										<div className="bg-gray-50 p-2 rounded text-center text-gray-500">
											+{mapping.mapping_rules.length - 6} more...
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				</Box>
			)}
		</div>
	)
}