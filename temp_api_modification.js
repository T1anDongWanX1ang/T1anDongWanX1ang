const fs = require('fs');

// 读取文件内容
const content = fs.readFileSync('src/services/api.ts', 'utf8');

// 找到要插入的位置（第518行后）
const lines = content.split('\n');

// 在第518行后插入新的函数
const insertIndex = 517; // 0-based index for line 518

const newFunction = `
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
			const url = \`\${currentApiConfig.baseUrl}/api/v1/component/\${componentId}/config\`
			console.log('🔍 获取组件配置:', url)
			
			const response = await fetch(url, {
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				}
			})
			
			if (!response.ok) {
				throw new Error(\`HTTP \${response.status}: \${response.statusText}\`)
			}
			
			const data = await response.json()
			console.log('✅ 组件配置获取成功:', data)
			
			return {
				success: true,
				data: data,
				message: 'Component config retrieved successfully'
			}
		} catch (error) {
			console.error('❌ 获取组件配置失败:', error)
			return {
				success: false,
				data: null,
				message: error instanceof Error ? error.message : 'Unknown error'
			}
		}
	},`;

// 插入新函数
lines.splice(insertIndex + 1, 0, newFunction);

// 修改getJobInfo函数的参数和逻辑
const getJobInfoStartIndex = lines.findIndex(line => line.includes('getJobInfo: async (jobName: string = \'DDC-RTC-DataProc\''));
if (getJobInfoStartIndex !== -1) {
	// 修改函数签名
	lines[getJobInfoStartIndex] = lines[getJobInfoStartIndex].replace(
		'getJobInfo: async (jobName: string = \'DDC-RTC-DataProc\', outputFormat: string = \'json\')',
		'getJobInfo: async (jobName?: string, outputFormat: string = \'json\')'
	);
	
	// 找到函数体开始的位置
	const functionBodyStart = getJobInfoStartIndex + 19; // 大概在这个位置
	
	// 替换参数处理逻辑
	const oldParamsLogic = `		const params = new URLSearchParams({
			job_name: jobName,
			output_format: outputFormat
		})`;
		
	const newParamsLogic = `		// 如果没有提供jobName，尝试从配置中获取
		let finalJobName = jobName
		if (!finalJobName) {
			try {
				console.log('🔍 未提供job名称，尝试从配置中获取...')
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
		})`;
	
	// 找到并替换参数处理逻辑
	for (let i = functionBodyStart; i < lines.length; i++) {
		if (lines[i].includes('const params = new URLSearchParams({') && 
			lines[i+1].includes('job_name: jobName,') &&
			lines[i+2].includes('output_format: outputFormat') &&
			lines[i+3].includes('})')) {
			// 替换这4行
			lines.splice(i, 4, newParamsLogic);
			break;
		}
	}
}

// 写回文件
fs.writeFileSync('src/services/api.ts', lines.join('\n'));
console.log('文件修改完成');
