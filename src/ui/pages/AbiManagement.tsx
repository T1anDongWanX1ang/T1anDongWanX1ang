import { useState, useEffect, useRef } from 'react'
import { AbiService, ContractAbi } from '../../services/abiService'
import { useAbiManagementShortcuts } from '../../hooks/useKeyboardShortcuts'

interface AbiManagementProps {
	onOpenModal?: (type: 'add' | 'edit' | 'view' | 'upload', abi?: ContractAbi) => void
	refreshTrigger?: number // Property to trigger refresh
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

	// Supported blockchain list
	const supportedChains = [
		{ value: '', label: 'All Chains' },
		{ value: 'ethereum', label: 'Ethereum' },
		{ value: 'polygon', label: 'Polygon' },
		{ value: 'bsc', label: 'BSC' },
		{ value: 'arbitrum', label: 'Arbitrum' },
		{ value: 'optimism', label: 'Optimism' },
		{ value: 'avalanche', label: 'Avalanche' },
		{ value: 'fantom', label: 'Fantom' }
	]

	// Get ABI list
	const fetchAbiList = async (page = 1) => {
		try {
			setLoading(true)
			setError(null)
			
			// Smart search type detection: if contains 0x, treat as address search, otherwise as name search
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
				setError('Failed to get ABI list')
			}
		} catch (err) {
			console.error('Get ABI list error:', err)
			setError(err instanceof Error ? err.message : 'Failed to get ABI list')
		} finally {
			setLoading(false)
		}
	}

	// Delete ABI
	const handleDelete = async (abi: ContractAbi) => {
		if (!confirm('Are you sure you want to delete this ABI record?')) return

		try {
			const response = await AbiService.deleteAbi(abi.contract_address, abi.chain_name)
			if (response.success) {
				// Reload list
				fetchAbiList(currentPage)
			} else {
				alert('Delete failed: ' + response.message)
			}
		} catch (err) {
			console.error('Delete ABI error:', err)
			alert('Delete failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
		}
	}

	// Handle search
	const handleSearch = () => {
		setCurrentPage(1)
		fetchAbiList(1)
	}

	// Handle chain selection change
	const handleChainChange = (newChain: string) => {
		setSelectedChain(newChain)
		setCurrentPage(1)
	}

	// Reset search
	const handleReset = () => {
		setSearchTerm('')
		setSelectedChain('')
		setCurrentPage(1)
		fetchAbiList(1)
	}

	// Format address display (shortened)
	const formatAddress = (address: string) => {
		if (address.length <= 12) return address
		return `${address.slice(0, 6)}...${address.slice(-6)}`
	}

	// Format time display
	const formatTime = (dateString: string) => {
		try {
			return new Date(dateString).toLocaleString('zh-CN')
		} catch {
			return 'Invalid time'
		}
	}

	// Get data when component mounts
	useEffect(() => {
		fetchAbiList()
	}, [selectedChain])

	// Listen to refresh trigger
	useEffect(() => {
		if (refreshTrigger) {
			fetchAbiList(currentPage)
		}
	}, [refreshTrigger])

	// Keyboard shortcuts support
	useAbiManagementShortcuts({
		onAddAbi: () => onOpenModal?.('add'),
		onUploadAbi: () => onOpenModal?.('upload'),
		onRefresh: () => fetchAbiList(currentPage),
		onSearch: () => searchInputRef.current?.focus()
	})

	return (
		<div className="h-full flex flex-col bg-white">
			{/* Title bar */}
			<div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">ABI Management</h1>
						<p className="mt-1 text-sm text-gray-600">
							Manage smart contract ABI files, support manual upload and automatic fetch
						</p>
					</div>
					<div className="flex gap-3">
						<button
							onClick={() => onOpenModal?.('upload')}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
							title="Upload File (Ctrl+U)"
						>
							📁 Upload File
						</button>
						<button
							onClick={() => onOpenModal?.('add')}
							className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
							title="Add ABI (Ctrl+N)"
						>
							+ Add ABI
						</button>
					</div>
				</div>
			</div>

			{/* Search and filter bar */}
			<div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-b border-gray-200">
				<div className="flex flex-wrap gap-4 items-start">
					<div className="flex-1 min-w-[400px] max-w-2xl">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Smart Search
						</label>
						<div className="flex gap-2">
							<input
								ref={searchInputRef}
								type="text"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								placeholder="Enter contract name or address to search..."
								className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
							/>
							<button
								onClick={handleSearch}
								className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
							>
								Search
							</button>
						</div>
						<div className="text-xs text-gray-500 mt-1">
							Support search by contract name or address
						</div>
					</div>
					
					<div className="min-w-[180px]">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Blockchain
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

					<div className="flex items-start">
						<button
							onClick={handleReset}
							className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors h-[38px] mt-[28px]"
						>
							Reset
						</button>
					</div>
				</div>
			</div>

			{/* Statistics information */}
			<div className="flex-shrink-0 px-6 py-3 bg-gray-50 border-b border-gray-200">
				<div className="text-sm text-gray-600">
					Found <span className="font-medium text-gray-900">{totalItems}</span> ABI records
				</div>
			</div>

			{/* ABI list content */}
			<div className="flex-1 overflow-auto">
				{loading ? (
					<div className="flex items-center justify-center h-64">
						<div className="flex items-center gap-3 text-gray-500">
							<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
							<span>Loading...</span>
						</div>
					</div>
				) : error ? (
					<div className="flex items-center justify-center h-64">
						<div className="text-center">
							<div className="text-4xl mb-4">❌</div>
							<div className="text-lg font-medium text-gray-900 mb-2">Load Failed</div>
							<div className="text-sm text-gray-500 mb-4">{error}</div>
							<button
								onClick={() => fetchAbiList(currentPage)}
								className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
							>
								Retry
							</button>
						</div>
					</div>
				) : abiList.length === 0 ? (
					<div className="flex items-center justify-center h-64">
						<div className="text-center">
							<div className="text-6xl mb-4">📄</div>
							<div className="text-lg font-medium text-gray-900 mb-2">No ABI Records</div>
							<div className="text-sm text-gray-500 mb-6">
								{searchTerm || selectedChain ? 
									'No ABI records found matching your criteria, please try adjusting your search conditions' :
									'Start adding your first ABI record'
								}
							</div>
							<div className="flex gap-3 justify-center">
								<button
									onClick={() => onOpenModal?.('add')}
									className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
								>
									+ Add ABI
								</button>
								<button
									onClick={() => onOpenModal?.('upload')}
									className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
								>
									📁 Upload File
								</button>
							</div>
						</div>
					</div>
				) : (
					<div className="p-6">
						{/* ABI list table */}
						<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Contract Information
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Blockchain
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Source
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Creation Time
											</th>
											<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
												Actions
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
														abi.source_type === 'auto' 
															? 'bg-green-100 text-green-800' 
															: 'bg-yellow-100 text-yellow-800'
													}`}>
														{abi.source_type === 'auto' ? 'Auto Fetch' : 'Manual Add'}
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
															View
														</button>
														<button
															onClick={() => onOpenModal?.('edit', abi)}
															className="text-green-600 hover:text-green-900 text-sm font-medium"
														>
															Edit
														</button>
														<button
															onClick={() => handleDelete(abi)}
															className="text-red-600 hover:text-red-900 text-sm font-medium"
														>
															Delete
														</button>
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>

						{/* Pagination controls */}
						{totalPages > 1 && (
							<div className="mt-6 flex items-center justify-between">
								<div className="text-sm text-gray-700">
									Showing  {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalItems)} of {totalItems} records
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
										Previous
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
										Next
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