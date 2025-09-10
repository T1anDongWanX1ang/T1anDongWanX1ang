import React, { Component, ReactNode } from 'react'

interface Props {
	children: ReactNode
	fallback?: ReactNode
}

interface State {
	hasError: boolean
	error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props)
		this.state = { hasError: false, error: null }
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error('ErrorBoundary caught an error:', error, errorInfo)
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback
			}

			return (
				<div className="min-h-[400px] flex items-center justify-center">
					<div className="text-center max-w-md">
						<div className="text-6xl mb-4">💥</div>
						<h2 className="text-xl font-semibold text-gray-900 mb-2">出现错误</h2>
						<p className="text-gray-600 mb-4">
							抱歉，页面遇到了意外错误。请尝试刷新页面。
						</p>
						{this.state.error && (
							<details className="text-left bg-gray-50 p-3 rounded-md mb-4">
								<summary className="cursor-pointer text-sm font-medium text-gray-700">
									错误详情
								</summary>
								<pre className="mt-2 text-xs text-gray-600 overflow-auto">
									{this.state.error.message}
								</pre>
							</details>
						)}
						<div className="space-x-3">
							<button
								onClick={() => window.location.reload()}
								className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
							>
								刷新页面
							</button>
							<button
								onClick={() => this.setState({ hasError: false, error: null })}
								className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
							>
								重试
							</button>
						</div>
					</div>
				</div>
			)
		}

		return this.props.children
	}
}

// 简化版错误边界组件Hook版本
interface ErrorBoundaryWrapperProps {
	children: ReactNode
	fallback?: ReactNode
}

export function ErrorBoundaryWrapper({ children, fallback }: ErrorBoundaryWrapperProps) {
	return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>
}