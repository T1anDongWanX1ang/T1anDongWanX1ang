import { currentApiConfig, API_ENDPOINTS, DEFAULT_HEADERS, ERROR_CODES } from '../config/api'
import { authFetch } from '../utils/fetch'

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
		
		const response = await authFetch(url, {
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


async function apiRequest1<T>(
	endpoint: string,
	options: RequestInit = {},
	retryCount = 0
): Promise<T> {
	const url = `http://localhost:8002${endpoint}`
	
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
		
		const response = await authFetch(url, {
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

// 合约方法查询相关API
export interface ContractMethodParameter {
	name: string
	type: string
	indexed?: boolean
	internal_type?: string
}

export interface ContractMethod {
	name: string
	type: string
	inputs: ContractMethodParameter[]
	outputs?: ContractMethodParameter[]
	state_mutability?: string
	signature?: string
	selector?: string
	anonymous?: boolean
}

export interface ContractMethodQueryResult {
	contract_address: string
	chain_name: string
	contract_name?: string
	methods: ContractMethod[]
	events: ContractMethod[]
	functions: ContractMethod[]
	matched_methods: ContractMethod[]
	query_metadata?: {
		total_functions: number
		total_events: number
		matched_methods_count: number
		query_event_name?: string
		abi_source_type?: string
		contract_abi_id?: number
	}
}

export interface BatchMethodQueryRequest {
	queries: Array<{
		contract_address: string
		chain_name?: string
		event_name?: string
		method_types?: string[]
	}>
}

export interface BatchMethodQueryResult {
	success: boolean
	data: ContractMethodQueryResult[]
	total_queries: number
	successful_queries: number
	failed_queries: number
}

export interface MethodType {
	value: string
	label: string
	description: string
}

// 合约方法查询API
export const contractMethodsAPI = {
	// 查询单个合约的方法
	async queryContractMethods(
		contractAddress: string, 
		chainName?: string, 
		eventName?: string, 
		methodTypes?: string[]
	): Promise<ContractMethodQueryResult> {
		const params = new URLSearchParams()
		if (chainName) params.append('chain_name', chainName)
		if (eventName) params.append('event_name', eventName)
		if (methodTypes && methodTypes.length > 0) {
			params.append('method_types', methodTypes.join(','))
		}
		
		return apiRequest1<ContractMethodQueryResult>(
			`/api/v1/contracts/${contractAddress}/methods/query?${params}`
		)
	},

	// 批量查询合约方法
	async batchQueryContractMethods(request: BatchMethodQueryRequest): Promise<BatchMethodQueryResult> {
		return apiRequest1<BatchMethodQueryResult>(
			'/api/v1/contracts/batch/methods/query',
			{
				method: 'POST',
				body: JSON.stringify(request)
			}
		)
	},

	// 查询特定方法
	async getSpecificMethod(
		contractAddress: string, 
		methodName: string, 
		chainName?: string
	): Promise<ContractMethod[]> {
		const params = new URLSearchParams()
		if (chainName) params.append('chain_name', chainName)
		
		return apiRequest1<ContractMethod[]>(
			`/api/v1/contracts/${contractAddress}/methods/${methodName}?${params}`
		)
	},

	// 获取支持的方法类型
	async getSupportedMethodTypes(): Promise<{ method_types: MethodType[] }> {
		return apiRequest1<{ method_types: MethodType[] }>(
			'/api/v1/contracts/methods/types'
		)
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

// Pipeline Create 相关类型
export interface PipelineCreateRequest {
	classification_id: number
	name: string
	description: string
}

export interface PipelineCreateResponse {
	success: boolean
	message: string
	data: {
		pipeline_id: number
		name: string
		description: string
		classification_id: number
		create_time: string
	}
}

// Pipeline Config 相关类型
export interface PipelineConfigData {
	pipeline_id: number
	pipeline_name: string
	description: string
	create_time: string
	update_time: string
	components: any[]  // 使用 any[] 类型，保持灵活性
}

export interface PipelineConfigResponse {
	success: boolean
	message: string
	data: PipelineConfigData
}

// Pipeline Save Config 相关类型
export interface PipelineSaveConfigRequest {
	pipeline_id: number
	pipeline_info: string
}

export interface PipelineSaveConfigResponse {
	success: boolean
	message: string
	pipeline_id: number
	components_created: number
}

// Pipeline Start 相关类型
export interface PipelineStartRequest {
	pipeline_id: number
}

export interface PipelineStartResponse {
	success: boolean
	message: string
	pipeline_id: number
	status: string
	start_time?: string
}

// Pipeline Task 相关类型
export interface PipelineTaskResponse {
	success: boolean
	message: string
	task_id: number
	pipeline_id: number
	status: number
	status_text: string
	create_time: string
	log_path: string
}

// Pipeline Latest Task 相关类型
export interface PipelineLatestTaskResponse {
	success: boolean
	message: string
	pipeline_id: number
	task: {
		task_id: number
		pipeline_id: number
		pipeline_name: string
		pipeline_description: string
		status: number
		status_text: string
		create_time: string
		log_path: string
	} | null
}

// Pipeline Task Log 相关类型
export interface PipelineTaskLogResponse {
	success: boolean
	message: string
	task_id: number
	log_path: string
	log_content: string
	total_lines: number
	returned_lines: number
}

// Pipeline Delete 相关类型
export interface PipelineDeleteResponse {
	success: boolean
	message: string
}

export interface ClassificationDeleteResponse {
	success: boolean
	message: string
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
			
			const response = await authFetch(url, {
				method: 'POST',
				body: formData,
				// 不设置Content-Type，让浏览器自动设置multipart/form-data
				headers: {
					'Accept': 'application/json'
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

	// 保存摄入配置 (新JSON格式)
	saveIngestionConfig: async (data: {
		component_id: number
		module_content: {
			kafka: {
				servers: string
			}
			chains: string[]
			chainConfigs: {
				[chainName: string]: {
					id?: number
					kafka: {
						topics?: string
						groupId?: string
					}
					doris: {
						host?: string
						port?: string
						user?: string
						password?: string
						db?: string
					}
					mapper: {
						[tableName: string]: string | undefined
					}
					tables: {
						[tableName: string]: {
							name: string
							columns: string[]
							buffer: {
								size?: number
							}
						}
					}
				}
			}
		}
	}): Promise<{success: boolean, data: {message: string}}> => {
		return apiRequest1(API_ENDPOINTS.fieldParsing.saveIngestionConfig, {
			method: 'POST',
			body: JSON.stringify(data),
		})
	},

	// 启动 Flink 任务
	startFlinkJob: async (): Promise<{success: boolean, data: any, message?: string}> => {
		try {
			const url = `${currentApiConfig.baseUrl}/api/v1/start-flink-job`
			console.log('🚀 启动 Flink 任务:', url)
			
			const response = await authFetch(url, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				}
			})
			
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`)
			}
			
			const data = await response.json()
			console.log('✅ Flink 任务启动响应:', data)
			
			return {
				success: true,
				data: data,
				message: 'Flink job started successfully'
			}
		} catch (error) {
			console.error('❌ 启动 Flink 任务失败:', error)
			return {
				success: false,
				data: null,
				message: error instanceof Error ? error.message : 'Unknown error'
			}
		}
	},


	// 获取组件配置数据 (从数据库读取ID=2的配置)
	getComponentConfig: async (componentId: number = 2): Promise<{
		success: boolean,
		data: {
			job?: {
				name: string
			}
			[key: string]: any
		} | null,
		message?: string
	}> => {
		try {
			// 使用正确的组件配置API端点
			const endpoint = API_ENDPOINTS.fieldParsing.getComponentConfig.replace('{componentId}', componentId.toString())
			const url = `${currentApiConfig.baseUrl}${endpoint}`
			console.log('🔍 获取组件配置:', url)
			
			const response = await authFetch(url, {
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				}
			})
			
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`)
			}
			
			const result = await response.json()
			console.log('✅ 组件配置获取成功:', result)
			
			// 检查API响应格式
			if (result && result.success && result.data && result.data.job && result.data.job.name) {
				console.log('✅ 从配置中找到job名称:', result.data.job.name)
				return {
					success: true,
					data: result.data,
					message: 'Component config retrieved successfully'
				}
			}
			
			// 如果没有找到job信息，返回失败
			console.log('⚠️ 配置响应格式不正确或未找到job信息')
			return {
				success: false,
				data: null,
				message: 'Job configuration not found or invalid format'
			}
		} catch (error) {
			console.error('❌ 获取组件配置失败:', error)
			return {
				success: false,
				data: null,
				message: error instanceof Error ? error.message : 'Unknown error'
			}
		}
	},
	// 获取 Flink 任务信息
	getJobInfo: async (jobName?: string, outputFormat: string = 'json'): Promise<{
		success: boolean, 
		data: {
			jobs?: Array<{
				job_id: string,
				job_name: string,
				job_state: string,
				[key: string]: any
			}>,
			total_jobs?: number,
			metadata?: {
				query_time?: string,
				running_jobs_count?: number,
				flink_server?: string,
				[key: string]: any
			}
		}, 
		message?: string
	}> => {
		// 如果没有提供jobName，尝试从配置中获取
		let finalJobName = jobName
		if (!finalJobName) {
			try {
				console.log('�� 未提供job名称，尝试从配置中获取...')
				const configResponse = await fieldParsingAPI.getComponentConfig(2)
				if (configResponse.success && configResponse.data && configResponse.data.job && configResponse.data.job.name) {
					finalJobName = configResponse.data.job.name
					console.log('✅ 从配置中获取到job名称:', finalJobName)
				} else {
					console.log('⚠️ 配置中未找到job名称，使用默认值')
					finalJobName = 'DDC-RTC-DataProc'
				}
			} catch (error) {
				console.warn('⚠️ 获取配置失败，使用默认job名称:', error)
				finalJobName = 'DDC-RTC-DataProc'
			}
		}
		
		const params = new URLSearchParams({
			job_name: finalJobName,
			output_format: outputFormat
		})
		
		// 使用简单的 fetch 请求，避免超时问题
		try {
			const url = `${currentApiConfig.baseUrl}/api/v1/get-job-info?${params.toString()}`
			console.log('🔍 请求 Flink 任务信息:', url)
			
			const response = await authFetch(url, {
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				}
			})
			
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`)
			}
			
			const data = await response.json()
			console.log('✅ Flink 任务信息原始响应:', data)
			
			// 直接返回原始数据，不再包装
			// 这样 fetchJobInfo 就能直接访问 data.jobs
			if (data && data.success !== undefined) {
				// 如果原始响应已经有 success 字段，直接返回
				console.log('📦 返回原始API响应格式')
				return data
			} else {
				// 否则包装成标准格式  
				console.log('📦 包装成标准格式')
				return {
					success: true,
					data: data,
					message: 'Job info retrieved successfully'
				}
			}
		} catch (error) {
			console.error('❌ 获取 Flink 任务信息失败:', error)
			return {
				success: false,
				data: {},
				message: error instanceof Error ? error.message : 'Unknown error'
			}
		}
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
		
		// 使用统一的API配置
		const url = `${currentApiConfig.baseUrl}${API_ENDPOINTS.file.upload}`
		
		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), currentApiConfig.timeout)
			
			const response = await authFetch(url, {
				method: 'POST',
				body: formData,
				// 不设置Content-Type，让浏览器自动设置multipart/form-data
				headers: {
					'Accept': 'application/json'
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
		const url = `${currentApiConfig.baseUrl}${API_ENDPOINTS.pipeline.tree}`
		
		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), currentApiConfig.timeout)
			
			const response = await authFetch(url, {
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
	},
	
	// 创建管道
	create: async (request: PipelineCreateRequest): Promise<PipelineCreateResponse> => {
		const url = `${currentApiConfig.baseUrl}${API_ENDPOINTS.pipeline.create}`
		
		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), currentApiConfig.timeout)
			
			const response = await authFetch(url, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(request),
				signal: controller.signal
			})
			
			clearTimeout(timeoutId)
			
			if (!response.ok) {
				const errorMessage = ERROR_CODES[response.status as keyof typeof ERROR_CODES] || `HTTP ${response.status}`
				throw new Error(errorMessage)
			}
			
			return await response.json()
		} catch (error) {
			console.error('Pipeline create request failed:', error)
			throw error
		}
	},
	
	// 获取管道配置
	getConfig: async (pipelineId: number): Promise<PipelineConfigResponse> => {
		const url = `${currentApiConfig.baseUrl}${API_ENDPOINTS.pipeline.getConfig}/${pipelineId}`
		
		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), currentApiConfig.timeout)
			
			const response = await authFetch(url, {
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				},
				signal: controller.signal
			})
			
			clearTimeout(timeoutId)
			
			if (!response.ok) {
				if (response.status === 404) {
					// 404 情况下返回特殊标识，表示管道配置不存在
					console.log(`Pipeline ${pipelineId} config not found (404)`)
					return {
						success: false,
						message: 'Pipeline configuration not found',
						data: {
							pipeline_id: pipelineId,
							pipeline_name: '',
							description: '',
							create_time: '',
							update_time: '',
							components: []
						}
					}
				}
				const errorMessage = ERROR_CODES[response.status as keyof typeof ERROR_CODES] || `HTTP ${response.status}`
				throw new Error(errorMessage)
			}
			
			const result = await response.json()
			console.log(`Pipeline ${pipelineId} config loaded:`, result)
			
			// 后端已经返回了正确的格式，不需要额外转换
			
			// 后端直接返回管道配置数据，需要包装成标准格式
			return {
				success: true,
				message: 'Pipeline configuration loaded successfully',
				data: result
			}
		} catch (error) {
			console.error('Pipeline config request failed:', error)
			// 网络错误等情况，返回空配置而不是抛出异常
			return {
				success: false,
				message: `Failed to load pipeline config: ${error instanceof Error ? error.message : 'Unknown error'}`,
				data: {
					pipeline_id: pipelineId,
					pipeline_name: '',
					description: '',
					create_time: '',
					update_time: '',
					components: []
				}
			}
		}
	},
	
	// 保存管道配置
	saveConfig: async (request: PipelineSaveConfigRequest): Promise<PipelineSaveConfigResponse> => {
		const url = `${currentApiConfig.baseUrl}${API_ENDPOINTS.pipeline.saveConfig}`
		
		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), currentApiConfig.timeout)
			
			const response = await authFetch(url, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(request),
				signal: controller.signal
			})
			
			clearTimeout(timeoutId)
			
			if (!response.ok) {
				const errorMessage = ERROR_CODES[response.status as keyof typeof ERROR_CODES] || `HTTP ${response.status}`
				throw new Error(errorMessage)
			}
			
			const result = await response.json()
			console.log(`Pipeline config saved successfully:`, result)
			return result
		} catch (error) {
			console.error('Pipeline config save failed:', error)
			throw error
		}
	},
	
	// 启动管道
	start: async (request: PipelineStartRequest): Promise<PipelineStartResponse> => {
		const url = `${currentApiConfig.baseUrl}${API_ENDPOINTS.pipeline.start}`
		
		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), currentApiConfig.timeout)
			
			const response = await authFetch(url, {
				method: 'POST',
				headers: DEFAULT_HEADERS,
				body: JSON.stringify(request),
				signal: controller.signal
			})
			
			clearTimeout(timeoutId)
			
			if (!response.ok) {
				const errorMessage = ERROR_CODES[response.status as keyof typeof ERROR_CODES] || `HTTP ${response.status}`
				throw new Error(errorMessage)
			}
			
			const result = await response.json()
			console.log(`Pipeline ${request.pipeline_id} started successfully:`, result)
			return result
		} catch (error) {
			console.error('Pipeline start failed:', error)
			throw error
		}
	},
	
	// 获取管道任务状态
	getTask: async (taskId: number): Promise<PipelineTaskResponse> => {
		const url = `${currentApiConfig.baseUrl}${API_ENDPOINTS.pipeline.getTask}/${taskId}`
		
		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), currentApiConfig.timeout)
			
			const response = await authFetch(url, {
				method: 'GET',
				headers: DEFAULT_HEADERS,
				signal: controller.signal
			})
			
			clearTimeout(timeoutId)
			
			if (!response.ok) {
				const errorMessage = ERROR_CODES[response.status as keyof typeof ERROR_CODES] || `HTTP ${response.status}`
				throw new Error(errorMessage)
			}
			
			const result = await response.json()
			console.log(`Pipeline task ${taskId} status loaded:`, result)
			return result
		} catch (error) {
			console.error('Pipeline task query failed:', error)
			throw error
		}
	},
	
	// 获取管道最新任务状态
	getLatestTask: async (pipelineId: number): Promise<PipelineLatestTaskResponse> => {
		console.log('🔍 调试信息:', {
			'currentApiConfig': currentApiConfig,
			'baseUrl': currentApiConfig.baseUrl,
			'pipelineId': pipelineId
		})
		const url = `${currentApiConfig.baseUrl}/api/v1/pipeline/pipeline/${pipelineId}/latest-task`
		console.log('🔗 构建的API URL:', url)
		
		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), currentApiConfig.timeout)
			
			const response = await authFetch(url, {
				method: 'GET',
				headers: DEFAULT_HEADERS,
				signal: controller.signal
			})
			
			clearTimeout(timeoutId)
			
			if (!response.ok) {
				const errorMessage = ERROR_CODES[response.status as keyof typeof ERROR_CODES] || `HTTP ${response.status}`
				throw new Error(errorMessage)
			}
			
			const result = await response.json()
			console.log(`Pipeline ${pipelineId} latest task loaded:`, result)
			return result
		} catch (error) {
			console.error('Pipeline latest task query failed:', error)
			throw error
		}
	},
	
	// 获取管道任务日志
	getTaskLog: async (taskId: number): Promise<PipelineTaskLogResponse> => {
		const url = `${currentApiConfig.baseUrl}${API_ENDPOINTS.pipeline.getTaskLog}/${taskId}/log`
		console.log('🔗 构建的日志API URL:', url)
		
		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), currentApiConfig.timeout)
			
			const response = await authFetch(url, {
				method: 'GET',
				headers: DEFAULT_HEADERS,
				signal: controller.signal
			})
			
			clearTimeout(timeoutId)
			
			if (!response.ok) {
				const errorMessage = ERROR_CODES[response.status as keyof typeof ERROR_CODES] || `HTTP ${response.status}`
				throw new Error(errorMessage)
			}
			
			const result = await response.json()
			console.log(`Pipeline task ${taskId} log loaded:`, result)
			return result
		} catch (error) {
			console.error('Pipeline task log query failed:', error)
			throw error
		}
	},
	
	// 删除分类
	deleteClassification: async (classificationId: number): Promise<ClassificationDeleteResponse> => {
		const url = `${currentApiConfig.baseUrl}${API_ENDPOINTS.pipeline.deleteClassification.replace('{classification_id}', classificationId.toString())}`
		console.log('🗑️ 删除分类API URL:', url)
		
		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), currentApiConfig.timeout)
			
			const response = await authFetch(url, {
				method: 'DELETE',
				headers: DEFAULT_HEADERS,
				signal: controller.signal
			})
			
			clearTimeout(timeoutId)
			
			if (!response.ok) {
				const errorMessage = ERROR_CODES[response.status as keyof typeof ERROR_CODES] || `HTTP ${response.status}`
				throw new Error(errorMessage)
			}
			
			const result = await response.json()
			console.log(`Classification ${classificationId} deleted successfully:`, result)
			return result
		} catch (error) {
			console.error('Classification delete failed:', error)
			throw error
		}
	},
	
	// 删除管道
	deletePipeline: async (pipelineId: number): Promise<PipelineDeleteResponse> => {
		const url = `${currentApiConfig.baseUrl}${API_ENDPOINTS.pipeline.deletePipeline.replace('{pipeline_id}', pipelineId.toString())}`
		console.log('🗑️ 删除管道API URL:', url)
		
		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), currentApiConfig.timeout)
			
			const response = await authFetch(url, {
				method: 'DELETE',
				headers: DEFAULT_HEADERS,
				signal: controller.signal
			})
			
			clearTimeout(timeoutId)
			
			if (!response.ok) {
				const errorMessage = ERROR_CODES[response.status as keyof typeof ERROR_CODES] || `HTTP ${response.status}`
				throw new Error(errorMessage)
			}
			
			const result = await response.json()
			console.log(`Pipeline ${pipelineId} deleted successfully:`, result)
			return result
		} catch (error) {
			console.error('Pipeline delete failed:', error)
			throw error
		}
	}
}

// ABI管理API
export const abiAPI = {
	// 获取ABI列表
	listAbis: async (params?: {
		contract_address?: string
		contract_name?: string
		page?: number
		limit?: number
		size?: number
	}): Promise<{
		success: boolean
		data: {
			items: Array<{
				id: number
				contract_address: string
				contract_name?: string
				abi_content: any
				chain_name: string
				source_type: string
				created_at: string
				updated_at: string
			}>
			total: number
			page: number
			size: number
			pages: number
		}
	}> => {
		const queryParams = new URLSearchParams()
		if (params?.contract_address) queryParams.append('contract_address', params.contract_address)
		if (params?.contract_name) queryParams.append('contract_name', params.contract_name)
		if (params?.page) queryParams.append('page', params.page.toString())
		if (params?.size) queryParams.append('size', params.size.toString())
		if (params?.limit) queryParams.append('size', params.limit.toString()) // 兼容limit参数
		
		const endpoint = `${API_ENDPOINTS.abi.list}${queryParams.toString() ? '?' + queryParams.toString() : ''}`
		
		try {
			// 直接调用后端API，返回格式：{total, page, size, items}
			const backendResponse = await apiRequest<{
				total: number
				page: number
				size: number
				items: Array<{
					id: number
					contract_address: string
					contract_name?: string
					abi_content: any
					chain_name: string
					source_type: string
					created_at: string
					updated_at: string
				}>
			}>(endpoint)
			
			// 转换为前端期望的格式
			return {
				success: true,
				data: {
					items: backendResponse.items || [],
					total: backendResponse.total || 0,
					page: backendResponse.page || 1,
					size: backendResponse.size || 10,
					pages: Math.ceil((backendResponse.total || 0) / (backendResponse.size || 10))
				}
			}
		} catch (error) {
			console.error('获取ABI列表失败:', error)
			return {
				success: false,
				data: {
					items: [],
					total: 0,
					page: 1,
					size: 10,
					pages: 0
				}
			}
		}
	},

	// 获取单个ABI
	getAbi: async (id: number): Promise<{
		success: boolean
		data: {
			id: number
			contract_address: string
			contract_name?: string
			abi_content: any
			chain_id: number
			created_at: string
			updated_at: string
		}
	}> => {
		const endpoint = API_ENDPOINTS.abi.get.replace('{id}', id.toString())
		return apiRequest(endpoint)
	},

	// 根据地址获取ABI
	getAbiByAddress: async (contractAddress: string, chainId?: number): Promise<{
		success: boolean
		data?: {
			id: number
			contract_address: string
			contract_name?: string
			abi_content: any
			chain_id: number
			created_at: string
			updated_at: string
		}
	}> => {
		const queryParams = new URLSearchParams()
		queryParams.append('contract_address', contractAddress)
		if (chainId) queryParams.append('chain_id', chainId.toString())
		
		const endpoint = `${API_ENDPOINTS.abi.list}?${queryParams.toString()}`
		const response = await apiRequest<{
			success: boolean
			data: {
				items: Array<{
					id: number
					contract_address: string
					contract_name?: string
					abi_content: any
					chain_id: number
					created_at: string
					updated_at: string
				}>
			}
		}>(endpoint)
		
		if (response.success && response.data.items.length > 0) {
			return {
				success: true,
				data: response.data.items[0]
			}
		}
		return { success: false }
	},

	// 创建ABI
	createAbi: async (data: {
		contract_address: string
		contract_name?: string
		abi_content: any
		chain_id: number
	}): Promise<{
		success: boolean
		data: {
			id: number
			contract_address: string
			contract_name?: string
			abi_content: any
			chain_id: number
		}
	}> => {
		return apiRequest(API_ENDPOINTS.abi.create, {
			method: 'POST',
			body: JSON.stringify(data),
		})
	}
}

// 合约信息查询API
export const contractInfoAPI = {
	// 获取合约基本信息
	getContractInfo: async (contractAddress: string, chainName: string): Promise<{
		success: boolean
		data?: {
			contract_address: string
			chain_name: string
			name?: string
			symbol?: string
			decimals?: number
			total_supply?: string
			is_erc20_compatible: boolean
			query_metadata: any
		}
		message?: string
	}> => {
		try {
			const endpoint = `/api/v1/contracts/${contractAddress}/info?chain_name=${chainName}`
			const response = await apiRequest1<{
				contract_address: string
				chain_name: string
				name?: string
				symbol?: string
				decimals?: number
				total_supply?: string
				is_erc20_compatible: boolean
				query_metadata: any
			}>(endpoint)
			
			return {
				success: true,
				data: response,
				message: '合约信息获取成功'
			}
		} catch (error) {
			console.error('获取合约信息失败:', error)
			return {
				success: false,
				message: error instanceof Error ? error.message : '获取合约信息失败'
			}
		}
	},

	// 专门获取合约decimals（快速查询）
	getContractDecimals: async (contractAddress: string, chainName: string): Promise<{
		success: boolean
		contract_address: string
		chain_name: string
		decimals?: number
		error?: string
		message: string
	}> => {
		try {
			const endpoint = `/api/v1/contracts/${contractAddress}/decimals?chain_name=${chainName}`
			const response = await apiRequest1<{
				success: boolean
				contract_address: string
				chain_name: string
				decimals?: number
				error?: string
				message: string
			}>(endpoint)
			
			return response
		} catch (error) {
			console.error('获取合约decimals失败:', error)
			return {
				success: false,
				contract_address: contractAddress,
				chain_name: chainName,
				message: error instanceof Error ? error.message : '获取decimals失败'
			}
		}
	},

	// 批量获取多个合约的decimals
	getBatchContractDecimals: async (contracts: Array<{
		contract_address: string
		chain_name: string
	}>): Promise<Array<{
		success: boolean
		contract_address: string
		chain_name: string
		decimals?: number
		error?: string
		message: string
	}>> => {
		try {
			// 并行查询所有合约的decimals
			const promises = contracts.map(contract => 
				contractInfoAPI.getContractDecimals(contract.contract_address, contract.chain_name)
			)
			
			const results = await Promise.all(promises)
			return results
		} catch (error) {
			console.error('批量获取合约decimals失败:', error)
			// 如果批量查询失败，返回失败结果
			return contracts.map(contract => ({
				success: false,
				contract_address: contract.contract_address,
				chain_name: contract.chain_name,
				message: '批量查询失败'
			}))
		}
	}
}

// 转化器预览相关接口
export interface TransformPreviewRequest {
	transformer: string
	source_value: string
	context?: Record<string, any>
}

export interface TransformPreviewResponse {
	success: boolean
	message: string
	source_value: string
	transformed_value: string
	transformer: string
}

const transformAPI = {
	// 转化器预览
	preview: async (data: TransformPreviewRequest): Promise<TransformPreviewResponse> => {
		return apiRequest1<TransformPreviewResponse>(API_ENDPOINTS.TRANSFORM_PREVIEW, {
			method: 'POST',
			body: JSON.stringify(data)
		})
	}
}

// 导出所有API
export const api = {
	fieldParsing: fieldParsingAPI,
	chain: chainAPI,
	protocol: protocolAPI,
	validation: validationAPI,
	file: fileAPI,
	pipeline: pipelineAPI,
	abi: abiAPI,
	contractInfo: contractInfoAPI,
	transform: transformAPI
}
