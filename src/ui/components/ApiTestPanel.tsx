import { useState } from 'react'
import { fieldParsingAPI, chainAPI } from '../../services/api'
import { currentConfig } from '../../config/environment'
import Box from './Box'

export default function ApiTestPanel() {
	const [testResults, setTestResults] = useState<Array<{name: string, status: 'pending' | 'success' | 'error', message: string}>>([])
	const [isTesting, setIsTesting] = useState(false)

	const runApiTests = async () => {
		setIsTesting(true)
		setTestResults([])

		const tests = [
			{
				name: '连接测试',
				test: async () => {
					try {
						const response = await fetch(`${currentConfig.apiBaseUrl}/docs`)
						return response.ok ? '✅ 连接成功' : '❌ 连接失败'
					} catch (error) {
						return `❌ 连接错误: ${error instanceof Error ? error.message : '未知错误'}`
					}
				}
			},
			{
				name: '字段解析API测试',
				test: async () => {
					try {
						const response = await fieldParsingAPI.parseFields({
							chain_name: 'ethereum',
							contract_address: '0xA0b86a33E6441b8c4C8C1C1C1C1C1C1C1C1C1C1C1C1',
							abi_path: '/abis/erc20.json',
							events_to_monitor: ['Transfer'],
							mode: 'realtime',
							poll_interval: 1.0
						})
						return response.success ? '✅ API调用成功' : `❌ API返回失败: ${response.data.message}`
					} catch (error) {
						return `❌ API调用错误: ${error instanceof Error ? error.message : '未知错误'}`
					}
				}
			},
			{
				name: '字段建议API测试',
				test: async () => {
					try {
						const response = await fieldParsingAPI.getFieldSuggestions('ethereum', 'dex')
						return response.success ? '✅ API调用成功' : `❌ API返回失败: ${response.data.message}`
					} catch (error) {
						return `❌ API调用错误: ${error instanceof Error ? error.message : '未知错误'}`
					}
				}
			},
			{
				name: '链配置API测试',
				test: async () => {
					try {
						const response = await chainAPI.getChainConfig('ethereum')
						return '✅ API调用成功'
					} catch (error) {
						return `❌ API调用错误: ${error instanceof Error ? error.message : '未知错误'}`
					}
				}
			}
		]

		for (const test of tests) {
			setTestResults(prev => [...prev, { name: test.name, status: 'pending', message: '测试中...' }])
			
			try {
				const result = await test.test()
				setTestResults(prev => prev.map(t => 
					t.name === test.name 
						? { ...t, status: 'success', message: result }
						: t
				))
			} catch (error) {
				setTestResults(prev => prev.map(t => 
					t.name === test.name 
						? { ...t, status: 'error', message: `❌ 测试异常: ${error instanceof Error ? error.message : '未知错误'}` }
						: t
				))
			}
		}

		setIsTesting(false)
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'success': return 'text-green-600'
			case 'error': return 'text-red-600'
			case 'pending': return 'text-yellow-600'
			default: return 'text-gray-600'
		}
	}

	return (
		<Box title="API连接测试" right={
			<button 
				className="btn btn-secondary" 
				onClick={runApiTests}
				disabled={isTesting}
			>
				{isTesting ? '测试中...' : '运行测试'}
			</button>
		}>
			<div className="space-y-4">
				{/* 当前配置信息 */}
				<div className="bg-gray-50 p-4 rounded-lg">
					<h4 className="font-medium text-gray-700 mb-2">当前API配置</h4>
					<div className="grid grid-cols-2 gap-2 text-sm">
						<div>
							<span className="text-gray-500">API地址:</span>
							<span className="ml-2 font-mono">{currentConfig.apiBaseUrl}</span>
						</div>
						<div>
							<span className="text-gray-500">超时时间:</span>
							<span className="ml-2">{currentConfig.apiTimeout}ms</span>
						</div>
						<div>
							<span className="text-gray-500">重试次数:</span>
							<span className="ml-2">{currentConfig.apiRetryAttempts}</span>
						</div>
						<div>
							<span className="text-gray-500">调试模式:</span>
							<span className="ml-2">{currentConfig.enableDebug ? '开启' : '关闭'}</span>
						</div>
					</div>
				</div>

				{/* 测试结果 */}
				{testResults.length > 0 && (
					<div>
						<h4 className="font-medium text-gray-700 mb-2">测试结果</h4>
						<div className="space-y-2">
							{testResults.map((result, index) => (
								<div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
									<span className="font-medium">{result.name}</span>
									<span className={getStatusColor(result.status)}>
										{result.message}
									</span>
								</div>
							))}
						</div>
					</div>
				)}

				{/* 使用说明 */}
				<div className="bg-blue-50 p-4 rounded-lg">
					<h4 className="font-medium text-blue-700 mb-2">使用说明</h4>
					<div className="text-sm text-blue-600 space-y-1">
						<div>• 点击"运行测试"按钮开始API连接测试</div>
						<div>• 测试将验证与后端服务的连接状态</div>
						<div>• 如果测试失败，请检查网络连接和后端服务状态</div>
						<div>• 确保后端服务地址 {currentConfig.apiBaseUrl} 可以访问</div>
					</div>
				</div>
			</div>
		</Box>
	)
}
