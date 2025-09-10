import { ReactNode } from 'react'

interface LoadingProps {
	size?: 'sm' | 'md' | 'lg'
	color?: 'blue' | 'green' | 'gray' | 'white'
	message?: string
	className?: string
}

export function Loading({ size = 'md', color = 'blue', message, className = '' }: LoadingProps) {
	const sizeClasses = {
		sm: 'h-4 w-4',
		md: 'h-6 w-6',
		lg: 'h-8 w-8'
	}

	const colorClasses = {
		blue: 'border-blue-600',
		green: 'border-green-600',
		gray: 'border-gray-600',
		white: 'border-white'
	}

	return (
		<div className={`flex items-center gap-3 ${className}`}>
			<div className={`animate-spin rounded-full border-2 border-t-transparent ${sizeClasses[size]} ${colorClasses[color]}`}></div>
			{message && (
				<span className="text-sm text-gray-600">{message}</span>
			)}
		</div>
	)
}

interface LoadingOverlayProps {
	isVisible: boolean
	message?: string
	children: ReactNode
}

export function LoadingOverlay({ isVisible, message = '加载中...', children }: LoadingOverlayProps) {
	return (
		<div className="relative">
			{children}
			{isVisible && (
				<div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
					<Loading message={message} />
				</div>
			)}
		</div>
	)
}

interface FullscreenLoadingProps {
	isVisible: boolean
	message?: string
	description?: string
}

export function FullscreenLoading({ isVisible, message = '加载中...', description }: FullscreenLoadingProps) {
	if (!isVisible) return null

	return (
		<div className="fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50">
			<div className="text-center">
				<Loading size="lg" className="justify-center mb-4" />
				<div className="text-lg font-medium text-gray-900 mb-2">{message}</div>
				{description && (
					<div className="text-sm text-gray-600">{description}</div>
				)}
			</div>
		</div>
	)
}

// 简化的内联加载指示器
interface InlineLoadingProps {
	text?: string
	className?: string
}

export function InlineLoading({ text = '加载中...', className = '' }: InlineLoadingProps) {
	return (
		<div className={`flex items-center justify-center py-8 text-gray-500 ${className}`}>
			<Loading size="sm" message={text} />
		</div>
	)
}