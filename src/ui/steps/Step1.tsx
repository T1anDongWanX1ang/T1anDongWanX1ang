import Box from '../components/Box'
import { Link } from 'react-router-dom'
import { useAppState } from '../../state/AppState'
import { useState, useRef } from 'react'

export default function Step1() {
	const { currentProtocolId, protocols, updateProtocolDataPlan } = useAppState()
	const [isLoading, setIsLoading] = useState(false)
	const [validationMessage, setValidationMessage] = useState('')
	const [contractAddress, setContractAddress] = useState('')
	const [abiPath, setAbiPath] = useState('')
	const [selectedEvents, setSelectedEvents] = useState<string[]>([])
	const [abiFile, setAbiFile] = useState<File | null>(null)
	const [abiContent, setAbiContent] = useState('')
	const fileInputRef = useRef<HTMLInputElement>(null)
	
	const currentProtocol = protocols.find(p => p.id === currentProtocolId)
	
	// 初始化表单数据
	useState(() => {
		if (currentProtocol) {
			setContractAddress(currentProtocol.dataPlan.contractAddress || '')
			setAbiPath(currentProtocol.dataPlan.abiPath || '')
			setSelectedEvents(currentProtocol.dataPlan.events || [])
		}
	})

	// 常用事件列表
	const commonEvents = [
		'Transfer', 'Approval', 'ApprovalForAll', 'Mint', 'Burn', 'Swap', 'AddLiquidity', 
		'RemoveLiquidity', 'Deposit', 'Withdraw', 'Claim', 'Stake', 'Unstake', 'Reward'
	]

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
		try {
			const content = await file.text()
			const abiData = JSON.parse(content)
			
			// 验证ABI格式
			if (Array.isArray(abiData) && abiData.length > 0) {
				setAbiFile(file)
				setAbiContent(content)
				setAbiPath(file.name)
				setValidationMessage('✅ ABI文件上传成功')
				
				// 自动提取事件名称
				const events = abiData
					.filter((item: any) => item.type === 'event')
					.map((item: any) => item.name)
				setSelectedEvents(events)
			} else {
				setValidationMessage('❌ 无效的ABI文件格式')
			}
		} catch (error) {
			setValidationMessage('❌ ABI文件解析失败')
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

	// 保存数据计划
	const handleSaveDataPlan = async () => {
		if (!validateDataPlan() || !currentProtocolId) return
		
		setIsLoading(true)
		try {
			// 更新协议的数据计划
			updateProtocolDataPlan(currentProtocolId, {
				contractAddress: contractAddress.trim(),
				abiPath: abiPath.trim(),
				events: selectedEvents,
				abiContent: abiContent // 保存ABI内容用于后续处理
			})
			
			setValidationMessage('✅ 数据计划保存成功')
			
			// 延迟跳转到下一步
			setTimeout(() => {
				// 这里可以添加跳转逻辑
			}, 1500)
		} catch (error) {
			setValidationMessage('❌ 保存失败，请重试')
		} finally {
			setIsLoading(false)
		}
	}

	// 测试合约连接
	const handleTestConnection = async () => {
		if (!validateDataPlan()) return
		
		setIsLoading(true)
		setValidationMessage('🔄 正在测试合约连接...')
		
		try {
			// 模拟合约连接测试
			await new Promise(resolve => setTimeout(resolve, 2000))
			
			// 这里应该调用实际的区块链API来验证合约
			const isValid = Math.random() > 0.3 // 模拟测试结果
			
			if (isValid) {
				setValidationMessage('✅ 合约连接测试成功')
			} else {
				setValidationMessage('❌ 合约连接失败，请检查地址和网络')
			}
		} catch (error) {
			setValidationMessage('❌ 连接测试异常')
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
		setValidationMessage('')
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Step 1: Define Data Plan</h2>
				{currentProtocol && (
					<div className="text-sm text-gray-600">
						Protocol: {currentProtocol.name} ({currentProtocol.chain} • {currentProtocol.type})
					</div>
				)}
			</div>

			{/* 合约地址配置 */}
			<Box title="Contract Configuration" right={
				<div className="flex gap-2">
					<button 
						className="btn btn-secondary" 
						onClick={handleTestConnection}
						disabled={isLoading || !contractAddress.trim()}
					>
						{isLoading ? '测试中...' : 'Test Connection'}
					</button>
					<button 
						className="btn btn-secondary" 
						onClick={handleClearForm}
						disabled={isLoading}
					>
						Clear
					</button>
				</div>
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
					</div>
				</div>
			</Box>

			{/* 事件监控配置 */}
			<Box title="Events to Monitor" right={
				<button 
					className="btn btn-secondary"
					onClick={handleAddCustomEvent}
				>
					Add Custom
				</button>
			}>
				<div className="space-y-3">
					<div className="text-sm text-gray-600 mb-3">
						选择要监控的智能合约事件（至少选择一个）
					</div>
					
					<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
						{commonEvents.map(eventName => (
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
					disabled={isLoading || !currentProtocolId}
				>
					{isLoading ? '保存中...' : 'Save Data Plan'}
				</button>
				<Link to="/step-2" className="btn btn-secondary">
					Continue to Step 2
				</Link>
			</div>

			{/* 数据预览 */}
			{currentProtocol && (
				<Box title="Current Data Plan">
					<div className="space-y-2 text-sm">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<span className="font-medium text-gray-700">Contract:</span>
								<span className="ml-2 font-mono text-gray-600">
									{currentProtocol.dataPlan.contractAddress || 'Not set'}
								</span>
							</div>
							<div>
								<span className="font-medium text-gray-700">ABI Path:</span>
								<span className="ml-2 text-gray-600">
									{currentProtocol.dataPlan.abiPath || 'Not set'}
								</span>
							</div>
						</div>
						<div>
							<span className="font-medium text-gray-700">Events:</span>
							<span className="ml-2 text-gray-600">
								{currentProtocol.dataPlan.events.length > 0 
									? currentProtocol.dataPlan.events.join(', ')
									: 'None selected'
								}
							</span>
						</div>
					</div>
				</Box>
			)}
		</div>
	)
}


