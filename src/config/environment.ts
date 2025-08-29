// 环境配置文件
// 可以根据不同部署环境修改这些配置

export const ENV_CONFIG = {
	// 开发环境 - 本地开发
	development: {
		apiBaseUrl: 'http://127.0.0.1:8000',
		apiTimeout: 30000,
		apiRetryAttempts: 3,
		enableDebug: true,
		logLevel: 'debug'
	},
	
	// 测试环境 - 测试服务器
	staging: {
		apiBaseUrl: 'http://test-api.yourdomain.com',
		apiTimeout: 45000,
		apiRetryAttempts: 3,
		enableDebug: true,
		logLevel: 'info'
	},
	
	// 生产环境 - 正式服务器
	production: {
		apiBaseUrl: 'https://sipzmgt.socialswap.com',
		apiTimeout: 60000,
		apiRetryAttempts: 5,
		enableDebug: false,
		logLevel: 'info'
	}
}

// 获取当前环境
export const getCurrentEnvironment = (): keyof typeof ENV_CONFIG => {
	// 可以通过环境变量或构建时配置来设置
	const mode = (import.meta as any).env?.MODE || 'development'
	const env = mode
	console.log('🔍 环境调试:', {
		mode: mode,
		env: env,
		configKeys: Object.keys(ENV_CONFIG)
	})
	return env as keyof typeof ENV_CONFIG
}

// 获取当前环境配置
export const getCurrentConfig = () => {
	const env = getCurrentEnvironment()
	return ENV_CONFIG[env]
}

// 导出当前配置
export const currentConfig = getCurrentConfig()

// 环境信息
export const ENV_INFO = {
	isDevelopment: getCurrentEnvironment() === 'development',
	isStaging: getCurrentEnvironment() === 'staging',
	isProduction: getCurrentEnvironment() === 'production',
	currentEnv: getCurrentEnvironment()
}

// 调试工具
export const debug = {
	log: (...args: any[]) => {
		if (currentConfig.enableDebug) {
			console.log('[DEBUG]', ...args)
		}
	},
	
	warn: (...args: any[]) => {
		if (currentConfig.enableDebug) {
			console.warn('[WARN]', ...args)
		}
	},
	
	error: (...args: any[]) => {
		console.error('[ERROR]', ...args)
	}
}
