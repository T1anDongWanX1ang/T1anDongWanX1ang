import { useState, useEffect } from 'react'
import { alertService, AlertCount } from '../../services/alertService'

interface AlertBadgeProps {
	refreshTrigger?: number
	onClick?: () => void
	className?: string
}

export function AlertBadge({ refreshTrigger = 0, onClick, className = '' }: AlertBadgeProps) {
	const [alertCount, setAlertCount] = useState<AlertCount | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const fetchAlertCount = async () => {
		try {
			setLoading(true)
			setError(null)
			const count = await alertService.getAlertCount()
			setAlertCount(count)
		} catch (err) {
			console.error('Failed to fetch alert count:', err)
			setError('Failed to load alert count')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchAlertCount()
	}, [refreshTrigger])

	// Auto refresh every 30 seconds
	useEffect(() => {
		const interval = setInterval(fetchAlertCount, 30000)
		return () => clearInterval(interval)
	}, [])

	if (loading && !alertCount) {
		return (
			<div className={`flex items-center ${className}`}>
				<div className="animate-pulse">
					<div className="w-6 h-6 bg-gray-300 rounded-full"></div>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className={`flex items-center ${className}`}>
				<button 
					onClick={fetchAlertCount}
					className="text-red-500 hover:text-red-600 transition-colors"
					title="Click to retry"
				>
					⚠️
				</button>
			</div>
		)
	}

	const totalCount = alertCount?.count || 0
	const severityStats = alertCount?.severity_stats || {}

	// Get highest severity color
	const getSeverityColor = () => {
		if (severityStats.critical > 0) return 'bg-red-500'
		if (severityStats.high > 0) return 'bg-orange-500'
		if (severityStats.medium > 0) return 'bg-yellow-500'
		if (severityStats.low > 0) return 'bg-blue-500'
		return 'bg-gray-400'
	}

	const getSeverityTextColor = () => {
		if (severityStats.critical > 0) return 'text-red-600'
		if (severityStats.high > 0) return 'text-orange-600'
		if (severityStats.medium > 0) return 'text-yellow-600'
		if (severityStats.low > 0) return 'text-blue-600'
		return 'text-gray-600'
	}

	if (totalCount === 0) {
		return (
			<div className={`flex items-center ${className}`}>
				<div 
					className="flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-600 rounded-full border border-green-200 cursor-pointer hover:bg-green-100 transition-colors"
					onClick={onClick}
					title="No active alerts"
				>
					<span className="w-2 h-2 bg-green-400 rounded-full"></span>
					<span>0</span>
				</div>
			</div>
		)
	}

	return (
		<div className={`flex items-center ${className}`}>
			<div 
				className={`relative flex items-center gap-1 px-2 py-1 text-xs text-white rounded-full cursor-pointer hover:opacity-90 transition-opacity ${getSeverityColor()}`}
				onClick={onClick}
				title={`${totalCount} active alerts. Click to view details.`}
			>
				<span className="w-2 h-2 bg-white/80 rounded-full animate-pulse"></span>
				<span className="font-medium">{totalCount}</span>
			</div>
			
			{/* Detailed tooltip on hover */}
			<div className="hidden group-hover:block absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-40">
				<div className="text-xs space-y-1">
					<div className="font-medium text-gray-800">Alert Summary:</div>
					{Object.entries(severityStats).map(([severity, count]) => (
						count > 0 && (
							<div key={severity} className="flex justify-between">
								<span className={`capitalize ${getSeverityTextColor()}`}>{severity}:</span>
								<span className="font-medium">{count}</span>
							</div>
						)
					))}
				</div>
			</div>
		</div>
	)
}

// Hook for managing alert count with refresh functionality
export function useAlertCount() {
	const [refreshTrigger, setRefreshTrigger] = useState(0)
	
	const refreshAlertCount = () => {
		setRefreshTrigger(prev => prev + 1)
	}
	
	return {
		refreshTrigger,
		refreshAlertCount
	}
}