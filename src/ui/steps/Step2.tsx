import Box from '../components/Box'
import { Link, useNavigate } from 'react-router-dom'
import { useAppState, DictMapper } from '../../state/AppState'
import { useState, useRef, useEffect } from 'react'
import { fieldParsingAPI, FieldParsingRequest, TemplateUploadRequest } from '../../services/api'
import { currentApiConfig } from '../../config/api'

import { debugAPI } from '../../utils/debug'

export default function Step2() {
	const { eventParams, updateComponent, components } = useAppState()
	const navigate = useNavigate()
	const [dragId, setDragId] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [uploadMessage, setUploadMessage] = useState('')
	const [parsingMessage, setParsingMessage] = useState('')
	const [saveMessage, setSaveMessage] = useState('')
	const fileInputRef = useRef<HTMLInputElement>(null)
	
	// 本地状态管理映射规则
	const [mappingRules, setMappingRules] = useState<Array<{
		id: string
		sourceKey: string
		targetKey: string
		transformer: string
	}>>([])  

	// 从全局 components 中恢复数据，或根据第一步字段自动生成映射规则
	useEffect(() => {
		// 如果已经有映射规则，不重复生成
		if (mappingRules.length > 0) return
		
		const step2Component = components.find(c => c.name === "step2") as DictMapper
		
		if (step2Component && step2Component.mapping_rules && step2Component.mapping_rules.length > 0) {
			// 从保存的数据中恢复映射规则
			console.log('🔄 从全局 components 恢复 Step2 数据:', step2Component)
			
			const restoredRules = step2Component.mapping_rules.map((rule, index) => ({
				id: `restored_${Date.now()}_${index}`,
				sourceKey: rule.source_key,
				targetKey: rule.target_key,
				transformer: rule.transformer || '无转换'
			}))
			
			setMappingRules(restoredRules)
			setSaveMessage(`✅ 已从管道配置中恢复 ${step2Component.mapping_rules.length} 条映射规则`)
			setTimeout(() => setSaveMessage(''), 6000)
		} else if (eventParams.step1 && eventParams.step1.length > 0) {
			// 如果没有保存的数据，根据第一步的字段自动生成映射规则
			console.log('🔄 根据第一步字段自动生成映射规则:', eventParams.step1)
			
			const autoRules = eventParams.step1.map((param, index) => {
				// 为每个参数生成一个映射规则
				const targetKey = param.startsWith('args.') 
					? param.replace('args.', '') // 移除 args. 前缀作为目标字段名
					: param // 基础字段保持原名
				
				return {
					id: `auto_${Date.now()}_${index}`,
					sourceKey: param,
					targetKey: targetKey,
					transformer: '无转换'
				}
			})
			
			setMappingRules(autoRules)
			setSaveMessage(`✅ 已根据第一步字段自动生成 ${eventParams.step1.length} 条映射规则`)
			setTimeout(() => setSaveMessage(''), 6000)
		} else {
			// 没有任何数据可以恢复或生成
			console.log('📝 Step2: 没有可恢复的数据，等待用户配置')
		}
	}, [components, mappingRules.length, eventParams.step1]) // 依赖 eventParams.step1

	// 本地映射规则管理函数
	const addMappingRule = () => {
		const newRule = {
			id: `rule_${Date.now()}`,
			sourceKey: '',
			targetKey: '',
			transformer: '无转换'
		}
		setMappingRules(prev => [...prev, newRule])
	}

	const updateMappingRule = (id: string, updates: Partial<{sourceKey: string, targetKey: string, transformer: string}>) => {
		setMappingRules(prev => prev.map(rule => 
			rule.id === id ? { ...rule, ...updates } : rule
		))
	}

	const removeMappingRule = (id: string) => {
		setMappingRules(prev => prev.filter(rule => rule.id !== id))
	}

	const reorderMappingRules = (dragId: string, dropId: string) => {
		setMappingRules(prev => {
			const dragIndex = prev.findIndex(rule => rule.id === dragId)
			const dropIndex = prev.findIndex(rule => rule.id === dropId)
			
			if (dragIndex === -1 || dropIndex === -1) return prev
			
			const newRules = [...prev]
			const [draggedRule] = newRules.splice(dragIndex, 1)
			newRules.splice(dropIndex, 0, draggedRule)
			
			return newRules
		})
	}

	// 处理文件上传
	const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return

		setIsLoading(true)
		setUploadMessage('')

		try {
			const request: TemplateUploadRequest = {
				file,
				chain_name: 'ethereum', // 默认链名
				protocol_type: 'dex' // 默认协议类型
			}

			const response = await fieldParsingAPI.uploadTemplate(request)
			
			if (response.success && response.data.parsed_fields) {
				// 将解析的字段添加到映射规则中
				const newRules = response.data.parsed_fields.map((field, index) => ({
					id: `uploaded_${Date.now()}_${index}`,
					sourceKey: field.source_key,
					targetKey: field.target_key,
					transformer: field.transformer
				}))
				
				setMappingRules(prev => [...prev, ...newRules])
				setUploadMessage(`✅ 成功解析 ${response.data.parsed_fields.length} 个字段`)
			} else {
				setUploadMessage(`❌ 解析失败: ${response.data.message}`)
			}
		} catch (error) {
			console.error('Template upload failed:', error)
			let errorMessage = '❌ 上传失败'
			
			if (error instanceof Error) {
				if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
					errorMessage += `，无法连接到后端服务，请检查：\n1. 后端服务是否启动 (${currentApiConfig.baseUrl})\n2. 网络连接是否正常\n3. 防火墙设置`
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
		// 从全局 components 获取 step1 数据
		const step1Component = components.find(c => c.name === "step1")
		if (!step1Component) {
			setParsingMessage('❌ 请先完成第一步配置')
			return
		}

		setIsLoading(true)
		setParsingMessage('')

		try {
			const request: FieldParsingRequest = {
				chain_name: step1Component.chain_name || 'ethereum',
				contract_address: step1Component.contract_address || '0x0000000000000000000000000000000000000000',
				abi_path: step1Component.abi_path || '/abis/default.json',
				events_to_monitor: step1Component.events_to_monitor || ['Transfer'],
				mode: 'realtime',
				poll_interval: 1.0
			}

			const response = await fieldParsingAPI.parseFields(request)
			
			if (response.success && response.data.fields) {
				// 添加AI解析的字段
				const newRules = response.data.fields.map((field, index) => ({
					id: `ai_${Date.now()}_${index}`,
					sourceKey: field.source_key,
					targetKey: field.target_key,
					transformer: field.transformer
				}))
				
				setMappingRules(prev => [...prev, ...newRules])
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
		setIsLoading(true)
		setParsingMessage('')

		try {
			const response = await fieldParsingAPI.getFieldSuggestions(
				'ethereum', // 默认链名
				'dex' // 默认协议类型
			)
			
			if (response.success && response.data.fields) {
				// 添加建议的字段到现有规则中
				const newRules = response.data.fields.map((field, index) => ({
					id: `suggestion_${Date.now()}_${index}`,
					sourceKey: field.source_key,
					targetKey: field.target_key,
					transformer: field.transformer
				}))
				
				setMappingRules(prev => [...prev, ...newRules])
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



	// 保存草稿（本地保存）
	const handleSaveDraft = () => {
		if (!validateMappingRules()) return
		
		try {
			// 将 mappingRules 转换为 DictMapper 格式
			const dictMapperComponent: DictMapper = {
				name: "step2",
				type: "dict_mapper",
				mapping_rules: mappingRules.map(rule => ({
					source_key: rule.sourceKey,
					target_key: rule.targetKey,
					transformer: rule.transformer === '-' ? undefined : rule.transformer
				}))
			}
			
			// 保存到全局 components
			updateComponent("step2", dictMapperComponent)
			
			// 调试信息
			console.log('保存的 DictMapper 组件:', dictMapperComponent)
			
			setSaveMessage('✅ 字段映射规则已保存到组件列表')
			
			// 清除消息
			setTimeout(() => setSaveMessage(''), 3000)
		} catch (error) {
			console.error('保存映射规则失败:', error)
			setSaveMessage('❌ 保存失败，请重试')
		}
	}

	// 继续到Step3（先保存再跳转）
	const handleContinueToStep3 = () => {
		if (!validateMappingRules()) return
		
		try {
			// 将 mappingRules 转换为 DictMapper 格式
			const dictMapperComponent: DictMapper = {
				name: "step2",
				type: "dict_mapper",
				mapping_rules: mappingRules.map(rule => ({
					source_key: rule.sourceKey,
					target_key: rule.targetKey,
					transformer: rule.transformer === '-' ? undefined : rule.transformer
				}))
			}
			
			// 保存到全局 components
			updateComponent("step2", dictMapperComponent)
			
			// 调试信息
			console.log('保存的 DictMapper 组件:', dictMapperComponent)
			
			setSaveMessage('✅ 字段映射规则已保存，正在跳转到Step3...')
			
			// 延迟跳转，让用户看到保存成功的消息
			setTimeout(() => {
				navigate('/step-3')
			}, 1000)
		} catch (error) {
			console.error('保存映射规则失败:', error)
			setSaveMessage('❌ 保存失败，无法跳转到Step3')
		}
	}

	// 批量删除选中的规则
	const handleBatchDelete = () => {
		if (mappingRules.length === 0) return
		
		if (confirm(`确定要删除所有 ${mappingRules.length} 个映射规则吗？`)) {
			setMappingRules([])
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
			if (!file) return

			try {
				const content = await file.text()
				const rules = JSON.parse(content)
				
				if (Array.isArray(rules)) {
					const importedRules = rules.map((rule, index) => ({
						id: `imported_${Date.now()}_${index}`,
						sourceKey: rule.source_key || rule.sourceKey,
						targetKey: rule.target_key || rule.targetKey,
						transformer: rule.transformer || '无转换'
					}))
					
					setMappingRules(prev => [...prev, ...importedRules])
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

		const step1Component = components.find(c => c.name === "step1")
		const exportData = {
			protocol_name: 'Step2 Mapping Rules',
			chain: step1Component?.chain_name || 'ethereum',
			type: 'dict_mapper',
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
		a.download = `mapping-rules-step2-${new Date().toISOString().split('T')[0]}.json`
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
					<div className="text-sm text-gray-600">
						Step 2: 字段映射配置
					</div>
				</div>
			</div>
			

			




			<Box title="Field Mapping Rules (Editable)" right={
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
										if (dragId && dragId !== rule.id) {
											reorderMappingRules(dragId, rule.id)
											setDragId(null)
										}
									}}
								>
									<td>
										<select 
											className="input" 
											value={rule.sourceKey} 
											onChange={e => updateMappingRule(rule.id, { sourceKey: e.target.value })}
										>
											<option value="">请选择源字段</option>
											{eventParams.step1 && eventParams.step1.map((param, index) => (
												<option key={index} value={param}>
													{param}
												</option>
											))}
										</select>
									</td>
									<td>
										<input 
											className="input" 
											value={rule.targetKey} 
											onChange={e => updateMappingRule(rule.id, { targetKey: e.target.value })} 
											placeholder="e.g., sender"
										/>
									</td>
									<td>
										<select 
											className="input" 
											value={rule.transformer} 
											onChange={e => updateMappingRule(rule.id, { transformer: e.target.value })}
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
											onClick={() => removeMappingRule(rule.id)}
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
						className="btn" 
						onClick={handleSaveDraft}
						disabled={mappingRules.length === 0}
					>
						Save Mapping
					</button>
					<button 
						className="btn btn-secondary"
						onClick={handleContinueToStep3}
						disabled={mappingRules.length === 0}
					>
						Continue to Step 3
					</button>
				</div>
			</Box>

			{/* 调试信息 - 显示 components 中的 step2 数据 */}
			{(() => {
				const step2Component = components.find(c => c.name === "step2") as DictMapper
				return step2Component && (
					<Box title="Step2 Components 数据 (调试信息)" right={
						<span className="text-xs text-gray-500 bg-purple-100 px-2 py-1 rounded">
							从 Components 加载
						</span>
					}>
						<div className="space-y-2">
							<div className="text-sm text-gray-600">
								当前保存的映射规则数量: {step2Component.mapping_rules?.length || 0}
							</div>
							{step2Component.mapping_rules && step2Component.mapping_rules.length > 0 && (
								<div className="overflow-x-auto">
									<table className="table text-xs">
										<thead>
											<tr>
												<th>Source Key</th>
												<th>Target Key</th>
												<th>Transformer</th>
											</tr>
										</thead>
										<tbody>
											{step2Component.mapping_rules.map((rule, index) => (
												<tr key={index}>
													<td className="font-mono">{rule.source_key}</td>
													<td className="font-mono">{rule.target_key}</td>
													<td>{rule.transformer || '无转换'}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					</Box>
				)
			})()}
		</div>
	)
}


