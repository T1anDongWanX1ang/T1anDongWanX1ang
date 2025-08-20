import { currentApiConfig, API_ENDPOINTS, DEFAULT_HEADERS, ERROR_CODES } from '../config/api'

// 通用请求函数
async function apiRequest<T>(
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
		console.error('API request failed:', error)
		
		// 重试逻辑
		if (retryCount < currentApiConfig.retryAttempts && error instanceof Error && error.name !== 'AbortError') {
			console.log(`Retrying request (${retryCount + 1}/${currentApiConfig.retryAttempts})...`)
			await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))) // 指数退避
			return apiRequest<T>(endpoint, options, retryCount + 1)
		}
		
		throw error
	}
}

// 字段解析相关API
export interface FieldParsingRequest {
	chain_name: string
	contract_address: string
	abi_path: string
	events_to_monitor: string[]
	mode: 'realtime' | 'batch'
	poll_interval?: number
}

export interface FieldParsingResponse {
	success: boolean
	data: {
		fields: Array<{
			source_key: string
			target_key: string
			transformer: string
			description: string
		}>
		message: string
	}
}

export interface TemplateUploadRequest {
	file: File
	chain_name: string
	protocol_type: string
}

export interface TemplateUploadResponse {
	success: boolean
	data: {
		parsed_fields: Array<{
			source_key: string
			target_key: string
			transformer: string
			description: string
		}>
		message: string
	}
}

export interface ValidationResponse {
	success: boolean
	data: {
		valid: boolean
		errors: string[]
		warnings: string[]
		message: string
	}
}

// 文件上传相关接口
export interface FileUploadRequest {
	file: File
}

export interface FileUploadResponse {
	success: boolean
	message: string
	file_path: string
	file_name: string
	file_size: number
	upload_time: string
}

// Pipeline Tree 相关类型
export interface PipelineTreeNode {
	id: number
	parent_id: number | null
	name: string
	description: string | null
	create_time: string
	update_time: string | null
	type: 'classification' | 'pipeline'
	children: PipelineTreeNode[]
}

export interface PipelineTreeResponse {
	success: boolean
	message: string
	data: PipelineTreeNode[]
}

