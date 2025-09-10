import { useState, useEffect, useRef } from 'react'
import { AbiService, ContractAbi } from '../../services/abiService'
import { useAbiManagementShortcuts } from '../../hooks/useKeyboardShortcuts'

interface AbiManagementProps {
	onOpenModal?: (type: 'add' | 'edit' | 'view' | 'upload', abi?: ContractAbi) => void
	refreshTrigger?: number // 用于触发刷新的属性
}

export default function AbiManagement({ onOpenModal, refreshTrigger }: AbiManagementProps) {
	const [abiList, setAbiList] = useState<ContractAbi[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [currentPage, setCurrentPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [totalItems, setTotalItems] = useState(0)
	const [searchTerm, setSearchTerm] = useState('')
	const [selectedChain, setSelectedChain] = useState('')
	const pageSize = 10
	const searchInputRef = useRef<HTMLInputElement>(null)

	// 支持的区块链列表
	const supportedChains = [
		{ value: '', label: '全部链' },
		{ value: 'ethereum', label: 'Ethereum' },
		{ value: 'polygon', label: 'Polygon' },
		{ value: 'bsc', label: 'BSC' },
		{ value: 'arbitrum', label: 'Arbitrum' },
		{ value: 'optimism', label: 'Optimism' },
		{ value: 'avalanche', label: 'Avalanche' },
		{ value: 'fantom', label: 'Fantom' }
	]

	// 获取ABI列表
	const fetchAbiList = async (page = 1) => {
		try {
			setLoading(true)
			setError(null)
			
			// 智能判断搜索类型：如果包含0x则认为是地址搜索，否则认为是名称搜索
			const isAddressSearch = searchTerm.toLowerCase().includes('0x')
			const params = {
				page,
				size: pageSize,
				...(selectedChain && { chain_name: selectedChain }),
				...(searchTerm && (isAddressSearch 
					? { contract_address: searchTerm }
					: { contract_name: searchTerm }
				))
			}

			const response = await AbiService.getAbiList(params)
			
			if (response.success) {
				setAbiList(response.data.items)
				setTotalPages(response.data.pages)
				setTotalItems(response.data.total)
				setCurrentPage(response.data.page)
			} else {
				setError('获取ABI列表失败')
			}
		} catch (err) {
			console.error('获取ABI列表错误:', err)
			setError(err instanceof Error ? err.message : '获取ABI列表失败')
		} finally {
			setLoading(false)
		}
	}

	// 删除ABI
	const handleDelete = async (abi: ContractAbi) => {
		if (!confirm('确定要删除此ABI记录吗？')) return

		try {
			const response = await AbiService.deleteAbi(abi.contract_address, abi.chain_name)
			if (response.success) {
				// 重新加载列表
				fetchAbiList(currentPage)
			} else {
				alert('删除失败: ' + response.message)
			}
		} catch (err) {
			console.error('删除ABI错误:', err)
			alert('删除失败: ' + (err instanceof Error ? err.message : '未知错误'))
		}
	}

	// 处理搜索
	const handleSearch = () => {
		setCurrentPage(1)
		fetchAbiList(1)
	}

	// 处理链选择变更
	const handleChainChange = (newChain: string) => {
		setSelectedChain(newChain)
		setCurrentPage(1)
	}

	// 重置搜索
	const handleReset = () => {
		setSearchTerm('')
		setSelectedChain('')
		setCurrentPage(1)
		fetchAbiList(1)
	}

	// 格式化地址显示（缩短显示）
	const formatAddress = (address: string) => {
		if (address.length <= 12) return address
		return `${address.slice(0, 6)}...${address.slice(-6)}`
	}

	// 格式化时间显示
	const formatTime = (dateString: string) => {
		try {
			return new Date(dateString).toLocaleString('zh-CN')
		} catch {
			return '无效时间'
		}
	}

	// 组件挂载时获取数据
	useEffect(() => {
		fetchAbiList()
	}, [selectedChain])

	// 监听刷新触发器
	useEffect(() => {
		if (refreshTrigger) {
			fetchAbiList(currentPage)
		}
	}, [refreshTrigger])

	// 键盘快捷键支持
	useAbiManagementShortcuts({
		onAddAbi: () => onOpenModal?.('add'),
		onUploadAbi: () => onOpenModal?.('upload'),
		onRefresh: () => fetchAbiList(currentPage),
		onSearch: () => searchInputRef.current?.focus()
	})

	return (
		<div className="h-full flex flex-col bg-white">
			{/* 标题栏 */}
			<div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">ABI管理</h1>
						<p className="mt-1 text-sm text-gray-600">
							管理智能合约ABI文件，支持手动上传和自动获取
						</p>
					</div>
					<div className="flex gap-3">
						<button
							onClick={() => onOpenModal?.('upload')}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
							title="上传文件 (Ctrl+U)"
						>
							📁 上传文件
						</button>
						<button
							onClick={() => onOpenModal?.('add')}
							className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
							title="添加ABI (Ctrl+N)"
						>
							+ 添加ABI
						</button>
					</div>
				</div>
			</div>

			{/* 搜索和筛选栏 */}
			<div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-b border-gray-200">
				<div className="flex flex-wrap gap-4 items-end">
					<div className="flex-1 min-w-[300px]">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							智能搜索
						</label>
						<div className="flex gap-2">
							<input
								ref={searchInputRef}
								type="text"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								placeholder="输入合约名称或地址进行搜索..."
								className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
							/>
							<button
								onClick={handleSearch}
								className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
							>
								搜索
							</button>
						</div>
						<div className="text-xs text-gray-500 mt-1">
							支持按合约名称或地址搜索
						</div>
					</div>
					
					<div className="min-w-[180px]">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							区块链
						</label>
						<select
							value={selectedChain}
							onChange={(e) => handleChainChange(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
							{supportedChains.map(chain => (
								<option key={chain.value} value={chain.value}>
									{chain.label}
								</option>
							))}
						</select>
					</div>

					<button
						onClick={handleReset}
						className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
					>
						重置
					</button>
				</div>
			</div>

			{/* 统计信息 */}
			<div className="flex-shrink-0 px-6 py-3 bg-gray-50 border-b border-gray-200">
				<div className="text-sm text-gray-600">
					共找到 <span className="font-medium text-gray-900">{totalItems}</span> 个ABI记录
				</div>
			</div>

			{/* ABI列表内容 */}
			<div className="flex-1 overflow-auto">
				{loading ? (
					<div className="flex items-center justify-center h-64">
						<div className="flex items-center gap-3 text-gray-500">
							<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
							<span>加载中...</span>
						</div>
					</div>
				) : error ? (
					<div className="flex items-center justify-center h-64">
						<div className="text-center">
							<div className="text-4xl mb-4">❌</div>
							<div className="text-lg font-medium text-gray-900 mb-2">加载失败</div>
							<div className="text-sm text-gray-500 mb-4">{error}</div>
							<button
								onClick={() => fetchAbiList(currentPage)}
								className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
							>
								重试
							</button>
						</div>
					</div>
				) : abiList.length === 0 ? (
					<div className="flex items-center justify-center h-64">
						<div className="text-center">
							<div className="text-6xl mb-4">📄</div>
							<div className="text-lg font-medium text-gray-900 mb-2">暂无ABI记录</div>
							<div className="text-sm text-gray-500 mb-6">
								{searchTerm || selectedChain ? 
									'没有找到符合条件的ABI记录，请尝试调整搜索条件' :
									'开始添加您的第一个ABI记录'
								}
							</div>
							<div className="flex gap-3 justify-center">
								<button
									onClick={() => onOpenModal?.('add')}
									className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
								>
									+ 添加ABI
								</button>
								<button
									onClick={() => onOpenModal?.('upload')}
									className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
								>
									📁 上传文件
								</button>
							</div>
						</div>
					</div>
				) : (
					<div className="p-6">
						{/* ABI列表表格 */}
						<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												合约信息
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												区块链
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												来源
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												创建时间
											</th>
											<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
												操作
											</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{abiList.map((abi) => (
											<tr key={abi.id} className="hover:bg-gray-50">
												<td className="px-4 py-4">
													<div>
														{abi.contract_name && (
															<div className="text-sm font-medium text-gray-900 mb-1">
																{abi.contract_name}
															</div>
														)}
														<div className={`text-sm ${abi.contract_name ? 'text-gray-600' : 'font-medium text-gray-900'}`}>
															{formatAddress(abi.contract_address)}
														</div>
														<div className="text-xs text-gray-500">
															ID: {abi.id}
														</div>
													</div>
												</td>
												<td className="px-4 py-4">
													<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
														{abi.chain_name}
													</span>
												</td>
												<td className="px-4 py-4">
													<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
														abi.source_type === 'auto_fetch' 
															? 'bg-green-100 text-green-800' 
															: 'bg-yellow-100 text-yellow-800'
													}`}>
														{abi.source_type === 'auto_fetch' ? '自动获取' : '手动添加'}
													</span>
												</td>
												<td className="px-4 py-4 text-sm text-gray-500">
													{formatTime(abi.created_at)}
												</td>
												<td className="px-4 py-4 text-right">
													<div className="flex items-center justify-end gap-2">
														<button
															onClick={() => onOpenModal?.('view', abi)}
															className="text-blue-600 hover:text-blue-900 text-sm font-medium"
														>
															查看
														</button>
														<button
															onClick={() => onOpenModal?.('edit', abi)}
															className="text-green-600 hover:text-green-900 text-sm font-medium"
														>
															编辑
														</button>
														<button
															onClick={() => handleDelete(abi)}
															className="text-red-600 hover:text-red-900 text-sm font-medium"
														>
															删除
														</button>
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>

						{/* 分页控件 */}
						{totalPages > 1 && (
							<div className="mt-6 flex items-center justify-between">
								<div className="text-sm text-gray-700">
									显示第 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalItems)} 条，共 {totalItems} 条记录
								</div>
								<div className="flex items-center gap-2">
									<button
										onClick={() => {
											if (currentPage > 1) {
												fetchAbiList(currentPage - 1)
											}
										}}
										disabled={currentPage <= 1}
										className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										上一页
									</button>
									
									<div className="flex items-center gap-1">
										{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
											let pageNum
											if (totalPages <= 5) {
												pageNum = i + 1
											} else if (currentPage <= 3) {
												pageNum = i + 1
											} else if (currentPage >= totalPages - 2) {
												pageNum = totalPages - 4 + i
											} else {
												pageNum = currentPage - 2 + i
											}
											
											return (
												<button
													key={pageNum}
													onClick={() => fetchAbiList(pageNum)}
													className={`px-3 py-2 text-sm rounded-md ${
														currentPage === pageNum
															? 'bg-blue-600 text-white'
															: 'bg-white border border-gray-300 hover:bg-gray-50'
													}`}
												>
													{pageNum}
												</button>
											)
										})}
									</div>
									
									<button
										onClick={() => {
											if (currentPage < totalPages) {
												fetchAbiList(currentPage + 1)
											}
										}}
										disabled={currentPage >= totalPages}
										className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										下一页
									</button>
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}