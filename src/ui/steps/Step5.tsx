import Box from '../components/Box'
import { Link } from 'react-router-dom'
import { useAppState } from '../../state/AppState'
import { useState, useEffect } from 'react'
import { fieldParsingAPI } from '../../services/api'

export default function Step5() {
	const { currentColumnId, columns, updateKafka } = useAppState()
	const [isLoading, setIsLoading] = useState(false)
	const [saveMessage, setSaveMessage] = useState('')
	const [testResults, setTestResults] = useState<{
		kafka: { success: boolean; message: string; details?: any } | null
		doris: { success: boolean; message: string; details?: any } | null
		overall: { success: boolean; message: string } | null
	}>({
		kafka: null,
		doris: null,
		overall: null
	})
	
	const currentColumn = columns.find(c => c.id === currentColumnId)
	const kafkaConfig = currentColumn?.kafka || {
		enableCompression: false,
		retryBackoff: false,
		batchSize: 1000,
		lingerMs: 100,
		bufferMemory: 33554432,
		acks: '1',
		compressionType: 'none',
		maxInFlightRequests: 5,
		requestTimeoutMs: 30000,
		deliveryTimeoutMs: 120000
	}
	
	const [kafkaSettings, setKafkaSettings] = useState(kafkaConfig)
	const [dorisSettings, setDorisSettings] = useState({
		host: 'localhost',
		port: 9030,
		username: 'root',
		password: '',
		database: 'blockchain_data',
		table: 'processed_events',
		batchSize: 1000,
		flushInterval: 5000,
		maxRetries: 3,
		timeout: 30000
	})

	// 初始化配置
	useEffect(() => {
		if (currentColumn?.kafka) {
			setKafkaSettings(currentColumn.kafka)
		}
	}, [currentColumn])

	// 更新Kafka设置
	const updateKafkaSetting = (key: string, value: any) => {
		setKafkaSettings(prev => ({ ...prev, [key]: value }))
	}

	// 更新Doris设置
	const updateDorisSetting = (key: string, value: any) => {
		setDorisSettings(prev => ({ ...prev, [key]: value }))
	}

	// 测试Kafka连接
	const testKafkaConnection = async () => {
		setIsLoading(true)
		setTestResults(prev => ({ ...prev, kafka: null }))

		try {
			const response = await fieldParsingAPI.testKafkaConnection({
				host: 'localhost', // 这里应该从配置中获取
				port: 9092,
				topic: 'blockchain-events',
				settings: kafkaSettings
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
					message: 'Kafka连接测试异常',
					details: { error: error.message }
				}
			}))
		} finally {
			setIsLoading(false)
		}
	}

	// 测试Doris连接
	const testDorisConnection = async () => {
		setIsLoading(true)
		setTestResults(prev => ({ ...prev, doris: null }))

		try {
			const response = await fieldParsingAPI.testDorisConnection({
				host: dorisSettings.host,
				port: dorisSettings.port,
				username: dorisSettings.username,
				password: dorisSettings.password,
				database: dorisSettings.database,
				table: dorisSettings.table
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
					message: 'Doris连接测试异常',
					details: { error: error.message }
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
			// 并行测试Kafka和Doris连接
			const [kafkaTest, dorisTest] = await Promise.allSettled([
				testKafkaConnection(),
				testDorisConnection()
			])

			// 计算整体结果
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
		if (!currentColumnId) return

		setIsLoading(true)
		setSaveMessage('')

		try {
			// 更新本地Kafka配置
			updateKafka(currentColumnId, kafkaSettings)

			// 调用后端API保存配置
			const response = await fieldParsingAPI.saveIngestionConfig({
				column_id: currentColumnId,
				chain_name: currentColumn?.chain?.toLowerCase() || 'ethereum',
				protocol_type: currentColumn?.type?.toLowerCase() || 'dex',
				kafka_config: kafkaSettings,
				doris_config: dorisSettings,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			})

			if (response.success) {
				setSaveMessage('✅ 配置已成功保存到后端')
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
		if (confirm('确定要重置所有配置吗？')) {
			setKafkaSettings(kafkaConfig)
			setDorisSettings({
				host: 'localhost',
				port: 9030,
				username: 'root',
				password: '',
				database: 'blockchain_data',
				table: 'processed_events',
				batchSize: 1000,
				flushInterval: 5000,
				maxRetries: 3,
				timeout: 30000
			})
			setTestResults({
				kafka: null,
				doris: null,
				overall: null
			})
			setSaveMessage('')
		}
	}

	// 生成配置报告
	const generateConfigReport = () => {
		const report = {
			column: currentColumn?.name || 'Unknown',
			chain: currentColumn?.chain || 'Unknown',
			timestamp: new Date().toISOString(),
			kafka_config: kafkaSettings,
			doris_config: dorisSettings,
			test_results: testResults,
			recommendations: []
		}

		// 添加建议
		if (kafkaSettings.batchSize > 5000) {
			report.recommendations.push('Kafka批处理大小较大，可能影响延迟')
		}
		if (kafkaSettings.lingerMs > 500) {
			report.recommendations.push('Kafka延迟时间较长，可能影响实时性')
		}
		if (dorisSettings.batchSize > 2000) {
			report.recommendations.push('Doris批处理大小较大，可能影响写入性能')
		}

		// 下载报告
		const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `ingestion-config-${currentColumn?.name}-${new Date().toISOString().split('T')[0]}.json`
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)
		
		setSaveMessage('✅ 配置报告已生成')
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Step 5: Ingestion Configuration</h2>
				{currentColumn && (
					<div className="text-sm text-gray-600">
						Column: {currentColumn.name} ({currentColumn.chain} • {currentColumn.type})
					</div>
				)}
			</div>

			{/* Kafka配置 */}
			<Box title="Kafka Configuration" right={
				<button
					className="btn btn-secondary"
					onClick={testKafkaConnection}
					disabled={isLoading}
				>
					{isLoading ? '测试中...' : 'Test Connection'}
				</button>
			}>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Batch Size
						</label>
						<input
							type="number"
							className="input"
							value={kafkaSettings.batchSize}
							onChange={(e) => updateKafkaSetting('batchSize', parseInt(e.target.value))}
							min="100"
							max="10000"
						/>
						<div className="text-xs text-gray-500 mt-1">100-10000</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Linger (ms)
						</label>
						<input
							type="number"
							className="input"
							value={kafkaSettings.lingerMs}
							onChange={(e) => updateKafkaSetting('lingerMs', parseInt(e.target.value))}
							min="0"
							max="1000"
						/>
						<div className="text-xs text-gray-500 mt-1">0-1000ms</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Buffer Memory (bytes)
						</label>
						<input
							type="number"
							className="input"
							value={kafkaSettings.bufferMemory}
							onChange={(e) => updateKafkaSetting('bufferMemory', parseInt(e.target.value))}
							min="1024"
							max="134217728"
						/>
						<div className="text-xs text-gray-500 mt-1">1KB-128MB</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Request Timeout (ms)
						</label>
						<input
							type="number"
							className="input"
							value={kafkaSettings.requestTimeoutMs}
							onChange={(e) => updateKafkaSetting('requestTimeoutMs', parseInt(e.target.value))}
							min="1000"
							max="60000"
						/>
						<div className="text-xs text-gray-500 mt-1">1-60秒</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Acknowledgment
						</label>
						<select
							className="input"
							value={kafkaSettings.acks}
							onChange={(e) => updateKafkaSetting('acks', e.target.value)}
						>
							<option value="0">0 (No acknowledgment)</option>
							<option value="1">1 (Leader acknowledgment)</option>
							<option value="all">all (All replicas acknowledgment)</option>
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Compression Type
						</label>
						<select
							className="input"
							value={kafkaSettings.compressionType}
							onChange={(e) => updateKafkaSetting('compressionType', e.target.value)}
						>
							<option value="none">None</option>
							<option value="gzip">Gzip</option>
							<option value="snappy">Snappy</option>
							<option value="lz4">LZ4</option>
						</select>
					</div>
				</div>

				<div className="mt-4 space-y-3">
					<label className="flex items-center space-x-2">
						<input
							type="checkbox"
							checked={kafkaSettings.enableCompression}
							onChange={(e) => updateKafkaSetting('enableCompression', e.target.checked)}
							className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded"
						/>
						<span className="text-sm text-gray-700">Enable Compression</span>
					</label>

					<label className="flex items-center space-x-2">
						<input
							type="checkbox"
							checked={kafkaSettings.retryBackoff}
							onChange={(e) => updateKafkaSetting('retryBackoff', e.target.checked)}
							className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded"
						/>
						<span className="text-sm text-gray-700">Enable Retry Backoff</span>
					</label>
				</div>
			</Box>

			{/* Doris配置 */}
			<Box title="Doris Configuration" right={
				<button
					className="btn btn-secondary"
					onClick={testDorisConnection}
					disabled={isLoading}
				>
					{isLoading ? '测试中...' : 'Test Connection'}
				</button>
			}>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Host
						</label>
						<input
							type="text"
							className="input"
							value={dorisSettings.host}
							onChange={(e) => updateDorisSetting('host', e.target.value)}
							placeholder="localhost"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Port
						</label>
						<input
							type="number"
							className="input"
							value={dorisSettings.port}
							onChange={(e) => updateDorisSetting('port', parseInt(e.target.value))}
							min="1"
							max="65535"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Username
						</label>
						<input
							type="text"
							className="input"
							value={dorisSettings.username}
							onChange={(e) => updateDorisSetting('username', e.target.value)}
							placeholder="root"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Password
						</label>
						<input
							type="password"
							className="input"
							value={dorisSettings.password}
							onChange={(e) => updateDorisSetting('password', e.target.value)}
							placeholder="Enter password"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Database
						</label>
						<input
							type="text"
							className="input"
							value={dorisSettings.database}
							onChange={(e) => updateDorisSetting('database', e.target.value)}
							placeholder="blockchain_data"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Table
						</label>
						<input
							type="text"
							className="input"
							value={dorisSettings.table}
							onChange={(e) => updateDorisSetting('table', e.target.value)}
							placeholder="processed_events"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Batch Size
						</label>
						<input
							type="number"
							className="input"
							value={dorisSettings.batchSize}
							onChange={(e) => updateDorisSetting('batchSize', parseInt(e.target.value))}
							min="100"
							max="10000"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Flush Interval (ms)
						</label>
						<input
							type="number"
							className="input"
							value={dorisSettings.flushInterval}
							onChange={(e) => updateDorisSetting('flushInterval', parseInt(e.target.value))}
							min="1000"
							max="30000"
						/>
					</div>
				</div>
			</Box>

			{/* 测试结果 */}
			{/* Kafka测试结果 */}
			{testResults.kafka && (
				<Box title="Kafka Test Results">
					<div className={`flex items-center space-x-2 text-lg ${testResults.kafka.success ? 'text-green-600' : 'text-red-600'}`}>
						<span>{testResults.kafka.success ? '✅' : '❌'}</span>
						<span className="font-medium">{testResults.kafka.message}</span>
					</div>
					{testResults.kafka.details && (
						<pre className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
							{JSON.stringify(testResults.kafka.details, null, 2)}
						</pre>
					)}
				</Box>
			)}

			{/* Doris测试结果 */}
			{testResults.doris && (
				<Box title="Doris Test Results">
					<div className={`flex items-center space-x-2 text-lg ${testResults.doris.success ? 'text-green-600' : 'text-red-600'}`}>
						<span>{testResults.doris.success ? '✅' : '❌'}</span>
						<span className="font-medium">{testResults.doris.message}</span>
					</div>
					{testResults.doris.details && (
						<pre className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
							{JSON.stringify(testResults.doris.details, null, 2)}
						</pre>
					)}
				</Box>
			)}

			{/* 整体测试结果 */}
			{testResults.overall && (
				<Box title="Overall Test Results">
					<div className={`flex items-center space-x-2 text-xl ${testResults.overall.success ? 'text-green-600' : 'text-red-600'}`}>
						<span>{testResults.overall.success ? '✅' : '❌'}</span>
						<span className="font-bold">{testResults.overall.message}</span>
					</div>
				</Box>
			)}

			{/* 保存消息 */}
			{saveMessage && (
				<div className={`p-4 rounded-lg ${
					saveMessage.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
				}`}>
					{saveMessage}
				</div>
			)}

			{/* 操作按钮 */}
			<Box title="Configuration Actions">
				<div className="flex gap-3 flex-wrap">
					<button
						className="btn btn-secondary"
						onClick={runFullTest}
						disabled={isLoading}
					>
						{isLoading ? '测试中...' : 'Run Full Test'}
					</button>
					<button
						className="btn"
						onClick={saveConfiguration}
						disabled={isLoading}
					>
						{isLoading ? '保存中...' : 'Save Configuration'}
					</button>
					<button
						className="btn btn-secondary"
						onClick={resetConfiguration}
						disabled={isLoading}
					>
						Reset
					</button>
					<button
						className="btn btn-secondary"
						onClick={generateConfigReport}
					>
						Generate Report
					</button>
				</div>
			</Box>

			{/* 导航按钮 */}
			<div className="flex gap-3">
				<Link to="/step-4" className="btn btn-secondary">
					Back to Step 4
				</Link>
				<button className="btn">
					Complete Setup
				</button>
			</div>
		</div>
	)
}


