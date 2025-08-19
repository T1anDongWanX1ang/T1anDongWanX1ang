import Box from '../components/Box'
import { Link } from 'react-router-dom'
import { useAppState } from '../../state/AppState'
import { useState, useRef, useEffect } from 'react'
import { fieldParsingAPI } from '../../services/api'

export default function Step4() {
	const { currentColumnId, columns, updateSqlText } = useAppState()
	const [isLoading, setIsLoading] = useState(false)
	const [sqlText, setSqlText] = useState('')
	const [testResults, setTestResults] = useState<{
		success: boolean
		message: string
		executionTime?: number
		rowCount?: number
		sampleData?: any[]
		errors?: string[]
	} | null>(null)
	const [showSampleData, setShowSampleData] = useState(false)
	const [sqlHistory, setSqlHistory] = useState<string[]>([])
	const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1)
	const [autoSave, setAutoSave] = useState(true)
	const [lastSaved, setLastSaved] = useState<Date | null>(null)
	const editorRef = useRef<HTMLTextAreaElement>(null)
	
	const currentColumn = columns.find(c => c.id === currentColumnId)
	
	// 初始化SQL文本
	useEffect(() => {
		if (currentColumn) {
			setSqlText(currentColumn.sqlText || '')
		}
	}, [currentColumn])

	// 自动保存功能
	useEffect(() => {
		if (autoSave && sqlText.trim() && currentColumnId) {
			const timer = setTimeout(() => {
				updateSqlText(currentColumnId, sqlText)
				setLastSaved(new Date())
			}, 2000) // 2秒后自动保存
			
			return () => clearTimeout(timer)
		}
	}, [sqlText, autoSave, currentColumnId, updateSqlText])

	// 保存SQL到本地状态
	const handleSaveSQL = () => {
		if (currentColumnId && sqlText.trim()) {
			updateSqlText(currentColumnId, sqlText)
			setLastSaved(new Date())
			
			// 添加到历史记录
			if (!sqlHistory.includes(sqlText)) {
				setSqlHistory(prev => [sqlText, ...prev.slice(0, 9)]) // 保留最近10条
			}
		}
	}

	// 加载SQL模板
	const loadSQLTemplate = (templateType: string) => {
		let template = ''
		
		switch (templateType) {
			case 'select':
				template = `SELECT 
    block_number,
    transaction_hash,
    from_address,
    to_address,
    value,
    timestamp
FROM blockchain_events 
WHERE chain_name = '${currentColumn?.chain || 'ethereum'}'
  AND protocol_type = '${currentColumn?.type || 'dex'}'
  AND block_number >= 19380000
ORDER BY block_number DESC
LIMIT 100;`
				break
			case 'insert':
				template = `INSERT INTO processed_events (
    event_id,
    chain_name,
    protocol_type,
    block_number,
    transaction_hash,
    from_address,
    to_address,
    value,
    processed_at
) VALUES (
    :event_id,
    '${currentColumn?.chain || 'ethereum'}',
    '${currentColumn?.type || 'dex'}',
    :block_number,
    :transaction_hash,
    :from_address,
    :to_address,
    :value,
    NOW()
);`
				break
			case 'update':
				template = `UPDATE processed_events 
SET 
    status = 'processed',
    updated_at = NOW()
WHERE event_id = :event_id
  AND chain_name = '${currentColumn?.chain || 'ethereum'}';`
				break
			case 'delete':
				template = `DELETE FROM processed_events 
WHERE chain_name = '${currentColumn?.chain || 'ethereum'}'
  AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
  AND status = 'archived';`
				break
			case 'aggregate':
				template = `SELECT 
    DATE(created_at) as date,
    COUNT(*) as event_count,
    SUM(CAST(value AS DECIMAL(65,18))) as total_value,
    AVG(CAST(value AS DECIMAL(65,18))) as avg_value
FROM processed_events 
WHERE chain_name = '${currentColumn?.chain || 'ethereum'}'
  AND protocol_type = '${currentColumn?.type || 'dex'}'
  AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(created_at)
ORDER BY date DESC;`
				break
			default:
				template = `-- ${templateType} SQL Template
-- 请根据实际需求修改此模板`
		}
		
		setSqlText(template)
	}

	// 格式化SQL
	const formatSQL = () => {
		try {
			// 简单的SQL格式化逻辑
			let formatted = sqlText
				.replace(/\s+/g, ' ') // 合并多个空格
				.replace(/\s*([,()])\s*/g, '$1 ') // 在逗号和括号后添加空格
				.replace(/\s*(SELECT|FROM|WHERE|ORDER BY|GROUP BY|HAVING|LIMIT|INSERT|UPDATE|DELETE|INTO|SET|VALUES)\s+/gi, '\n$1 ') // 关键字换行
				.replace(/\s*AND\s+/gi, '\n  AND ') // AND换行并缩进
				.replace(/\s*OR\s+/gi, '\n  OR ') // OR换行并缩进
				.trim()
			
			setSqlText(formatted)
		} catch (error) {
			console.error('SQL formatting failed:', error)
		}
	}

	// 验证SQL语法
	const validateSQL = async () => {
		if (!sqlText.trim()) {
			setTestResults({ success: false, message: '请先输入SQL语句' })
			return
		}

		setIsLoading(true)
		try {
			// 调用后端API验证SQL
			const response = await fieldParsingAPI.validateSQL(sqlText)
			
			if (response.success && response.data.valid) {
				setTestResults({ 
					success: true, 
					message: 'SQL语法验证通过',
					errors: response.data.warnings || []
				})
			} else {
				setTestResults({ 
					success: false, 
					message: 'SQL语法验证失败',
					errors: response.data.errors || []
				})
			}
		} catch (error) {
			console.error('SQL validation failed:', error)
			setTestResults({ 
				success: false, 
				message: 'SQL验证失败，请检查网络连接' 
			})
		} finally {
			setIsLoading(false)
		}
	}

	// 执行SQL测试
	const executeSQLTest = async () => {
		if (!sqlText.trim()) {
			setTestResults({ success: false, message: '请先输入SQL语句' })
			return
		}

		setIsLoading(true)
		const startTime = Date.now()
		
		try {
			// 调用后端API执行SQL测试
			const response = await fieldParsingAPI.executeSQLTest({
				sql: sqlText,
				chain_name: currentColumn?.chain?.toLowerCase() || 'ethereum',
				protocol_type: currentColumn?.type?.toLowerCase() || 'dex',
				test_mode: true
			})
			
			const executionTime = Date.now() - startTime
			
			if (response.success) {
				setTestResults({
					success: true,
					message: 'SQL执行成功',
					executionTime,
					rowCount: response.data.row_count || 0,
					sampleData: response.data.sample_data || []
				})
			} else {
				setTestResults({
					success: false,
					message: `SQL执行失败: ${response.data.message}`,
					executionTime,
					errors: response.data.errors || []
				})
			}
		} catch (error) {
			console.error('SQL execution failed:', error)
			setTestResults({
				success: false,
				message: 'SQL执行失败，请检查网络连接',
				executionTime: Date.now() - startTime
			})
		} finally {
			setIsLoading(false)
		}
	}

	// 清空SQL
	const clearSQL = () => {
		if (confirm('确定要清空SQL内容吗？')) {
			setSqlText('')
			setTestResults(null)
		}
	}

	// 撤销/重做功能
	const undo = () => {
		if (currentHistoryIndex < sqlHistory.length - 1) {
			const newIndex = currentHistoryIndex + 1
			setCurrentHistoryIndex(newIndex)
			setSqlText(sqlHistory[newIndex])
		}
	}

	const redo = () => {
		if (currentHistoryIndex > 0) {
			const newIndex = currentHistoryIndex - 1
			setCurrentHistoryIndex(newIndex)
			setSqlText(sqlHistory[newIndex])
		}
	}

	// 键盘快捷键
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.ctrlKey || e.metaKey) {
			switch (e.key) {
				case 's':
					e.preventDefault()
					handleSaveSQL()
					break
				case 'z':
					e.preventDefault()
					undo()
					break
				case 'y':
					e.preventDefault()
					redo()
					break
				case 'Enter':
					e.preventDefault()
					executeSQLTest()
					break
			}
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Step 4: SQL Editor & Test Run</h2>
				{currentColumn && (
					<div className="text-sm text-gray-600">
						Column: {currentColumn.name} ({currentColumn.chain} • {currentColumn.type})
					</div>
				)}
			</div>

			{/* SQL模板 */}
			<Box title="SQL Templates" right={
				<div className="flex gap-2">
					<button
						className="btn btn-secondary text-xs"
						onClick={() => loadSQLTemplate('select')}
					>
						SELECT
					</button>
					<button
						className="btn btn-secondary text-xs"
						onClick={() => loadSQLTemplate('insert')}
					>
						INSERT
					</button>
					<button
						className="btn btn-secondary text-xs"
						onClick={() => loadSQLTemplate('update')}
					>
						UPDATE
					</button>
					<button
						className="btn btn-secondary text-xs"
						onClick={() => loadSQLTemplate('delete')}
					>
						DELETE
					</button>
					<button
						className="btn btn-secondary text-xs"
						onClick={() => loadSQLTemplate('aggregate')}
					>
						AGGREGATE
					</button>
				</div>
			}>
				<div className="text-sm text-gray-600">
					选择SQL模板快速开始，或手动编写SQL语句
				</div>
			</Box>

			{/* SQL编辑器 */}
			<Box title="SQL Editor" right={
				<div className="flex gap-2">
					<label className="flex items-center space-x-2 text-sm">
						<input
							type="checkbox"
							checked={autoSave}
							onChange={(e) => setAutoSave(e.target.checked)}
							className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded"
						/>
						<span>自动保存</span>
					</label>
					{lastSaved && (
						<span className="text-xs text-gray-500">
							最后保存: {lastSaved.toLocaleTimeString()}
						</span>
					)}
				</div>
			}>
				<div className="space-y-4">
					<div className="relative">
						<textarea
							ref={editorRef}
							className="input w-full h-64 font-mono text-sm leading-relaxed"
							placeholder="在此输入SQL语句..."
							value={sqlText}
							onChange={(e) => setSqlText(e.target.value)}
							onKeyDown={handleKeyDown}
							spellCheck={false}
						/>
						
						{/* 行号显示 */}
						<div className="absolute left-0 top-0 w-12 h-full bg-gray-100 text-xs text-gray-500 font-mono select-none pointer-events-none">
							{sqlText.split('\n').map((_, index) => (
								<div key={index} className="h-6 leading-6 text-right pr-2">
									{index + 1}
								</div>
							))}
						</div>
						
						{/* 字符计数 */}
						<div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white px-2 py-1 rounded">
							{sqlText.length} 字符
						</div>
					</div>
					
					<div className="flex gap-2 text-sm text-gray-600">
						<span>快捷键: Ctrl+S 保存, Ctrl+Z 撤销, Ctrl+Y 重做, Ctrl+Enter 执行</span>
					</div>
				</div>
			</Box>

			{/* SQL操作工具栏 */}
			<Box title="SQL Operations">
				<div className="flex gap-3 flex-wrap">
					<button
						className="btn btn-secondary"
						onClick={formatSQL}
						disabled={!sqlText.trim()}
					>
						Format SQL
					</button>
					<button
						className="btn btn-secondary"
						onClick={validateSQL}
						disabled={isLoading || !sqlText.trim()}
					>
						{isLoading ? '验证中...' : 'Validate SQL'}
					</button>
					<button
						className="btn"
						onClick={executeSQLTest}
						disabled={isLoading || !sqlText.trim()}
					>
						{isLoading ? '执行中...' : 'Execute Test'}
					</button>
					<button
						className="btn btn-secondary"
						onClick={handleSaveSQL}
						disabled={!sqlText.trim()}
					>
						Save SQL
					</button>
					<button
						className="btn btn-secondary"
						onClick={clearSQL}
						disabled={!sqlText.trim()}
					>
						Clear
					</button>
					<button
						className="btn btn-secondary"
						onClick={undo}
						disabled={currentHistoryIndex >= sqlHistory.length - 1}
					>
						Undo
					</button>
					<button
						className="btn btn-secondary"
						onClick={redo}
						disabled={currentHistoryIndex <= 0}
					>
						Redo
					</button>
				</div>
			</Box>

			{/* 测试结果 */}
			{testResults && (
				<Box title="Test Results">
					<div className="space-y-4">
						<div className={`flex items-center space-x-2 text-lg ${testResults.success ? 'text-green-600' : 'text-red-600'}`}>
							<span>{testResults.success ? '✅' : '❌'}</span>
							<span className="font-medium">{testResults.message}</span>
						</div>
						
						{testResults.executionTime && (
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
								<div className="text-center">
									<div className="text-2xl font-bold text-blue-600">{testResults.executionTime}ms</div>
									<div className="text-sm text-gray-600">执行时间</div>
								</div>
								{testResults.rowCount !== undefined && (
									<div className="text-center">
										<div className="text-2xl font-bold text-green-600">{testResults.rowCount}</div>
										<div className="text-sm text-gray-600">返回行数</div>
									</div>
								)}
							</div>
						)}
						
						{testResults.errors && testResults.errors.length > 0 && (
							<div className="space-y-2">
								<div className="text-sm font-medium text-red-700">错误详情:</div>
								<ul className="list-disc list-inside space-y-1 text-sm text-red-600">
									{testResults.errors.map((error, index) => (
										<li key={index}>{error}</li>
									))}
								</ul>
							</div>
						)}
						
						{testResults.sampleData && testResults.sampleData.length > 0 && (
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<div className="text-sm font-medium text-gray-700">样本数据:</div>
									<button
										className="text-sm text-blue-600 hover:text-blue-800"
										onClick={() => setShowSampleData(!showSampleData)}
									>
										{showSampleData ? '隐藏' : '显示'}数据
									</button>
								</div>
								
								{showSampleData && (
									<div className="overflow-x-auto">
										<table className="table text-xs">
											<thead>
												<tr>
													{Object.keys(testResults.sampleData[0] || {}).map(key => (
														<th key={key} className="px-2 py-1">{key}</th>
													))}
												</tr>
											</thead>
											<tbody>
												{testResults.sampleData.slice(0, 5).map((row, index) => (
													<tr key={index}>
														{Object.values(row).map((value, colIndex) => (
															<td key={colIndex} className="px-2 py-1 border-t">
																{typeof value === 'string' && value.length > 50 
																	? value.substring(0, 50) + '...' 
																	: String(value)
																}
															</td>
														))}
													</tr>
												))}
											</tbody>
										</table>
										{testResults.sampleData.length > 5 && (
											<div className="text-xs text-gray-500 mt-2">
												显示前5行，共 {testResults.sampleData.length} 行
											</div>
										)}
									</div>
								)}
							</div>
						)}
					</div>
				</Box>
			)}

			{/* 操作按钮 */}
			<div className="flex gap-3">
				<Link to="/step-3" className="btn btn-secondary">
					Back to Step 3
				</Link>
				<Link to="/step-5" className="btn">
					Continue to Step 5
				</Link>
			</div>
		</div>
	)
}


