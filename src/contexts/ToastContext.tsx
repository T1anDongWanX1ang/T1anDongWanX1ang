import { createContext, useContext, ReactNode } from 'react'
import { useToast } from '../ui/components/Toast'

interface ToastContextType {
	success: (title: string, message?: string, duration?: number) => void
	error: (title: string, message?: string, duration?: number) => void
	warning: (title: string, message?: string, duration?: number) => void
	info: (title: string, message?: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

interface ToastProviderProps {
	children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
	const { success, error, warning, info } = useToast()

	const contextValue = {
		success,
		error,
		warning,
		info
	}

	return (
		<ToastContext.Provider value={contextValue}>
			{children}
		</ToastContext.Provider>
	)
}

export function useToastContext() {
	const context = useContext(ToastContext)
	if (context === undefined) {
		throw new Error('useToastContext must be used within a ToastProvider')
	}
	return context
}