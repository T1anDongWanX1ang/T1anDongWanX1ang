import { useState, useEffect } from 'react'

export interface ToastMessage {
	id: string
	type: 'success' | 'error' | 'warning' | 'info'
	title: string
	message: string
	duration?: number
}

interface ToastProps {
	toast: ToastMessage
	onClose: (id: string) => void
}

function Toast({ toast, onClose }: ToastProps) {
	const { id, type, title, message, duration = 5000 } = toast

	useEffect(() => {
		const timer = setTimeout(() => {
			onClose(id)
		}, duration)

		return () => clearTimeout(timer)
	}, [id, duration, onClose])

	const icons = {
		success: '✅',
		error: '❌',
		warning: '⚠️',
		info: 'ℹ️'
	}

	const colors = {
		success: 'bg-green-50 border-green-200 text-green-800',
		error: 'bg-red-50 border-red-200 text-red-800',
		warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
		info: 'bg-blue-50 border-blue-200 text-blue-800'
	}

	return (
		<div className={`p-4 rounded-lg border shadow-lg mb-2 ${colors[type]} animate-slide-in`}>
			<div className="flex items-start gap-3">
				<span className="text-lg flex-shrink-0 mt-0.5">{icons[type]}</span>
				<div className="flex-1 min-w-0">
					<div className="font-medium text-sm">{title}</div>
					{message && (
						<div className="text-sm mt-1 opacity-90">{message}</div>
					)}
				</div>
				<button
					onClick={() => onClose(id)}
					className="text-lg opacity-70 hover:opacity-100 transition-opacity flex-shrink-0"
				>
					×
				</button>
			</div>
		</div>
	)
}

interface ToastContainerProps {
	toasts: ToastMessage[]
	onClose: (id: string) => void
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
	if (toasts.length === 0) return null

	return (
		<div className="fixed top-4 right-4 z-50 w-80 max-w-sm">
			{toasts.map(toast => (
				<Toast key={toast.id} toast={toast} onClose={onClose} />
			))}
		</div>
	)
}

// Toast管理Hook
export function useToast() {
	const [toasts, setToasts] = useState<ToastMessage[]>([])

	const showToast = (
		type: ToastMessage['type'],
		title: string,
		message?: string,
		duration?: number
	) => {
		const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
		const toast: ToastMessage = {
			id,
			type,
			title,
			message: message || '',
			duration
		}
		
		setToasts(prev => [toast, ...prev.slice(0, 4)]) // 最多显示5个Toast
	}

	const closeToast = (id: string) => {
		setToasts(prev => prev.filter(toast => toast.id !== id))
	}

	const clearAllToasts = () => {
		setToasts([])
	}

	// 快捷方法
	const success = (title: string, message?: string, duration?: number) => 
		showToast('success', title, message, duration)
		
	const error = (title: string, message?: string, duration?: number) => 
		showToast('error', title, message, duration)
		
	const warning = (title: string, message?: string, duration?: number) => 
		showToast('warning', title, message, duration)
		
	const info = (title: string, message?: string, duration?: number) => 
		showToast('info', title, message, duration)

	return {
		toasts,
		showToast,
		closeToast,
		clearAllToasts,
		success,
		error,
		warning,
		info
	}
}