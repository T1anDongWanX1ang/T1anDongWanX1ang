import { currentApiConfig, DEFAULT_HEADERS, ERROR_CODES } from '../config/api'
import { authFetch } from '../utils/fetch'

// ABI相关的TypeScript接口定义
export interface ContractAbi {
	id: number
	contract_address: string
	contract_name?: string // 新增合约名称字段
	chain_name: string
	abi_content: any // JSON ABI内容
	file_path?: string
	file_name?: string // 添加file_name字段
	abi_path?: string // 添加abi_path字段
	source_type: 'manual' | 'auto'
	created_at: string
	updated_at: string
}

export interface AbiListRequest {
	page?: number
	size?: number
	chain_name?: string
	contract_address?: string
	contract_name?: string // 支持按合约名称搜索
}

export interface AbiListResponse {
	success: boolean
	data: {
		items: ContractAbi[]
		total: number
		page: number
		size: number
		pages: number
	}
	message: string
}

export interface AbiCreateRequest {
	contract_address: string
	contract_name?: string // 支持合约名称
	chain_name: string
	abi_content?: any
	file_path?: string // 文件路径
	source_type: 'manual' | 'auto'
}

export interface AbiUpdateRequest {
	contract_address?: string
	chain_name?: string
	abi_content?: any
	source_type?: 'manual' | 'auto_fetch'
}

export interface AbiResponse {
	success: boolean
	data: ContractAbi
	message: string
}

export interface FileUploadResponse {
	success: boolean
	data: ContractAbi
	message: string
}

export interface AutoFetchRequest {
	contract_address: string
	chain_name: string
}

// 通用请求函数，支持重试机制
async function abiApiRequest<T>(
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
		console.error('ABI API request failed:', error)
		
		// 重试逻辑
		if (retryCount < currentApiConfig.retryAttempts && error instanceof Error && error.name !== 'AbortError') {
			console.log(`Retrying ABI request (${retryCount + 1}/${currentApiConfig.retryAttempts})...`)
			await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
			return abiApiRequest<T>(endpoint, options, retryCount + 1)
		}
		
		throw error
	}
}

