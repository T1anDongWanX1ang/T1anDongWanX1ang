import Box from '../components/Box'
import { Link } from 'react-router-dom'
import { useAppState } from '../../state/AppState'
import { useState, useRef, useEffect } from 'react'
import { fieldParsingAPI } from '../../services/api'

// 定义JSON配置的类型
interface ChainConfig {
	id: number
	kafka: {
		topics: string
		groupId: string
	}
	doris: {
		host: string
		port: string
		user: string
		password: string
		db: string
	}
	mapper: {
		[key: string]: string
	}
	tables: {
		[tableName: string]: {
			name: string
			columns: string[]
			buffer: {
				size: number
			}
		}
	}
}

interface IngestionConfig {
	job: {
		name: string
	}
	kafka: {
		servers: string
	}
	chains: string[]
	chainConfigs: {
		[chainName: string]: ChainConfig
	}
}

export default function Step5() {
	const { currentProtocolId, currentColumnId, columns, updateKafka } = useAppState()
	const [isLoading, setIsLoading] = useState(false)
	const [saveMessage, setSaveMessage] = useState('')
	const [configFile, setConfigFile] = useState<File | null>(null)
	const [configData, setConfigData] = useState<IngestionConfig | null>(null)
	const [selectedChain, setSelectedChain] = useState<string>('')
	const [selectedTable, setSelectedTable] = useState<string>('')
	const [selectedColumns, setSelectedColumns] = useState<string[]>([])
	const [mappingFieldsSelection, setMappingFieldsSelection] = useState<{[key: string]: boolean}>({})
	const [testResults, setTestResults] = useState<{
		kafka: { success: boolean; message: string; details?: any } | null
		doris: { success: boolean; message: string; details?: any } | null
		overall: { success: boolean; message: string } | null
	}>({
		kafka: null,
		doris: null,
		overall: null
	})

	const fileInputRef = useRef<HTMLInputElement>(null)
	const currentColumn = columns?.find(c => c.id === currentColumnId)

	// 从Step2获取字段映射结果
	const mappingRules: any[] = []

	// 初始化字段映射选择状态
	useEffect(() => {
		if (mappingRules.length > 0) {
			const initialSelection: {[key: string]: boolean} = {}
			mappingRules.forEach(rule => {
				initialSelection[rule.targetKey] = true // 默认选中所有映射字段
			})
			setMappingFieldsSelection(initialSelection)
		}
	}, [mappingRules])

	// 处理JSON配置文件上传
	const handleConfigFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return

		setIsLoading(true)
		try {
			const content = await file.text()
			const jsonData = JSON.parse(content) as IngestionConfig

			setConfigFile(file)
			setConfigData(jsonData)

			// 自动选择第一个可用的链配置
			const availableChains = Object.keys(jsonData.chainConfigs)
			if (availableChains.length > 0) {
				const chainName = availableChains[0]
				if (jsonData.chainConfigs[chainName]) {
					setSelectedChain(chainName)
					// 自动选择第一个表
					const tables = Object.keys(jsonData.chainConfigs[chainName].tables)
					if (tables.length > 0) {
						setSelectedTable(tables[0])
						setSelectedColumns(jsonData.chainConfigs[chainName].tables[tables[0]].columns)
					}
				}
			}

			setSaveMessage('✅ 配置文件加载成功')
		} catch (error) {
			console.error('Config file parse failed:', error)
			setSaveMessage('❌ 配置文件格式错误，请检查JSON格式')
		} finally {
			setIsLoading(false)
		}
	}

	// 选择链配置
	const handleChainSelect = (chainName: string) => {
		setSelectedChain(chainName)
		setSelectedTable('')
		setSelectedColumns([])

		if (configData?.chainConfigs[chainName]) {
			const tables = Object.keys(configData.chainConfigs[chainName].tables)
			if (tables.length > 0) {
				setSelectedTable(tables[0])
				setSelectedColumns(configData.chainConfigs[chainName].tables[tables[0]].columns)
			}
		}
	}

	// 选择表
	const handleTableSelect = (tableName: string) => {
		setSelectedTable(tableName)
		if (configData?.chainConfigs[selectedChain]?.tables[tableName]) {
			setSelectedColumns(configData.chainConfigs[selectedChain].tables[tableName].columns)
		}
	}

	// 切换JSON配置字段选择
	const toggleColumnSelection = (columnName: string) => {
		setSelectedColumns(prev =>
			prev.includes(columnName)
				? prev.filter(col => col !== columnName)
				: [...prev, columnName]
		)
	}

	// 切换映射字段选择
	const toggleMappingFieldSelection = (fieldName: string) => {
		setMappingFieldsSelection(prev => ({
			...prev,
			[fieldName]: !prev[fieldName]
		}))
	}

	// 测试Kafka连接
	const testKafkaConnection = async () => {
		if (!configData || !selectedChain) return

		setIsLoading(true)
		setTestResults(prev => ({ ...prev, kafka: null }))

		try {
			const chainConfig = configData.chainConfigs[selectedChain]
			const response = await fieldParsingAPI.testKafkaConnection({
				host: configData.kafka.servers.split(':')[0],
				port: parseInt(configData.kafka.servers.split(':')[1]),
				topic: chainConfig.kafka.topics,
				settings: {
					groupId: chainConfig.kafka.groupId,
					servers: configData.kafka.servers
				}
			})

			if (response.success) {
				setTestResults(prev => ({
					...prev,
					kafka: {
						success: true,
						message: 'Kafka连接测试成功',
						details: response.data
					}
				}))
			} else {
				setTestResults(prev => ({
					...prev,
					kafka: {
						success: false,
						message: `Kafka连接失败: ${response.data.message}`,
						details: response.data
					}
				}))
			}
		} catch (error) {
			console.error('Kafka connection test failed:', error)
			setTestResults(prev => ({
				...prev,
				kafka: {
					success: false,
					message: 'Kafka连接测试失败，请检查网络连接'
				}
			}))
		} finally {
			setIsLoading(false)
		}
	}

	// 测试Doris连接
	const testDorisConnection = async () => {
		if (!configData || !selectedChain) return

		setIsLoading(true)
		setTestResults(prev => ({ ...prev, doris: null }))

		try {
			const chainConfig = configData.chainConfigs[selectedChain]
			const response = await fieldParsingAPI.testDorisConnection({
				host: chainConfig.doris.host,
				port: parseInt(chainConfig.doris.port),
				username: chainConfig.doris.user,
				password: chainConfig.doris.password,
				database: chainConfig.doris.db,
				table: selectedTable
			})

			if (response.success) {
				setTestResults(prev => ({
					...prev,
					doris: {
						success: true,
						message: 'Doris连接测试成功',
						details: response.data
					}
				}))
			} else {
				setTestResults(prev => ({
					...prev,
					doris: {
						success: false,
						message: `Doris连接失败: ${response.data.message}`,
						details: response.data
					}
				}))
			}
		} catch (error) {
			console.error('Doris connection test failed:', error)
			setTestResults(prev => ({
				...prev,
				doris: {
					success: false,
					message: 'Doris连接测试失败，请检查网络连接'
				}
			}))
		} finally {
			setIsLoading(false)
		}
	}

	// 运行完整测试
	const runFullTest = async () => {
		setIsLoading(true)
		setTestResults(prev => ({ ...prev, overall: null }))

		try {
			await Promise.allSettled([
				testKafkaConnection(),
				testDorisConnection()
			])

			setTimeout(() => {
				const kafkaSuccess = testResults.kafka?.success ?? false
				const dorisSuccess = testResults.doris?.success ?? false
				const overallSuccess = kafkaSuccess && dorisSuccess

				setTestResults(prev => ({
					...prev,
					overall: {
						success: overallSuccess,
						message: overallSuccess ? '所有连接测试通过' : '存在连接问题，请检查配置'
					}
				}))
			}, 1000)
		} catch (error) {
			console.error('Full test failed:', error)
			setTestResults(prev => ({
				...prev,
				overall: { success: false, message: '测试过程发生错误' }
			}))
		} finally {
			setIsLoading(false)
		}
	}

	// 保存配置到后端
	const saveConfiguration = async () => {
		// if (!configData || !selectedChain || !selectedTable) {
		// 	setSaveMessage('❌ 请完成所有配置选择')
		// 	return
		// }

		setIsLoading(true)
		setSaveMessage('')

		try {
			if (!configData) {
				setSaveMessage('配置数据不存在')
				setIsLoading(false)
				return
			}

			const chainConfig = configData.chainConfigs[selectedChain]

			// 获取选中的映射字段
			const selectedMappingFields = Object.keys(mappingFieldsSelection)
				.filter(key => mappingFieldsSelection[key])

			// 构建完整的JSON配置数据
			const moduleContent = {
				kafka: {
					servers: configData.kafka.servers
				},
				chains: [selectedChain],
				chainConfigs: {
					[selectedChain]: {
						id: chainConfig.id || 1,
						kafka: {
							topics: chainConfig.kafka.topics,
							groupId: chainConfig.kafka.groupId
						},
						doris: {
							host: chainConfig.doris.host,
							port: chainConfig.doris.port,
							user: chainConfig.doris.user,
							password: chainConfig.doris.password,
							db: chainConfig.doris.db
						},
						mapper: chainConfig.mapper || {},
						tables: {
							[selectedTable]: {
								name: selectedTable,
								columns: selectedColumns,
								buffer: {
									size: chainConfig.tables?.[selectedTable]?.buffer?.size || 1024
								}
							}
						}
					}
				}
			}

			// 包装成新的API格式
			const requestData = {
				component_id: 1,
				module_content: moduleContent
			}

			// 调用后端API保存配置
			const response = await fieldParsingAPI.saveIngestionConfig(requestData)

			if (response.success) {
				setSaveMessage('✅ 配置已成功保存到后端')

				// 配置已保存到后端，本地状态保持同步
			} else {
				setSaveMessage(`❌ 保存失败: ${response.data.message}`)
			}
		} catch (error) {
			console.error('Save configuration failed:', error)
			setSaveMessage('❌ 保存失败，请检查网络连接')
		} finally {
			setIsLoading(false)
		}
	}

	// 重置配置
	const resetConfiguration = () => {
		setConfigFile(null)
		setConfigData(null)
		setSelectedChain('')
		setSelectedTable('')
		setSelectedColumns([])
		setTestResults({ kafka: null, doris: null, overall: null })
		setSaveMessage('')
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-bold text-gray-900">Step 5: 数据摄入配置</h1>
				<p className="text-gray-600 mt-2">
					上传JSON配置文件，选择要入库的表和字段，并确认从Step2映射的字段
				</p>
				{currentProtocolId && (
					<div className="mt-2 p-2 bg-blue-50 rounded-md">
						<p className="text-sm text-blue-700">
							当前管道ID: <strong>{currentProtocolId}</strong>
						</p>
					</div>
				)}
			</div>

			{/* Step2 字段映射结果 */}
			{mappingRules.length > 0 && (
				<Box title="Step2 字段映射结果" className="space-y-4">
					<div>
						<p className="text-sm text-gray-600 mb-3">
							以下是从Step2获取的字段映射规则，请选择要入库的字段：
						</p>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-4">
							{mappingRules.map(rule => (
								<label key={rule.id} className="flex items-start space-x-3 text-sm">
									<input
										type="checkbox"
										checked={mappingFieldsSelection[rule.targetKey] || false}
										onChange={() => toggleMappingFieldSelection(rule.targetKey)}
										className="mt-1 rounded border-gray-300 text-brand focus:ring-brand"
									/>
									<div className="flex-1">
										<div className="font-medium">{rule.targetKey}</div>
										<div className="text-xs text-gray-500">
											源字段: {rule.sourceKey} → 转换器: {rule.transformer}
										</div>
										{rule.description && (
											<div className="text-xs text-gray-400">{rule.description}</div>
										)}
									</div>
								</label>
							))}
						</div>
						<p className="text-sm text-gray-500 mt-2">
							已选择 {Object.values(mappingFieldsSelection).filter(Boolean).length} 个映射字段
						</p>
					</div>
				</Box>
			)}

			{/* Configuration File Upload */}
			<Box title="JSON配置文件上传" className="space-y-4">
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							上传JSON配置文件
						</label>
						<div className="flex items-center gap-4">
							<input
								ref={fileInputRef}
								type="file"
								accept=".json"
								onChange={handleConfigFileUpload}
								className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand file:text-white hover:file:bg-brand/90"
							/>
							<button
								onClick={resetConfiguration}
								className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
							>
								重置
							</button>
						</div>
						{configFile && (
							<p className="text-sm text-green-600 mt-2">
								已加载: {configFile.name}
							</p>
						)}
					</div>

					{saveMessage && (
						<div className={`p-3 rounded-md text-sm ${
							saveMessage.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
						}`}>
							{saveMessage}
						</div>
					)}
				</div>
			</Box>

			{/* Chain and Table Selection */}
			{configData && (
				<Box title="链和表选择" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Chain Selection */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								选择区块链
							</label>
							<select
								value={selectedChain}
								onChange={(e) => handleChainSelect(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand"
							>
								<option value="">请选择链...</option>
																	{configData?.chains.map(chain => (
										<option key={chain} value={chain}>
											{chain.toUpperCase()} (ID: {configData.chainConfigs[chain]?.id})
										</option>
									)) || []}
							</select>
						</div>

						{/* Table Selection */}
						{selectedChain && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									选择数据表
								</label>
								<select
									value={selectedTable}
									onChange={(e) => handleTableSelect(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand"
								>
									<option value="">请选择表...</option>
									{configData?.chainConfigs[selectedChain]?.tables ? Object.keys(configData.chainConfigs[selectedChain].tables).map(tableName => (
										<option key={tableName} value={tableName}>
											{tableName}
										</option>
									)) : []}
								</select>
							</div>
						)}
					</div>

					{/* Configuration Preview */}
					{selectedChain && (
						<div className="mt-4 p-4 bg-gray-50 rounded-md">
							<h4 className="text-sm font-medium text-gray-700 mb-2">配置预览</h4>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
								<div>
																<p><strong>Kafka服务器:</strong> {configData?.kafka.servers}</p>
							<p><strong>Topic:</strong> {configData?.chainConfigs[selectedChain]?.kafka.topics}</p>
							<p><strong>Group ID:</strong> {configData?.chainConfigs[selectedChain]?.kafka.groupId}</p>
								</div>
								<div>
																<p><strong>Doris主机:</strong> {configData?.chainConfigs[selectedChain]?.doris.host}:{configData?.chainConfigs[selectedChain]?.doris.port}</p>
							<p><strong>数据库:</strong> {configData?.chainConfigs[selectedChain]?.doris.db}</p>
							<p><strong>用户:</strong> {configData?.chainConfigs[selectedChain]?.doris.user}</p>
								</div>
							</div>
						</div>
					)}
				</Box>
			)}

			{/* JSON Table Column Selection */}
			{selectedTable && configData && (
				<Box title="JSON配置表字段选择" className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							选择要入库的表字段 (表: {selectedTable})
						</label>
						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-4">
							{configData?.chainConfigs[selectedChain]?.tables[selectedTable]?.columns?.map(column => (
								<label key={column} className="flex items-center space-x-2 text-sm">
									<input
										type="checkbox"
										checked={selectedColumns.includes(column)}
										onChange={() => toggleColumnSelection(column)}
										className="rounded border-gray-300 text-brand focus:ring-brand"
									/>
									<span className="truncate" title={column}>{column}</span>
								</label>
							))}
						</div>
						<p className="text-sm text-gray-500 mt-2">
							已选择 {selectedColumns.length} 个表字段
						</p>
					</div>
				</Box>
			)}

			{/* Connection Testing */}
			{selectedChain && selectedTable && (
				<Box title="连接测试" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<button
							onClick={testKafkaConnection}
							disabled={isLoading}
							className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
						>
							{isLoading ? '测试中...' : '测试Kafka连接'}
						</button>
						<button
							onClick={testDorisConnection}
							disabled={isLoading}
							className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
						>
							{isLoading ? '测试中...' : '测试Doris连接'}
						</button>
						<button
							onClick={runFullTest}
							disabled={isLoading}
							className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
						>
							{isLoading ? '测试中...' : '完整测试'}
						</button>
					</div>

					{/* Test Results */}
					<div className="space-y-2">
						{testResults.kafka && (
							<div className={`p-3 rounded-md text-sm ${
								testResults.kafka.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
							}`}>
								<strong>Kafka:</strong> {testResults.kafka.message}
							</div>
						)}
						{testResults.doris && (
							<div className={`p-3 rounded-md text-sm ${
								testResults.doris.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
							}`}>
								<strong>Doris:</strong> {testResults.doris.message}
							</div>
						)}
						{testResults.overall && (
							<div className={`p-3 rounded-md text-sm font-medium ${
								testResults.overall.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
							}`}>
								<strong>整体结果:</strong> {testResults.overall.message}
							</div>
						)}
					</div>
				</Box>
			)}

			{/* Save Configuration */}
			{selectedChain && selectedTable && selectedColumns.length > 0 && (
				<Box title="保存配置" className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-gray-600">
								配置完成，准备保存到后端
							</p>
							<p className="text-xs text-gray-500 mt-1">
								链: {selectedChain} | 表: {selectedTable} | 表字段: {selectedColumns.length}个 | 映射字段: {Object.values(mappingFieldsSelection).filter(Boolean).length}个
							</p>
						</div>
						<button
							onClick={saveConfiguration}
							disabled={isLoading}
							className="px-6 py-2 bg-brand text-white rounded-md hover:bg-brand/90 disabled:opacity-50"
						>
							{isLoading ? '保存中...' : '保存配置'}
						</button>
					</div>
				</Box>
			)}

			{/* Navigation */}
			<div className="flex justify-between pt-6 border-t border-gray-200">
				<Link
					to="/step-4"
					className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
				>
					← 上一步: SQL编辑器
				</Link>
				<div className="text-sm text-gray-500">
					最后一步 - 配置完成
				</div>
			</div>
		</div>
	)
}