// API函数
export const fieldParsingAPI = {
	// 解析字段映射
	parseFields: async (request: FieldParsingRequest): Promise<FieldParsingResponse> => {
		return apiRequest<FieldParsingResponse>(API_ENDPOINTS.fieldParsing.parseFields, {
			method: 'POST',
			body: JSON.stringify(request),
		})
	},

	// 上传模板文件
	uploadTemplate: async (request: TemplateUploadRequest): Promise<TemplateUploadResponse> => {
		const formData = new FormData()
		formData.append('file', request.file)
		formData.append('chain_name', request.chain_name)
		formData.append('protocol_type', request.protocol_type)
		
		// 对于文件上传，我们需要特殊处理headers
		const url = `${currentApiConfig.baseUrl}${API_ENDPOINTS.fieldParsing.uploadTemplate}`
		
		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), currentApiConfig.timeout)
			
			const response = await fetch(url, {
				method: 'POST',
				body: formData,
				// 不设置Content-Type，让浏览器自动设置multipart/form-data
				headers: {
					'Accept': 'application/json',
					'X-Requested-With': 'XMLHttpRequest'
				},
				signal: controller.signal
			})
			
			clearTimeout(timeoutId)
			
			if (!response.ok) {
				const errorMessage = ERROR_CODES[response.status as keyof typeof ERROR_CODES] || `HTTP ${response.status}`
				throw new Error(errorMessage)
			}
			
			return await response.json()
		} catch (error) {
			console.error('Template upload failed:', error)
			throw error
		}
	},

	// 获取字段解析建议
	getFieldSuggestions: async (chainName: string, protocolType: string): Promise<FieldParsingResponse> => {
		const endpoint = API_ENDPOINTS.fieldParsing.getSuggestions.replace('{chainName}', chainName).replace('{protocolType}', protocolType)
		return apiRequest<FieldParsingResponse>(endpoint)
	},

	// 验证字段映射
	validateMapping: async (mappingRules: Array<{source_key: string, target_key: string, transformer: string}>): Promise<ValidationResponse> => {
		return apiRequest<ValidationResponse>(API_ENDPOINTS.fieldParsing.validateMapping, {
			method: 'POST',
			body: JSON.stringify({ mapping_rules: mappingRules }),
		})
	},

	// 保存字段映射规则到后端
	saveMappingRules: async (mappingData: {
		protocol_id: string
		chain_name: string
		protocol_type: string
		contract_address?: string
		abi_path?: string
		events_to_monitor?: string[]
		mapping_rules: Array<{source_key: string, target_key: string, transformer: string}>
		created_at: string
		updated_at: string
	}): Promise<{success: boolean, data: {message: string}}> => {
		return apiRequest<{success: boolean, data: {message: string}}>(API_ENDPOINTS.fieldParsing.saveMappingRules, {
			method: 'POST',
			body: JSON.stringify(mappingData),
		})
	},

	// 验证日志格式
	validateLogs: async (logData: string): Promise<ValidationResponse> => {
		return apiRequest<ValidationResponse>(API_ENDPOINTS.fieldParsing.validateLogs, {
			method: 'POST',
			body: JSON.stringify({ log_data: logData }),
		})
	},

	// 验证SQL语法
	validateSQL: async (sql: string): Promise<ValidationResponse> => {
		return apiRequest<ValidationResponse>(API_ENDPOINTS.fieldParsing.validateSQL, {
			method: 'POST',
			body: JSON.stringify({ sql }),
		})
	},

	// 执行SQL测试
	executeSQLTest: async (testData: {
		sql: string
		chain_name: string
		protocol_type: string
		test_mode: boolean
	}): Promise<{
		success: boolean
		data: {
			message: string
			row_count?: number
			sample_data?: any[]
			errors?: string[]
		}
	}> => {
		return apiRequest(API_ENDPOINTS.fieldParsing.executeSQLTest, {
			method: 'POST',
			body: JSON.stringify(testData),
		})
	},

	// 测试Kafka连接
	testKafkaConnection: async (kafkaConfig: {
		host: string
		port: number
		topic: string
		settings: any
	}): Promise<{success: boolean, data: any}> => {
		return apiRequest(API_ENDPOINTS.fieldParsing.testKafkaConnection, {
			method: 'POST',
			body: JSON.stringify(kafkaConfig),
		})
	},

	// 测试Doris连接
	testDorisConnection: async (dorisConfig: {
		host: string
		port: number
		username: string
		password: string
		database: string
		table: string
	}): Promise<{success: boolean, data: any}> => {
		return apiRequest(API_ENDPOINTS.fieldParsing.testDorisConnection, {
			method: 'POST',
			body: JSON.stringify(dorisConfig),
		})
	},

	// 保存摄入配置
	saveIngestionConfig: async (config: {
		column_id: string
		chain_name: string
		protocol_type: string
		kafka_config: any
		doris_config: any
		created_at: string
		updated_at: string
	}): Promise<{success: boolean, data: {message: string}}> => {
		return apiRequest(API_ENDPOINTS.fieldParsing.saveIngestionConfig, {
			method: 'POST',
			body: JSON.stringify(config),
		})
	}
}

// 链配置API
export const chainAPI = {
	// 获取链配置
	getChainConfig: async (chainName: string) => {
		const endpoint = API_ENDPOINTS.chain.getConfig.replace('{chainName}', chainName)
		return apiRequest(endpoint)
	},
	
	// 获取协议列表
	getProtocols: async (chainName: string) => {
		const endpoint = API_ENDPOINTS.chain.getProtocols.replace('{chainName}', chainName)
		return apiRequest(endpoint)
	},
	
	// 更新链配置
	updateChainConfig: async (chainName: string, config: any) => {
		const endpoint = API_ENDPOINTS.chain.updateConfig.replace('{chainName}', chainName)
		return apiRequest(endpoint, {
			method: 'PUT',
			body: JSON.stringify(config),
		})
	},

	// 测试RPC连接
	testRPCConnection: async (chainName: string, rpcUrl: string, apiKey?: string) => {
		return apiRequest(API_ENDPOINTS.chain.testRPCConnection, {
			method: 'POST',
			body: JSON.stringify({ chain_name: chainName, rpc_url: rpcUrl, api_key: apiKey }),
		})
	},

	// 测试WebSocket连接
	testWSConnection: async (chainName: string, wsUrl: string, apiKey?: string) => {
		return apiRequest(API_ENDPOINTS.chain.testWSConnection, {
			method: 'POST',
			body: JSON.stringify({ chain_name: chainName, ws_url: wsUrl, api_key: apiKey }),
		})
	}
}

