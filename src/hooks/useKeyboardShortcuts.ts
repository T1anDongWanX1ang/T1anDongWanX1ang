import { useEffect, useCallback } from 'react'

interface ShortcutConfig {
	key: string
	ctrlKey?: boolean
	altKey?: boolean
	shiftKey?: boolean
	metaKey?: boolean
	action: () => void
	description?: string
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[], enabled = true) {
	const handleKeyDown = useCallback((event: KeyboardEvent) => {
		if (!enabled) return

		// 忽略在输入框、文本域等表单元素中的按键
		const target = event.target as HTMLElement
		if (
			target.tagName === 'INPUT' ||
			target.tagName === 'TEXTAREA' ||
			target.contentEditable === 'true'
		) {
			return
		}

		for (const shortcut of shortcuts) {
			const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
			const ctrlMatch = !!shortcut.ctrlKey === event.ctrlKey
			const altMatch = !!shortcut.altKey === event.altKey
			const shiftMatch = !!shortcut.shiftKey === event.shiftKey
			const metaMatch = !!shortcut.metaKey === event.metaKey

			if (keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch) {
				event.preventDefault()
				event.stopPropagation()
				shortcut.action()
				break
			}
		}
	}, [shortcuts, enabled])

	useEffect(() => {
		if (enabled) {
			document.addEventListener('keydown', handleKeyDown)
			return () => {
				document.removeEventListener('keydown', handleKeyDown)
			}
		}
	}, [handleKeyDown, enabled])
}

// ABI管理的快捷键配置
export function useAbiManagementShortcuts({
	onAddAbi,
	onUploadAbi,
	onRefresh,
	onSearch
}: {
	onAddAbi: () => void
	onUploadAbi: () => void
	onRefresh: () => void
	onSearch?: () => void
}) {
	const shortcuts: ShortcutConfig[] = [
		{
			key: 'n',
			ctrlKey: true,
			action: onAddAbi,
			description: 'Ctrl+N: 添加新ABI'
		},
		{
			key: 'u',
			ctrlKey: true,
			action: onUploadAbi,
			description: 'Ctrl+U: 上传ABI文件'
		},
		{
			key: 'r',
			ctrlKey: true,
			action: onRefresh,
			description: 'Ctrl+R: 刷新列表'
		}
	]

	if (onSearch) {
		shortcuts.push({
			key: 'f',
			ctrlKey: true,
			action: onSearch,
			description: 'Ctrl+F: 搜索'
		})
	}

	useKeyboardShortcuts(shortcuts)

	return shortcuts
}

// 通用快捷键配置
export function useGlobalShortcuts({
	onEscape,
	onHelp
}: {
	onEscape?: () => void
	onHelp?: () => void
} = {}) {
	const shortcuts: ShortcutConfig[] = []

	if (onEscape) {
		shortcuts.push({
			key: 'Escape',
			action: onEscape,
			description: 'ESC: 关闭模态框/返回'
		})
	}

	if (onHelp) {
		shortcuts.push({
			key: '?',
			shiftKey: true,
			action: onHelp,
			description: 'Shift+?: 显示帮助'
		})
	}

	useKeyboardShortcuts(shortcuts)

	return shortcuts
}