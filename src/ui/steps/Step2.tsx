import Box from '../components/Box'
import { Link } from 'react-router-dom'
import { useAppState } from '../../state/AppState'
import { useState, useRef } from 'react'
import { fieldParsingAPI, FieldParsingRequest, TemplateUploadRequest } from '../../services/api'
import ApiTestPanel from '../components/ApiTestPanel'
import { debugAPI } from '../../utils/debug'

export default function Step2() {
	const { currentProtocolId, protocols, updateMappingRule, addMappingRule, removeMappingRule, reorderMappingRules } = useAppState()
	const [dragId, setDragId] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [uploadMessage, setUploadMessage] = useState('')
	const [parsingMessage, setParsingMessage] = useState('')
	const [saveMessage, setSaveMessage] = useState('')
	const [showApiTest, setShowApiTest] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)
	
	const currentProtocol = protocols.find(p => p.id === currentProtocolId)
	const mappingRules = currentProtocol?.mappingRules || []

	// 处理文件上传
	const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file || !currentProtocol) return

		setIsLoading(true)
		setUploadMessage('')

		try {
			const request: TemplateUploadRequest = {
				file,
				chain_name: currentProtocol.chain.toLowerCase(),
				protocol_type: currentProtocol.type.toLowerCase()
			}

			const response = await fieldParsingAPI.uploadTemplate(request)
			
			if (response.success && response.data.parsed_fields) {
				// 将解析的字段添加到映射规则中
				response.data.parsed_fields.forEach(field => {
					addMappingRule(currentProtocol.id, {
						sourceKey: field.source_key,
						targetKey: field.target_key,
						transformer: field.transformer
					})
				})
				setUploadMessage(`✅ 成功解析 ${response.data.parsed_fields.length} 个字段`)
			} else {
				setUploadMessage(`❌ 解析失败: ${response.data.message}`)
			}
		} catch (error) {
			console.error('Template upload failed:', error)
			let errorMessage = '❌ 上传失败'
			
			if (error instanceof Error) {
				if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
					errorMessage += '，无法连接到后端服务，请检查：\n1. 后端服务是否启动 (http://192.168.50.94:8001)\n2. 网络连接是否正常\n3. 防火墙设置'
				} else if (error.message.includes('timeout')) {
					errorMessage += '，请求超时，请稍后重试'
				} else if (error.message.includes('400')) {
					errorMessage += '，请求参数错误，请检查文件格式'
				} else if (error.message.includes('500')) {
					errorMessage += '，服务器内部错误，请联系管理员'
				} else {
					errorMessage += `，错误详情: ${error.message}`
				}
			} else {
				errorMessage += '，未知错误'
			}
			
			setUploadMessage(errorMessage)
		} finally {
			setIsLoading(false)
		}
	}

	// 处理AI字段解析
	const handleAIParsing = async () => {
		if (!currentProtocol) return

		setIsLoading(true)
		setParsingMessage('')

		try {
			const request: FieldParsingRequest = {
				chain_name: currentProtocol.chain.toLowerCase(),
				contract_address: currentProtocol.dataPlan.contractAddress || '0x0000000000000000000000000000000000000000',
				abi_path: currentProtocol.dataPlan.abiPath || '/abis/default.json',
				events_to_monitor: currentProtocol.dataPlan.events.length > 0 ? currentProtocol.dataPlan.events : ['Transfer'],
				mode: 'realtime',
				poll_interval: 1.0
			}

			const response = await fieldParsingAPI.parseFields(request)
			
			if (response.success && response.data.fields) {
				// 清空现有规则并添加AI解析的字段
				response.data.fields.forEach(field => {
					addMappingRule(currentProtocol.id, {
						sourceKey: field.source_key,
						targetKey: field.target_key,
						transformer: field.transformer
					})
				})
				setParsingMessage(`✅ AI成功解析 ${response.data.fields.length} 个字段`)
			} else {
				setParsingMessage(`❌ AI解析失败: ${response.data.message}`)
			}
		} catch (error) {
			console.error('AI parsing failed:', error)
			setParsingMessage('❌ AI解析失败，请检查网络连接')
		} finally {
			setIsLoading(false)
		}
	}

	// 获取字段建议
	const handleGetSuggestions = async () => {
		if (!currentProtocol) return

		setIsLoading(true)
		setParsingMessage('')

		try {
			const response = await fieldParsingAPI.getFieldSuggestions(
				currentProtocol.chain.toLowerCase(),
				currentProtocol.type.toLowerCase()
			)
			
			if (response.success && response.data.fields) {
				// 添加建议的字段到现有规则中
				response.data.fields.forEach(field => {
					addMappingRule(currentProtocol.id, {
						sourceKey: field.source_key,
						targetKey: field.target_key,
						transformer: field.transformer
					})
				})
				setParsingMessage(`✅ 获取到 ${response.data.fields.length} 个字段建议`)
			} else {
				setParsingMessage(`❌ 获取建议失败: ${response.data.message}`)
			}
		} catch (error) {
			console.error('Get suggestions failed:', error)
			setParsingMessage('❌ 获取建议失败，请检查网络连接')
		} finally {
			setIsLoading(false)
		}
	}

	// 测试后端连接
	const testBackendConnection = async () => {
		setIsLoading(true)
		setUploadMessage('🔄 正在执行完整的后端连接诊断...')

		try {
			// 1. 基本连接测试
			const connectionTest = await debugAPI.testConnection()
			console.log('连接测试结果:', connectionTest)
			
			// 2. 上传端点测试
			const uploadTest = await debugAPI.testUploadEndpoint()
			console.log('上传端点测试结果:', uploadTest)
			
			// 3. CORS测试
			const corsTest = await debugAPI.testCORS()
			console.log('CORS测试结果:', corsTest)
			
			// 生成详细报告
			let message = ''
			if (connectionTest.success && uploadTest.success) {
				message = '✅ 后端连接完全正常，可以进行文件上传'
			} else if (connectionTest.success) {
				message = `⚠️ 后端服务可用，但上传端点有问题: ${uploadTest.message}`
			} else {
				message = `❌ 后端连接失败: ${connectionTest.message}`
			}
			
			// 添加详细信息
			if (connectionTest.details?.availablePaths) {
				message += `\n\n可用API端点: ${connectionTest.details.availablePaths.slice(0, 5).join(', ')}`
				if (connectionTest.details.availablePaths.length > 5) {
					message += '...'
				}
			}
			
			if (!uploadTest.success && uploadTest.details) {
				message += `\n\n上传测试详情: HTTP ${uploadTest.details.status} - ${uploadTest.details.statusText}`
			}
			
			setUploadMessage(message)
		} catch (error) {
			console.error('Backend connection test failed:', error)
			setUploadMessage(`❌ 连接测试异常: ${error instanceof Error ? error.message : '未知错误'}`)
		} finally {
			setIsLoading(false)
		}
	}

	// 验证映射规则
	const validateMappingRules = () => {
		if (mappingRules.length === 0) {
			setSaveMessage('❌ 请至少添加一个字段映射规则')
			return false
		}

		for (const rule of mappingRules) {
			if (!rule.sourceKey.trim()) {
				setSaveMessage('❌ 源字段名称不能为空')
				return false
			}
			if (!rule.targetKey.trim()) {
				setSaveMessage('❌ 目标字段名称不能为空')
				return false
			}
		}

		return true
	}

	// 保存映射规则到后端
	const handleSaveToBackend = async () => {
		if (!validateMappingRules() || !currentProtocol) return

		setIsSaving(true)
		setSaveMessage('')

		try {
			// 准备保存的数据
			const saveData = {
				protocol_id: currentProtocol.id,
				chain_name: currentProtocol.chain.toLowerCase(),
				protocol_type: currentProtocol.type.toLowerCase(),
				contract_address: currentProtocol.dataPlan.contractAddress,
				abi_path: currentProtocol.dataPlan.abiPath,
				events_to_monitor: currentProtocol.dataPlan.events,
				mapping_rules: mappingRules.map(rule => ({
					source_key: rule.sourceKey,
					target_key: rule.targetKey,
					transformer: rule.transformer
				})),
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}

			// 调用后端API保存映射规则
			const response = await fieldParsingAPI.saveMappingRules(saveData)
			
			if (response.success) {
				setSaveMessage('✅ 字段映射规则已成功保存到后端')
				
				// 延迟跳转到下一步
				setTimeout(() => {
					// 这里可以添加跳转逻辑
				}, 2000)
			} else {
				setSaveMessage(`❌ 保存失败: ${response.data.message}`)
			}
		} catch (error) {
			console.error('Save to backend failed:', error)
			setSaveMessage('❌ 保存失败，请检查网络连接和后端服务状态')
		} finally {
			setIsSaving(false)
		}
	}

	// 保存草稿（本地保存）
	const handleSaveDraft = () => {
		if (!validateMappingRules()) return
		
		// 本地保存逻辑已经在AppState中实现
		setSaveMessage('✅ 草稿已保存到本地')
		
		// 清除消息
		setTimeout(() => setSaveMessage(''), 2000)
	}

	// 批量删除选中的规则
	const handleBatchDelete = () => {
		if (mappingRules.length === 0) return
		
		if (confirm(`确定要删除所有 ${mappingRules.length} 个映射规则吗？`)) {
			mappingRules.forEach(rule => {
				if (currentProtocolId) {
					removeMappingRule(currentProtocolId, rule.id)
				}
			})
			setSaveMessage('✅ 已删除所有映射规则')
		}
	}

	// 导入映射规则
	const handleImportRules = () => {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = '.json'
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0]
			if (!file || !currentProtocolId) return

			try {
				const content = await file.text()
				const rules = JSON.parse(content)
				
				if (Array.isArray(rules)) {
					rules.forEach(rule => {
						addMappingRule(currentProtocolId, {
							sourceKey: rule.source_key || rule.sourceKey,
							targetKey: rule.target_key || rule.targetKey,
							transformer: rule.transformer || '-'
						})
					})
					setSaveMessage(`✅ 成功导入 ${rules.length} 个映射规则`)
				} else {
					setSaveMessage('❌ 导入失败：文件格式不正确')
				}
			} catch (error) {
				setSaveMessage('❌ 导入失败：文件解析错误')
			}
		}
		input.click()
	}

	// 导出映射规则
	const handleExportRules = () => {
		if (mappingRules.length === 0) {
			setSaveMessage('❌ 没有可导出的映射规则')
			return
		}

		const exportData = {
			protocol_name: currentProtocol?.name,
			chain: currentProtocol?.chain,
			type: currentProtocol?.type,
			exported_at: new Date().toISOString(),
			mapping_rules: mappingRules.map(rule => ({
				source_key: rule.sourceKey,
				target_key: rule.targetKey,
				transformer: rule.transformer
			}))
		}

		const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `mapping-rules-${currentProtocol?.name}-${new Date().toISOString().split('T')[0]}.json`
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)
		
		setSaveMessage('✅ 映射规则已导出')
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Step 2: Upload Template & Edit Fields</h2>
				<div className="flex items-center gap-3">
					{currentProtocol && (
						<div className="text-sm text-gray-600">
							Protocol: {currentProtocol.name} ({currentProtocol.chain} • {currentProtocol.type})
						</div>
					)}
					<button 
						className="text-sm text-blue-600 hover:text-blue-800 underline"
						onClick={() => setShowApiTest(!showApiTest)}
					>
						{showApiTest ? '隐藏' : '显示'}API测试
					</button>
				</div>
			</div>
			
			{/* API测试面板 */}
			{showApiTest && <ApiTestPanel />}
			
			<Box title="Template Source" right={
				<div className="flex gap-2">
					<button 
						className="btn btn-secondary text-sm" 
						onClick={testBackendConnection}
						disabled={isLoading}
					>
						{isLoading ? '测试中...' : '测试连接'}
					</button>
					<button 
						className="btn btn-secondary" 
						onClick={handleAIParsing}
						disabled={isLoading}
					>
						{isLoading ? '解析中...' : 'AI解析'}
					</button>
					<button 
						className="btn btn-secondary" 
						onClick={handleGetSuggestions}
						disabled={isLoading}
					>
						{isLoading ? '获取中...' : '获取建议'}
					</button>
				</div>
			}>
				<div className="grid gap-3 text-sm">
					<label className="grid grid-cols-[180px_1fr] items-center gap-2">
						<span>Upload Excel Schema:</span>
						<input 
							type="file" 
							className="input" 
							accept=".xlsx,.xls,.csv"
							onChange={handleFileUpload}
							ref={fileInputRef}
						/>
					</label>
					{uploadMessage && (
						<div className={`p-3 rounded-lg text-sm ${
							uploadMessage.includes('✅') ? 'bg-green-50 text-green-700' : 
							uploadMessage.includes('⚠️') ? 'bg-yellow-50 text-yellow-700' :
							'bg-red-50 text-red-700'
						}`}>
							<pre className="whitespace-pre-wrap font-sans">{uploadMessage}</pre>
						</div>
					)}
					<label className="grid grid-cols-[180px_1fr] items-center gap-2">
						<span>Replace AI Parsed Fields:</span>
						<input type="checkbox" className="h-4 w-4" defaultChecked={currentProtocol?.templateConfig.replaceAIParsed} />
					</label>
				</div>
			</Box>

			<Box title="Event & Method Config">
				<pre className="text-xs whitespace-pre-wrap leading-6 text-gray-700">{`event_monitor: { 
  chain_name: ${currentProtocol?.chain || 'ethereum'}, 
  contract_address: ${currentProtocol?.dataPlan.contractAddress || '0xA0b8...6eB48'},
  abi_path: ${currentProtocol?.dataPlan.abiPath || '/abis/erc20.json'}, 
  events_to_monitor: [${currentProtocol?.dataPlan.events.join(', ') || 'Transfer'}], 
  mode: realtime, 
  poll_interval: 1.0 
}
symbol_caller: { method_name: symbol, params: [] }
decimals_caller: { method_name: decimals, params: [] }`}</pre>
			</Box>

			<Box title="Field Mapping Rules (Editable)" right={
				<div className="flex gap-2">
					<button 
						className="btn btn-secondary" 
						onClick={() => currentProtocolId && addMappingRule(currentProtocolId)}
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
						disabled={mappingRules.length === 0}
					>
						Export
					</button>
					<button 
						className="btn btn-secondary" 
						onClick={handleBatchDelete}
						disabled={mappingRules.length === 0}
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
					<table className="table">
						<thead>
							<tr>
								<th>Source Key</th>
								<th>Target Key</th>
								<th>Transformer</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody className="text-xs">
							{mappingRules.map(rule => (
								<tr key={rule.id}
									draggable
									onDragStart={() => setDragId(rule.id)}
									onDragOver={(e) => e.preventDefault()}
									onDrop={() => { 
										if (dragId && dragId !== rule.id && currentProtocolId) {
											reorderMappingRules(currentProtocolId, dragId, rule.id)
											setDragId(null)
										}
									}}
								>
									<td>
										<input 
											className="input" 
											value={rule.sourceKey} 
											onChange={e => currentProtocolId && updateMappingRule(currentProtocolId, rule.id, { sourceKey: e.target.value })} 
											placeholder="e.g., from_address"
										/>
									</td>
									<td>
										<input 
											className="input" 
											value={rule.targetKey} 
											onChange={e => currentProtocolId && updateMappingRule(currentProtocolId, rule.id, { targetKey: e.target.value })} 
											placeholder="e.g., sender"
										/>
									</td>
									<td>
										<select 
											className="input" 
											value={rule.transformer} 
											onChange={e => currentProtocolId && updateMappingRule(currentProtocolId, rule.id, { transformer: e.target.value })}
										>
											<option value="-">无转换</option>
											<option value="to_lowercase">转小写</option>
											<option value="to_uppercase">转大写</option>
											<option value="to_int">转整数</option>
											<option value="to_float">转浮点数</option>
											<option value="normalize_by_decimals">按精度标准化</option>
											<option value="hex_to_address">十六进制转地址</option>
											<option value="timestamp_to_date">时间戳转日期</option>
										</select>
									</td>
									<td className="text-right">
										<button 
											className="btn btn-secondary" 
											onClick={() => currentProtocolId && removeMappingRule(currentProtocolId, rule.id)}
										>
											Delete
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				
				{mappingRules.length === 0 && (
					<div className="text-center py-8 text-gray-500">
						<div className="text-lg mb-2">📋 暂无字段映射规则</div>
						<div className="text-sm">请上传模板文件或使用AI解析来生成字段映射</div>
					</div>
				)}

				{/* 保存消息 */}
				{saveMessage && (
					<div className={`mt-4 p-3 rounded text-sm ${
						saveMessage.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
					}`}>
						{saveMessage}
					</div>
				)}
				
				<div className="mt-4 flex gap-3">
					<button 
						className="btn btn-secondary" 
						onClick={handleSaveDraft}
						disabled={mappingRules.length === 0}
					>
						Save Draft
					</button>
					<button 
						className="btn" 
						onClick={handleSaveToBackend}
						disabled={isSaving || mappingRules.length === 0}
					>
						{isSaving ? '保存中...' : 'Save to Backend'}
					</button>
					<Link to="/step-3" className="btn btn-secondary">
						Continue to Step 3
					</Link>
				</div>
			</Box>
		</div>
	)
}


