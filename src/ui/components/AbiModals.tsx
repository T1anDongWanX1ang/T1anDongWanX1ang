import { useState, useEffect } from 'react'
import { AbiService, ContractAbi } from '../../services/abiService'
import { useToast } from './Toast'

interface BaseModalProps {
	isOpen: boolean
	onClose: () => void
	onSuccess: () => void
}

interface AddAbiModalProps extends BaseModalProps {}
interface EditAbiModalProps extends BaseModalProps {
	abi: ContractAbi
}
interface ViewAbiModalProps extends BaseModalProps {
	abi: ContractAbi
}
interface UploadAbiModalProps extends BaseModalProps {}

// 添加ABI模态框
export function AddAbiModal({ isOpen, onClose, onSuccess }: AddAbiModalProps) {
	const toast = useToast()
	const [formData, setFormData] = useState({
		contract_address: '',
		contract_name: '',
		chain_name: 'ethereum',
		abi_content: '',
		source_type: 'manual' as 'manual' | 'auto_fetch'
	})
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [isAutoFetch, setIsAutoFetch] = useState(false)
	const [abiStats, setAbiStats] = useState<{functions: number, events: number} | null>(null)

	const supportedChains = [
		{ value: 'ethereum', label: 'Ethereum' },
		{ value: 'polygon', label: 'Polygon' },
		{ value: 'bsc', label: 'BSC' },
		{ value: 'arbitrum', label: 'Arbitrum' },
		{ value: 'optimism', label: 'Optimism' }
	]

	// 重置表单
	const resetForm = () => {
		setFormData({
			contract_address: '',
			contract_name: '',
			chain_name: 'ethereum',
			abi_content: '',
			source_type: 'manual'
		})
		setError('')
		setIsAutoFetch(false)
		setAbiStats(null)
	}

	// 自动获取ABI
	const handleAutoFetch = async () => {
		if (!formData.contract_address || !formData.chain_name) {
			setError('请先填写合约地址和选择区块链')
			return
		}

		if (!AbiService.validateContractAddress(formData.contract_address, formData.chain_name)) {
			setError('合约地址格式不正确')
			return
		}

		setLoading(true)
		setError('')

		try {
			const response = await AbiService.autoFetchAbi({
				contract_address: formData.contract_address,
				chain_name: formData.chain_name
			})

			if (response.success) {
				const formattedAbi = JSON.stringify(response.data.abi_content, null, 2)
				setFormData(prev => ({
					...prev,
					abi_content: formattedAbi,
					source_type: 'auto_fetch'
				}))
				setIsAutoFetch(true)
				
				// 提取ABI统计信息用于显示
				const abiArray = response.data.abi_content
				const functions = abiArray?.filter((item: any) => item.type === 'function')?.length || 0
				const events = abiArray?.filter((item: any) => item.type === 'event')?.length || 0
				setAbiStats({ functions, events })
				console.log(`🎉 ABI获取成功！包含 ${functions} 个函数，${events} 个事件`)
			} else {
				setError('自动获取ABI失败: ' + response.message)
			}
		} catch (err) {
			setError('自动获取ABI失败: ' + (err instanceof Error ? err.message : '未知错误'))
		} finally {
			setLoading(false)
		}
	}

	// 提交表单
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		
		if (!formData.contract_address || !formData.chain_name || !formData.abi_content.trim()) {
			setError('请填写所有必填字段')
			return
		}

		if (!AbiService.validateContractAddress(formData.contract_address, formData.chain_name)) {
			setError('合约地址格式不正确')
			return
		}

		// 验证ABI内容是否为有效JSON
		try {
			JSON.parse(formData.abi_content)
		} catch {
			setError('ABI内容不是有效的JSON格式')
			return
		}

		setLoading(true)
		setError('')

		try {
			const response = await AbiService.createAbi({
				contract_address: formData.contract_address,
				chain_name: formData.chain_name,
				abi_content: JSON.parse(formData.abi_content),
				source_type: formData.source_type
			})

			if (response.success) {
				onSuccess()
				onClose()
				resetForm()
			} else {
				setError('创建ABI失败: ' + response.message)
			}
		} catch (err) {
			setError('创建ABI失败: ' + (err instanceof Error ? err.message : '未知错误'))
		} finally {
			setLoading(false)
		}
	}

	// 模态框关闭时重置表单
	useEffect(() => {
		if (!isOpen) {
			resetForm()
		}
	}, [isOpen])

	if (!isOpen) return null

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<h2 className="text-xl font-semibold text-gray-900">添加ABI</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
					>
						×
					</button>
				</div>

				<form onSubmit={handleSubmit} className="flex flex-col h-full">
					<div className="flex-1 overflow-auto p-6">
						{error && (
							<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
								<p className="text-sm text-red-600">{error}</p>
							</div>
						)}

						<div className="space-y-6">
							{/* 合约名称 */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									合约名称
									<span className="text-gray-500 text-xs ml-2">(可选，便于识别)</span>
								</label>
								<input
									type="text"
									value={formData.contract_name}
									onChange={(e) => setFormData(prev => ({ ...prev, contract_name: e.target.value.trim() }))}
									placeholder="例如: USDT, UniswapV3Pool, 等..."
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
								<p className="mt-1 text-xs text-gray-500">
									为合约设置一个易记的名称，方便后续管理和识别
								</p>
							</div>

							{/* 合约地址 */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									合约地址 <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={formData.contract_address}
									onChange={(e) => setFormData(prev => ({ ...prev, contract_address: e.target.value.trim() }))}
									placeholder="0x..."
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									required
								/>
							</div>

							{/* 区块链选择 */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									区块链 <span className="text-red-500">*</span>
								</label>
								<select
									value={formData.chain_name}
									onChange={(e) => setFormData(prev => ({ ...prev, chain_name: e.target.value }))}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									required
								>
									{supportedChains.map(chain => (
										<option key={chain.value} value={chain.value}>
											{chain.label}
										</option>
									))}
								</select>
							</div>

							{/* 自动获取ABI */}
							<div className="bg-blue-50 p-4 rounded-md">
								<div className="flex items-center justify-between mb-2">
									<div>
										<h4 className="font-medium text-blue-900">自动获取ABI</h4>
										<p className="text-sm text-blue-700">从区块链浏览器自动获取合约ABI</p>
									</div>
									<button
										type="button"
										onClick={handleAutoFetch}
										disabled={loading || !formData.contract_address}
										className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										{loading ? '获取中...' : '自动获取'}
									</button>
								</div>
								{isAutoFetch && (
									<div className="text-sm text-green-700 flex items-center gap-2">
										<span className="text-green-500">✓</span>
										<div>
											<div>ABI已自动获取成功</div>
											{abiStats && (
												<div className="text-xs text-green-600 mt-1">
													包含 {abiStats.functions} 个函数，{abiStats.events} 个事件，已格式化显示
												</div>
											)}
										</div>
									</div>
								)}
							</div>

							{/* ABI内容 */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									ABI内容 <span className="text-red-500">*</span>
								</label>
								<textarea
									value={formData.abi_content}
									onChange={(e) => setFormData(prev => ({ ...prev, abi_content: e.target.value }))}
									placeholder="请输入ABI JSON内容或使用上方的自动获取功能..."
									className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-y overflow-y-scroll"
									required
								/>
								<p className="mt-2 text-sm text-gray-500">
									{isAutoFetch && formData.abi_content ? (
										<>
											<span className="text-green-600">✓ ABI内容已自动获取并格式化</span>
											{abiStats && (
												<span className="ml-2 text-gray-400">
													({abiStats.functions} 个函数, {abiStats.events} 个事件)
												</span>
											)}
										</>
									) : (
										'请输入有效的JSON格式的ABI内容，或使用上方的自动获取功能'
									)}
								</p>
							</div>
						</div>
					</div>

					<div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
						>
							取消
						</button>
						<button
							type="submit"
							disabled={loading}
							className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{loading ? '创建中...' : '创建ABI'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}

// 编辑ABI模态框
export function EditAbiModal({ isOpen, onClose, onSuccess, abi }: EditAbiModalProps) {
	const [formData, setFormData] = useState({
		contract_address: '',
		contract_name: '',
		chain_name: '',
		abi_content: ''
	})
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	const supportedChains = [
		{ value: 'ethereum', label: 'Ethereum' },
		{ value: 'polygon', label: 'Polygon' },
		{ value: 'bsc', label: 'BSC' },
		{ value: 'arbitrum', label: 'Arbitrum' },
		{ value: 'optimism', label: 'Optimism' }
	]

	// 初始化表单数据
	useEffect(() => {
		if (isOpen && abi) {
			setFormData({
				contract_address: abi.contract_address,
				contract_name: abi.contract_name || '',
				chain_name: abi.chain_name,
				abi_content: JSON.stringify(abi.abi_content, null, 2)
			})
			setError('')
		}
	}, [isOpen, abi])

	// 提交表单
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		
		if (!formData.contract_address || !formData.chain_name || !formData.abi_content.trim()) {
			setError('请填写所有必填字段')
			return
		}

		if (!AbiService.validateContractAddress(formData.contract_address, formData.chain_name)) {
			setError('合约地址格式不正确')
			return
		}

		// 验证ABI内容是否为有效JSON
		try {
			JSON.parse(formData.abi_content)
		} catch {
			setError('ABI内容不是有效的JSON格式')
			return
		}

		setLoading(true)
		setError('')

		try {
			const response = await AbiService.updateAbi(abi.id, {
				contract_address: formData.contract_address,
				chain_name: formData.chain_name,
				abi_content: JSON.parse(formData.abi_content)
			})

			if (response.success) {
				onSuccess()
				onClose()
			} else {
				setError('更新ABI失败: ' + response.message)
			}
		} catch (err) {
			setError('更新ABI失败: ' + (err instanceof Error ? err.message : '未知错误'))
		} finally {
			setLoading(false)
		}
	}

	if (!isOpen) return null

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<h2 className="text-xl font-semibold text-gray-900">编辑ABI</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
					>
						×
					</button>
				</div>

				<form onSubmit={handleSubmit} className="flex flex-col h-full">
					<div className="flex-1 overflow-auto p-6">
						{error && (
							<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
								<p className="text-sm text-red-600">{error}</p>
							</div>
						)}

						<div className="space-y-6">
							{/* ABI ID (只读) */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									ABI ID
								</label>
								<input
									type="text"
									value={abi.id}
									disabled
									className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-500"
								/>
							</div>

							{/* 合约名称 */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									合约名称
									<span className="text-gray-500 text-xs ml-2">(可选，便于识别)</span>
								</label>
								<input
									type="text"
									value={formData.contract_name}
									onChange={(e) => setFormData(prev => ({ ...prev, contract_name: e.target.value.trim() }))}
									placeholder="例如: USDT, UniswapV3Pool, 等..."
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>

							{/* 合约地址 */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									合约地址 <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={formData.contract_address}
									onChange={(e) => setFormData(prev => ({ ...prev, contract_address: e.target.value.trim() }))}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									required
								/>
							</div>

							{/* 区块链选择 */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									区块链 <span className="text-red-500">*</span>
								</label>
								<select
									value={formData.chain_name}
									onChange={(e) => setFormData(prev => ({ ...prev, chain_name: e.target.value }))}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									required
								>
									{supportedChains.map(chain => (
										<option key={chain.value} value={chain.value}>
											{chain.label}
										</option>
									))}
								</select>
							</div>

							{/* ABI内容 */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									ABI内容 <span className="text-red-500">*</span>
								</label>
								<textarea
									value={formData.abi_content}
									onChange={(e) => setFormData(prev => ({ ...prev, abi_content: e.target.value }))}
									className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-y overflow-y-scroll"
									required
								/>
								<p className="mt-2 text-sm text-gray-500">
									请输入有效的JSON格式的ABI内容
								</p>
							</div>
						</div>
					</div>

					<div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
						>
							取消
						</button>
						<button
							type="submit"
							disabled={loading}
							className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{loading ? '保存中...' : '保存更改'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}

// 查看ABI模态框
export function ViewAbiModal({ isOpen, onClose, abi }: ViewAbiModalProps) {
	const [activeTab, setActiveTab] = useState<'raw' | 'functions' | 'events'>('raw')

	if (!isOpen) return null

	const functions = AbiService.extractFunctionNames(abi.abi_content)
	const events = AbiService.extractEventNames(abi.abi_content)

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<div>
						<h2 className="text-xl font-semibold text-gray-900">查看ABI详情</h2>
						<p className="text-sm text-gray-500 mt-1">
							{abi.contract_address} ({abi.chain_name})
						</p>
					</div>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
					>
						×
					</button>
				</div>

				<div className="flex flex-col h-full">
					{/* ABI信息摘要 */}
					<div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
							<div>
								<span className="font-medium text-gray-700">来源类型：</span>
								<span className={`ml-2 px-2 py-1 rounded-full text-xs ${
									abi.source_type === 'auto_fetch' 
										? 'bg-green-100 text-green-800' 
										: 'bg-yellow-100 text-yellow-800'
								}`}>
									{abi.source_type === 'auto_fetch' ? '自动获取' : '手动添加'}
								</span>
							</div>
							<div>
								<span className="font-medium text-gray-700">函数数量：</span>
								<span className="ml-2 text-blue-600">{functions.length}</span>
							</div>
							<div>
								<span className="font-medium text-gray-700">事件数量：</span>
								<span className="ml-2 text-purple-600">{events.length}</span>
							</div>
							<div>
								<span className="font-medium text-gray-700">创建时间：</span>
								<span className="ml-2 text-gray-600">{new Date(abi.created_at).toLocaleDateString('zh-CN')}</span>
							</div>
						</div>
					</div>

					{/* 标签页 */}
					<div className="border-b border-gray-200">
						<div className="flex">
							<button
								onClick={() => setActiveTab('raw')}
								className={`px-4 py-2 text-sm font-medium border-b-2 ${
									activeTab === 'raw'
										? 'border-blue-500 text-blue-600'
										: 'border-transparent text-gray-500 hover:text-gray-700'
								}`}
							>
								原始ABI
							</button>
							<button
								onClick={() => setActiveTab('functions')}
								className={`px-4 py-2 text-sm font-medium border-b-2 ${
									activeTab === 'functions'
										? 'border-blue-500 text-blue-600'
										: 'border-transparent text-gray-500 hover:text-gray-700'
								}`}
							>
								函数列表 ({functions.length})
							</button>
							<button
								onClick={() => setActiveTab('events')}
								className={`px-4 py-2 text-sm font-medium border-b-2 ${
									activeTab === 'events'
										? 'border-blue-500 text-blue-600'
										: 'border-transparent text-gray-500 hover:text-gray-700'
								}`}
							>
								事件列表 ({events.length})
							</button>
						</div>
					</div>

					{/* 标签页内容 */}
					<div className="flex-1 overflow-auto p-6">
						{activeTab === 'raw' && (
							<div>
								<div className="mb-4">
									<h3 className="text-lg font-medium text-gray-900 mb-2">ABI JSON内容</h3>
									<button
										onClick={() => {
											const text = AbiService.formatAbiForDisplay(abi.abi_content)
											navigator.clipboard.writeText(text)
										}}
										className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
									>
										复制到剪贴板
									</button>
								</div>
								<pre className="bg-gray-50 p-4 rounded-md overflow-auto text-sm max-h-96">
									<code>{AbiService.formatAbiForDisplay(abi.abi_content)}</code>
								</pre>
							</div>
						)}

						{activeTab === 'functions' && (
							<div>
								<h3 className="text-lg font-medium text-gray-900 mb-4">合约函数列表</h3>
								{functions.length > 0 ? (
									<div className="space-y-2">
										{functions.map((func, index) => (
											<div key={index} className="p-3 bg-blue-50 rounded-md">
												<span className="font-mono text-sm text-blue-900">{func}()</span>
											</div>
										))}
									</div>
								) : (
									<div className="text-center py-8 text-gray-500">
										未找到函数定义
									</div>
								)}
							</div>
						)}

						{activeTab === 'events' && (
							<div>
								<h3 className="text-lg font-medium text-gray-900 mb-4">合约事件列表</h3>
								{events.length > 0 ? (
									<div className="space-y-2">
										{events.map((event, index) => (
											<div key={index} className="p-3 bg-purple-50 rounded-md">
												<span className="font-mono text-sm text-purple-900">{event}</span>
											</div>
										))}
									</div>
								) : (
									<div className="text-center py-8 text-gray-500">
										未找到事件定义
									</div>
								)}
							</div>
						)}
					</div>

					<div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200">
						<button
							onClick={onClose}
							className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
						>
							关闭
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

// 上传ABI文件模态框
export function UploadAbiModal({ isOpen, onClose, onSuccess }: UploadAbiModalProps) {
	const [formData, setFormData] = useState({
		contract_address: '',
		contract_name: '',
		chain_name: 'ethereum'
	})
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [dragActive, setDragActive] = useState(false)

	const supportedChains = [
		{ value: 'ethereum', label: 'Ethereum' },
		{ value: 'polygon', label: 'Polygon' },
		{ value: 'bsc', label: 'BSC' },
		{ value: 'arbitrum', label: 'Arbitrum' },
		{ value: 'optimism', label: 'Optimism' }
	]

	// 重置表单
	const resetForm = () => {
		setFormData({
			contract_address: '',
			contract_name: '',
			chain_name: 'ethereum'
		})
		setSelectedFile(null)
		setError('')
		setDragActive(false)
	}

	// 处理文件选择
	const handleFileSelect = (file: File) => {
		if (!file.name.toLowerCase().endsWith('.json')) {
			setError('请选择JSON格式的ABI文件')
			return
		}
		
		if (file.size > 1024 * 1024) { // 1MB限制
			setError('文件大小不能超过1MB')
			return
		}

		setSelectedFile(file)
		setError('')
	}

	// 处理拖放
	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		setDragActive(false)
		
		const files = e.dataTransfer.files
		if (files.length > 0) {
			handleFileSelect(files[0])
		}
	}

	// 提交表单
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		
		if (!formData.contract_address || !formData.chain_name || !selectedFile) {
			setError('请填写所有必填字段并选择文件')
			return
		}

		if (!AbiService.validateContractAddress(formData.contract_address, formData.chain_name)) {
			setError('合约地址格式不正确')
			return
		}

		setLoading(true)
		setError('')

		try {
			const response = await AbiService.uploadAbiFile(
				selectedFile,
				formData.chain_name,
				formData.contract_address
			)

			if (response.success) {
				onSuccess()
				onClose()
				resetForm()
			} else {
				setError('上传文件失败: ' + response.message)
			}
		} catch (err) {
			setError('上传文件失败: ' + (err instanceof Error ? err.message : '未知错误'))
		} finally {
			setLoading(false)
		}
	}

	// 模态框关闭时重置表单
	useEffect(() => {
		if (!isOpen) {
			resetForm()
		}
	}, [isOpen])

	if (!isOpen) return null

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<h2 className="text-xl font-semibold text-gray-900">上传ABI文件</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
					>
						×
					</button>
				</div>

				<form onSubmit={handleSubmit} className="p-6">
					{error && (
						<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
							<p className="text-sm text-red-600">{error}</p>
						</div>
					)}

					<div className="space-y-6">
						{/* 合约名称 */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								合约名称
								<span className="text-gray-500 text-xs ml-2">(可选，便于识别)</span>
							</label>
							<input
								type="text"
								value={formData.contract_name}
								onChange={(e) => setFormData(prev => ({ ...prev, contract_name: e.target.value.trim() }))}
								placeholder="例如: USDT, UniswapV3Pool, 等..."
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>

						{/* 合约地址 */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								合约地址 <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={formData.contract_address}
								onChange={(e) => setFormData(prev => ({ ...prev, contract_address: e.target.value.trim() }))}
								placeholder="0x..."
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								required
							/>
						</div>

						{/* 区块链选择 */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								区块链 <span className="text-red-500">*</span>
							</label>
							<select
								value={formData.chain_name}
								onChange={(e) => setFormData(prev => ({ ...prev, chain_name: e.target.value }))}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								required
							>
								{supportedChains.map(chain => (
									<option key={chain.value} value={chain.value}>
										{chain.label}
									</option>
								))}
							</select>
						</div>

						{/* 文件上传区域 */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								ABI文件 <span className="text-red-500">*</span>
							</label>
							<div
								className={`border-2 border-dashed rounded-lg p-6 text-center ${
									dragActive 
										? 'border-blue-500 bg-blue-50' 
										: 'border-gray-300 hover:border-gray-400'
								}`}
								onDragEnter={(e) => {
									e.preventDefault()
									setDragActive(true)
								}}
								onDragLeave={(e) => {
									e.preventDefault()
									setDragActive(false)
								}}
								onDragOver={(e) => e.preventDefault()}
								onDrop={handleDrop}
							>
								{selectedFile ? (
									<div className="space-y-2">
										<div className="text-lg text-green-600">✓</div>
										<div className="text-sm font-medium text-gray-900">{selectedFile.name}</div>
										<div className="text-xs text-gray-500">
											{(selectedFile.size / 1024).toFixed(1)} KB
										</div>
										<button
											type="button"
											onClick={() => setSelectedFile(null)}
											className="text-sm text-red-600 hover:text-red-800"
										>
											移除文件
										</button>
									</div>
								) : (
									<div className="space-y-2">
										<div className="text-4xl text-gray-400">📁</div>
										<div className="text-sm font-medium text-gray-900">
											拖拽文件到此处，或者
										</div>
										<label className="cursor-pointer">
											<span className="text-sm text-blue-600 hover:text-blue-800 font-medium">
												点击选择文件
											</span>
											<input
												type="file"
												accept=".json"
												className="hidden"
												onChange={(e) => {
													const file = e.target.files?.[0]
													if (file) handleFileSelect(file)
												}}
											/>
										</label>
										<div className="text-xs text-gray-500">
											支持JSON格式，最大1MB
										</div>
									</div>
								)}
							</div>
						</div>
					</div>

					<div className="flex items-center justify-end gap-4 mt-6">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
						>
							取消
						</button>
						<button
							type="submit"
							disabled={loading}
							className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{loading ? '上传中...' : '上传文件'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}