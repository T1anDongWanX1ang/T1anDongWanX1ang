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

// Add ABI Modal
export function AddAbiModal({ isOpen, onClose, onSuccess }: AddAbiModalProps) {
	const toast = useToast()
	const [formData, setFormData] = useState({
		contract_address: '',
		contract_name: '',
		chain_name: 'ethereum',
		abi_content: '',
		file_path: '',
		source_type: 'manual' as 'manual' | 'auto'
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

	// Reset form
	const resetForm = () => {
		setFormData({
			contract_address: '',
			contract_name: '',
			chain_name: 'ethereum',
			abi_content: '',
			file_path: '',
			source_type: 'manual'
		})
		setError('')
		setIsAutoFetch(false)
		setAbiStats(null)
	}

	// Auto FetchABI
	const handleAutoFetch = async () => {
		if (!formData.contract_address || !formData.chain_name) {
			setError('Please fill in contract address and select blockchain first')
			return
		}

		if (!AbiService.validateContractAddress(formData.contract_address, formData.chain_name)) {
			setError('Contract address format is incorrect')
			return
		}

		setLoading(true)
		setError('')

		try {
			const response = await AbiService.fetchAbiOnly({
				contract_address: formData.contract_address,
				chain_name: formData.chain_name
			})

			if (response.success) {
				const formattedAbi = JSON.stringify(response.data.abi_content, null, 2)
				setFormData(prev => ({
					...prev,
					abi_content: formattedAbi,
					file_path: response.data.file_path,
					source_type: 'auto'
				}))
				setIsAutoFetch(true)
				
				// Use the statistics from the API response
				setAbiStats({ 
					functions: response.data.functions_count || 0, 
					events: response.data.events_count || 0 
				})
				console.log(`🎉 ABI fetched successfully! Contains ${response.data.functions_count} functions, ${response.data.events_count} events`)
			} else {
				setError('Auto fetch ABI failed: ' + response.message)
			}
		} catch (err) {
			setError('Auto fetch ABI failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
		} finally {
			setLoading(false)
		}
	}

	// Submit form
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		
		if (!formData.contract_address || !formData.chain_name || !formData.abi_content.trim() || !formData.contract_name.trim()) {
			setError('Please fill in all required fields')
			return
		}

		if (!AbiService.validateContractAddress(formData.contract_address, formData.chain_name)) {
			setError('Contract address format is incorrect')
			return
		}

		// Validate if ABI content is valid JSON
		try {
			JSON.parse(formData.abi_content)
		} catch {
			setError('ABI content is not valid JSON format')
			return
		}

		setLoading(true)
		setError('')

		try {
			const response = await AbiService.createAbi({
				contract_address: formData.contract_address,
				contract_name: formData.contract_name,
				chain_name: formData.chain_name,
				abi_content: JSON.parse(formData.abi_content),
				file_path: formData.file_path,
				source_type: formData.source_type
			})

			if (response.success) {
				onSuccess()
				onClose()
				resetForm()
			} else {
				setError('Create ABI failed: ' + response.message)
			}
		} catch (err) {
			setError('Create ABI failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
		} finally {
			setLoading(false)
		}
	}

	// Reset form when modal closes
	useEffect(() => {
		if (!isOpen) {
			resetForm()
		}
	}, [isOpen])

	if (!isOpen) return null

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
				<div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
					<h2 className="text-xl font-semibold text-gray-900">Add ABI</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
					>
						×
					</button>
				</div>

				<form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
					<div className="flex-1 overflow-y-auto p-6">
						{error && (
							<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
								<p className="text-sm text-red-600">{error}</p>
							</div>
						)}

						<div className="space-y-6">
							{/* Contract Name */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Contract Name <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={formData.contract_name}
									onChange={(e) => setFormData(prev => ({ ...prev, contract_name: e.target.value.trim() }))}
									placeholder="e.g.: USDT, UniswapV3Pool, etc..."
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									required
								/>
								<p className="mt-1 text-xs text-gray-500">
									Set a memorable name for the contract to facilitate management and identification
								</p>
							</div>

							{/* Contract Address */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Contract Address <span className="text-red-500">*</span>
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

							{/* Blockchain Selection */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Blockchain <span className="text-red-500">*</span>
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

							{/* Auto FetchABI */}
							<div className="bg-blue-50 p-4 rounded-md">
								<div className="flex items-center justify-between mb-2">
									<div>
										<h4 className="font-medium text-blue-900">Auto FetchABI</h4>
										<p className="text-sm text-blue-700">Auto fetch contract ABI from blockchain explorer</p>
									</div>
									<button
										type="button"
										onClick={handleAutoFetch}
										disabled={loading || !formData.contract_address}
										className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										{loading ? 'Fetching...' : 'Auto Fetch'}
									</button>
								</div>
								{isAutoFetch && (
									<div className="text-sm text-green-700 flex items-center gap-2">
										<span className="text-green-500">✓</span>
										<div>
											<div>ABI auto-fetched successfully</div>
											{abiStats && (
												<div className="text-xs text-green-600 mt-1">
													Contains {abiStats.functions} functions, {abiStats.events} events, formatted for display
												</div>
											)}
										</div>
									</div>
								)}
							</div>

							{/* ABI Content */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									ABI Content <span className="text-red-500">*</span>
								</label>
								<textarea
									value={formData.abi_content}
									onChange={(e) => setFormData(prev => ({ ...prev, abi_content: e.target.value }))}
									placeholder="Please enter ABI JSON content or use the Auto Fetch function above..."
									className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-y overflow-y-scroll"
									required
								/>
								<p className="mt-2 text-sm text-gray-500">
									{isAutoFetch && formData.abi_content ? (
										<>
											<span className="text-green-600">✓ ABI content auto-fetched and formatted</span>
											{abiStats && (
												<span className="ml-2 text-gray-400">
													({abiStats.functions} functions, {abiStats.events} events)
												</span>
											)}
										</>
									) : (
										'Please enter valid JSON format ABI content, or use the Auto Fetch function above'
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
							Cancel
						</button>
						<button
							type="submit"
							disabled={loading}
							className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{loading ? 'Creating...' : 'Create ABI'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}

// Edit ABI Modal
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

	// Initialize form data
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

	// Submit form
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		
		if (!formData.contract_address || !formData.chain_name || !formData.abi_content.trim()) {
			setError('Please fill in all required fields')
			return
		}

		if (!AbiService.validateContractAddress(formData.contract_address, formData.chain_name)) {
			setError('Contract address format is incorrect')
			return
		}

		// Validate if ABI content is valid JSON
		try {
			JSON.parse(formData.abi_content)
		} catch {
			setError('ABI content is not valid JSON format')
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
				setError('Update ABI failed: ' + response.message)
			}
		} catch (err) {
			setError('Update ABI failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
		} finally {
			setLoading(false)
		}
	}

	if (!isOpen) return null

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<h2 className="text-xl font-semibold text-gray-900">Edit ABI</h2>
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
							{/* ABI ID (Read Only) */}
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

							{/* Contract Name */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Contract Name
									<span className="text-gray-500 text-xs ml-2">(Optional, for identification)</span>
								</label>
								<input
									type="text"
									value={formData.contract_name}
									onChange={(e) => setFormData(prev => ({ ...prev, contract_name: e.target.value.trim() }))}
									placeholder="e.g.: USDT, UniswapV3Pool, etc..."
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>

							{/* Contract Address */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Contract Address <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={formData.contract_address}
									onChange={(e) => setFormData(prev => ({ ...prev, contract_address: e.target.value.trim() }))}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									required
								/>
							</div>

							{/* Blockchain Selection */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Blockchain <span className="text-red-500">*</span>
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

							{/* ABI Content */}
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									ABI Content <span className="text-red-500">*</span>
								</label>
								<textarea
									value={formData.abi_content}
									onChange={(e) => setFormData(prev => ({ ...prev, abi_content: e.target.value }))}
									className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-y overflow-y-scroll"
									required
								/>
								<p className="mt-2 text-sm text-gray-500">
									Please enter valid JSON format ABI content
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
							Cancel
						</button>
						<button
							type="submit"
							disabled={loading}
							className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{loading ? 'Saving...' : 'Save Changes'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}

// View ABI Modal
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
						<h2 className="text-xl font-semibold text-gray-900">View ABI Details</h2>
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
					{/* ABI Information Summary */}
					<div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
							<div>
								<span className="font-medium text-gray-700">Source Type:</span>
								<span className={`ml-2 px-2 py-1 rounded-full text-xs ${
									abi.source_type === 'auto' 
										? 'bg-green-100 text-green-800' 
										: 'bg-yellow-100 text-yellow-800'
								}`}>
									{abi.source_type === 'auto' ? 'Auto Fetch' : 'Manual'}
								</span>
							</div>
							<div>
								<span className="font-medium text-gray-700">Functions Count:</span>
								<span className="ml-2 text-blue-600">{functions.length}</span>
							</div>
							<div>
								<span className="font-medium text-gray-700">Events Count:</span>
								<span className="ml-2 text-purple-600">{events.length}</span>
							</div>
							<div>
								<span className="font-medium text-gray-700">Creation Time:</span>
								<span className="ml-2 text-gray-600">{new Date(abi.created_at).toLocaleDateString('en-US')}</span>
							</div>
						</div>
					</div>

					{/* Tab Navigation */}
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
								Raw ABI
							</button>
							<button
								onClick={() => setActiveTab('functions')}
								className={`px-4 py-2 text-sm font-medium border-b-2 ${
									activeTab === 'functions'
										? 'border-blue-500 text-blue-600'
										: 'border-transparent text-gray-500 hover:text-gray-700'
								}`}
							>
								Function List ({functions.length})
							</button>
							<button
								onClick={() => setActiveTab('events')}
								className={`px-4 py-2 text-sm font-medium border-b-2 ${
									activeTab === 'events'
										? 'border-blue-500 text-blue-600'
										: 'border-transparent text-gray-500 hover:text-gray-700'
								}`}
							>
								Event List ({events.length})
							</button>
						</div>
					</div>

					{/* Tab Content */}
					<div className="flex-1 overflow-auto p-6">
						{activeTab === 'raw' && (
							<div>
								<div className="mb-4">
									<h3 className="text-lg font-medium text-gray-900 mb-2">ABI JSON Content</h3>
									<button
										onClick={() => {
											const text = AbiService.formatAbiForDisplay(abi.abi_content)
											navigator.clipboard.writeText(text)
										}}
										className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
									>
										Copy to Clipboard
									</button>
								</div>
								<pre className="bg-gray-50 p-4 rounded-md overflow-auto text-sm max-h-96">
									<code>{AbiService.formatAbiForDisplay(abi.abi_content)}</code>
								</pre>
							</div>
						)}

						{activeTab === 'functions' && (
							<div>
								<h3 className="text-lg font-medium text-gray-900 mb-4">Contract Function List</h3>
								{functions.length > 0 ? (
									<div className="space-y-2 max-h-96 overflow-y-auto pr-2">
										{functions.map((func, index) => (
											<div key={index} className="p-3 bg-blue-50 rounded-md">
												<span className="font-mono text-sm text-blue-900">{func}()</span>
											</div>
										))}
									</div>
								) : (
									<div className="text-center py-8 text-gray-500">
										No function definitions found
									</div>
								)}
							</div>
						)}

						{activeTab === 'events' && (
							<div>
								<h3 className="text-lg font-medium text-gray-900 mb-4">Contract Event List</h3>
								{events.length > 0 ? (
									<div className="space-y-2 max-h-96 overflow-y-auto pr-2">
										{events.map((event, index) => (
											<div key={index} className="p-3 bg-purple-50 rounded-md">
												<span className="font-mono text-sm text-purple-900">{event}</span>
											</div>
										))}
									</div>
								) : (
									<div className="text-center py-8 text-gray-500">
										No event definitions found
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
							Close
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

// Upload ABI File Modal
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

	// Reset form
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

	// Handle file selection
	const handleFileSelect = (file: File) => {
		if (!file.name.toLowerCase().endsWith('.json')) {
			setError('Please select a JSON format ABI file')
			return
		}
		
		if (file.size > 1024 * 1024) { // 1MB limit
			setError('File size cannot exceed 1MB')
			return
		}

		setSelectedFile(file)
		setError('')
	}

	// Handle drag and drop
	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		setDragActive(false)
		
		const files = e.dataTransfer.files
		if (files.length > 0) {
			handleFileSelect(files[0])
		}
	}

	// Submit form
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		
		if (!formData.contract_address || !formData.chain_name || !selectedFile) {
			setError('Please fill in all required fields and select a file')
			return
		}

		if (!AbiService.validateContractAddress(formData.contract_address, formData.chain_name)) {
			setError('Contract address format is incorrect')
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
				setError('Upload file failed: ' + response.message)
			}
		} catch (err) {
			setError('Upload file failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
		} finally {
			setLoading(false)
		}
	}

	// Reset form when modal closes
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
					<h2 className="text-xl font-semibold text-gray-900">Upload ABI File</h2>
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
						{/* Contract Name */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Contract Name <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={formData.contract_name}
								onChange={(e) => setFormData(prev => ({ ...prev, contract_name: e.target.value.trim() }))}
								placeholder="e.g.: USDT, UniswapV3Pool, etc..."
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>

						{/* Contract Address */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Contract Address <span className="text-red-500">*</span>
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

						{/* Blockchain Selection */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Blockchain <span className="text-red-500">*</span>
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

						{/* File Upload Area */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								ABI File <span className="text-red-500">*</span>
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
											Remove File
										</button>
									</div>
								) : (
									<div className="space-y-2">
										<div className="text-4xl text-gray-400">📁</div>
										<div className="text-sm font-medium text-gray-900">
											Drag files here, or
										</div>
										<label className="cursor-pointer">
											<span className="text-sm text-blue-600 hover:text-blue-800 font-medium">
												Click to select file
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
											Supports JSON format, maximum 1MB
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
							Cancel
						</button>
						<button
							type="submit"
							disabled={loading}
							className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{loading ? 'Uploading...' : 'Upload File'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}