// ABI管理API服务
export class AbiService {
	// 获取ABI列表（支持分页和过滤）
	static async getAbiList(params: AbiListRequest = {}): Promise<AbiListResponse> {
		const queryParams = new URLSearchParams()
		
		if (params.page) queryParams.append('page', params.page.toString())
		if (params.size) queryParams.append('size', params.size.toString())
		if (params.chain_name) queryParams.append('chain_name', params.chain_name)
		if (params.contract_address) queryParams.append('contract_address', params.contract_address)
		
		const endpoint = `/api/v1/abis/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
		
		try {
			const backendResponse = await abiApiRequest<{
				total: number;
				page: number;
				size: number;
				items: any[];
			}>(endpoint)
			
			// 转换后端响应格式为前端期望的格式
			return {
				success: true,
				data: {
					items: backendResponse.items || [],
					total: backendResponse.total || 0,
					page: backendResponse.page || 1,
					size: backendResponse.size || 10,
					pages: Math.ceil((backendResponse.total || 0) / (backendResponse.size || 10))
				},
				message: '获取ABI列表成功'
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
				},
				message: error instanceof Error ? error.message : '获取ABI列表失败'
			}
		}
	}

	// 根据ID获取单个ABI详情
	static async getAbi(id: number): Promise<AbiResponse> {
		const endpoint = `/api/v1/abis/${id}/`
		return abiApiRequest<AbiResponse>(endpoint)
	}

	// 手动创建ABI记录
	static async createAbi(data: AbiCreateRequest): Promise<AbiResponse> {
		const endpoint = '/api/v1/abis/'
		return abiApiRequest<AbiResponse>(endpoint, {
			method: 'POST',
			body: JSON.stringify(data),
		})
	}

	// 更新ABI记录
	static async updateAbi(id: number, data: AbiUpdateRequest): Promise<AbiResponse> {
		const endpoint = `/api/v1/abis/${id}/`
		return abiApiRequest<AbiResponse>(endpoint, {
			method: 'PUT',
			body: JSON.stringify(data),
		})
	}

	// 删除ABI记录
	static async deleteAbi(contractAddress: string, chainName: string): Promise<{ success: boolean; message: string }> {
		const endpoint = `/api/v1/abis/${contractAddress}?chain_name=${chainName}`
		return abiApiRequest<{ success: boolean; message: string }>(endpoint, {
			method: 'DELETE',
		})
	}

	// 上传ABI文件
	static async uploadAbiFile(file: File, chainName: string, contractAddress: string): Promise<FileUploadResponse> {
		const formData = new FormData()
		formData.append('file', file)
		formData.append('chain_name', chainName)
		formData.append('contract_address', contractAddress)
		
		const url = `${currentApiConfig.baseUrl}/api/v1/abis/upload/`
		
		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), currentApiConfig.timeout)
			
			const response = await authFetch(url, {
				method: 'POST',
				body: formData,
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
			console.error('ABI file upload failed:', error)
			throw error
		}
	}

	// 仅获取ABI数据（不保存）- 用于前端预览
	static async fetchAbiOnly(data: AutoFetchRequest): Promise<{success: boolean; data: {abi_content: any; file_path: string; functions_count: number; events_count: number}; message: string}> {
		const endpoint = '/api/v1/abis/fetch-only'
		
		// 为自动获取ABI设置更长的超时时间（2分钟）
		const url = `${currentApiConfig.baseUrl}${endpoint}`
		
		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), 120000) // 2分钟超时
			
			const response = await authFetch(url, {
				method: 'POST',
				headers: {
					...DEFAULT_HEADERS,
				},
				body: JSON.stringify(data),
				signal: controller.signal
			})
			
			clearTimeout(timeoutId)
			
			if (!response.ok) {
				const errorMessage = ERROR_CODES[response.status as keyof typeof ERROR_CODES] || `HTTP ${response.status}`
				throw new Error(errorMessage)
			}
			
			return await response.json()
		} catch (error) {
			console.error('获取ABI数据失败:', error)
			
			// 如果是超时错误，给出更友好的错误消息
			if (error instanceof Error && error.name === 'AbortError') {
				throw new Error('获取ABI数据超时，请稍后重试')
			}
			
			throw error
		}
	}

	// 自动从区块链浏览器获取ABI并保存
	static async autoFetchAbi(data: AutoFetchRequest): Promise<AbiResponse> {
		const endpoint = '/api/v1/abis/auto-fetch'
		
		// 为自动获取ABI设置更长的超时时间（2分钟）
		const url = `${currentApiConfig.baseUrl}${endpoint}`
		
		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), 120000) // 2分钟超时
			
			const response = await authFetch(url, {
				method: 'POST',
				headers: {
					...DEFAULT_HEADERS,
				},
				body: JSON.stringify(data),
				signal: controller.signal
			})
			
			clearTimeout(timeoutId)
			
			if (!response.ok) {
				const errorMessage = ERROR_CODES[response.status as keyof typeof ERROR_CODES] || `HTTP ${response.status}`
				throw new Error(errorMessage)
			}
			
			return await response.json()
		} catch (error) {
			console.error('自动获取ABI失败:', error)
			
			// 如果是超时错误，给出更友好的错误消息
			if (error instanceof Error && error.name === 'AbortError') {
				throw new Error('自动获取ABI超时，请稍后重试或手动上传ABI文件')
			}
			
			throw error
		}
	}

	// 验证合约地址格式
	static validateContractAddress(address: string, chainName: string): boolean {
		if (!address || typeof address !== 'string') {
			return false
		}
		
		// 以太坊类地址验证（42字符，以0x开头）
		const ethPattern = /^0x[a-fA-F0-9]{40}$/
		if (['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism'].includes(chainName.toLowerCase())) {
			return ethPattern.test(address)
		}
		
		// 其他链可以在这里添加相应的验证逻辑
		return address.length > 10 // 基本长度检查
	}

	// 验证链名称
	static validateChainName(chainName: string): boolean {
		const supportedChains = [
			'ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism',
			'avalanche', 'fantom', 'cronos', 'moonbeam', 'aurora'
		]
		return supportedChains.includes(chainName.toLowerCase())
	}

	// 格式化ABI内容用于显示
	static formatAbiForDisplay(abi: any): string {
		try {
			return JSON.stringify(abi, null, 2)
		} catch {
			return '无效的ABI格式'
		}
	}

	// 从ABI中提取函数名称列表
	static extractFunctionNames(abi: any): string[] {
		try {
			if (!Array.isArray(abi)) return []
			
			return abi
				.filter(item => item.type === 'function')
				.map(func => func.name)
				.filter(Boolean)
		} catch {
			return []
		}
	}

	// 从ABI中提取事件名称列表
	static extractEventNames(abi: any): string[] {
		try {
			if (!Array.isArray(abi)) return []
			
			return abi
				.filter(item => item.type === 'event')
				.map(event => event.name)
				.filter(Boolean)
		} catch {
			return []
		}
	}
}

// 导出服务实例
export default AbiService