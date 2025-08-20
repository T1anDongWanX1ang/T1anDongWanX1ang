import Box from '../components/Box'
import { Link } from 'react-router-dom'
import { useAppState, EventMonitor } from '../../state/AppState'
import { useState, useRef, useEffect } from 'react'
import { api } from '../../services/api'

export default function Step1() {
	const { components, updateComponent, setEventParams, eventParams } = useAppState()
	const [isLoading, setIsLoading] = useState(false)
	const [validationMessage, setValidationMessage] = useState('')
	const [contractAddress, setContractAddress] = useState('')
	const [abiPath, setAbiPath] = useState('')
	const [selectedEvents, setSelectedEvents] = useState<string[]>([])
	const [abiFile, setAbiFile] = useState<File | null>(null)
	const [abiContent, setAbiContent] = useState('')
	const [uploadedFilePath, setUploadedFilePath] = useState('')
	const [dynamicEvents, setDynamicEvents] = useState<string[]>([])
	const fileInputRef = useRef<HTMLInputElement>(null)
	

	
	// 从全局 components 中恢复数据
	useEffect(() => {
		const existingComponent = components.find(c => c.name === "step1") as EventMonitor
		if (existingComponent) {
			// 找到了之前保存的数据，重新填充表单
			setContractAddress(existingComponent.contract_address || '')
			setAbiPath(existingComponent.abi_path || '')
			setSelectedEvents(existingComponent.events_to_monitor || [])
			
			// 如果有 ABI 路径，设置上传文件路径
			if (existingComponent.abi_path) {
				setUploadedFilePath(existingComponent.abi_path)
			}
			
			// 设置验证消息提示用户数据已恢复
			const eventCount = existingComponent.events_to_monitor?.length || 0
			setValidationMessage(`🔄 已从之前保存的数据中恢复表单内容 (合约: ${existingComponent.contract_address?.slice(0, 10)}..., 事件: ${eventCount}个)`)
			
			// 调试信息
			console.log('从 components 中恢复数据:', existingComponent)
			
			// 5秒后清除恢复提示信息
			setTimeout(() => {
				setValidationMessage('')
			}, 5000)
		}
	}, [components]) // 依赖 components 变化

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

	// 处理ABI文件上传
	const handleAbiFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return

		if (!file.name.endsWith('.json')) {
			setValidationMessage('❌ 请上传JSON格式的ABI文件')
			return
		}

		setIsLoading(true)
		setValidationMessage('🔄 正在上传文件...')
		
		try {
			// 首先调用上传接口
			const uploadResponse = await api.file.uploadFile(file)
			
			if (uploadResponse && uploadResponse.success) {
				// 上传成功，根据实际返回结构获取文件路径
				const filePath = uploadResponse.file_path || uploadResponse.file_name || file.name
				setUploadedFilePath(filePath)
				setAbiPath(filePath)
				
				// 然后解析ABI内容
				const content = await file.text()
				const abiData = JSON.parse(content)
				
				// 验证ABI格式
				if (Array.isArray(abiData) && abiData.length > 0) {
					setAbiFile(file)
					setAbiContent(content)
					
					// 从ABI中提取所有事件名称
					const extractedEvents = abiData
						.filter((item: any) => item.type === 'event')
						.map((item: any) => item.name)
						.filter((name: string) => name) // 过滤掉空名称
					
					// 更新动态事件列表
					setDynamicEvents(extractedEvents)
					
					// 不自动选择事件，让用户手动选择
					// setSelectedEvents(extractedEvents)
					
					// 显示成功提示
					setValidationMessage('🎉 文件上传成功！ABI解析完成，请选择要监控的事件')
					
					// 弹出成功提示
					alert(`🎉 文件上传成功！\n\n文件名: ${uploadResponse.file_name || file.name}\n文件路径: ${filePath}\n文件大小: ${uploadResponse.file_size ? (uploadResponse.file_size / 1024).toFixed(2) + ' KB' : 'N/A'}\n提取到 ${extractedEvents.length} 个事件: ${extractedEvents.join(', ')}`)
				} else {
					setValidationMessage('❌ 文件上传成功，但ABI文件格式无效')
				}
			} else {
				setValidationMessage(`❌ 文件上传失败: ${uploadResponse?.message || '未知错误'}`)
			}
		} catch (error) {
			console.error('File upload error:', error)
			setValidationMessage('❌ 文件上传失败，请重试')
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
		const customEvent = prompt('请输入自定义事件名称:')
		if (customEvent && customEvent.trim() && !selectedEvents.includes(customEvent.trim())) {
			setSelectedEvents(prev => [...prev, customEvent.trim()])
		}
	}

	// 验证数据计划
	const validateDataPlan = () => {
		if (!contractAddress.trim()) {
			setValidationMessage('❌ 请输入合约地址')
			return false
		}
		
		if (!validateContractAddress(contractAddress)) {
			setValidationMessage('❌ 合约地址格式无效')
			return false
		}
		
		if (!abiPath.trim()) {
			setValidationMessage('❌ 请上传或输入ABI文件路径')
			return false
		}
		
		if (selectedEvents.length === 0) {
			setValidationMessage('❌ 请至少选择一个要监控的事件')
			return false
		}
		
		return true
	}

	// 解析 ABI 事件参数
	const parseEventParams = (abiContent: string, selectedEvents: string[]) => {
		try {
			const abiData = JSON.parse(abiContent)
			const allParams = new Set<string>()
			
			// 添加基础字段
			const baseFields = [
				"event_name",
				"contract_address", 
				"transaction_hash",
				"block_number",
				"log_index",
				"timestamp",
				"chain"
			]
			baseFields.forEach(field => allParams.add(field))
			
			// 解析选中事件的参数
			selectedEvents.forEach(eventName => {
				const eventAbi = abiData.find((item: any) => 
					item.type === 'event' && item.name === eventName
				)
				
				if (eventAbi && eventAbi.inputs) {
					eventAbi.inputs.forEach((input: any) => {
						if (input.name) {
							// 将参数添加到 args 对象中
							allParams.add(`args.${input.name}`)
						}
					})
				}
			})
			
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
				chain_name: "ethereum", // 默认使用 ethereum，可以根据实际需要调整
				contract_address: contractAddress.trim(),
				abi_path: abiPath.trim(),
				events_to_monitor: selectedEvents
			}
			
			// 根据 name 更新或添加 EventMonitor 到全局 components
			updateComponent("step1", eventMonitorComponent)
			
			// 解析事件参数并存储到全局状态
			if (abiContent && selectedEvents.length > 0) {
				const eventParams = parseEventParams(abiContent, selectedEvents)
				setEventParams("step1", eventParams)
				
				// 调试信息：显示解析的参数
				console.log('解析的事件参数:', eventParams)
			}
			
			// 检查是否是更新还是新增
			const existingComponent = components.find(c => c.name === "step1")
			const action = existingComponent ? "更新" : "添加"
			
			setValidationMessage(`✅ 数据计划保存成功，已${action}到组件列表`)
			
			// 调试信息：显示当前 components 状态
			console.log('当前 components 列表:', components)
			console.log(`${action}的 EventMonitor:`, eventMonitorComponent)
			
			// 延迟跳转到下一步
			setTimeout(() => {
				// 这里可以添加跳转逻辑
			}, 1500)
		} catch (error) {
			setValidationMessage('❌ 保存失败，请重试')
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
		setAbiFile(null)
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
					Step 1: 数据计划配置
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
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Contract Address *
						</label>
						<input 
							type="text" 
							className="input w-full" 
							placeholder="0x... (Ethereum) or base58 (Solana)"
							value={contractAddress}
							onChange={(e) => setContractAddress(e.target.value)}
						/>
						<div className="mt-1 text-xs text-gray-500">
							{contractAddress && (
								<span className={validateContractAddress(contractAddress) ? 'text-green-600' : 'text-red-600'}>
									{validateContractAddress(contractAddress) ? '✅ 地址格式正确' : '❌ 地址格式错误'}
								</span>
							)}
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							ABI File *
						</label>
						<div className="flex gap-2">
							<input 
								type="text" 
								className="input flex-1" 
								placeholder="ABI file path or upload file"
								value={abiPath}
								onChange={(e) => setAbiPath(e.target.value)}
							/>
							<button 
								className="btn btn-secondary"
								onClick={() => fileInputRef.current?.click()}
							>
								Upload
							</button>
						</div>
						<input 
							ref={fileInputRef}
							type="file" 
							accept=".json"
							onChange={handleAbiFileUpload}
							className="hidden"
						/>
						<div className="mt-1 text-xs text-gray-500">
							支持JSON格式的ABI文件
						</div>
						{uploadedFilePath && (
							<div className="mt-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg shadow-sm">
								<div className="flex items-start gap-2">
									<div className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
										<svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
										</svg>
									</div>
									<div className="flex-1 min-w-0">
										<div className="text-sm font-medium text-green-800 mb-1">
											🎉 文件上传成功
										</div>
										<div className="text-xs text-green-700 space-y-1">
											<div>
												<span className="font-medium">原文件名：</span>
												<span className="font-mono">{abiFile?.name}</span>
											</div>
											<div>
												<span className="font-medium">服务器路径：</span>
												<span className="font-mono break-all bg-white px-2 py-1 rounded border">{uploadedFilePath}</span>
											</div>
											<div>
												<span className="font-medium">文件大小：</span>
												<span>{abiFile ? (abiFile.size / 1024).toFixed(2) + ' KB' : 'N/A'}</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						)}
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
							从ABI解析到 {dynamicEvents.length} 个事件
						</span>
					)}
				</div>
			}>
				<div className="space-y-3">
					<div className="text-sm text-gray-600 mb-3">
						选择要监控的智能合约事件（至少选择一个）
					</div>
					
					{/* 默认事件 */}
					{defaultEvents.length > 0 && (
						<div className="mb-4">
							<div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
								<span>📋 常用事件</span>
								<span className="text-xs text-gray-500">({defaultEvents.length}个)</span>
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
								<span>🔍 ABI解析事件</span>
								<span className="text-xs text-gray-500">({dynamicEvents.length}个)</span>
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
								已选择 {selectedEvents.length} 个事件:
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
					{isLoading ? '保存中...' : 'Save Data Plan'}
				</button>
				<Link 
					to="/step-2" 
					className="btn btn-secondary"
					onClick={handleSaveDataPlan}
				>
					Continue to Step 2
				</Link>
			</div>


			{/* 数据预览 - 从 components 中获取数据 */}
			{(() => {
				const step1Component = components.find(c => c.name === "step1") as EventMonitor
				return step1Component && (
					<Box title="Current Data Plan" right={
						<span className="text-xs text-gray-500 bg-green-100 px-2 py-1 rounded">
							从 Components 加载
						</span>
					}>
						<div className="space-y-2">
							{/* 组件名称 */}
							<div className="flex items-center justify-between py-1 border-b border-gray-100">
								<span className="text-sm font-medium text-gray-700">Component Name</span>
								<span className="text-sm text-gray-900 font-medium">
									{step1Component.name || '-'}
								</span>
							</div>

							{/* 组件类型 */}
							<div className="flex items-center justify-between py-1 border-b border-gray-100">
								<span className="text-sm font-medium text-gray-700">Component Type</span>
								<span className="text-sm text-gray-900 px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
									{step1Component.type || '-'}
								</span>
							</div>

							{/* 链名称 */}
							<div className="flex items-center justify-between py-1 border-b border-gray-100">
								<span className="text-sm font-medium text-gray-700">Chain Name</span>
								<span className="text-sm text-gray-900 px-2 py-1 bg-green-100 text-green-800 rounded-full">
									{step1Component.chain_name || '-'}
								</span>
							</div>

							{/* 合约地址 */}
							<div className="flex items-start justify-between py-1 border-b border-gray-100">
								<span className="text-sm font-medium text-gray-700">Contract Address</span>
								<span className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded max-w-xs break-all text-right">
									{step1Component.contract_address || '-'}
								</span>
							</div>

							{/* ABI 路径 */}
							<div className="flex items-start justify-between py-1 border-b border-gray-100">
								<span className="text-sm font-medium text-gray-700">ABI Path</span>
								<span className="text-sm text-gray-900 bg-gray-50 px-2 py-1 rounded max-w-xs break-all text-right">
									{step1Component.abi_path || '-'}
								</span>
							</div>

							{/* 监控事件 */}
							<div className="py-1">
								<div className="text-sm font-medium text-gray-700 mb-2">Events to Monitor</div>
								<div className="flex flex-wrap gap-2">
									{step1Component.events_to_monitor && step1Component.events_to_monitor.length > 0 ? (
										step1Component.events_to_monitor.map((event, index) => (
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
			{eventParams.step1 && eventParams.step1.length > 0 && (
				<Box title="Event Parameters" right={
					<span className="text-xs text-gray-500 bg-purple-100 px-2 py-1 rounded">
						解析的参数 ({eventParams.step1.length}个)
					</span>
				}>
					<div className="space-y-2">
						<div className="text-sm text-gray-600 mb-3">
							根据选中事件解析出的所有参数字段：
						</div>
						<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
							{eventParams.step1.map((param, index) => (
								<div
									key={index}
									className={`px-3 py-2 rounded-lg text-sm font-mono ${
										param.startsWith('args.') 
											? 'bg-blue-50 text-blue-800 border border-blue-200' 
											: 'bg-gray-50 text-gray-800 border border-gray-200'
									}`}
								>
									{param}
								</div>
							))}
						</div>
						<div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
							<div className="text-xs text-yellow-800">
								<strong>说明：</strong> 
								<span className="text-blue-800">蓝色</span> 表示事件参数 (args.*)，
								<span className="text-gray-800">灰色</span> 表示基础字段
							</div>
						</div>
					</div>
				</Box>
			)}
		</div>
	)
}


