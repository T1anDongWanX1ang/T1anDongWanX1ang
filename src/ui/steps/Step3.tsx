import Box from '../components/Box'
import { Link } from 'react-router-dom'
import { useAppState } from '../../state/AppState'
import { useState, useRef } from 'react'
import { fieldParsingAPI } from '../../services/api'

export default function Step3() {
	const { currentProtocolId, components } = useAppState()
	const [isLoading, setIsLoading] = useState(false)
	const [validationResults, setValidationResults] = useState<{
		logs: { valid: boolean; errors: string[]; warnings: string[]; message: string } | null
		mapping: { valid: boolean; errors: string[]; warnings: string[]; message: string } | null
		overall: { valid: boolean; score: number; message: string } | null
	}>({
		logs: null,
		mapping: null,
		overall: null
	})
	const [logFile, setLogFile] = useState<File | null>(null)
	const [logContent, setLogContent] = useState('')
	const [showLogPreview, setShowLogPreview] = useState(false)
	const [validationMode, setValidationMode] = useState<'auto' | 'manual'>('auto')
	const [customLogData, setCustomLogData] = useState('')
	const fileInputRef = useRef<HTMLInputElement>(null)
	
	const currentProtocol = components.find(c => c.name === "step1") // 从 components 获取 step1 数据
	const step2Component = components.find(c => c.name === "step2") // 从 components 获取 step2 数据
	const mappingRules = step2Component?.mapping_rules || []

	// 处理日志文件上传
	const handleLogFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return

		setIsLoading(true)
		try {
			const content = await file.text()
			setLogFile(file)
			setLogContent(content)
			setValidationResults(prev => ({ ...prev, logs: null, mapping: null, overall: null }))
		} catch (error) {
			console.error('Log file read failed:', error)
		} finally {
			setIsLoading(false)
		}
	}

	// 验证日志格式
	const validateLogFormat = async () => {
		if (!logContent.trim() && !customLogData.trim()) {
			setValidationResults(prev => ({
				...prev,
				logs: { valid: false, errors: ['请提供日志内容'], warnings: [], message: '日志内容为空' }
			}))
			return
		}

		setIsLoading(true)
		try {
			const logData = logContent.trim() || customLogData.trim()
			
			// 调用后端API验证日志格式
			const response = await fieldParsingAPI.validateLogs(logData)
			
			setValidationResults(prev => ({
				...prev,
				logs: {
					valid: response.success && response.data.valid,
					errors: response.data.errors || [],
					warnings: response.data.warnings || [],
					message: response.data.message || '日志验证完成'
				}
			}))
		} catch (error) {
			console.error('Log validation failed:', error)
			setValidationResults(prev => ({
				...prev,
				logs: { valid: false, errors: ['日志验证失败'], warnings: [], message: '网络错误或服务异常' }
			}))
		} finally {
			setIsLoading(false)
		}
	}

	// 验证字段映射
	const validateFieldMapping = async () => {
		if (mappingRules.length === 0) {
			setValidationResults(prev => ({
				...prev,
				mapping: { valid: false, errors: ['没有可验证的字段映射规则'], warnings: [], message: '请先在Step2中配置字段映射' }
			}))
			return
		}

		setIsLoading(true)
		try {
			// 调用后端API验证字段映射
			const response = await fieldParsingAPI.validateMapping(mappingRules.map(rule => ({
				source_key: rule.sourceKey,
				target_key: rule.targetKey,
				transformer: rule.transformer
			})))
			
			setValidationResults(prev => ({
				...prev,
				mapping: {
					valid: response.success && response.data.valid,
					errors: response.data.errors || [],
					warnings: response.data.warnings || [],
					message: response.data.message || '字段映射验证完成'
				}
			}))
		} catch (error) {
			console.error('Field mapping validation failed:', error)
			setValidationResults(prev => ({
				...prev,
				mapping: { valid: false, errors: ['字段映射验证失败'], warnings: [], message: '网络错误或服务异常' }
			}))
		} finally {
			setIsLoading(false)
		}
	}

	// 运行完整验证
	const runFullValidation = async () => {
		setIsLoading(true)
		setValidationResults(prev => ({ ...prev, overall: null }))

		try {
			// 并行运行日志验证和字段映射验证
			const [logValidation, mappingValidation] = await Promise.allSettled([
				logContent.trim() || customLogData.trim() ? validateLogFormat() : Promise.resolve(),
				mappingRules.length > 0 ? validateFieldMapping() : Promise.resolve()
			])

			// 计算整体验证结果
			const logsValid = validationResults.logs?.valid ?? true
			const mappingValid = validationResults.mapping?.valid ?? true
			const overallValid = logsValid && mappingValid
			
			let score = 0
			if (logsValid) score += 50
			if (mappingValid) score += 50
			
			// 如果有错误，减少分数
			const totalErrors = (validationResults.logs?.errors?.length || 0) + (validationResults.mapping?.errors?.length || 0)
			score = Math.max(0, score - totalErrors * 5)

			setValidationResults(prev => ({
				...prev,
				overall: {
					valid: overallValid,
					score,
					message: overallValid ? '所有验证通过' : '存在验证问题，请检查详情'
				}
			}))
		} catch (error) {
			console.error('Full validation failed:', error)
			setValidationResults(prev => ({
				...prev,
				overall: { valid: false, score: 0, message: '验证过程发生错误' }
			}))
		} finally {
			setIsLoading(false)
		}
	}

	// 清除验证结果
	const clearValidationResults = () => {
		setValidationResults({
			logs: null,
			mapping: null,
			overall: null
		})
		setLogFile(null)
		setLogContent('')
		setCustomLogData('')
	}

	// 生成验证报告
	const generateValidationReport = () => {
		const report = {
			protocol: currentProtocol?.name || 'Unknown',
			chain: currentProtocol?.chain || 'Unknown',
			timestamp: new Date().toISOString(),
			validation_results: validationResults,
			mapping_rules_count: mappingRules.length,
			recommendations: []
		}

		// 添加建议
		if (validationResults.logs?.errors?.length) {
			report.recommendations.push('检查日志格式是否符合预期结构')
		}
		if (validationResults.mapping?.errors?.length) {
			report.recommendations.push('检查字段映射规则的配置')
		}
		if (validationResults.overall?.score < 80) {
			report.recommendations.push('建议优化配置以提高验证分数')
		}

		// 下载报告
		const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `validation-report-${currentProtocol?.name}-${new Date().toISOString().split('T')[0]}.json`
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)
	}

	// 获取验证状态颜色
	const getStatusColor = (valid: boolean | null) => {
		if (valid === null) return 'text-gray-500'
		return valid ? 'text-green-600' : 'text-red-600'
	}

	// 获取验证状态图标
	const getStatusIcon = (valid: boolean | null) => {
		if (valid === null) return '⏳'
		return valid ? '✅' : '❌'
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Step 3: Mapping Validation</h2>
				{currentProtocol && (
					<div className="text-sm text-gray-600">
						Protocol: {currentProtocol.name} ({currentProtocol.chain} • {currentProtocol.type})
					</div>
				)}
			</div>

			{/* 验证模式选择 */}
			<Box title="Validation Mode">
				<div className="space-y-4">
					<div className="flex gap-4">
						<label className="flex items-center space-x-2">
							<input
								type="radio"
								value="auto"
								checked={validationMode === 'auto'}
								onChange={(e) => setValidationMode(e.target.value as 'auto' | 'manual')}
								className="h-4 w-4 text-brand focus:ring-brand border-gray-300"
							/>
							<span>自动验证模式</span>
						</label>
						<label className="flex items-center space-x-2">
							<input
								type="radio"
								value="manual"
								checked={validationMode === 'manual'}
								onChange={(e) => setValidationMode(e.target.value as 'auto' | 'manual')}
								className="h-4 w-4 text-brand focus:ring-brand border-gray-300"
							/>
							<span>手动验证模式</span>
						</label>
					</div>
					
					<div className="text-sm text-gray-600">
						{validationMode === 'auto' 
							? '系统将自动验证日志格式和字段映射规则'
							: '您可以手动上传日志文件或输入日志数据进行验证'
						}
					</div>
				</div>
			</Box>

			{/* 日志数据输入 */}
			<Box title="Log Data Input" right={
				<div className="flex gap-2">
					<button
						className="btn btn-secondary"
						onClick={() => setShowLogPreview(!showLogPreview)}
					>
						{showLogPreview ? '隐藏' : '预览'}日志
					</button>
					<button
						className="btn btn-secondary"
						onClick={clearValidationResults}
						disabled={isLoading}
					>
						Clear
					</button>
				</div>
			}>
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Upload Log File:
						</label>
						<input
							type="file"
							className="input"
							accept=".log,.txt,.json,.csv"
							onChange={handleLogFileUpload}
							ref={fileInputRef}
						/>
						<div className="mt-1 text-xs text-gray-500">
							支持 .log, .txt, .json, .csv 格式
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Or Input Custom Log Data:
						</label>
						<textarea
							className="input w-full h-32"
							placeholder="输入日志数据或JSON格式的日志..."
							value={customLogData}
							onChange={(e) => setCustomLogData(e.target.value)}
						/>
					</div>

					{/* 日志预览 */}
					{showLogPreview && (logContent || customLogData) && (
						<div className="mt-4 p-3 bg-gray-50 rounded-lg">
							<div className="text-sm font-medium text-gray-700 mb-2">日志预览:</div>
							<pre className="text-xs text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
								{logContent || customLogData}
							</pre>
						</div>
					)}
				</div>
			</Box>

			{/* 验证操作 */}
			<Box title="Validation Actions">
				<div className="flex gap-3">
					<button
						className="btn btn-secondary"
						onClick={validateLogFormat}
						disabled={isLoading || (!logContent.trim() && !customLogData.trim())}
					>
						{isLoading ? '验证中...' : '验证日志格式'}
					</button>
					<button
						className="btn btn-secondary"
						onClick={validateFieldMapping}
						disabled={isLoading || mappingRules.length === 0}
					>
						{isLoading ? '验证中...' : '验证字段映射'}
					</button>
					<button
						className="btn"
						onClick={runFullValidation}
						disabled={isLoading}
					>
						{isLoading ? '验证中...' : '运行完整验证'}
					</button>
				</div>
			</Box>

			{/* 验证结果 */}
			{/* 日志验证结果 */}
			{validationResults.logs && (
				<Box title="Log Validation Results">
					<div className="space-y-3">
						<div className={`flex items-center space-x-2 text-lg ${getStatusColor(validationResults.logs.valid)}`}>
							<span>{getStatusIcon(validationResults.logs.valid)}</span>
							<span className="font-medium">{validationResults.logs.message}</span>
						</div>
						
						{validationResults.logs.errors.length > 0 && (
							<div className="space-y-2">
								<div className="text-sm font-medium text-red-700">错误:</div>
								<ul className="list-disc list-inside space-y-1 text-sm text-red-600">
									{validationResults.logs.errors.map((error, index) => (
										<li key={index}>{error}</li>
									))}
								</ul>
							</div>
						)}
						
						{validationResults.logs.warnings.length > 0 && (
							<div className="space-y-2">
								<div className="text-sm font-medium text-yellow-700">警告:</div>
								<ul className="list-disc list-inside space-y-1 text-sm text-yellow-600">
									{validationResults.logs.warnings.map((warning, index) => (
										<li key={index}>{warning}</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</Box>
			)}

			{/* 字段映射验证结果 */}
			{validationResults.mapping && (
				<Box title="Field Mapping Validation Results">
					<div className="space-y-3">
						<div className={`flex items-center space-x-2 text-lg ${getStatusColor(validationResults.mapping.valid)}`}>
							<span>{getStatusIcon(validationResults.mapping.valid)}</span>
							<span className="font-medium">{validationResults.mapping.message}</span>
						</div>
						
						{validationResults.mapping.errors.length > 0 && (
							<div className="space-y-2">
								<div className="text-sm font-medium text-red-700">错误:</div>
								<ul className="list-disc list-inside space-y-1 text-sm text-red-600">
									{validationResults.mapping.errors.map((error, index) => (
										<li key={index}>{error}</li>
									))}
								</ul>
							</div>
						)}
						
						{validationResults.mapping.warnings.length > 0 && (
							<div className="space-y-2">
								<div className="text-sm font-medium text-yellow-700">警告:</div>
								<ul className="list-disc list-inside space-y-1 text-sm text-yellow-600">
									{validationResults.mapping.warnings.map((warning, index) => (
										<li key={index}>{warning}</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</Box>
			)}

			{/* 整体验证结果 */}
			{validationResults.overall && (
				<Box title="Overall Validation Results">
					<div className="space-y-4">
						<div className={`flex items-center space-x-2 text-xl ${getStatusColor(validationResults.overall.valid)}`}>
							<span>{getStatusIcon(validationResults.overall.valid)}</span>
							<span className="font-bold">{validationResults.overall.message}</span>
						</div>
						
						<div className="flex items-center space-x-4">
							<div className="text-center">
								<div className="text-2xl font-bold text-blue-600">{validationResults.overall.score}</div>
								<div className="text-sm text-gray-600">验证分数</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-green-600">{mappingRules.length}</div>
								<div className="text-sm text-gray-600">映射规则</div>
							</div>
						</div>
						
						{validationResults.overall.score < 100 && (
							<div className="p-3 bg-blue-50 rounded-lg">
								<div className="text-sm font-medium text-blue-700 mb-2">改进建议:</div>
								<ul className="list-disc list-inside space-y-1 text-sm text-blue-600">
									{validationResults.overall.score < 80 && <li>检查并修复验证错误</li>}
									{validationResults.overall.score < 90 && <li>优化字段映射配置</li>}
									<li>确保日志格式符合预期</li>
								</ul>
							</div>
						)}
					</div>
				</Box>
			)}

			{/* 操作按钮 */}
			<div className="flex gap-3">
				<button
					className="btn btn-secondary"
					onClick={generateValidationReport}
					disabled={!validationResults.overall}
				>
					Generate Report
				</button>
				<Link to="/step-4" className="btn">
					Continue to Step 4
				</Link>
			</div>
		</div>
	)
}
