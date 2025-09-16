import Box from '../components/Box'
import { Link } from 'react-router-dom'
import { useAppState } from '../../state/AppState'
import { useState, useRef, useEffect } from 'react'
import { fieldParsingAPI } from '../../services/api'

// Define JSON configuration types
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
		topics?: string
		groupId?: string
		parallelism?: number
	}
	chains?: string[]
	chainConfigs?: {
		[chainName: string]: ChainConfig
	}
	// New format support
	flink?: {
		parallelism: number
		checkpoint: {
			interval: number
		}
	}
	doris?: {
		host: string
		port: string
		user: string
		password: string
		database: string
		table: {
			name: string
		}
		buffer: {
			size: number
		}
		parallelism: number
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

	// Get Field Mapping Results from Step2
	const mappingRules: any[] = []

	// Initialize field mapping selection state
	useEffect(() => {
		if (mappingRules.length > 0) {
			const initialSelection: {[key: string]: boolean} = {}
			mappingRules.forEach(rule => {
				initialSelection[rule.targetKey] = true // Default select all mapping fields
			})
			setMappingFieldsSelection(initialSelection)
		}
	}, [mappingRules])

	// Check if it's New format
	const isNewFormat = (config: any): boolean => {
		return config && config.flink && config.kafka && config.doris && config.job &&
			   !config.chains && !config.chainConfigs
	}

	// Safely get chains array
	const getChains = (): string[] => {
		if (!configData) return []
		return (configData as any).chains || ['default']
	}

	// Safely get chainConfigs
	const getChainConfigs = (): any => {
		if (!configData) return {}
		return (configData as any).chainConfigs || {}
	}

	// Handle JSON Configuration File Upload
	const handleConfigFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return

		setIsLoading(true)
		try {
			const content = await file.text()
			const jsonData = JSON.parse(content)
			
			console.log('📄 Parsed JSON configuration:', jsonData)

			setConfigFile(file)
			setConfigData(jsonData) // Directly save raw data, avoid complex conversion
			
			// Simple format detection and state setting
			if (isNewFormat(jsonData)) {
				console.log('✅ New format configuration detected')
				
				// New format: directly set basic state
				setSelectedChain('default')
				setSelectedTable(jsonData.doris.table.name)
				setSelectedColumns([]) // New format requires user to manually select columns
				
				setSaveMessage('✅ New format configuration file loaded successfully - Please manually select table fields')
			} else {
				console.log('✅ Old format configuration detected')
				
				// Old format: set state after safety checks
				try {
					if (jsonData.chainConfigs && typeof jsonData.chainConfigs === 'object') {
						const availableChains = Object.keys(jsonData.chainConfigs)
						if (availableChains.length > 0) {
							const chainName = availableChains[0]
							setSelectedChain(chainName)
							
							if (jsonData.chainConfigs[chainName] && jsonData.chainConfigs[chainName].tables) {
								const tables = Object.keys(jsonData.chainConfigs[chainName].tables)
								if (tables.length > 0) {
									setSelectedTable(tables[0])
									setSelectedColumns(jsonData.chainConfigs[chainName].tables[tables[0]].columns || [])
								}
							}
						}
					}
					setSaveMessage('✅ Old format configuration file loaded successfully')
				} catch (configError) {
					console.warn('Old format configuration processing warning:', configError)
					setSaveMessage('⚠️ Configuration file loaded, but some auto-settings failed, please configure manually')
				}
			}

		} catch (error) {
			console.error('Config file parse failed:', error)
			setSaveMessage('❌ Configuration file format error, please check JSON format')
		} finally {
			setIsLoading(false)
		}
	}

	// Select Chain configuration
	const handleChainSelect = (chainName: string) => {
		setSelectedChain(chainName)
		setSelectedTable('')
		setSelectedColumns([])

		if (configData?.chainConfigs && configData.chainConfigs[chainName]) {
			const tables = Object.keys(configData.chainConfigs[chainName].tables)
			if (tables.length > 0) {
				setSelectedTable(tables[0])
				setSelectedColumns(configData.chainConfigs[chainName].tables[tables[0]].columns)
			}
		}
	}

	// Select Table
	const handleTableSelect = (tableName: string) => {
		setSelectedTable(tableName)
		if (configData?.chainConfigs && configData.chainConfigs[selectedChain]?.tables[tableName]) {
			setSelectedColumns(configData.chainConfigs[selectedChain].tables[tableName].columns)
		}
	}

	// Toggle JSON configuration field selection
	const toggleColumnSelection = (columnName: string) => {
		setSelectedColumns(prev =>
			prev.includes(columnName)
				? prev.filter(col => col !== columnName)
				: [...prev, columnName]
		)
	}

	// Toggle mapping fields selection
	const toggleMappingFieldSelection = (fieldName: string) => {
		setMappingFieldsSelection(prev => ({
			...prev,
			[fieldName]: !prev[fieldName]
		}))
	}

	// Test Kafka Connection
	const testKafkaConnection = async () => {
		if (!configData || !selectedChain) return

		setIsLoading(true)
		setTestResults(prev => ({ ...prev, kafka: null }))

		try {
			if (!configData.chainConfigs) {
				throw new Error('ChainConfiguration does not exist')
			}
			const chainConfig = configData.chainConfigs[selectedChain]
			if (!chainConfig) {
				throw new Error(`Chain configuration not found: ${selectedChain}`)
			}
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
						message: 'Kafka Connection Test successful',
						details: response.data
					}
				}))
			} else {
				setTestResults(prev => ({
					...prev,
					kafka: {
						success: false,
						message: `Kafka Connection Failed: ${response.data.message}`,
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
					message: 'Kafka Connection Test failed, please check network connection'
				}
			}))
		} finally {
			setIsLoading(false)
		}
	}

	// Test Doris Connection
	const testDorisConnection = async () => {
		if (!configData || !selectedChain) return

		setIsLoading(true)
		setTestResults(prev => ({ ...prev, doris: null }))

		try {
			if (!configData.chainConfigs) {
				throw new Error('ChainConfiguration does not exist')
			}
			const chainConfig = configData.chainConfigs[selectedChain]
			if (!chainConfig) {
				throw new Error(`Chain configuration not found: ${selectedChain}`)
			}
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
						message: 'Doris Connection Test successful',
						details: response.data
					}
				}))
			} else {
				setTestResults(prev => ({
					...prev,
					doris: {
						success: false,
						message: `Doris Connection Failed: ${response.data.message}`,
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
					message: 'Doris Connection Test failed, please check network connection'
				}
			}))
		} finally {
			setIsLoading(false)
		}
	}

	// Run Full Test
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
						message: overallSuccess ? 'All connection tests passed' : 'Connection issues exist, please check configuration'
					}
				}))
			}, 1000)
		} catch (error) {
			console.error('Full test failed:', error)
			setTestResults(prev => ({
				...prev,
				overall: { success: false, message: 'Error occurred during testing' }
			}))
		} finally {
			setIsLoading(false)
		}
	}

	// Save Configuration to backend
	const saveConfiguration = async () => {
		if (!configData || !selectedChain || !selectedTable) {
			setSaveMessage('❌ Please complete all configuration selections')
			return
		}

		setIsLoading(true)
		setSaveMessage('')

		try {
			console.log('🔍 Starting to save configuration, Current data:', { configData, selectedChain, selectedTable, selectedColumns })
			
			// Check if it's New format
			const isNew = isNewFormat(configData)
			console.log('📋 Configuration format:', isNew ? 'New format' : 'Old format')
			
			let moduleContent: any

			if (isNew) {
				// New format data processing
				console.log('✅ Processing New format configuration data')
				const newConfig = configData as any
				
				moduleContent = {
					job: newConfig.job,
					kafka: {
						servers: newConfig.kafka.servers,
						topics: newConfig.kafka.topics,
						groupId: newConfig.kafka.groupId,
						parallelism: newConfig.kafka.parallelism
					},
					doris: {
						host: newConfig.doris.host,
						port: newConfig.doris.port,
						user: newConfig.doris.user,
						password: newConfig.doris.password,
						database: newConfig.doris.database,
						table: newConfig.doris.table,
						buffer: newConfig.doris.buffer,
						parallelism: newConfig.doris.parallelism
					},
					flink: newConfig.flink
				}
			} else {
				// Old format data processing
				console.log('✅ Processing Old format configuration data')
				const chainConfigs = getChainConfigs()
				const chainConfig = chainConfigs[selectedChain]
				
				if (!chainConfig) {
					throw new Error(`Chain configuration not found: ${selectedChain}`)
				}

				// Get selected mapping fields
				const selectedMappingFields = Object.keys(mappingFieldsSelection)
					.filter(key => mappingFieldsSelection[key])

				// Build complete JSON configuration data
				moduleContent = {
					kafka: {
						servers: (configData as any).kafka.servers
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
			}

			console.log('📊 Built moduleContent:', moduleContent)

			// Wrap into new API format
			const requestData = {
				component_id: isNew ? 2 : (getChainConfigs()[selectedChain]?.id || 2),
				module_content: moduleContent
			}
			
			console.log('📦 Final request data:', requestData)

			// Call backend API to Save Configuration
			const response = await fieldParsingAPI.saveIngestionConfig(requestData)

			if (response.success) {
				setSaveMessage('✅ Configuration successfully saved to backend')

				// Configuration saved to backend, keep local state synchronized
			} else {
				setSaveMessage(`❌ Save failed: ${response.data.message}`)
			}
		} catch (error) {
			console.error('Save configuration failed:', error)
			setSaveMessage('❌ Save failed, please check network connection')
		} finally {
			setIsLoading(false)
		}
	}

	// Reset configuration
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
				<h1 className="text-2xl font-bold text-gray-900">Step 5: Data Ingestion Configuration</h1>
				<p className="text-gray-600 mt-2">
					Upload JSON configuration file, select tables and fields for ingestion, and confirm fields mapped from Step2
				</p>
				{currentProtocolId && (
					<div className="mt-2 p-2 bg-blue-50 rounded-md">
						<p className="text-sm text-blue-700">
							Current Pipeline ID: <strong>{currentProtocolId}</strong>
						</p>
					</div>
				)}
			</div>

			{/* Step2 Field Mapping Results */}
			{mappingRules.length > 0 && (
				<Box title="Step2 Field Mapping Results" className="space-y-4">
					<div>
						<p className="text-sm text-gray-600 mb-3">
							Below are field mapping rules from Step2, please select fields for ingestion:
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
											Source Field: {rule.sourceKey} → Transformer: {rule.transformer}
										</div>
										{rule.description && (
											<div className="text-xs text-gray-400">{rule.description}</div>
										)}
									</div>
								</label>
							))}
						</div>
						<p className="text-sm text-gray-500 mt-2">
							Selected {Object.values(mappingFieldsSelection).filter(Boolean).length} mapping fields
						</p>
					</div>
				</Box>
			)}

			{/* Configuration File Upload */}
			<Box title="JSON Configuration File Upload" className="space-y-4">
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Upload JSON Configuration File
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
								Reset
							</button>
						</div>
						{configFile && (
							<p className="text-sm text-green-600 mt-2">
								Loaded: {configFile.name}
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
				<Box title="Chain and Table Selection" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Chain Selection */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Select Blockchain
							</label>
							<select
								value={selectedChain}
								onChange={(e) => handleChainSelect(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand"
							>
								<option value="">Please select chain...</option>
								{getChains().map(chain => (
									<option key={chain} value={chain}>
										{chain.toUpperCase()} (ID: {getChainConfigs()[chain]?.id || 1})
									</option>
								))}
							</select>
						</div>

						{/* Table Selection */}
						{selectedChain && (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Select Data Table
								</label>
								<select
									value={selectedTable}
									onChange={(e) => handleTableSelect(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand"
								>
									<option value="">Please select table...</option>
																	{(() => {
									const chainConfigs = getChainConfigs()
									const tables = chainConfigs[selectedChain]?.tables || {}
									return Object.keys(tables).map(tableName => (
										<option key={tableName} value={tableName}>
											{tableName}
										</option>
									))
								})()}
								</select>
							</div>
						)}
					</div>

					{/* Configuration Preview */}
					{selectedChain && configData && (
						<div className="mt-4 p-4 bg-gray-50 rounded-md">
							<h4 className="text-sm font-medium text-gray-700 mb-2">Configuration Preview</h4>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
								<div>
									<p><strong>KafkaServer:</strong> {(configData as any).kafka?.servers || 'Not Configured'}</p>
									<p><strong>Topic:</strong> {getChainConfigs()[selectedChain]?.kafka?.topics || (configData as any).kafka?.topics || 'Not Configured'}</p>
									<p><strong>Group ID:</strong> {getChainConfigs()[selectedChain]?.kafka?.groupId || (configData as any).kafka?.groupId || 'Not Configured'}</p>
								</div>
								<div>
									<p><strong>DorisHost:</strong> {(() => {
										const chainConfig = getChainConfigs()[selectedChain]
										const dorisConfig = chainConfig?.doris || (configData as any).doris
										return dorisConfig ? `${dorisConfig.host}:${dorisConfig.port}` : 'Not Configured'
									})()}</p>
									<p><strong>Database:</strong> {getChainConfigs()[selectedChain]?.doris?.db || (configData as any).doris?.database || 'Not Configured'}</p>
									<p><strong>User:</strong> {getChainConfigs()[selectedChain]?.doris?.user || (configData as any).doris?.user || 'Not Configured'}</p>
								</div>
							</div>
						</div>
					)}
				</Box>
			)}

			{/* JSON Table Column Selection */}
			{selectedTable && configData && (
				<Box title="JSON Configuration Table Field Selection" className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Select table fields for ingestion (Table: {selectedTable})
						</label>
						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-4">
							{(() => {
								const chainConfigs = getChainConfigs()
								const columns = chainConfigs[selectedChain]?.tables?.[selectedTable]?.columns || []
								return columns.map((column: string) => (
									<label key={column} className="flex items-center space-x-2 text-sm">
										<input
											type="checkbox"
											checked={selectedColumns.includes(column)}
											onChange={() => toggleColumnSelection(column)}
											className="rounded border-gray-300 text-brand focus:ring-brand"
										/>
										<span className="truncate" title={column}>{column}</span>
									</label>
								))
							})()}
						</div>
						<p className="text-sm text-gray-500 mt-2">
							Selected {selectedColumns.length} table fields
						</p>
					</div>
				</Box>
			)}

			{/* Connection Testing */}
			{selectedChain && selectedTable && (
				<Box title="Connection Test" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<button
							onClick={testKafkaConnection}
							disabled={isLoading}
							className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
						>
							{isLoading ? 'Testing...' : 'Test Kafka Connection'}
						</button>
						<button
							onClick={testDorisConnection}
							disabled={isLoading}
							className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
						>
							{isLoading ? 'Testing...' : 'Test Doris Connection'}
						</button>
						<button
							onClick={runFullTest}
							disabled={isLoading}
							className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
						>
							{isLoading ? 'Testing...' : 'Full Test'}
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
								<strong>Overall Result:</strong> {testResults.overall.message}
							</div>
						)}
					</div>
				</Box>
			)}

			{/* Save Configuration */}
			{configFile && (
				<Box title="Save Configuration" className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-gray-600">
								{selectedChain && selectedTable ? 'Configuration complete, ready to save to backend' : 'Configuration file uploaded, ready to save'}
							</p>
							<p className="text-xs text-gray-500 mt-1">
								{selectedChain && selectedTable ? 
									`Chain: ${selectedChain} | Table: ${selectedTable} | Table fields: ${selectedColumns.length} items | mapping fields: ${Object.values(mappingFieldsSelection).filter(Boolean).length} items` :
									`file: ${configFile.name} | size: ${(configFile.size / 1024).toFixed(1)}KB`
								}
							</p>
						</div>
						<button
							onClick={saveConfiguration}
							disabled={isLoading}
							className="px-6 py-2 bg-brand text-white rounded-md hover:bg-brand/90 disabled:opacity-50"
						>
							{isLoading ? 'Saving...' : 'Save Configuration'}
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
					← Previous: SQL Editor
				</Link>
				<div className="text-sm text-gray-500">
					Final step - Configuration complete
				</div>
			</div>
		</div>
	)
}


