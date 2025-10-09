import { useState, useEffect } from 'react'
import { alertService, Alert, AlertListParams, AlertListResponse } from '../../services/alertService'
import { useToast } from './Toast'

interface AlertListProps {
	refreshTrigger?: number
	onAlertCleared?: () => void
	className?: string
}

const SEVERITY_COLORS = {
	critical: 'text-red-600 bg-red-50 border-red-200',
	high: 'text-orange-600 bg-orange-50 border-orange-200',
	medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
	low: 'text-blue-600 bg-blue-50 border-blue-200'
}

const SEVERITY_ICONS = {
	critical: '🔴',
	high: '🟠',
	medium: '🟡',
	low: '🔵'
}

export function AlertList({ refreshTrigger = 0, onAlertCleared, className = '' }: AlertListProps) {
	const [alerts, setAlerts] = useState<AlertListResponse | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [clearing, setClearing] = useState<Set<number>>(new Set())
	const [clearingAll, setClearingAll] = useState(false)
	
	// Filters and pagination
	const [currentPage, setCurrentPage] = useState(1)
	const [pageSize, setPageSize] = useState(20)
	const [severityFilter, setSeverityFilter] = useState<string>('')
	const [typeFilter, setTypeFilter] = useState<string>('')
	const [caseNameFilter, setCaseNameFilter] = useState<string>('')
	const [tableFilter, setTableFilter] = useState<string>('')
	const [ownerFilter, setOwnerFilter] = useState<string>('')

	const { success, error: showError } = useToast()

	const fetchAlerts = async (params: AlertListParams = {}) => {
		try {
			setLoading(true)
			setError(null)
			
			const response = await alertService.getAlerts({
				page: currentPage,
				size: pageSize,
				severity: severityFilter || undefined,
				alert_type: typeFilter || undefined,
				case_name: caseNameFilter || undefined,
				table: tableFilter || undefined,
				owner: ownerFilter || undefined,
				...params
			})
			
			setAlerts(response)
		} catch (err) {
			console.error('Failed to fetch alerts:', err)
			setError('Failed to load alerts')
			showError('Error', 'Failed to load alerts')
		} finally {
			setLoading(false)
		}
	}

	// Fetch alerts when component mounts or filters change
	useEffect(() => {
		fetchAlerts()
	}, [currentPage, pageSize, severityFilter, typeFilter, caseNameFilter, tableFilter, ownerFilter, refreshTrigger])

	// Clear single alert
	const clearAlert = async (alertId: number) => {
		if (clearing.has(alertId)) return
		
		setClearing(prev => new Set(prev).add(alertId))
		try {
			const result = await alertService.clearAlert(alertId)
			if (result.success) {
				success('Success', result.message)
				await fetchAlerts() // Refresh the list
				onAlertCleared?.()
			} else {
				showError('Error', 'Failed to clear alert')
			}
		} catch (err) {
			console.error('Failed to clear alert:', err)
			showError('Error', 'Failed to clear alert')
		} finally {
			setClearing(prev => {
				const newSet = new Set(prev)
				newSet.delete(alertId)
				return newSet
			})
		}
	}

	// Clear all alerts
	const clearAllAlerts = async () => {
		if (clearingAll) return
		
		setClearingAll(true)
		try {
			const result = await alertService.clearAllAlerts()
			if (result.success) {
				success('Success', result.message)
				await fetchAlerts() // Refresh the list
				onAlertCleared?.()
			} else {
				showError('Error', 'Failed to clear all alerts')
			}
		} catch (err) {
			console.error('Failed to clear all alerts:', err)
			showError('Error', 'Failed to clear all alerts')
		} finally {
			setClearingAll(false)
		}
	}

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleString()
	}

	const getTotalPages = () => {
		if (!alerts) return 0
		return Math.ceil(alerts.total / pageSize)
	}

	if (loading && !alerts) {
		return (
			<div className={`p-6 ${className}`}>
				<div className="animate-pulse space-y-4">
					<div className="h-8 bg-gray-300 rounded w-1/4"></div>
					{[...Array(5)].map((_, i) => (
						<div key={i} className="h-16 bg-gray-200 rounded"></div>
					))}
				</div>
			</div>
		)
	}

	if (error && !alerts) {
		return (
			<div className={`p-6 ${className}`}>
				<div className="text-center">
					<div className="text-red-600 mb-4">❌ {error}</div>
					<button 
						onClick={() => fetchAlerts()}
						className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
					>
						Retry
					</button>
				</div>
			</div>
		)
	}

	const alertList = alerts?.alerts || []
	const totalAlerts = alerts?.total || 0

	return (
		<div className={`p-6 ${className}`}>
			{/* Header */}
			<div className="flex justify-between items-center mb-6">
				<div>
					<h2 className="text-xl font-semibold text-gray-800">System Alerts</h2>
					<p className="text-gray-600 text-sm">
						Total: {totalAlerts} alerts
					</p>
				</div>
				
				{alertList.length > 0 && (
					<button
						onClick={clearAllAlerts}
						disabled={clearingAll}
						className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{clearingAll ? 'Clearing...' : 'Clear All'}
					</button>
				)}
			</div>

			{/* Filters */}
			<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
				<select
					value={severityFilter}
					onChange={(e) => {
						setSeverityFilter(e.target.value)
						setCurrentPage(1) // Reset to first page
					}}
					className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value="">All Severities</option>
					<option value="critical">Critical</option>
					<option value="high">High</option>
					<option value="medium">Medium</option>
					<option value="low">Low</option>
				</select>

				<select
					value={typeFilter}
					onChange={(e) => {
						setTypeFilter(e.target.value)
						setCurrentPage(1) // Reset to first page
					}}
					className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value="">All Types</option>
					<option value="system">System</option>
					<option value="api">API</option>
					<option value="performance">Performance</option>
					<option value="test">Test</option>
				</select>

				<input
					type="text"
					placeholder="Case Name"
					value={caseNameFilter}
					onChange={(e) => {
						setCaseNameFilter(e.target.value)
						setCurrentPage(1) // Reset to first page
					}}
					className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>

				<input
					type="text"
					placeholder="Table Name"
					value={tableFilter}
					onChange={(e) => {
						setTableFilter(e.target.value)
						setCurrentPage(1) // Reset to first page
					}}
					className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>

				<input
					type="text"
					placeholder="Owner"
					value={ownerFilter}
					onChange={(e) => {
						setOwnerFilter(e.target.value)
						setCurrentPage(1) // Reset to first page
					}}
					className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>

				<select
					value={pageSize}
					onChange={(e) => {
						setPageSize(Number(e.target.value))
						setCurrentPage(1) // Reset to first page
					}}
					className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value={10}>10 per page</option>
					<option value={20}>20 per page</option>
					<option value={50}>50 per page</option>
				</select>
			</div>

			{/* Alert List */}
			{loading ? (
				<div className="text-center py-8">
					<div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
					<p className="text-gray-600 mt-2">Loading alerts...</p>
				</div>
			) : alertList.length === 0 ? (
				<div className="text-center py-12">
					<div className="text-green-600 text-4xl mb-4">✅</div>
					<h3 className="text-lg font-medium text-gray-800 mb-2">No Active Alerts</h3>
					<p className="text-gray-600">All systems are running normally</p>
				</div>
			) : (
				<div className="space-y-3">
					{alertList.map((alert) => (
						<div
							key={alert.id}
							className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
						>
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-2">
										<span className="text-lg">
											{SEVERITY_ICONS[alert.severity as keyof typeof SEVERITY_ICONS]}
										</span>
										<span className={`px-2 py-1 text-xs font-medium rounded border ${SEVERITY_COLORS[alert.severity as keyof typeof SEVERITY_COLORS]}`}>
											{alert.severity.toUpperCase()}
										</span>
										<span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
											{alert.alert_type}
										</span>
									</div>
									
									<p className="text-gray-800 font-medium mb-1">
										{alert.message}
									</p>
									
									<div className="text-sm text-gray-600 space-y-1">
										<div className="flex flex-wrap gap-4">
											<span>Source: {alert.source}</span>
											<span>ID: {alert.id}</span>
											{alert.case_name && <span>Case: {alert.case_name}</span>}
											{alert.table && <span>Table: {alert.table}</span>}
											{alert.column && <span>Column: {alert.column}</span>}
											{alert.owner && <span>Owner: {alert.owner}</span>}
										</div>
										<div className="flex flex-wrap gap-4">
											<span>Created: {formatDate(alert.created_at)}</span>
											{alert.alert_times && alert.alert_times > 1 && (
												<span className="font-medium text-orange-600">Alert Times: {alert.alert_times}</span>
											)}
											{alert.last_alert && alert.last_alert !== alert.created_at && (
												<span>Last Alert: {formatDate(alert.last_alert)}</span>
											)}
											{alert.date && (
												<span>Date: {alert.date}</span>
											)}
										</div>
									</div>
								</div>
								
								<button
									onClick={() => clearAlert(alert.id)}
									disabled={clearing.has(alert.id)}
									className="ml-4 px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									{clearing.has(alert.id) ? 'Clearing...' : 'Clear'}
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Pagination */}
			{totalAlerts > pageSize && (
				<div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
					<div className="text-sm text-gray-600">
						Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalAlerts)} of {totalAlerts} alerts
					</div>
					
					<div className="flex gap-2">
						<button
							onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
							disabled={currentPage === 1}
							className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Previous
						</button>
						
						<span className="px-3 py-1 text-sm bg-blue-50 text-blue-600 border border-blue-200 rounded">
							{currentPage} / {getTotalPages()}
						</span>
						
						<button
							onClick={() => setCurrentPage(prev => Math.min(getTotalPages(), prev + 1))}
							disabled={currentPage >= getTotalPages()}
							className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Next
						</button>
					</div>
				</div>
			)}
		</div>
	)
}