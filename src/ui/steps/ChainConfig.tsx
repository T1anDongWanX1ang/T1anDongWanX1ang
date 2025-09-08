import Box from '../components/Box'
import { Link } from 'react-router-dom'
import { useAppState } from '../../state/AppState'
import { useState, useEffect } from 'react'
import { chainAPI } from '../../services/api'

export default function ChainConfig() {
	const { currentChainId, chains, setCurrentChain } = useAppState()
	const [isLoading, setIsLoading] = useState(false)
	const [testResults, setTestResults] = useState<{
		[chainId: string]: {
			success: boolean
			message: string
			latency?: number
			blockHeight?: number
			details?: any
		}
	}>({})
	const [editingChain, setEditingChain] = useState<string | null>(null)
	const [editForm, setEditForm] = useState({
		rpcUrl: '',
		wsUrl: '',
		chainId: 1,
		apiKey: '',
		network: 'mainnet'
	})
	
	const currentChain = chains.find(c => c.id === currentChainId)

	// 初始化编辑表单
	useEffect(() => {
		if (currentChain) {
			setEditForm({
				rpcUrl: currentChain.nodeConfig.rpcUrl || '',
				wsUrl: currentChain.nodeConfig.wsUrl || '',
				chainId: currentChain.nodeConfig.chainId || 1,
				apiKey: '',
				network: 'mainnet'
			})
		}
	}, [currentChain])

	// 开始编辑链配置
	const startEditing = (chainId: string) => {
		const chain = chains.find(c => c.id === chainId)
		if (chain) {
			setEditingChain(chainId)
					setEditForm({
			rpcUrl: chain.nodeConfig.rpcUrl || '',
			wsUrl: chain.nodeConfig.wsUrl || '',
			chainId: chain.nodeConfig.chainId || 1,
			apiKey: '',
			network: 'mainnet'
		})
		}
	}

	// 取消编辑
	const cancelEditing = () => {
		setEditingChain(null)
		setEditForm({
			rpcUrl: '',
			wsUrl: '',
			chainId: 1,
			apiKey: '',
			network: 'mainnet'
		})
	}

	// 保存链配置
	const saveChainConfig = async () => {
		if (!editingChain) return

		setIsLoading(true)
		try {
			// 调用后端API保存链配置
			const response = await chainAPI.updateChainConfig(
				chains.find(c => c.id === editingChain)?.chain.toLowerCase() || 'ethereum',
				{
					rpc_url: editForm.rpcUrl,
					ws_url: editForm.wsUrl,
					chain_id: editForm.chainId,
					api_key: editForm.apiKey,
					network: editForm.network,
					updated_at: new Date().toISOString()
				}
			)

			if ((response as any).success) {
				// 更新本地状态
				// 这里应该调用AppState中的更新函数
				setEditingChain(null)
				setTestResults(prev => ({ ...prev, [editingChain!]: { success: true, message: 'Configuration saved' } }))
			}
		} catch (error) {
			console.error('Save chain config failed:', error)
		} finally {
			setIsLoading(false)
		}
	}

	// 测试RPC连接
	const testRPCConnection = async (chainId: string) => {
		const chain = chains.find(c => c.id === chainId)
		if (!chain) return

		setIsLoading(true)
		setTestResults(prev => ({ ...prev, [chainId]: { success: false, message: 'Testing...' } }))

		try {
			const startTime = Date.now()
			
			// 调用后端API测试RPC连接
			const response = await chainAPI.testRPCConnection(
				chain.chain.toLowerCase(),
				chain.nodeConfig.rpcUrl,
				editForm.apiKey || ''
			)

			const latency = Date.now() - startTime

			if ((response as any).success) {
				setTestResults(prev => ({
					...prev,
					[chainId]: {
						success: true,
						message: 'RPC connection successful',
						latency,
						blockHeight: (response as any).data?.block_height,
						details: (response as any).data
					}
				}))
			} else {
				setTestResults(prev => ({
					...prev,
					[chainId]: {
						success: false,
						message: `RPC connection failed: ${(response as any).data?.message}`,
						latency,
						details: (response as any).data
					}
				}))
			}
		} catch (error) {
			console.error('RPC connection test failed:', error)
			setTestResults(prev => ({
				...prev,
				[chainId]: {
					success: false,
					message: 'RPC connection test exception',
					latency: 0,
					details: { error: (error as any).message }
				}
			}))
		} finally {
			setIsLoading(false)
		}
	}

	// 测试WebSocket连接
	const testWSConnection = async (chainId: string) => {
		const chain = chains.find(c => c.id === chainId)
		if (!chain) return

		setIsLoading(true)
		setTestResults(prev => ({ ...prev, [chainId]: { success: false, message: 'Testing...' } }))

		try {
			const startTime = Date.now()
			
			// 调用后端API测试WebSocket连接
			const response = await chainAPI.testWSConnection(
				chain.chain.toLowerCase(),
				chain.nodeConfig.wsUrl,
				editForm.apiKey || ''
			)

			const latency = Date.now() - startTime

			if ((response as any).success) {
				setTestResults(prev => ({
					...prev,
					[chainId]: {
						success: true,
						message: 'WebSocket连接成功',
						latency,
						details: (response as any).data
					}
				}))
			} else {
				setTestResults(prev => ({
					...prev,
					[chainId]: {
						success: false,
						message: `WebSocket连接失败: ${(response as any).data?.message}`,
						latency,
						details: (response as any).data
					}
				}))
			}
		} catch (error) {
			console.error('WebSocket connection test failed:', error)
			setTestResults(prev => ({
				...prev,
				[chainId]: {
					success: false,
					message: 'WebSocket连接测试异常',
					latency: 0,
					details: { error: (error as any).message }
				}
			}))
		} finally {
			setIsLoading(false)
		}
	}

	// 运行完整连接测试
	const runFullConnectionTest = async (chainId: string) => {
		const chain = chains.find(c => c.id === chainId)
		if (!chain) return

		setIsLoading(true)
		setTestResults(prev => ({ ...prev, [chainId]: { success: false, message: 'Testing...' } }))

		try {
			// 并行测试RPC和WebSocket连接
			const [rpcTest, wsTest] = await Promise.allSettled([
				testRPCConnection(chainId),
				testWSConnection(chainId)
			])

			// 计算整体结果
			const rpcSuccess = testResults[chainId]?.success ?? false
			const wsSuccess = testResults[chainId]?.success ?? false
			const overallSuccess = rpcSuccess && wsSuccess

			setTestResults(prev => ({
				...prev,
				[chainId]: {
					success: overallSuccess,
					message: overallSuccess ? '所有连接测试通过' : '存在连接问题，请检查配置',
					details: {
						rpc: rpcSuccess ? '✅ 通过' : '❌ 失败',
						websocket: wsSuccess ? '✅ 通过' : '❌ 失败'
					}
				}
			}))
		} catch (error) {
			console.error('Full connection test failed:', error)
			setTestResults(prev => ({
				...prev,
				[chainId]: { success: false, message: '连接测试过程发生错误' }
			}))
		} finally {
			setIsLoading(false)
		}
	}

	// 获取连接状态颜色
	const getStatusColor = (success: boolean | null) => {
		if (success === null) return 'text-gray-500'
		return success ? 'text-green-600' : 'text-red-600'
	}

	// 获取连接状态图标
	const getStatusIcon = (success: boolean | null) => {
		if (success === null) return '⏳'
		return success ? '✅' : '❌'
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Chain Configuration</h2>
				<div className="text-sm text-gray-600">
					RPC连接配置和节点管理
				</div>
			</div>

			{/* 链列表 */}
			{chains.map(chain => (
				<Box key={chain.id} title={`${chain.name} (${chain.chain})`} right={
					<div className="flex gap-2">
						<button
							className="btn btn-secondary text-sm"
							onClick={() => startEditing(chain.id)}
							disabled={editingChain === chain.id}
						>
							{editingChain === chain.id ? '编辑中...' : 'Edit'}
						</button>
						<button
							className="btn btn-secondary text-sm"
							onClick={() => runFullConnectionTest(chain.id)}
							disabled={isLoading}
						>
							{isLoading ? '测试中...' : 'Test All'}
						</button>
						<button
							className="btn text-sm"
							onClick={() => setCurrentChain(chain.id)}
							disabled={currentChainId === chain.id}
						>
							{currentChainId === chain.id ? '当前选中' : 'Select'}
						</button>
					</div>
				}>
					<div className="space-y-4">
						{/* 当前配置显示 */}
						{editingChain !== chain.id && (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										RPC URL
									</label>
									<div className="text-sm text-gray-600 font-mono break-all">
										{chain.nodeConfig.rpcUrl || 'Not configured'}
									</div>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										WebSocket URL
									</label>
									<div className="text-sm text-gray-600 font-mono break-all">
										{chain.nodeConfig.wsUrl || 'Not configured'}
									</div>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Chain ID
									</label>
									<div className="text-sm text-gray-600">
										{chain.nodeConfig.chainId || 'Not set'}
									</div>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Network
									</label>
									<div className="text-sm text-gray-600">
										{'mainnet'}
									</div>
								</div>
							</div>
						)}

						{/* 编辑表单 */}
						{editingChain === chain.id && (
							<div className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											RPC URL *
										</label>
										<input
											type="text"
											className="input"
											value={editForm.rpcUrl}
											onChange={(e) => setEditForm(prev => ({ ...prev, rpcUrl: e.target.value }))}
											placeholder="https://eth-mainnet.g.alchemy.com/v2/..."
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											WebSocket URL
										</label>
										<input
											type="text"
											className="input"
											value={editForm.wsUrl}
											onChange={(e) => setEditForm(prev => ({ ...prev, wsUrl: e.target.value }))}
											placeholder="wss://eth-mainnet.g.alchemy.com/v2/..."
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Chain ID
										</label>
										<input
											type="number"
											className="input"
											value={editForm.chainId}
											onChange={(e) => setEditForm(prev => ({ ...prev, chainId: parseInt(e.target.value) }))}
											min="1"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											API Key
										</label>
										<input
											type="password"
											className="input"
											value={editForm.apiKey}
											onChange={(e) => setEditForm(prev => ({ ...prev, apiKey: e.target.value }))}
											placeholder="Enter API key if required"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											Network
										</label>
										<select
											className="input"
											value={editForm.network}
											onChange={(e) => setEditForm(prev => ({ ...prev, network: e.target.value }))}
										>
											<option value="mainnet">Mainnet</option>
											<option value="testnet">Testnet</option>
											<option value="devnet">Devnet</option>
										</select>
									</div>
								</div>

								<div className="flex gap-2">
									<button
										className="btn btn-secondary"
										onClick={saveChainConfig}
										disabled={isLoading || !editForm.rpcUrl.trim()}
									>
										{isLoading ? '保存中...' : 'Save'}
									</button>
									<button
										className="btn btn-secondary"
										onClick={cancelEditing}
										disabled={isLoading}
									>
										Cancel
									</button>
								</div>
							</div>
						)}

						{/* 连接测试按钮 */}
						{editingChain !== chain.id && (
							<div className="flex gap-2">
								<button
									className="btn btn-secondary text-sm"
									onClick={() => testRPCConnection(chain.id)}
									disabled={isLoading || !chain.nodeConfig.rpcUrl}
								>
									Test RPC
								</button>
								<button
									className="btn btn-secondary text-sm"
									onClick={() => testWSConnection(chain.id)}
									disabled={isLoading || !chain.nodeConfig.wsUrl}
								>
									Test WebSocket
								</button>
							</div>
						)}

						{/* 测试结果 */}
						{testResults[chain.id] && (
							<div className={`p-3 rounded-lg ${
								testResults[chain.id].success ? 'bg-green-50' : 'bg-red-50'
							}`}>
								<div className={`flex items-center space-x-2 text-sm ${getStatusColor(testResults[chain.id].success)}`}>
									<span>{getStatusIcon(testResults[chain.id].success)}</span>
									<span className="font-medium">{testResults[chain.id].message}</span>
								</div>
								
								{testResults[chain.id].latency && (
									<div className="text-xs text-gray-600 mt-1">
										延迟: {testResults[chain.id].latency}ms
									</div>
								)}
								
								{testResults[chain.id].blockHeight && (
									<div className="text-xs text-gray-600 mt-1">
										最新区块: {testResults[chain.id].blockHeight}
									</div>
								)}
								
								{testResults[chain.id].details && (
									<details className="mt-2">
										<summary className="text-xs text-gray-600 cursor-pointer">
											查看详情
										</summary>
										<pre className="text-xs text-gray-600 bg-white p-2 rounded mt-1 overflow-x-auto">
											{JSON.stringify(testResults[chain.id].details, null, 2)}
										</pre>
									</details>
								)}
							</div>
						)}
					</div>
				</Box>
			))}

			{/* 操作按钮 */}
			<div className="flex gap-3">
				<Link to="/step-1" className="btn btn-secondary">
					Continue to Step 1
				</Link>
			</div>
		</div>
	)
}