// 协议管理API
export const protocolAPI = {
	// 创建协议
	createProtocol: async (protocolData: any) => {
		return apiRequest(API_ENDPOINTS.protocol.create, {
			method: 'POST',
			body: JSON.stringify(protocolData),
		})
	},
	
	// 更新协议
	updateProtocol: async (protocolId: string, protocolData: any) => {
		const endpoint = API_ENDPOINTS.protocol.update.replace('{protocolId}', protocolId)
		return apiRequest(endpoint, {
			method: 'PUT',
			body: JSON.stringify(protocolData),
		})
	},
	
	// 删除协议
	deleteProtocol: async (protocolId: string) => {
		const endpoint = API_ENDPOINTS.protocol.delete.replace('{protocolId}', protocolId)
		return apiRequest(endpoint, {
			method: 'DELETE',
		})
	},
	
	// 获取协议详情
	getProtocolDetails: async (protocolId: string) => {
		const endpoint = API_ENDPOINTS.protocol.getDetails.replace('{protocolId}', protocolId)
		return apiRequest(endpoint)
	}
}

// 数据验证API
export const validationAPI = {
	// 验证日志数据
	validateLogs: async (logData: any) => {
		return apiRequest(API_ENDPOINTS.validation.validateLogs, {
			method: 'POST',
			body: JSON.stringify(logData),
		})
	},
	
	// 验证SQL语句
	validateSQL: async (sqlText: string) => {
		return apiRequest(API_ENDPOINTS.validation.validateSQL, {
			method: 'POST',
			body: JSON.stringify({ sql: sqlText }),
		})
	},
	
	// 验证Kafka配置
	validateKafka: async (kafkaConfig: any) => {
		return apiRequest(API_ENDPOINTS.validation.validateKafka, {
			method: 'POST',
			body: JSON.stringify(kafkaConfig),
		})
	}
}

// 文件管理API
export const fileAPI = {
	// 上传文件
	uploadFile: async (file: File): Promise<FileUploadResponse> => {
		const formData = new FormData()
		formData.append('file', file)
		
		// 使用指定的API地址
		const url = 'http://localhost:8001/api/v1/file/upload'
		
		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), currentApiConfig.timeout)
			
			const response = await fetch(url, {
				method: 'POST',
				body: formData,
				// 不设置Content-Type，让浏览器自动设置multipart/form-data
				headers: {
					'Accept': 'application/json',
					'X-Requested-With': 'XMLHttpRequest'
				},
				signal: controller.signal
			})
			
			clearTimeout(timeoutId)
			
			if (!response.ok) {
				const errorMessage = ERROR_CODES[response.status as keyof typeof ERROR_CODES] || `HTTP ${response.status}`
				throw new Error(errorMessage)
			}
			
			return await response.json()
		} catch (error) {
			console.error('File upload failed:', error)
			throw error
		}
	}
}

// Pipeline 相关API
export const pipelineAPI = {
	// 获取管道树形结构
	getTree: async (): Promise<PipelineTreeResponse> => {
		const url = 'http://localhost:8001/api/v1/pipeline/tree'
		
		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), currentApiConfig.timeout)
			
			const response = await fetch(url, {
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				},
				signal: controller.signal
			})
			
			clearTimeout(timeoutId)
			
			if (!response.ok) {
				const errorMessage = ERROR_CODES[response.status as keyof typeof ERROR_CODES] || `HTTP ${response.status}`
				throw new Error(errorMessage)
			}
			
			return await response.json()
		} catch (error) {
			console.error('Pipeline tree request failed:', error)
			throw error
		}
	}
}

// 导出所有API
export const api = {
	fieldParsing: fieldParsingAPI,
	chain: chainAPI,
	protocol: protocolAPI,
	validation: validationAPI,
	file: fileAPI,
	pipeline: pipelineAPI
}
