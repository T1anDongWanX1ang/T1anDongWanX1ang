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
				name: 'Connection Test',
				test: async () => {
					try {
						const response = await fetch(`${currentConfig.apiBaseUrl}/docs`)
						return response.ok ? '✅ Connection successful' : '❌ Connection failed'
					} catch (error) {
						return `❌ Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
					}
				}
			},
			{
				name: 'Field Parsing API Test',
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
						return response.success ? '✅ API call successful' : `❌ API returned failure: ${response.data.message}`
					} catch (error) {
						return `❌ API call error: ${error instanceof Error ? error.message : 'Unknown error'}`
					}
				}
			},
			{
				name: 'Field Suggestion API Test',
				test: async () => {
					try {
						const response = await fieldParsingAPI.getFieldSuggestions('ethereum', 'dex')
						return response.success ? '✅ API call successful' : `❌ API returned failure: ${response.data.message}`
					} catch (error) {
						return `❌ API call error: ${error instanceof Error ? error.message : 'Unknown error'}`
					}
				}
			},
			{
				name: 'Chain Configuration API Test',
				test: async () => {
					try {
						const response = await chainAPI.getChainConfig('ethereum')
						return '✅ API call successful'
					} catch (error) {
						return `❌ API call error: ${error instanceof Error ? error.message : 'Unknown error'}`
					}
				}
			}
		]

		for (const test of tests) {
			setTestResults(prev => [...prev, { name: test.name, status: 'pending', message: 'Testing...' }])
			
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
						? { ...t, status: 'error', message: `❌ Test exception: ${error instanceof Error ? error.message : 'Unknown error'}` }
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
		<Box title="API Connection Test" right={
			<button 
				className="btn btn-secondary" 
				onClick={runApiTests}
				disabled={isTesting}
			>
				{isTesting ? 'Testing...' : 'Run Tests'}
			</button>
		}>
			<div className="space-y-4">
				{/* 当前配置信息 */}
				<div className="bg-gray-50 p-4 rounded-lg">
					<h4 className="font-medium text-gray-700 mb-2">Current API Configuration</h4>
					<div className="grid grid-cols-2 gap-2 text-sm">
						<div>
							<span className="text-gray-500">API Address:</span>
							<span className="ml-2 font-mono">{currentConfig.apiBaseUrl}</span>
						</div>
						<div>
							<span className="text-gray-500">Timeout:</span>
							<span className="ml-2">{currentConfig.apiTimeout}ms</span>
						</div>
						<div>
							<span className="text-gray-500">Retry Attempts:</span>
							<span className="ml-2">{currentConfig.apiRetryAttempts}</span>
						</div>
						<div>
							<span className="text-gray-500">Debug Mode:</span>
							<span className="ml-2">{currentConfig.enableDebug ? 'Enabled' : 'Disabled'}</span>
						</div>
					</div>
				</div>

				{/* 测试结果 */}
				{testResults.length > 0 && (
					<div>
						<h4 className="font-medium text-gray-700 mb-2">Test Results</h4>
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
					<h4 className="font-medium text-blue-700 mb-2">Usage Instructions</h4>
					<div className="text-sm text-blue-600 space-y-1">
						<div>• Click "Run Tests" button to start API connection testing</div>
						<div>• Tests will verify connection status with backend services</div>
						<div>• If tests fail, please check network connection and backend service status</div>
						<div>• Ensure backend service address {currentConfig.apiBaseUrl} is accessible</div>
					</div>
				</div>
			</div>
		</Box>
	)
}
