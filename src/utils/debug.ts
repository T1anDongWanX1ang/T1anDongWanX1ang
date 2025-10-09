// 调试工具
import { currentConfig } from '../config/environment'

export const debugAPI = {
	// 测试基本连接
	async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
		try {
			console.log('🔍 测试后端连接:', currentConfig.apiBaseUrl)
			
			// 先测试根路径
			const rootResponse = await fetch(currentConfig.apiBaseUrl, {
				method: 'GET',
				headers: { 'Accept': 'application/json' },
				signal: AbortSignal.timeout(5000)
			})
			
			console.log('根路径响应:', rootResponse.status, rootResponse.statusText)
			
			// 测试docs路径
			const docsResponse = await fetch(`${currentConfig.apiBaseUrl}/docs`, {
				method: 'GET',
				signal: AbortSignal.timeout(5000)
			})
			
			console.log('文档路径响应:', docsResponse.status, docsResponse.statusText)
			
			// 测试openapi.json
			const openapiResponse = await fetch(`${currentConfig.apiBaseUrl}/openapi.json`, {
				method: 'GET',
				headers: { 'Accept': 'application/json' },
				signal: AbortSignal.timeout(5000)
			})
			
			console.log('OpenAPI响应:', openapiResponse.status, openapiResponse.statusText)
			
			if (openapiResponse.ok) {
				const openapi = await openapiResponse.json()
				console.log('可用的API路径:', Object.keys(openapi.paths || {}))
				return {
					success: true,
					message: '后端连接成功',
					details: {
						baseUrl: currentConfig.apiBaseUrl,
						availablePaths: Object.keys(openapi.paths || {}),
						rootStatus: rootResponse.status,
						docsStatus: docsResponse.status
					}
				}
			} else {
				return {
					success: false,
					message: '后端服务响应异常',
					details: {
						rootStatus: rootResponse.status,
						docsStatus: docsResponse.status,
						openapiStatus: openapiResponse.status
					}
				}
			}
		} catch (error) {
			console.error('连接测试失败:', error)
			return {
				success: false,
				message: error instanceof Error ? error.message : '未知错误',
				details: { error: error instanceof Error ? error.name : 'Unknown' }
			}
		}
	},

	// 测试具体的上传端点
	async testUploadEndpoint(): Promise<{ success: boolean; message: string; details?: any }> {
		try {
			const uploadUrl = `${currentConfig.apiBaseUrl}/api/v1/upload-template`
			console.log('🔍 测试上传端点:', uploadUrl)
			
			// 创建一个简单的测试文件
			const testFile = new File(['col1,col2\nvalue1,value2'], 'test.csv', { type: 'text/csv' })
			const formData = new FormData()
			formData.append('file', testFile)
			formData.append('chain_name', 'ethereum')
			formData.append('protocol_type', 'dex')
			
			const response = await fetch(uploadUrl, {
				method: 'POST',
				body: formData,
				headers: {
					'Accept': 'application/json'
				},
				signal: AbortSignal.timeout(10000)
			})
			
			console.log('上传端点响应:', response.status, response.statusText)
			
			const responseText = await response.text()
			console.log('响应内容:', responseText)
			
			let responseData: any = null
			try {
				responseData = JSON.parse(responseText)
			} catch (e) {
				console.log('响应不是有效的JSON:', responseText)
			}
			
			return {
				success: response.ok,
				message: response.ok ? '上传端点可用' : `上传端点错误 (${response.status})`,
				details: {
					status: response.status,
					statusText: response.statusText,
					responseData,
					responseText: responseText.substring(0, 500) // 只显示前500字符
				}
			}
		} catch (error) {
			console.error('上传端点测试失败:', error)
			return {
				success: false,
				message: error instanceof Error ? error.message : '未知错误',
				details: { error: error instanceof Error ? error.name : 'Unknown' }
			}
		}
	},

	// 检查CORS设置
	async testCORS(): Promise<{ success: boolean; message: string; details?: any }> {
		try {
			const response = await fetch(`${currentConfig.apiBaseUrl}/docs`, {
				method: 'OPTIONS',
				headers: {
					'Origin': window.location.origin,
					'Access-Control-Request-Method': 'POST',
					'Access-Control-Request-Headers': 'content-type'
				}
			})
			
			const corsHeaders = {
				'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
				'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
				'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
			}
			
			console.log('CORS响应头:', corsHeaders)
			
			return {
				success: response.ok,
				message: response.ok ? 'CORS配置正常' : 'CORS配置可能有问题',
				details: corsHeaders
			}
		} catch (error) {
			return {
				success: false,
				message: 'CORS测试失败',
				details: { error: error instanceof Error ? error.message : 'Unknown' }
			}
		}
	}
}
