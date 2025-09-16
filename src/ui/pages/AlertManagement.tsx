import { useState } from 'react'
import { AlertBadge, useAlertCount } from '../components/AlertBadge'
import { AlertList } from '../components/AlertList'
import { alertService } from '../../services/alertService'
import { useToast } from '../components/Toast'

export function AlertManagement() {
	const [activeTab, setActiveTab] = useState<'overview' | 'list'>('overview')
	const { refreshTrigger, refreshAlertCount } = useAlertCount()
	const { success, error: showError } = useToast()
	const [creatingTestAlert, setCreatingTestAlert] = useState(false)

	// Handle alert cleared - refresh the badge
	const handleAlertCleared = () => {
		refreshAlertCount()
	}

	// Create test alert for development
	const createTestAlert = async () => {
		if (creatingTestAlert) return
		
		setCreatingTestAlert(true)
		try {
			const result = await alertService.createTestAlert()
			if (result.success) {
				success('Test Alert Created', `Alert ID: ${result.alert_id}`)
				refreshAlertCount()
			} else {
				showError('Error', 'Failed to create test alert')
			}
		} catch (err) {
			console.error('Failed to create test alert:', err)
			showError('Error', 'Failed to create test alert')
		} finally {
			setCreatingTestAlert(false)
		}
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-white shadow-sm border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center py-4">
						<div className="flex items-center gap-4">
							<h1 className="text-2xl font-semibold text-gray-900">Alert Management</h1>
							<AlertBadge 
								refreshTrigger={refreshTrigger}
								onClick={() => setActiveTab('list')}
								className="group relative"
							/>
						</div>
						
						<div className="flex items-center gap-3">
							<button
								onClick={createTestAlert}
								disabled={creatingTestAlert}
								className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{creatingTestAlert ? 'Creating...' : 'Create Test Alert'}
							</button>
							
							<button
								onClick={refreshAlertCount}
								className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
							>
								Refresh
							</button>
						</div>
					</div>
					
					{/* Tab Navigation */}
					<div className="flex border-b border-gray-200">
						<button
							onClick={() => setActiveTab('overview')}
							className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
								activeTab === 'overview'
									? 'border-blue-500 text-blue-600'
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
							}`}
						>
							Overview
						</button>
						<button
							onClick={() => setActiveTab('list')}
							className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
								activeTab === 'list'
									? 'border-blue-500 text-blue-600'
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
							}`}
						>
							Alert List
						</button>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{activeTab === 'overview' ? (
					<div className="space-y-6">
						{/* Overview Cards */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div className="bg-white rounded-lg shadow p-6">
								<div className="flex items-center">
									<div className="flex-shrink-0">
										<div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
											🔔
										</div>
									</div>
									<div className="ml-5 w-0 flex-1">
										<dl>
											<dt className="text-sm font-medium text-gray-500 truncate">
												Alert System
											</dt>
											<dd className="text-lg font-medium text-gray-900">
												Active
											</dd>
										</dl>
									</div>
								</div>
							</div>
							
							<div className="bg-white rounded-lg shadow p-6">
								<div className="flex items-center">
									<div className="flex-shrink-0">
										<div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
											⚡
										</div>
									</div>
									<div className="ml-5 w-0 flex-1">
										<dl>
											<dt className="text-sm font-medium text-gray-500 truncate">
												Auto Refresh
											</dt>
											<dd className="text-lg font-medium text-gray-900">
												30s
											</dd>
										</dl>
									</div>
								</div>
							</div>
							
							<div className="bg-white rounded-lg shadow p-6">
								<div className="flex items-center">
									<div className="flex-shrink-0">
										<div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
											📊
										</div>
									</div>
									<div className="ml-5 w-0 flex-1">
										<dl>
											<dt className="text-sm font-medium text-gray-500 truncate">
												Real-time Updates
											</dt>
											<dd className="text-lg font-medium text-gray-900">
												Enabled
											</dd>
										</dl>
									</div>
								</div>
							</div>
						</div>

						{/* Quick Actions */}
						<div className="bg-white rounded-lg shadow">
							<div className="px-6 py-4 border-b border-gray-200">
								<h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
							</div>
							<div className="p-6">
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									<button
										onClick={() => setActiveTab('list')}
										className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
									>
										<div className="flex-shrink-0">
											<div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
												<span className="text-white text-sm">📋</span>
											</div>
										</div>
										<div className="ml-4">
											<div className="text-sm font-medium text-gray-900">View All Alerts</div>
											<div className="text-sm text-gray-500">See detailed alert list</div>
										</div>
									</button>
									
									<button
										onClick={createTestAlert}
										disabled={creatingTestAlert}
										className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										<div className="flex-shrink-0">
											<div className="w-8 h-8 bg-gray-500 rounded-md flex items-center justify-center">
												<span className="text-white text-sm">🧪</span>
											</div>
										</div>
										<div className="ml-4">
											<div className="text-sm font-medium text-gray-900">
												{creatingTestAlert ? 'Creating...' : 'Create Test Alert'}
											</div>
											<div className="text-sm text-gray-500">Generate test alert</div>
										</div>
									</button>
									
									<button
										onClick={refreshAlertCount}
										className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
									>
										<div className="flex-shrink-0">
											<div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
												<span className="text-white text-sm">🔄</span>
											</div>
										</div>
										<div className="ml-4">
											<div className="text-sm font-medium text-gray-900">Refresh Data</div>
											<div className="text-sm text-gray-500">Update alert counts</div>
										</div>
									</button>
								</div>
							</div>
						</div>

						{/* System Information */}
						<div className="bg-white rounded-lg shadow">
							<div className="px-6 py-4 border-b border-gray-200">
								<h3 className="text-lg font-medium text-gray-900">Alert System Information</h3>
							</div>
							<div className="p-6">
								<dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<dt className="text-sm font-medium text-gray-500">Severity Levels</dt>
										<dd className="mt-1 text-sm text-gray-900">
											<div className="space-y-1">
												<div className="flex items-center gap-2">
													<span>🔴</span>
													<span>Critical - Immediate attention required</span>
												</div>
												<div className="flex items-center gap-2">
													<span>🟠</span>
													<span>High - Important issues</span>
												</div>
												<div className="flex items-center gap-2">
													<span>🟡</span>
													<span>Medium - Moderate issues</span>
												</div>
												<div className="flex items-center gap-2">
													<span>🔵</span>
													<span>Low - Minor issues</span>
												</div>
											</div>
										</dd>
									</div>
									
									<div>
										<dt className="text-sm font-medium text-gray-500">Alert Types</dt>
										<dd className="mt-1 text-sm text-gray-900">
											<div className="space-y-1">
												<div>• System - Core system alerts</div>
												<div>• API - API related issues</div>
												<div>• Performance - Performance warnings</div>
												<div>• Test - Development test alerts</div>
											</div>
										</dd>
									</div>
								</dl>
							</div>
						</div>
					</div>
				) : (
					<div className="bg-white rounded-lg shadow">
						<AlertList 
							refreshTrigger={refreshTrigger}
							onAlertCleared={handleAlertCleared}
						/>
					</div>
				)}
			</div>
		</div>
	)
}