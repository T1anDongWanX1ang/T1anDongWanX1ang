import React, { useState, useEffect } from 'react'
import { useAppState, ContractMethod as AppStateContractMethod } from '../../state/AppState'
import Box from '../components/Box'
import { contractMethodsAPI, ContractMethodQueryResult } from '../../services/api'

interface Step2Props {
	onStepChange?: (step: number) => void
}

interface ContractMethod {
	name: string
	type: 'function' | 'event' | 'constructor' | 'error' | 'fallback' | 'receive'
	inputs: Array<{
		name: string
		type: string
		indexed?: boolean | null
		internal_type?: string | null
	}>
	outputs?: Array<{
		name: string
		type: string
		indexed?: boolean | null
		internal_type?: string | null
	}> | null
	state_mutability?: string | null
	signature?: string | null
	selector?: string | null
	anonymous?: boolean | null
}


export default function Step2MethodQuery({ onStepChange }: Step2Props = {}) {
	const { components, updateComponent, currentPipelineId } = useAppState()
	const [isLoading, setIsLoading] = useState(false)
	const [eventName, setEventName] = useState('')
	const [methodTypes, setMethodTypes] = useState<string[]>(['function', 'event'])
	const [queryResult, setQueryResult] = useState<ContractMethodQueryResult | null>(null)
	const [selectedMethods, setSelectedMethods] = useState<AppStateContractMethod[]>([])
	const [validationMessage, setValidationMessage] = useState('')
	const [selectedContract, setSelectedContract] = useState<{
		address: string
		chainName: string
		name?: string
	} | null>(null)

	// 从Step1获取选择的ABI信息
	useEffect(() => {
		const abiComponent = components.find(c => c.type === 'abi_selection')
		if (abiComponent) {
			setSelectedContract({
				address: abiComponent.contract_address,
				chainName: abiComponent.chain_name,
				name: abiComponent.contract_name
			})
		}
	}, [components])

	// 执行方法查询
	const handleMethodQuery = async () => {
		if (!selectedContract) {
			setValidationMessage('❌ 请先在Step1选择合约ABI')
			return
		}

		if (!eventName.trim() && methodTypes.length === 0) {
			setValidationMessage('❌ Please enter event name or select method type')
			return
		}

		setIsLoading(true)
		setValidationMessage('')

		try {
			console.log('🔍 查询合约方法:', {
				address: selectedContract.address,
				chainName: selectedContract.chainName,
				eventName: eventName.trim() || undefined,
				methodTypes: methodTypes.length > 0 ? methodTypes.join(',') : undefined
			})

			const result = await contractMethodsAPI.queryContractMethods(
				selectedContract.address,
				selectedContract.chainName,
				eventName.trim() || undefined,
				methodTypes.length > 0 ? methodTypes : undefined
			)

			console.log('✅ 查询结果:', result)
			setQueryResult(result)

			if (result.matched_methods && result.matched_methods.length > 0) {
				setValidationMessage(`✅ 找到 ${result.matched_methods.length} 个匹配的方法`)
			} else if (result.methods && result.methods.length > 0) {
				setValidationMessage(`✅ 找到 ${result.methods.length} 个方法`)
			} else {
				setValidationMessage('⚠️ 没有找到匹配的方法')
			}

		} catch (error) {
			console.error('❌ 查询合约方法失败:', error)
			setValidationMessage(`❌ 查询失败: ${error instanceof Error ? error.message : '未知错误'}`)
		} finally {
			setIsLoading(false)
		}
	}

	// 切换方法选择状态
	const toggleMethodSelection = (method: ContractMethod) => {
		const isSelected = selectedMethods.some(m => m.signature === method.signature)
		if (isSelected) {
			setSelectedMethods(selectedMethods.filter(m => m.signature !== method.signature))
		} else {
			setSelectedMethods([...selectedMethods, method as AppStateContractMethod])
		}
	}

	// 保存选择的方法到全局状态
	const handleSaveSelection = () => {
		if (selectedMethods.length === 0) {
			setValidationMessage('❌ 请至少选择一个方法')
			return
		}

		if (!selectedContract) {
			setValidationMessage('❌ 缺少合约信息')
			return
		}

		const methodQueryComponent = {
			name: "step2",
			type: "method_query",
			contract_address: selectedContract.address,
			chain_name: selectedContract.chainName,
			contract_name: selectedContract.name,
			event_name: eventName.trim() || null,
			selected_methods: selectedMethods,
			query_metadata: queryResult?.query_metadata
		}

		updateComponent("step2", methodQueryComponent)
		setValidationMessage(`✅ 已保存 ${selectedMethods.length} 个选中的方法`)

		setTimeout(() => {
			setValidationMessage('')
		}, 3000)
	}

	// 渲染方法卡片
	const renderMethodCard = (method: any, isMatched = false) => {
		const isSelected = selectedMethods.some(m => m.signature === method.signature)
		return (
			<div
				key={method.signature || method.name}
				className={`p-4 border rounded-lg cursor-pointer transition-colors ${
					isSelected 
						? 'border-blue-500 bg-blue-50' 
						: isMatched
							? 'border-green-400 bg-green-50 hover:bg-green-100'
							: 'border-gray-200 hover:border-gray-300'
				}`}
				onClick={() => toggleMethodSelection(method as AppStateContractMethod)}
			>
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center gap-2">
						<span className={`px-2 py-1 text-xs rounded-full ${
							method.type === 'function' 
								? 'bg-blue-100 text-blue-800' 
								: 'bg-purple-100 text-purple-800'
						}`}>
							{method.type}
						</span>
						{isMatched && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">智能匹配</span>}
						{isSelected && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">已选择</span>}
					</div>
					<div className="text-xs text-gray-500">
						{method.state_mutability && <span className="mr-2">{method.state_mutability}</span>}
						{method.selector && <span className="font-mono">{method.selector}</span>}
					</div>
				</div>

				<div className="font-medium text-gray-900 mb-2">
					{method.name}
				</div>

				{method.signature && (
					<div className="text-sm text-gray-600 font-mono mb-2">
						{method.signature}
					</div>
				)}

				{method.inputs && method.inputs.length > 0 && (
					<div className="mb-2">
						<div className="text-xs text-gray-500 mb-1">输入参数:</div>
						<div className="text-sm space-y-1">
							{method.inputs.map((input, i) => (
								<div key={i} className="flex gap-2">
									<span className="font-mono text-gray-600">{input.type}</span>
									<span className="text-gray-800">{input.name || `param${i}`}</span>
									{input.indexed && <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">indexed</span>}
								</div>
							))}
						</div>
					</div>
				)}

				{method.outputs && method.outputs.length > 0 && (
					<div>
						<div className="text-xs text-gray-500 mb-1">输出参数:</div>
						<div className="text-sm space-y-1">
							{method.outputs.map((output, i) => (
								<div key={i} className="flex gap-2">
									<span className="font-mono text-gray-600">{output.type}</span>
									<span className="text-gray-800">{output.name || `return${i}`}</span>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Step 2: Contract Method Query</h2>
				<div className="text-sm text-gray-600">
					Step 2: 合约方法查询和选择
				</div>
			</div>

			{/* 选择的合约信息 */}
			{selectedContract && (
				<Box title="选择的合约" right={
					<span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
						来自 Step1
					</span>
				}>
					<div className="space-y-2">
						<div className="flex justify-between">
							<span className="text-sm font-medium text-gray-700">合约名称</span>
							<span className="text-sm text-gray-900">{selectedContract.name || '未知'}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm font-medium text-gray-700">合约地址</span>
							<span className="text-sm font-mono text-gray-900">{selectedContract.address}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm font-medium text-gray-700">区块链</span>
							<span className="text-sm text-gray-900">{selectedContract.chainName}</span>
						</div>
					</div>
				</Box>
			)}

			{/* 查询条件 */}
			<Box title="查询条件">
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Event Name (Optional)
						</label>
						<input 
							type="text" 
							className="input w-full" 
							placeholder="例如: Transfer, Approval, Borrow"
							value={eventName}
							onChange={(e) => setEventName(e.target.value)}
						/>
						<div className="mt-1 text-xs text-gray-500">
							Enter event name to intelligently match related methods and functions
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Method Type
						</label>
						<div className="flex gap-3">
							{[
								{ value: 'function', label: 'Function' },
								{ value: 'event', label: 'Event' },
								{ value: 'constructor', label: 'Constructor' },
								{ value: 'error', label: 'Error' }
							].map(type => (
								<label key={type.value} className="flex items-center">
									<input
										type="checkbox"
										checked={methodTypes.includes(type.value)}
										onChange={(e) => {
											if (e.target.checked) {
												setMethodTypes([...methodTypes, type.value])
											} else {
												setMethodTypes(methodTypes.filter(t => t !== type.value))
											}
										}}
										className="mr-2"
									/>
									<span className="text-sm">{type.label}</span>
								</label>
							))}
						</div>
					</div>
				</div>
			</Box>

			{/* 操作按钮 */}
			<div className="flex gap-3">
				<button 
					className="btn" 
					onClick={handleMethodQuery}
					disabled={isLoading || !selectedContract}
				>
					{isLoading ? '查询中...' : '查询方法'}
				</button>
				
				{selectedMethods.length > 0 && (
					<button 
						className="btn btn-secondary"
						onClick={handleSaveSelection}
					>
						保存选择 ({selectedMethods.length})
					</button>
				)}
			</div>

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

			{/* 智能匹配结果 */}
			{queryResult && queryResult.matched_methods && queryResult.matched_methods.length > 0 && (
				<Box title={`智能匹配结果 (${queryResult.matched_methods.length})`} right={
					<span className="text-xs text-green-600">
						基于事件名称匹配
					</span>
				}>
					<div className="grid gap-4">
						{queryResult.matched_methods.map(method => renderMethodCard(method, true))}
					</div>
				</Box>
			)}

			{/* 所有方法列表 */}
			{queryResult && queryResult.methods && queryResult.methods.length > 0 && (
				<Box title={`所有方法 (${queryResult.methods.length})`} right={
					<div className="text-xs text-gray-500">
						Functions: {queryResult.functions?.length || 0} | Events: {queryResult.events?.length || 0}
					</div>
				}>
					<div className="grid gap-4 max-h-96 overflow-y-auto">
						{queryResult.methods.map(method => renderMethodCard(method, false))}
					</div>
				</Box>
			)}

			{/* 选择的方法预览 */}
			{selectedMethods.length > 0 && (
				<Box title={`已选择的方法 (${selectedMethods.length})`}>
					<div className="space-y-2">
						{selectedMethods.map((method, index) => (
							<div key={method.signature || method.name} className="flex items-center justify-between p-2 bg-blue-50 rounded">
								<div>
									<span className="font-medium">{method.name}</span>
									<span className="ml-2 text-sm text-gray-600">({method.type})</span>
								</div>
								<button
									onClick={() => toggleMethodSelection(method as AppStateContractMethod)}
									className="text-sm text-red-600 hover:text-red-800"
								>
									移除
								</button>
							</div>
						))}
					</div>
				</Box>
			)}

			{/* 导航按钮 */}
			<div className="flex gap-3">
				<button 
					className="btn btn-secondary"
					onClick={() => onStepChange?.(1)}
				>
					返回 Step 1
				</button>
				
				{selectedMethods.length > 0 && (
					<button 
						className="btn"
						onClick={() => {
							handleSaveSelection()
							setTimeout(() => onStepChange?.(3), 1000)
						}}
					>
						保存并继续到 Step 3
					</button>
				)}
			</div>
		</div>
	)
}