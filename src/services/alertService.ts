import { currentApiConfig, API_ENDPOINTS, DEFAULT_HEADERS, ERROR_CODES } from '../config/api'

// Alert-specific API request function
async function alertApiRequest<T>(
	endpoint: string,
	options: RequestInit = {},
	retryCount = 0
): Promise<T> {
	const url = `${currentApiConfig.baseUrl}${endpoint}`
	
	const defaultOptions: RequestInit = {
		headers: {
			...DEFAULT_HEADERS,
			...options.headers,
		},
		...options,
	}

	try {
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), currentApiConfig.timeout)
		
		const response = await fetch(url, {
			...defaultOptions,
			signal: controller.signal
		})
		
		clearTimeout(timeoutId)
		
		if (!response.ok) {
			const errorMessage = ERROR_CODES[response.status as keyof typeof ERROR_CODES] || `HTTP ${response.status}`
			throw new Error(errorMessage)
		}
		
		return await response.json()
	} catch (error) {
		console.error('Alert API request failed:', error)
		
		// Retry logic
		if (retryCount < currentApiConfig.retryAttempts && error instanceof Error && error.name !== 'AbortError') {
			console.log(`Retrying alert request (${retryCount + 1}/${currentApiConfig.retryAttempts})...`)
			await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
			return alertApiRequest<T>(endpoint, options, retryCount + 1)
		}
		
		throw error
	}
}

// Alert interfaces
export interface Alert {
	id: number
	message: string
	alert_type: string
	severity: 'low' | 'medium' | 'high' | 'critical'
	source: string
	created_at: string
	is_cleared: boolean
	cleared_at?: string
	cleared_by?: string
}

export interface AlertCount {
	count: number
	severity_stats: Record<string, number>
}

export interface AlertListResponse {
	alerts: Alert[]
	total: number
	page: number
	size: number
}

export interface AlertListParams {
	page?: number
	size?: number
	severity?: string
	alert_type?: string
}

// Alert API functions
export const alertService = {
	// Get alert count and severity stats
	async getAlertCount(): Promise<AlertCount> {
		return alertApiRequest<AlertCount>(API_ENDPOINTS.alerts.count)
	},

	// Get alert list with pagination and filters
	async getAlerts(params: AlertListParams = {}): Promise<AlertListResponse> {
		const searchParams = new URLSearchParams()
		
		if (params.page) searchParams.append('page', params.page.toString())
		if (params.size) searchParams.append('size', params.size.toString())
		if (params.severity) searchParams.append('severity', params.severity)
		if (params.alert_type) searchParams.append('alert_type', params.alert_type)
		
		const url = `${API_ENDPOINTS.alerts.list}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
		return alertApiRequest<AlertListResponse>(url)
	},

	// Clear all alerts
	async clearAllAlerts(): Promise<{ success: boolean; message: string }> {
		return alertApiRequest<{ success: boolean; message: string }>(
			API_ENDPOINTS.alerts.clearAll,
			{ method: 'DELETE' }
		)
	},

	// Clear single alert
	async clearAlert(alertId: number): Promise<{ success: boolean; message: string }> {
		const url = API_ENDPOINTS.alerts.clearSingle.replace('{id}', alertId.toString())
		return alertApiRequest<{ success: boolean; message: string }>(
			url,
			{ method: 'DELETE' }
		)
	},

	// Create test alert (for development)
	async createTestAlert(): Promise<{ success: boolean; message: string; alert_id: number }> {
		return alertApiRequest<{ success: boolean; message: string; alert_id: number }>(
			API_ENDPOINTS.alerts.createTest,
			{ method: 'POST' }
		)
	}
}