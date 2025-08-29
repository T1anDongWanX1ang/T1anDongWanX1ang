import { currentConfig } from './environment'

// 调试：检查配置是否正确加载
console.log('🔍 API配置调试:', {
	'currentConfig': currentConfig,
	'apiBaseUrl': currentConfig?.apiBaseUrl
})

// API端点配置
export const API_ENDPOINTS = {
	// 字段解析相关
	fieldParsing: {
		parseFields: '/api/v1/parse-fields',
		uploadTemplate: '/api/v1/upload-template',
		getSuggestions: '/api/v1/field-suggestions',
		validateMapping: '/api/v1/validate-mapping',
		saveMappingRules: '/api/v1/save-mapping-rules',
		validateLogs: '/api/v1/validate-logs',
		validateSQL: '/api/v1/validate-sql',
		executeSQLTest: '/api/v1/execute-sql-test',
		testKafkaConnection: '/api/v1/test-kafka-connection',
		testDorisConnection: '/api/v1/test-doris-connection',
		saveIngestionConfig: '/api/v1/save-ingestion-config'
	},
	
	// 链配置相关
	chain: {
		getConfig: '/api/v1/chains/{chainName}/config',
		getProtocols: '/api/v1/chains/{chainName}/protocols',
		updateConfig: '/api/v1/chains/{chainName}/config',
		testRPCConnection: '/api/v1/chains/{chainName}/test-rpc',
		testWSConnection: '/api/v1/chains/{chainName}/test-ws'
	},
	
	// 协议相关
	protocol: {
		create: '/api/v1/protocols',
		update: '/api/v1/protocols/{protocolId}',
		delete: '/api/v1/protocols/{protocolId}',
		getDetails: '/api/v1/protocols/{protocolId}'
	},
	
	// 数据验证相关
	validation: {
		validateLogs: '/api/v1/validation/logs',
		validateSQL: '/api/v1/validation/sql',
		validateKafka: '/api/v1/validation/kafka'
	},
	
	// 文件管理相关
	file: {
		upload: '/api/v1/file/upload'
	},
	
	// 管道相关
	pipeline: {
		tree: '/api/v1/pipeline/tree',
		create: '/api/v1/pipeline/create',
		getConfig: '/api/v1/pipeline/config',
		saveConfig: '/api/v1/pipeline/config',
		start: '/api/v1/pipeline/start',
		getTask: '/api/v1/pipeline/task',
		getLatestTask: '/api/v1/pipeline/pipeline/{pipelineId}/latest-task',
		getTaskLog: '/api/v1/pipeline/task',
		deleteClassification: '/api/v1/pipeline/classification/{classification_id}',
		deletePipeline: '/api/v1/pipeline/{pipeline_id}'
	}
}

// 请求头配置
export const DEFAULT_HEADERS = {
	'Content-Type': 'application/json',
	'Accept': 'application/json',
	'X-Requested-With': 'XMLHttpRequest'
}

// 错误码映射
export const ERROR_CODES = {
	400: '请求参数错误',
	401: '未授权访问',
	403: '禁止访问',
	404: '接口不存在',
	500: '服务器内部错误',
	502: '网关错误',
	503: '服务不可用',
	504: '网关超时'
}

// 导出当前配置
export const currentApiConfig = {
	baseUrl: currentConfig.apiBaseUrl,
	timeout: currentConfig.apiTimeout,
	retryAttempts: currentConfig.apiRetryAttempts
}
