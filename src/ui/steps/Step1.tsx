import Box from '../components/Box'

import { useAppState, EventMonitor } from '../../state/AppState'
import { useState, useRef, useEffect } from 'react'
import { api } from '../../services/api'
import { AbiService } from '../../services/abiService'

interface Step1Props {
	onStepChange?: (step: number) => void
}

export default function Step1({ onStepChange }: Step1Props = {}) {
	const { components, updateComponent, setEventParams, eventParams, currentPipelineId } = useAppState()
	const [isLoading, setIsLoading] = useState(false)
	const [validationMessage, setValidationMessage] = useState('')
	const [contractAddress, setContractAddress] = useState('')
	const [selectedBlockchain, setSelectedBlockchain] = useState('ethereum')
	const [abiPath, setAbiPath] = useState('')
	const [selectedEvents, setSelectedEvents] = useState<string[]>([])
	const [selectedAbi, setSelectedAbi] = useState<any>(null)
	const [abiOptions, setAbiOptions] = useState<Array<{
		id: number
		contract_address: string
		contract_name?: string
		abi_content: any
		display_name: string
	}>>([])
	const [abiSearchTerm, setAbiSearchTerm] = useState('')
	const [isAbiDropdownOpen, setIsAbiDropdownOpen] = useState(false)
	const [abiContent, setAbiContent] = useState('')
	const [uploadedFilePath, setUploadedFilePath] = useState('')
	const [dynamicEvents, setDynamicEvents] = useState<string[]>([])
	const fileInputRef = useRef<HTMLInputElement>(null)
	const dropdownRef = useRef<HTMLDivElement>(null)
	
	// 点击外部关闭下拉框
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsAbiDropdownOpen(false)
			}
		}
		
		document.addEventListener('mousedown', handleClickOutside)
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [])
	

	
	// Restore data from global components
	useEffect(() => {
		if (!currentPipelineId) {
			// 没有选中管道时，清空表单
			setContractAddress('')
			setAbiPath('')
			setSelectedEvents([])
			setUploadedFilePath('')
			setValidationMessage('')
			setDynamicEvents([])
			return
		}

		// 从全局 components 中查找 event_monitor 类型的组件
		const eventMonitorComponent = components.find((c: any) => c.type === 'event_monitor')
		
		if (eventMonitorComponent) {
			console.log('🔄 从全局 components 恢复 Step1 数据:', eventMonitorComponent)
			
			// 恢复表单数据
			setContractAddress(eventMonitorComponent.contract_address || '')
			setAbiPath(eventMonitorComponent.abi_path || '')
			setSelectedEvents(eventMonitorComponent.events_to_monitor || [])
			
			if (eventMonitorComponent.abi_path) {
				setUploadedFilePath(eventMonitorComponent.abi_path)
			}
			
			// 如果有事件数据，设置为动态事件（模拟从ABI解析得到）
			if (eventMonitorComponent.events_to_monitor && eventMonitorComponent.events_to_monitor.length > 0) {
				setDynamicEvents(eventMonitorComponent.events_to_monitor)
			}
			
			const eventCount = eventMonitorComponent.events_to_monitor?.length || 0
			const contractShort = eventMonitorComponent.contract_address?.slice(0, 10) || 'N/A'
			
			setValidationMessage(`✅ Configuration data automatically loaded from pipeline ${currentPipelineId}\nContract address: ${contractShort}...\nABI path: ${eventMonitorComponent.abi_path || 'N/A'}\nMonitoring events: ${eventCount} events`)
			
			setTimeout(() => {
				setValidationMessage('')
			}, 8000)
		} else {
			// 没有找到对应组件，清空表单
			setContractAddress('')
			setAbiPath('')
			setSelectedEvents([])
			setUploadedFilePath('')
			setDynamicEvents([])
			
			if (components.length === 0) {
				setValidationMessage('📝 Current pipeline has no configuration data, please start configuration')
			} else {
				setValidationMessage('📝 Current pipeline has no event monitoring component, please start configuration')
			}
			
			setTimeout(() => {
				setValidationMessage('')
			}, 3000)
		}
	}, [components, currentPipelineId])

	// 获取ABI选项列表
	useEffect(() => {
		const loadAbiOptions = async () => {
			try {
				console.log('🔄 开始加载ABI选项列表...')
				const response = await AbiService.getAbiList({ page: 1, size: 100 })
				console.log('📡 ABI API响应:', response)
				
				if (response.success) {
					console.log('📋 ABI原始数据:', response.data.items)
					const options = response.data.items.map(item => ({
						...item,
						display_name: item.contract_name 
							? `${item.contract_name} - ${item.contract_address}`
							: item.contract_address
					}))
					console.log('🏷️ 处理后的ABI选项:', options)
					setAbiOptions(options)
				} else {
					console.log('❌ ABI API调用失败:', response)
				}
			} catch (error) {
				console.error('❌ Failed to load ABI options:', error)
			}
		}
		
		loadAbiOptions()
	}, [])

	// 常用事件列表（默认 + 动态解析）
	const defaultEvents: string[] = []
	
	// 合并默认事件和从ABI解析的事件，去重
	const commonEvents = [...new Set([...defaultEvents, ...dynamicEvents])]

	// 验证合约地址
	const validateContractAddress = (address: string) => {
		if (!address) return false
		// Ethereum地址格式验证
		if (address.startsWith('0x') && address.length === 42) {
			return /^0x[a-fA-F0-9]{40}$/.test(address)
		}
		// Solana地址格式验证
		if (address.length === 44) {
			return /^[1-9A-HJ-NP-Za-km-z]{44}$/.test(address)
		}
		return false
	}

	// 处理ABI选择
	const handleAbiSelect = (abi: any) => {
		console.log('🔍 处理ABI选择:', abi)
		
		setSelectedAbi(abi)
		setAbiPath(`abi_id:${abi.id}`) // 使用新的ID格式
		setContractAddress(abi.contract_address) // 自动填充合约地址
		setSelectedBlockchain(abi.chain_name) // 自动设置区块链
		setIsAbiDropdownOpen(false)
		setAbiSearchTerm(abi.display_name) // 显示选中的合约名称
		
		// 解析ABI内容并提取事件
		try {
			const abiData = abi.abi_content
			console.log('📋 ABI数据:', abiData)
			console.log('📋 ABI数据类型:', typeof abiData, '是否为数组:', Array.isArray(abiData))
			
			if (Array.isArray(abiData) && abiData.length > 0) {
				setAbiContent(JSON.stringify(abiData))
				
				// 从ABI中提取所有事件名称
				const allItems = abiData.map((item, index) => ({ index, type: item.type, name: item.name }))
				console.log('📋 所有ABI条目:', allItems)
				
				const extractedEvents = abiData
					.filter((item: any) => item.type === 'event')
					.map((item: any) => item.name)
					.filter((name: string) => name)
				
				console.log('🎯 提取的事件列表:', extractedEvents)
				setDynamicEvents(extractedEvents)
				
				// 提示用户结果
				if (extractedEvents.length > 0) {
					setValidationMessage(`✅ ABI selected: ${abi.display_name || abi.contract_address}\nExtracted ${extractedEvents.length} events: ${extractedEvents.join(', ')}\nPlease select events to monitor`)
				} else {
					setValidationMessage(`✅ ABI selected: ${abi.display_name || abi.contract_address}\n⚠️  No events found in this ABI. This contract may not emit events.`)
				}
				
				setTimeout(() => {
					setValidationMessage('')
				}, 5000)
			} else {
				console.log('⚠️ ABI数据不是有效的数组或为空')
				setValidationMessage('❌ ABI data is not valid or empty')
			}
		} catch (error) {
			console.error('❌ Failed to parse ABI content:', error)
			setValidationMessage('❌ Failed to parse ABI content')
		}
	}

	// 过滤ABI选项（模糊搜索）
	const filteredAbiOptions = abiOptions.filter(abi => 
		abi.display_name.toLowerCase().includes(abiSearchTerm.toLowerCase()) ||
		abi.contract_address.toLowerCase().includes(abiSearchTerm.toLowerCase())
	)
	

	// 处理ABI文件上传（保留作为备用功能）
	const handleAbiFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return

		if (!file.name.endsWith('.json')) {
			setValidationMessage('❌ Please upload ABI file in JSON format')
			return
		}

		setIsLoading(true)
		setValidationMessage('🔄 Uploading and processing file...')
		
		try {
			const content = await file.text()
			const abiData = JSON.parse(content)
			
			if (Array.isArray(abiData) && abiData.length > 0) {
				setAbiContent(content)
				setAbiPath(file.name)
				
				// 从ABI中提取所有事件名称
				const extractedEvents = abiData
					.filter((item: any) => item.type === 'event')
					.map((item: any) => item.name)
					.filter((name: string) => name)
				
				setDynamicEvents(extractedEvents)
				setValidationMessage('🎉 File processed successfully! Please select events to monitor')
				
				setTimeout(() => {
					setValidationMessage('')
				}, 5000)
			} else {
				setValidationMessage('❌ Invalid ABI file format')
			}
		} catch (error) {
			console.error('File processing error:', error)
			setValidationMessage('❌ Failed to process ABI file')
		} finally {
			setIsLoading(false)
		}
	}

	// 处理事件选择
	const handleEventToggle = (eventName: string) => {
		setSelectedEvents(prev => {
			if (prev.includes(eventName)) {
				return prev.filter(e => e !== eventName)
			} else {
				return [...prev, eventName]
			}
		})
	}

	// 添加自定义事件
	const handleAddCustomEvent = () => {
		const customEvent = prompt('Please enter custom event name:')
		if (customEvent && customEvent.trim() && !selectedEvents.includes(customEvent.trim())) {
			setSelectedEvents(prev => [...prev, customEvent.trim()])
		}
	}

	// 验证数据计划
	const validateDataPlan = () => {
		if (!contractAddress.trim()) {
			setValidationMessage('❌ Please enter contract address')
			return false
		}
		
		if (!validateContractAddress(contractAddress)) {
			setValidationMessage('❌ Invalid contract address format')
			return false
		}
		
		if (!selectedAbi && !abiPath.trim()) {
			setValidationMessage('❌ Please select an ABI or upload ABI file')
			return false
		}
		
		if (selectedEvents.length === 0) {
			setValidationMessage('❌ Please select at least one event to monitor')
			return false
		}
		
		return true
	}

	// 解析 ABI 事件参数 - 为每个事件单独解析
	const parseEventParams = (abiContent: string, selectedEvents: string[]) => {
		try {
			const abiData = JSON.parse(abiContent)
			const allParams = new Set<string>()
			const eventParamsMap: Record<string, string[]> = {}
			
			// 添加基础字段
			const baseFields = [
				"event_name",
				"contract_address",
				"transaction_hash",
				"block_number",
				"log_index",
				"timestamp",
				"chain",
				"chain_id"
			]
			baseFields.forEach(field => allParams.add(field))
			
			// 解析选中事件的参数
			selectedEvents.forEach(eventName => {
				const eventAbi = abiData.find((item: any) => 
					item.type === 'event' && item.name === eventName
				)
				
				if (eventAbi && eventAbi.inputs) {
					const eventParams: string[] = []
					eventAbi.inputs.forEach((input: any) => {
						if (input.name) {
							// 将参数添加到 args 对象中
							const paramName = `args.${input.name}`
							allParams.add(paramName)
							eventParams.push(paramName)
						}
					})
					// 为每个事件单独存储参数
					eventParamsMap[eventName] = eventParams
					console.log(`事件 ${eventName} 的参数:`, eventParams)
				}
			})
			
			// 将事件参数映射存储到全局状态（可以在 Step2 中使用）
			if (Object.keys(eventParamsMap).length > 0) {
				// 这里可以扩展 setEventParams 来支持事件级别的参数存储
				console.log('所有事件参数映射:', eventParamsMap);
				// 临时存储到 window 对象，供 Step2 使用
				(window as any).eventParamsMap = eventParamsMap;
			}
			
			return Array.from(allParams)
		} catch (error) {
			console.error('解析事件参数失败:', error)
			return [
				"event_name",
				"contract_address",
				"transaction_hash", 
				"block_number",
				"log_index",
				"timestamp",
				"chain"
			]
		}
	}

	// 保存数据计划
	const handleSaveDataPlan = async (event?: React.MouseEvent) => {
		if (!validateDataPlan()) {
			// 如果验证失败且是从Link点击触发的，阻止跳转
			if (event) {
				event.preventDefault()
			}
			return
		}
		
		setIsLoading(true)
		try {
			
			// 组装 EventMonitor 数据
			const eventMonitorComponent: EventMonitor = {
				name: "step1",
				type: "event_monitor",
				chain_name: selectedAbi?.chain_name || "ethereum", // 使用选择的ABI的chain_name
				contract_address: contractAddress.trim(),
				abi_path: abiPath.trim(),
				events_to_monitor: selectedEvents,
				selectedAbi: selectedAbi // 添加selectedAbi字段供Step2使用
			}
			
			// 根据 name 更新或添加 EventMonitor 到全局 components
			updateComponent("step1", eventMonitorComponent)
			
			// 解析事件参数并存储到全局状态
			if (abiContent && selectedEvents.length > 0) {
				const parsedEventParams = parseEventParams(abiContent, selectedEvents)
				setEventParams("step1", parsedEventParams)
				
				// 调试信息：显示解析的参数
				console.log('解析的事件参数:', parsedEventParams)
			}
			
			// 检查是否是更新还是新增
			const existingComponent = components.find(c => c.name === "step1")
			const action = existingComponent ? "updated" : "added"
			
			setValidationMessage(`✅ Data plan saved successfully, ${action} to component list`)
			
			// 调试信息：显示当前 components 状态
			console.log('当前 components 列表:', components)
			console.log(`${action}的 EventMonitor:`, eventMonitorComponent)
			
			// 延迟跳转到下一步
			setTimeout(() => {
				// 这里可以添加跳转逻辑
			}, 1500)
		} catch (error) {
			setValidationMessage('❌ Save failed, please try again')
			// 如果保存失败且是从Link点击触发的，阻止跳转
			if (event) {
				event.preventDefault()
			}
		} finally {
			setIsLoading(false)
		}
	}



	// 清空表单
	const handleClearForm = () => {
		setContractAddress('')
		setAbiPath('')
		setSelectedEvents([])
		setSelectedAbi(null)
		setAbiSearchTerm('')
		setIsAbiDropdownOpen(false)
		setAbiContent('')
		setUploadedFilePath('')
		setDynamicEvents([])
		setValidationMessage('')
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Step 1: Define Data Plan</h2>
				<div className="text-sm text-gray-600">
					Step 1: Data Plan Configuration
				</div>
			</div>

			{/* 合约地址配置 */}
			<Box title="Contract Configuration" right={
				<button 
					className="btn btn-secondary" 
					onClick={handleClearForm}
					disabled={isLoading}
				>
					Clear
				</button>
			}>
				<div className="space-y-4">
					{/* Smart ABI Selection */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Smart ABI Selection *
						</label>
						<div className="relative" ref={dropdownRef}>
							<input 
								type="text" 
								className="input w-full pr-10" 
								placeholder="Search contracts by name or address..."
								value={abiSearchTerm}
								onChange={(e) => {
									setAbiSearchTerm(e.target.value)
									setIsAbiDropdownOpen(true)
								}}
								onFocus={() => setIsAbiDropdownOpen(true)}
							/>
							<button
								className="absolute inset-y-0 right-0 px-3 flex items-center"
								onClick={() => setIsAbiDropdownOpen(!isAbiDropdownOpen)}
							>
								<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isAbiDropdownOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
								</svg>
							</button>
							
							{isAbiDropdownOpen && (
								<div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
									{filteredAbiOptions.length > 0 ? (
										filteredAbiOptions.map((abi) => (
											<div
												key={abi.id}
												className="px-4 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
												onClick={() => handleAbiSelect(abi)}
											>
												<div className="font-medium text-gray-900 truncate">
													{abi.contract_name || 'Unnamed Contract'}
												</div>
												<div className="text-sm text-gray-500 truncate">
													{abi.contract_address}
												</div>
											</div>
										))
									) : (
										<div className="px-4 py-2 text-gray-500 text-center">
											{abiSearchTerm ? 'No matching contracts found' : 'Loading...'}
										</div>
									)}
								</div>
							)}
						</div>
						
						<div className="mt-1 text-xs text-gray-500 flex items-center justify-between">
							<span>Select from {abiOptions.length} available smart contracts</span>
							<button 
								className="text-blue-600 hover:text-blue-800 underline"
								onClick={() => fileInputRef.current?.click()}
							>
								Upload new ABI
							</button>
						</div>
						
						{/* 隐藏的文件上传（备用功能）*/}
						<input 
							ref={fileInputRef}
							type="file" 
							accept=".json"
							onChange={handleAbiFileUpload}
							className="hidden"
						/>
						
						{selectedAbi && (
							<div className="mt-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm">
								<div className="flex items-start gap-2">
									<div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
										<svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
										</svg>
									</div>
									<div className="flex-1 min-w-0">
										<div className="text-sm font-medium text-blue-800 mb-1">
											✅ Smart Contract Selected
										</div>
										<div className="text-xs text-blue-700 space-y-1">
											<div>
												<span className="font-medium">Contract Name:</span>
												<span className="ml-1">{selectedAbi.contract_name || 'Unnamed Contract'}</span>
											</div>
											<div>
												<span className="font-medium">Contract Address:</span>
												<span className="font-mono break-all bg-white px-2 py-1 rounded border ml-1">{selectedAbi.contract_address}</span>
											</div>
											<div>
												<span className="font-medium">Available Events:</span>
												<span className="ml-1">{dynamicEvents.length} events found</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Blockchain Selection */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Blockchain *
						</label>
						<select 
							className="input w-full"
							value={selectedBlockchain}
							onChange={(e) => setSelectedBlockchain(e.target.value)}
						>
							<option value="ethereum">Ethereum</option>
							<option value="polygon">Polygon</option>
							<option value="bsc">BSC</option>
							<option value="arbitrum">Arbitrum</option>
							<option value="optimism">Optimism</option>
							<option value="avalanche">Avalanche</option>
							<option value="fantom">Fantom</option>
						</select>
					</div>

					{/* Contract Address */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Contract Address *
						</label>
						<input 
							type="text" 
							className="input w-full" 
							placeholder="Enter contract address (0x...)"
							value={contractAddress}
							onChange={(e) => setContractAddress(e.target.value)}
						/>
						<div className="mt-1 text-xs text-gray-500">
							Enter the smart contract address you want to monitor
						</div>
					</div>
				</div>
			</Box>

			{/* 事件监控配置 */}
			<Box title="Events to Monitor" right={
				<div className="flex gap-2">
					<button 
						className="btn btn-secondary"
						onClick={handleAddCustomEvent}
					>
						Add Custom
					</button>
					{dynamicEvents.length > 0 && (
						<span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
							{dynamicEvents.length} events parsed from ABI
						</span>
					)}
				</div>
			}>
				<div className="space-y-3">
					<div className="text-sm text-gray-600 mb-3">
						Select smart contract events to monitor (at least one required)
					</div>
					
					{/* 默认事件 */}
					{defaultEvents.length > 0 && (
						<div className="mb-4">
							<div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
								<span>📋 Common Events</span>
								<span className="text-xs text-gray-500">({defaultEvents.length} events)</span>
							</div>
							<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
								{defaultEvents.map(eventName => (
									<label key={eventName} className="flex items-center space-x-2 cursor-pointer">
										<input 
											type="checkbox" 
											checked={selectedEvents.includes(eventName)}
											onChange={() => handleEventToggle(eventName)}
											className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded"
										/>
										<span className="text-sm text-gray-700">{eventName}</span>
									</label>
								))}
							</div>
						</div>
					)}
					
					{/* 从ABI解析的事件 */}
					{dynamicEvents.length > 0 && (
						<div className="mb-4">
							<div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
								<span>🔍 ABI Parsed Events</span>
								<span className="text-xs text-gray-500">({dynamicEvents.length} events)</span>
							</div>
							<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
								{dynamicEvents.map(eventName => (
									<label key={`abi-${eventName}`} className="flex items-center space-x-2 cursor-pointer">
										<input 
											type="checkbox" 
											checked={selectedEvents.includes(eventName)}
											onChange={() => handleEventToggle(eventName)}
											className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
										/>
										<span className="text-sm text-gray-700 font-medium">{eventName}</span>
									</label>
								))}
							</div>
						</div>
					)}
					
					{selectedEvents.length > 0 && (
						<div className="mt-3 p-3 bg-blue-50 rounded-lg">
							<div className="text-sm font-medium text-blue-700 mb-2">
								Selected {selectedEvents.length} events:
							</div>
							<div className="flex flex-wrap gap-2">
								{selectedEvents.map(eventName => (
									<span 
										key={eventName}
										className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
									>
										{eventName}
									</span>
								))}
							</div>
						</div>
					)}
				</div>
			</Box>

			{/* 验证消息 */}
			{validationMessage && (
				<div className={`p-4 rounded-lg ${
					validationMessage.includes('✅') ? 'bg-green-50 text-green-700' : 
					validationMessage.includes('❌') ? 'bg-red-50 text-red-700' :
					'bg-blue-50 text-blue-700'
				}`}>
					{validationMessage}
				</div>
			)}

			{/* 操作按钮 */}
			<div className="flex gap-3">
				<button 
					className="btn" 
					onClick={handleSaveDataPlan}
					disabled={isLoading}
				>
					{isLoading ? 'Saving...' : 'Save Data Plan'}
				</button>
				<button 
					className="btn btn-secondary"
					onClick={async () => {
						await handleSaveDataPlan()
						if (onStepChange) {
							onStepChange(2)
						}
					}}
				>
					Continue to Step 2
				</button>
			</div>


			{/* 数据预览 - 从 components 中获取数据 */}
			{(() => {
				const eventMonitorComponent = components.find((c: any) => c.type === 'event_monitor')
				return eventMonitorComponent && (
					<Box title="Current Data Plan" right={
						<span className="text-xs text-gray-500 bg-green-100 px-2 py-1 rounded">
							Loaded from pipeline {currentPipelineId}
						</span>
					}>
						<div className="space-y-2">
							{/* 组件名称 */}
							<div className="flex items-center justify-between py-1 border-b border-gray-100">
								<span className="text-sm font-medium text-gray-700">Component Name</span>
																			<span className="text-sm text-gray-900 font-medium">
												{eventMonitorComponent.name || '-'}
											</span>
							</div>

							{/* 组件类型 */}
							<div className="flex items-center justify-between py-1 border-b border-gray-100">
								<span className="text-sm font-medium text-gray-700">Component Type</span>
																			<span className="text-sm text-gray-900 px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
												{eventMonitorComponent.type || '-'}
											</span>
							</div>

							{/* 链名称 */}
							<div className="flex items-center justify-between py-1 border-b border-gray-100">
								<span className="text-sm font-medium text-gray-700">Chain Name</span>
																			<span className="text-sm text-gray-900 px-2 py-1 bg-green-100 text-green-800 rounded-full">
												{eventMonitorComponent.chain_name || '-'}
											</span>
							</div>

							{/* 合约地址 */}
							<div className="flex items-start justify-between py-1 border-b border-gray-100">
								<span className="text-sm font-medium text-gray-700">Contract Address</span>
																			<span className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded max-w-xs break-all text-right">
												{eventMonitorComponent.contract_address || '-'}
											</span>
							</div>

							{/* ABI 路径 */}
							<div className="flex items-start justify-between py-1 border-b border-gray-100">
								<span className="text-sm font-medium text-gray-700">ABI Path</span>
																			<span className="text-sm text-gray-900 bg-gray-50 px-2 py-1 rounded max-w-xs break-all text-right">
												{eventMonitorComponent.abi_path || '-'}
											</span>
							</div>

							{/* 监控事件 */}
							<div className="py-1">
								<div className="text-sm font-medium text-gray-700 mb-2">Events to Monitor</div>
								<div className="flex flex-wrap gap-2">
																			{eventMonitorComponent.events_to_monitor && eventMonitorComponent.events_to_monitor.length > 0 ? (
											eventMonitorComponent.events_to_monitor.map((event: any, index: number) => (
											<span
												key={index}
												className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full font-medium"
											>
												{event}
											</span>
										))
									) : (
										<span className="text-gray-500 text-sm italic">No events selected</span>
									)}
								</div>
							</div>
						</div>
					</Box>
				)
			})()}

			{/* 事件参数预览 */}
			{selectedEvents.length > 0 && (
				<Box title="Event Parameters" right={
					<span className="text-xs text-gray-500 bg-purple-100 px-2 py-1 rounded">
						Parameters for {selectedEvents.length} events
					</span>
				}>
					<div className="space-y-4">
						<div className="text-sm text-gray-600 mb-3">
							Field parameters for all selected events (including common fields and event-specific parameters):
						</div>

						{/* 公共字段 */}
						<div className="mb-4">
							<div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
								<span>🔗 Common Fields</span>
								<span className="text-xs text-gray-500">(shared by all events)</span>
							</div>
							<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
								{[
									"event_name",
									"contract_address",
									"transaction_hash",
									"block_number",
									"log_index",
									"timestamp",
									"chain",
									"chain_id"
								].map((field, index) => (
									<div
										key={`common-${index}`}
										className="px-3 py-2 rounded-lg text-sm font-mono bg-green-50 text-green-800 border border-green-200"
									>
										{field}
									</div>
								))}
							</div>
						</div>

						{/* 每个事件的特定参数 */}
						{selectedEvents.map((eventName, eventIndex) => {
							const eventParamsMap = (window as any).eventParamsMap || {}
							const eventSpecificParams = eventParamsMap[eventName] || []
							
							return (
								<div key={`event-${eventIndex}`} className="mb-4">
									<div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
										<span>📋 {eventName} Event Parameters</span>
										<span className="text-xs text-gray-500">({eventSpecificParams.length} parameters)</span>
									</div>
									{eventSpecificParams.length > 0 ? (
										<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
											{eventSpecificParams.map((param: string, paramIndex: number) => (
												<div
													key={`${eventName}-${paramIndex}`}
													className="px-3 py-2 rounded-lg text-sm font-mono bg-blue-50 text-blue-800 border border-blue-200"
												>
													{param}
												</div>
											))}
										</div>
									) : (
										<div className="text-sm text-gray-500 italic">
											No parameters available (please ensure correct ABI file is uploaded)
										</div>
									)}
								</div>
							)
						})}

						<div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
							<div className="text-xs text-yellow-800">
								<strong>Note:</strong> 
								<span className="text-green-800">Green</span> indicates common fields (shared by all events),
								<span className="text-blue-800">Blue</span> indicates event-specific parameters (args.*)
							</div>
						</div>
					</div>
				</Box>
			)}
		</div>
	)
}


